import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { Segmento } from '../../../common/enums/segmento.enum';

export class FilterTurmaDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  campus?: string;

  @ApiPropertyOptional({ enum: Segmento })
  @IsOptional()
  @IsEnum(Segmento)
  segmento?: Segmento;

  @ApiPropertyOptional({ example: 2026 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  anoLetivo?: number;
}
