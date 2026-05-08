import { Injectable, Logger } from '@nestjs/common';
import { Cron }               from '@nestjs/schedule';
import { InjectRepository }   from '@nestjs/typeorm';
import { LessThan, In, Repository } from 'typeorm';
import { EventEmitter2 }      from '@nestjs/event-emitter';
import { Ocorrencia }         from '../../ocorrencias/entities/ocorrencia.entity';
import { StatusOcorrencia }   from '../../../common/enums/status-ocorrencia.enum';
import { SLA_ALERTA_PERCENTUAL } from '../../../common/constants/domain.constants';

const STATUSES_ATIVOS: StatusOcorrencia[] = [
  StatusOcorrencia.ABERTA,
  StatusOcorrencia.AGUARDANDO_VALIDACAO,
  StatusOcorrencia.EM_ACOMPANHAMENTO,
];

@Injectable()
export class SlaMonitorTask {
  private readonly logger = new Logger(SlaMonitorTask.name);

  constructor(
    @InjectRepository(Ocorrencia)
    private readonly repo: Repository<Ocorrencia>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @Cron('*/15 * * * *')
  async verificarPrazos(): Promise<void> {
    const agora = new Date();

    // SLA vencido — escalar
    const vencidas = await this.repo.find({
      where: {
        status:   In(STATUSES_ATIVOS),
        slaPrazo: LessThan(agora),
      },
    });

    for (const oc of vencidas) {
      this.logger.warn(`SLA vencido: ${oc.codigo}`);
      this.eventEmitter.emit('sla.vencido', { ocorrencia: oc });
    }

    // SLA >= 75% — alertar
    const proximasDoVencimento = await this.repo
      .createQueryBuilder('oc')
      .where('oc.status IN (:...statuses)', { statuses: STATUSES_ATIVOS })
      .andWhere('oc.slaPrazo > :agora', { agora })
      .getMany();

    for (const oc of proximasDoVencimento) {
      if (!oc.slaPrazo) continue;
      const total = oc.slaPrazo.getTime() - oc.criadoEm.getTime();
      const decor = agora.getTime()       - oc.criadoEm.getTime();
      if (decor / total >= SLA_ALERTA_PERCENTUAL) {
        this.eventEmitter.emit('sla.alerta_75pct', { ocorrencia: oc });
      }
    }
  }
}
