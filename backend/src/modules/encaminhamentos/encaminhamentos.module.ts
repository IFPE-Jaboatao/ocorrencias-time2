import { Module }        from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EncaminhamentosController } from './encaminhamentos.controller';
import { EncaminhamentosService }    from './encaminhamentos.service';
import { Encaminhamento }            from './entities/encaminhamento.entity';

@Module({
  imports:     [TypeOrmModule.forFeature([Encaminhamento])],
  controllers: [EncaminhamentosController],
  providers:   [EncaminhamentosService],
  exports:     [EncaminhamentosService],
})
export class EncaminhamentosModule {}
