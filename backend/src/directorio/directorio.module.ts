import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Directorio } from './directorio.entity.js';
import { DirectorioService } from './directorio.service.js';
import { DirectorioController } from './directorio.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([Directorio], 'transmision')],
  controllers: [DirectorioController],
  providers: [DirectorioService],
})
export class DirectorioModule {}
