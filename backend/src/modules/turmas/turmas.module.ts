import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TurmasController } from './turmas.controller';
import { TurmasService } from './turmas.service';
import { Turma } from './entities/turma.entity';
import { UsuarioTurma } from './entities/usuario-turma.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Turma, UsuarioTurma])],
  controllers: [TurmasController],
  providers: [TurmasService],
  exports: [TurmasService, TypeOrmModule],
})
export class TurmasModule {}
