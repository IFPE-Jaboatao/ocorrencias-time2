import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Ocorrencia } from '../../ocorrencias/entities/ocorrencia.entity';

export enum CanalNotificacao  { EMAIL = 'EMAIL', IN_APP = 'IN_APP' }
export enum StatusNotificacao { ENVIADO = 'ENVIADO', FALHOU = 'FALHOU', LIDO = 'LIDO' }

@Entity('notificacoes')
export class Notificacao {
  @PrimaryGeneratedColumn('uuid') id: string;

  @ManyToOne(() => Ocorrencia, { nullable: true })
  @JoinColumn({ name: 'ocorrencia_id' })
  ocorrencia: Ocorrencia | null;

  @Column({ name: 'ocorrencia_id', type: 'varchar', length: 36, nullable: true }) ocorrenciaId: string | null;

  @Column({ name: 'destinatario_tipo', length: 50 }) destinatarioTipo: string;
  @Column({ name: 'destinatario_id',   length: 36  }) destinatarioId: string;

  @Column({ type: 'enum', enum: CanalNotificacao })  canal: CanalNotificacao;
  @Column({ length: 100 }) evento: string;

  @Column({ type: 'enum', enum: StatusNotificacao, default: StatusNotificacao.ENVIADO })
  status: StatusNotificacao;

  @Column({ name: 'data_envio', type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  dataEnvio: Date;

  @Column({ name: 'data_leitura', nullable: true, type: 'datetime' })
  dataLeitura: Date | null;
}
