import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Ocorrencia } from '../../ocorrencias/entities/ocorrencia.entity';
import { Usuario }    from '../../usuarios/entities/usuario.entity';

export enum StatusEncaminhamento {
  PENDENTE  = 'PENDENTE',
  EXECUTADO = 'EXECUTADO',
  VENCIDO   = 'VENCIDO',
}

@Entity('encaminhamentos')
export class Encaminhamento {
  @PrimaryGeneratedColumn('uuid') id: string;

  @ManyToOne(() => Ocorrencia)
  @JoinColumn({ name: 'ocorrencia_id' })
  ocorrencia: Ocorrencia;

  @Column({ name: 'ocorrencia_id' }) ocorrenciaId: string;

  @Column({ length: 100 }) tipo: string;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'responsavel_id' })
  responsavel: Usuario;

  @Column({ name: 'responsavel_id' }) responsavelId: string;

  @Column({ type: 'date' }) prazo: Date;

  @Column({ type: 'text' }) descricao: string;

  @Column({ type: 'enum', enum: StatusEncaminhamento, default: StatusEncaminhamento.PENDENTE })
  status: StatusEncaminhamento;

  @Column({ name: 'data_execucao', nullable: true, type: 'datetime' })
  dataExecucao: Date | null;

  @Column({ name: 'resultado_registrado', type: 'text', nullable: true })
  resultadoRegistrado: string | null;
}
