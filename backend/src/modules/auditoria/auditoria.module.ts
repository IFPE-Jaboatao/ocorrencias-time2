import { Global, Module } from '@nestjs/common';
import { TypeOrmModule }  from '@nestjs/typeorm';
import { AuditoriaController } from './auditoria.controller';
import { AuditoriaService }    from './auditoria.service';
import { Auditoria }           from './entities/auditoria.entity';
import { AuditInterceptor }    from '../../common/interceptors/audit.interceptor';

@Global()
@Module({
  imports:     [TypeOrmModule.forFeature([Auditoria])],
  controllers: [AuditoriaController],
  providers:   [AuditoriaService, AuditInterceptor],
  exports:     [AuditoriaService, AuditInterceptor],
})
export class AuditoriaModule {}
