import {
  Entity, PrimaryColumn, Column,
  CreateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { Guardian } from '../../guardians/entities/guardian.entity';
import { Student } from './student.entity';

@Entity('guardian_students')
export class GuardianStudent {
  @PrimaryColumn({ name: 'guardian_id' })
  guardianId: string;

  @PrimaryColumn({ name: 'student_id' })
  studentId: string;

  @ManyToOne(() => Guardian, (g) => g.guardianStudents, { eager: false })
  @JoinColumn({ name: 'guardian_id' })
  guardian: Guardian;

  @ManyToOne(() => Student, (s) => s.guardianStudents, { eager: false })
  @JoinColumn({ name: 'student_id' })
  student: Student;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
