import { Test, TestingModule }  from '@nestjs/testing';
import { getRepositoryToken }    from '@nestjs/typeorm';
import { JwtService }            from '@nestjs/jwt';
import { ConfigService }         from '@nestjs/config';
import { BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { addMinutes, subMinutes } from 'date-fns';
import { createHash }             from 'crypto';
import { AuthService }            from './auth.service';
import { MagicLinkToken }         from './entities/magic-link-token.entity';
import { RefreshToken }           from './entities/refresh-token.entity';
import { Usuario }                from '../usuarios/entities/usuario.entity';
import { PerfilUsuario }          from '../../common/enums/perfil-usuario.enum';

// ─── Factories ──────────────────────────────────────────────────────────────

const makeUsuario = (o: Partial<Usuario> = {}): Usuario =>
  ({ id: 'u-1', nome: 'Prof. João', email: 'joao@escola.edu.br',
     perfil: PerfilUsuario.PROFESSOR, campus: 'Campus A',
     segmentosResponsaveis: [], ativo: true, ...o } as Usuario);

const makeTokenHash = (raw: string) => createHash('sha256').update(raw).digest('hex');

const makeMagicLink = (o: Partial<MagicLinkToken> = {}): MagicLinkToken =>
  ({ id: 'ml-1', usuarioId: 'u-1', tokenHash: makeTokenHash('raw-token'),
     expiresAt: addMinutes(new Date(), 15), usedAt: null,
     usuario: makeUsuario(), ...o } as MagicLinkToken);

const makeRefreshToken = (o: Partial<RefreshToken> = {}): RefreshToken =>
  ({ id: 'rt-1', usuarioId: 'u-1', tokenHash: makeTokenHash('raw-refresh'),
     expiresAt: addMinutes(new Date(), 60 * 24 * 7), revokedAt: null,
     usuario: makeUsuario(), ...o } as RefreshToken);

// ─── Mocks ──────────────────────────────────────────────────────────────────

const makeMagicRepo = () => ({
  findOne: jest.fn(),
  save:    jest.fn(),
  create:  jest.fn((x) => x),
  update:  jest.fn(),
});

const makeRefreshRepo = () => ({
  findOne: jest.fn(),
  save:    jest.fn(),
  create:  jest.fn((x) => x),
  update:  jest.fn(),
});

const makeUsuarioRepo = () => ({
  findOne: jest.fn(),
  update:  jest.fn(),
});

// ─── Suite ──────────────────────────────────────────────────────────────────

describe('AuthService', () => {
  let service: AuthService;
  let magicRepo: ReturnType<typeof makeMagicRepo>;
  let refreshRepo: ReturnType<typeof makeRefreshRepo>;
  let usuarioRepo: ReturnType<typeof makeUsuarioRepo>;
  let jwtService: { sign: jest.Mock };

  beforeEach(async () => {
    magicRepo   = makeMagicRepo();
    refreshRepo = makeRefreshRepo();
    usuarioRepo = makeUsuarioRepo();
    jwtService  = { sign: jest.fn().mockReturnValue('jwt-token') };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(MagicLinkToken), useValue: magicRepo },
        { provide: getRepositoryToken(RefreshToken),   useValue: refreshRepo },
        { provide: getRepositoryToken(Usuario),        useValue: usuarioRepo },
        { provide: JwtService,                         useValue: jwtService },
        { provide: ConfigService,                      useValue: { get: jest.fn().mockReturnValue('8h') } },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  // ─── solicitarMagicLink ────────────────────────────────────────────────

  describe('solicitarMagicLink()', () => {
    it('deve retornar o token raw quando usuário existe e está ativo', async () => {
      usuarioRepo.findOne.mockResolvedValue(makeUsuario());
      magicRepo.save.mockResolvedValue({});
      const token = await service.solicitarMagicLink('joao@escola.edu.br');
      expect(typeof token).toBe('string');
      expect(token.length).toBe(64); // randomBytes(32).toString('hex')
    });

    it('deve lançar NotFoundException quando usuário não existe', async () => {
      usuarioRepo.findOne.mockResolvedValue(null);
      await expect(service.solicitarMagicLink('nao@existe.com'))
        .rejects.toBeInstanceOf(NotFoundException);
    });

    it('deve lançar NotFoundException quando usuário está inativo', async () => {
      // TypeORM filtra ativo:true no WHERE; mock retorna null simulando a query
      usuarioRepo.findOne.mockResolvedValue(null);
      await expect(service.solicitarMagicLink('joao@escola.edu.br'))
        .rejects.toBeInstanceOf(NotFoundException);
    });

    it('deve persistir o hash do token, não o token raw', async () => {
      usuarioRepo.findOne.mockResolvedValue(makeUsuario());
      magicRepo.save.mockResolvedValue({});
      const rawToken = await service.solicitarMagicLink('joao@escola.edu.br');
      const savedArg = magicRepo.create.mock.calls[0][0];
      expect(savedArg.tokenHash).not.toBe(rawToken);
      expect(savedArg.tokenHash).toBe(makeTokenHash(rawToken));
    });
  });

  // ─── verificarMagicLink ───────────────────────────────────────────────

  describe('verificarMagicLink()', () => {
    it('deve emitir accessToken e refreshToken com token válido', async () => {
      magicRepo.findOne.mockResolvedValue(makeMagicLink());
      magicRepo.save.mockResolvedValue({});
      usuarioRepo.update.mockResolvedValue({});
      refreshRepo.create.mockImplementation((x) => x);
      refreshRepo.save.mockResolvedValue({});

      const result = await service.verificarMagicLink('raw-token');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(jwtService.sign).toHaveBeenCalledTimes(1);
    });

    it('deve lançar UnauthorizedException quando token não existe', async () => {
      magicRepo.findOne.mockResolvedValue(null);
      await expect(service.verificarMagicLink('invalido'))
        .rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('deve lançar BadRequestException quando token já foi utilizado (H-07)', async () => {
      magicRepo.findOne.mockResolvedValue(makeMagicLink({ usedAt: new Date() }));
      await expect(service.verificarMagicLink('raw-token'))
        .rejects.toBeInstanceOf(BadRequestException);
    });

    it('deve lançar BadRequestException quando token expirou', async () => {
      magicRepo.findOne.mockResolvedValue(
        makeMagicLink({ expiresAt: subMinutes(new Date(), 1) }),
      );
      await expect(service.verificarMagicLink('raw-token'))
        .rejects.toBeInstanceOf(BadRequestException);
    });

    it('deve marcar o token como utilizado após verificação bem-sucedida', async () => {
      const token = makeMagicLink();
      magicRepo.findOne.mockResolvedValue(token);
      magicRepo.save.mockResolvedValue({});
      usuarioRepo.update.mockResolvedValue({});
      refreshRepo.create.mockImplementation((x) => x);
      refreshRepo.save.mockResolvedValue({});

      await service.verificarMagicLink('raw-token');
      expect(magicRepo.save).toHaveBeenCalled();
      const saved = magicRepo.save.mock.calls[0][0];
      expect(saved.usedAt).toBeInstanceOf(Date);
    });
  });

  // ─── refresh ──────────────────────────────────────────────────────────

  describe('refresh()', () => {
    it('deve emitir novos tokens e revogar o token anterior', async () => {
      const rt = makeRefreshToken();
      refreshRepo.findOne.mockResolvedValue(rt);
      refreshRepo.save.mockResolvedValue({});
      refreshRepo.create.mockImplementation((x) => x);

      const result = await service.refresh('raw-refresh');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      // token anterior deve ser revogado
      const savedRevoked = refreshRepo.save.mock.calls[0][0];
      expect(savedRevoked.revokedAt).toBeInstanceOf(Date);
    });

    it('deve lançar UnauthorizedException quando refresh token não existe', async () => {
      refreshRepo.findOne.mockResolvedValue(null);
      await expect(service.refresh('invalido'))
        .rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('deve lançar UnauthorizedException quando refresh token já foi revogado', async () => {
      refreshRepo.findOne.mockResolvedValue(makeRefreshToken({ revokedAt: new Date() }));
      await expect(service.refresh('raw-refresh'))
        .rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('deve lançar UnauthorizedException quando refresh token expirou', async () => {
      refreshRepo.findOne.mockResolvedValue(
        makeRefreshToken({ expiresAt: subMinutes(new Date(), 1) }),
      );
      await expect(service.refresh('raw-refresh'))
        .rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  // ─── revogarRefreshToken ──────────────────────────────────────────────

  describe('revogarRefreshToken()', () => {
    it('deve chamar update com o hash correto', async () => {
      refreshRepo.update.mockResolvedValue({});
      await service.revogarRefreshToken('raw-refresh');
      expect(refreshRepo.update).toHaveBeenCalledWith(
        { tokenHash: makeTokenHash('raw-refresh') },
        expect.objectContaining({ revokedAt: expect.any(Date) }),
      );
    });
  });
});
