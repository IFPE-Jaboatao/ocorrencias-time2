import { Module }               from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule }        from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule }       from '@nestjs/schedule';
import { EventEmitterModule }   from '@nestjs/event-emitter';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { databaseConfig }       from './config/database.config';
import { JwtAuthGuard }         from './modules/auth/guards/jwt-auth.guard';
import { RolesGuard }           from './common/guards/roles.guard';
import { AuditInterceptor }     from './common/interceptors/audit.interceptor';
import { AuthModule }           from './modules/auth/auth.module';
import { UsuariosModule }       from './modules/usuarios/usuarios.module';
import { CategoriasModule }     from './modules/categorias/categorias.module';
import { AlunosModule }         from './modules/alunos/alunos.module';
import { ResponsaveisModule }   from './modules/responsaveis/responsaveis.module';
import { AuditoriaModule }      from './modules/auditoria/auditoria.module';
import { SlaModule }            from './modules/sla/sla.module';
import { OcorrenciasModule }    from './modules/ocorrencias/ocorrencias.module';
import { ValidacoesModule }     from './modules/validacoes/validacoes.module';
import { EncaminhamentosModule } from './modules/encaminhamentos/encaminhamentos.module';
import { NotificacoesModule }   from './modules/notificacoes/notificacoes.module';
import { CienciaFormalModule }  from './modules/ciencia-formal/ciencia-formal.module';
import { DashboardModule }      from './modules/dashboard/dashboard.module';
import { RelatoriosModule }     from './modules/relatorios/relatorios.module';
import { EvidenciasModule }     from './modules/evidencias/evidencias.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    TypeOrmModule.forRootAsync({
      inject:     [ConfigService],
      useFactory: databaseConfig,
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),

    // Feature modules
    AuthModule,
    AuditoriaModule,
    UsuariosModule,
    CategoriasModule,
    AlunosModule,
    ResponsaveisModule,
    SlaModule,
    OcorrenciasModule,
    ValidacoesModule,
    EncaminhamentosModule,
    NotificacoesModule,
    CienciaFormalModule,
    DashboardModule,
    RelatoriosModule,
    EvidenciasModule,
  ],
  providers: [
    { provide: APP_GUARD,       useClass: ThrottlerGuard },
    { provide: APP_GUARD,       useClass: JwtAuthGuard },
    { provide: APP_GUARD,       useClass: RolesGuard },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
})
export class AppModule {}
