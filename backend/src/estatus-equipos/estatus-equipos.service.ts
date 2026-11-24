import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subestacion } from './subestacion.entity.js';

export interface EquipoEstatus {
  id: number;
  nombre: string;
  ip: string;
  ping: boolean;
}

export interface GrupoEstatus {
  subestacion: string;
  alias: string;
  equipos: EquipoEstatus[];
  total: number;
  pingOk: number;
}

const TIPOS_EQUIPO = ['SWITCH', 'ROUTER', 'RTU', 'IFR', 'GATEWAY', 'ACCPOINT'];

/**
 * Genera datos de ejemplo mientras se conecta el origen real de IPs/ping.
 * Sustituir por una fuente real (tabla de direcciones_ip + ping real) cuando esté disponible.
 */
function generarMock(subestaciones: Subestacion[]): GrupoEstatus[] {
  let siguienteId = 1;
  let siguienteOctecto = 2;

  return subestaciones.map((sub) => {
    const cantidad = 4 + Math.floor(Math.random() * 7); // 4 a 10 equipos
    const equipos: EquipoEstatus[] = Array.from({ length: cantidad }, (_, i) => {
      const tipo = TIPOS_EQUIPO[Math.floor(Math.random() * TIPOS_EQUIPO.length)];
      return {
        id: siguienteId++,
        nombre: `${tipo} ${sub.alias} ${String(i + 1).padStart(2, '0')}`,
        ip: `10.28.76.${siguienteOctecto++}`,
        ping: Math.random() < 0.85,
      };
    });

    const pingOk = equipos.filter((e) => e.ping).length;

    return {
      subestacion: sub.nombre ?? sub.alias ?? 'SIN NOMBRE',
      alias: sub.alias ?? '',
      equipos,
      total: equipos.length,
      pingOk,
    };
  });
}

@Injectable()
export class EstatusEquiposService implements OnModuleInit {
  private grupos: GrupoEstatus[] = [];

  constructor(
    @InjectRepository(Subestacion, 'transmision')
    private readonly subestacionRepository: Repository<Subestacion>,
  ) {}

  async onModuleInit() {
    const subestaciones = await this.subestacionRepository
      .createQueryBuilder('s')
      .where('s.active = 1')
      .orderBy('s.nombre', 'ASC')
      .getMany();

    this.grupos = generarMock(subestaciones);
  }

  findAll() {
    const total = this.grupos.reduce((acc, g) => acc + g.total, 0);
    const pingOk = this.grupos.reduce((acc, g) => acc + g.pingOk, 0);

    return {
      grupos: this.grupos,
      totales: { total, pingOk },
    };
  }
}
