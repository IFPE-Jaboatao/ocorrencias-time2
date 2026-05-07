import { Test, TestingModule }   from '@nestjs/testing';
import { getRepositoryToken }    from '@nestjs/typeorm';
import { ConfigService }         from '@nestjs/config';
import { NotificacoesService }   from './notificacoes.service';
import { Notificacao, CanalNotificacao, StatusNotificacao } from './entities/notificacao.entity';
import { ResponsaveisService }   from '../responsaveis/responsaveis.service';
import { AlunosService }         from '../alunos/alunos.service';
import { subYears, addYears }    from 'date-fns';

// ─── Factories ──────────────────────────────────────────────────────────────

const makeAluno = (o: any = {}) => ({
  id: 'aluno-1',
  nome: 'João Silva',
  dataNascimento: subYears(new Date(), 14), // menor de 18 por padrão
  ...o,
});

const makeOcorrencia = (o: any = {}) => ({
  id:         'oc-1',
  codigo:     'OC-2026-00001-FM',
  alunoId:    'aluno-1',
  severidade: 3,
  status:     'ABERTA',
  ...o,
});

const makeResponsavel = (o: any = {}) => ({
  id:    'resp-1',
  nome:  'Maria Silva',
  email: 'maria@exemplo.com',
  ...o,
});

// ─── Suite ───────────────────────────────────────────────────────────────────

