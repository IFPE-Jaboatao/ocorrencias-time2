import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, DeleteDateColumn,
  ManyToOne, JoinColumn, OneToMany,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { GuardianStudent } from './guardian-student.entity';

export enum EducationLevel {
  FUNDAMENTAL_INICIAL = 'FUNDAMENTAL_INICIAL',
  FUNDAMENTAL_FINAL   = 'FUNDAMENTAL_FINAL',
  MEDIO               = 'MEDIO',
  SUPERIOR            = 'SUPERIOR',
  TECNICO             = 'TECNICO',
  EJA                 = 'EJA',
}

@Entity('students')
export class Student {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'user_id', nullable: true, type: 'varchar' })
  userId: string | null;

  @ManyToOne(() => User, { nullable: true, eager: false })
  @JoinColumn({ name: 'user_id' })
  user: User | null;

  @Column()
  name: string;

  @Column({ name: 'registration_number', length: 50 })
  registrationNumber: string;

  @Column({ name: 'birth_date', type: 'date' })
  birthDate: Date;

  @Column({ name: 'is_minor', default: false })
  isMinor: boolean;

  @Column({ name: 'education_level', length: 50 })
  educationLevel: EducationLevel;

  @Column({ name: 'class_name', nullable: true, length: 100 })
  className: string | null;

  @Column({ nullable: true, length: 100 })
  campus: string | null;

  @Column({ name: 'academic_period_id', nullable: true, type: 'varchar' })
  academicPeriodId: string | null;

  @OneToMany(() => GuardianStudent, (gs) => gs.student, { cascade: false })
  guardianStudents: GuardianStudent[];

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
