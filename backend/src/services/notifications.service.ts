import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { User } from '../entities/user.entity';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private transporter: nodemailer.Transporter;

  constructor(private readonly config: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: config.get<string>('SMTP_HOST', 'smtp.mailtrap.io'),
      port: config.get<number>('SMTP_PORT', 587),
      auth: {
        user: config.get<string>('SMTP_USER'),
        pass: config.get<string>('SMTP_PASS'),
      },
    });
  }

  /** Envia magic link para o usuário */
  async sendMagicLink(user: User, link: string): Promise<void> {
    await this.transporter.sendMail({
      from: this.config.get<string>('SMTP_FROM', 'noreply@radaracademico.com.br'),
      to: user.email,
      subject: 'Seu link de acesso — RadarAcadêmico',
      html: this.magicLinkTemplate(user.name, link),
    });
    this.logger.log(`Magic link enviado para ${user.email}`);
  }

  /** Envia notificação de mudança de status de ocorrência */
  async sendOccurrenceStatusChange(
    recipientEmail: string,
    recipientName: string,
    protocol: string,
    newStatus: string,
    message: string,
  ): Promise<void> {
    await this.transporter.sendMail({
      from: this.config.get<string>('SMTP_FROM', 'noreply@radaracademico.com.br'),
      to: recipientEmail,
      subject: `Atualização na ocorrência ${protocol} — RadarAcadêmico`,
      html: this.statusChangeTemplate(recipientName, protocol, newStatus, message),
    });
    this.logger.log(`Notificação de status enviada para ${recipientEmail} — protocolo ${protocol}`);
  }

  // ─── templates ──────────────────────────────────────────────────────────────

  private magicLinkTemplate(name: string, link: string): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2E4057;">RadarAcadêmico</h2>
        <p>Olá, <strong>${name}</strong>!</p>
        <p>Clique no botão abaixo para acessar o sistema. O link é válido por 15 minutos.</p>
        <a href="${link}"
           style="display:inline-block;padding:12px 24px;background:#3A86FF;color:#fff;
                  text-decoration:none;border-radius:4px;font-weight:bold;">
          Acessar RadarAcadêmico
        </a>
        <p style="margin-top:24px;color:#888;font-size:12px;">
          Se você não solicitou este link, ignore este e-mail.
        </p>
      </div>
    `;
  }

  private statusChangeTemplate(
    name: string, protocol: string, status: string, message: string,
  ): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2E4057;">RadarAcadêmico</h2>
        <p>Olá, <strong>${name}</strong>!</p>
        <p>Há uma atualização na ocorrência <strong>${protocol}</strong>.</p>
        <p><strong>Novo status:</strong> ${status}</p>
        <p>${message}</p>
      </div>
    `;
  }
}