describe('NotificacoesService', () => {
  let service: NotificacoesService;
  let notifRepo: { save: jest.Mock; create: jest.Mock; update: jest.Mock; find: jest.Mock };
  let responsaveisService: { listarAtivosParaNotificacao: jest.Mock };
  let alunosService: { buscarPorId: jest.Mock };
  let sendMailMock: jest.Mock;

  beforeEach(async () => {
    sendMailMock = jest.fn().mockResolvedValue(undefined);

    notifRepo = {
      save:   jest.fn().mockResolvedValue({ id: 'notif-1' }),
      create: jest.fn().mockImplementation(d => d),
      update: jest.fn().mockResolvedValue(undefined),
      find:   jest.fn().mockResolvedValue([]),
    };

    responsaveisService = {
      listarAtivosParaNotificacao: jest.fn().mockResolvedValue([makeResponsavel()]),
    };
    alunosService = {
      buscarPorId: jest.fn().mockResolvedValue(makeAluno()),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificacoesService,
        { provide: getRepositoryToken(Notificacao), useValue: notifRepo },
        { provide: ResponsaveisService, useValue: responsaveisService },
        { provide: AlunosService, useValue: alunosService },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('mock-value'),
          },
        },
      ],
    }).compile();

    service = module.get(NotificacoesService);
    // substituir transporter criado no construtor pelo mock
    (service as any).transporter = { sendMail: sendMailMock };
  });

  // ── despacharAsync ────────────────────────────────────────────────────────

  describe('despacharAsync()', () => {
    it('RN-05: deve enfileirar e-mail para responsável de aluno menor com sev ≥ 3', async () => {
      const aluno = makeAluno({ dataNascimento: subYears(new Date(), 14) });
      const oc    = makeOcorrencia({ severidade: 3 });

      await service.despacharAsync(oc as any, aluno);

      // setImmediate é fire-and-forget — aguardar a macro-task
      await new Promise(r => setImmediate(r));

      expect(responsaveisService.listarAtivosParaNotificacao).toHaveBeenCalledWith('aluno-1');
      expect(notifRepo.save).toHaveBeenCalledTimes(1);
      expect(sendMailMock).toHaveBeenCalledTimes(1);
      expect(sendMailMock).toHaveBeenCalledWith(
        expect.objectContaining({ to: 'maria@exemplo.com' }),
      );
    });

    it('RN-05: NÃO deve notificar responsável quando aluno é maior de idade', async () => {
      const aluno = makeAluno({ dataNascimento: subYears(new Date(), 20) });
      const oc    = makeOcorrencia({ severidade: 3 });

      await service.despacharAsync(oc as any, aluno);
      await new Promise(r => setImmediate(r));

      expect(responsaveisService.listarAtivosParaNotificacao).not.toHaveBeenCalled();
      expect(sendMailMock).not.toHaveBeenCalled();
    });

    it('RN-05: NÃO deve notificar responsável quando severidade < 3 (mesmo sendo menor)', async () => {
      const aluno = makeAluno({ dataNascimento: subYears(new Date(), 12) });
      const oc    = makeOcorrencia({ severidade: 2 });

      await service.despacharAsync(oc as any, aluno);
      await new Promise(r => setImmediate(r));

      expect(responsaveisService.listarAtivosParaNotificacao).not.toHaveBeenCalled();
      expect(sendMailMock).not.toHaveBeenCalled();
    });

    it('deve notificar quando aluno está na borda da menoridade (17 anos)', async () => {
      const aluno = makeAluno({ dataNascimento: subYears(new Date(), 17) });
      const oc    = makeOcorrencia({ severidade: 4 });

      await service.despacharAsync(oc as any, aluno);
      await new Promise(r => setImmediate(r));

      expect(responsaveisService.listarAtivosParaNotificacao).toHaveBeenCalledWith('aluno-1');
    });

    it('NÃO deve notificar quando aluno tem exatamente 18 anos (borda superior)', async () => {
      const aluno = makeAluno({ dataNascimento: subYears(new Date(), 18) });
      const oc    = makeOcorrencia({ severidade: 3 });

      await service.despacharAsync(oc as any, aluno);
      await new Promise(r => setImmediate(r));

      expect(responsaveisService.listarAtivosParaNotificacao).not.toHaveBeenCalled();
    });

    it('deve enviar e-mail para múltiplos responsáveis', async () => {
      responsaveisService.listarAtivosParaNotificacao.mockResolvedValue([
        makeResponsavel({ id: 'r1', email: 'mae@ex.com' }),
        makeResponsavel({ id: 'r2', email: 'pai@ex.com' }),
      ]);

      const aluno = makeAluno();
      const oc    = makeOcorrencia({ severidade: 3 });

      await service.despacharAsync(oc as any, aluno);
      await new Promise(r => setImmediate(r));

      expect(sendMailMock).toHaveBeenCalledTimes(2);
      const recipients = sendMailMock.mock.calls.map(c => c[0].to);
      expect(recipients).toContain('mae@ex.com');
      expect(recipients).toContain('pai@ex.com');
    });

    it('deve registrar notif como FALHOU quando sendMail lança erro', async () => {
      sendMailMock.mockRejectedValue(new Error('SMTP timeout'));

      const aluno = makeAluno();
      const oc    = makeOcorrencia({ severidade: 3 });

      await service.despacharAsync(oc as any, aluno);
      await new Promise(r => setImmediate(r));

      expect(notifRepo.update).toHaveBeenCalledWith(
        'notif-1',
        { status: StatusNotificacao.FALHOU },
      );
    });

    it('não deve quebrar quando aluno não tem dataNascimento', async () => {
      const oc = makeOcorrencia({ severidade: 3 });
      await expect(
        service.despacharAsync(oc as any, { id: 'aluno-1' } /* sem dataNascimento */),
      ).resolves.not.toThrow();

      expect(responsaveisService.listarAtivosParaNotificacao).not.toHaveBeenCalled();
    });
  });

  // ── aoOcorrenciaCriada ────────────────────────────────────────────────────

  describe('aoOcorrenciaCriada()', () => {
    it('H-05: NÃO deve despachar quando sev ≥ 4 (aguarda validação)', async () => {
      const aluno = makeAluno();
      const oc    = makeOcorrencia({ severidade: 4 });

      await service.aoOcorrenciaCriada({ ocorrencia: oc as any, aluno });
      await new Promise(r => setImmediate(r));

      expect(responsaveisService.listarAtivosParaNotificacao).not.toHaveBeenCalled();
    });

    it('H-05: deve despachar normalmente quando sev < 4', async () => {
      const aluno = makeAluno();
      const oc    = makeOcorrencia({ severidade: 3 });

      await service.aoOcorrenciaCriada({ ocorrencia: oc as any, aluno });
      await new Promise(r => setImmediate(r));

      expect(responsaveisService.listarAtivosParaNotificacao).toHaveBeenCalled();
    });
  });

  // ── marcarLida / listarParaUsuario ────────────────────────────────────────

  describe('aoOcorrenciaValidada()', () => {
    it('H-05: deve buscar aluno e notificar responsavel quando evento nao carrega aluno', async () => {
      const oc = makeOcorrencia({ severidade: 4 });

      await service.aoOcorrenciaValidada({ ocorrencia: oc as any, aluno: undefined });
      await new Promise(r => setImmediate(r));

      expect(alunosService.buscarPorId).toHaveBeenCalledWith('aluno-1');
      expect(responsaveisService.listarAtivosParaNotificacao).toHaveBeenCalledWith('aluno-1');
      expect(sendMailMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('marcarLida()', () => {
    it('deve chamar update com status LIDO e dataLeitura', async () => {
      await service.marcarLida('notif-1');

      expect(notifRepo.update).toHaveBeenCalledWith(
        'notif-1',
        expect.objectContaining({ status: StatusNotificacao.LIDO }),
      );
    });
  });

  describe('listarParaUsuario()', () => {
    it('deve retornar notificações do repositório', async () => {
      const fake = [{ id: 'n1' }, { id: 'n2' }];
      notifRepo.find.mockResolvedValue(fake);

      const result = await service.listarParaUsuario('user-1');

      expect(notifRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { destinatarioId: 'user-1' } }),
      );
      expect(result).toBe(fake);
    });
  });
});
