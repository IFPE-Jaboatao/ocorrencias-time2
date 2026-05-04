import { Module }        from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CategoriasController } from './categorias.controller';
import { CategoriasService }    from './categorias.service';
import { CategoriaOcorrencia }  from './entities/categoria-ocorrencia.entity';

@Module({
  imports:     [TypeOrmModule.forFeature([CategoriaOcorrencia])],
  controllers: [CategoriasController],
  providers:   [CategoriasService],
  exports:     [CategoriasService],
})
export class CategoriasModule {}
