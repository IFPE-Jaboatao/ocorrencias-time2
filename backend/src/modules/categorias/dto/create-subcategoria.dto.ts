import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class CreateSubcategoriaDto {
  @ApiProperty({ example: 'Bullying' })
  @IsString() @IsNotEmpty() @MaxLength(100)
  nome: string;

  @ApiProperty({ minimum: 1, maximum: 5, example: 3 })
  @IsInt() @Min(1) @Max(5)
  severidadePadrao: number;

  @ApiProperty({ description: 'SLA em horas', example: 48 })
  @IsInt() @Min(1)
  slaHoras: number;

  @ApiPropertyOptional({ default: false })
  @IsOptional() @IsBoolean()
  exigeValidacao?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional() @IsBoolean()
  exigeNotifResponsavel?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional() @IsBoolean()
  obrigatorioLegal?: boolean;

  @ApiPropertyOptional({ example: 'CONSELHO_TUTELAR' })
  @IsOptional() @IsString() @MaxLength(100)
  protocoloExterno?: string;
}
