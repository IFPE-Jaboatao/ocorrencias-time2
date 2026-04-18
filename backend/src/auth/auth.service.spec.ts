import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { User } from '../users/entities/user.entity';
import { MagicLinkToken } from './entities/magic-link-token.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { Role } from '../common/decorators/roles.decorator';

// ─── Factories ────────────────────────────────────────────────────────────────
function createUserMock(overrides: Partial<User> = {}): User {
  const user = new User();
  user.id = 'user-uuid-1';
  user.tenantId = 'tenant-uuid-1';
  user.email = 'professor@escola.edu.br';
  user.name = 'Prof. Silva';
  user.roles = [Role.TEACHER];
  user.isActive = true;
  user.deletedAt = null;
  return Object.assign(user, overrides);
}

function createMagicLinkMock(overrides: Partial<MagicLinkToken> = {}): MagicLinkToken {
  const token = new MagicLinkToken();
  token.id = 'mlt-uuid-1';
  token.userId = 'user-uuid-1';
  token.user = createUserMock();
  token.tokenHash = 'hash-valido';
  token.expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15min no futuro
  token.usedAt = null;
  return Object.assign(token, overrides);
}

// ─── Mocks de repositório ─────────────────────────────────────────────────────
const mockUserRepo = () => ({
  findOne: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
});
const mockMagicLinkRepo = () => ({
  findOne: jest.fn(),
  save: jest.fn(),
  create: jest.fn((d) => d),
  update: jest.fn(),
});
const mockRefreshTokenRepo = () => ({
  findOne: jest.fn(),
  save: jest.fn(),
  create: jest.fn((d) => d),
  update: jest.fn(),
});
const mockNotificationsService = () => ({
  sendMagicLink: jest.fn().mockResolvedValue(undefined),
});
const mockJwtService = () => ({
  sign: jest.fn().mockReturnValue('jwt-access-token'),
});
const mockConfigService = () => ({
  get: jest.fn((key: string, def?: unknown) => {
    const map: Record<string, unknown> = {
      MAGIC_LINK_TTL_MINUTES: 15,
      MAGIC_LINK_BASE_URL: 'http://localhost:5173',
      JWT_EXPIRY: '1h',
      JWT_REFRESH_EXPIRY: '7d',
    };
    return map[key] ?? def;
  }),
  getOrThrow: jest.fn().mockReturnValue('jwt-secret'),
});

