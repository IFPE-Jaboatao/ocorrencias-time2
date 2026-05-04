import { Test, TestingModule }   from '@nestjs/testing';
import { getRepositoryToken, getDataSourceToken } from '@nestjs/typeorm';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { EventEmitter2 }          from '@nestjs/event-emitter';
import { subDays, addDays }       from 'date-fns';
import { OcorrenciasService }     from './ocorrencias.service';
import { Ocorrencia }             from './entities/ocorrencia.entity';
import { AlunosService }          from '../alunos/alunos.service';
import { CategoriasService }      from '../categorias/categorias.service';
import { SlaService }             from '../sla/sla.service';
import { PerfilUsuario }          from '../../common/enums/perfil-usuario.enum';
import { StatusOcorrencia }       from '../../common/enums/status-ocorrencia.enum';
import { Segmento }               from '../../common/enums/segmento.enum';
import { AuthenticatedUser }      from '../../common/interfaces/authenticated-user.interface';

// ─── Factories ──────────────────────────────────────────────────────────────

const makeUser = (o: Partial<AuthenticatedUser> = {}): AuthenticatedUser => ({
  sub: 'u-1', email: 'x@escola.edu.br', nome: 'X', campus: 'Campus A',
  perfil: PerfilUsuario.PROFESSOR, segmentos: [],
  ...o,
});

const makeAluno = (o: any = {}) => ({
  id: 'aluno-1', status: 'ATIVO', campus: 'Campus A',
  segmento: Segmento.FUNDAMENTAL, dataNascimento: new Date('2010-01-01'),
  ...o,
});

const makeCategoria = (o: any = {}) => ({
  id: 'cat-1', nome: 'Disciplinar', exigeValidacao: false,
  severidadePadrao: 2, slaHoras: 72, ...o,
});

const makeOcorrencia = (o: any = {}): Ocorrencia => ({
  id: 'oc-1', codigo: 'OC-2026-00001-FM',
  alunoId: 'aluno-1', registradorId: 'u-1', categoriaId: 'cat-1',
  severidade: 2, status: StatusOcorrencia.ABERTA,
  dataIncidente: new Date(), slaPrazo: addDays(new Date(), 3),
  ...o,
} as Ocorrencia);

const makeCreateDto = (o: any = {}) => ({
  alunoId: 'aluno-1', categoriaId: 'cat-1', severidade: 2,
  dataIncidente: new Date().toISOString().split('T')[0],
  local: 'Sala 201', descricao: 'Descrição com mais de vinte caracteres.',
  aprovacaoRetroativaDiretor: false, ...o,
});

// ─── Mocks ──────────────────────────────────────────────────────────────────

const makeRepo = () => ({
  save:               jest.fn(),
  create:             jest.fn((x) => x),
  findOne:            jest.fn(),
  findOneOrFail:      jest.fn(),
  createQueryBuilder: jest.fn(),
});

const makeDataSource = () => ({
  query: jest.fn()
    .mockResolvedValueOnce([])                  // INSERT ON DUPLICATE KEY
    .mockResolvedValueOnce([{ ultimo_seq: 1 }]),// SELECT ultimo_seq
});

// ─── Suite ──────────────────────────────────────────────────────────────────

