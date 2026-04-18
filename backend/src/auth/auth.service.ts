import {
  Injectable, NotFoundException, UnauthorizedException,
  BadRequestException, Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { User } from '../users/entities/user.entity';
import { MagicLinkToken } from './entities/magic-link-token.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { AuthResponseDto } from './dto/auth-response.dto';
import { JwtPayload } from './strategies/jwt.strategy';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    @InjectRepository(MagicLinkToken)
    private readonly magicLinkRepo: Repository<MagicLinkToken>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepo: Repository<RefreshToken>,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly notifications: NotificationsService,
  ) {}

  /**
   * US-02: Solicita magic link por e-mail.
   * Retorna sempre 200 para não revelar se o e-mail está cadastrado (segurança).
   */
  async requestMagicLink(email: string): Promise<void> {
    const user = await this.usersRepo.findOne({
      where: { email: email.toLowerCase().trim(), isActive: true },
    });

    if (\!user) {
      // Silencioso — não revela ausência do e-mail (RNF-03)
      this.logger.warn(`Magic link solicitado para e-mail não cadastrado: ${email}`);
      return;
    }

    // Gera token de 32 bytes (64 chars hex) e armazena SHA-256 hash
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawToken);

    const ttlMinutes = this.config.get<number>('MAGIC_LINK_TTL_MINUTES', 15);
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

    await this.magicLinkRepo.save(
      this.magicLinkRepo.create({ userId: user.id, tokenHash, expiresAt, usedAt: null }),
    );

    const baseUrl = this.config.get<string>('MAGIC_LINK_BASE_URL', 'http://localhost:5173');
    const link = `${baseUrl}/auth/verify?token=${rawToken}`;

    // Fire-and-forget — falha de e-mail não deve afetar o fluxo
    this.notifications.sendMagicLink(user, link).catch((err) =>
      this.logger.error(`Falha ao enviar magic link para ${email}: ${err.message}`),
    );
  }

  /**
   * US-03: Verifica magic link e retorna par de tokens JWT.
   */
  async verifyMagicLink(rawToken: string): Promise<AuthResponseDto> {
    const tokenHash = this.hashToken(rawToken);

    const record = await this.magicLinkRepo.findOne({
      where: { tokenHash },
      relations: ['user'],
    });

    if (\!record) throw new UnauthorizedException('Token inválido.');
    if (record.isUsed) throw new UnauthorizedException('Token já utilizado.');
    if (record.isExpired) throw new UnauthorizedException('Token expirado.');
    if (\!record.user.isActive) throw new UnauthorizedException('Usuário inativo.');

    // Marcar como usado (uso único — H não listado mas boa prática)
    await this.magicLinkRepo.update(record.id, { usedAt: new Date() });

    return this.issueTokenPair(record.user);
  }

  /**
   * Renova o access token usando um refresh token válido.
   * Rotaciona o refresh token a cada uso.
   */
  async refresh(rawRefreshToken: string): Promise<AuthResponseDto> {
    const tokenHash = this.hashToken(rawRefreshToken);

    const record = await this.refreshTokenRepo.findOne({
      where: { tokenHash },
      relations: ['user'],
    });

    if (\!record) throw new UnauthorizedException('Refresh token inválido.');
    if (record.isRevoked) throw new UnauthorizedException('Refresh token revogado.');
    if (record.isExpired) throw new UnauthorizedException('Refresh token expirado.');

    // Revogar o token atual (rotação)
    await this.refreshTokenRepo.update(record.id, { revokedAt: new Date() });

    return this.issueTokenPair(record.user);
  }

  /**
   * Revoga o refresh token (logout).
   */
  async logout(rawRefreshToken: string): Promise<void> {
    const tokenHash = this.hashToken(rawRefreshToken);
    await this.refreshTokenRepo.update({ tokenHash }, { revokedAt: new Date() });
  }

  // ─── privados ───────────────────────────────────────────────────────────────

  private async issueTokenPair(user: User): Promise<AuthResponseDto> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      roles: user.roles,
      tenantId: user.tenantId,
    };

    const accessToken = this.jwtService.sign(payload);

    // Refresh token — raw gerado, hash armazenado
    const rawRefresh = crypto.randomBytes(40).toString('hex');
    const refreshHash = this.hashToken(rawRefresh);
    const refreshExpiry = this.config.get<string>('JWT_REFRESH_EXPIRY', '7d');
    const refreshMs = this.parseDuration(refreshExpiry);

    await this.refreshTokenRepo.save(
      this.refreshTokenRepo.create({
        userId: user.id,
        tokenHash: refreshHash,
        expiresAt: new Date(Date.now() + refreshMs),
        revokedAt: null,
      }),
    );

    const jwtExpiry = this.config.get<string>('JWT_EXPIRY', '1h');

    return {
      accessToken,
      refreshToken: rawRefresh,
      expiresIn: this.parseDuration(jwtExpiry) / 1000,
    };
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private parseDuration(duration: string): number {
    const match = duration.match(/^(\d+)(s|m|h|d)$/);
    if (\!match) throw new BadRequestException(`Duração inválida: ${duration}`);
    const value = parseInt(match[1]);
    const unit = match[2];
    const multipliers: Record<string, number> = {
      s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000,
    };
    return value * multipliers[unit];
  }
}
