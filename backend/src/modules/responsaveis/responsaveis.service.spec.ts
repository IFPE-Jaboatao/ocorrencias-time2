import { Test, TestingModule }   from '@nestjs/testing';
import { getRepositoryToken }    from '@nestjs/typeorm';
import { NotFoundException }     from '@nestjs/common';
import { ResponsaveisService }   from './responsaveis.service';
import { ResponsavelLegal }      from './entities/responsavel-legal.entity';

// ─── Factories ───────────────────────────────────────────────────────────────

const makeResp = (o: any = {}): ResponsavelLegal => ({
  id:                   'resp-1',
  alunoId:              'aluno-1',
  aluno:                null as any,
  nome:                 'Maria Silva',
  cpfEncriptado:        '',
  parentesco:           'Mãe',
  email:                'maria@exemplo.com',
  telefone:             '11999990000',
  receberNotificacoes:  true,
  validadoEm:           null as any,
  ...o,
});

// ─── Suite ───────────────────────────────────────────────────────────────────

describe('ResponsaveisService', () => {
  let service: ResponsaveisService;
  let repo: {
    save:    jest.Mock;
    create:  jest.Mock;
    find:    jest.Mock;
    findOne: jest.Mock;
  };

  beforeEach(async () => {
    repo = {
      save:    jest.fn().mockImplementation(e => Promise.resolve({ id: 'resp-novo', ...e })),
      create:  jest.fn().mockImplementation(d => d),
      find:    jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResponsaveisService,
        { provide: getRepositoryToken(ResponsavelLegal), useValue: repo },
      ],
    }).compile();

    service = module.get(ResponsaveisService);
  });

  // ── criar() ───────────────────────────────────────────────────────────────

  describe('criar()', () => {
    it('deve persistir e retornar o responsável criado', async () => {
      const dto = {
        alunoId: 'aluno-1', nome: 'Maria', parentesco: 'Mãe',
        email: 'maria@ex.com', telefone: '11999990000',
      };

      await service.criar(dto as any);

      expect(repo.create).toHaveBeenCalledWith(dto);
      expect(repo.save).toHaveBeenCalled();
    });
  });

  // ── listarPorAluno() ──────────────────────────────────────────────────────

  describe('listarPorAluno()', () => {
    it('deve buscar responsáveis pelo alunoId', async () => {
      const lista = [makeResp(), makeResp({ id: 'resp-2' })];
      repo.find.mockResolvedValue(lista);

      const result = await service.listarPorAluno('aluno-1');

      expect(repo.find).toHaveBeenCalledWith({ where: { alunoId: 'aluno-1' } });
      expect(result).toHaveLength(2);
    });
  });

  // ── buscarPorId() ─────────────────────────────────────────────────────────

  describe('buscarPorId()', () => {
    it('deve retornar o responsável quando encontrado', async () => {
      repo.findOne.mockResolvedValue(makeResp());

      const result = await service.buscarPorId('resp-1');

      expect(result.id).toBe('resp-1');
    });

    it('deve lançar NotFoundException quando não encontrado', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.buscarPorId('nao-existe')).rejects.toThrow(NotFoundException);
    });
  });

  // ── listarAtivosParaNotificacao() ─────────────────────────────────────────

  describe('listarAtivosParaNotificacao()', () => {
    it('deve filtrar por alunoId e receberNotificacoes: true', async () => {
      const lista = [makeResp({ receberNotificacoes: true })];
      repo.find.mockResolvedValue(lista);

      const result = await service.listarAtivosParaNotificacao('aluno-1');

      expect(repo.find).toHaveBeenCalledWith({
        where: { alunoId: 'aluno-1', receberNotificacoes: true },
      });
      expect(result).toHaveLength(1);
    });

    it('deve retornar lista vazia quando aluno não tem responsáveis com notificação ativa', async () => {
      repo.find.mockResolvedValue([]);

      const result = await service.listarAtivosParaNotificacao('aluno-sem-resp');

      expect(result).toHaveLength(0);
    });
  });
});
