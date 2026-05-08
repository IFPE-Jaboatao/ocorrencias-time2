import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository }  from '@nestjs/typeorm';
import { Repository }        from 'typeorm';
import { JwtService }        from '@nestjs/jwt';
import { ConfigService }     from '@nestjs/config';
import { createHash, randomBytes } from 'crypto';
import { addMinutes, isAfter }     from 'date-fns';
import { MagicLinkToken }    from './entities/magic-link-token.entity';
import { RefreshToken }      from './entities/refresh-token.entity';
import { Usuario }           from '../usuarios/entities/usuario.entity';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { MAGIC_LINK_TTL_MINUTES } from '../../common/constants/domain.constants';
import { MailService }       from './mail.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(MagicLinkToken)
    private readonly magicLinkRepo: Repository<MagicLinkToken>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepo: Repository<RefreshToken>,
    @InjectRepository(Usuario)
    private readonly usuarioRepo: Repository<Usuario>,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly mailService: MailService,
  ) {}

  async solicitarMagicLink(email: string): Promise<string> {
    const usuario = await this.usuarioRepo.findOne({ where: { email, ativo: true } });
    if (!usuario) throw new NotFoundException('Usuário não encontrado ou inativo');

    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = addMinutes(new Date(), MAGIC_LINK_TTL_MINUTES);

    await this.magicLinkRepo.save(
      this.magicLinkRepo.create({ usuarioId: usuario.id, tokenHash, expiresAt, usedAt: null }),
    );

    const frontendUrl = this.config.get<string>('FRONTEND_URL', 'http://localhost:3000');
    const linkUrl     = `${frontendUrl}/auth/callback?token=${rawToken}`;
    await this.mailService.enviarMagicLink(usuario.email, usuario.nome, linkUrl);

    return rawToken;
  }

  async verificarMagicLink(rawToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const registro  = await this.magicLinkRepo.findOne({
      where: { tokenHash },
      relations: ['usuario'],
    });

    if (!registro) throw new UnauthorizedException('Token inválido');
    if (registro.usedAt) throw new BadRequestException('Token já utilizado');
    if (isAfter(new Date(), registro.expiresAt)) throw new BadRequestException('Token expirado');

    registro.usedAt = new Date();
    await this.magicLinkRepo.save(registro);

    await this.usuarioRepo.update(registro.usuarioId, { ultimoAcesso: new Date() });

    return this.emitirTokens(registro.usuario);
  }

  async refresh(rawRefresh: string): Promise<{ accessToken: string; refreshToken: string }> {
    const tokenHash = createHash('sha256').update(rawRefresh).digest('hex');
    const registro  = await this.refreshTokenRepo.findOne({
      where:     { tokenHash },
      relations: ['usuario'],
    });

    if (!registro || registro.revokedAt || isAfter(new Date(), registro.expiresAt)) {
      throw new UnauthorizedException('Refresh token inválido ou expirado');
    }

    registro.revokedAt = new Date();
    await this.refreshTokenRepo.save(registro);

    return this.emitirTokens(registro.usuario);
  }

  async devLogin(email: string): Promise<{ accessToken: string; refreshToken: string }> {
    const usuario = await this.usuarioRepo.findOne({ where: { email, ativo: true } });
    if (!usuario) throw new NotFoundException('Usuário não encontrado ou inativo');
    return this.emitirTokens(usuario);
  }

  async revogarRefreshToken(rawRefresh: string): Promise<void> {
    const tokenHash = createHash('sha256').update(rawRefresh).digest('hex');
    await this.refreshTokenRepo.update({ tokenHash }, { revokedAt: new Date() });
  }

  private async emitirTokens(usuario: Usuario): Promise<{ accessToken: string; refreshToken: string }> {
    const payload: AuthenticatedUser = {
      sub:       usuario.id,
      email:     usuario.email,
      nome:      usuario.nome,
      perfil:    usuario.perfil,
      campus:    usuario.campus,
      segmentos: usuario.segmentosResponsaveis,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.config.get('JWT_EXPIRES_IN', '8h'),
    });

    const rawRefresh   = randomBytes(32).toString('hex');
    const refreshHash  = createHash('sha256').update(rawRefresh).digest('hex');
    const refreshExpiry = new Date();
    refreshExpiry.setDate(refreshExpiry.getDate() + 7);

    await this.refreshTokenRepo.save(
      this.refreshTokenRepo.create({
        usuarioId:  usuario.id,
        tokenHash:  refreshHash,
        expiresAt:  refreshExpiry,
        revokedAt:  null,
      }),
    );

    return { accessToken, refreshToken: rawRefresh };
  }
}
