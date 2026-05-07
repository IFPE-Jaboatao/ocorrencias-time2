import { Test, TestingModule } from '@nestjs/testing';
import { ValidacoesController }  from './validacoes.controller';
import { ValidacoesService }     from './validacoes.service';
import { ValidarOcorrenciaDto }  from './dto/validar-ocorrencia.dto';
import { AuthenticatedUser }     from '../../common/interfaces/authenticated-user.interface';
import { TipoDecisao }           from './entities/validacao-ocorrencia.entity';

const makeUser = (): AuthenticatedUser => ({
  sub: 'uid-1',
  email: 'x@x.com',
  nome: 'X',
  perfil: 'PROFESSOR' as any,
  campus: 'Campus A',
  segmentos: [] as any[],
});

describe('ValidacoesController', () => {
  let ctrl: ValidacoesController;
  let svc: jest.Mocked<ValidacoesService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ValidacoesController],
      providers: [
        {
          provide: ValidacoesService,
          useValue: {
            validar:               jest.fn(),
            listarPorOcorrencia:   jest.fn(),
          },
        },
      ],
    }).compile();

    ctrl = module.get(ValidacoesController);
    svc  = module.get(ValidacoesService) as jest.Mocked<ValidacoesService>;
  });

  describe('validar()', () => {
    it('deve delegar ao service.validar() com ocorrenciaId, dto e user e retornar o resultado', async () => {
      const ocorrenciaId = 'oc-uuid-1';
      const dto          = { tipoDecisao: TipoDecisao.VALIDAR, justificativa: 'Ocorrência verificada e confirmada corretamente.' } as ValidarOcorrenciaDto;
      const user         = makeUser();
      const resultado    = { id: 'val-1', ocorrenciaId, tipoDecisao: TipoDecisao.VALIDAR } as any;

      svc.validar.mockResolvedValue(resultado);

      const retorno = await ctrl.validar(ocorrenciaId, dto, user);

      expect(svc.validar).toHaveBeenCalledTimes(1);
      expect(svc.validar).toHaveBeenCalledWith(ocorrenciaId, dto, user);
      expect(retorno).toBe(resultado);
    });

    it('deve passar o ocorrenciaId da rota, não do body', async () => {
      const ocorrenciaId = 'oc-uuid-rota';
      const dto          = { tipoDecisao: TipoDecisao.DEVOLVER, justificativa: 'Faltam informações suficientes para validação.' } as ValidarOcorrenciaDto;
      const user         = makeUser();

      svc.validar.mockResolvedValue({ id: 'val-2' } as any);

      await ctrl.validar(ocorrenciaId, dto, user);

      expect(svc.validar).toHaveBeenCalledWith(ocorrenciaId, dto, user);
    });
  });

  describe('listar()', () => {
    it('deve delegar ao service.listarPorOcorrencia() com ocorrenciaId e retornar a lista', async () => {
      const ocorrenciaId = 'oc-uuid-1';
      const resultado    = [{ id: 'val-1', ocorrenciaId }] as any[];

      svc.listarPorOcorrencia.mockResolvedValue(resultado);

      const retorno = await ctrl.listar(ocorrenciaId);

      expect(svc.listarPorOcorrencia).toHaveBeenCalledTimes(1);
      expect(svc.listarPorOcorrencia).toHaveBeenCalledWith(ocorrenciaId);
      expect(retorno).toBe(resultado);
    });

    it('deve retornar lista vazia quando a ocorrência não tem validações', async () => {
      svc.listarPorOcorrencia.mockResolvedValue([]);

      const retorno = await ctrl.listar('oc-sem-validacoes');

      expect(retorno).toEqual([]);
    });
  });
});
