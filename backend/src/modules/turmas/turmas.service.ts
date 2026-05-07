import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Turma } from './entities/turma.entity';
import { CreateTurmaDto } from './dto/create-turma.dto';
import { FilterTurmaDto } from './dto/filter-turma.dto';

@Injectable()
export class TurmasService {
  constructor(
    @InjectRepository(Turma)
    private readonly repo: Repository<Turma>,
  ) {}

  criar(dto: CreateTurmaDto): Promise<Turma> {
    return this.repo.save(this.repo.create({ ...dto, ativo: dto.ativo ?? true }));
  }

  listar(filtros: FilterTurmaDto): Promise<Turma[]> {
    return this.repo.find({
      where: {
        ...(filtros.campus ? { campus: filtros.campus } : {}),
        ...(filtros.segmento ? { segmento: filtros.segmento } : {}),
        ...(filtros.anoLetivo ? { anoLetivo: filtros.anoLetivo } : {}),
        ativo: true,
      },
      order: { anoLetivo: 'DESC', campus: 'ASC', segmento: 'ASC', nome: 'ASC' },
    });
  }

  async buscarPorId(id: string): Promise<Turma> {
    const turma = await this.repo.findOne({ where: { id } });
    if (!turma) throw new NotFoundException('Turma nÃ£o encontrada');
    return turma;
  }
}
