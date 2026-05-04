import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Type }  from 'class-transformer';
import { StatusOcorrencia } from '../../../common/enums/status-ocorrencia.enum';
import { CienciaFormalStatus } from '../entities/ocorrencia.entity';

export class OcorrenciaResponseDto {
  @Expose() @ApiProperty() id: string;
  @Expose() @ApiProperty() codigo: string;
  @Expose() @ApiProperty() alunoId: string;
  @Expose() @ApiProperty() registradorId: string;
  @Expose() @ApiProperty() categoriaId: string;
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
