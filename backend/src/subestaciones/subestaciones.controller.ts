import { Body, Controller, Get, NotFoundException, Param, ParseIntPipe, Put } from '@nestjs/common';
import { SubestacionesService, type ActualizarEquipo } from './subestaciones.service.js';

@Controller('subestaciones')
export class SubestacionesController {
  constructor(private readonly subestacionesService: SubestacionesService) {}

  @Get()
  findAll() {
    return this.subestacionesService.findAll();
  }
}

@Controller('equipos')
export class EquiposController {
  constructor(private readonly subestacionesService: SubestacionesService) {}

  // Debe ir antes de ':id' para que "tipos-caracteristica" no se tome como un id.
  @Get('tipos-caracteristica')
  tiposCaracteristica() {
    return this.subestacionesService.tiposCaracteristica();
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const equipo = await this.subestacionesService.findEquipo(id);
    if (!equipo) throw new NotFoundException(`No existe el equipo ${id}`);
    return equipo;
  }

  @Put(':id')
  async actualizar(@Param('id', ParseIntPipe) id: number, @Body() cuerpo: ActualizarEquipo) {
    const equipo = await this.subestacionesService.actualizarEquipo(id, cuerpo);
    if (!equipo) throw new NotFoundException(`No existe el equipo ${id}`);
    return equipo;
  }
}

@Controller('racks')
export class RacksController {
  constructor(private readonly subestacionesService: SubestacionesService) {}

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const rack = await this.subestacionesService.findRack(id);
    if (!rack) throw new NotFoundException(`No existe el rack ${id}`);
    return rack;
  }
}
