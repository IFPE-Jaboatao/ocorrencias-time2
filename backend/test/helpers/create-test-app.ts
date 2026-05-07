import { INestApplication, ValidationPipe, Injectable, CanActivate } from '@nestjs/common';
import { Test, TestingModule }             from '@nestjs/testing';
import { TypeOrmModule }                   from '@nestjs/typeorm';
import { ConfigModule }                    from '@nestjs/config';
import { JwtService }                      from '@nestjs/jwt';
import { APP_GUARD, APP_INTERCEPTOR }      from '@nestjs/core';
import { ThrottlerModule }                 from '@nestjs/throttler';
import { ScheduleModule }                  from '@nestjs/schedule';
import { EventEmitterModule }              from '@nestjs/event-emitter';
import { JwtAuthGuard }                   from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard }                     from '@/common/guards/roles.guard';
import { AuditInterceptor }               from '@/common/interceptors/audit.interceptor';
import { HttpExceptionFilter }            from '@/common/filters/http-exception.filter';
import { AuthModule }                     from '@/modules/auth/auth.module';
import { UsuariosModule }                 from '@/modules/usuarios/usuarios.module';
import { CategoriasModule }               from '@/modules/categorias/categorias.module';
import { AlunosModule }                   from '@/modules/alunos/alunos.module';
import { ResponsaveisModule }             from '@/modules/responsaveis/responsaveis.module';
import { TurmasModule }                   from '@/modules/turmas/turmas.module';
import { AuditoriaModule }                from '@/modules/auditoria/auditoria.module';
import { SlaModule }                      from '@/modules/sla/sla.module';
import { OcorrenciasModule }              from '@/modules/ocorrencias/ocorrencias.module';
import { ValidacoesModule }               from '@/modules/validacoes/validacoes.module';
import { EncaminhamentosModule }          from '@/modules/encaminhamentos/encaminhamentos.module';
import { NotificacoesModule }             from '@/modules/notificacoes/notificacoes.module';
import { CienciaFormalModule }            from '@/modules/ciencia-formal/ciencia-formal.module';
import { DashboardModule }                from '@/modules/dashboard/dashboard.module';
import { AuthenticatedUser }              from '@/common/interfaces/authenticated-user.interface';
import { PerfilUsuario }                  from '@/common/enums/perfil-usuario.enum';
import { Segmento }                       from '@/common/enums/segmento.enum';

@Injectable()
class NoopThrottleGuard implements CanActivate {
  canActivate() { return true; }
}

export async function createTestApp(): Promise<INestApplication> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env.test' }),
      TypeOrmModule.forRoot({
        type:        'mysql',
        host:        process.env.DB_HOST      ?? 'localhost',
        port:        Number(process.env.DB_PORT ?? 3307),
        username:    process.env.DB_USER      ?? 'sgoa_user',
        password:    process.env.DB_PASS      ?? 'sgoa_pass',
        database:    process.env.DB_NAME      ?? 'sgoa_test',
        entities:    [__dirname + '/../../src/**/*.entity{.ts,.js}'],
        synchronize: true,
        logging:     false,
        charset:     'utf8mb4',
      }),
      // ThrottlerModule registrado para satisfazer dependências dos decorators
      ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 10_000 }]),
      ScheduleModule.forRoot(),
      EventEmitterModule.forRoot(),

      AuthModule, AuditoriaModule, UsuariosModule, CategoriasModule,
      AlunosModule, ResponsaveisModule, TurmasModule, SlaModule, OcorrenciasModule,
      ValidacoesModule, EncaminhamentosModule, NotificacoesModule,
      CienciaFormalModule, DashboardModule,
    ],
    providers: [
      // Throttle desabilitado nos testes — rate-limit é comportamento de infra, não de negócio
      { provide: APP_GUARD,       useClass: NoopThrottleGuard },
      { provide: APP_GUARD,       useClass: JwtAuthGuard },
      { provide: APP_GUARD,       useClass: RolesGuard },
      { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
    ],
  }).compile();

  const app = moduleFixture.createNestApplication();
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.useGlobalFilters(new HttpExceptionFilter());
  await app.init();
  return app;
}

export function gerarToken(app: INestApplication, payload: Partial<AuthenticatedUser> & { perfil: PerfilUsuario }): string {
  const jwtService = app.get(JwtService);
  const user: AuthenticatedUser = {
    sub:       payload.sub       ?? 'test-uuid',
    email:     payload.email     ?? 'test@escola.edu.br',
    nome:      payload.nome      ?? 'Usuário Teste',
    perfil:    payload.perfil,
    campus:    payload.campus    ?? 'Campus A',
    segmentos: payload.segmentos ?? [Segmento.FUNDAMENTAL],
  };
  return jwtService.sign(user);
}
