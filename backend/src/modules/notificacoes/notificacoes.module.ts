import { Module }        from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificacoesService } from './notificacoes.service';
import { Notificacao }         from './entities/notificacao.entity';
import { ResponsaveisModule }  from '../responsaveis/responsaveis.module';
import { AlunosModule }        from '../alunos/alunos.module';

@Module({
  imports:   [TypeOrmModule.forFeature([Notificacao]), ResponsaveisModule, AlunosModule],
  providers: [NotificacoesService],
  exports:   [NotificacoesService],
})
export class NotificacoesModule {}
