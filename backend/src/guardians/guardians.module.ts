import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GuardiansController } from './guardians.controller';
import { GuardiansService } from './guardians.service';
import { Guardian } from './entities/guardian.entity';
import { GuardianStudent } from '../students/entities/guardian-student.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Guardian, GuardianStudent])],
  controllers: [GuardiansController],
  providers: [GuardiansService],
  exports: [GuardiansService],
})
export class GuardiansModule {}
