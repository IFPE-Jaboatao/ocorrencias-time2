import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { Segmento }    from '../../../common/enums/segmento.enum';
import { StatusAluno } from '../entities/aluno.entity';

export class UpdateAlunoDto {
  @ApiPropertyOptional({ example: 'João Santos' })
  @IsOptional() @IsString() @MaxLength(255)
  nome?: string;

  @ApiPropertyOptional({ example: '2008-03-15' })
  @IsOptional() @IsDateString()
  dataNascimento?: string;

  @ApiPropertyOptional({ enum: Segmento })
  @IsOptional() @IsEnum(Segmento)
  segmento?: Segmento;

  @ApiPropertyOptional({ example: 'Campus A' })
  @IsOptional() @IsString()
  campus?: string;

  @ApiPropertyOptional({ example: 'Técnico em Informática' })
  @IsOptional() @IsString()
  curso?: string;

  @ApiPropertyOptional({ example: '3ºA' })
  @IsOptional() @IsString()
  turma?: string;

  @ApiPropertyOptional({ description: 'UUID da turma cadastrada' })
  @IsOptional() @IsUUID()
  turmaId?: string;

  @ApiPropertyOptional({ enum: StatusAluno })
  @IsOptional() @IsEnum(StatusAluno)
  status?: StatusAluno;
}
