import {
  Column, CreateDateColumn, Entity,
  OneToMany, PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';
import { AlunoResponsavel } from './aluno-responsavel.entity';

/**
 * Pessoa do responsável legal — dados únicos por indivíduo.
 * Um mesmo responsável pode estar vinculado a vários alunos
 * (irmãos, primos) via a tabela de junção AlunoResponsavel.
 *
 * A unicidade é garantida pelo campo `email`.
 * CPF é armazenado criptografado (AES-256, P-10).
 */
@Entity('responsaveis')
export class Responsavel {
  @PrimaryGeneratedColumn('uuid') id: string;

  @Column()
  nome: string;

  @Column({ name: 'cpf_encriptado', type: 'varchar', length: 500, nullable: true, select: false })
  cpfEncriptado: string | null;

  /** E-mail único — usado para deduplicação na operação criarOuVincular() */
  @Column({ unique: true })
  email: string;

  @Column()
  telefone: string;

  @CreateDateColumn({ name: 'criado_em' })    criadoEm: Date;
  @UpdateDateColumn({ name: 'atualizado_em' }) atualizadoEm: Date;

  @OneToMany(() => AlunoResponsavel, ar => ar.responsavel)
  vinculos: AlunoResponsavel[];
}
