import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken }   from '@nestjs/typeorm';
import { ForbiddenException }   from '@nestjs/common';
import { EventEmitter2 }        from '@nestjs/event-emitter';
import { ValidacoesService }    from './validacoes.service';
import { ValidacaoOcorrencia, TipoDecisao } from './entities/validacao-ocorrencia.entity';
import { OcorrenciasService }   from '../ocorrencias/ocorrencias.service';
import { PerfilUsuario }        from '../../common/enums/perfil-usuario.enum';
import { StatusOcorrencia }     from '../../common/enums/status-ocorrencia.enum';
import { AuthenticatedUser }    from '../../common/interfaces/authenticated-user.interface';

// ─── Factories ──────────────────────────────────────────────────────────────

const makeValidador = (o: Partial<AuthenticatedUser> = {}): AuthenticatedUser => ({
  sub: 'coord-1', email: 'coord@escola.edu.br', nome: 'Coordenador',
  campus: 'Campus A', perfil: PerfilUsuario.COORDENADOR, segmentos: [],
  ...o,
});

const makeOcorrencia = (o: any = {}) => ({
  id: 'oc-1', registradorId: 'outro-user', severidade: 3,
  status: StatusOcorrencia.AGUARDANDO_VALIDACAO,
  alunoId: 'aluno-1',
  aluno: { id: 'aluno-1', dataNascimento: new Date('2010-01-01') },
  ...o,
});

const makeDto = (o: any = {}) => ({
  tipoDecisao: TipoDecisao.VALIDAR,
  justificativa: 'Justificativa com mais de trinta caracteres para ser válida.',
  severidadeNova: null,
  ...o,
});

// ─── Suite ──────────────────────────────────────────────────────────────────

