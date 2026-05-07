import { Test, TestingModule }   from '@nestjs/testing';
import { getRepositoryToken }    from '@nestjs/typeorm';
import { NotFoundException }     from '@nestjs/common';
import { AlunosService }         from './alunos.service';
import { Aluno, StatusAluno }    from './entities/aluno.entity';
import { PerfilUsuario }         from '../../common/enums/perfil-usuario.enum';
import { Segmento }              from '../../common/enums/segmento.enum';
import { AuthenticatedUser }     from '../../common/interfaces/authenticated-user.interface';
import { subYears }              from 'date-fns';

// ─── Factories ───────────────────────────────────────────────────────────────

const makeAluno = (o: any = {}): Aluno => ({
  id:             'aluno-1',
  matricula:      '2026001',
  nome:           'João Silva',
  dataNascimento: new Date('2010-06-15'),
  cpfEncriptado:  '',
  fotoUrl:        null as any,
  segmento:       Segmento.FUNDAMENTAL,
  campus:         'Campus A',
  curso:          'Ensino Fundamental',
  turma:          '8A',
  status:         StatusAluno.ATIVO,
  criadoEm:       new Date(),
  atualizadoEm:   new Date(),
  responsaveisLegais: [],
  ocorrencias:    [],
  ...o,
});

const makeUser = (o: Partial<AuthenticatedUser> = {}): AuthenticatedUser => ({
  sub:       'u-1',
  email:     'x@escola.edu.br',
  nome:      'X',
  campus:    'Campus A',
  perfil:    PerfilUsuario.PROFESSOR,
  segmentos: [],
  ...o,
});

// ─── Suite ───────────────────────────────────────────────────────────────────

describe('AlunosService', () => {
  let service: AlunosService;
  let repo: { save: jest.Mock; create: jest.Mock; findOne: jest.Mock; createQueryBuilder: jest.Mock };
  let qb: any;

  beforeEach(async () => {
    qb = {
      where:    jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy:  jest.fn().mockReturnThis(),
      take:     jest.fn().mockReturnThis(),
      getMany:  jest.fn().mockResolvedValue([]),
    };

    repo = {
      save:               jest.fn().mockImplementation(e => Promise.resolve({ id: 'aluno-novo', ...e })),
      create:             jest.fn().mockImplementation(d => d),
      findOne:            jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(qb),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlunosService,
        { provide: getRepositoryToken(Aluno), useValue: repo },
      ],
    }).compile();

    service = module.get(AlunosService);
  });

  // ── criar() ───────────────────────────────────────────────────────────────

  describe('criar()', () => {
    it('deve persistir e retornar o aluno criado', async () => {
      const dto = { matricula: '2026001', nome: 'Aluno Teste', segmento: Segmento.FUNDAMENTAL };

      await service.criar(dto as any);

      expect(repo.create).toHaveBeenCalledWith(dto);
      expect(repo.save).toHaveBeenCalled();
    });
  });

  // ── buscar() ──────────────────────────────────────────────────────────────

  describe('buscar() — H-08 scoping por perfil', () => {
    it('Professor: aplica filtro de campus', async () => {
      const user = makeUser({ perfil: PerfilUsuario.PROFESSOR, campus: 'Campus A' });

      await service.buscar('João', user);

      expect(qb.andWhere).toHaveBeenCalledWith(
        'a.campus = :campus', { campus: 'Campus A' },
      );
    });

    it('Coordenador: aplica filtro de campus', async () => {
      const user = makeUser({ perfil: PerfilUsuario.COORDENADOR, campus: 'Campus B' });

      await service.buscar('Silva', user);

      expect(qb.andWhere).toHaveBeenCalledWith(
        'a.campus = :campus', { campus: 'Campus B' },
      );
    });

    it('Admin: NÃO aplica filtro de campus (visão global)', async () => {
      const user = makeUser({ perfil: PerfilUsuario.ADMIN });

      await service.buscar('teste', user);

      const andWhereCalls = qb.andWhere.mock.calls.map((c: any[]) => c[0]);
      expect(andWhereCalls).not.toContain(expect.stringContaining('campus'));
    });

    it('Diretor: NÃO aplica filtro de campus (visão global)', async () => {
      const user = makeUser({ perfil: PerfilUsuario.DIRETOR });

      await service.buscar('teste', user);

      const andWhereCalls = qb.andWhere.mock.calls.map((c: any[]) => c[0]);
      expect(andWhereCalls).not.toContain(expect.stringContaining('campus'));
    });

    it('deve filtrar por status ATIVO', async () => {
      await service.buscar('João', makeUser());

      expect(qb.andWhere).toHaveBeenCalledWith(
        'a.status = :status', { status: StatusAluno.ATIVO },
      );
    });

    it('deve buscar por matrícula ou nome com LIKE', async () => {
      await service.buscar('2026', makeUser());

      // Filtro de texto usa andWhere (condicional — só quando termo não vazio)
      expect(qb.andWhere).toHaveBeenCalledWith(
        '(a.matricula LIKE :q OR a.nome LIKE :q)',
        { q: '%2026%' },
      );
    });

    it('query vazia retorna todos os alunos sem filtro de texto', async () => {
      await service.buscar('', makeUser());

      const andWhereCalls = qb.andWhere.mock.calls.map((c: any[]) => c[0]);
      expect(andWhereCalls).not.toContain(
        expect.stringContaining('matricula LIKE'),
      );
    });
  });

  // ── buscarPorId() ─────────────────────────────────────────────────────────

  describe('buscarPorId()', () => {
    it('deve retornar o aluno quando encontrado', async () => {
      repo.findOne.mockResolvedValue(makeAluno());

      const result = await service.buscarPorId('aluno-1');

      expect(result.id).toBe('aluno-1');
    });

    it('deve lançar NotFoundException quando aluno não existe', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.buscarPorId('nao-existe')).rejects.toThrow(NotFoundException);
    });
  });

  // ── eMenorDeIdade() ───────────────────────────────────────────────────────

  describe('eMenorDeIdade()', () => {
    it('deve retornar true para aluno com 14 anos', () => {
      expect(service.eMenorDeIdade(subYears(new Date(), 14))).toBe(true);
    });

    it('deve retornar true para aluno com 17 anos (borda)', () => {
      expect(service.eMenorDeIdade(subYears(new Date(), 17))).toBe(true);
    });

    it('deve retornar false para aluno com exatamente 18 anos', () => {
      expect(service.eMenorDeIdade(subYears(new Date(), 18))).toBe(false);
    });

    it('deve retornar false para aluno com 22 anos', () => {
      expect(service.eMenorDeIdade(subYears(new Date(), 22))).toBe(false);
    });
  });
});
