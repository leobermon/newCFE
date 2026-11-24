import { Module } from '@nestjs/common';
import { TerminalController } from './terminal.controller.js';
import { TerminalGateway } from './terminal.gateway.js';

@Module({
  controllers: [TerminalController],
  providers: [TerminalGateway],
})
export class TerminalModule {}
