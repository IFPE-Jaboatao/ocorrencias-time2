import { Test, TestingModule }   from '@nestjs/testing';
import { getRepositoryToken }    from '@nestjs/typeorm';
import { DashboardService }      from './dashboard.service';
import { Ocorrencia }            from '../ocorrencias/entities/ocorrencia.entity';
import { PerfilUsuario }         from '../../common/enums/perfil-usuario.enum';
import { AuthenticatedUser }     from '../../common/interfaces/authenticated-user.interface';

// ─── Factories ───────────────────────────────────────────────────────────────

const makeUser = (o: Partial<AuthenticatedUser> = {}): AuthenticatedUser => ({
  sub:       'u-1',
  email:     'x@escola.edu.br',
  nome:      'X',
  campus:    'Campus A',
  perfil:    PerfilUsuario.COORDENADOR,
  segmentos: [],
  ...o,
});

// Cria um mock de QueryBuilder cujas queries retornam sempre via Promise.all
function makeFakeQb(opts: {
  counts?: number[];        // valores retornados pelo getCount() em sequência
  rawMany?: any[];          // valor retornado pelo getRawMany()
  whereCapture?: jest.Mock; // spy para verificar chamadas de where()
} = {}) {
  const { counts = [10, 3, 2, 1, 0, 1], rawMany = [], whereCapture = jest.fn() } = opts;
  let cloneIdx = 0;

  // Sub-mock retornado por cada clone()
  const makeCloneMock = () => {
    const idx = cloneIdx++;
    const m: any = {
      andWhere:   jest.fn().mockReturnThis(),
      select:     jest.fn().mockReturnThis(),
      addSelect:  jest.fn().mockReturnThis(),
      groupBy:    jest.fn().mockReturnThis(),
      getCount:   jest.fn().mockResolvedValue(counts[idx] ?? 0),
      getRawMany: jest.fn().mockResolvedValue(rawMany),
    };
    return m;
  };

  const base: any = {
    leftJoin:  jest.fn().mockReturnThis(),
    where:     whereCapture,
    andWhere:  jest.fn().mockReturnThis(),
    clone:     jest.fn().mockImplementation(makeCloneMock),
  };
  // where() precisa retornar o próprio base (encadeamento)
  whereCapture.mockReturnThis();
  return base;
}

async function createService(qbInstance: any) {
  const repo = { createQueryBuilder: jest.fn().mockReturnValue(qbInstance) };
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      DashboardService,
      { provide: getRepositoryToken(Ocorrencia), useValue: repo },
    ],
  }).compile();
  return module.get(DashboardService);
}

// ─── Suite ───────────────────────────────────────────────────────────────────

describe('DashboardService', () => {
  // ── resumo() ─────────────────────────────────────────────────────────────

  describe('resumo()', () => {
    it('deve retornar todos os campos esperados no fluxo feliz', async () => {
      const qb      = makeFakeQb({ rawMany: [{ severidade: 2, cnt: '5' }] });
      const service = await createService(qb);

      const result = await service.resumo(makeUser());

      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('abertas');
      expect(result).toHaveProperty('aguardandoValidacao');
      expect(result).toHaveProperty('emAcompanhamento');
      expect(result).toHaveProperty('resolvidasHoje');
      expect(result).toHaveProperty('slaVencidas');
      expect(result).toHaveProperty('porSeveridade');
    });

    it('deve converter porSeveridade de string para number', async () => {
      const qb      = makeFakeQb({ rawMany: [{ severidade: 3, cnt: '7' }] });
      const service = await createService(qb);

      const result = await service.resumo(makeUser());

      expect(typeof result.porSeveridade[3]).toBe('number');
      expect(result.porSeveridade[3]).toBe(7);
    });

    it('deve retornar porSeveridade vazio quando não há dados', async () => {
      const qb      = makeFakeQb({ rawMany: [] });
      const service = await createService(qb);

      const result = await service.resumo(makeUser());

      expect(Object.keys(result.porSeveridade)).toHaveLength(0);
    });

    it('H-08: Professor aplica filtro por registradorId', async () => {
      const spy     = jest.fn();
      const qb      = makeFakeQb({ whereCapture: spy });
      const service = await createService(qb);
      const prof    = makeUser({ perfil: PerfilUsuario.PROFESSOR, sub: 'prof-1' });

      await service.resumo(prof);

      expect(spy).toHaveBeenCalledWith(
        'oc.registradorId = :uid', { uid: 'prof-1' },
      );
    });

    it('H-08: Admin NÃO aplica filtro de escopo', async () => {
      const spy     = jest.fn();
      const qb      = makeFakeQb({ whereCapture: spy });
      const service = await createService(qb);

      await service.resumo(makeUser({ perfil: PerfilUsuario.ADMIN }));

      expect(spy).not.toHaveBeenCalled();
    });

    it('H-08: Diretor NÃO aplica filtro de escopo', async () => {
      const spy     = jest.fn();
      const qb      = makeFakeQb({ whereCapture: spy });
      const service = await createService(qb);

      await service.resumo(makeUser({ perfil: PerfilUsuario.DIRETOR }));

      expect(spy).not.toHaveBeenCalled();
    });

    it('H-08: Coordenador aplica filtro por campus', async () => {
      const spy     = jest.fn();
      const qb      = makeFakeQb({ whereCapture: spy });
      const service = await createService(qb);

      await service.resumo(makeUser({ perfil: PerfilUsuario.COORDENADOR, campus: 'Campus B' }));

      expect(spy).toHaveBeenCalledWith(
        'aluno.campus = :campus', { campus: 'Campus B' },
      );
    });

    it('H-08: Equipe Pedagógica aplica filtro por campus', async () => {
      const spy     = jest.fn();
      const qb      = makeFakeQb({ whereCapture: spy });
      const service = await createService(qb);

      await service.resumo(makeUser({ perfil: PerfilUsuario.EQUIPE_PEDAGOGICA, campus: 'Campus C' }));

      expect(spy).toHaveBeenCalledWith(
        'aluno.campus = :campus', { campus: 'Campus C' },
      );
    });
  });
});
