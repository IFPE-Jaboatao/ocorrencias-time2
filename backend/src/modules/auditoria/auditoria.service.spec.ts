import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken }  from '@nestjs/typeorm';
import { AuditoriaService }    from './auditoria.service';
import { Auditoria }           from './entities/auditoria.entity';

describe('AuditoriaService', () => {
  let service: AuditoriaService;
  let repo: { save: jest.Mock; create: jest.Mock };

  beforeEach(async () => {
    repo = {
      save:   jest.fn().mockResolvedValue({ id: 1 }),
      create: jest.fn().mockImplementation(d => d),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditoriaService,
        { provide: getRepositoryToken(Auditoria), useValue: repo },
      ],
    }).compile();

    service = module.get(AuditoriaService);
  });

  describe('registrar()', () => {
    const baseDto = {
      atorId:     'u-1',
      perfilAtor: 'PROFESSOR',
      acao:       'CREATE_OCORRENCIA',
      entidade:   'Ocorrencia',
      entidadeId: 'oc-1',
      ip:         '192.168.1.1',
    };

    it('deve persistir o registro de auditoria no fluxo feliz', async () => {
      await service.registrar(baseDto);

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ atorId: 'u-1', acao: 'CREATE_OCORRENCIA' }),
      );
      expect(repo.save).toHaveBeenCalled();
    });

    it('deve preencher timestamp com a data atual', async () => {
      const antes = new Date();
      await service.registrar(baseDto);
      const depois = new Date();

      const arg = repo.create.mock.calls[0][0];
      expect(arg.timestamp.getTime()).toBeGreaterThanOrEqual(antes.getTime());
      expect(arg.timestamp.getTime()).toBeLessThanOrEqual(depois.getTime());
    });

    it('deve usar null para ocorrenciaId quando não fornecido', async () => {
      await service.registrar(baseDto);

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ ocorrenciaId: null }),
      );
    });

    it('deve usar null para valorAnterior e valorNovo quando não fornecidos', async () => {
      await service.registrar(baseDto);

      const arg = repo.create.mock.calls[0][0];
      expect(arg.valorAnterior).toBeNull();
      expect(arg.valorNovo).toBeNull();
    });

    it('deve persistir ocorrenciaId quando fornecido', async () => {
      await service.registrar({ ...baseDto, ocorrenciaId: 'oc-99' });

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ ocorrenciaId: 'oc-99' }),
      );
    });

    it('deve persistir valorAnterior e valorNovo quando fornecidos', async () => {
      const antes = { status: 'ABERTA' };
      const novo  = { status: 'RESOLVIDA' };

      await service.registrar({ ...baseDto, valorAnterior: antes, valorNovo: novo });

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ valorAnterior: antes, valorNovo: novo }),
      );
    });

    it('não deve retornar valor (void)', async () => {
      const result = await service.registrar(baseDto);

      expect(result).toBeUndefined();
    });
  });
});
