import { Test, TestingModule }        from '@nestjs/testing';
import { getRepositoryToken }         from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { ResponsaveisService }        from './responsaveis.service';
import { Responsavel }                from './entities/responsavel.entity';
import { AlunoResponsavel }           from './entities/aluno-responsavel.entity';

// ─── Factories ───────────────────────────────────────────────────────────────

const makeResp = (o: any = {}): Responsavel => ({
  id:            'resp-1',
  nome:          'Maria Silva',
  cpfEncriptado: null as any,
  email:         'maria@exemplo.com',
  telefone:      '11999990000',
  criadoEm:     new Date('2026-01-01'),
  atualizadoEm:  new Date('2026-01-01'),
  vinculos:      [],
  ...o,
});

const makeVinculo = (o: any = {}): AlunoResponsavel => ({
  alunoId:            'aluno-1',
  responsavelId:      'resp-1',
  aluno:              null as any,
  responsavel:        makeResp(),
  parentesco:         'Mãe',
  receberNotificacoes: true,
  validadoEm:         null,
  ...o,
});

// ─── Suite ───────────────────────────────────────────────────────────────────

describe('ResponsaveisService', () => {
  let service: ResponsaveisService;
  let respRepo: {
    save:    jest.Mock;
    create:  jest.Mock;
    findOne: jest.Mock;
  };
  let vinculoRepo: {
    save:    jest.Mock;
    create:  jest.Mock;
    findOne: jest.Mock;
    find:    jest.Mock;
    delete:  jest.Mock;
  };

  beforeEach(async () => {
    respRepo = {
      save:    jest.fn().mockImplementation(e => Promise.resolve({ id: 'resp-novo', ...e })),
      create:  jest.fn().mockImplementation(d => d),
      findOne: jest.fn(),
    };

    vinculoRepo = {
      save:    jest.fn().mockImplementation(e => Promise.resolve({ ...e })),
      create:  jest.fn().mockImplementation(d => d),
      findOne: jest.fn(),
      find:    jest.fn().mockResolvedValue([]),
      delete:  jest.fn().mockResolvedValue({ affected: 1 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResponsaveisService,
        { provide: getRepositoryToken(Responsavel),      useValue: respRepo    },
        { provide: getRepositoryToken(AlunoResponsavel), useValue: vinculoRepo },
      ],
    }).compile();

    service = module.get(ResponsaveisService);
  });

  // ── criarOuVincular() ─────────────────────────────────────────────────────

  describe('criarOuVincular()', () => {
    it('deve criar novo Responsavel quando e-mail não existe', async () => {
      respRepo.findOne.mockResolvedValueOnce(null);   // responsavel não existe
      vinculoRepo.findOne.mockResolvedValue(null);    // vínculo não existe

      const dto = {
        alunoId: 'aluno-1', nome: 'Maria', email: 'maria@ex.com',
        telefone: '11999999999', parentesco: 'Mãe',
      };

      const { responsavel, vinculo } = await service.criarOuVincular(dto as any);

      expect(respRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ nome: 'Maria', email: 'maria@ex.com' })
      );
      expect(respRepo.save).toHaveBeenCalled();
      expect(vinculo.parentesco).toBe('Mãe');
      expect(responsavel).toBeDefined();
    });

    it('deve reutilizar Responsavel existente quando e-mail já está cadastrado', async () => {
      const existente = makeResp({ email: 'maria@ex.com' });
      respRepo.findOne.mockResolvedValueOnce(existente);  // responsavel já existe
      vinculoRepo.findOne.mockResolvedValue(null);         // vínculo não existe

      const dto = {
        alunoId: 'aluno-2', nome: 'Maria (nome diferente)', email: 'maria@ex.com',
        telefone: '11999999999', parentesco: 'Mãe',
      };

      const { responsavel } = await service.criarOuVincular(dto as any);

      // não deve criar nova pessoa
      expect(respRepo.create).not.toHaveBeenCalled();
      expect(respRepo.save).not.toHaveBeenCalled();
      // deve retornar o registro existente
      expect(responsavel.id).toBe('resp-1');
    });

    it('deve usar receberNotificacoes=true como padrão quando omitido', async () => {
      respRepo.findOne.mockResolvedValueOnce(null);
      vinculoRepo.findOne.mockResolvedValue(null);

      const dto = { alunoId: 'aluno-1', nome: 'João', email: 'joao@ex.com',
                    telefone: '11000000000', parentesco: 'Pai' };

      const { vinculo } = await service.criarOuVincular(dto as any);

      expect(vinculo.receberNotificacoes).toBe(true);
    });

    it('deve lançar ConflictException quando responsável já está vinculado ao aluno', async () => {
      const existente = makeResp();
      respRepo.findOne.mockResolvedValueOnce(existente);
      vinculoRepo.findOne.mockResolvedValueOnce(makeVinculo()); // vínculo já existe

      const dto = { alunoId: 'aluno-1', nome: 'Maria', email: 'maria@exemplo.com',
                    telefone: '11999990000', parentesco: 'Mãe' };

      await expect(service.criarOuVincular(dto as any)).rejects.toThrow(ConflictException);
    });
  });

  // ── vincularExistente() ───────────────────────────────────────────────────

  describe('vincularExistente()', () => {
    it('deve criar vínculo quando responsável existe e ainda não está vinculado ao aluno', async () => {
      respRepo.findOne.mockResolvedValue(makeResp());
      vinculoRepo.findOne.mockResolvedValue(null);

      const dto = { alunoId: 'aluno-2', parentesco: 'Pai', receberNotificacoes: true };

      const vinculo = await service.vincularExistente('resp-1', dto as any);

      expect(vinculoRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ alunoId: 'aluno-2', parentesco: 'Pai' })
      );
      expect(vinculoRepo.save).toHaveBeenCalled();
      expect(vinculo).toBeDefined();
    });

    it('deve lançar NotFoundException quando responsável não existe', async () => {
      respRepo.findOne.mockResolvedValue(null);

      await expect(
        service.vincularExistente('inexistente', { alunoId: 'aluno-1', parentesco: 'Tio' } as any)
      ).rejects.toThrow(NotFoundException);
    });

    it('deve lançar ConflictException quando vínculo já existe', async () => {
      respRepo.findOne.mockResolvedValue(makeResp());
      vinculoRepo.findOne.mockResolvedValue(makeVinculo());

      await expect(
        service.vincularExistente('resp-1', { alunoId: 'aluno-1', parentesco: 'Mãe' } as any)
      ).rejects.toThrow(ConflictException);
    });
  });

  // ── listarPorAluno() ──────────────────────────────────────────────────────

  describe('listarPorAluno()', () => {
    it('deve buscar vínculos do aluno carregando os dados do responsável', async () => {
      const vinculos = [makeVinculo(), makeVinculo({ responsavelId: 'resp-2', parentesco: 'Pai' })];
      vinculoRepo.find.mockResolvedValue(vinculos);

      const result = await service.listarPorAluno('aluno-1');

      expect(vinculoRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where:     { alunoId: 'aluno-1' },
          relations: ['responsavel'],
        })
      );
      expect(result).toHaveLength(2);
    });

    it('deve retornar lista vazia quando aluno não tem responsáveis', async () => {
      vinculoRepo.find.mockResolvedValue([]);

      const result = await service.listarPorAluno('aluno-sem-resp');

      expect(result).toHaveLength(0);
    });
  });

  // ── buscarPorId() ─────────────────────────────────────────────────────────

  describe('buscarPorId()', () => {
    it('deve retornar o Responsavel quando encontrado', async () => {
      const resp = makeResp();
      respRepo.findOne.mockResolvedValue(resp);

      const result = await service.buscarPorId('resp-1');

      expect(result.id).toBe('resp-1');
      expect(result.nome).toBe('Maria Silva');
    });

    it('deve lançar NotFoundException quando não encontrado', async () => {
      respRepo.findOne.mockResolvedValue(null);

      await expect(service.buscarPorId('nao-existe')).rejects.toThrow(NotFoundException);
    });
  });

  // ── atualizarPessoal() ────────────────────────────────────────────────────

  describe('atualizarPessoal()', () => {
    it('deve atualizar dados pessoais do responsável e persistir', async () => {
      const resp = makeResp();
      respRepo.findOne.mockResolvedValue(resp);
      respRepo.save.mockResolvedValue({ ...resp, nome: 'Maria Costa' });

      const result = await service.atualizarPessoal('resp-1', { nome: 'Maria Costa' } as any);

      expect(respRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ nome: 'Maria Costa' })
      );
      expect(result.nome).toBe('Maria Costa');
    });

    it('deve lançar NotFoundException quando responsável não existe', async () => {
      respRepo.findOne.mockResolvedValue(null);

      await expect(
        service.atualizarPessoal('nao-existe', { nome: 'Novo Nome' } as any)
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── atualizarVinculo() ────────────────────────────────────────────────────

  describe('atualizarVinculo()', () => {
    it('deve atualizar parentesco e/ou receberNotificacoes do vínculo', async () => {
      const vinculo = makeVinculo();
      vinculoRepo.findOne.mockResolvedValue(vinculo);
      vinculoRepo.save.mockResolvedValue({ ...vinculo, parentesco: 'Tutor' });

      const result = await service.atualizarVinculo('resp-1', 'aluno-1', { parentesco: 'Tutor' } as any);

      expect(vinculoRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ parentesco: 'Tutor' })
      );
      expect(result.parentesco).toBe('Tutor');
    });

    it('deve lançar NotFoundException quando vínculo não existe', async () => {
      vinculoRepo.findOne.mockResolvedValue(null);

      await expect(
        service.atualizarVinculo('resp-1', 'aluno-x', { parentesco: 'Avó' } as any)
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── removerVinculo() ─────────────────────────────────────────────────────

  describe('removerVinculo()', () => {
    it('deve remover o vínculo com sucesso', async () => {
      vinculoRepo.findOne.mockResolvedValue(makeVinculo());

      await service.removerVinculo('resp-1', 'aluno-1');

      expect(vinculoRepo.delete).toHaveBeenCalledWith(
        { responsavelId: 'resp-1', alunoId: 'aluno-1' }
      );
    });

    it('deve lançar NotFoundException quando vínculo não existe', async () => {
      vinculoRepo.findOne.mockResolvedValue(null);

      await expect(
        service.removerVinculo('resp-1', 'aluno-x')
      ).rejects.toThrow(NotFoundException);
    });

    it('NÃO deve excluir o Responsavel (pessoa) ao remover o vínculo', async () => {
      vinculoRepo.findOne.mockResolvedValue(makeVinculo());

      await service.removerVinculo('resp-1', 'aluno-1');

      // apenas vinculoRepo.delete deve ser chamado — respRepo.delete nunca existe no service
      expect(respRepo.save).not.toHaveBeenCalled();
      // vinculoRepo.delete chamado apenas com a chave do vínculo
      expect(vinculoRepo.delete).toHaveBeenCalledTimes(1);
    });
  });

  // ── listarAtivosParaNotificacao() ─────────────────────────────────────────

  describe('listarAtivosParaNotificacao()', () => {
    it('deve retornar array de Responsavel (não de AlunoResponsavel)', async () => {
      const pessoa = makeResp();
      const vinculos = [makeVinculo({ responsavel: pessoa, receberNotificacoes: true })];
      vinculoRepo.find.mockResolvedValue(vinculos);

      const result = await service.listarAtivosParaNotificacao('aluno-1');

      // resultado é Responsavel[], não AlunoResponsavel[]
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('nome');
      expect(result[0]).toHaveProperty('email');
      expect(result[0]).not.toHaveProperty('parentesco');
    });

    it('deve retornar lista vazia quando aluno não tem responsáveis ativos', async () => {
      vinculoRepo.find.mockResolvedValue([]);

      const result = await service.listarAtivosParaNotificacao('aluno-sem-resp');

      expect(result).toHaveLength(0);
    });

    it('irmãos não geram duplicata — mesmo responsável aparece uma vez por chamada de aluno', async () => {
      // Para o aluno-1 há 1 vínculo (mesma Maria é mãe de dois alunos, mas aqui
      // consultamos apenas por aluno-1, então retorna exatamente 1 registro)
      const pessoa = makeResp({ email: 'maria@ex.com' });
      vinculoRepo.find.mockResolvedValue([makeVinculo({ responsavel: pessoa })]);

      const result = await service.listarAtivosParaNotificacao('aluno-1');

      // Garante que não há duplicatas: 1 vínculo → 1 responsável retornado
      expect(result).toHaveLength(1);
      expect(result[0].email).toBe('maria@ex.com');
    });
  });
});
