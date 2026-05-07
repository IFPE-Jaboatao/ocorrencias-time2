import {
  Column, Entity, JoinColumn, ManyToOne, PrimaryColumn,
} from 'typeorm';
import { Aluno }       from '../../alunos/entities/aluno.entity';
import { Responsavel } from './responsavel.entity';

/**
 * Tabela de junção entre Aluno e Responsavel.
 * Armazena os dados específicos do vínculo:
 *   - parentesco  — "mae", "pai", "avo", "tutor", etc.
 *   - receberNotificacoes — preferência por aluno (ex: pai pode optar
 *     por não receber sobre um filho mas sim sobre outro)
 *   - validadoEm  — data em que o vínculo foi confirmado pela secretaria
 *
 * PK composta (aluno_id, responsavel_id) garante que o mesmo
 * responsável não seja vinculado duas vezes ao mesmo aluno.
 */
@Entity('aluno_responsavel')
export class AlunoResponsavel {
  @PrimaryColumn({ name: 'aluno_id', type: 'varchar', length: 36 })
  alunoId: string;

  @PrimaryColumn({ name: 'responsavel_id', type: 'varchar', length: 36 })
  responsavelId: string;

  @ManyToOne(() => Aluno, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'aluno_id' })
  aluno: Aluno;

  @ManyToOne(() => Responsavel, { onDelete: 'CASCADE', eager: false })
  @JoinColumn({ name: 'responsavel_id' })
  responsavel: Responsavel;

  @Column()
  parentesco: string;

  @Column({ name: 'receber_notificacoes', default: true })
  receberNotificacoes: boolean;

  @Column({ name: 'validado_em', nullable: true, type: 'datetime' })
  validadoEm: Date | null;
}
