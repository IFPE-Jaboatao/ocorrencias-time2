import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Ocorrencia } from '../../ocorrencias/entities/ocorrencia.entity';

@Entity('ciencias_formais')
export class CienciaFormal {
  @PrimaryGeneratedColumn('uuid') id: string;

  @ManyToOne(() => Ocorrencia)
  @JoinColumn({ name: 'ocorrencia_id' })
  ocorrencia: Ocorrencia;

  @Column({ name: 'ocorrencia_id' }) ocorrenciaId: string;

  @Column({ name: 'destinatario_tipo', type: 'enum', enum: ['ALUNO', 'RESPONSAVEL'] })
  destinatarioTipo: 'ALUNO' | 'RESPONSAVEL';

  @Column({ name: 'destinatario_id', length: 36 }) destinatarioId: string;

  @Column({ name: 'token_hash', length: 64, unique: true }) tokenHash: string;

  @Column({ name: 'data_envio', type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  dataEnvio: Date;

  @Column({ name: 'data_confirmacao', nullable: true, type: 'datetime' })
  dataConfirmacao: Date | null;

  @Column({ name: 'ip_confirmacao', type: 'varchar', length: 45, nullable: true })
  ipConfirmacao: string | null;

  @Column({ name: 'user_agent', nullable: true, type: 'text' })
  userAgent: string | null;

  @Column({ name: 'hash_conteudo', length: 64 }) hashConteudo: string;
}
