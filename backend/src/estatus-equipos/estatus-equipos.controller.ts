import { Controller, Get } from '@nestjs/common';
import { EstatusEquiposService } from './estatus-equipos.service.js';

@Controller('estatus-equipos')
export class EstatusEquiposController {
  constructor(private readonly estatusEquiposService: EstatusEquiposService) {}

  @Get()
  findAll() {
    return this.estatusEquiposService.findAll();
  }
}
