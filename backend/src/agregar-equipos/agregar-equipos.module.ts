import { Module } from '@nestjs/common';
import { AgregarEquiposController } from './agregar-equipos.controller.js';
import { AgregarEquiposService } from './agregar-equipos.service.js';

@Module({
  controllers: [AgregarEquiposController],
  providers: [AgregarEquiposService],
})
export class AgregarEquiposModule {}