describe('ValidacoesService', () => {
  let service: ValidacoesService;
  let repo: { save: jest.Mock; create: jest.Mock; find: jest.Mock };
  let ocorrenciasService: { buscarPorId: jest.Mock; alterarStatus: jest.Mock; alterarSeveridade: jest.Mock };
  let eventEmitter: { emit: jest.Mock };

  beforeEach(async () => {
    repo = {
      save:   jest.fn().mockImplementation((x) => Promise.resolve({ id: 'val-1', ...x })),
      create: jest.fn().mockImplementation((x) => x),
      find:   jest.fn().mockResolvedValue([]),
    };
    ocorrenciasService = {
      buscarPorId:       jest.fn().mockResolvedValue(makeOcorrencia()),
      alterarStatus:     jest.fn().mockResolvedValue(makeOcorrencia({ status: StatusOcorrencia.EM_ACOMPANHAMENTO })),
      alterarSeveridade: jest.fn().mockResolvedValue(makeOcorrencia({ severidade: 4 })),
    };
    eventEmitter = { emit: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ValidacoesService,
        { provide: getRepositoryToken(ValidacaoOcorrencia), useValue: repo },
        { provide: OcorrenciasService,                      useValue: ocorrenciasService },
        { provide: EventEmitter2,                           useValue: eventEmitter },
      ],
    }).compile();

    service = module.get(ValidacoesService);
  });

  // ─── validar ────────────────────────────────────────────────────────────

  describe('validar()', () => {
    it('deve persistir validação e retornar o registro no fluxo feliz', async () => {
      const result = await service.validar('oc-1', makeDto(), makeValidador());
      expect(result).toHaveProperty('tipoDecisao', TipoDecisao.VALIDAR);
      expect(repo.save).toHaveBeenCalledTimes(1);
    });

    it('VALIDAR → deve alterar status para EM_ACOMPANHAMENTO', async () => {
      await service.validar('oc-1', makeDto({ tipoDecisao: TipoDecisao.VALIDAR }), makeValidador());
      expect(ocorrenciasService.alterarStatus).toHaveBeenCalledWith(
        'oc-1', StatusOcorrencia.EM_ACOMPANHAMENTO, expect.anything(),
      );
    });

    it('DEVOLVER → deve alterar status para REVISAO', async () => {
      await service.validar('oc-1', makeDto({ tipoDecisao: TipoDecisao.DEVOLVER }), makeValidador());
      expect(ocorrenciasService.alterarStatus).toHaveBeenCalledWith(
        'oc-1', StatusOcorrencia.REVISAO, expect.anything(),
      );
    });

    it('ESCALAR deve manter status AGUARDANDO_VALIDACAO sem transicao redundante', async () => {
      await service.validar('oc-1', makeDto({ tipoDecisao: TipoDecisao.ESCALAR }), makeValidador());
      expect(ocorrenciasService.alterarStatus).not.toHaveBeenCalled();
    });

    it('deve persistir severidadeNova quando informada', async () => {
      await service.validar('oc-1', makeDto({ severidadeNova: 4 }), makeValidador());
      expect(ocorrenciasService.alterarSeveridade).toHaveBeenCalledWith(
        'oc-1', 4, expect.anything(),
      );
    });

    it('RN-08: deve lançar ForbiddenException quando validador é o próprio registrador', async () => {
      ocorrenciasService.buscarPorId.mockResolvedValue(
        makeOcorrencia({ registradorId: 'coord-1' }), // mesmo sub do validador
      );
      await expect(service.validar('oc-1', makeDto(), makeValidador({ sub: 'coord-1' })))
        .rejects.toBeInstanceOf(ForbiddenException);
    });

    it('deve lançar ForbiddenException quando ocorrência não está aguardando validação', async () => {
      ocorrenciasService.buscarPorId.mockResolvedValue(
        makeOcorrencia({ status: StatusOcorrencia.ABERTA }),
      );
      await expect(service.validar('oc-1', makeDto(), makeValidador()))
        .rejects.toBeInstanceOf(ForbiddenException);
    });

    it('Sev 5: deve lançar ForbiddenException se validador não é Diretor/Admin', async () => {
      ocorrenciasService.buscarPorId.mockResolvedValue(makeOcorrencia({ severidade: 5 }));
      const coordenador = makeValidador({ perfil: PerfilUsuario.COORDENADOR });
      await expect(service.validar('oc-1', makeDto(), coordenador))
        .rejects.toBeInstanceOf(ForbiddenException);
    });

    it('Sev 5: Diretor pode validar normalmente', async () => {
      ocorrenciasService.buscarPorId.mockResolvedValue(makeOcorrencia({ severidade: 5 }));
      const diretor = makeValidador({ perfil: PerfilUsuario.DIRETOR });
      await expect(service.validar('oc-1', makeDto(), diretor)).resolves.toBeDefined();
    });

    it('Sev 5: Admin pode validar normalmente', async () => {
      ocorrenciasService.buscarPorId.mockResolvedValue(makeOcorrencia({ severidade: 5 }));
      const admin = makeValidador({ sub: 'admin-1', perfil: PerfilUsuario.ADMIN });
      await expect(service.validar('oc-1', makeDto(), admin)).resolves.toBeDefined();
    });

    it('deve emitir evento ocorrencia.validada após persistir', async () => {
      await service.validar('oc-1', makeDto(), makeValidador());
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'ocorrencia.validada',
        expect.objectContaining({
          aluno: expect.anything(),
          validador: expect.any(Object),
        }),
      );
    });
  });

  // ─── listarPorOcorrencia ────────────────────────────────────────────────

  describe('listarPorOcorrencia()', () => {
    it('deve retornar a lista do repositório na ordem DESC', async () => {
      const validacoes = [{ id: 'v-1' }, { id: 'v-2' }];
      repo.find.mockResolvedValue(validacoes);
      const result = await service.listarPorOcorrencia('oc-1');
      expect(result).toEqual(validacoes);
      expect(repo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { ocorrenciaId: 'oc-1' } }),
      );
    });
  });
});
