import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken }  from '@nestjs/typeorm';
import { EventEmitter2 }       from '@nestjs/event-emitter';
import { SlaMonitorTask }      from './sla-monitor.task';
import { Ocorrencia }          from '../../ocorrencias/entities/ocorrencia.entity';
import { StatusOcorrencia }    from '../../../common/enums/status-ocorrencia.enum';
import { SLA_ALERTA_PERCENTUAL } from '../../../common/constants/domain.constants';
import { addHours, subHours }  from 'date-fns';

// ─── Factories ──────────────────────────────────────────────────────────────

const makeOc = (o: any = {}): Partial<Ocorrencia> => ({
  id:         'oc-1',
  codigo:     'OC-2026-00001-FM',
  status:     StatusOcorrencia.ABERTA,
  criadoEm:   subHours(new Date(), 10),
  slaPrazo:   addHours(new Date(), 5),
  ...o,
});

// ─── Suite ───────────────────────────────────────────────────────────────────

describe('SlaMonitorTask', () => {
  let task: SlaMonitorTask;
  let eventEmitter: { emit: jest.Mock };
  let repo: {
    find: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let qb: any;

  beforeEach(async () => {
    eventEmitter = { emit: jest.fn() };

    qb = {
      where:      jest.fn().mockReturnThis(),
      andWhere:   jest.fn().mockReturnThis(),
      getMany:    jest.fn().mockResolvedValue([]),
    };

    repo = {
      find:               jest.fn().mockResolvedValue([]),
      createQueryBuilder: jest.fn().mockReturnValue(qb),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SlaMonitorTask,
        { provide: getRepositoryToken(Ocorrencia), useValue: repo },
        { provide: EventEmitter2, useValue: eventEmitter },
      ],
    }).compile();

    task = module.get(SlaMonitorTask);
  });

  // ── SLA vencido ───────────────────────────────────────────────────────────

  describe('verificarPrazos() — SLA vencido', () => {
    it('deve emitir sla.vencido para cada ocorrência com prazo expirado', async () => {
      const oc1 = makeOc({ id: 'oc-1', codigo: 'OC-01' });
      const oc2 = makeOc({ id: 'oc-2', codigo: 'OC-02' });
      repo.find.mockResolvedValue([oc1, oc2]);

      await task.verificarPrazos();

      expect(eventEmitter.emit).toHaveBeenCalledWith('sla.vencido', { ocorrencia: oc1 });
      expect(eventEmitter.emit).toHaveBeenCalledWith('sla.vencido', { ocorrencia: oc2 });
    });

    it('não deve emitir sla.vencido quando não há ocorrências vencidas', async () => {
      repo.find.mockResolvedValue([]);

      await task.verificarPrazos();

      expect(eventEmitter.emit).not.toHaveBeenCalledWith(
        'sla.vencido', expect.anything(),
      );
    });
  });

  // ── Alerta 75% ───────────────────────────────────────────────────────────

  describe('verificarPrazos() — alerta 75%', () => {
    it('deve emitir sla.alerta_75pct quando percentual decorrido >= 75%', async () => {
      // criadoEm = 10h atrás, slaPrazo = daqui a 2h → total 12h, decorrido 10h = 83% ≥ 75%
      const oc = makeOc({
        criadoEm: subHours(new Date(), 10),
        slaPrazo: addHours(new Date(), 2),
      });
      qb.getMany.mockResolvedValue([oc]);

      await task.verificarPrazos();

      expect(eventEmitter.emit).toHaveBeenCalledWith('sla.alerta_75pct', { ocorrencia: oc });
    });

    it('NÃO deve emitir sla.alerta_75pct quando percentual decorrido < 75%', async () => {
      // criadoEm = 1h atrás, slaPrazo = daqui a 10h → total 11h, decorrido 1h ≈ 9% < 75%
      const oc = makeOc({
        criadoEm: subHours(new Date(), 1),
        slaPrazo: addHours(new Date(), 10),
      });
      qb.getMany.mockResolvedValue([oc]);

      await task.verificarPrazos();

      expect(eventEmitter.emit).not.toHaveBeenCalledWith(
        'sla.alerta_75pct', expect.anything(),
      );
    });

    it('deve respeitar exatamente o limiar SLA_ALERTA_PERCENTUAL (75%)', async () => {
      // Percentual exato de 75%: 3h decorridas de 4h total
      const total = 4; // horas
      const decorrido = total * SLA_ALERTA_PERCENTUAL; // 3h
      const oc = makeOc({
        criadoEm: subHours(new Date(), decorrido),
        slaPrazo: addHours(new Date(), total - decorrido),
      });
      qb.getMany.mockResolvedValue([oc]);

      await task.verificarPrazos();

      expect(eventEmitter.emit).toHaveBeenCalledWith('sla.alerta_75pct', { ocorrencia: oc });
    });

    it('deve ignorar ocorrências sem slaPrazo na checagem de 75%', async () => {
      const oc = makeOc({ slaPrazo: null });
      qb.getMany.mockResolvedValue([oc]);

      await expect(task.verificarPrazos()).resolves.not.toThrow();
      expect(eventEmitter.emit).not.toHaveBeenCalledWith(
        'sla.alerta_75pct', expect.anything(),
      );
    });

    it('não deve emitir alerta_75pct quando não há ocorrências ativas no prazo', async () => {
      qb.getMany.mockResolvedValue([]);

      await task.verificarPrazos();

      expect(eventEmitter.emit).not.toHaveBeenCalledWith(
        'sla.alerta_75pct', expect.anything(),
      );
    });
  });

  // ── combinado ────────────────────────────────────────────────────────────

  describe('verificarPrazos() — comportamento geral', () => {
    it('não deve lançar exceção quando repositório retorna listas vazias', async () => {
      repo.find.mockResolvedValue([]);
      qb.getMany.mockResolvedValue([]);

      await expect(task.verificarPrazos()).resolves.not.toThrow();
    });

    it('deve processar vencidas e alertas de 75% na mesma execução', async () => {
      const vencida = makeOc({ id: 'oc-vencida' });
      repo.find.mockResolvedValue([vencida]);

      const emAlerta = makeOc({
        id:       'oc-alerta',
        criadoEm: subHours(new Date(), 10),
        slaPrazo: addHours(new Date(), 2),
      });
      qb.getMany.mockResolvedValue([emAlerta]);

      await task.verificarPrazos();

      expect(eventEmitter.emit).toHaveBeenCalledWith('sla.vencido',      { ocorrencia: vencida });
      expect(eventEmitter.emit).toHaveBeenCalledWith('sla.alerta_75pct', { ocorrencia: emAlerta });
    });
  });
});
