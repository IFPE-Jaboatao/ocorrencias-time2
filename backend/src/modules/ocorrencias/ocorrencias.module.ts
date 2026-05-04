import { Module }        from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OcorrenciasController } from './ocorrencias.controller';
import { OcorrenciasService }    from './ocorrencias.service';
import { Ocorrencia }            from './entities/ocorrencia.entity';
import { AlunosModule }          from '../alunos/alunos.module';
import { CategoriasModule }      from '../categorias/categorias.module';
import { SlaModule }             from '../sla/sla.module';

@Module({
  imports:     [TypeOrmModule.forFeature([Ocorrencia]), AlunosModule, CategoriasModule, SlaModule],
  controllers: [OcorrenciasController],
  providers:   [OcorrenciasService],
  exports:     [OcorrenciasService],
})
export class OcorrenciasModule {}
