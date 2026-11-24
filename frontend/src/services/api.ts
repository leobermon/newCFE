import axios from 'axios'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
})

export interface Item {
  id: number
  name: string
  description: string | null
  createdAt: string
}

export const itemsApi = {
  list: () => api.get<Item[]>('/items').then((res) => res.data),
  create: (data: { name: string; description?: string }) =>
    api.post<Item>('/items', data).then((res) => res.data),
  remove: (id: number) => api.delete(`/items/${id}`),
}

export interface ContactoDirectorio {
  id: number
  nombre: string | null
  apellido: string | null
  extension: number | null
  puesto: string | null
  departamento: string | null
}

export const directorioApi = {
  list: (search?: string) =>
    api
      .get<ContactoDirectorio[]>('/directorio', { params: search ? { search } : undefined })
      .then((res) => res.data),
}

export interface EquipoR3 {
  id: number
  equipo: number | null
  denominacion: string | null
  ubicacionTecnica: string | null
  fabricante: string | null
  serie: string | null
  activoFijo: number | null
}

export const r3Api = {
  list: (search?: string) =>
    api.get<EquipoR3[]>('/r3', { params: search ? { search } : undefined }).then((res) => res.data),
}

export interface EquipoEstatus {
  id: number
  nombre: string
  ip: string
  ping: boolean
}

export interface GrupoEstatus {
  subestacion: string
  alias: string
  equipos: EquipoEstatus[]
  total: number
  pingOk: number
}

export interface EstatusEquiposResponse {
  grupos: GrupoEstatus[]
  totales: { total: number; pingOk: number }
}

export const estatusEquiposApi = {
  list: () => api.get<EstatusEquiposResponse>('/estatus-equipos').then((res) => res.data),
}

export interface Subestacion {
  id: number
  nombre: string | null
  alias: string | null
  instalaciones: number[]
}

export const subestacionesApi = {
  list: () => api.get<Subestacion[]>('/subestaciones').then((res) => res.data),
}

export interface RackDetalle {
  id: number
  etiqueta: string
  subestacion: string
  alias: string
  equipos: {
    id: number
    nombre: string
    etiquetaTablero: string
    posicionInicio: number
    posicionFin: number
    modeloId: number
    imgActive: boolean
  }[]
  archivos: { id: number; nombre: string }[]
}

export interface EquipoDetalle {
  id: number
  nombre: string
  etiquetaTablero: string
  numeroR3: number | null
  serialNumber: string | null
  gabineteId: number | null
  gabinete: string | null
  subestacion: string | null
  modeloId: number | null
  modelo: string | null
  imgActive: boolean
  tipo: string | null
  marcaId: number | null
  marca: string | null
  caracteristicas: { id: number; tipoId: number | null; nombre: string | null; valor: string }[]
  puertos: {
    id: number
    puerto: string
    origen: string | null
    destino: string | null
    servicio: string | null
    observacion: string | null
  }[]
  notas: { id: number; usuario: string; fecha: string; nota: string }[]
}

export interface EdicionEquipo {
  nombre: string
  etiquetaTablero: string
  numeroR3: number | null
  caracteristicas: { id: number | null; tipoId: number; valor: string }[]
  puertos: {
    id: number | null
    puerto: string
    origen: string
    destino: string
    servicio: string
    observacion: string
  }[]
}

export const equiposApi = {
  get: (id: string) => api.get<EquipoDetalle>(`/equipos/${id}`).then((res) => res.data),
  tiposCaracteristica: () =>
    api.get<{ id: number; nombre: string }[]>('/equipos/tipos-caracteristica').then((res) => res.data),
  guardar: (id: number, datos: EdicionEquipo) =>
    api.put<EquipoDetalle>(`/equipos/${id}`, datos).then((res) => res.data),
}

export const racksApi = {
  get: (id: string) => api.get<RackDetalle>(`/racks/${id}`).then((res) => res.data),
}

export interface CatalogoEquipo {
  modeloId: number
  modelo: string | null
  marca: string | null
  tipo: string | null
  subestaciones: number
  usos: number
  imgActive: boolean
}

export interface SubestacionGabinetes {
  id: number
  nombre: string
  alias: string
  activa: boolean
  gabinetes: { id: number; etiqueta: string; equiposRegistrados: number }[]
}

export interface EquipoBorrador {
  nombre: string
  etiquetaTablero: string
  modeloId: number
  serialNumber: string
  numeroR3: number | null
  posicion?: number
}

export interface GabineteBorrador {
  gabineteId: number
  subestacion?: string
  etiqueta?: string
  actualizado?: string
  equipos: EquipoBorrador[]
}

export interface Borrador {
  gabinetes: Record<string, GabineteBorrador>
  archivo?: string
}

export interface ResultadoAlta {
  equipos: number
  gabinetes: number
  ids: number[]
  aviso?: string
}

export const agregarEquiposApi = {
  catalogo: () => api.get<CatalogoEquipo[]>('/agregar-equipos/catalogo').then((res) => res.data),
  gabinetes: () => api.get<SubestacionGabinetes[]>('/agregar-equipos/gabinetes').then((res) => res.data),
  borrador: () => api.get<Borrador>('/agregar-equipos/borrador').then((res) => res.data),
  guardar: (borrador: Borrador) =>
    api.put<Borrador>('/agregar-equipos/borrador', borrador).then((res) => res.data),
  darDeAlta: () => api.post<ResultadoAlta>('/agregar-equipos/dar-de-alta').then((res) => res.data),
}

export const terminalApi = {
  config: () => api.get<{ requiereClave: boolean }>('/terminal/config').then((res) => res.data),
}
