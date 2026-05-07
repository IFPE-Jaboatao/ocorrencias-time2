import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { Segmento }    from '../../../common/enums/segmento.enum';
import { StatusAluno } from '../entities/aluno.entity';

export class CreateAlunoDto {
  @ApiProperty({ example: '2023001' })
  @IsString() @IsNotEmpty()
  matricula: string;

  @ApiProperty({ example: 'João Santos' })
  @IsString() @IsNotEmpty() @MaxLength(255)
  nome: string;

  @ApiProperty({ example: '2008-03-15' })
  @IsDateString()
  dataNascimento: string;

  @ApiProperty({ enum: Segmento })
  @IsEnum(Segmento)
  segmento: Segmento;

  @ApiProperty({ example: 'Campus A' })
  @IsString() @IsNotEmpty()
  campus: string;

  @ApiProperty({ example: 'Técnico em Informática' })
  @IsString() @IsNotEmpty()
  curso: string;

  @ApiProperty({ example: '3ºA' })
  @IsString() @IsNotEmpty()
  turma: string;

  @ApiPropertyOptional({ description: 'UUID da turma cadastrada' })
  @IsOptional() @IsUUID()
  turmaId?: string;

  @ApiPropertyOptional({ enum: StatusAluno })
  @IsOptional() @IsEnum(StatusAluno)
  status?: StatusAluno;
}
