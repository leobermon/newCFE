import { Controller, Get, Query } from '@nestjs/common';
import { R3Service } from './r3.service.js';

@Controller('r3')
export class R3Controller {
  constructor(private readonly r3Service: R3Service) {}

  @Get()
  findAll(@Query('search') search?: string) {
    return this.r3Service.findAll(search);
  }
}
