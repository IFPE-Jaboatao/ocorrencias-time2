import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString } from 'class-validator';

/** Atualiza dados pessoais do Responsavel (afeta todos os vínculos de uma vez). */
export class UpdateResponsavelDto {
  @ApiPropertyOptional({ example: 'Maria Costa Souza' })
  @IsOptional() @IsString()
  nome?: string;

  @ApiPropertyOptional({ example: 'maria.nova@example.com' })
  @IsOptional() @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '11888880000' })
  @IsOptional() @IsString()
  telefone?: string;
}
