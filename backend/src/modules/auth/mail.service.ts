import { Injectable, Logger } from '@nestjs/common';
import { ConfigService }      from '@nestjs/config';
import * as nodemailer        from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger     = new Logger(MailService.name);
  private readonly transporter: nodemailer.Transporter;
  private readonly fromAddress: string;
  private readonly configured: boolean;

  constructor(private readonly config: ConfigService) {
    const host = config.get<string>('SMTP_HOST', '');
    const user = config.get<string>('EMAIL_USER', '');
    const pass = config.get<string>('EMAIL_PASS', '');

    this.fromAddress = config.get<string>('EMAIL_FROM', 'noreply@escola.edu.br');
    this.configured  = !!(host && user && pass
      && user !== 'SEU_USER' && pass !== 'SUA_SENHA');

    this.transporter = nodemailer.createTransport({
      host,
      port:   Number(config.get<string>('SMTP_PORT', '587')),
      secure: config.get<string>('SMTP_SECURE', 'false') === 'true',
      auth:   { user, pass },
    });
  }

  async enviarMagicLink(destinatario: string, nome: string, linkUrl: string): Promise<void> {
    const html = `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#fff">
        <h2 style="color:#1e293b;margin-top:0">Radar Acadêmico — Link de acesso</h2>
        <p style="color:#475569">Olá, <strong>${nome}</strong>.</p>
        <p style="color:#475569">Clique no botão abaixo para acessar o sistema. O link expira em 15 minutos e só pode ser usado uma vez.</p>
        <p style="text-align:center;margin:32px 0">
          <a href="${linkUrl}"
             style="background:#2563eb;color:#fff;text-decoration:none;padding:12px 32px;border-radius:8px;font-weight:600;font-size:15px;display:inline-block">
            Acessar sistema
          </a>
        </p>
        <p style="color:#94a3b8;font-size:12px">
          Se você não solicitou este link, ignore este e-mail.<br>
          O link vai expirar automaticamente.
        </p>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0">
        <p style="color:#94a3b8;font-size:11px">
          Ou copie e cole este endereço no navegador:<br>
          <a href="${linkUrl}" style="color:#3b82f6;word-break:break-all">${linkUrl}</a>
        </p>
      </div>
    `;

    if (!this.configured) {
      this.logger.warn(
        `[DEV] SMTP não configurado — magic link para ${destinatario}:\n  ${linkUrl}`,
      );
      return;
    }

    await this.transporter.sendMail({
      from:    `"Radar Acadêmico" <${this.fromAddress}>`,
      to:      destinatario,
      subject: 'Seu link de acesso ao Radar Acadêmico',
      html,
    });

    this.logger.log(`Magic link enviado para ${destinatario}`);
  }
}
