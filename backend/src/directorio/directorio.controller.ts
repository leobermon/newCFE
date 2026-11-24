import { Controller, Get, Query } from '@nestjs/common';
import { DirectorioService } from './directorio.service.js';

@Controller('directorio')
export class DirectorioController {
  constructor(private readonly directorioService: DirectorioService) {}

  @Get()
  findAll(@Query('search') search?: string) {
    return this.directorioService.findAll(search);
  }
}
