import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsString, IsNotEmpty, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ConfirmarUploadDto {
  @ApiProperty({ description: 'Chave do objeto no S3 (retornada por /presigned-url)' })
  @IsString()
  @IsNotEmpty()
  s3Key: string;

  @ApiProperty({ description: 'UUID da ocorrência' })
  @IsUUID()
  ocorrenciaId: string;

  @ApiProperty({ example: 'relatorio-incidente.pdf' })
  @IsString()
  @IsNotEmpty()
  nomeOriginal: string;

  @ApiProperty({ example: 'application/pdf' })
  @IsString()
  @IsNotEmpty()
  mimeType: string;

  @ApiProperty({ example: 102400 })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  tamanhoBytes: number;
}
