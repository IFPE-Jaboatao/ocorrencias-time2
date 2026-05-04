import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PerfilUsuario } from '../../../common/enums/perfil-usuario.enum';
import { Segmento }      from '../../../common/enums/segmento.enum';

@Entity('usuarios')
export class Usuario {
  @PrimaryGeneratedColumn('uuid') id: string;

  @Column()                       nome: string;

  @Column({ unique: true })       email: string;

  @Column({ name: 'cpf_encriptado', type: 'varchar', length: 500, nullable: true, select: false })
  cpfEncriptado: string | null;

  @Column({ type: 'enum', enum: PerfilUsuario }) perfil: PerfilUsuario;

  @Column()                       campus: string;

  @Column({ name: 'segmentos_responsaveis', type: 'json' })
  segmentosResponsaveis: Segmento[];

  @Column({ default: true })      ativo: boolean;

  @Column({ name: 'ultimo_acesso', nullable: true, type: 'datetime' })
  ultimoAcesso: Date | null;

  @CreateDateColumn({ name: 'criado_em' })    criadoEm: Date;
  @UpdateDateColumn({ name: 'atualizado_em' }) atualizadoEm: Date;
}
