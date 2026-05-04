import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Usuario } from '../../usuarios/entities/usuario.entity';

@Entity('magic_link_tokens')
export class MagicLinkToken {
  @PrimaryGeneratedColumn('uuid') id: string;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario;

  @Column({ name: 'usuario_id' }) usuarioId: string;

  @Column({ name: 'token_hash', length: 64 }) tokenHash: string;

  @Column({ name: 'expires_at' }) expiresAt: Date;

  @Column({ name: 'used_at', type: 'datetime', nullable: true }) usedAt: Date | null;

  @CreateDateColumn({ name: 'criado_em' }) criadoEm: Date;
}
