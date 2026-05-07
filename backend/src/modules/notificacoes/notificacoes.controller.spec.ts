import { Test, TestingModule }  from '@nestjs/testing';
import { NotificacoesController } from './notificacoes.controller';
import { NotificacoesService }    from './notificacoes.service';
import { AuthenticatedUser }      from '../../common/interfaces/authenticated-user.interface';
import { PerfilUsuario }          from '../../common/enums/perfil-usuario.enum';

const makeUser = (): AuthenticatedUser => ({
  sub:       'uid-1',
  email:     'x@x.com',
  nome:      'X',
  perfil:    PerfilUsuario.PROFESSOR,
  campus:    'Campus A',
  segmentos: [],
});

const makeSvc = () => ({
  listarParaUsuario: jest.fn().mockResolvedValue([]),
  marcarLida:        jest.fn().mockResolvedValue(undefined),
});

describe('NotificacoesController', () => {
  let controller: NotificacoesController;
  let service: ReturnType<typeof makeSvc>;

  beforeEach(async () => {
    service = makeSvc();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificacoesController],
      providers:   [{ provide: NotificacoesService, useValue: service }],
    }).compile();

    controller = module.get(NotificacoesController);
  });

  describe('listar()', () => {
    it('deve delegar ao service.listarParaUsuario() com o sub do usuário autenticado', async () => {
      const user = makeUser();

      const result = await controller.listar(user);

      expect(service.listarParaUsuario).toHaveBeenCalledWith(user.sub);
      expect(result).toEqual([]);
    });

    it('deve retornar a lista que o service retornar', async () => {
      const notificacoes = [{ id: 'n-1', canal: 'IN_APP' }, { id: 'n-2', canal: 'EMAIL' }];
      service.listarParaUsuario.mockResolvedValue(notificacoes);

      const result = await controller.listar(makeUser());

      expect(result).toBe(notificacoes);
    });
  });

  describe('marcarLida()', () => {
    it('deve delegar ao service.marcarLida() com o id da notificação', async () => {
      const id = 'notif-uuid-1';

      await controller.marcarLida(id);

      expect(service.marcarLida).toHaveBeenCalledWith(id);
    });

    it('deve retornar o que o service.marcarLida() retornar', async () => {
      service.marcarLida.mockResolvedValue(undefined);

      const result = await controller.marcarLida('notif-uuid-1');

      expect(result).toBeUndefined();
    });
  });
});
