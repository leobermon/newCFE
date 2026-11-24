import { Body, Controller, Get, Post, Put } from '@nestjs/common';
import { AgregarEquiposService } from './agregar-equipos.service.js';

/**
 * Pantalla "Agregar equipos": prepara en un borrador (archivo JSON) los equipos de cada gabinete.
 * Guardar el borrador no escribe en la base de datos; solo "dar-de-alta" lo hace.
 */
@Controller('agregar-equipos')
export class AgregarEquiposController {
  constructor(private readonly service: AgregarEquiposService) {}

  @Get('catalogo')
  catalogo() {
    return this.service.catalogo();
  }

  @Get('gabinetes')
  gabinetes() {
    return this.service.gabinetes();
  }

  @Get('borrador')
  borrador() {
    return this.service.leerBorrador();
  }

  @Put('borrador')
  guardar(@Body() cuerpo: unknown) {
    return this.service.guardarBorrador(cuerpo);
  }

  /** Escribe en la base de datos lo que está guardado en el borrador. */
  @Post('dar-de-alta')
  darDeAlta() {
    return this.service.darDeAlta();
  }
}
