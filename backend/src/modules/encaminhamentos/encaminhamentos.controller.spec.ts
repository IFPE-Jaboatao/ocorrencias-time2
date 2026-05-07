import { Test, TestingModule }      from '@nestjs/testing';
import { EncaminhamentosController } from './encaminhamentos.controller';
import { EncaminhamentosService }    from './encaminhamentos.service';
import { CreateEncaminhamentoDto }   from './dto/create-encaminhamento.dto';

const makeDto = (): CreateEncaminhamentoDto => ({
  tipo:          'Encaminhar para psicólogo',
  responsavelId: 'resp-uuid-1',
  prazo:         '2026-06-01',
  descricao:     'Acompanhamento semanal',
});

const makeSvc = () => ({
  criar:               jest.fn().mockResolvedValue({}),
  listarPorOcorrencia: jest.fn().mockResolvedValue([]),
  registrarResultado:  jest.fn().mockResolvedValue({}),
});

describe('EncaminhamentosController', () => {
  let controller: EncaminhamentosController;
  let service: ReturnType<typeof makeSvc>;

  beforeEach(async () => {
    service = makeSvc();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [EncaminhamentosController],
      providers:   [{ provide: EncaminhamentosService, useValue: service }],
    }).compile();

    controller = module.get(EncaminhamentosController);
  });

  describe('criar()', () => {
    it('deve delegar ao service.criar() com ocorrenciaId e dto', async () => {
      const ocorrenciaId = 'oc-uuid-1';
      const dto          = makeDto();

      const result = await controller.criar(ocorrenciaId, dto);

      expect(service.criar).toHaveBeenCalledWith(ocorrenciaId, dto);
      expect(result).toEqual({});
    });

    it('deve retornar o que o service.criar() retornar', async () => {
      const encaminhamento = { id: 'enc-1', tipo: 'Psicólogo', status: 'PENDENTE' };
      service.criar.mockResolvedValue(encaminhamento);

      const result = await controller.criar('oc-uuid-1', makeDto());

      expect(result).toBe(encaminhamento);
    });
  });

  describe('listar()', () => {
    it('deve delegar ao service.listarPorOcorrencia() com ocorrenciaId', async () => {
      const ocorrenciaId = 'oc-uuid-2';

      const result = await controller.listar(ocorrenciaId);

      expect(service.listarPorOcorrencia).toHaveBeenCalledWith(ocorrenciaId);
      expect(result).toEqual([]);
    });

    it('deve retornar a lista que o service retornar', async () => {
      const lista = [{ id: 'enc-1' }, { id: 'enc-2' }];
      service.listarPorOcorrencia.mockResolvedValue(lista);

      const result = await controller.listar('oc-uuid-2');

      expect(result).toBe(lista);
    });
  });

  describe('registrarResultado()', () => {
    it('deve delegar ao service.registrarResultado() com id e resultado', async () => {
      const id        = 'enc-uuid-1';
      const resultado = 'Aluno atendido pelo psicólogo em 03/05/2026';

      const result = await controller.registrarResultado(id, resultado);

      expect(service.registrarResultado).toHaveBeenCalledWith(id, resultado);
      expect(result).toEqual({});
    });

    it('deve retornar o encaminhamento atualizado que o service retornar', async () => {
      const atualizado = { id: 'enc-uuid-1', status: 'EXECUTADO', resultadoRegistrado: 'Concluído' };
      service.registrarResultado.mockResolvedValue(atualizado);

      const result = await controller.registrarResultado('enc-uuid-1', 'Concluído');

      expect(result).toBe(atualizado);
    });
  });
});
