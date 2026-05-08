import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Aluno }                  from '../../alunos/entities/aluno.entity';
import { Usuario }                from '../../usuarios/entities/usuario.entity';
import { CategoriaOcorrencia }    from '../../categorias/entities/categoria-ocorrencia.entity';
import { SubcategoriaOcorrencia } from '../../categorias/entities/subcategoria-ocorrencia.entity';
import { StatusOcorrencia }       from '../../../common/enums/status-ocorrencia.enum';

export enum CienciaFormalStatus {
  PENDENTE   = 'PENDENTE',
  ENVIADA    = 'ENVIADA',
  CONFIRMADA = 'CONFIRMADA',
  EXPIRADA   = 'EXPIRADA',
}

@Entity('ocorrencias')
export class Ocorrencia {
  @PrimaryGeneratedColumn('uuid') id: string;

  @Column({ unique: true })       codigo: string;

  @ManyToOne(() => Aluno)
  @JoinColumn({ name: 'aluno_id' })
  aluno: Aluno;

  @Column({ name: 'aluno_id' })   alunoId: string;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'registrador_id' })
  registrador: Usuario;

  @Column({ name: 'registrador_id' }) registradorId: string;

  @ManyToOne(() => CategoriaOcorrencia)
  @JoinColumn({ name: 'categoria_id' })
  categoria: CategoriaOcorrencia;

  @Column({ name: 'categoria_id' }) categoriaId: string;

  @Column({ type: 'varchar', length: 200, nullable: true }) subcategoria: string | null;

  @ManyToOne(() => SubcategoriaOcorrencia, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'subcategoria_id' })
  subcategoriaRef: SubcategoriaOcorrencia | null;

  @Column({ name: 'subcategoria_id', type: 'varchar', length: 36, nullable: true })
  subcategoriaId: string | null;

  @Column({ type: 'tinyint' })    severidade: number;

  @Column({ name: 'data_incidente', type: 'date' })
  dataIncidente: Date;

  @Column({ length: 200 })        local: string;

  @Column({ type: 'text' })       descricao: string;

  @Column({ type: 'enum', enum: StatusOcorrencia, default: StatusOcorrencia.ABERTA })
  status: StatusOcorrencia;

  @Column({ name: 'ciencia_formal_status', type: 'enum', enum: CienciaFormalStatus, default: CienciaFormalStatus.PENDENTE })
  cienciaFormalStatus: CienciaFormalStatus;

  @Column({ name: 'data_resolucao', nullable: true, type: 'datetime' })
  dataResolucao: Date | null;

  @Column({ name: 'sla_prazo', nullable: true, type: 'datetime' })
  slaPrazo: Date | null;

  @CreateDateColumn({ name: 'criado_em' })    criadoEm: Date;
  @UpdateDateColumn({ name: 'atualizado_em' }) atualizadoEm: Date;
}
