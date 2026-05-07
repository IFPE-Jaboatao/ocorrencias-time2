import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { Usuario } from '../../usuarios/entities/usuario.entity';
import { Turma } from './turma.entity';

export enum PapelUsuarioTurma {
  PROFESSOR = 'PROFESSOR',
  COORDENADOR_TURMA = 'COORDENADOR_TURMA',
}

@Entity('usuario_turmas')
export class UsuarioTurma {
  @PrimaryColumn({ name: 'usuario_id', type: 'varchar', length: 36 })
  usuarioId: string;

  @PrimaryColumn({ name: 'turma_id', type: 'varchar', length: 36 })
  turmaId: string;

  @ManyToOne(() => Usuario, usuario => usuario.turmas, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario;

  @ManyToOne(() => Turma, turma => turma.usuarios, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'turma_id' })
  turma: Turma;

  @Column({ type: 'enum', enum: PapelUsuarioTurma, default: PapelUsuarioTurma.PROFESSOR })
  papel: PapelUsuarioTurma;

  @Column({ default: true })
  ativo: boolean;
}
