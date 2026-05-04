import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { PerfilUsuario } from '../../../common/enums/perfil-usuario.enum';
import { Segmento }      from '../../../common/enums/segmento.enum';

export class CreateUsuarioDto {
  @ApiProperty({ example: 'Maria Silva' })
  @IsString() @IsNotEmpty() @MaxLength(255)
  nome: string;

  @ApiProperty({ example: 'maria@escola.edu.br' })
  @IsEmail()
  email: string;

  @ApiProperty({ enum: PerfilUsuario })
  @IsEnum(PerfilUsuario)
  perfil: PerfilUsuario;

  @ApiProperty({ example: 'Campus A' })
  @IsString() @IsNotEmpty()
  campus: string;

  @ApiPropertyOptional({ type: [String], enum: Segmento })
  @IsOptional()
  @IsEnum(Segmento, { each: true })
  segmentosResponsaveis?: Segmento[];
}
