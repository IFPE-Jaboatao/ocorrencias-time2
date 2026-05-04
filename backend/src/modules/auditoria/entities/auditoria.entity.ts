import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('auditorias')
export class Auditoria {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' }) id: number;

  @Column({ name: 'ocorrencia_id', type: 'varchar', length: 36, nullable: true })
  ocorrenciaId: string | null;

  @Column({ name: 'ator_id' })    atorId: string;

  @Column({ name: 'perfil_ator', length: 50 }) perfilAtor: string;

  @Column({ length: 100 })        acao: string;

  @Column({ length: 100 })        entidade: string;

  @Column({ name: 'entidade_id', length: 36 }) entidadeId: string;

  @Column({ name: 'valor_anterior', type: 'json', nullable: true })
  valorAnterior: Record<string, unknown> | null;

  @Column({ name: 'valor_novo', type: 'json', nullable: true })
  valorNovo: Record<string, unknown> | null;

  @Column({ length: 45 })         ip: string;

  @Column({ name: 'timestamp', type: 'datetime', precision: 6 })
  timestamp: Date;
}
