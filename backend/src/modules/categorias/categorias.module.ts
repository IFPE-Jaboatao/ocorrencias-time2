import { Module }        from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CategoriasController }   from './categorias.controller';
import { CategoriasService }      from './categorias.service';
import { CategoriaOcorrencia }    from './entities/categoria-ocorrencia.entity';
import { SubcategoriaOcorrencia } from './entities/subcategoria-ocorrencia.entity';

@Module({
  imports:     [TypeOrmModule.forFeature([CategoriaOcorrencia, SubcategoriaOcorrencia])],
  controllers: [CategoriasController],
  providers:   [CategoriasService],
  exports:     [CategoriasService],
})
export class CategoriasModule {}
