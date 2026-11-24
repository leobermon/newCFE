import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { Repository } from 'typeorm';
import { Subestacion } from './subestacion.entity.js';

export interface ActualizarEquipo {
  nombre?: unknown;
  etiquetaTablero?: unknown;
  numeroR3?: unknown;
  caracteristicas?: { id?: unknown; tipoId?: unknown; valor?: unknown }[];
  puertos?: {
    id?: unknown;
    puerto?: unknown;
    origen?: unknown;
    destino?: unknown;
    servicio?: unknown;
    observacion?: unknown;
  }[];
}

function texto(valor: unknown, campo: string, obligatorio: boolean, max: number): string {
  if (valor === undefined || valor === null || valor === '') {
    if (obligatorio) throw new BadRequestException(`Falta ${campo}.`);
    return '';
  }
  if (typeof valor !== 'string') throw new BadRequestException(`${campo} debe ser texto.`);
  const limpio = valor.trim();
  if (obligatorio && !limpio) throw new BadRequestException(`Falta ${campo}.`);
  if (limpio.length > max) throw new BadRequestException(`${campo} es demasiado largo (máximo ${max} caracteres).`);
  return limpio;
}

function entero(valor: unknown, campo: string): number | null {
  if (valor === undefined || valor === null || valor === '') return null;
  const n = Number(valor);
  if (!Number.isInteger(n) || n < 0) throw new BadRequestException(`${campo} no es un número válido.`);
  return n;
}

@Injectable()
export class SubestacionesService {
  constructor(
    @InjectRepository(Subestacion, 'transmision')
    private readonly subestacionRepository: Repository<Subestacion>,
  ) {}

  async findRack(id: number) {
    const manager = this.subestacionRepository.manager;
    const [rack]: { id: number; etiqueta: string; subestacion: string; alias: string }[] =
      await manager.query(
        `SELECT g.id, g.etiqueta, s.nombre AS subestacion, s.alias
         FROM gabinetes g JOIN subestaciones s ON s.id = g.subestacion
         WHERE g.id = ?`,
        [id],
      );
    if (!rack) return null;

    const equipos = await manager.query(
      `SELECT e.id, e.nombre, e.etiquetaTablero,
              e.posicionRackStart AS posicionInicio, e.posicionRackEnd AS posicionFin,
              e.modelo AS modeloId, COALESCE(m.imgActive, 0) AS imgActive
       FROM lista_de_equipos e
       LEFT JOIN modelo_equipo m ON m.id = e.modelo
       WHERE e.gabinete = ?
       ORDER BY e.posicionRackStart DESC`,
      [id],
    );
    const archivos = await manager.query(
      `SELECT id, nombre_archivo AS nombre FROM archivos WHERE gabinete_id = ? ORDER BY id`,
      [id],
    );
    return {
      ...rack,
      equipos: equipos.map((e: { imgActive: number }) => ({ ...e, imgActive: !!e.imgActive })),
      archivos,
    };
  }

  async findEquipo(id: number) {
    const manager = this.subestacionRepository.manager;
    const [equipo] = await manager.query(
      `SELECT e.id, e.nombre, e.etiquetaTablero, e.numeroR3, e.serialNumber,
              e.puertos_especificos AS tienePuertos, e.gabinete AS gabineteId,
              g.etiqueta AS gabinete, s.alias AS subestacion,
              m.id AS modeloId, m.modelo AS modelo, COALESCE(m.imgActive, 0) AS imgActive,
              t.nombre AS tipo, mc.id AS marcaId, mc.nombre AS marca
       FROM lista_de_equipos e
       LEFT JOIN gabinetes g ON g.id = e.gabinete
       LEFT JOIN subestaciones s ON s.id = g.subestacion
       LEFT JOIN modelo_equipo m ON m.id = e.modelo
       LEFT JOIN tipo_equipo t ON t.id = m.tipoEquipo
       LEFT JOIN marcas mc ON mc.id = m.marca
       WHERE e.id = ?`,
      [id],
    );
    if (!equipo) return null;

    const caracteristicas = await manager.query(
      `SELECT c.id, c.caracteristica_id AS tipoId, tc.caracteristica AS nombre, c.valor
       FROM caracteristicas_de_equipos c
       LEFT JOIN tipo_caracteristicas tc ON tc.id = c.caracteristica_id
       WHERE c.equipo_id = ? ORDER BY c.id`,
      [id],
    );
    const puertos = equipo.tienePuertos
      ? await manager.query(
          `SELECT id, numero_de_puerto AS puerto, dir_origen AS origen, dir_destino AS destino,
                  servicio, observacion
           FROM puertos WHERE equipo_id = ? ORDER BY id`,
          [id],
        )
      : [];
    const notas = await manager.query(
      `SELECT id, user AS usuario, date AS fecha, nota FROM notas WHERE equipo = ? ORDER BY id`,
      [id],
    );

    const { tienePuertos, ...datos } = equipo;
    return { ...datos, imgActive: !!datos.imgActive, caracteristicas, puertos, notas };
  }

  /** Tipos de característica que se pueden agregar a un equipo (DIRECCION IP, USER, VERSIÓN...). */
  async tiposCaracteristica() {
    return this.subestacionRepository.manager.query(
      `SELECT id, caracteristica AS nombre FROM tipo_caracteristicas ORDER BY caracteristica`,
    );
  }

