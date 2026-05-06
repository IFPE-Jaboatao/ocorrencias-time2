import { Test, TestingModule }   from '@nestjs/testing';
import { getRepositoryToken }    from '@nestjs/typeorm';
import { EncaminhamentosService } from './encaminhamentos.service';
import { Encaminhamento, StatusEncaminhamento } from './entities/encaminhamento.entity';

// ─── Factories ───────────────────────────────────────────────────────────────

const makeEnc = (o: any = {}): Encaminhamento => ({
  id:                  'enc-1',
  ocorrenciaId:        'oc-1',
  tipo:                'PSICOLOGICO',
  responsavelId:       'u-1',
  responsavel:         null as any,
  prazo:               new Date('2026-12-31'),
  descricao:           'Acompanhamento psicológico semanal',
  status:              StatusEncaminhamento.PENDENTE,
  dataExecucao:        null as any,
  resultadoRegistrado: null as any,
  ...o,
});

// ─── Suite ───────────────────────────────────────────────────────────────────

describe('EncaminhamentosService', () => {
  let service: EncaminhamentosService;
  let repo: {
    save:           jest.Mock;
    create:         jest.Mock;
    find:           jest.Mock;
    findOneOrFail:  jest.Mock;
  };

  beforeEach(async () => {
    repo = {
      save:          jest.fn().mockImplementation(e => Promise.resolve({ id: 'enc-novo', ...e })),
      create:        jest.fn().mockImplementation(d => d),
      find:          jest.fn().mockResolvedValue([]),
      findOneOrFail: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EncaminhamentosService,
        { provide: getRepositoryToken(Encaminhamento), useValue: repo },
      ],
    }).compile();

    service = module.get(EncaminhamentosService);
  });

  // ── criar() ──────────────────────────────────────────────────────────────

  describe('criar()', () => {
    it('deve persistir encaminhamento com ocorrenciaId e dto mesclados', async () => {
      const dto = {
        tipo:          'PSICOLOGICO',
        responsavelId: 'u-1',
        prazo:         '2026-12-31',
        descricao:     'Acompanhamento',
      };

      await service.criar('oc-1', dto as any);

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ ocorrenciaId: 'oc-1', tipo: 'PSICOLOGICO' }),
      );
      expect(repo.save).toHaveBeenCalled();
    });

    it('deve retornar o encaminhamento criado', async () => {
      repo.save.mockResolvedValue(makeEnc());

      const result = await service.criar('oc-1', {
        tipo: 'ACADEMICO', responsavelId: 'u-2', prazo: '2026-11-30', descricao: 'Desc',
      } as any);

      expect(result.id).toBe('enc-1');
    });
  });

  // ── listarPorOcorrencia() ─────────────────────────────────────────────────

  describe('listarPorOcorrencia()', () => {
    it('deve buscar encaminhamentos pelo ocorrenciaId com relação responsavel', async () => {
      const lista = [makeEnc(), makeEnc({ id: 'enc-2' })];
      repo.find.mockResolvedValue(lista);

      const result = await service.listarPorOcorrencia('oc-1');

      expect(repo.find).toHaveBeenCalledWith({
        where:     { ocorrenciaId: 'oc-1' },
        relations: ['responsavel'],
      });
      expect(result).toHaveLength(2);
    });

    it('deve retornar lista vazia quando não há encaminhamentos', async () => {
      repo.find.mockResolvedValue([]);

      const result = await service.listarPorOcorrencia('oc-sem-enc');

      expect(result).toHaveLength(0);
    });
  });

  // ── registrarResultado() ──────────────────────────────────────────────────

  describe('registrarResultado()', () => {
    it('deve marcar status EXECUTADO, preencher dataExecucao e resultado', async () => {
      const enc = makeEnc();
      repo.findOneOrFail.mockResolvedValue(enc);
      repo.save.mockResolvedValue({ ...enc, status: StatusEncaminhamento.EXECUTADO });

      const result = await service.registrarResultado('enc-1', 'Resultado do acompanhamento');

      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          resultadoRegistrado: 'Resultado do acompanhamento',
          status:              StatusEncaminhamento.EXECUTADO,
        }),
      );
      expect(result.status).toBe(StatusEncaminhamento.EXECUTADO);
    });

    it('deve preencher dataExecucao com a data atual', async () => {
      const enc = makeEnc();
      repo.findOneOrFail.mockResolvedValue(enc);
      repo.save.mockImplementation(e => Promise.resolve(e));

      const antes = new Date();
      const result = await service.registrarResultado('enc-1', 'Resultado');
      const depois = new Date();

      expect(result.dataExecucao!.getTime()).toBeGreaterThanOrEqual(antes.getTime());
      expect(result.dataExecucao!.getTime()).toBeLessThanOrEqual(depois.getTime());
    });

    it('deve lançar erro quando encaminhamento não existe', async () => {
      repo.findOneOrFail.mockRejectedValue(new Error('Entity not found'));

      await expect(
        service.registrarResultado('nao-existe', 'Resultado'),
      ).rejects.toThrow();
    });
  });
});
