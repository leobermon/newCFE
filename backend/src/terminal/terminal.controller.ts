import { Controller, Get } from '@nestjs/common';
import { TerminalGateway } from './terminal.gateway.js';

@Controller('terminal')
export class TerminalController {
  constructor(private readonly gateway: TerminalGateway) {}

  /** Le dice a la página si debe pedir la clave de acceso. */
  @Get('config')
  config() {
    return { requiereClave: this.gateway.requiereClave };
  }
}
