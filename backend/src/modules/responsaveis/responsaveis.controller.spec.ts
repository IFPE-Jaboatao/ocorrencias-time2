import { Test, TestingModule } from '@nestjs/testing';
import { ResponsaveisController } from './responsaveis.controller';
import { ResponsaveisService }    from './responsaveis.service';
import { CreateResponsavelDto }   from './dto/create-responsavel.dto';

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
            criar:          jest.fn(),
            listarPorAluno: jest.fn(),
            buscarPorId:    jest.fn(),
          },
        },
      ],
    }).compile();

    ctrl = module.get(ResponsaveisController);
    svc  = module.get(ResponsaveisService) as jest.Mocked<ResponsaveisService>;
  });

  describe('criar()', () => {
    it('deve delegar ao service.criar() com dto e retornar o responsável criado', async () => {
      const dto       = { alunoId: 'aluno-1', nome: 'Maria', parentesco: 'Mãe', email: 'maria@x.com', telefone: '11999999999' } as CreateResponsavelDto;
      const resultado = { id: 'resp-1', ...dto } as any;

      svc.criar.mockResolvedValue(resultado);

      const retorno = await ctrl.criar(dto);

      expect(svc.criar).toHaveBeenCalledTimes(1);
      expect(svc.criar).toHaveBeenCalledWith(dto);
      expect(retorno).toBe(resultado);
    });
  });

  describe('listarPorAluno()', () => {
    it('deve delegar ao service.listarPorAluno() com alunoId e retornar a lista', async () => {
      const alunoId   = 'aluno-uuid-1';
      const resultado = [{ id: 'resp-1', alunoId }] as any[];

      svc.listarPorAluno.mockResolvedValue(resultado);

      const retorno = await ctrl.listarPorAluno(alunoId);

      expect(svc.listarPorAluno).toHaveBeenCalledTimes(1);
      expect(svc.listarPorAluno).toHaveBeenCalledWith(alunoId);
      expect(retorno).toBe(resultado);
    });

    it('deve retornar lista vazia quando o aluno não tem responsáveis', async () => {
      svc.listarPorAluno.mockResolvedValue([]);

      const retorno = await ctrl.listarPorAluno('aluno-sem-resp');

      expect(retorno).toEqual([]);
    });
  });

  describe('buscarPorId()', () => {
    it('deve delegar ao service.buscarPorId() com id e retornar o responsável', async () => {
      const id        = 'resp-uuid-1';
      const resultado = { id, nome: 'João' } as any;

      svc.buscarPorId.mockResolvedValue(resultado);

      const retorno = await ctrl.buscarPorId(id);

      expect(svc.buscarPorId).toHaveBeenCalledTimes(1);
      expect(svc.buscarPorId).toHaveBeenCalledWith(id);
      expect(retorno).toBe(resultado);
    });
  });
});
