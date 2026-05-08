import { Injectable } from '@nestjs/common';
import { InjectRepository }              from '@nestjs/typeorm';
import { Repository }                    from 'typeorm';
import { Encaminhamento, StatusEncaminhamento } from './entities/encaminhamento.entity';
import { CreateEncaminhamentoDto }              from './dto/create-encaminhamento.dto';

@Injectable()
export class EncaminhamentosService {
  constructor(
    @InjectRepository(Encaminhamento)
    private readonly repo: Repository<Encaminhamento>,
  ) {}

  criar(ocorrenciaId: string, dto: CreateEncaminhamentoDto): Promise<Encaminhamento> {
    return this.repo.save(
      this.repo.create({ ocorrenciaId, ...dto }),
    );
  }

  listarPorOcorrencia(ocorrenciaId: string): Promise<Encaminhamento[]> {
    return this.repo.find({ where: { ocorrenciaId }, relations: ['responsavel'] });
  }

  async registrarResultado(id: string, resultado: string): Promise<Encaminhamento> {
    const enc = await this.repo.findOneOrFail({ where: { id } });
    enc.resultadoRegistrado = resultado;
    enc.dataExecucao        = new Date();
    enc.status              = StatusEncaminhamento.EXECUTADO;
    return this.repo.save(enc);
  }
}
