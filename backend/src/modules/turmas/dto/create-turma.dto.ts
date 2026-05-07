import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { Segmento } from '../../../common/enums/segmento.enum';

export class CreateTurmaDto {
  @ApiProperty({ example: '8A' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nome: string;

  @ApiProperty({ enum: Segmento })
  @IsEnum(Segmento)
  segmento: Segmento;

  @ApiProperty({ example: 'Campus A' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  campus: string;

  @ApiProperty({ example: 'Ensino Fundamental' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  curso: string;

  @ApiProperty({ example: 2026 })
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  anoLetivo: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}
