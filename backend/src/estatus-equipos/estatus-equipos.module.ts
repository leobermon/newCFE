import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Subestacion } from './subestacion.entity.js';
import { EstatusEquiposService } from './estatus-equipos.service.js';
import { EstatusEquiposController } from './estatus-equipos.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([Subestacion], 'transmision')],
  controllers: [EstatusEquiposController],
  providers: [EstatusEquiposService],
})
export class EstatusEquiposModule {}
