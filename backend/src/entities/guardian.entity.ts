import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn, OneToMany,
} from 'typeorm';
import { User } from './user.entity';
import { GuardianStudent } from './guardian-student.entity';

export enum GuardianRelationship {
  MAE         = 'MAE',
  PAI         = 'PAI',
  AVO         = 'AVO',
  TIO         = 'TIO',
  IRMAO       = 'IRMAO',
  RESPONSAVEL = 'RESPONSAVEL',
  OUTRO       = 'OUTRO',
}

@Entity('guardians')
export class Guardian {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', nullable: true, type: 'varchar' })
  userId: string | null;

  @ManyToOne(() => User, { nullable: true, eager: false })
  @JoinColumn({ name: 'user_id' })
  user: User | null;

  @Column()
  name: string;

  @Column()
  email: string;

  @Column({ nullable: true, length: 20 })
  phone: string | null;

  @Column({ length: 50 })
  relationship: GuardianRelationship;

  @OneToMany(() => GuardianStudent, (gs) => gs.guardian, { cascade: false })
  guardianStudents: GuardianStudent[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
