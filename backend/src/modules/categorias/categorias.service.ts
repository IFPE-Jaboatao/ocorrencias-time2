import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository }              from '@nestjs/typeorm';
import { Repository }                    from 'typeorm';
import { CategoriaOcorrencia }           from './entities/categoria-ocorrencia.entity';
import { SubcategoriaOcorrencia }        from './entities/subcategoria-ocorrencia.entity';
import { CreateCategoriaDto }            from './dto/create-categoria.dto';
import { CreateSubcategoriaDto }         from './dto/create-subcategoria.dto';

@Injectable()
export class CategoriasService {
  constructor(
    @InjectRepository(CategoriaOcorrencia)
    private readonly repo: Repository<CategoriaOcorrencia>,
    @InjectRepository(SubcategoriaOcorrencia)
    private readonly subRepo: Repository<SubcategoriaOcorrencia>,
  ) {}

  criar(dto: CreateCategoriaDto): Promise<CategoriaOcorrencia> {
    return this.repo.save(this.repo.create({ ...dto }));
  }

  listar(): Promise<CategoriaOcorrencia[]> {
    return this.repo.find({
      where:   { ativo: true },
      relations: ['subcategorias'],
      order:   { nome: 'ASC' },
    });
  }

  async buscarPorId(id: string): Promise<CategoriaOcorrencia> {
    const cat = await this.repo.findOne({ where: { id }, relations: ['subcategorias'] });
    if (!cat) throw new NotFoundException('Categoria não encontrada');
    return cat;
  }

  async desativar(id: string): Promise<void> {
    await this.buscarPorId(id);
    await this.repo.update(id, { ativo: false });
  }

  async criarSubcategoria(categoriaId: string, dto: CreateSubcategoriaDto): Promise<SubcategoriaOcorrencia> {
    await this.buscarPorId(categoriaId);
    return this.subRepo.save(this.subRepo.create({ ...dto, categoriaId }));
  }

  async listarSubcategorias(categoriaId: string): Promise<SubcategoriaOcorrencia[]> {
    await this.buscarPorId(categoriaId);
    return this.subRepo.find({ where: { categoriaId, ativo: true } });
  }

  async buscarSubcategoriaPorId(id: string): Promise<SubcategoriaOcorrencia> {
    const sub = await this.subRepo.findOne({ where: { id, ativo: true } });
    if (!sub) throw new NotFoundException('Subcategoria não encontrada');
    return sub;
  }

  async desativarSubcategoria(categoriaId: string, subcategoriaId: string): Promise<void> {
    await this.buscarPorId(categoriaId);
    const sub = await this.subRepo.findOne({ where: { id: subcategoriaId, categoriaId } });
    if (!sub) throw new NotFoundException('Subcategoria não encontrada');
    await this.subRepo.update(subcategoriaId, { ativo: false });
  }
}
