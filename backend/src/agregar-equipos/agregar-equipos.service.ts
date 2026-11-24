import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { DataSource } from 'typeorm';

/** La posición del primer equipo (el que se ve arriba); cada equipo siguiente resta 1. */
export const POSICION_INICIAL = 40;

export interface EquipoBorrador {
  nombre: string;
  etiquetaTablero: string;
  modeloId: number;
  serialNumber: string;
  numeroR3: number | null;
}

export interface GabineteBorrador {
  gabineteId: number;
  subestacion: string;
  etiqueta: string;
  actualizado: string;
  equipos: (EquipoBorrador & { posicion: number })[];
}

export interface Borrador {
  gabinetes: Record<string, GabineteBorrador>;
}

const MAX_TEXTO = 100;

function texto(valor: unknown, campo: string, obligatorio: boolean, max = MAX_TEXTO): string {
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

@Injectable()
export class AgregarEquiposService {
  constructor(@InjectDataSource('transmision') private readonly db: DataSource) {}

  /** Carpeta y archivo donde se guarda el borrador (junto al proyecto, fuera de la base de datos). */
  private get archivo() {
    const dir = process.env.BORRADOR_DIR ?? path.resolve(process.cwd(), '..', 'borradores');
    return { dir, ruta: path.join(dir, 'equipos-pendientes.json') };
  }

  /**
   * Catálogo de modelos: cada modelo sale una sola vez, sin el nombre, la etiqueta ni ningún
   * dato del gabinete donde esté montado. Los más usados entre subestaciones salen primero.
   */
  async catalogo() {
    const filas: {
      modeloId: number;
      modelo: string | null;
      marca: string | null;
      tipo: string | null;
      subestaciones: string;
      usos: string;
      imgActive: number | null;
    }[] = await this.db.query(
      `SELECT mo.id AS modeloId, mo.modelo AS modelo, mc.nombre AS marca, t.nombre AS tipo,
              COUNT(DISTINCT g.subestacion) AS subestaciones, COUNT(e.id) AS usos,
              COALESCE(mo.imgActive, 0) AS imgActive
       FROM modelo_equipo mo
       LEFT JOIN tipo_equipo t ON t.id = mo.tipoEquipo
       LEFT JOIN marcas mc ON mc.id = mo.marca
       LEFT JOIN lista_de_equipos e ON e.modelo = mo.id
       LEFT JOIN gabinetes g ON g.id = e.gabinete
       GROUP BY mo.id, mo.modelo, mc.nombre, t.nombre, mo.imgActive
       ORDER BY subestaciones DESC, usos DESC, mc.nombre, mo.modelo`,
    );
    return filas.map((f) => ({
      modeloId: f.modeloId,
      modelo: f.modelo,
      marca: f.marca,
      tipo: f.tipo,
      subestaciones: Number(f.subestaciones),
      usos: Number(f.usos),
      imgActive: !!f.imgActive,
    }));
  }

  /** Todas las subestaciones (también las ocultas) con sus gabinetes. */
  async gabinetes() {
    const filas: {
      sid: number;
      nombre: string | null;
      alias: string | null;
      active: number;
      gid: number;
      etiqueta: string | null;
      equipos: string;
    }[] = await this.db.query(
      `SELECT s.id AS sid, s.nombre, s.alias, s.active, g.id AS gid, g.etiqueta,
              (SELECT COUNT(*) FROM lista_de_equipos e WHERE e.gabinete = g.id) AS equipos
       FROM subestaciones s JOIN gabinetes g ON g.subestacion = s.id
       ORDER BY s.nombre, g.etiqueta`,
    );
    const porSub = new Map<
      number,
      {
        id: number;
        nombre: string;
        alias: string;
        activa: boolean;
        gabinetes: { id: number; etiqueta: string; equiposRegistrados: number }[];
      }
    >();
    for (const f of filas) {
      let sub = porSub.get(f.sid);
      if (!sub) {
        sub = {
          id: f.sid,
          nombre: f.nombre ?? f.alias ?? `#${f.sid}`,
          alias: f.alias ?? '',
          activa: !!f.active,
          gabinetes: [],
        };
        porSub.set(f.sid, sub);
      }
      sub.gabinetes.push({ id: f.gid, etiqueta: f.etiqueta ?? '', equiposRegistrados: Number(f.equipos) });
    }
    return [...porSub.values()];
  }

  async leerBorrador(): Promise<Borrador> {
    try {
      const datos = JSON.parse(await fs.readFile(this.archivo.ruta, 'utf8')) as Borrador;
      return { gabinetes: datos.gabinetes ?? {} };
    } catch {
      return { gabinetes: {} };
    }
  }

  /** Valida el borrador completo, le calcula las posiciones y lo guarda en el archivo. */
  async guardarBorrador(entrada: unknown): Promise<Borrador & { archivo: string }> {
    const gabinetesEntrada = (entrada as { gabinetes?: unknown })?.gabinetes;
    if (!gabinetesEntrada || typeof gabinetesEntrada !== 'object' || Array.isArray(gabinetesEntrada)) {
      throw new BadRequestException('El borrador no tiene gabinetes.');
    }

    const salida: Borrador = { gabinetes: {} };
    const ahora = new Date().toISOString();

    for (const crudo of Object.values(gabinetesEntrada as Record<string, unknown>)) {
      const g = crudo as {
        gabineteId?: unknown;
        equipos?: unknown;
      };
      const gabineteId = Number(g?.gabineteId);
      if (!Number.isInteger(gabineteId) || gabineteId <= 0) throw new BadRequestException('Gabinete inválido.');
      if (!Array.isArray(g.equipos)) throw new BadRequestException('Faltan los equipos del gabinete.');
      if (g.equipos.length === 0) continue; // un gabinete sin equipos no se guarda

      const [gab] = await this.db.query(
        `SELECT g.id, g.etiqueta, s.nombre FROM gabinetes g JOIN subestaciones s ON s.id = g.subestacion WHERE g.id = ?`,
        [gabineteId],
      );
      if (!gab) throw new BadRequestException(`No existe el gabinete ${gabineteId}.`);

      const equipos = [];
      for (const [i, e] of (g.equipos as Record<string, unknown>[]).entries()) {
        const modeloId = Number(e.modeloId);
        const [modelo] = Number.isInteger(modeloId)
          ? await this.db.query('SELECT id FROM modelo_equipo WHERE id = ?', [modeloId])
          : [];
        if (!modelo) throw new BadRequestException(`El modelo del equipo ${i + 1} no existe.`);

        let numeroR3: number | null = null;
        if (e.numeroR3 !== null && e.numeroR3 !== undefined && e.numeroR3 !== '') {
          numeroR3 = Number(e.numeroR3);
          if (!Number.isInteger(numeroR3) || numeroR3 < 0) throw new BadRequestException('Número R3 inválido.');
        }

        equipos.push({
          nombre: texto(e.nombre, 'el nombre', true),
          etiquetaTablero: texto(e.etiquetaTablero, 'la etiqueta de tablero', false),
          modeloId,
          // En la base, serialNumber es varchar(20).
          serialNumber: texto(e.serialNumber, 'el número de serie', false, 20),
          numeroR3,
          posicion: POSICION_INICIAL - i,
        });
      }

      salida.gabinetes[String(gabineteId)] = {
        gabineteId,
        subestacion: gab.nombre ?? '',
        etiqueta: gab.etiqueta ?? '',
        actualizado: ahora,
        equipos,
      };
    }

    const { dir, ruta } = this.archivo;
    await fs.mkdir(dir, { recursive: true });
    try {
      await fs.copyFile(ruta, `${ruta}.bak`);
    } catch {
      // primera vez: no hay nada que respaldar
    }
    await fs.writeFile(ruta, JSON.stringify(salida, null, 2), 'utf8');
    return { ...salida, archivo: ruta };
  }

  /**
   * Da de alta en la base el borrador guardado: respalda la tabla, inserta todo en una sola
   * transacción y archiva el borrador (con los ids creados) para que no se repita.
   * Si un gabinete ya tenía equipos, los nuevos se acomodan debajo de los que ya había.
   */
  async darDeAlta() {
    const borrador = await this.leerBorrador();
    const gabinetes = Object.values(borrador.gabinetes).filter((g) => g.equipos.length > 0);
    if (!gabinetes.length) throw new BadRequestException('No hay equipos guardados para dar de alta.');

    const { dir, ruta } = this.archivo;
    const marca = new Date().toISOString().replace(/[:.]/g, '-');
    const respaldos = path.join(dir, 'respaldos');
    await fs.mkdir(respaldos, { recursive: true });

    // 1. Respaldo de la tabla antes de escribir.
    const filasAntes = await this.db.query('SELECT * FROM lista_de_equipos ORDER BY id');
    await fs.writeFile(path.join(respaldos, `lista_de_equipos-antes-${marca}.json`), JSON.stringify(filasAntes), 'utf8');

    // 2. Inserción: o entra todo o no entra nada.
    const insertados = await this.db.transaction(async (m) => {
      const creados: { id: number; gabinete: number; nombre: string; posicion: number }[] = [];
      for (const g of gabinetes) {
        const [gab] = await m.query('SELECT id FROM gabinetes WHERE id = ?', [g.gabineteId]);
        if (!gab) throw new BadRequestException(`El gabinete ${g.gabineteId} ya no existe.`);

        // Los equipos nuevos van debajo de los que el gabinete ya tenga.
        const [{ minimo }] = await m.query(
          'SELECT MIN(posicionRackStart) AS minimo FROM lista_de_equipos WHERE gabinete = ?',
          [g.gabineteId],
        );
        const inicio = minimo === null || minimo === undefined ? POSICION_INICIAL : Number(minimo) - 1;
        if (inicio - (g.equipos.length - 1) < 1) {
          throw new BadRequestException(`En el gabinete ${g.etiqueta} ya no hay posiciones libres para ${g.equipos.length} equipos.`);
        }

        for (const [i, e] of g.equipos.entries()) {
          const [modelo] = await m.query('SELECT id FROM modelo_equipo WHERE id = ?', [e.modeloId]);
          if (!modelo) throw new BadRequestException(`El modelo ${e.modeloId} ya no existe.`);
          const posicion = inicio - i;
          const r = await m.query(
            `INSERT INTO lista_de_equipos
               (nombre, modelo, etiquetaTablero, numeroR3, serialNumber, gabinete, posicionRackStart, posicionRackEnd, puertos_especificos)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`,
            [e.nombre, e.modeloId, e.etiquetaTablero, e.numeroR3, e.serialNumber, g.gabineteId, posicion, posicion],
          );
          creados.push({ id: r.insertId, gabinete: g.gabineteId, nombre: e.nombre, posicion });
        }
      }
      return creados;
    });

    // 3. Archivar el borrador para que no se vuelva a dar de alta. Si algo falla aquí, el
    //    borrador se vacía igual: lo importante es no repetir equipos.
    let aviso: string | undefined;
    try {
      const procesados = path.join(dir, 'procesados');
      await fs.mkdir(procesados, { recursive: true });
      await fs.writeFile(
        path.join(procesados, `alta-${marca}.json`),
        JSON.stringify({ fecha: new Date().toISOString(), insertados, borrador }, null, 2),
        'utf8',
      );
      await fs.rm(ruta, { force: true });
      await fs.rm(`${ruta}.bak`, { force: true });
    } catch {
      aviso = 'Se dieron de alta, pero no se pudo archivar el borrador.';
      await fs.writeFile(ruta, JSON.stringify({ gabinetes: {} }), 'utf8').catch(() => undefined);
    }

    return {
      equipos: insertados.length,
      gabinetes: gabinetes.length,
      ids: insertados.map((i) => i.id),
      ...(aviso ? { aviso } : {}),
    };
  }
}
