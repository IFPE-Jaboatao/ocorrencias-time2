import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Segmento }      from '../../../common/enums/segmento.enum';
import { Turma }         from '../../turmas/entities/turma.entity';

export enum StatusAluno {
  ATIVO       = 'ATIVO',
  INATIVO     = 'INATIVO',
  TRANSFERIDO = 'TRANSFERIDO',
  FORMADO     = 'FORMADO',
}

@Entity('alunos')
export class Aluno {
  @PrimaryGeneratedColumn('uuid') id: string;

  @Column({ unique: true })       matricula: string;

  @Column()                       nome: string;

  @Column({ name: 'data_nascimento', type: 'date' })
  dataNascimento: Date;

  @Column({ name: 'cpf_encriptado', type: 'varchar', length: 500, nullable: true, select: false })
  cpfEncriptado: string | null;

  @Column({ name: 'foto_url', type: 'varchar', length: 500, nullable: true })
  fotoUrl: string | null;

  @Column({ type: 'enum', enum: Segmento })
  segmento: Segmento;

  @Column()                       campus: string;

  @Column()                       curso: string;

  @Column()                       turma: string;

  @ManyToOne(() => Turma, turma => turma.alunos, { nullable: true })
  @JoinColumn({ name: 'turma_id' })
  turmaRef: Turma | null;

  @Column({ name: 'turma_id', type: 'varchar', length: 36, nullable: true })
  turmaId: string | null;

  @Column({ type: 'enum', enum: StatusAluno, default: StatusAluno.ATIVO })
  status: StatusAluno;

  @CreateDateColumn({ name: 'criado_em' })    criadoEm: Date;
  @UpdateDateColumn({ name: 'atualizado_em' }) atualizadoEm: Date;
}
