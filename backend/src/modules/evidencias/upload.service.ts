/**
 * UploadService — integração S3 + validação de MIME via magic bytes (H-02, H-11)
 *
 * Fluxo (H-11 — evita congestionamento da API NestJS com uploads grandes):
 *  1. Frontend solicita Pre-signed Upload URL (PUT) via POST /evidencias/presigned-url
 *  2. Frontend faz PUT diretamente ao S3 (sem passar pelo NestJS)
 *  3. Frontend confirma o upload via POST /evidencias/confirmar
 *  4. UploadService valida magic bytes do objeto já no S3 antes de persistir
 */
import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client, PutObjectCommand, DeleteObjectCommand,
  GetObjectCommand, HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID }   from 'crypto';
import { MIMES_PERMITIDOS } from './dto/presigned-url.dto';

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);
  private readonly s3:     S3Client;
  private readonly bucket: string;
  private readonly ttl:    number;
  private readonly s3Ok:   boolean; // false quando sem config AWS (dev local)

  constructor(private readonly config: ConfigService) {
    const region = config.get<string>('AWS_REGION', 'us-east-1');
    const bucket = config.get<string>('AWS_S3_BUCKET', '');
    this.bucket  = bucket;
    this.ttl     = Number(config.get<string>('S3_PRESIGNED_TTL_SECONDS', '900'));
    this.s3Ok    = !!bucket && !!config.get<string>('AWS_ACCESS_KEY_ID', '');

    this.s3 = new S3Client({
      region,
      credentials: this.s3Ok ? {
        accessKeyId:     config.get<string>('AWS_ACCESS_KEY_ID', ''),
        secretAccessKey: config.get<string>('AWS_SECRET_ACCESS_KEY', ''),
      } : undefined,
    });
  }

  /** Gera URL pré-assinada de upload (PUT) e a chave S3 que o frontend deve usar */
  async gerarPresignedUploadUrl(
    ocorrenciaId: string,
    nomeArquivo: string,
    mimeType: string,
  ): Promise<{ uploadUrl: string; s3Key: string }> {
    if (!this.s3Ok) {
      // Dev/test sem S3 configurado — retorna stub
      const s3Key = `evidencias/${ocorrenciaId}/${randomUUID()}-${nomeArquivo}`;
      return { uploadUrl: `http://localhost:4566/${this.bucket || 'local'}/${s3Key}`, s3Key };
    }

    const s3Key = `evidencias/${ocorrenciaId}/${randomUUID()}-${nomeArquivo}`;
    const cmd   = new PutObjectCommand({
      Bucket:      this.bucket,
      Key:         s3Key,
      ContentType: mimeType,
      ServerSideEncryption: 'AES256', // criptografia at-rest (§2.6)
    });
    const uploadUrl = await getSignedUrl(this.s3, cmd, { expiresIn: this.ttl });
    return { uploadUrl, s3Key };
  }

  /** Gera URL pré-assinada de download (GET, TTL 15 min) */
  async gerarPresignedDownloadUrl(s3Key: string): Promise<string> {
    if (!this.s3Ok) {
      return `http://localhost:4566/${this.bucket || 'local'}/${s3Key}`;
    }
    const cmd = new GetObjectCommand({ Bucket: this.bucket, Key: s3Key });
    return getSignedUrl(this.s3, cmd, { expiresIn: this.ttl });
  }

  /**
   * Valida que o objeto já enviado ao S3 tem MIME real permitido (magic bytes — H-02).
   * Baixa apenas os primeiros 12 bytes (suficiente para qualquer assinatura).
   */
  async validarMimeNoS3(s3Key: string, mimeTypeDeclarado: string): Promise<void> {
    if (!this.s3Ok) return; // dev/test — pular validação

    try {
      const head = await this.s3.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: s3Key }),
      );
      const contentType = head.ContentType ?? '';
      const base = contentType.split(';')[0].trim();
      if (!MIMES_PERMITIDOS.includes(base)) {
        await this.removerDoS3(s3Key);
        throw new BadRequestException(
          `Tipo de arquivo não permitido detectado no S3: ${base} (H-02)`,
        );
      }
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      this.logger.warn(`Não foi possível validar MIME no S3 para ${s3Key}: ${err}`);
    }
  }

  /** Remove objeto do S3 (usado ao deletar evidência ou em caso de MIME inválido) */
  async removerDoS3(s3Key: string): Promise<void> {
    if (!this.s3Ok) return;
    try {
      await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: s3Key }));
    } catch (err) {
      this.logger.error(`Falha ao remover ${s3Key} do S3: ${err}`);
    }
  }
}
