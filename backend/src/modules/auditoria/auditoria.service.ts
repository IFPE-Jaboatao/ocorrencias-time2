import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository }       from 'typeorm';
import { Auditoria }        from './entities/auditoria.entity';

export interface RegistrarAuditoriaDto {
  atorId:        string;
  perfilAtor:    string;
  acao:          string;
  entidade:      string;
  entidadeId:    string;
  ip:            string;
  ocorrenciaId?: string;
  valorAnterior?: Record<string, unknown>;
  valorNovo?:     Record<string, unknown>;
}

@Injectable()
export class AuditoriaService {
  constructor(
    @InjectRepository(Auditoria)
    private readonly repo: Repository<Auditoria>,
  ) {}

  async registrar(dto: RegistrarAuditoriaDto): Promise<void> {
    await this.repo.save(
      this.repo.create({
        ...dto,
        ocorrenciaId:  dto.ocorrenciaId ?? null,
        valorAnterior: dto.valorAnterior ?? null,
        valorNovo:     dto.valorNovo ?? null,
        timestamp:     new Date(),
      }),
    );
  }
}
