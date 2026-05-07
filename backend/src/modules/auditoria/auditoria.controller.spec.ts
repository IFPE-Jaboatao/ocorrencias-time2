import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken }  from '@nestjs/typeorm';
import { AuditoriaController } from './auditoria.controller';
import { Auditoria }           from './entities/auditoria.entity';

const makeAuditoria = (overrides: Partial<Auditoria> = {}): Auditoria => ({
  id:           1,
  ocorrenciaId: 'oc-uuid-1',
  atorId:       'user-uuid-1',
  perfilAtor:   'PROFESSOR',
  acao:         'CREATE_OCORRENCIA',
  entidade:     'Ocorrencia',
  entidadeId:   'oc-uuid-1',
  valorAnterior: null,
  valorNovo:    null,
  ip:           '127.0.0.1',
  timestamp:    new Date('2026-04-01T10:00:00Z'),
  ...overrides,
});

describe('AuditoriaController', () => {
  let ctrl: AuditoriaController;
  let repo: { find: jest.Mock };

  beforeEach(async () => {
    repo = { find: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuditoriaController],
      providers: [
        {
          provide: getRepositoryToken(Auditoria),
          useValue: repo,
        },
      ],
    }).compile();

    ctrl = module.get(AuditoriaController);
  });

  describe('listarPorOcorrencia()', () => {
    it('deve chamar repo.find com where ocorrenciaId e order ASC', async () => {
      const registros = [makeAuditoria()];
      repo.find.mockResolvedValue(registros);

      const result = await ctrl.listarPorOcorrencia('oc-uuid-1');

      expect(repo.find).toHaveBeenCalledWith({
        where: { ocorrenciaId: 'oc-uuid-1' },
        order: { timestamp: 'ASC' },
      });
      expect(result).toEqual(registros);
    });
  });

  describe('listarPorUsuario()', () => {
    it('deve chamar repo.find com where atorId, order DESC e take padrão 100', async () => {
      const registros = [makeAuditoria({ atorId: 'user-uuid-1' })];
      repo.find.mockResolvedValue(registros);

      const result = await ctrl.listarPorUsuario('user-uuid-1', 100);

      expect(repo.find).toHaveBeenCalledWith({
        where: { atorId: 'user-uuid-1' },
        order: { timestamp: 'DESC' },
        take:  100,
      });
      expect(result).toEqual(registros);
    });

    it('deve respeitar limite customizado passado via query', async () => {
      repo.find.mockResolvedValue([]);

      await ctrl.listarPorUsuario('user-uuid-1', 30);

      expect(repo.find).toHaveBeenCalledWith({
        where: { atorId: 'user-uuid-1' },
        order: { timestamp: 'DESC' },
        take:  30,
      });
    });
  });

  describe('listarRecentes()', () => {
    it('deve chamar repo.find com order DESC e take padrão 50', async () => {
      const registros = [makeAuditoria()];
      repo.find.mockResolvedValue(registros);

      const result = await ctrl.listarRecentes(50);

      expect(repo.find).toHaveBeenCalledWith({
        order: { timestamp: 'DESC' },
        take:  50,
      });
      expect(result).toEqual(registros);
    });

    it('deve limitar take a 200 mesmo quando limite informado é maior', async () => {
      repo.find.mockResolvedValue([]);

      await ctrl.listarRecentes(999);

      expect(repo.find).toHaveBeenCalledWith({
        order: { timestamp: 'DESC' },
        take:  200,
      });
    });
  });
});
