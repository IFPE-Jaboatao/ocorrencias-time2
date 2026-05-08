import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';
import { Segmento } from '../../../common/enums/segmento.enum';

export class CreateCategoriaDto {
  @ApiProperty({ example: 'Disciplinar' })
  @IsString() @IsNotEmpty()
  nome: string;

  @ApiProperty({ minimum: 1, maximum: 5, default: 1 })
  @IsInt() @Min(1) @Max(5)
  severidadePadrao: number;

  @ApiProperty({ description: 'SLA em horas', default: 120 })
  @IsInt() @Min(1)
  slaHoras: number;

  @ApiPropertyOptional({ default: false })
  @IsOptional() @IsBoolean()
  exigeNotifResponsavel?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional() @IsBoolean()
  obrigatorioLegal?: boolean;

  @ApiProperty({ type: [String], enum: Segmento })
  @IsArray() @IsEnum(Segmento, { each: true })
  segmentosAplicaveis: Segmento[];

  @ApiPropertyOptional({ default: false })
  @IsOptional() @IsBoolean()
  exigeValidacao?: boolean;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  protocoloExterno?: string;
}
