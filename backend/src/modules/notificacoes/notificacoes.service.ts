import { Injectable, Logger }    from '@nestjs/common';
import { InjectRepository }      from '@nestjs/typeorm';
import { OnEvent }               from '@nestjs/event-emitter';
import { ConfigService }         from '@nestjs/config';
import * as nodemailer           from 'nodemailer';
import { Repository }            from 'typeorm';
import { Notificacao, CanalNotificacao, StatusNotificacao } from './entities/notificacao.entity';
import { Ocorrencia }            from '../ocorrencias/entities/ocorrencia.entity';
import { ResponsaveisService }   from '../responsaveis/responsaveis.service';
import { AlunosService }         from '../alunos/alunos.service';
import {
  MAIORIDADE_LEGAL,
  SEVERIDADE_MINIMA_NOTIF_RESPONSAVEL,
} from '../../common/constants/domain.constants';
import { differenceInYears }    from 'date-fns';

@Injectable()
export class NotificacoesService {
  private readonly logger = new Logger(NotificacoesService.name);
  private transporter: nodemailer.Transporter;

  constructor(
    @InjectRepository(Notificacao)
    private readonly repo: Repository<Notificacao>,
    private readonly responsaveisService: ResponsaveisService,
    private readonly alunosService: AlunosService,
    private readonly config: ConfigService,
  ) {
    this.transporter = nodemailer.createTransport({
      host:   config.get('SMTP_HOST'),
      port:   config.get<number>('SMTP_PORT', 587),
      secure: config.get('SMTP_SECURE') === 'true',
      auth:   { user: config.get('EMAIL_USER'), pass: config.get('EMAIL_PASS') },
    });
  }

  @OnEvent('ocorrencia.criada')
  async aoOcorrenciaCriada({ ocorrencia, aluno }: { ocorrencia: Ocorrencia; aluno: any }) {
    // H-05 — Sev >= 4 só notifica após validação
    if (ocorrencia.severidade >= 4) return;

    await this.despacharAsync(ocorrencia, aluno);
  }

  @OnEvent('ocorrencia.validada')
  async aoOcorrenciaValidada({ ocorrencia, aluno }: { ocorrencia: Ocorrencia; aluno: any }) {
    const alunoDaOcorrencia = aluno ?? ocorrencia.aluno ?? await this.alunosService.buscarPorId(ocorrencia.alunoId);
    await this.despacharAsync(ocorrencia, alunoDaOcorrencia);
  }

  async despacharAsync(ocorrencia: Ocorrencia, aluno: any): Promise<void> {
    const menor = aluno?.dataNascimento
      ? differenceInYears(new Date(), new Date(aluno.dataNascimento)) < MAIORIDADE_LEGAL
      : false;

    if (!menor || ocorrencia.severidade < SEVERIDADE_MINIMA_NOTIF_RESPONSAVEL) return;

    // C-05: categoria pode dispensar notificação — a menos que seja obrigatorioLegal (P-07)
    const categoria = ocorrencia.categoria as any;
    const deveNotificar = categoria?.obrigatorioLegal || categoria?.exigeNotifResponsavel !== false;
    if (!deveNotificar) return;

    const responsaveis = await this.responsaveisService.listarAtivosParaNotificacao(ocorrencia.alunoId);
    for (const resp of responsaveis) {
      setImmediate(() => this.enviarEmail(resp.email, ocorrencia, resp.nome, resp.id));
    }
  }

  private async enviarEmail(
    destEmail:   string,
    ocorrencia:  Ocorrencia,
    nomeResp:    string,
    respId:      string,
  ): Promise<void> {
    // C-07: log criado como PENDENTE antes do envio — só promovido a ENVIADO se bem-sucedido
    const log = await this.repo.save(
      this.repo.create({
        ocorrenciaId:    ocorrencia.id,
        destinatarioTipo: 'RESPONSAVEL',
        destinatarioId:  respId,
        canal:           CanalNotificacao.EMAIL,
        evento:          'OCORRENCIA_CRIADA',
        status:          StatusNotificacao.PENDENTE,
      }),
    );

    try {
      await this.transporter.sendMail({
        from:    this.config.get('EMAIL_FROM'),
        to:      destEmail,
        subject: `Radar Acadêmico — Ocorrência ${ocorrencia.codigo}`,
        text:    `Prezado(a) ${nomeResp},\n\nUma ocorrência foi registrada para seu dependente.\nCódigo: ${ocorrencia.codigo}\nSeveridade: ${ocorrencia.severidade}\n\nAcesse o sistema para mais detalhes.`,
      });
      await this.repo.update(log.id, { status: StatusNotificacao.ENVIADO });
    } catch (err) {
      this.logger.error(`Falha ao enviar e-mail para ${destEmail}: ${err}`);
      await this.repo.update(log.id, { status: StatusNotificacao.FALHOU });
    }
  }

  async marcarLida(id: string): Promise<void> {
    await this.repo.update(id, { status: StatusNotificacao.LIDO, dataLeitura: new Date() });
  }

  listarParaUsuario(destinatarioId: string): Promise<Notificacao[]> {
    return this.repo.find({
      where:  { destinatarioId },
      order:  { dataEnvio: 'DESC' },
      take:   50,
    });
  }
}
