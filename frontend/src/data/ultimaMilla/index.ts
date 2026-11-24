import cancunJson from './cancun.json'
import tulumAgenciaJson from './tulumAgencia.json'
import tulumPcnJson from './tulumPcn.json'

export interface Punto {
  lat: number
  lng: number
  torre?: string | number
}

export interface Tramo {
  id: number
  name: string
  strokeColor: string
  path: Punto[]
}

/** Línea que se dibuja en el mapa (torres de Tulum). */
export interface Linea {
  path: Punto[]
  geodesic: boolean
  strokeColor: string
  strokeOpacity: number
  strokeWeight: number
}

export interface MapaTulum {
  center: { lat: number; lng: number }
  subestaciones: Punto[]
  lineas: Linea[]
  /** Subestaciones (S.E.) que se marcan con la caseta y su nombre. */
  casetas: { nombre: string; lat: number; lng: number }[]
  zoom: number
  titulo: string
}

// Nombre y distancia de cada última milla de Cancún (el id es el número del tramo).
export const INFO_CANCUN: Record<number, { nombre: string; distancia: string }> = {
  1: { nombre: 'Milla Alestra', distancia: '1.65 KM' },
  2: { nombre: 'SCT CNC', distancia: '1.1 KM' },
  3: { nombre: 'SCT PJU', distancia: '3.8 KM' },
  4: { nombre: 'ZDD CNC', distancia: '1.3 KM' },
  5: { nombre: 'ALESTRA CNC', distancia: '2 KM' },
  6: { nombre: 'PROFECO CNC', distancia: '1 KM' },
  7: { nombre: 'SE KUKULKAN', distancia: '1.9 KM' },
  8: { nombre: 'COPPEL', distancia: '2.89 KM' },
  9: { nombre: 'ZDD R96', distancia: '5.9 KM' },
  11: { nombre: 'SCJ CNC', distancia: '1 KM' },
  29: { nombre: 'HTGCNC - SE CNC', distancia: '4 KM' },
  30: { nombre: 'SE CNC - AGE PTE', distancia: '11.86 KM' },
  36: { nombre: 'PJF - SE KUK', distancia: '2.3 KM' },
  37: { nombre: 'ZDD R96 - PJF', distancia: '2.39 KM' },
  47: { nombre: 'ALESTRA - SE CNC', distancia: '0.92 KM' },
  61: { nombre: 'ZDD R96 - AGE PTE', distancia: '5.23 KM' },
  67: { nombre: 'SCT CNC - ZDD CNC', distancia: '1.5 KM' },
  68: { nombre: 'COPPEL - SE CNC', distancia: '1.89 KM' },
}

/** Estilo de mapa "plano": sin hospitales, comercios, transporte ni rótulos de lugares; solo calles y ruta. */
export const ESTILOS_MAPA_PLANO = [
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'landscape', elementType: 'labels', stylers: [{ visibility: 'off' }] },
]

export const tramosCancun = cancunJson as Tramo[]

interface BrutoTulum {
  center: { lat: number; lng: number }
  subestaciones: Punto[]
  [linea: string]: unknown
}

function lineasDe(bruto: BrutoTulum, nombres: string[]): Linea[] {
  return nombres.map((n) => bruto[n] as Linea)
}

const agencia = tulumAgenciaJson as unknown as BrutoTulum
const pcn = tulumPcnJson as unknown as BrutoTulum

export const mapasTulum: Record<string, MapaTulum> = {
  'tulum-agencia': {
    titulo: 'S.E. TULUM → AGENCIA TULUM',
    center: agencia.center,
    zoom: 14,
    subestaciones: agencia.subestaciones,
    lineas: lineasDe(agencia, ['VadBlm']),
    casetas: [],
  },
  'tulum-pcn': {
    titulo: 'S.E. TULUM → S.E. PLAYA DEL CARMEN',
    center: pcn.center,
    zoom: 11,
    subestaciones: pcn.subestaciones,
    lineas: lineasDe(pcn, ['VadBlm', 'torres2', 'torres3']),
    casetas: [
      { nombre: 'S.E TULUM', lat: 20.259052, lng: -87.471312 },
      { nombre: 'S.E CHY', lat: 20.355993, lng: -87.37502 },
      { nombre: 'S.E AUC', lat: 20.508611, lng: -87.228948 },
      { nombre: 'S.E AKD', lat: 20.454425, lng: -87.284036 },
      { nombre: 'S.E PCN', lat: 20.630688, lng: -87.082711 },
    ],
  },
}

export const LISTA_ULTIMA_MILLA = [
  { nombre: 'S.E. TULUM → AGENCIA TULUM', ruta: '/ultima-milla/tulum-agencia' },
  { nombre: 'S.E. TULUM → S.E. PLAYA DEL CARMEN', ruta: '/ultima-milla/tulum-pcn' },
  { nombre: 'Últimas millas de Cancún', ruta: '/ultima-milla/cancun' },
]
