import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository }              from '@nestjs/typeorm';
import { Repository }                    from 'typeorm';
import { CategoriaOcorrencia }           from './entities/categoria-ocorrencia.entity';
import { CreateCategoriaDto }            from './dto/create-categoria.dto';

@Injectable()
export class CategoriasService {
  constructor(
    @InjectRepository(CategoriaOcorrencia)
    private readonly repo: Repository<CategoriaOcorrencia>,
  ) {}

  criar(dto: CreateCategoriaDto): Promise<CategoriaOcorrencia> {
    return this.repo.save(this.repo.create({ ...dto, subcategorias: dto.subcategorias ?? [] }));
  }

  listar(): Promise<CategoriaOcorrencia[]> {
    return this.repo.find({ where: { ativo: true } });
  }

  async buscarPorId(id: string): Promise<CategoriaOcorrencia> {
    const cat = await this.repo.findOne({ where: { id } });
    if (!cat) throw new NotFoundException('Categoria não encontrada');
    return cat;
  }

  async desativar(id: string): Promise<void> {
    await this.buscarPorId(id);
    await this.repo.update(id, { ativo: false });
  }
}
