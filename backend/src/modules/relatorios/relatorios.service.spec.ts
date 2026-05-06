import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken }  from '@nestjs/typeorm';
import { RelatoriosService }   from './relatorios.service';
import { Ocorrencia }          from '../ocorrencias/entities/ocorrencia.entity';
import { StatusOcorrencia }    from '../../common/enums/status-ocorrencia.enum';
import { Segmento }            from '../../common/enums/segmento.enum';
import { addHours, subHours }  from 'date-fns';

// ─── Factories ──────────────────────────────────────────────────────────────

const makeOc = (o: any = {}): Partial<Ocorrencia> => ({
  id:            'oc-1',
  codigo:        'OC-2026-00001-FM',
  severidade:    2,
  status:        StatusOcorrencia.ABERTA,
  dataIncidente: new Date('2026-04-01'),
  criadoEm:      new Date('2026-04-01T10:00:00Z'),
  slaPrazo:      addHours(new Date(), 24),     // não vencido por padrão
  dataResolucao: null as any,
  subcategoria:  null as any,
  aluno: {
    nome:     'Aluno Teste',
    segmento: Segmento.FUNDAMENTAL,
    campus:   'Campus A',
  } as any,
  categoria:    { nome: 'Disciplinar' } as any,
  registrador:  { nome: 'Prof. Teste' } as any,
  ...o,
});

// ─── Suite ───────────────────────────────────────────────────────────────────

