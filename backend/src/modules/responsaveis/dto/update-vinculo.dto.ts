import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

/** Atualiza apenas os campos do vínculo (parentesco, receberNotificacoes). */
export class UpdateVinculoDto {
  @ApiPropertyOptional({ example: 'tutor' })
  @IsOptional() @IsString()
  parentesco?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsBoolean()
  receberNotificacoes?: boolean;
}
