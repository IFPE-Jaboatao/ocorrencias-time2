import { Module }        from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CienciaFormalController } from './ciencia-formal.controller';
import { CienciaFormalService }    from './ciencia-formal.service';
import { CienciaFormal }           from './entities/ciencia-formal.entity';

@Module({
  imports:     [TypeOrmModule.forFeature([CienciaFormal])],
  controllers: [CienciaFormalController],
  providers:   [CienciaFormalService],
  exports:     [CienciaFormalService],
})
export class CienciaFormalModule {}
