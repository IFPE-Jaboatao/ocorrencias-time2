import { Module }        from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardController } from './dashboard.controller';
import { DashboardService }    from './dashboard.service';
import { Ocorrencia }          from '../ocorrencias/entities/ocorrencia.entity';

@Module({
  imports:     [TypeOrmModule.forFeature([Ocorrencia])],
  controllers: [DashboardController],
  providers:   [DashboardService],
})
export class DashboardModule {}
