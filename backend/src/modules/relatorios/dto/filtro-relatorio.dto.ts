import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { StatusOcorrencia } from '../../../common/enums/status-ocorrencia.enum';
import { Segmento }         from '../../../common/enums/segmento.enum';

export class FiltroRelatorioDto {
  @ApiPropertyOptional({ example: '2026-01-01' })
  @IsOptional() @IsDateString()
  dataInicio?: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional() @IsDateString()
  dataFim?: string;

  @ApiPropertyOptional({ enum: StatusOcorrencia })
  @IsOptional() @IsEnum(StatusOcorrencia)
  status?: StatusOcorrencia;

  @ApiPropertyOptional({ minimum: 1, maximum: 5 })
  @IsOptional() @IsInt() @Min(1) @Max(5) @Type(() => Number)
  severidade?: number;

  @ApiPropertyOptional({ enum: Segmento })
  @IsOptional() @IsEnum(Segmento)
  segmento?: Segmento;

  @ApiPropertyOptional()
  @IsOptional()
  campus?: string;
}
