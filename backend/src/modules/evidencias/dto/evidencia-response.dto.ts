import { ApiProperty } from '@nestjs/swagger';

export class EvidenciaResponseDto {
  @ApiProperty() id:           string;
  @ApiProperty() ocorrenciaId: string;
  @ApiProperty() nomeOriginal: string;
  @ApiProperty() mimeType:     string;
  @ApiProperty() tamanhoBytes: number;
  @ApiProperty() enviadoPorId: string;
  @ApiProperty() criadoEm:     Date;
  @ApiProperty({ description: 'URL pré-assinada para download (TTL 15 min)' })
  url: string;
}

export class PresignedUrlResponseDto {
  @ApiProperty({ description: 'URL para upload direto ao S3 (PUT, TTL 15 min)' })
  uploadUrl: string;

  @ApiProperty({ description: 'Chave S3 — usar em /confirmar após o upload' })
  s3Key: string;
}
