import {
  Column, CreateDateColumn, Entity,
  JoinColumn, ManyToOne, PrimaryGeneratedColumn,
} from 'typeorm';
import { CategoriaOcorrencia } from './categoria-ocorrencia.entity';

@Entity('subcategorias_ocorrencia')
export class SubcategoriaOcorrencia {
  @PrimaryGeneratedColumn('uuid') id: string;

  @Column({ name: 'categoria_id', type: 'varchar', length: 36 })
  categoriaId: string;

  @ManyToOne(() => CategoriaOcorrencia, c => c.subcategorias, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'categoria_id' })
  categoria: CategoriaOcorrencia;

  @Column({ length: 100 }) nome: string;

  @Column({ name: 'severidade_padrao', type: 'tinyint' })
  severidadePadrao: number;

  @Column({ name: 'sla_horas' })
  slaHoras: number;

  @Column({ name: 'exige_validacao', default: false })
  exigeValidacao: boolean;

  @Column({ name: 'exige_notif_responsavel', default: false })
  exigeNotifResponsavel: boolean;

  @Column({ name: 'obrigatorio_legal', default: false })
  obrigatorioLegal: boolean;

  @Column({ name: 'protocolo_externo', type: 'varchar', length: 100, nullable: true })
  protocoloExterno: string | null;

  @Column({ default: true }) ativo: boolean;

  @CreateDateColumn({ name: 'criado_em' }) criadoEm: Date;
}
