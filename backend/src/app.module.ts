import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { ItemsModule } from './items/items.module.js';
import { DirectorioModule } from './directorio/directorio.module.js';
import { R3Module } from './r3/r3.module.js';
import { EstatusEquiposModule } from './estatus-equipos/estatus-equipos.module.js';
import { SubestacionesModule } from './subestaciones/subestaciones.module.js';
import { AgregarEquiposModule } from './agregar-equipos/agregar-equipos.module.js';
import { TerminalModule } from './terminal/terminal.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'mysql',
        host: config.get<string>('DB_HOST', 'localhost'),
        port: config.get<number>('DB_PORT', 3306),
        username: config.get<string>('DB_USERNAME', 'root'),
        password: config.get<string>('DB_PASSWORD', ''),
        database: config.get<string>('DB_DATABASE', 'mi_proyecto'),
        autoLoadEntities: true,
        synchronize: true,
      }),
    }),
    TypeOrmModule.forRootAsync({
      name: 'transmision',
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        name: 'transmision',
        type: 'mysql',
        host: config.get<string>('DB_HOST', 'localhost'),
        port: config.get<number>('DB_PORT', 3306),
        username: config.get<string>('DB_USERNAME', 'root'),
        password: config.get<string>('DB_PASSWORD', ''),
        database: config.get<string>('DB_TRANSMISION_DATABASE', 'transmision'),
        autoLoadEntities: true,
        // Base de datos existente con datos reales: nunca alterar el esquema automáticamente.
        synchronize: false,
      }),
    }),
    ItemsModule,
    DirectorioModule,
    R3Module,
    EstatusEquiposModule,
    SubestacionesModule,
    AgregarEquiposModule,
    TerminalModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
