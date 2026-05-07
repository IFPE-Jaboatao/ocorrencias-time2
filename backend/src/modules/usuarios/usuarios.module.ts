import { Module }         from '@nestjs/common';
import { TypeOrmModule }  from '@nestjs/typeorm';
import { UsuariosController } from './usuarios.controller';
import { UsuariosService }    from './usuarios.service';
import { Usuario }            from './entities/usuario.entity';
import { Turma }              from '../turmas/entities/turma.entity';
import { UsuarioTurma }       from '../turmas/entities/usuario-turma.entity';

@Module({
  imports:     [TypeOrmModule.forFeature([Usuario, Turma, UsuarioTurma])],
  controllers: [UsuariosController],
  providers:   [UsuariosService],
  exports:     [UsuariosService],
})
export class UsuariosModule {}