// ─── Suite ────────────────────────────────────────────────────────────────────
describe('AuthService', () => {
  let service: AuthService;
  let userRepo: ReturnType<typeof mockUserRepo>;
  let magicLinkRepo: ReturnType<typeof mockMagicLinkRepo>;
  let refreshTokenRepo: ReturnType<typeof mockRefreshTokenRepo>;
  let notifications: ReturnType<typeof mockNotificationsService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useFactory: mockUserRepo },
        { provide: getRepositoryToken(MagicLinkToken), useFactory: mockMagicLinkRepo },
        { provide: getRepositoryToken(RefreshToken), useFactory: mockRefreshTokenRepo },
        { provide: JwtService, useFactory: mockJwtService },
        { provide: ConfigService, useFactory: mockConfigService },
        { provide: NotificationsService, useFactory: mockNotificationsService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepo = module.get(getRepositoryToken(User));
    magicLinkRepo = module.get(getRepositoryToken(MagicLinkToken));
    refreshTokenRepo = module.get(getRepositoryToken(RefreshToken));
    notifications = module.get(NotificationsService);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── requestMagicLink ───────────────────────────────────────────────────────
  describe('requestMagicLink', () => {
    it('envia magic link quando e-mail está cadastrado e ativo', async () => {
      userRepo.findOne.mockResolvedValue(createUserMock());

      await service.requestMagicLink('professor@escola.edu.br');

      expect(magicLinkRepo.save).toHaveBeenCalledTimes(1);
      // Notificação é fire-and-forget — verificamos que foi chamada
      await new Promise(r => setTimeout(r, 10));
      expect(notifications.sendMagicLink).toHaveBeenCalledTimes(1);
    });

    it('NÃO lança erro quando e-mail não está cadastrado (não revela ausência)', async () => {
      userRepo.findOne.mockResolvedValue(null);

      await expect(service.requestMagicLink('nao@existe.com')).resolves.not.toThrow();
      expect(magicLinkRepo.save).not.toHaveBeenCalled();
      expect(notifications.sendMagicLink).not.toHaveBeenCalled();
    });

    it('NÃO envia e-mail para usuário inativo', async () => {
      userRepo.findOne.mockResolvedValue(null); // inativo é filtrado pelo where
      await service.requestMagicLink('inativo@escola.edu.br');
      expect(notifications.sendMagicLink).not.toHaveBeenCalled();
    });
  });

  // ─── verifyMagicLink ────────────────────────────────────────────────────────
  describe('verifyMagicLink', () => {
    const VALID_RAW_TOKEN = 'a'.repeat(64);

    it('retorna par de tokens JWT para token válido', async () => {
      const mockRecord = createMagicLinkMock();
      magicLinkRepo.findOne.mockResolvedValue(mockRecord);
      refreshTokenRepo.save.mockResolvedValue({});

      const result = await service.verifyMagicLink(VALID_RAW_TOKEN);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('expiresIn');
      expect(magicLinkRepo.update).toHaveBeenCalledWith(
        mockRecord.id,
        { usedAt: expect.any(Date) },
      );
    });

    it('lança UnauthorizedException para token não encontrado', async () => {
      magicLinkRepo.findOne.mockResolvedValue(null);
      await expect(service.verifyMagicLink(VALID_RAW_TOKEN))
        .rejects.toThrow(UnauthorizedException);
    });

    it('lança UnauthorizedException para token já utilizado', async () => {
      magicLinkRepo.findOne.mockResolvedValue(
        createMagicLinkMock({ usedAt: new Date(Date.now() - 1000) }),
      );
      await expect(service.verifyMagicLink(VALID_RAW_TOKEN))
        .rejects.toThrow(UnauthorizedException);
    });

    it('lança UnauthorizedException para token expirado', async () => {
      magicLinkRepo.findOne.mockResolvedValue(
        createMagicLinkMock({ expiresAt: new Date(Date.now() - 1000) }),
      );
      await expect(service.verifyMagicLink(VALID_RAW_TOKEN))
        .rejects.toThrow(UnauthorizedException);
    });

    it('lança UnauthorizedException quando usuário está inativo', async () => {
      magicLinkRepo.findOne.mockResolvedValue(
        createMagicLinkMock({ user: createUserMock({ isActive: false }) }),
      );
      await expect(service.verifyMagicLink(VALID_RAW_TOKEN))
        .rejects.toThrow(UnauthorizedException);
    });
  });

  // ─── refresh ────────────────────────────────────────────────────────────────
  describe('refresh', () => {
    const RAW_REFRESH = 'b'.repeat(80);

    it('retorna novos tokens e revoga o refresh token atual', async () => {
      const mockRT = Object.assign(new RefreshToken(), {
        id: 'rt-1',
        user: createUserMock(),
        expiresAt: new Date(Date.now() + 7 * 86400000),
        revokedAt: null,
      });
      refreshTokenRepo.findOne.mockResolvedValue(mockRT);
      refreshTokenRepo.save.mockResolvedValue({});

      const result = await service.refresh(RAW_REFRESH);

      expect(refreshTokenRepo.update).toHaveBeenCalledWith(
        mockRT.id, { revokedAt: expect.any(Date) },
      );
      expect(result).toHaveProperty('accessToken');
    });

    it('lança UnauthorizedException para refresh token revogado', async () => {
      const mockRT = Object.assign(new RefreshToken(), {
        id: 'rt-1',
        user: createUserMock(),
        expiresAt: new Date(Date.now() + 7 * 86400000),
        revokedAt: new Date(), // revogado
      });
      refreshTokenRepo.findOne.mockResolvedValue(mockRT);
      await expect(service.refresh(RAW_REFRESH)).rejects.toThrow(UnauthorizedException);
    });

    it('lança UnauthorizedException para refresh token não encontrado', async () => {
      refreshTokenRepo.findOne.mockResolvedValue(null);
      await expect(service.refresh(RAW_REFRESH)).rejects.toThrow(UnauthorizedException);
    });
  });
});
