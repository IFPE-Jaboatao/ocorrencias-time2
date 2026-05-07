import { Test, TestingModule } from '@nestjs/testing';
import { AlunosController }    from './alunos.controller';
import { AlunosService }       from './alunos.service';
import { AuthenticatedUser }   from '../../common/interfaces/authenticated-user.interface';
import { PerfilUsuario }       from '../../common/enums/perfil-usuario.enum';
import { Segmento }            from '../../common/enums/segmento.enum';
import { StatusAluno }         from './entities/aluno.entity';

// ─── Factories ───────────────────────────────────────────────────────────────

const makeUser = (o: Partial<AuthenticatedUser> = {}): AuthenticatedUser => ({
  sub:       'uid-1',
  perfil:    PerfilUsuario.PROFESSOR,
  campus:    'Campus A',
  segmentos: [],
  email:     'prof@escola.edu.br',
  nome:      'Professor Teste',
  ...o,
});

const makeAluno = (o: any = {}) => ({
  id: 'aluno-1', matricula: '2026001', nome: 'João Silva',
  segmento: Segmento.FUNDAMENTAL, campus: 'Campus A',
  curso: 'Ensino Fundamental', turma: '8A', status: StatusAluno.ATIVO,
  ...o,
});

const makePaginated = (items: any[] = []) => ({
  data: items, total: items.length, page: 1, pageSize: 20,
  totalPages: Math.ceil(items.length / 20) || 1,
});

// ─── Suite ───────────────────────────────────────────────────────────────────

describe('AlunosController', () => {
  let ctrl: AlunosController;
  let svc:  jest.Mocked<AlunosService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AlunosController],
      providers: [{
        provide: AlunosService,
        useValue: {
          criar:         jest.fn(),
          listar:        jest.fn(),
          atualizar:     jest.fn(),
          buscar:        jest.fn(),
          buscarPorId:   jest.fn(),
          importarLote:  jest.fn(),
          gerarTemplate: jest.fn(),
        },
      }],
    }).compile();

    ctrl = module.get(AlunosController);
    svc  = module.get(AlunosService) as jest.Mocked<AlunosService>;
  });

  // ── criar() ───────────────────────────────────────────────────────────────

  describe('criar()', () => {
    it('deve delegar ao service.criar com o DTO recebido', async () => {
      const dto = { matricula: '2026001', nome: 'Aluno Teste', dataNascimento: '2010-05-01',
                    segmento: Segmento.FUNDAMENTAL, campus: 'Campus A', curso: 'EF', turma: '9A' } as any;
      const alunoSalvo = { id: 'uuid-2', ...dto };
      svc.criar.mockResolvedValue(alunoSalvo as any);

      const result = await ctrl.criar(dto);

      expect(svc.criar).toHaveBeenCalledWith(dto);
      expect(result).toEqual(alunoSalvo);
    });
  });

  // ── listar() ──────────────────────────────────────────────────────────────

  describe('listar()', () => {
    it('deve delegar ao service.listar e retornar o envelope paginado', async () => {
      const user    = makeUser({ perfil: PerfilUsuario.COORDENADOR });
      const filtros = { page: 1, pageSize: 20 };
      const resposta = makePaginated([makeAluno()]);
      svc.listar.mockResolvedValue(resposta as any);

      const result = await ctrl.listar(filtros as any, user);

      expect(svc.listar).toHaveBeenCalledWith(filtros, user);
      expect(result).toEqual(resposta);
    });

    it('deve repassar filtros q, segmento e status ao service', async () => {
      const user    = makeUser({ perfil: PerfilUsuario.ADMIN });
      const filtros = { q: 'Maria', segmento: Segmento.MEDIO, status: StatusAluno.ATIVO, page: 2, pageSize: 10 };
      svc.listar.mockResolvedValue(makePaginated([]) as any);

      await ctrl.listar(filtros as any, user);

      expect(svc.listar).toHaveBeenCalledWith(filtros, user);
    });
  });

  // ── buscar() ──────────────────────────────────────────────────────────────

  describe('buscar()', () => {
    it('deve delegar ao service.buscar com o termo e o usuário autenticado', async () => {
      const user   = makeUser();
      const alunos = [makeAluno()];
      svc.buscar.mockResolvedValue(alunos as any);

      const result = await ctrl.buscar('Ana', user);

      expect(svc.buscar).toHaveBeenCalledWith('Ana', user);
      expect(result).toEqual(alunos);
    });

    it('deve passar string vazia ao service quando query não for informada', async () => {
      svc.buscar.mockResolvedValue([]);
      await ctrl.buscar('', makeUser());
      expect(svc.buscar).toHaveBeenCalledWith('', makeUser());
    });
  });

  // ── buscarPorId() ─────────────────────────────────────────────────────────

  describe('buscarPorId()', () => {
    it('deve delegar ao service.buscarPorId com o id de rota', async () => {
      const aluno = makeAluno();
      svc.buscarPorId.mockResolvedValue(aluno as any);

      const result = await ctrl.buscarPorId('aluno-1');

      expect(svc.buscarPorId).toHaveBeenCalledWith('aluno-1');
      expect(result).toEqual(aluno);
    });
  });

  // ── atualizar() ───────────────────────────────────────────────────────────

  describe('atualizar()', () => {
    it('deve delegar ao service.atualizar com o id e o DTO recebido', async () => {
      const dto    = { nome: 'Novo Nome', turma: '9B' };
      const aluno  = makeAluno({ nome: 'Novo Nome', turma: '9B' });
      svc.atualizar.mockResolvedValue(aluno as any);

      const result = await ctrl.atualizar('aluno-1', dto as any);

      expect(svc.atualizar).toHaveBeenCalledWith('aluno-1', dto);
      expect(result).toEqual(aluno);
    });
  });

  // ── importar() ────────────────────────────────────────────────────────────

  describe('importar()', () => {
    it('deve delegar ao service.importarLote com o buffer do arquivo', async () => {
      const arquivo = { buffer: Buffer.from('xls'), originalname: 'alunos.xlsx' } as Express.Multer.File;
      const resposta = { importados: 3, ignorados: 1, erros: [] };
      svc.importarLote.mockResolvedValue(resposta);

      const result = await ctrl.importar(arquivo);

      expect(svc.importarLote).toHaveBeenCalledWith(arquivo.buffer);
      expect(result).toEqual(resposta);
    });

    it('deve lançar Error quando nenhum arquivo é enviado', () => {
      expect(() => ctrl.importar(undefined as any)).toThrow('Arquivo não enviado');
    });
  });

  // ── baixarTemplate() ──────────────────────────────────────────────────────

  describe('baixarTemplate()', () => {
    it('deve chamar service.gerarTemplate e enviar o buffer com headers corretos', () => {
      const buffer = Buffer.from('xlsx-content');
      svc.gerarTemplate.mockReturnValue(buffer);

      const res = { setHeader: jest.fn(), send: jest.fn() } as any;
      ctrl.baixarTemplate(res);

      expect(svc.gerarTemplate).toHaveBeenCalled();
      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        'attachment; filename="template_alunos.xlsx"',
      );
      expect(res.send).toHaveBeenCalledWith(buffer);
    });
  });
});
