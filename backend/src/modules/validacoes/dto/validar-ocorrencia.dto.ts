import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';
import { TipoDecisao } from '../entities/validacao-ocorrencia.entity';

export class ValidarOcorrenciaDto {
  @ApiProperty({ enum: TipoDecisao })
  @IsEnum(TipoDecisao)
  tipoDecisao: TipoDecisao;

  @ApiProperty({ minLength: 30, example: 'Ocorrência verificada e confirmada conforme relato do professor.' })
  @IsString() @MinLength(30)
  justificativa: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 5 })
  @IsOptional() @IsInt() @Min(1) @Max(5)
  severidadeNova?: number;
}
