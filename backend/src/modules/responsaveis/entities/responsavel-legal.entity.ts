import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Aluno } from '../../alunos/entities/aluno.entity';

@Entity('responsaveis_legais')
export class ResponsavelLegal {
  @PrimaryGeneratedColumn('uuid') id: string;

  @ManyToOne(() => Aluno)
  @JoinColumn({ name: 'aluno_id' })
  aluno: Aluno;

  @Column({ name: 'aluno_id' }) alunoId: string;

  @Column()                       nome: string;

  @Column({ name: 'cpf_encriptado', type: 'varchar', length: 500, nullable: true, select: false })
  cpfEncriptado: string | null;

  @Column()                       parentesco: string;

  @Column()                       email: string;

  @Column()                       telefone: string;

  @Column({ name: 'receber_notificacoes', default: true })
  receberNotificacoes: boolean;

  @Column({ name: 'validado_em', nullable: true, type: 'datetime' })
  validadoEm: Date | null;
}
