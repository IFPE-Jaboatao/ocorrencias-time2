import {
  Column, CreateDateColumn, Entity,
  ManyToOne, JoinColumn, PrimaryGeneratedColumn,
} from 'typeorm';
import { Ocorrencia } from '../../ocorrencias/entities/ocorrencia.entity';
import { Usuario }    from '../../usuarios/entities/usuario.entity';

@Entity('evidencias')
export class Evidencia {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'ocorrencia_id', type: 'varchar', length: 36 })
  ocorrenciaId: string;

  @ManyToOne(() => Ocorrencia, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ocorrencia_id' })
  ocorrencia: Ocorrencia;

  @Column({ name: 'nome_original', type: 'varchar', length: 500 })
  nomeOriginal: string;

  @Column({ name: 's3_key', type: 'varchar', length: 1000 })
  s3Key: string;

  @Column({ name: 'mime_type', type: 'varchar', length: 100 })
  mimeType: string;

  @Column({ name: 'tamanho_bytes', type: 'int' })
  tamanhoBytes: number;

  @Column({ name: 'enviado_por_id', type: 'varchar', length: 36 })
  enviadoPorId: string;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'enviado_por_id' })
  enviadoPor: Usuario;

  @CreateDateColumn({ name: 'criado_em' })
  criadoEm: Date;
}
