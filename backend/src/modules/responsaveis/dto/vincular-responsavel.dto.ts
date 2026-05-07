import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

/** Vincula um Responsavel já existente a outro aluno (ex: irmão). */
export class VincularResponsavelDto {
  @ApiProperty({ description: 'UUID do aluno' })
  @IsUUID()
  alunoId: string;

  @ApiProperty({ example: 'pai', description: 'Parentesco com este aluno específico' })
  @IsString() @IsNotEmpty()
  parentesco: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional() @IsBoolean()
  receberNotificacoes?: boolean;
}
