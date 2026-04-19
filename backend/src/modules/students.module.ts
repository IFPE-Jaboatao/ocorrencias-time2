import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StudentsController } from '../controllers/students.controller';
import { StudentsService } from '../services/students.service';
import { Student } from '../entities/student.entity';
import { GuardianStudent } from '../entities/guardian-student.entity';
import { Guardian } from '../entities/guardian.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Student, Guardian, GuardianStudent])],
  controllers: [StudentsController],
  providers: [StudentsService],
  exports: [StudentsService],
})
export class StudentsModule {}
