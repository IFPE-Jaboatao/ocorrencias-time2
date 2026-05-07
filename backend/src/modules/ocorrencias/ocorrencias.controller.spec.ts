import { Test, TestingModule } from '@nestjs/testing';
import { OcorrenciasController } from './ocorrencias.controller';
import { OcorrenciasService }    from './ocorrencias.service';
import { CreateOcorrenciaDto }   from './dto/create-ocorrencia.dto';
import { FilterOcorrenciaDto }   from './dto/filter-ocorrencia.dto';
import { AuthenticatedUser }     from '../../common/interfaces/authenticated-user.interface';
import { PerfilUsuario }         from '../../common/enums/perfil-usuario.enum';
import { StatusOcorrencia }      from '../../common/enums/status-ocorrencia.enum';

const makeUser = (): AuthenticatedUser => ({
  sub: 'uid-1',
  email: 'x@x.com',
  nome: 'X',
  perfil: 'PROFESSOR' as any,
  campus: 'Campus A',
  segmentos: [] as any[],
});

describe('OcorrenciasController', () => {
  let ctrl: OcorrenciasController;
  let svc: jest.Mocked<OcorrenciasService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OcorrenciasController],
      providers: [
        {
          provide: OcorrenciasService,
          useValue: {
            criar:                   jest.fn(),
            listar:                  jest.fn(),
            verificarReincidencias:  jest.fn(),
            buscarPorId:             jest.fn(),
            alterarStatus:           jest.fn(),
          },
        },
      ],
    }).compile();

    ctrl = module.get(OcorrenciasController);
    svc  = module.get(OcorrenciasService) as jest.Mocked<OcorrenciasService>;
  });

  describe('criar()', () => {
    it('deve delegar ao service.criar() com dto e user e retornar o resultado', async () => {
      const dto  = { alunoId: 'aluno-1', severidade: 3 } as CreateOcorrenciaDto;
      const user = makeUser();
      const resultado = { id: 'oc-1', codigo: 'OC-2026-00001-FM' } as any;

      svc.criar.mockResolvedValue(resultado);

      const retorno = await ctrl.criar(dto, user);

      expect(svc.criar).toHaveBeenCalledTimes(1);
      expect(svc.criar).toHaveBeenCalledWith(dto, user);
      expect(retorno).toBe(resultado);
    });
  });

  describe('listar()', () => {
    it('deve delegar ao service.listar() com filtros e user e retornar o resultado', async () => {
      const filtros   = { page: 1, pageSize: 20 } as FilterOcorrenciaDto;
      const user      = makeUser();
      const resultado = { data: [], total: 0, page: 1, pageSize: 20, totalPages: 0 } as any;

      svc.listar.mockResolvedValue(resultado);

      const retorno = await ctrl.listar(filtros, user);

      expect(svc.listar).toHaveBeenCalledTimes(1);
      expect(svc.listar).toHaveBeenCalledWith(filtros, user);
      expect(retorno).toBe(resultado);
    });
  });

  describe('verificarReincidencias()', () => {
    it('deve delegar ao service.verificarReincidencias() com alunoId e user e retornar o resultado', async () => {
      const alunoId   = 'aluno-uuid-1';
      const user      = makeUser();
      const resultado = { totalNoPeriodo: 3, reincidente: true, categorias: [] } as any;

      svc.verificarReincidencias.mockResolvedValue(resultado);

      const retorno = await ctrl.verificarReincidencias(alunoId, user);

      expect(svc.verificarReincidencias).toHaveBeenCalledTimes(1);
      expect(svc.verificarReincidencias).toHaveBeenCalledWith(alunoId, user);
      expect(retorno).toBe(resultado);
    });
  });

  describe('buscarPorId()', () => {
    it('deve delegar ao service.buscarPorId() com id e user e retornar o resultado', async () => {
      const id        = 'oc-uuid-1';
      const user      = makeUser();
      const resultado = { id, codigo: 'OC-2026-00001-FM' } as any;

      svc.buscarPorId.mockResolvedValue(resultado);

      const retorno = await ctrl.buscarPorId(id, user);

      expect(svc.buscarPorId).toHaveBeenCalledTimes(1);
      expect(svc.buscarPorId).toHaveBeenCalledWith(id, user);
      expect(retorno).toBe(resultado);
    });
  });

  describe('alterarStatus()', () => {
    it('deve delegar ao service.alterarStatus() com id, status, user e justificativa e retornar o resultado', async () => {
      const id           = 'oc-uuid-1';
      const status       = StatusOcorrencia.EM_ACOMPANHAMENTO;
      const justificativa = 'Ocorrência encaminhada corretamente';
      const user         = makeUser();
      const resultado    = { id, status } as any;

      svc.alterarStatus.mockResolvedValue(resultado);

      const retorno = await ctrl.alterarStatus(id, status, justificativa, user);

      expect(svc.alterarStatus).toHaveBeenCalledTimes(1);
      expect(svc.alterarStatus).toHaveBeenCalledWith(id, status, user, justificativa);
      expect(retorno).toBe(resultado);
    });

    it('deve passar justificativa undefined quando não fornecida', async () => {
      const id     = 'oc-uuid-2';
      const status = StatusOcorrencia.RESOLVIDA;
      const user   = makeUser();

      svc.alterarStatus.mockResolvedValue({ id, status } as any);

      await ctrl.alterarStatus(id, status, undefined as any, user);

      expect(svc.alterarStatus).toHaveBeenCalledWith(id, status, user, undefined);
    });
  });
});
