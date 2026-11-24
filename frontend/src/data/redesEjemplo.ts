// DATOS DE EJEMPLO para ver cómo luce la pantalla de Redes. Nada de esto es real:
// las direcciones se inventan a partir del lugar de la subestación en la lista.
// Cuando haya datos reales se reemplaza redEjemplo() por una consulta a la base.

export type TipoDispositivo = 'router' | 'switch' | 'ap'

export interface DispositivoRed {
  tipo: TipoDispositivo
  nombre: string
  ip: string
  modelo: string
  /** Solo routers y switches; los APs no tienen loopback (vacío). */
  loopback1: string
  loopback2: string
  usuario: string
  contrasena: string
}

export interface RedSubestacion {
  alias: string
  nombre: string
  segmento: string
  prefijo: number
  mascara: string
  gateway: string
  dispositivos: DispositivoRed[]
}

/**
 * Equipo REAL de prueba para probar la consola SSH. Sus datos de red (segmento, máscara, gateway,
 * modelo) no se conocen todavía y se dejan vacíos. Cuando las redes pasen a la base de datos,
 * este registro (y su contraseña) debe vivir ahí y no en el código.
 */
export const redPrueba: RedSubestacion = {
  alias: 'ZTCNC',
  nombre: 'ZTCNC',
  segmento: '',
  prefijo: 0,
  mascara: '',
  gateway: '',
  dispositivos: [
    {
      tipo: 'switch',
      nombre: 'SW LABORATORIO',
      ip: '10.28.76.252',
      modelo: '',
      loopback1: '',
      loopback2: '',
      usuario: 'jmarin',
      contrasena: 'JmHZtC2016',
    },
  ],
}

export const TIPOS: Record<TipoDispositivo, { singular: string; plural: string }> = {
  router: { singular: 'Router', plural: 'Routers' },
  switch: { singular: 'Switch', plural: 'Switches' },
  ap: { singular: 'Access Point', plural: 'Access Points' },
}

/** 24 -> 255.255.255.0 */
export function mascaraDe(prefijo: number): string {
  const octetos: number[] = []
  for (let i = 0; i < 4; i++) {
    const bits = Math.max(0, Math.min(8, prefijo - i * 8))
    octetos.push(256 - 2 ** (8 - bits))
  }
  return octetos.join('.')
}

export function redEjemplo(alias: string, nombre: string, indice: number): RedSubestacion {
  const prefijo = indice % 5 === 4 ? 26 : 24
  const base = `192.168.${10 + indice}`
  const switches = 1 + (indice % 2)
  const aps = 2 + (indice % 3)

  // Credenciales y loopbacks inventados; ninguno es real.
  const loopbacks = (n: number) => ({
    loopback1: `172.16.${10 + indice}.${n}`,
    loopback2: `172.17.${10 + indice}.${n}`,
  })
  const acceso = { usuario: 'admin', contrasena: 'demo-1234' }

  const dispositivos: DispositivoRed[] = [
    { tipo: 'router', nombre: `RT ${alias}`, ip: `${base}.2`, modelo: 'Cisco ASR-903', ...loopbacks(1), ...acceso },
  ]
  for (let i = 0; i < switches; i++) {
    dispositivos.push({
      tipo: 'switch',
      nombre: `SW ${alias} 0${i + 1}`,
      ip: `${base}.${3 + i}`,
      modelo: 'Cisco Catalyst 4010',
      ...loopbacks(2 + i),
      ...acceso,
    })
  }
  for (let i = 0; i < aps; i++) {
    dispositivos.push({
      tipo: 'ap',
      nombre: `AP ${alias} 0${i + 1}`,
      ip: `${base}.${11 + i}`,
      modelo: 'Aruba AP-515',
      loopback1: '',
      loopback2: '',
      ...acceso,
    })
  }

  return {
    alias,
    nombre,
    segmento: `${base}.0/${prefijo}`,
    prefijo,
    mascara: mascaraDe(prefijo),
    gateway: `${base}.1`,
    dispositivos,
  }
}
