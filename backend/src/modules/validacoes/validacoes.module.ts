import { Module }        from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ValidacoesController } from './validacoes.controller';
import { ValidacoesService }    from './validacoes.service';
import { ValidacaoOcorrencia }  from './entities/validacao-ocorrencia.entity';
import { OcorrenciasModule }    from '../ocorrencias/ocorrencias.module';

@Module({
  imports:     [TypeOrmModule.forFeature([ValidacaoOcorrencia]), OcorrenciasModule],
  controllers: [ValidacoesController],
  providers:   [ValidacoesService],
})
export class ValidacoesModule {}
