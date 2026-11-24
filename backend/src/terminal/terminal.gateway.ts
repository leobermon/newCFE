import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WebSocketGateway } from '@nestjs/websockets';
import { appendFile, mkdir } from 'node:fs/promises';
import { timingSafeEqual } from 'node:crypto';
import type { IncomingMessage } from 'node:http';
import path from 'node:path';
import { StringDecoder } from 'node:string_decoder';
import ssh2 from 'ssh2';
import type { ClientChannel, ConnectConfig } from 'ssh2';
import type { WebSocket } from 'ws';

const { Client } = ssh2;

// La librería acepta solo "append"; los tipos de @types/ssh2 exigen las tres claves, de ahí el cast.
const ALGORITMOS_ANTIGUOS = {
  kex: { append: ['diffie-hellman-group14-sha1', 'diffie-hellman-group-exchange-sha1', 'diffie-hellman-group1-sha1'] },
  serverHostKey: { append: ['ssh-rsa', 'ssh-dss'] },
  cipher: { append: ['aes128-cbc', 'aes192-cbc', 'aes256-cbc', '3des-cbc'] },
  hmac: { append: ['hmac-sha1'] },
} as unknown as ConnectConfig['algorithms'];

const MAX_SESIONES = 5;
const INACTIVIDAD_MS = 15 * 60 * 1000;

interface Sesion {
  ssh?: InstanceType<typeof Client>;
  canal?: ClientChannel;
  conectando: boolean;
  intentoClave: boolean;
  inactividad?: NodeJS.Timeout;
  equipo: string;
  destino: string;
  usuario: string;
}

interface MensajeConectar {
  type: 'connect';
  clave?: string;
  host?: string;
  puerto?: number;
  usuario?: string;
  contrasena?: string;
  equipo?: string;
  cols?: number;
  rows?: number;
}

/** Solo se permiten direcciones IPv4 de redes privadas (y loopback): la terminal no sirve para salir a Internet. */
export function esIpPermitida(host: string): boolean {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (!m) return false;
  const [a, b, c, d] = m.slice(1).map(Number) as [number, number, number, number];
  if ([a, b, c, d].some((n) => n > 255)) return false;
  return a === 10 || a === 127 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
}

/** ¿La conexión viene de esta misma computadora? */
export function esOrigenLocal(origen: string): boolean {
  return origen === '::1' || origen === '127.0.0.1' || origen === '::ffff:127.0.0.1';
}

/**
 * Terminal SSH: el navegador manda lo que se escribe por un WebSocket y este servicio lo pasa al equipo
 * por SSH. Protecciones: clave de acceso (TERMINAL_CLAVE), solo IPs privadas, máximo de sesiones,
 * cierre por inactividad y un registro de cada conexión (sin contraseñas).
 */
@Injectable()
@WebSocketGateway({ path: '/terminal' })
export class TerminalGateway {
  private sesiones = 0;

  constructor(private readonly config: ConfigService) {}

  /** Con TERMINAL_REQUIERE_CLAVE=false no se pide clave, pero solo se acepta gente de esta misma computadora. */
  get requiereClave(): boolean {
    return this.config.get<string>('TERMINAL_REQUIERE_CLAVE') !== 'false';
  }

  handleConnection(cliente: WebSocket, peticion: IncomingMessage) {
    const origen = peticion.socket.remoteAddress ?? '?';
    const sesion: Sesion = { conectando: false, intentoClave: false, equipo: '', destino: '', usuario: '' };

    cliente.on('message', (crudo) => {
      let msg: { type?: string; data?: string; cols?: number; rows?: number };
      try {
        msg = JSON.parse(crudo.toString()) as typeof msg;
      } catch {
        return;
      }
      this.reiniciarInactividad(cliente, sesion, origen);

      if (msg.type === 'connect') void this.conectar(cliente, sesion, origen, msg as MensajeConectar);
      else if (msg.type === 'data' && typeof msg.data === 'string') sesion.canal?.write(msg.data);
      else if (msg.type === 'resize' && sesion.canal && msg.cols && msg.rows) {
        sesion.canal.setWindow(Math.min(msg.rows, 200), Math.min(msg.cols, 500), 0, 0);
      }
    });

    cliente.on('close', () => this.cerrar(cliente, sesion, origen, 'el navegador se desconectó', false));
  }

