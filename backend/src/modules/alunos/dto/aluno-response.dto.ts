import { ApiProperty } from '@nestjs/swagger';
import { Expose }       from 'class-transformer';
import { Segmento }    from '../../../common/enums/segmento.enum';
import { StatusAluno } from '../entities/aluno.entity';

export class AlunoResponseDto {
  @Expose() @ApiProperty() id: string;
  @Expose() @ApiProperty() matricula: string;
  @Expose() @ApiProperty() nome: string;
  @Expose() @ApiProperty() dataNascimento: Date;
  @Expose() @ApiProperty({ enum: Segmento }) segmento: Segmento;
  @Expose() @ApiProperty() campus: string;
  @Expose() @ApiProperty() curso: string;
  @Expose() @ApiProperty() turma: string;
  @Expose() @ApiProperty({ enum: StatusAluno }) status: StatusAluno;
  @Expose() @ApiProperty() criadoEm: Date;
}
