import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository }    from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { Encaminhamento, StatusEncaminhamento } from '../entities/encaminhamento.entity';

/**
 * I-06: Tarefa agendada que marca encaminhamentos PENDENTE com prazo vencido
 * como VENCIDO. Roda diariamente às 06h (deploy noturno).
 */
@Injectable()
export class EncaminhamentosVencidosTask {
  private readonly logger = new Logger(EncaminhamentosVencidosTask.name);

  constructor(
    @InjectRepository(Encaminhamento)
    private readonly repo: Repository<Encaminhamento>,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_6AM)
  async marcarVencidos(): Promise<void> {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const resultado = await this.repo
      .createQueryBuilder()
      .update(Encaminhamento)
      .set({ status: StatusEncaminhamento.VENCIDO })
      .where('status = :pendente', { pendente: StatusEncaminhamento.PENDENTE })
      .andWhere('prazo < :hoje', { hoje })
      .execute();

    if (resultado.affected && resultado.affected > 0) {
      this.logger.log(`EncaminhamentosVencidosTask: ${resultado.affected} encaminhamento(s) marcado(s) como VENCIDO`);
    }
  }
}
