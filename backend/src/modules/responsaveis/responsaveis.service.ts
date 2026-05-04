import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository }              from '@nestjs/typeorm';
import { Repository }                    from 'typeorm';
import { ResponsavelLegal }              from './entities/responsavel-legal.entity';
import { CreateResponsavelDto }          from './dto/create-responsavel.dto';

@Injectable()
export class ResponsaveisService {
  constructor(
    @InjectRepository(ResponsavelLegal)
    private readonly repo: Repository<ResponsavelLegal>,
  ) {}

  criar(dto: CreateResponsavelDto): Promise<ResponsavelLegal> {
    return this.repo.save(this.repo.create(dto));
  }

  listarPorAluno(alunoId: string): Promise<ResponsavelLegal[]> {
    return this.repo.find({ where: { alunoId } });
  }

  async buscarPorId(id: string): Promise<ResponsavelLegal> {
    const r = await this.repo.findOne({ where: { id } });
    if (!r) throw new NotFoundException('Responsável não encontrado');
    return r;
  }

  listarAtivosParaNotificacao(alunoId: string): Promise<ResponsavelLegal[]> {
    return this.repo.find({ where: { alunoId, receberNotificacoes: true } });
  }
}
