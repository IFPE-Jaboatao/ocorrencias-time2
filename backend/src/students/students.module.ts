import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StudentsController } from './students.controller';
import { StudentsService } from './students.service';
import { Student } from './entities/student.entity';
import { GuardianStudent } from './entities/guardian-student.entity';
import { Guardian } from '../guardians/entities/guardian.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Student, Guardian, GuardianStudent])],
  controllers: [StudentsController],
  providers: [StudentsService],
  exports: [StudentsService],
})
export class StudentsModule {}
