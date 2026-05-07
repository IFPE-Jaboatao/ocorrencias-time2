import { Test, TestingModule }   from '@nestjs/testing';
import { getRepositoryToken }    from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import * as XLSX                 from 'xlsx';
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

/** Gera um buffer Excel válido com as linhas informadas */
function makeExcelBuffer(rows: Record<string, string>[]): Buffer {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Alunos');
  return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
}

const LINHA_VALIDA = {
  matricula: '2026100', nome: 'Maria Teste', dataNascimento: '2010-03-15',
  segmento: 'FUNDAMENTAL', campus: 'Campus A', curso: 'Ensino Fundamental', turma: '7B',
};

// ─── Suite ───────────────────────────────────────────────────────────────────

describe('AlunosService', () => {
  let service: AlunosService;
  let repo: {
    save: jest.Mock; create: jest.Mock; findOne: jest.Mock; createQueryBuilder: jest.Mock;
  };
  let qb: any;

  beforeEach(async () => {
    qb = {
      andWhere:        jest.fn().mockReturnThis(),
      orderBy:         jest.fn().mockReturnThis(),
      take:            jest.fn().mockReturnThis(),
      skip:            jest.fn().mockReturnThis(),
      getMany:         jest.fn().mockResolvedValue([]),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    };

    repo = {
      save:               jest.fn().mockImplementation(e => Promise.resolve({ id: 'aluno-novo', ...e })),
      create:             jest.fn().mockImplementation(d => d),
      findOne:            jest.fn().mockResolvedValue(null),
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

  // ── atualizar() ───────────────────────────────────────────────────────────

  describe('atualizar()', () => {
    it('deve buscar o aluno, aplicar os campos e salvar', async () => {
      repo.findOne.mockResolvedValue(makeAluno());
      const dto = { nome: 'Novo Nome', turma: '9A' };
      const result = await service.atualizar('aluno-1', dto as any);
      expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({ nome: 'Novo Nome', turma: '9A' }));
      expect(result).toBeDefined();
    });

    it('deve lançar NotFoundException se o aluno não existir', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.atualizar('nao-existe', { nome: 'X' } as any)).rejects.toThrow(NotFoundException);
    });
  });

  // ── listar() ──────────────────────────────────────────────────────────────

  describe('listar()', () => {
    it('deve retornar envelope paginado com data, total, page, pageSize, totalPages', async () => {
      const alunos = [makeAluno(), makeAluno({ id: 'aluno-2', matricula: '2026002' })];
      qb.getManyAndCount.mockResolvedValue([alunos, 2]);

      const result = await service.listar({ page: 1, pageSize: 20 }, makeUser({ perfil: PerfilUsuario.ADMIN }));

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
      expect(result.totalPages).toBe(1);
    });

    it('deve aplicar filtro de campus para perfil PROFESSOR (H-08)', async () => {
      await service.listar({ page: 1, pageSize: 20 }, makeUser({ perfil: PerfilUsuario.PROFESSOR, campus: 'Campus A' }));
      expect(qb.andWhere).toHaveBeenCalledWith('a.campus = :campus', { campus: 'Campus A' });
    });

    it('deve aplicar filtro de campus para perfil COORDENADOR (H-08)', async () => {
      await service.listar({ page: 1, pageSize: 20 }, makeUser({ perfil: PerfilUsuario.COORDENADOR, campus: 'Campus B' }));
      expect(qb.andWhere).toHaveBeenCalledWith('a.campus = :campus', { campus: 'Campus B' });
    });

    it('Admin NÃO deve ter filtro de campus automático (visão global)', async () => {
      await service.listar({ page: 1, pageSize: 20 }, makeUser({ perfil: PerfilUsuario.ADMIN }));
      const andWhereCalls = qb.andWhere.mock.calls.map((c: any[]) => c[0]);
      expect(andWhereCalls).not.toContain(expect.stringContaining('campus'));
    });

    it('deve aplicar filtro de texto (q) quando informado', async () => {
      await service.listar({ q: 'Maria', page: 1, pageSize: 20 }, makeUser({ perfil: PerfilUsuario.ADMIN }));
      expect(qb.andWhere).toHaveBeenCalledWith(
        '(a.matricula LIKE :q OR a.nome LIKE :q)', { q: '%Maria%' },
      );
    });

    it('NÃO deve aplicar filtro de texto quando q está vazio', async () => {
      await service.listar({ q: '', page: 1, pageSize: 20 }, makeUser({ perfil: PerfilUsuario.ADMIN }));
      const andWhereCalls = qb.andWhere.mock.calls.map((c: any[]) => c[0]);
      expect(andWhereCalls).not.toContain(expect.stringContaining('matricula LIKE'));
    });

    it('deve aplicar filtro de segmento quando informado', async () => {
      await service.listar({ segmento: Segmento.MEDIO, page: 1, pageSize: 20 }, makeUser({ perfil: PerfilUsuario.ADMIN }));
      expect(qb.andWhere).toHaveBeenCalledWith('a.segmento = :seg', { seg: Segmento.MEDIO });
    });

    it('deve aplicar filtro de status quando informado', async () => {
      await service.listar({ status: StatusAluno.INATIVO, page: 1, pageSize: 20 }, makeUser({ perfil: PerfilUsuario.ADMIN }));
      expect(qb.andWhere).toHaveBeenCalledWith('a.status = :status', { status: StatusAluno.INATIVO });
    });

    it('deve usar skip correto para paginação (página 2)', async () => {
      await service.listar({ page: 2, pageSize: 10 }, makeUser({ perfil: PerfilUsuario.ADMIN }));
      expect(qb.skip).toHaveBeenCalledWith(10);
      expect(qb.take).toHaveBeenCalledWith(10);
    });

    it('deve calcular totalPages corretamente quando há mais de uma página', async () => {
      qb.getManyAndCount.mockResolvedValue([[], 45]);
      const result = await service.listar({ page: 1, pageSize: 20 }, makeUser({ perfil: PerfilUsuario.ADMIN }));
      expect(result.totalPages).toBe(3);
    });
  });

  // ── buscar() ──────────────────────────────────────────────────────────────

  describe('buscar() — H-08 scoping por perfil', () => {
    it('Professor: aplica filtro de campus', async () => {
      await service.buscar('João', makeUser({ perfil: PerfilUsuario.PROFESSOR, campus: 'Campus A' }));
      expect(qb.andWhere).toHaveBeenCalledWith('a.campus = :campus', { campus: 'Campus A' });
    });

    it('Coordenador: aplica filtro de campus', async () => {
      await service.buscar('Silva', makeUser({ perfil: PerfilUsuario.COORDENADOR, campus: 'Campus B' }));
      expect(qb.andWhere).toHaveBeenCalledWith('a.campus = :campus', { campus: 'Campus B' });
    });

    it('Admin: NÃO aplica filtro de campus (visão global)', async () => {
      await service.buscar('teste', makeUser({ perfil: PerfilUsuario.ADMIN }));
      const andWhereCalls = qb.andWhere.mock.calls.map((c: any[]) => c[0]);
      expect(andWhereCalls).not.toContain(expect.stringContaining('campus'));
    });

    it('Diretor: NÃO aplica filtro de campus (visão global)', async () => {
      await service.buscar('teste', makeUser({ perfil: PerfilUsuario.DIRETOR }));
      const andWhereCalls = qb.andWhere.mock.calls.map((c: any[]) => c[0]);
      expect(andWhereCalls).not.toContain(expect.stringContaining('campus'));
    });

    it('deve filtrar por status ATIVO', async () => {
      await service.buscar('João', makeUser());
      expect(qb.andWhere).toHaveBeenCalledWith('a.status = :status', { status: StatusAluno.ATIVO });
    });

    it('deve buscar por matrícula ou nome com LIKE', async () => {
      await service.buscar('2026', makeUser());
      expect(qb.andWhere).toHaveBeenCalledWith(
        '(a.matricula LIKE :q OR a.nome LIKE :q)', { q: '%2026%' },
      );
    });

    it('query vazia retorna todos os alunos sem filtro de texto', async () => {
      await service.buscar('', makeUser());
      const andWhereCalls = qb.andWhere.mock.calls.map((c: any[]) => c[0]);
      expect(andWhereCalls).not.toContain(expect.stringContaining('matricula LIKE'));
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

  // ── importarLote() ────────────────────────────────────────────────────────

  describe('importarLote()', () => {
    it('deve lançar BadRequestException se a planilha estiver vazia', async () => {
      const buffer = makeExcelBuffer([]);
      await expect(service.importarLote(buffer)).rejects.toThrow(BadRequestException);
    });

    it('deve importar linha válida e retornar importados=1', async () => {
      repo.findOne.mockResolvedValue(null); // matrícula não existe
      const buffer = makeExcelBuffer([LINHA_VALIDA]);
      const result = await service.importarLote(buffer);
      expect(result.importados).toBe(1);
      expect(result.ignorados).toBe(0);
      expect(result.erros).toHaveLength(0);
      expect(repo.save).toHaveBeenCalled();
    });

    it('deve ignorar matrícula duplicada (aluno já cadastrado)', async () => {
      repo.findOne.mockResolvedValue(makeAluno({ matricula: LINHA_VALIDA.matricula }));
      const buffer = makeExcelBuffer([LINHA_VALIDA]);
      const result = await service.importarLote(buffer);
      expect(result.ignorados).toBe(1);
      expect(result.importados).toBe(0);
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('deve registrar erro na linha com coluna obrigatória ausente', async () => {
      const linhaIncompleta = { matricula: '2026200', nome: 'Sem Campus', dataNascimento: '2010-01-01', segmento: 'FUNDAMENTAL', curso: 'X', turma: 'A' }; // sem campus
      const buffer = makeExcelBuffer([linhaIncompleta]);
      const result = await service.importarLote(buffer);
      expect(result.erros.length).toBeGreaterThan(0);
      expect(result.importados).toBe(0);
    });

    it('deve registrar erro em linha com segmento inválido', async () => {
      const linhaInvalida = { ...LINHA_VALIDA, matricula: '2026201', segmento: 'INVALIDO' };
      const buffer = makeExcelBuffer([linhaInvalida]);
      const result = await service.importarLote(buffer);
      expect(result.erros.length).toBeGreaterThan(0);
      expect(result.erros[0]).toContain('segmento inválido');
    });

    it('deve registrar erro em linha com data em formato inválido', async () => {
      const linhaDataInvalida = { ...LINHA_VALIDA, matricula: '2026202', dataNascimento: '15/03/2010' };
      const buffer = makeExcelBuffer([linhaDataInvalida]);
      const result = await service.importarLote(buffer);
      expect(result.erros.length).toBeGreaterThan(0);
      expect(result.erros[0]).toContain('dataNascimento');
    });

    it('deve importar múltiplas linhas e acumular contadores corretamente', async () => {
      repo.findOne
        .mockResolvedValueOnce(null)                                      // linha 1 → importa
        .mockResolvedValueOnce(makeAluno({ matricula: '2026302' }));      // linha 2 → ignora (duplicada)
      const linhas = [
        { ...LINHA_VALIDA, matricula: '2026301' },
        { ...LINHA_VALIDA, matricula: '2026302' },
      ];
      const buffer = makeExcelBuffer(linhas);
      const result = await service.importarLote(buffer);
      expect(result.importados).toBe(1);
      expect(result.ignorados).toBe(1);
      expect(result.erros).toHaveLength(0);
    });
  });

  // ── gerarTemplate() ───────────────────────────────────────────────────────

  describe('gerarTemplate()', () => {
    it('deve retornar um Buffer não vazio', () => {
      const buffer = service.gerarTemplate();
      expect(Buffer.isBuffer(buffer)).toBe(true);
      expect(buffer.length).toBeGreaterThan(0);
    });

    it('deve gerar um Excel com a planilha "Alunos" e cabeçalhos corretos', () => {
      const buffer  = service.gerarTemplate();
      const wb      = XLSX.read(buffer, { type: 'buffer' });
      expect(wb.SheetNames).toContain('Alunos');
      const ws      = wb.Sheets['Alunos'];
      const rows    = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { header: 1 });
      const cabecalho = rows[0] as unknown as string[];
      expect(cabecalho).toContain('matricula');
      expect(cabecalho).toContain('nome');
      expect(cabecalho).toContain('dataNascimento');
      expect(cabecalho).toContain('segmento');
      expect(cabecalho).toContain('campus');
      expect(cabecalho).toContain('curso');
      expect(cabecalho).toContain('turma');
    });

    it('deve incluir ao menos uma linha de exemplo após o cabeçalho', () => {
      const buffer  = service.gerarTemplate();
      const wb      = XLSX.read(buffer, { type: 'buffer' });
      const ws      = wb.Sheets['Alunos'];
      const rows    = XLSX.utils.sheet_to_json<Record<string, string>>(ws);
      expect(rows.length).toBeGreaterThanOrEqual(1);
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