  private enviar(cliente: WebSocket, msg: Record<string, unknown>) {
    if (cliente.readyState === 1) cliente.send(JSON.stringify(msg));
  }

  private reiniciarInactividad(cliente: WebSocket, sesion: Sesion, origen: string) {
    if (!sesion.canal) return;
    clearTimeout(sesion.inactividad);
    sesion.inactividad = setTimeout(
      () => this.cerrar(cliente, sesion, origen, 'cerrada por inactividad (15 min)', true),
      INACTIVIDAD_MS,
    );
  }

  private claveCorrecta(recibida: string | undefined): boolean {
    const esperada = this.config.get<string>('TERMINAL_CLAVE');
    if (!esperada || !recibida) return false;
    const a = Buffer.from(recibida);
    const b = Buffer.from(esperada);
    return a.length === b.length && timingSafeEqual(a, b);
  }

  private async conectar(cliente: WebSocket, sesion: Sesion, origen: string, msg: MensajeConectar) {
    if (sesion.conectando || sesion.canal) return;

    if (this.requiereClave) {
      if (!this.config.get<string>('TERMINAL_CLAVE')) {
        this.enviar(cliente, { type: 'error', mensaje: 'La terminal no está activada: falta TERMINAL_CLAVE en backend/.env.' });
        cliente.close();
        return;
      }
      if (!this.claveCorrecta(msg.clave)) {
        await this.registrar(`CLAVE_INCORRECTA origen=${origen}`);
        // Pequeña espera para frenar pruebas de clave una tras otra.
        await new Promise((r) => setTimeout(r, 1000));
        this.enviar(cliente, { type: 'error', mensaje: 'Clave de acceso incorrecta.' });
        cliente.close();
        return;
      }
    } else if (!esOrigenLocal(origen)) {
      // Sin clave, la terminal solo se puede usar desde la misma computadora donde corre el backend.
      await this.registrar(`RECHAZADO_SIN_CLAVE_ORIGEN_REMOTO origen=${origen}`);
      this.enviar(cliente, { type: 'error', mensaje: 'Sin clave, la terminal solo funciona desde la computadora donde corre el backend.' });
      cliente.close();
      return;
    }

    const host = String(msg.host ?? '').trim();
    const puerto = msg.puerto === undefined ? 22 : Number(msg.puerto);
    const usuario = String(msg.usuario ?? '').trim();
    const contrasena = String(msg.contrasena ?? '');
    const equipo = String(msg.equipo ?? '').slice(0, 60);

    if (!esIpPermitida(host)) {
      this.enviar(cliente, { type: 'error', mensaje: 'Solo se permiten direcciones IP de redes privadas (10.x, 172.16-31.x, 192.168.x).' });
      cliente.close();
      return;
    }
    if (!Number.isInteger(puerto) || puerto < 1 || puerto > 65535) {
      this.enviar(cliente, { type: 'error', mensaje: 'Puerto inválido.' });
      cliente.close();
      return;
    }
    if (!usuario || usuario.length > 64 || contrasena.length > 128) {
      this.enviar(cliente, { type: 'error', mensaje: 'Usuario o contraseña inválidos.' });
      cliente.close();
      return;
    }
    if (this.sesiones >= MAX_SESIONES) {
      this.enviar(cliente, { type: 'error', mensaje: `Ya hay ${MAX_SESIONES} terminales abiertas. Cierra alguna e intenta de nuevo.` });
      cliente.close();
      return;
    }

    sesion.conectando = true;
    sesion.equipo = equipo;
    sesion.destino = `${host}:${puerto}`;
    sesion.usuario = usuario;
    this.sesiones++;

    const cols = Math.min(Math.max(Number(msg.cols) || 80, 20), 500);
    const filas = Math.min(Math.max(Number(msg.rows) || 24, 5), 200);
    let huella = '';

    const ssh = new Client();
    sesion.ssh = ssh;

    ssh.on('ready', () => {
      ssh.shell({ term: 'xterm-256color', cols, rows: filas }, (error, canal) => {
        if (error) {
          this.enviar(cliente, { type: 'error', mensaje: `No se pudo abrir la consola: ${error.message}` });
          this.cerrar(cliente, sesion, origen, 'no se pudo abrir la consola', true);
          return;
        }
        sesion.canal = canal;
        sesion.conectando = false;
        void this.registrar(`CONECTADO equipo="${equipo}" destino=${sesion.destino} usuario=${usuario} origen=${origen} huella=${huella}`);
        this.enviar(cliente, { type: 'connected', huella });
        this.reiniciarInactividad(cliente, sesion, origen);

        const decodificador = new StringDecoder('utf8');
        canal.on('data', (d: Buffer) => this.enviar(cliente, { type: 'data', data: decodificador.write(d) }));
        canal.stderr.on('data', (d: Buffer) => this.enviar(cliente, { type: 'data', data: d.toString('utf8') }));
        canal.on('close', () => this.cerrar(cliente, sesion, origen, 'el equipo cerró la sesión', true));
      });
    });

    ssh.on('error', (error: Error & { level?: string }) => {
      const motivo =
        error.level === 'client-authentication'
          ? 'Usuario o contraseña incorrectos.'
          : error.level === 'client-timeout'
            ? 'El equipo no respondió a tiempo.'
            : `No se pudo conectar: ${error.message}`;
      this.enviar(cliente, { type: 'error', mensaje: motivo });
      this.cerrar(cliente, sesion, origen, `error: ${error.message}`, true);
    });

    // Algunos equipos piden la contraseña por "keyboard-interactive" en lugar de "password".
    ssh.on('keyboard-interactive', (_n, _i, _l, prompts, terminar) => terminar(prompts.map(() => contrasena)));

    try {
      ssh.connect({
        host,
        port: puerto,
        username: usuario,
        password: contrasena,
        tryKeyboard: true,
        readyTimeout: 15000,
        keepaliveInterval: 15000,
        hostHash: 'sha256',
        // No hay dónde fijar la huella del equipo, así que se acepta y se registra.
        hostVerifier: (hash: string) => {
          huella = hash;
          return true;
        },
        // Los routers y switches viejos solo hablan algoritmos antiguos: se aceptan al final de la lista,
        // para que los modernos se prefieran siempre que el equipo los tenga.
        algorithms: ALGORITMOS_ANTIGUOS,
      });
    } catch (e) {
      this.enviar(cliente, { type: 'error', mensaje: `No se pudo conectar: ${(e as Error).message}` });
      this.cerrar(cliente, sesion, origen, 'error al iniciar', true);
    }
  }

