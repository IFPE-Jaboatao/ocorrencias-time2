import { Test, TestingModule } from '@nestjs/testing';
import { UsuariosController } from './usuarios.controller';
import { UsuariosService }    from './usuarios.service';
import { CreateUsuarioDto }   from './dto/create-usuario.dto';
import { PerfilUsuario }      from '../../common/enums/perfil-usuario.enum';

describe('UsuariosController', () => {
  let ctrl: UsuariosController;
  let svc: jest.Mocked<UsuariosService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsuariosController],
      providers: [
        {
          provide: UsuariosService,
          useValue: {
            criar:        jest.fn(),
            listar:       jest.fn(),
            buscarPorId:  jest.fn(),
            alterarPerfil: jest.fn(),
            desativar:    jest.fn(),
          },
        },
      ],
    }).compile();

    ctrl = module.get(UsuariosController);
    svc  = module.get(UsuariosService) as jest.Mocked<UsuariosService>;
  });

  describe('criar()', () => {
    it('deve delegar ao service.criar() com dto e retornar o usuário criado', async () => {
      const dto       = { nome: 'Ana', email: 'ana@escola.edu.br', perfil: PerfilUsuario.PROFESSOR, campus: 'Campus A', segmentosResponsaveis: [] } as CreateUsuarioDto;
      const resultado = { id: 'usr-1', ...dto } as any;

      svc.criar.mockResolvedValue(resultado);

      const retorno = await ctrl.criar(dto);

      expect(svc.criar).toHaveBeenCalledTimes(1);
      expect(svc.criar).toHaveBeenCalledWith(dto);
      expect(retorno).toBe(resultado);
    });
  });

  describe('listar()', () => {
    it('deve delegar ao service.listar() sem argumentos e retornar a lista de usuários', async () => {
      const resultado = [{ id: 'usr-1', nome: 'Ana' }, { id: 'usr-2', nome: 'Bruno' }] as any[];

      svc.listar.mockResolvedValue(resultado);

      const retorno = await ctrl.listar();

      expect(svc.listar).toHaveBeenCalledTimes(1);
      expect(svc.listar).toHaveBeenCalledWith();
      expect(retorno).toBe(resultado);
    });

    it('deve retornar lista vazia quando não há usuários ativos', async () => {
      svc.listar.mockResolvedValue([]);

      const retorno = await ctrl.listar();

      expect(retorno).toEqual([]);
    });
  });

  describe('buscarPorId()', () => {
    it('deve delegar ao service.buscarPorId() com id e retornar o usuário', async () => {
      const id        = 'usr-uuid-1';
      const resultado = { id, nome: 'Ana' } as any;

      svc.buscarPorId.mockResolvedValue(resultado);

      const retorno = await ctrl.buscarPorId(id);

      expect(svc.buscarPorId).toHaveBeenCalledTimes(1);
      expect(svc.buscarPorId).toHaveBeenCalledWith(id);
      expect(retorno).toBe(resultado);
    });
  });

  describe('alterarPerfil()', () => {
    it('deve delegar ao service.alterarPerfil() com id e perfil e retornar o usuário atualizado', async () => {
      const id        = 'usr-uuid-1';
      const perfil    = PerfilUsuario.COORDENADOR;
      const resultado = { id, perfil } as any;

      svc.alterarPerfil.mockResolvedValue(resultado);

      const retorno = await ctrl.alterarPerfil(id, perfil);

      expect(svc.alterarPerfil).toHaveBeenCalledTimes(1);
      expect(svc.alterarPerfil).toHaveBeenCalledWith(id, perfil);
      expect(retorno).toBe(resultado);
    });
  });

  describe('desativar()', () => {
    it('deve delegar ao service.desativar() com id e retornar undefined', async () => {
      const id = 'usr-uuid-1';

      svc.desativar.mockResolvedValue(undefined);

      const retorno = await ctrl.desativar(id);

      expect(svc.desativar).toHaveBeenCalledTimes(1);
      expect(svc.desativar).toHaveBeenCalledWith(id);
      expect(retorno).toBeUndefined();
    });
  });
});
