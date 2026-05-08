import { Test, TestingModule }   from '@nestjs/testing';
import { getRepositoryToken }    from '@nestjs/typeorm';
import { NotFoundException }     from '@nestjs/common';
import { CategoriasService }        from './categorias.service';
import { CategoriaOcorrencia }      from './entities/categoria-ocorrencia.entity';
import { SubcategoriaOcorrencia }   from './entities/subcategoria-ocorrencia.entity';

// ─── Factories ───────────────────────────────────────────────────────────────

const makeCat = (o: any = {}): CategoriaOcorrencia => ({
  id:                       'cat-1',
  nome:                     'Disciplinar',
  subcategorias:            ['Agressão', 'Bullying'],
  severidadePadrao:         2,
  slaHoras:                 72,
  exigeNotifResponsavel:    true,
  obrigatorioLegal:         false,
  segmentosAplicaveis:      ['FUNDAMENTAL', 'MEDIO'] as any,
  exigeValidacao:           false,
  ativo:                    true,
  protocoloExterno:         null as any,
  ...o,
});

// ─── Suite ───────────────────────────────────────────────────────────────────

describe('CategoriasService', () => {
  let service: CategoriasService;
  let repo: {
    save:    jest.Mock;
    create:  jest.Mock;
    find:    jest.Mock;
    findOne: jest.Mock;
    update:  jest.Mock;
  };

  beforeEach(async () => {
    repo = {
      save:    jest.fn().mockImplementation(e => Promise.resolve({ id: 'cat-nova', ...e })),
      create:  jest.fn().mockImplementation(d => d),
      find:    jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      update:  jest.fn().mockResolvedValue(undefined),
    };

    const subRepo = {
      save:       jest.fn().mockImplementation(e => Promise.resolve({ id: 'sub-nova', ...e })),
      create:     jest.fn().mockImplementation(d => d),
      find:       jest.fn().mockResolvedValue([]),
      findOne:    jest.fn().mockResolvedValue(null),
      update:     jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriasService,
        { provide: getRepositoryToken(CategoriaOcorrencia),   useValue: repo },
        { provide: getRepositoryToken(SubcategoriaOcorrencia), useValue: subRepo },
      ],
    }).compile();

    service = module.get(CategoriasService);
  });

  // ── criar() ───────────────────────────────────────────────────────────────

  describe('criar()', () => {
    it('deve persistir a categoria com subcategorias fornecidas', async () => {
      const dto = { nome: 'Acadêmica', subcategorias: ['Plágio', 'Infrequência'], severidadePadrao: 3, slaHoras: 48 };

      await service.criar(dto as any);

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ nome: 'Acadêmica', subcategorias: ['Plágio', 'Infrequência'] }),
      );
      expect(repo.save).toHaveBeenCalled();
    });

    it('deve persistir sem campo subcategorias quando não fornecidas (relação @OneToMany)', async () => {
      const dto = { nome: 'Saúde', severidadePadrao: 2, slaHoras: 72 };

      await service.criar(dto as any);

      // subcategorias é relação @OneToMany — não faz parte do create() da CategoriaOcorrencia
      expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ nome: 'Saúde' }));
      expect(repo.save).toHaveBeenCalled();
    });
  });

  // ── listar() ──────────────────────────────────────────────────────────────

  describe('listar()', () => {
    it('deve retornar apenas categorias ativas', async () => {
      const lista = [makeCat(), makeCat({ id: 'cat-2' })];
      repo.find.mockResolvedValue(lista);

      const result = await service.listar();

      expect(repo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { ativo: true } }),
      );
      expect(result).toHaveLength(2);
    });
  });

  // ── buscarPorId() ─────────────────────────────────────────────────────────

  describe('buscarPorId()', () => {
    it('deve retornar a categoria quando encontrada', async () => {
      repo.findOne.mockResolvedValue(makeCat());

      const result = await service.buscarPorId('cat-1');

      expect(result.id).toBe('cat-1');
    });

    it('deve lançar NotFoundException quando não encontrada', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.buscarPorId('nao-existe')).rejects.toThrow(NotFoundException);
    });
  });

  // ── desativar() ───────────────────────────────────────────────────────────

  describe('desativar()', () => {
    it('deve chamar update com ativo: false', async () => {
      repo.findOne.mockResolvedValue(makeCat());

      await service.desativar('cat-1');

      expect(repo.update).toHaveBeenCalledWith('cat-1', { ativo: false });
    });

    it('deve lançar NotFoundException quando categoria não existe', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.desativar('nao-existe')).rejects.toThrow(NotFoundException);
    });

    it('deve verificar existência antes de desativar (evitar update cego)', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.desativar('nao-existe')).rejects.toThrow();
      expect(repo.update).not.toHaveBeenCalled();
    });
  });
});
