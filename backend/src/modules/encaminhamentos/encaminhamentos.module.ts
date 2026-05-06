import { Module }        from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EncaminhamentosController }    from './encaminhamentos.controller';
import { EncaminhamentosService }       from './encaminhamentos.service';
import { EncaminhamentosVencidosTask }  from './tasks/encaminhamentos-vencidos.task';
import { Encaminhamento }               from './entities/encaminhamento.entity';

@Module({
  imports:     [TypeOrmModule.forFeature([Encaminhamento])],
  controllers: [EncaminhamentosController],
  providers:   [EncaminhamentosService, EncaminhamentosVencidosTask],
  exports:     [EncaminhamentosService],
})
export class EncaminhamentosModule {}
