import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GuardiansController } from '../controllers/guardians.controller';
import { GuardiansService } from '../services/guardians.service';
import { Guardian } from '../entities/guardian.entity';
import { GuardianStudent } from '../entities/guardian-student.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Guardian, GuardianStudent])],
  controllers: [GuardiansController],
  providers: [GuardiansService],
  exports: [GuardiansService],
})
export class GuardiansModule {}
