import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { R3 } from './r3.entity.js';
import { R3Service } from './r3.service.js';
import { R3Controller } from './r3.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([R3], 'transmision')],
  controllers: [R3Controller],
  providers: [R3Service],
})
export class R3Module {}
