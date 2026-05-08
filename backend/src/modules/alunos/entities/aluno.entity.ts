import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Segmento } from '../../../common/enums/segmento.enum';

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

  @Column({ type: 'enum', enum: StatusAluno, default: StatusAluno.ATIVO })
  status: StatusAluno;

  @CreateDateColumn({ name: 'criado_em' })     criadoEm: Date;
  @UpdateDateColumn({ name: 'atualizado_em' }) atualizadoEm: Date;
}
