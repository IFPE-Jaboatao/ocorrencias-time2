import { Module } from '@nestjs/common';
import { APP_GUARD, APP_FILTER } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { StudentsModule } from './students/students.module';
import { GuardiansModule } from './guardians/guardians.module';
import { OccurrencesModule } from './occurrences/occurrences.module';
import { OccurrenceTypesModule } from './occurrence-types/occurrence-types.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AuditModule } from './audit/audit.module';
import { FrequencyModule } from './frequency/frequency.module';
import { AppConfigModule } from './config/config.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '../.env' }),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'mysql',
        host:     config.get('DB_HOST', 'localhost'),
        port:     config.get<number>('DB_PORT', 3306),
        username: config.get('DB_USER'),
        password: config.get('DB_PASS'),
        database: config.get('DB_NAME'),
        entities:   [__dirname + '/**/*.entity{.ts,.js}'],
        migrations: [__dirname + '/migrations/*{.ts,.js}'],
        synchronize: false,
        logging: config.get('NODE_ENV') === 'development',
      }),
    }),

    EventEmitterModule.forRoot(),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    ScheduleModule.forRoot(),

    AuthModule,
    UsersModule,
    StudentsModule,
    GuardiansModule,
    OccurrencesModule,
    OccurrenceTypesModule,
    NotificationsModule,
    AuditModule,
    FrequencyModule,
    AppConfigModule,
  ],
  providers: [
    // US-04: Guards globais — JWT protege tudo, @Public() abre exceções
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    // Rate limiting global
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    // Filtro de erros HTTP padronizado
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
  ],
})
export class AppModule {}