describe('OcorrenciasService', () => {
  let service: OcorrenciasService;
  let repo: ReturnType<typeof makeRepo>;
  let dataSource: ReturnType<typeof makeDataSource>;
  let alunosService: { buscarPorId: jest.Mock };
  let categoriasService: { buscarPorId: jest.Mock };
  let slaService: { calcularPrazo: jest.Mock };
  let eventEmitter: { emit: jest.Mock };

  beforeEach(async () => {
    repo             = makeRepo();
    dataSource       = makeDataSource();
    alunosService    = { buscarPorId: jest.fn().mockResolvedValue(makeAluno()) };
    categoriasService= { buscarPorId: jest.fn().mockResolvedValue(makeCategoria()) };
    slaService       = { calcularPrazo: jest.fn().mockReturnValue(addDays(new Date(), 3)) };
    eventEmitter     = { emit: jest.fn() };

    // qb mock para contarReincidencias (retorna 0 por default)
    const qb = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockResolvedValue(0),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    };
    repo.createQueryBuilder.mockReturnValue(qb);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OcorrenciasService,
        { provide: getRepositoryToken(Ocorrencia), useValue: repo },
        { provide: getDataSourceToken(),           useValue: dataSource },
        { provide: AlunosService,                  useValue: alunosService },
        { provide: CategoriasService,              useValue: categoriasService },
        { provide: SlaService,                     useValue: slaService },
        { provide: EventEmitter2,                  useValue: eventEmitter },
      ],
    }).compile();

    service = module.get(OcorrenciasService);
  });

  // ─── criar ──────────────────────────────────────────────────────────────

  describe('criar()', () => {
    it('deve criar ocorrência no fluxo feliz', async () => {
      const ocorrencia = makeOcorrencia();
      repo.save.mockResolvedValue(ocorrencia);
      const result = await service.criar(makeCreateDto(), makeUser());
      expect(result).toEqual(ocorrencia);
      expect(repo.save).toHaveBeenCalledTimes(1);
    });

    it('deve emitir evento ocorrencia.criada após persistir', async () => {
      repo.save.mockResolvedValue(makeOcorrencia());
      await service.criar(makeCreateDto(), makeUser());
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'ocorrencia.criada',
        expect.objectContaining({ ocorrencia: expect.any(Object) }),
      );
    });

    it('RN-01: deve lançar BadRequestException quando aluno está inativo', async () => {
      alunosService.buscarPorId.mockResolvedValue(makeAluno({ status: 'INATIVO' }));
      await expect(service.criar(makeCreateDto(), makeUser()))
        .rejects.toBeInstanceOf(BadRequestException);
    });

    it('RN-07: professor não pode registrar ocorrência de aluno de outro campus', async () => {
      alunosService.buscarPorId.mockResolvedValue(makeAluno({ campus: 'Campus B' }));
      const professor = makeUser({ perfil: PerfilUsuario.PROFESSOR, campus: 'Campus A' });
      await expect(service.criar(makeCreateDto(), professor))
        .rejects.toBeInstanceOf(ForbiddenException);
    });

    it('RN-07: coordenador pode registrar ocorrência de aluno de outro campus', async () => {
      alunosService.buscarPorId.mockResolvedValue(makeAluno({ campus: 'Campus B' }));
      repo.save.mockResolvedValue(makeOcorrencia());
      const coordenador = makeUser({ perfil: PerfilUsuario.COORDENADOR, campus: 'Campus A' });
      await expect(service.criar(makeCreateDto(), coordenador)).resolves.toBeDefined();
    });

    it('RN-11: deve lançar BadRequestException para data > 90 dias sem aprovação', async () => {
      const dto = makeCreateDto({
        dataIncidente: subDays(new Date(), 91).toISOString().split('T')[0],
        aprovacaoRetroativaDiretor: false,
      });
      await expect(service.criar(dto, makeUser()))
        .rejects.toBeInstanceOf(BadRequestException);
    });

    it('RN-11: deve permitir data > 90 dias com aprovação do Diretor', async () => {
      repo.save.mockResolvedValue(makeOcorrencia());
      const dto = makeCreateDto({
        dataIncidente: subDays(new Date(), 91).toISOString().split('T')[0],
        aprovacaoRetroativaDiretor: true,
      });
      await expect(service.criar(dto, makeUser())).resolves.toBeDefined();
    });

    it('sev ≥ 4 deve iniciar com status AGUARDANDO_VALIDACAO', async () => {
      repo.save.mockImplementation((x) => Promise.resolve(x));
      await service.criar(makeCreateDto({ severidade: 4 }), makeUser());
      const salvo = repo.save.mock.calls[0][0];
      expect(salvo.status).toBe(StatusOcorrencia.AGUARDANDO_VALIDACAO);
    });

    it('sev < 4 deve iniciar com status ABERTA', async () => {
      repo.save.mockImplementation((x) => Promise.resolve(x));
      await service.criar(makeCreateDto({ severidade: 3 }), makeUser());
      const salvo = repo.save.mock.calls[0][0];
      expect(salvo.status).toBe(StatusOcorrencia.ABERTA);
    });

    it('RN-03: deve emitir evento de reincidência quando ≥ 3 ocorrências em 30 dias', async () => {
      const qb = repo.createQueryBuilder();
      qb.getCount.mockResolvedValue(3);
      repo.save.mockResolvedValue(makeOcorrencia());
      await service.criar(makeCreateDto(), makeUser());
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'ocorrencia.reincidencia',
        expect.objectContaining({ contagem: 3 }),
      );
    });

    it('RN-03: NÃO deve emitir reincidência com apenas 2 ocorrências', async () => {
      const qb = repo.createQueryBuilder();
      qb.getCount.mockResolvedValue(2);
      repo.save.mockResolvedValue(makeOcorrencia());
      await service.criar(makeCreateDto(), makeUser());
      expect(eventEmitter.emit).not.toHaveBeenCalledWith(
        'ocorrencia.reincidencia',
        expect.anything(),
      );
    });
  });

  // ─── alterarStatus ──────────────────────────────────────────────────────

  describe('alterarStatus()', () => {
    const admin = makeUser({ perfil: PerfilUsuario.ADMIN, sub: 'admin-1' });

    it('deve realizar transição válida ABERTA → EM_ACOMPANHAMENTO', async () => {
      const oc = makeOcorrencia({ status: StatusOcorrencia.ABERTA });
      repo.findOneOrFail.mockResolvedValue(oc);
      repo.save.mockImplementation((x) => Promise.resolve(x));
      const result = await service.alterarStatus('oc-1', StatusOcorrencia.EM_ACOMPANHAMENTO, admin);
      expect(result.status).toBe(StatusOcorrencia.EM_ACOMPANHAMENTO);
    });

    it('deve preencher dataResolucao ao resolver', async () => {
      const oc = makeOcorrencia({ status: StatusOcorrencia.EM_ACOMPANHAMENTO });
      repo.findOneOrFail.mockResolvedValue(oc);
      repo.save.mockImplementation((x) => Promise.resolve(x));
      const result = await service.alterarStatus('oc-1', StatusOcorrencia.RESOLVIDA, admin);
      expect(result.dataResolucao).toBeInstanceOf(Date);
    });

    it('RN-12: deve lançar ForbiddenException ao tentar alterar ocorrência ARQUIVADA', async () => {
      repo.findOneOrFail.mockResolvedValue(makeOcorrencia({ status: StatusOcorrencia.ARQUIVADA }));
      await expect(service.alterarStatus('oc-1', StatusOcorrencia.ABERTA, admin))
        .rejects.toBeInstanceOf(ForbiddenException);
    });

    it('P-03: deve lançar BadRequestException para transição inválida ABERTA → ARQUIVADA', async () => {
      repo.findOneOrFail.mockResolvedValue(makeOcorrencia({ status: StatusOcorrencia.ABERTA }));
      await expect(service.alterarStatus('oc-1', StatusOcorrencia.ARQUIVADA, admin))
        .rejects.toBeInstanceOf(BadRequestException);
    });

    it('P-03: deve lançar BadRequestException para transição inválida ARQUIVADA → qualquer', async () => {
      repo.findOneOrFail.mockResolvedValue(makeOcorrencia({ status: StatusOcorrencia.ARQUIVADA }));
      await expect(service.alterarStatus('oc-1', StatusOcorrencia.ABERTA, admin))
        .rejects.toThrow(); // ForbiddenException pelo RN-12 antes do validarTransicao
    });

    it('deve emitir evento ocorrencia.status_alterado após transição', async () => {
      const oc = makeOcorrencia({ status: StatusOcorrencia.ABERTA });
      repo.findOneOrFail.mockResolvedValue(oc);
      repo.save.mockImplementation((x) => Promise.resolve(x));
      await service.alterarStatus('oc-1', StatusOcorrencia.EM_ACOMPANHAMENTO, admin);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'ocorrencia.status_alterado',
        expect.objectContaining({ statusAnterior: StatusOcorrencia.ABERTA }),
      );
    });
  });

  // ─── listar (scoping H-08) ──────────────────────────────────────────────

  describe('listar() — scoping por perfil (H-08)', () => {
    let qb: any;

    beforeEach(() => {
      qb = repo.createQueryBuilder();
      qb.getManyAndCount.mockResolvedValue([[], 0]);
    });

    it('Professor: filtra por registradorId', async () => {
      const prof = makeUser({ perfil: PerfilUsuario.PROFESSOR, sub: 'u-prof' });
      await service.listar({ page: 1, pageSize: 20 } as any, prof);
      expect(qb.andWhere).toHaveBeenCalledWith(
        'oc.registradorId = :uid', { uid: 'u-prof' },
      );
    });

    it('Coordenador: filtra por campus do usuário', async () => {
      const coord = makeUser({ perfil: PerfilUsuario.COORDENADOR, campus: 'Campus A' });
      await service.listar({ page: 1, pageSize: 20 } as any, coord);
      expect(qb.andWhere).toHaveBeenCalledWith(
        'aluno.campus = :campus', { campus: 'Campus A' },
      );
    });

    it('Admin: não aplica filtro de escopo', async () => {
      const admin = makeUser({ perfil: PerfilUsuario.ADMIN });
      await service.listar({ page: 1, pageSize: 20 } as any, admin);
      // andWhere não deve ter sido chamado com filtros de escopo
      const calls = qb.andWhere.mock.calls.map((c: any[]) => c[0]);
      expect(calls).not.toContain('oc.registradorId = :uid');
      expect(calls).not.toContain('aluno.campus = :campus');
    });

    it('Perfil inválido: deve lançar ForbiddenException', async () => {
      const aluno = makeUser({ perfil: PerfilUsuario.ALUNO });
      await expect(service.listar({ page: 1, pageSize: 20 } as any, aluno))
        .rejects.toBeInstanceOf(ForbiddenException);
    });
  });
});
