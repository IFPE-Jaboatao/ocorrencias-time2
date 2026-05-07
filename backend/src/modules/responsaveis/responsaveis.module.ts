import { Module }        from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ResponsaveisController } from './responsaveis.controller';
import { ResponsaveisService }    from './responsaveis.service';
import { Responsavel }            from './entities/responsavel.entity';
import { AlunoResponsavel }       from './entities/aluno-responsavel.entity';

@Module({
  imports:     [TypeOrmModule.forFeature([Responsavel, AlunoResponsavel])],
  controllers: [ResponsaveisController],
  providers:   [ResponsaveisService],
  exports:     [ResponsaveisService],
})
export class ResponsaveisModule {}
