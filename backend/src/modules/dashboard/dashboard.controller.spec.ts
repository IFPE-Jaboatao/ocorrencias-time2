import { Test, TestingModule } from '@nestjs/testing';
import { DashboardController }  from './dashboard.controller';
import { DashboardService }     from './dashboard.service';
import { AuthenticatedUser }    from '../../common/interfaces/authenticated-user.interface';
import { PerfilUsuario }        from '../../common/enums/perfil-usuario.enum';

const makeUser = (): AuthenticatedUser => ({
  sub:       'uid-1',
  email:     'x@x.com',
  nome:      'X',
  perfil:    PerfilUsuario.PROFESSOR,
  campus:    'Campus A',
  segmentos: [],
});

const makeSvc = () => ({
  resumo:        jest.fn().mockResolvedValue({}),
  porSeveridade: jest.fn().mockResolvedValue([]),
});

describe('DashboardController', () => {
  let controller: DashboardController;
  let service: ReturnType<typeof makeSvc>;

  beforeEach(async () => {
    service = makeSvc();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DashboardController],
      providers:   [{ provide: DashboardService, useValue: service }],
    }).compile();

    controller = module.get(DashboardController);
  });

  describe('resumo()', () => {
    it('deve delegar ao service.resumo() passando o usuário autenticado', async () => {
      const user = makeUser();
      const result = await controller.resumo(user);

      expect(service.resumo).toHaveBeenCalledWith(user);
      expect(result).toEqual({});
    });

    it('deve retornar o que o service.resumo() retornar', async () => {
      const payload = { total: 5, abertas: 2, slaVencidas: 1, porSeveridade: {} };
      service.resumo.mockResolvedValue(payload);

      const result = await controller.resumo(makeUser());

      expect(result).toBe(payload);
    });
  });

  describe('porSeveridade()', () => {
    it('deve delegar ao service.porSeveridade() passando o usuário autenticado', async () => {
      const user = makeUser();
      const result = await controller.porSeveridade(user);

      expect(service.porSeveridade).toHaveBeenCalledWith(user);
      expect(result).toEqual([]);
    });

    it('deve retornar o que o service.porSeveridade() retornar', async () => {
      const payload = [{ severidade: 3, total: '8' }];
      service.porSeveridade.mockResolvedValue(payload);

      const result = await controller.porSeveridade(makeUser());

      expect(result).toBe(payload);
    });
  });
});
