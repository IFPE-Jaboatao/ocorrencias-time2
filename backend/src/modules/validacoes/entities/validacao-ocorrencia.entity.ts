import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Ocorrencia } from '../../ocorrencias/entities/ocorrencia.entity';
import { Usuario }    from '../../usuarios/entities/usuario.entity';

export enum TipoDecisao {
  VALIDAR  = 'VALIDAR',
  DEVOLVER = 'DEVOLVER',
  ESCALAR  = 'ESCALAR',
}

@Entity('validacoes_ocorrencia')
export class ValidacaoOcorrencia {
  @PrimaryGeneratedColumn('uuid') id: string;

  @ManyToOne(() => Ocorrencia)
  @JoinColumn({ name: 'ocorrencia_id' })
  ocorrencia: Ocorrencia;

  @Column({ name: 'ocorrencia_id' }) ocorrenciaId: string;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'validador_id' })
  validador: Usuario;

  @Column({ name: 'validador_id' }) validadorId: string;

  @Column({ type: 'enum', enum: TipoDecisao }) tipoDecisao: TipoDecisao;

  @Column({ length: 1000 }) justificativa: string;

  @Column({ name: 'data_decisao', type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  dataDecisao: Date;

  @Column({ name: 'severidade_anterior', type: 'tinyint', nullable: true })
  severidadeAnterior: number | null;

  @Column({ name: 'severidade_nova', type: 'tinyint', nullable: true })
  severidadeNova: number | null;
}
