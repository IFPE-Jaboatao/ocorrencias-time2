import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { Segmento }    from '../../../common/enums/segmento.enum';
import { StatusAluno } from '../entities/aluno.entity';

export class FilterAlunoDto {
  @ApiPropertyOptional({ description: 'Busca por nome ou matrícula' })
  @IsOptional() @IsString()
  q?: string;

  @ApiPropertyOptional({ enum: Segmento })
  @IsOptional() @IsEnum(Segmento)
  segmento?: Segmento;

  @ApiPropertyOptional({ enum: StatusAluno })
  @IsOptional() @IsEnum(StatusAluno)
  status?: StatusAluno;

  @ApiPropertyOptional({ example: 'Campus A' })
  @IsOptional() @IsString()
  campus?: string;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional() @IsInt() @Min(1) @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, default: 20 })
  @IsOptional() @IsInt() @Min(1) @Max(100) @Type(() => Number)
  pageSize?: number = 20;
}
