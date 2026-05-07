import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException }  from '@nestjs/common';
import { JwtService }          from '@nestjs/jwt';
import { AuthController }      from './auth.controller';
import { AuthService }         from './auth.service';

/** Mock de Response com cookie/clearCookie */
function makeMockRes(cookieMap: Record<string, string> = {}) {
  const cookies = { ...cookieMap };
  return {
    req:          { cookies },
    cookie:       jest.fn(),
    clearCookie:  jest.fn(),
  };
}

describe('AuthController', () => {
  let ctrl: AuthController;
  let svc:  jest.Mocked<AuthService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            solicitarMagicLink:  jest.fn(),
            verificarMagicLink:  jest.fn(),
            refresh:             jest.fn(),
            revogarRefreshToken: jest.fn(),
            devLogin:            jest.fn(),
          },
        },
        // JwtAuthGuard depende de JwtService — mock mínimo
        { provide: JwtService, useValue: { sign: jest.fn(), verify: jest.fn() } },
      ],
    }).compile();

    ctrl = module.get(AuthController);
    svc  = module.get(AuthService) as jest.Mocked<AuthService>;
  });

  describe('solicitarMagicLink()', () => {
    it('deve retornar { token } em desenvolvimento', async () => {
      svc.solicitarMagicLink.mockResolvedValue('raw-token-abc');
      const result = await ctrl.solicitarMagicLink({ email: 'prof@escola.edu.br' });
      expect(svc.solicitarMagicLink).toHaveBeenCalledWith('prof@escola.edu.br');
      expect(result).toEqual({ token: 'raw-token-abc' });
    });

    it('deve retornar mensagem genérica em produção', async () => {
      const original = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      svc.solicitarMagicLink.mockResolvedValue('qualquer-token');
      const result = await ctrl.solicitarMagicLink({ email: 'x@escola.edu.br' });
      expect(result).toEqual({ message: 'Se o e-mail existir, você receberá o link em breve.' });
      process.env.NODE_ENV = original;
    });
  });

  describe('verificarMagicLink()', () => {
    it('deve setar cookies e retornar { ok: true }', async () => {
      svc.verificarMagicLink.mockResolvedValue({ accessToken: 'acc', refreshToken: 'ref' });
      const res = makeMockRes();

      const result = await ctrl.verificarMagicLink({ token: 'tok-xyz' }, res as never);

      expect(svc.verificarMagicLink).toHaveBeenCalledWith('tok-xyz');
      expect(res.cookie).toHaveBeenCalledWith('sgoa_token',   'acc', expect.any(Object));
      expect(res.cookie).toHaveBeenCalledWith('sgoa_refresh', 'ref', expect.any(Object));
      expect(result).toEqual({ ok: true });
    });
  });

  describe('refresh()', () => {
    it('deve ler sgoa_refresh do cookie e setar novo sgoa_token', async () => {
      svc.refresh.mockResolvedValue({ accessToken: 'new-acc', refreshToken: 'new-ref' });
      const res = makeMockRes({ sgoa_refresh: 'ref-tok' });

      const result = await ctrl.refresh(res as never);

      expect(svc.refresh).toHaveBeenCalledWith('ref-tok');
      expect(res.cookie).toHaveBeenCalledWith('sgoa_token', 'new-acc', expect.any(Object));
      expect(result).toEqual({ ok: true });
    });
  });

  describe('logout()', () => {
    it('deve revogar refresh token do cookie e limpar cookies', async () => {
      svc.revogarRefreshToken.mockResolvedValue(undefined);
      const res = makeMockRes({ sgoa_refresh: 'ref-tok' });

      await ctrl.logout(res as never);

      expect(svc.revogarRefreshToken).toHaveBeenCalledWith('ref-tok');
      expect(res.clearCookie).toHaveBeenCalledWith('sgoa_token',   { path: '/' });
      expect(res.clearCookie).toHaveBeenCalledWith('sgoa_refresh', { path: '/' });
      expect(res.clearCookie).toHaveBeenCalledWith('csrf_token',   { path: '/' });
    });
  });

  describe('me()', () => {
    it('deve retornar o usuário autenticado', () => {
      const user = { sub: 'uuid', email: 'x@escola.edu.br', nome: 'X', perfil: 'PROFESSOR' as never, campus: 'A', segmentos: [] };
      expect(ctrl.me(user)).toEqual(user);
    });
  });

  describe('getCsrfToken()', () => {
    it('deve setar cookie csrf_token e retornar csrfToken', () => {
      const res = makeMockRes();
      const result = ctrl.getCsrfToken(res as never);
      expect(res.cookie).toHaveBeenCalledWith('csrf_token', expect.any(String), expect.any(Object));
      expect(result).toHaveProperty('csrfToken');
      expect(typeof (result as { csrfToken: string }).csrfToken).toBe('string');
    });
  });

  describe('devLogin()', () => {
    it('deve setar cookies e retornar { ok: true } quando DEV_LOGIN_ENABLED=true', async () => {
      process.env.DEV_LOGIN_ENABLED = 'true';
      svc.devLogin.mockResolvedValue({ accessToken: 'acc', refreshToken: 'ref' });
      const res = makeMockRes();

      const result = await ctrl.devLogin({ email: 'dev@escola.edu.br' }, res as never);

      expect(svc.devLogin).toHaveBeenCalledWith('dev@escola.edu.br');
      expect(res.cookie).toHaveBeenCalledWith('sgoa_token', 'acc', expect.any(Object));
      expect(result).toEqual({ ok: true });
      delete process.env.DEV_LOGIN_ENABLED;
    });

    it('deve lançar ForbiddenException quando DEV_LOGIN_ENABLED != true', async () => {
      delete process.env.DEV_LOGIN_ENABLED;
      const res = makeMockRes();
      await expect(ctrl.devLogin({ email: 'dev@escola.edu.br' }, res as never))
        .rejects.toThrow(ForbiddenException);
      expect(svc.devLogin).not.toHaveBeenCalled();
    });
  });
});
