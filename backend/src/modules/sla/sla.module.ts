import { Module }        from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SlaService }    from './sla.service';
import { SlaMonitorTask } from './tasks/sla-monitor.task';
import { Ocorrencia }    from '../ocorrencias/entities/ocorrencia.entity';

@Module({
  imports:   [TypeOrmModule.forFeature([Ocorrencia])],
  providers: [SlaService, SlaMonitorTask],
  exports:   [SlaService],
})
export class SlaModule {}
