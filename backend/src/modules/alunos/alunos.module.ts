import { Module }        from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AlunosController } from './alunos.controller';
import { AlunosService }    from './alunos.service';
import { Aluno }            from './entities/aluno.entity';

@Module({
  imports:     [TypeOrmModule.forFeature([Aluno])],
  controllers: [AlunosController],
  providers:   [AlunosService],
  exports:     [AlunosService],
})
export class AlunosModule {}
