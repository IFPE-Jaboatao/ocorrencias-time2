import { Module }        from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule }  from '@nestjs/platform-express';
import { AlunosController } from './alunos.controller';
import { AlunosService }    from './alunos.service';
import { Aluno }            from './entities/aluno.entity';

@Module({
  imports:     [TypeOrmModule.forFeature([Aluno]), MulterModule.register({ limits: { fileSize: 10 * 1024 * 1024 } })],
  controllers: [AlunosController],
  providers:   [AlunosService],
  exports:     [AlunosService],
})
export class AlunosModule {}
