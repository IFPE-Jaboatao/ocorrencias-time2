import { Test, TestingModule }     from '@nestjs/testing';
import { ResponsaveisController }  from './responsaveis.controller';
import { ResponsaveisService }     from './responsaveis.service';
import { CreateResponsavelDto }    from './dto/create-responsavel.dto';
import { VincularResponsavelDto }  from './dto/vincular-responsavel.dto';
import { UpdateResponsavelDto }    from './dto/update-responsavel.dto';
import { UpdateVinculoDto }        from './dto/update-vinculo.dto';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const makeResp = (o: any = {}) => ({
  id: 'resp-1', nome: 'Maria Silva', email: 'maria@exemplo.com',
  telefone: '11999990000', criadoEm: new Date(), atualizadoEm: new Date(), vinculos: [],
  ...o,
});

const makeVinculo = (o: any = {}) => ({
  alunoId: 'aluno-1', responsavelId: 'resp-1',
  parentesco: 'Mãe', receberNotificacoes: true, validadoEm: null,
  responsavel: makeResp(),
  ...o,
});

// ─── Suite ───────────────────────────────────────────────────────────────────

describe('ResponsaveisController', () => {
  let ctrl: ResponsaveisController;
  let svc: jest.Mocked<ResponsaveisService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ResponsaveisController],
      providers: [
        {
          provide: ResponsaveisService,
          useValue: {
            criarOuVincular:              jest.fn(),
            vincularExistente:            jest.fn(),
            listarPorAluno:               jest.fn(),
            buscarPorId:                  jest.fn(),
            atualizarPessoal:             jest.fn(),
            atualizarVinculo:             jest.fn(),
            removerVinculo:               jest.fn(),
            listarAtivosParaNotificacao:  jest.fn(),
          },
        },
      ],
    }).compile();

    ctrl = module.get(ResponsaveisController);
    svc  = module.get(ResponsaveisService) as jest.Mocked<ResponsaveisService>;
  });

  // ── POST /responsaveis ────────────────────────────────────────────────────

  describe('criarOuVincular()', () => {
    it('deve delegar ao service.criarOuVincular() e retornar { responsavel, vinculo }', async () => {
      const dto: CreateResponsavelDto = {
        alunoId: 'aluno-1', nome: 'Maria', email: 'maria@ex.com',
        telefone: '11999999999', parentesco: 'Mãe',
      } as any;
      const resultado = { responsavel: makeResp(), vinculo: makeVinculo() };

      svc.criarOuVincular.mockResolvedValue(resultado as any);

      const retorno = await ctrl.criarOuVincular(dto);

      expect(svc.criarOuVincular).toHaveBeenCalledWith(dto);
      expect(retorno).toBe(resultado);
    });
  });

  // ── POST /responsaveis/:id/vincular ───────────────────────────────────────

  describe('vincularExistente()', () => {
    it('deve delegar ao service.vincularExistente() com id e dto', async () => {
      const dto: VincularResponsavelDto = { alunoId: 'aluno-2', parentesco: 'Pai' } as any;
      const vinculo = makeVinculo({ alunoId: 'aluno-2', parentesco: 'Pai' });

      svc.vincularExistente.mockResolvedValue(vinculo as any);

      const retorno = await ctrl.vincularExistente('resp-1', dto);

      expect(svc.vincularExistente).toHaveBeenCalledWith('resp-1', dto);
      expect(retorno).toBe(vinculo);
    });
  });

  // ── GET /responsaveis/aluno/:alunoId ─────────────────────────────────────

  describe('listarPorAluno()', () => {
    it('deve delegar ao service.listarPorAluno() e retornar a lista de vínculos', async () => {
      const lista = [makeVinculo(), makeVinculo({ responsavelId: 'resp-2', parentesco: 'Pai' })];
      svc.listarPorAluno.mockResolvedValue(lista as any);

      const retorno = await ctrl.listarPorAluno('aluno-1');

      expect(svc.listarPorAluno).toHaveBeenCalledWith('aluno-1');
      expect(retorno).toBe(lista);
      expect(retorno).toHaveLength(2);
    });

    it('deve retornar lista vazia quando aluno não tem responsáveis', async () => {
      svc.listarPorAluno.mockResolvedValue([]);

      const retorno = await ctrl.listarPorAluno('aluno-sem-resp');

      expect(retorno).toEqual([]);
    });
  });

  // ── GET /responsaveis/:id ─────────────────────────────────────────────────

  describe('buscarPorId()', () => {
    it('deve delegar ao service.buscarPorId() e retornar o responsável', async () => {
      const resp = makeResp();
      svc.buscarPorId.mockResolvedValue(resp as any);

      const retorno = await ctrl.buscarPorId('resp-1');

      expect(svc.buscarPorId).toHaveBeenCalledWith('resp-1');
      expect(retorno).toBe(resp);
    });
  });

  // ── PATCH /responsaveis/:id ───────────────────────────────────────────────

  describe('atualizarPessoal()', () => {
    it('deve delegar ao service.atualizarPessoal() com id e dto', async () => {
      const dto: UpdateResponsavelDto = { nome: 'Maria Costa' };
      const respAtualizado = makeResp({ nome: 'Maria Costa' });

      svc.atualizarPessoal.mockResolvedValue(respAtualizado as any);

      const retorno = await ctrl.atualizarPessoal('resp-1', dto);

      expect(svc.atualizarPessoal).toHaveBeenCalledWith('resp-1', dto);
      expect(retorno).toBe(respAtualizado);
    });
  });

  // ── PATCH /responsaveis/:responsavelId/vinculos/:alunoId ─────────────────

  describe('atualizarVinculo()', () => {
    it('deve delegar ao service.atualizarVinculo() com responsavelId, alunoId e dto', async () => {
      const dto: UpdateVinculoDto = { parentesco: 'Tutor', receberNotificacoes: false };
      const vinculoAtualizado = makeVinculo({ parentesco: 'Tutor', receberNotificacoes: false });

      svc.atualizarVinculo.mockResolvedValue(vinculoAtualizado as any);

      const retorno = await ctrl.atualizarVinculo('resp-1', 'aluno-1', dto);

      expect(svc.atualizarVinculo).toHaveBeenCalledWith('resp-1', 'aluno-1', dto);
      expect(retorno).toBe(vinculoAtualizado);
    });
  });

  // ── DELETE /responsaveis/:responsavelId/vinculos/:alunoId ────────────────

  describe('removerVinculo()', () => {
    it('deve delegar ao service.removerVinculo() com responsavelId e alunoId', async () => {
      svc.removerVinculo.mockResolvedValue(undefined);

      await ctrl.removerVinculo('resp-1', 'aluno-1');

      expect(svc.removerVinculo).toHaveBeenCalledWith('resp-1', 'aluno-1');
      expect(svc.removerVinculo).toHaveBeenCalledTimes(1);
    });
  });
});
