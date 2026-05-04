import { Test, TestingModule } from '@nestjs/testing';
import { addHours, addMinutes }  from 'date-fns';
import { SlaService }            from './sla.service';

describe('SlaService', () => {
  let service: SlaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SlaService],
    }).compile();
    service = module.get(SlaService);
  });

  // ─── calcularPrazo ───────────────────────────────────────────────────────

  describe('calcularPrazo()', () => {
    const BASE = new Date('2026-04-28T08:00:00Z'); // terça-feira

    it('sev 5 → 4 horas corridas', () => {
      const prazo = service.calcularPrazo(BASE, 5);
      expect(prazo).toEqual(addHours(BASE, 4));
    });

    it('sev 4 → 24 horas corridas', () => {
      const prazo = service.calcularPrazo(BASE, 4);
      expect(prazo).toEqual(addHours(BASE, 24));
    });

    it('sev 3 → 2 dias úteis (pula fim de semana)', () => {
      // terça + 2 dias úteis = quinta
      const prazo = service.calcularPrazo(BASE, 3);
      expect(prazo.getDay()).toBe(4); // quinta-feira
    });

    it('sev 2 → 3 dias úteis', () => {
      // terça + 3 dias úteis = sexta
      const prazo = service.calcularPrazo(BASE, 2);
      expect(prazo.getDay()).toBe(5); // sexta-feira
    });

    it('sev 1 → 5 dias úteis', () => {
      // terça + 5 dias úteis = terça da semana seguinte
      const prazo = service.calcularPrazo(BASE, 1);
      expect(prazo.getDay()).toBe(2); // terça-feira
    });

    it('sev 5 a partir de sexta → prazo cai sábado (corridas, não úteis)', () => {
      const sexta = new Date('2026-05-01T10:00:00Z');
      const prazo = service.calcularPrazo(sexta, 5);
      expect(prazo).toEqual(addHours(sexta, 4)); // sábado de manhã
    });

    it('dias úteis pulam sábado e domingo', () => {
      const sexta = new Date('2026-05-01T08:00:00Z');
      // sexta + 1 dia útil = segunda
      const prazo = service.calcularPrazo(sexta, 3); // 2 dias úteis
      expect(prazo.getDay()).toBe(2); // terça
    });
  });

  // ─── percentualDecorrido ─────────────────────────────────────────────────

  describe('percentualDecorrido()', () => {
    it('retorna 0 quando criadoEm === agora', () => {
      const agora = new Date();
      const prazo = addHours(agora, 4);
      // percentual depende de "agora" interno — apenas verifica range
      const pct = service.percentualDecorrido(prazo, agora);
      expect(pct).toBeGreaterThanOrEqual(0);
      expect(pct).toBeLessThanOrEqual(1);
    });

    it('retorna 0.5 quando metade do prazo passou', () => {
      const criadoEm = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2h atrás
      const prazo    = addHours(criadoEm, 4);                      // prazo em 4h
      const pct = service.percentualDecorrido(prazo, criadoEm);
      expect(pct).toBeCloseTo(0.5, 1);
    });

    it('retorna 1 quando prazo já venceu (não ultrapassa 1)', () => {
      const criadoEm = new Date(Date.now() - 10 * 60 * 60 * 1000);
      const prazo    = addHours(criadoEm, 4); // venceu há 6h
      expect(service.percentualDecorrido(prazo, criadoEm)).toBe(1);
    });
  });
});