  /**
   * Edita un equipo: sus datos, sus características (IP, usuario...) y sus puertos. Todo en una transacción.
   * Antes de tocar nada guarda una copia del equipo en respaldos/ para poder deshacer.
   */
  async actualizarEquipo(id: number, cuerpo: ActualizarEquipo) {
    const actual = await this.findEquipo(id);
    if (!actual) return null;

    const nombre = texto(cuerpo.nombre, 'el nombre', true, 100);
    const etiquetaTablero = texto(cuerpo.etiquetaTablero, 'la etiqueta de tablero', false, 100);
    const numeroR3 = entero(cuerpo.numeroR3, 'el R3');

    const caracteristicas = (cuerpo.caracteristicas ?? []).map((c, i) => ({
      id: c.id ? entero(c.id, 'la característica') : null,
      tipoId: entero(c.tipoId, `el tipo de la característica ${i + 1}`),
      valor: texto(c.valor, `el valor de la característica ${i + 1}`, true, 2000),
    }));
    const puertos = (cuerpo.puertos ?? []).map((p, i) => ({
      id: p.id ? entero(p.id, 'el puerto') : null,
      puerto: texto(p.puerto, `el número del puerto ${i + 1}`, true, 20),
      origen: texto(p.origen, 'el origen', false, 250),
      destino: texto(p.destino, 'el destino', false, 250),
      servicio: texto(p.servicio, 'el servicio', false, 250),
      observacion: texto(p.observacion, 'la observación', false, 5000),
    }));

    // Un id que llegue de fuera debe pertenecer a este equipo: no se puede editar el de otro.
    const idsCar = new Set(actual.caracteristicas.map((c: { id: number }) => c.id));
    const idsPto = new Set(actual.puertos.map((p: { id: number }) => p.id));
    if (caracteristicas.some((c) => c.id !== null && !idsCar.has(c.id)))
      throw new BadRequestException('Una característica no pertenece a este equipo.');
    if (puertos.some((p) => p.id !== null && !idsPto.has(p.id)))
      throw new BadRequestException('Un puerto no pertenece a este equipo.');

    const dir = path.resolve(process.cwd(), '..', 'borradores', 'respaldos');
    await fs.mkdir(dir, { recursive: true });
    const marca = new Date().toISOString().replace(/[:.]/g, '-');
    await fs.writeFile(path.join(dir, `equipo-${id}-antes-${marca}.json`), JSON.stringify(actual, null, 2), 'utf8');

    await this.subestacionRepository.manager.transaction(async (m) => {
      await m.query(
        `UPDATE lista_de_equipos SET nombre = ?, etiquetaTablero = ?, numeroR3 = ?, puertos_especificos = ? WHERE id = ?`,
        [nombre, etiquetaTablero || null, numeroR3, puertos.length ? 1 : 0, id],
      );

      const quedanCar = caracteristicas.filter((c) => c.id !== null).map((c) => c.id as number);
      for (const viejo of idsCar as Set<number>) {
        if (!quedanCar.includes(viejo)) await m.query(`DELETE FROM caracteristicas_de_equipos WHERE id = ? AND equipo_id = ?`, [viejo, id]);
      }
      for (const c of caracteristicas) {
        if (c.id !== null)
          await m.query(`UPDATE caracteristicas_de_equipos SET caracteristica_id = ?, valor = ? WHERE id = ? AND equipo_id = ?`, [c.tipoId, c.valor, c.id, id]);
        else
          await m.query(`INSERT INTO caracteristicas_de_equipos (equipo_id, caracteristica_id, valor) VALUES (?, ?, ?)`, [id, c.tipoId, c.valor]);
      }

      const quedanPto = puertos.filter((p) => p.id !== null).map((p) => p.id as number);
      for (const viejo of idsPto as Set<number>) {
        if (!quedanPto.includes(viejo)) await m.query(`DELETE FROM puertos WHERE id = ? AND equipo_id = ?`, [viejo, id]);
      }
      for (const p of puertos) {
        if (p.id !== null)
          await m.query(
            `UPDATE puertos SET numero_de_puerto = ?, dir_origen = ?, dir_destino = ?, servicio = ?, observacion = ? WHERE id = ? AND equipo_id = ?`,
            [p.puerto, p.origen || null, p.destino || null, p.servicio || null, p.observacion || null, p.id, id],
          );
        else
          await m.query(
            `INSERT INTO puertos (numero_de_puerto, dir_origen, dir_destino, servicio, observacion, equipo_id) VALUES (?, ?, ?, ?, ?, ?)`,
            [p.puerto, p.origen || null, p.destino || null, p.servicio || null, p.observacion || null, id],
          );
      }
    });

    return this.findEquipo(id);
  }

  async findAll() {
    const subestaciones = await this.subestacionRepository
      .createQueryBuilder('s')
      .where('s.active = 1')
      .orderBy('s.nombre', 'ASC')
      .getMany();

    return subestaciones.map((s) => ({
      id: s.id,
      nombre: s.nombre,
      alias: s.alias,
      instalaciones: (s.instalaciones ?? '')
        .split(',')
        .map((v) => parseInt(v.trim(), 10))
        .filter((n) => !Number.isNaN(n)),
    }));
  }
}
