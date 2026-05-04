import { Module }        from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ResponsaveisController } from './responsaveis.controller';
import { ResponsaveisService }    from './responsaveis.service';
import { ResponsavelLegal }       from './entities/responsavel-legal.entity';

@Module({
  imports:     [TypeOrmModule.forFeature([ResponsavelLegal])],
  controllers: [ResponsaveisController],
  providers:   [ResponsaveisService],
  exports:     [ResponsaveisService],
})
export class ResponsaveisModule {}
