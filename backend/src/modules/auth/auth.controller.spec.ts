import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException }  from '@nestjs/common';
import { AuthController }      from './auth.controller';
import { AuthService }         from './auth.service';

describe('AuthController', () => {
  let ctrl: AuthController;
  let svc: jest.Mocked<AuthService>;

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
      ],
    }).compile();

    ctrl = module.get(AuthController);
    svc  = module.get(AuthService) as jest.Mocked<AuthService>;
  });

  describe('solicitarMagicLink()', () => {
    it('deve chamar solicitarMagicLink com o email do DTO', async () => {
      const rawToken = 'raw-token-abc';
      svc.solicitarMagicLink.mockResolvedValue(rawToken);

      const result = await ctrl.solicitarMagicLink({ email: 'prof@escola.edu.br' });

      expect(svc.solicitarMagicLink).toHaveBeenCalledWith('prof@escola.edu.br');
      // Em ambiente de teste NODE_ENV != 'production' → retorna { token }
      expect(result).toEqual({ token: rawToken });
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
    it('deve chamar verificarMagicLink com o token do DTO', async () => {
      const tokens = { accessToken: 'acc', refreshToken: 'ref' };
      svc.verificarMagicLink.mockResolvedValue(tokens);

      const result = await ctrl.verificarMagicLink({ token: 'tok-xyz' });

      expect(svc.verificarMagicLink).toHaveBeenCalledWith('tok-xyz');
      expect(result).toEqual(tokens);
    });
  });

  describe('refresh()', () => {
    it('deve chamar refresh com o refreshToken do DTO', async () => {
      const newTokens = { accessToken: 'new-acc', refreshToken: 'new-ref' };
      svc.refresh.mockResolvedValue(newTokens);

      const result = await ctrl.refresh({ refreshToken: 'ref-tok' });

      expect(svc.refresh).toHaveBeenCalledWith('ref-tok');
      expect(result).toEqual(newTokens);
    });
  });

  describe('logout()', () => {
    it('deve chamar revogarRefreshToken com o refreshToken do DTO', async () => {
      svc.revogarRefreshToken.mockResolvedValue(undefined);

      await ctrl.logout({ refreshToken: 'ref-tok' });

      expect(svc.revogarRefreshToken).toHaveBeenCalledWith('ref-tok');
    });
  });

  describe('devLogin()', () => {
    it('deve chamar devLogin com o email quando DEV_LOGIN_ENABLED=true', async () => {
      process.env.DEV_LOGIN_ENABLED = 'true';
      const tokens = { accessToken: 'acc', refreshToken: 'ref' };
      svc.devLogin.mockResolvedValue(tokens);

      const result = await ctrl.devLogin({ email: 'dev@escola.edu.br' });

      expect(svc.devLogin).toHaveBeenCalledWith('dev@escola.edu.br');
      expect(result).toEqual(tokens);

      delete process.env.DEV_LOGIN_ENABLED;
    });

    it('deve lançar ForbiddenException quando DEV_LOGIN_ENABLED != true', async () => {
      delete process.env.DEV_LOGIN_ENABLED;

      await expect(ctrl.devLogin({ email: 'dev@escola.edu.br' }))
        .rejects.toThrow(ForbiddenException);

      expect(svc.devLogin).not.toHaveBeenCalled();
    });
  });
});