  private cerrando = new WeakSet<Sesion>();

  private cerrar(cliente: WebSocket, sesion: Sesion, origen: string, motivo: string, cerrarCliente: boolean) {
    if (this.cerrando.has(sesion)) return;
    if (!sesion.ssh) return; // nunca llegó a abrir una conexión
    this.cerrando.add(sesion);

    clearTimeout(sesion.inactividad);
    sesion.canal?.end();
    sesion.ssh.end();
    this.sesiones = Math.max(0, this.sesiones - 1);
    void this.registrar(`CERRADO equipo="${sesion.equipo}" destino=${sesion.destino} usuario=${sesion.usuario} origen=${origen} motivo="${motivo}"`);

    if (cerrarCliente) {
      this.enviar(cliente, { type: 'closed', mensaje: motivo });
      cliente.close();
    }
  }

  /** Registro de uso (backend/logs/terminal.log). Nunca incluye contraseñas ni lo que se escribe. */
  private async registrar(linea: string) {
    try {
      const dir = path.resolve(process.cwd(), 'logs');
      await mkdir(dir, { recursive: true });
      await appendFile(path.join(dir, 'terminal.log'), `${new Date().toISOString()} ${linea}\n`, 'utf8');
    } catch {
      // El registro nunca debe tumbar la terminal.
    }
  }
}
