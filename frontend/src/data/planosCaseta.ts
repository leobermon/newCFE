import planos from './planos.json'

export interface RackPlano {
  id: string
  x: number
  y: number
  w: number
  h: number
  href?: string
  especial?: boolean
}

export interface PlanoCaseta {
  viewBox: string
  rects: { x: number; y: number; w: number; h: number; sw: number }[]
  arcos: { d: string; transform: string; sw: number }[]
  textos: {
    size: number
    fuerte: boolean
    transform: string
    lineas: { t: string; x: number; y: number }[]
  }[]
  racks: RackPlano[]
}

// planos.json se genera a partir de los SVG de public/diagramas/subestaciones.
export const PLANOS = planos as Record<string, PlanoCaseta>
