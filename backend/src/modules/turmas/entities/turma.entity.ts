import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Segmento } from '../../../common/enums/segmento.enum';
import { Aluno } from '../../alunos/entities/aluno.entity';
import { UsuarioTurma } from './usuario-turma.entity';

@Entity('turmas')
export class Turma {
  @PrimaryGeneratedColumn('uuid') id: string;

  @Column({ length: 100 }) nome: string;

  @Column({ type: 'enum', enum: Segmento })
  segmento: Segmento;

  @Column({ length: 100 }) campus: string;

  @Column({ length: 255 }) curso: string;

  @Column({ name: 'ano_letivo', type: 'int' })
  anoLetivo: number;

  @Column({ default: true }) ativo: boolean;

  @CreateDateColumn({ name: 'criado_em' }) criadoEm: Date;
  @UpdateDateColumn({ name: 'atualizado_em' }) atualizadoEm: Date;

  @OneToMany(() => Aluno, aluno => aluno.turmaRef)
  alunos: Aluno[];

  @OneToMany(() => UsuarioTurma, usuarioTurma => usuarioTurma.turma)
  usuarios: UsuarioTurma[];
}
