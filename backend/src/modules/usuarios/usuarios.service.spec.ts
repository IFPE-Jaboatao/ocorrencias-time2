import { Test, TestingModule }         from '@nestjs/testing';
import { getRepositoryToken }          from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { UsuariosService }             from './usuarios.service';
import { Usuario }                     from './entities/usuario.entity';
import { PerfilUsuario }               from '../../common/enums/perfil-usuario.enum';
import { Segmento }                    from '../../common/enums/segmento.enum';

// ─── Factories ───────────────────────────────────────────────────────────────

const makeUsuario = (o: any = {}): Usuario => ({
  id:                    'u-1',
  nome:                  'Prof. Teste',
  email:                 'prof@escola.edu.br',
  perfil:                PerfilUsuario.PROFESSOR,
  campus:                'Campus A',
  segmentosResponsaveis: [],
  ativo:                 true,
  cpfEncriptado:         '',
  ultimoAcesso:          null as any,
  ...o,
});

// ─── Suite ───────────────────────────────────────────────────────────────────

describe('UsuariosService', () => {
  let service: UsuariosService;
  let repo: {
    findOne: jest.Mock;
    find:    jest.Mock;
    save:    jest.Mock;
    create:  jest.Mock;
    update:  jest.Mock;
  };

  beforeEach(async () => {
    repo = {
      findOne: jest.fn(),
      find:    jest.fn().mockResolvedValue([]),
      save:    jest.fn().mockImplementation(e => Promise.resolve({ id: 'u-novo', ...e })),
      create:  jest.fn().mockImplementation(d => d),
      update:  jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsuariosService,
        { provide: getRepositoryToken(Usuario), useValue: repo },
      ],
    }).compile();

    service = module.get(UsuariosService);
  });

  // ── criar() ──────────────────────────────────────────────────────────────

  describe('criar()', () => {
    const dto = {
      nome:   'Novo Prof',
      email:  'novo@escola.edu.br',
      perfil: PerfilUsuario.PROFESSOR,
      campus: 'Campus A',
      segmentosResponsaveis: [Segmento.FUNDAMENTAL],
    };

    it('deve criar usuário quando e-mail não existe', async () => {
      repo.findOne.mockResolvedValue(null);

      const result = await service.criar(dto);

      expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ email: dto.email }));
      expect(repo.save).toHaveBeenCalled();
      expect(result).toMatchObject({ email: dto.email });
    });

    it('deve lançar ConflictException quando e-mail já existe', async () => {
      repo.findOne.mockResolvedValue(makeUsuario({ email: dto.email }));

      await expect(service.criar(dto)).rejects.toThrow(ConflictException);
    });

    it('deve usar segmentosResponsaveis vazio como padrão quando não fornecido', async () => {
      repo.findOne.mockResolvedValue(null);
      const dtoSemSeg = { ...dto, segmentosResponsaveis: undefined };

      await service.criar(dtoSemSeg as any);

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ segmentosResponsaveis: [] }),
      );
    });
  });

  // ── listar() ──────────────────────────────────────────────────────────────

  describe('listar()', () => {
    it('deve retornar lista do repositório filtrando apenas ativos', async () => {
      const lista = [makeUsuario(), makeUsuario({ id: 'u-2' })];
      repo.find.mockResolvedValue(lista);

      const result = await service.listar();

      expect(repo.find).toHaveBeenCalledWith({ where: { ativo: true } });
      expect(result).toHaveLength(2);
    });
  });

  // ── buscarPorId() ─────────────────────────────────────────────────────────

  describe('buscarPorId()', () => {
    it('deve retornar o usuário quando encontrado', async () => {
      repo.findOne.mockResolvedValue(makeUsuario());

      const result = await service.buscarPorId('u-1');

      expect(result.id).toBe('u-1');
    });

    it('deve lançar NotFoundException quando não encontrado', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.buscarPorId('nao-existe')).rejects.toThrow(NotFoundException);
    });
  });

  // ── desativar() ───────────────────────────────────────────────────────────

  describe('desativar()', () => {
    it('deve chamar update com ativo: false', async () => {
      repo.findOne.mockResolvedValue(makeUsuario());

      await service.desativar('u-1');

      expect(repo.update).toHaveBeenCalledWith('u-1', { ativo: false });
    });

    it('deve lançar NotFoundException quando usuário não existe', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.desativar('nao-existe')).rejects.toThrow(NotFoundException);
    });
  });

  // ── alterarPerfil() ───────────────────────────────────────────────────────

  describe('alterarPerfil()', () => {
    it('deve atualizar o perfil e retornar o usuário atualizado', async () => {
      const usuarioAtualizado = makeUsuario({ perfil: PerfilUsuario.COORDENADOR });
      repo.findOne
        .mockResolvedValueOnce(makeUsuario())          // buscarPorId inicial
        .mockResolvedValueOnce(usuarioAtualizado);     // buscarPorId após update

      const result = await service.alterarPerfil('u-1', PerfilUsuario.COORDENADOR);

      expect(repo.update).toHaveBeenCalledWith('u-1', { perfil: PerfilUsuario.COORDENADOR });
      expect(result.perfil).toBe(PerfilUsuario.COORDENADOR);
    });

    it('deve lançar NotFoundException quando usuário não existe', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(
        service.alterarPerfil('nao-existe', PerfilUsuario.ADMIN),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
