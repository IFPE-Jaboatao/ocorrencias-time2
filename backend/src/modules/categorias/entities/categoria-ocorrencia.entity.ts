import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { Segmento } from '../../../common/enums/segmento.enum';

@Entity('categorias_ocorrencia')
export class CategoriaOcorrencia {
  @PrimaryGeneratedColumn('uuid') id: string;

  @Column()                       nome: string;

  @Column({ type: 'json' })       subcategorias: string[];

  @Column({ name: 'severidade_padrao', type: 'tinyint', default: 1 })
  severidadePadrao: number;

  @Column({ name: 'sla_horas', default: 120 })
  slaHoras: number;

  @Column({ name: 'exige_notif_responsavel', default: false })
  exigeNotifResponsavel: boolean;

  @Column({ name: 'obrigatorio_legal', default: false })
  obrigatorioLegal: boolean;

  @Column({ name: 'segmentos_aplicaveis', type: 'json' })
  segmentosAplicaveis: Segmento[];

  @Column({ name: 'exige_validacao', default: false })
  exigeValidacao: boolean;

  @Column({ default: true })      ativo: boolean;

  @Column({ name: 'protocolo_externo', type: 'varchar', length: 200, nullable: true })
  protocoloExterno: string | null;
}
