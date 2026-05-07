import { Module }        from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EvidenciasController } from './evidencias.controller';
import { EvidenciasService }    from './evidencias.service';
import { UploadService }        from './upload.service';
import { Evidencia }            from './entities/evidencia.entity';

@Module({
  imports:     [TypeOrmModule.forFeature([Evidencia])],
  controllers: [EvidenciasController],
  providers:   [EvidenciasService, UploadService],
  exports:     [EvidenciasService],
})
export class EvidenciasModule {}
