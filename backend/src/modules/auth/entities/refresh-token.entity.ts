import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Usuario } from '../../usuarios/entities/usuario.entity';

@Entity('refresh_tokens')
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid') id: string;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario;

  @Column({ name: 'usuario_id' }) usuarioId: string;

  @Column({ name: 'token_hash', length: 64 }) tokenHash: string;

  @Column({ name: 'expires_at' }) expiresAt: Date;

  @Column({ name: 'revoked_at', type: 'datetime', nullable: true }) revokedAt: Date | null;

  @CreateDateColumn({ name: 'criado_em' }) criadoEm: Date;
}
