import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Type }  from 'class-transformer';
import { StatusOcorrencia } from '../../../common/enums/status-ocorrencia.enum';
import { CienciaFormalStatus } from '../entities/ocorrencia.entity';

/** Dados mínimos da categoria embutidos na resposta da ocorrência */
export class CategoriaEmbutidaDto {
  @Expose() @ApiProperty() id: string;
  @Expose() @ApiProperty() nome: string;
}

export class OcorrenciaResponseDto {
  @Expose() @ApiProperty() id: string;
  @Expose() @ApiProperty() codigo: string;
  @Expose() @ApiProperty() alunoId: string;
  @Expose() @ApiProperty() registradorId: string;
  @Expose() @ApiProperty() categoriaId: string;

  /** Objeto completo da categoria (id + nome) — carregado via relation */
  @Expose()
  @Type(() => CategoriaEmbutidaDto)
  @ApiPropertyOptional({ type: () => CategoriaEmbutidaDto })
  categoria: CategoriaEmbutidaDto | null;

  @Expose() @ApiPropertyOptional() subcategoria: string | null;
  @Expose() @ApiProperty({ minimum: 1, maximum: 5 }) severidade: number;
  @Expose() @ApiProperty() dataIncidente: Date;
  @Expose() @ApiProperty() local: string;
  @Expose() @ApiProperty() descricao: string;
  @Expose() @ApiProperty({ enum: StatusOcorrencia }) status: StatusOcorrencia;
  @Expose() @ApiProperty({ enum: CienciaFormalStatus }) cienciaFormalStatus: CienciaFormalStatus;
  @Expose() @ApiPropertyOptional() slaPrazo: Date | null;
  @Expose() @ApiPropertyOptional() dataResolucao: Date | null;
  @Expose() @ApiProperty() criadoEm: Date;
}