describe('RelatoriosService', () => {
  let service: RelatoriosService;
  let qbMock: { [method: string]: jest.Mock };

  function buildQbMock(returnData: any[]) {
    const qb: any = {};
    const chainable = ['leftJoinAndSelect', 'andWhere', 'orderBy'];
    chainable.forEach(m => { qb[m] = jest.fn().mockReturnValue(qb); });
    qb.getMany = jest.fn().mockResolvedValue(returnData);
    return qb;
  }

  function mountService(data: any[]) {
    const qb = buildQbMock(data);
    const ocorrenciaRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(qb),
    };
    return { ocorrenciaRepo, qb };
  }

  async function createModule(data: any[]) {
    const { ocorrenciaRepo } = mountService(data);
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RelatoriosService,
        { provide: getRepositoryToken(Ocorrencia), useValue: ocorrenciaRepo },
      ],
    }).compile();
    return module.get(RelatoriosService);
  }

  // ── resumo() ──────────────────────────────────────────────────────────────

  describe('resumo()', () => {
    it('deve retornar totalOcorrencias correto', async () => {
      service = await createModule([makeOc(), makeOc({ id: 'oc-2' })]);
      const result = await service.resumo({});
      expect(result.totalOcorrencias).toBe(2);
    });

    it('deve agregar por status corretamente', async () => {
      service = await createModule([
        makeOc({ status: StatusOcorrencia.ABERTA }),
        makeOc({ id: 'oc-2', status: StatusOcorrencia.ABERTA }),
        makeOc({ id: 'oc-3', status: StatusOcorrencia.RESOLVIDA }),
      ]);
      const result = await service.resumo({});
      expect(result.porStatus[StatusOcorrencia.ABERTA]).toBe(2);
      expect(result.porStatus[StatusOcorrencia.RESOLVIDA]).toBe(1);
    });

    it('deve agregar por severidade corretamente', async () => {
      service = await createModule([
        makeOc({ severidade: 1 }),
        makeOc({ id: 'oc-2', severidade: 3 }),
        makeOc({ id: 'oc-3', severidade: 3 }),
      ]);
      const result = await service.resumo({});
      expect(result.porSeveridade['1']).toBe(1);
      expect(result.porSeveridade['3']).toBe(2);
    });

    it('deve agregar por segmento corretamente', async () => {
      service = await createModule([
        makeOc({ aluno: { nome: 'A', segmento: Segmento.FUNDAMENTAL, campus: 'A' } }),
        makeOc({ id: 'oc-2', aluno: { nome: 'B', segmento: Segmento.SUPERIOR, campus: 'A' } }),
      ]);
      const result = await service.resumo({});
      expect(result.porSegmento[Segmento.FUNDAMENTAL]).toBe(1);
      expect(result.porSegmento[Segmento.SUPERIOR]).toBe(1);
    });

    it('deve agregar por categoria ordenado por total DESC', async () => {
      service = await createModule([
        makeOc({ categoria: { nome: 'Acadêmica' } }),
        makeOc({ id: 'oc-2', categoria: { nome: 'Acadêmica' } }),
        makeOc({ id: 'oc-3', categoria: { nome: 'Disciplinar' } }),
      ]);
      const result = await service.resumo({});
      expect(result.porCategoria[0].nome).toBe('Acadêmica');
      expect(result.porCategoria[0].total).toBe(2);
      expect(result.porCategoria[1].nome).toBe('Disciplinar');
    });

    it('deve contar SLA vencidas corretamente', async () => {
      const agora = new Date();
      service = await createModule([
        makeOc({ slaPrazo: subHours(agora, 2), status: StatusOcorrencia.ABERTA }),        // vencida
        makeOc({ id: 'oc-2', slaPrazo: subHours(agora, 1), status: StatusOcorrencia.RESOLVIDA }), // vencida mas resolvida → não conta
        makeOc({ id: 'oc-3', slaPrazo: addHours(agora, 5), status: StatusOcorrencia.ABERTA }),    // não vencida
      ]);
      const result = await service.resumo({});
      expect(result.slaVencidas).toBe(1);
    });

    it('não deve contar SLA vencida em ocorrência ARQUIVADA', async () => {
      service = await createModule([
        makeOc({ slaPrazo: subHours(new Date(), 10), status: StatusOcorrencia.ARQUIVADA }),
      ]);
      const result = await service.resumo({});
      expect(result.slaVencidas).toBe(0);
    });

    it('deve retornar lista vazia quando não há ocorrências', async () => {
      service = await createModule([]);
      const result = await service.resumo({});
      expect(result.totalOcorrencias).toBe(0);
      expect(result.slaVencidas).toBe(0);
      expect(result.porCategoria).toHaveLength(0);
    });

    it('deve incluir período nos metadados quando filtros fornecidos', async () => {
      service = await createModule([]);
      const result = await service.resumo({ dataInicio: '2026-01-01', dataFim: '2026-12-31' });
      expect(result.periodo.inicio).toBe('2026-01-01');
      expect(result.periodo.fim).toBe('2026-12-31');
    });

    it('deve usar "—" para período quando sem filtro de data', async () => {
      service = await createModule([]);
      const result = await service.resumo({});
      expect(result.periodo.inicio).toBe('—');
      expect(result.periodo.fim).toBe('—');
    });

    it('deve tratar categoria/segmento ausente sem quebrar', async () => {
      service = await createModule([
        makeOc({ aluno: null, categoria: null }),
      ]);
      const result = await service.resumo({});
      expect(result.porSegmento['DESCONHECIDO']).toBe(1);
      expect(result.porCategoria[0].nome).toBe('Sem categoria');
    });
  });

  // ── exportarCsv() ─────────────────────────────────────────────────────────

  describe('exportarCsv()', () => {
    it('deve retornar cabeçalho com os campos esperados', async () => {
      service = await createModule([]);
      const csv = await service.exportarCsv({});
      const cabecalho = csv.split('\r\n')[0];
      expect(cabecalho).toContain('Código');
      expect(cabecalho).toContain('Severidade');
      expect(cabecalho).toContain('Status');
      expect(cabecalho).toContain('SLA Vencida');
    });

    it('deve conter uma linha por ocorrência além do cabeçalho', async () => {
      service = await createModule([makeOc(), makeOc({ id: 'oc-2', codigo: 'OC-2026-00002-FM' })]);
      const csv = await service.exportarCsv({});
      const linhas = csv.split('\r\n');
      expect(linhas).toHaveLength(3); // cabeçalho + 2 ocorrências
    });

    it('deve escapar aspas duplas em campos de texto (CSV injection defense)', async () => {
      service = await createModule([
        makeOc({ aluno: { nome: 'Aluno "Com Aspas"', segmento: Segmento.MEDIO, campus: 'A' } }),
      ]);
      const csv = await service.exportarCsv({});
      expect(csv).toContain('"Aluno ""Com Aspas"""');
    });

    it('deve marcar SLA Vencida = Sim para ocorrência com prazo expirado', async () => {
      service = await createModule([
        makeOc({ slaPrazo: subHours(new Date(), 5), status: StatusOcorrencia.ABERTA }),
      ]);
      const csv = await service.exportarCsv({});
      const linhas = csv.split('\r\n');
      expect(linhas[1]).toContain('"Sim"');
    });

    it('deve marcar SLA Vencida = Não para ocorrência resolvida mesmo com prazo expirado', async () => {
      service = await createModule([
        makeOc({ slaPrazo: subHours(new Date(), 5), status: StatusOcorrencia.RESOLVIDA }),
      ]);
      const csv = await service.exportarCsv({});
      const linhas = csv.split('\r\n');
      expect(linhas[1]).toContain('"Não"');
    });

    it('deve retornar apenas o cabeçalho quando não há ocorrências', async () => {
      service = await createModule([]);
      const csv = await service.exportarCsv({});
      const linhas = csv.split('\r\n');
      expect(linhas).toHaveLength(1);
    });

    it('deve usar separador ; para compatibilidade Excel', async () => {
      service = await createModule([makeOc()]);
      const csv = await service.exportarCsv({});
      const cabecalho = csv.split('\r\n')[0];
      expect(cabecalho).toContain(';');
      expect(cabecalho).not.toContain(',');
    });
  });
});
