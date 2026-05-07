import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsString, IsNotEmpty, IsInt, Min, Max, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

const MIMES_PERMITIDOS = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf',
  'video/mp4', 'video/quicktime',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

export class PresignedUrlDto {
  @ApiProperty({ description: 'UUID da ocorrência à qual a evidência pertence' })
  @IsUUID()
  ocorrenciaId: string;

  @ApiProperty({ example: 'relatorio-incidente.pdf' })
  @IsString()
  @IsNotEmpty()
  nomeArquivo: string;

  @ApiProperty({ enum: MIMES_PERMITIDOS, example: 'application/pdf' })
  @IsIn(MIMES_PERMITIDOS, { message: `Tipo MIME não permitido. Permitidos: ${MIMES_PERMITIDOS.join(', ')}` })
  mimeType: string;

  @ApiProperty({ description: 'Tamanho em bytes (max 50 MB)', example: 102400 })
  @IsInt()
  @Min(1)
  @Max(50 * 1024 * 1024) // 50 MB
  @Type(() => Number)
  tamanhoBytes: number;
}

export { MIMES_PERMITIDOS };
