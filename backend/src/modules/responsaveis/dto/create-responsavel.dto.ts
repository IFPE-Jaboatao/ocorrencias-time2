import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean, IsEmail, IsNotEmpty, IsOptional, IsString, IsUUID,
} from 'class-validator';

/**
 * Cria um responsável (ou encontra um existente pelo e-mail) e o vincula ao aluno.
 * Implementa a operação "criar ou vincular" — se já houver um Responsavel
 * com este email no banco, apenas o vínculo novo é criado.
 */
export class CreateResponsavelDto {
  @ApiProperty({ description: 'UUID do aluno a ser vinculado' })
  @IsUUID()
  alunoId: string;

  @ApiProperty({ example: 'Maria Costa' })
  @IsString() @IsNotEmpty()
  nome: string;

  @ApiProperty({ example: 'mae', description: 'Parentesco com o aluno' })
  @IsString() @IsNotEmpty()
  parentesco: string;

  @ApiProperty({ example: 'maria@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '11999990000' })
  @IsString() @IsNotEmpty()
  telefone: string;

  @ApiPropertyOptional({ default: true, description: 'Receber notificações de ocorrências' })
  @IsOptional() @IsBoolean()
  receberNotificacoes?: boolean;
}
