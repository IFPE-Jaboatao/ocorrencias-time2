import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString, IsInt, IsNotEmpty, IsOptional,
  IsString, IsUUID, Max, MaxLength, Min, MinLength,
} from 'class-validator';

export class CreateOcorrenciaDto {
  @ApiProperty({ example: 'uuid-aluno' })
  @IsUUID()
  alunoId: string;

  @ApiProperty({ example: 'uuid-categoria' })
  @IsUUID()
  categoriaId: string;

  @ApiPropertyOptional({ example: 'Bullying' })
  @IsOptional() @IsString() @MaxLength(255)
  subcategoria?: string;

  @ApiProperty({ minimum: 1, maximum: 5, example: 3 })
  @IsInt() @Min(1) @Max(5)
  severidade: number;

  @ApiProperty({ example: '2026-04-25' })
  @IsDateString()
  dataIncidente: string;

  @ApiProperty({ example: 'Sala 204 — Bloco B' })
  @IsString() @IsNotEmpty() @MaxLength(200)
  local: string;

  @ApiProperty({ example: 'Descrição detalhada do ocorrido...' })
  @IsString() @MinLength(20)
  descricao: string;

  @ApiPropertyOptional({ description: 'Aprovação do diretor para datas retroativas > 90 dias' })
  @IsOptional()
  aprovacaoRetroativaDiretor?: boolean;
}
