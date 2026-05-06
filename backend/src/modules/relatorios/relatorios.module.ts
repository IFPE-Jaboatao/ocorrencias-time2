import { Module }           from '@nestjs/common';
import { TypeOrmModule }   from '@nestjs/typeorm';
import { Ocorrencia }      from '../ocorrencias/entities/ocorrencia.entity';
import { RelatoriosController } from './relatorios.controller';
import { RelatoriosService }    from './relatorios.service';

@Module({
  imports:     [TypeOrmModule.forFeature([Ocorrencia])],
  controllers: [RelatoriosController],
  providers:   [RelatoriosService],
})
export class RelatoriosModule {}
