import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Subestacion } from './subestacion.entity.js';
import { SubestacionesService } from './subestaciones.service.js';
import {
  EquiposController,
  RacksController,
  SubestacionesController,
} from './subestaciones.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([Subestacion], 'transmision')],
  controllers: [SubestacionesController, RacksController, EquiposController],
  providers: [SubestacionesService],
})
export class SubestacionesModule {}
