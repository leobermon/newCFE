<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import {
  agregarEquiposApi,
  racksApi,
  type Borrador,
  type CatalogoEquipo,
  type RackDetalle,
  type SubestacionGabinetes,
} from '@/services/api'

/** Posición del primer equipo (el que se ve arriba); cada equipo siguiente resta 1. */
const POSICION_INICIAL = 40

interface EquipoNuevo {
  uid: number
  modeloId: number
  modelo: string
  marca: string
  tipo: string
  imgActive: boolean
  nombre: string
  etiquetaTablero: string
  serialNumber: string
  numeroR3: string
}

const catalogo = ref<CatalogoEquipo[]>([])
const subestaciones = ref<SubestacionGabinetes[]>([])
const cargando = ref(true)
const error = ref('')

// Equipos nuevos por gabinete (id del gabinete -> lista en el orden en que se ven en el rack).
const borradores = reactive<Record<number, EquipoNuevo[]>>({})
const guardadoJson = ref('')
const guardando = ref(false)
const dandoDeAlta = ref(false)
const confirmando = ref(false)
const mensaje = ref<{ tipo: 'ok' | 'error'; texto: string } | null>(null)

const subestacionId = ref<number | null>(null)
const gabineteId = ref<number | null>(null)
const registrados = ref<RackDetalle | null>(null)

const busqueda = ref('')
const tipoFiltro = ref('')
const soloComunes = ref(true)
const abierto = ref<number | null>(null)
const arrastrando = ref(false)
let contador = 0

const subestacion = computed(() => subestaciones.value.find((s) => s.id === subestacionId.value) ?? null)
const gabinetesOrdenados = computed(() =>
  [...(subestacion.value?.gabinetes ?? [])].sort((a, b) =>
    a.etiqueta.localeCompare(b.etiqueta, 'es', { numeric: true }),
  ),
)
const gabineteActual = computed(() => gabinetesOrdenados.value.find((g) => g.id === gabineteId.value) ?? null)
const lista = computed(() => (gabineteId.value ? (borradores[gabineteId.value] ??= []) : []))

const tipos = computed(() => [...new Set(catalogo.value.map((c) => c.tipo).filter((t): t is string => !!t))].sort())

const catalogoFiltrado = computed(() => {
  const q = busqueda.value.trim().toLowerCase()
  return catalogo.value.filter((c) => {
    if (soloComunes.value && c.subestaciones < 2) return false
    if (tipoFiltro.value && c.tipo !== tipoFiltro.value) return false
    if (!q) return true
    return [c.modelo, c.marca, c.tipo].some((v) => v?.toLowerCase().includes(q))
  })
})

const totalPendientes = computed(() => Object.values(borradores).reduce((n, l) => n + l.length, 0))
const gabinetesPendientes = computed(() => Object.values(borradores).filter((l) => l.length).length)

function cargaUtil(): Borrador {
  const gabinetes: Borrador['gabinetes'] = {}
  for (const [id, equipos] of Object.entries(borradores)) {
    if (!equipos.length) continue
    gabinetes[id] = {
      gabineteId: Number(id),
      equipos: equipos.map((e) => ({
        nombre: e.nombre.trim(),
        etiquetaTablero: e.etiquetaTablero.trim(),
        modeloId: e.modeloId,
        serialNumber: e.serialNumber.trim(),
        numeroR3: e.numeroR3.trim() === '' ? null : Number(e.numeroR3),
      })),
    }
  }
  return { gabinetes }
}

const sinGuardar = computed(() => JSON.stringify(cargaUtil()) !== guardadoJson.value)
const sinNombre = computed(
  () => Object.values(borradores).reduce((n, l) => n + l.filter((e) => !e.nombre.trim()).length, 0),
)

function fotoModelo(e: { modeloId: number; imgActive: boolean }) {
  return `/img/ModeloEquipo/${e.imgActive ? e.modeloId : 0}.webp`
}

function sinFoto(ev: Event) {
  const img = ev.target as HTMLImageElement
  if (!img.src.endsWith('/0.webp')) img.src = '/img/ModeloEquipo/0.webp'
}

// Del catálogo solo se toma el modelo (foto, marca, tipo). El nombre arranca con el nombre del modelo
// y el resto de los datos (etiqueta de tablero, serie, R3) se capturan vacíos para este gabinete.
function agregar(c: CatalogoEquipo) {
  if (!gabineteId.value) return
  const uid = ++contador
  lista.value.push({
    uid,
    modeloId: c.modeloId,
    modelo: c.modelo ?? '',
    marca: c.marca ?? '',
    tipo: c.tipo ?? '',
    imgActive: c.imgActive,
    nombre: c.modelo ?? '',
    etiquetaTablero: '',
    serialNumber: '',
    numeroR3: '',
  })
  abierto.value = uid
  mensaje.value = null
}

function quitar(i: number) {
  lista.value.splice(i, 1)
  abierto.value = null
}

function mover(i: number, delta: number) {
  const j = i + delta
  if (j < 0 || j >= lista.value.length) return
  const [item] = lista.value.splice(i, 1)
  lista.value.splice(j, 0, item!)
}

function alSoltar(ev: DragEvent) {
  arrastrando.value = false
  const modeloId = ev.dataTransfer?.getData('text/plain')
  const c = catalogo.value.find((x) => String(x.modeloId) === modeloId)
  if (c) agregar(c)
}

function alArrastrar(ev: DragEvent, c: CatalogoEquipo) {
  ev.dataTransfer?.setData('text/plain', String(c.modeloId))
  if (ev.dataTransfer) ev.dataTransfer.effectAllowed = 'copy'
}

function detalleError(e: unknown): string {
  const detalle = (e as { response?: { data?: { message?: string | string[] } } }).response?.data?.message
  return Array.isArray(detalle) ? detalle.join(' ') : (detalle ?? '')
}

/** Guarda el borrador (archivo). No escribe en la base de datos. */
async function guardarBorrador() {
  const carga = cargaUtil()
  await agregarEquiposApi.guardar(carga)
  guardadoJson.value = JSON.stringify(carga)
}

async function guardar() {
  guardando.value = true
  mensaje.value = null
  try {
    await guardarBorrador()
    mensaje.value = {
      tipo: 'ok',
      texto: `Borrador guardado: ${totalPendientes.value} equipo(s) en ${gabinetesPendientes.value} gabinete(s). Aún no están en la base de datos.`,
    }
  } catch (e) {
    mensaje.value = { tipo: 'error', texto: `No se pudo guardar. ${detalleError(e)}`.trim() }
  } finally {
    guardando.value = false
  }
}

/** Escribe en la base de datos todo lo pendiente (pide confirmación antes). */
async function darDeAlta() {
  confirmando.value = false
  dandoDeAlta.value = true
  mensaje.value = null
  try {
    await guardarBorrador() // primero se guarda lo último que se capturó
    const total = totalPendientes.value
    const resultado = await agregarEquiposApi.darDeAlta()

    // Lo dado de alta ya no es pendiente: se vacían los borradores y se refrescan los conteos.
    for (const id of Object.keys(borradores)) delete borradores[Number(id)]
    guardadoJson.value = JSON.stringify(cargaUtil())
    abierto.value = null
    subestaciones.value = await agregarEquiposApi.gabinetes()
    if (gabineteId.value) registrados.value = await racksApi.get(String(gabineteId.value))

    mensaje.value = {
      tipo: 'ok',
      texto: `Listo: ${resultado.equipos || total} equipo(s) en ${resultado.gabinetes} gabinete(s) ya están en la base de datos.${resultado.aviso ? ' ' + resultado.aviso : ''}`,
    }
  } catch (e) {
    mensaje.value = {
      tipo: 'error',
      texto: `No se dio de alta nada. ${detalleError(e) || 'Revisa que el backend esté corriendo.'}`.trim(),
    }
  } finally {
    dandoDeAlta.value = false
  }
}

// Al cambiar de subestación se elige su primer gabinete.
watch(subestacionId, () => {
  gabineteId.value = gabinetesOrdenados.value[0]?.id ?? null
})

// Al cambiar de gabinete se muestran los equipos que ya tiene registrados (solo lectura).
watch(gabineteId, async (id) => {
  abierto.value = null
  registrados.value = null
  if (!id) return
  try {
    const rack = await racksApi.get(String(id))
    if (gabineteId.value === id) registrados.value = rack
  } catch {
    registrados.value = null
  }
})

function avisarSiHayCambios(ev: BeforeUnloadEvent) {
  if (!sinGuardar.value) return
  ev.preventDefault()
}

onMounted(async () => {
  window.addEventListener('beforeunload', avisarSiHayCambios)
  try {
    const [cat, subs, borrador] = await Promise.all([
      agregarEquiposApi.catalogo(),
      agregarEquiposApi.gabinetes(),
      agregarEquiposApi.borrador(),
    ])
    catalogo.value = cat
    subestaciones.value = subs

    for (const g of Object.values(borrador.gabinetes ?? {})) {
      borradores[g.gabineteId] = g.equipos.map((e) => {
        const c = cat.find((x) => x.modeloId === e.modeloId)
        return {
          uid: ++contador,
          modeloId: e.modeloId,
          modelo: c?.modelo ?? '',
          marca: c?.marca ?? '',
          tipo: c?.tipo ?? '',
          imgActive: c?.imgActive ?? false,
          nombre: e.nombre,
          etiquetaTablero: e.etiquetaTablero,
          serialNumber: e.serialNumber,
          numeroR3: e.numeroR3 === null ? '' : String(e.numeroR3),
        }
      })
    }
    guardadoJson.value = JSON.stringify(cargaUtil())

    subestacionId.value = (subs.find((s) => s.alias === 'KNT') ?? subs[0])?.id ?? null
  } catch {
    error.value = 'No se pudo conectar con el backend. ¿Está corriendo en el puerto 3000?'
  } finally {
    cargando.value = false
  }
})

onBeforeUnmount(() => window.removeEventListener('beforeunload', avisarSiHayCambios))
</script>

<template>
  <main class="agregar">
    <header class="barra">
      <h1>Agregar equipos</h1>
      <div class="guardar">
        <span v-if="sinNombre" class="pendiente">Falta el nombre en {{ sinNombre }} equipo(s)</span>
        <span v-else-if="sinGuardar" class="pendiente">Cambios sin guardar</span>
        <button
          class="boton-borrador"
          :disabled="guardando || dandoDeAlta || !sinGuardar || sinNombre > 0"
          @click="guardar"
        >
          {{ guardando ? 'Guardando...' : 'Guardar borrador' }}
        </button>
        <button
          class="boton-guardar"
          :disabled="guardando || dandoDeAlta || !totalPendientes || sinNombre > 0"
          @click="confirmando = true"
        >
          {{ dandoDeAlta ? 'Guardando en la base...' : 'Guardar en la base de datos' }}
        </button>
      </div>
    </header>

    <div v-if="confirmando" class="confirmar" role="alertdialog">
      <p>
        Se van a escribir <strong>{{ totalPendientes }} equipo(s)</strong> en
        <strong>{{ gabinetesPendientes }} gabinete(s)</strong> en la base de datos. Antes se hace un respaldo de la tabla.
      </p>
      <div class="confirmar-botones">
        <button class="boton-guardar" @click="darDeAlta">Sí, guardar en la base</button>
        <button class="boton-borrador" @click="confirmando = false">Cancelar</button>
      </div>
    </div>

    <p v-if="mensaje" :class="['mensaje', mensaje.tipo]" role="status">{{ mensaje.texto }}</p>
    <p v-if="error" class="mensaje error">{{ error }}</p>
    <p v-else-if="cargando" class="status">Cargando...</p>

    <div v-else class="cuerpo">
      <!-- Catálogo de equipos disponibles -->
      <section class="panel catalogo">
        <h2>Equipos disponibles</h2>
        <div class="filtros">
          <input v-model="busqueda" type="search" placeholder="Buscar equipo, marca o modelo..." />
          <select v-model="tipoFiltro" aria-label="Tipo de equipo">
            <option value="">Todos los tipos</option>
            <option v-for="t in tipos" :key="t" :value="t">{{ t }}</option>
          </select>
          <label class="comunes">
            <input v-model="soloComunes" type="checkbox" />
            Solo los modelos más usados (en 2 o más subestaciones)
          </label>
        </div>

        <p class="ayuda">Haz clic en un equipo, o arrástralo al gabinete, para agregarlo.</p>
        <p v-if="!catalogoFiltrado.length" class="status">Sin resultados.</p>
        <ul class="tarjetas">
          <li v-for="c in catalogoFiltrado" :key="c.modeloId">
            <button
              type="button"
              class="tarjeta"
              :disabled="!gabineteId"
              draggable="true"
              @click="agregar(c)"
              @dragstart="alArrastrar($event, c)"
            >
              <img :src="fotoModelo(c)" :alt="c.modelo ?? ''" loading="lazy" @error="sinFoto" />
              <span class="t-nombre">{{ c.modelo }}</span>
              <span class="t-detalle">{{ c.marca }}</span>
              <span class="t-etiqueta">{{ c.tipo }}</span>
              <span class="t-subs">
                {{ c.subestaciones ? `${c.subestaciones} subestaci${c.subestaciones === 1 ? 'ón' : 'ones'}` : 'Sin uso aún' }}
              </span>
            </button>
          </li>
        </ul>
      </section>

      <!-- Gabinete que se está armando -->
      <section class="panel gabinete">
        <div class="selectores">
          <label>
            Subestación
            <select v-model="subestacionId">
              <option v-for="s in subestaciones" :key="s.id" :value="s.id">
                {{ s.nombre }}{{ s.activa ? '' : ' (oculta)' }}
              </option>
            </select>
          </label>
          <label>
            Gabinete
            <select v-model="gabineteId">
              <option v-for="g in gabinetesOrdenados" :key="g.id" :value="g.id">
                {{ g.etiqueta }}{{ borradores[g.id]?.length ? ` · ${borradores[g.id]!.length} nuevo(s)` : ''
                }}{{ g.equiposRegistrados ? ` · ${g.equiposRegistrados} registrado(s)` : '' }}
              </option>
            </select>
          </label>
        </div>

        <div v-if="gabineteActual" class="rack-cabecera">
          <span class="rack-sub">{{ subestacion?.alias }}</span>
          <span class="rack-etiqueta">{{ gabineteActual.etiqueta }}</span>
        </div>

        <div
          class="rack-fondo"
          :class="{ soltar: arrastrando }"
          @dragover.prevent="arrastrando = true"
          @dragleave="arrastrando = false"
          @drop.prevent="alSoltar"
        >
          <p v-if="!lista.length" class="status vacio">
            Este gabinete aún no tiene equipos nuevos.<br />Elige equipos del catálogo.
          </p>

          <ol v-else class="equipos">
            <li v-for="(e, i) in lista" :key="e.uid" class="equipo">
              <div class="fila">
                <span class="pos" title="Posición en el rack: el de arriba se ve primero">
                  {{ POSICION_INICIAL - i }}
                </span>
                <img :src="fotoModelo(e)" :alt="e.nombre" @error="sinFoto" />
                <button type="button" class="info" @click="abierto = abierto === e.uid ? null : e.uid">
                  <strong>{{ e.nombre }}</strong>
                  <small>{{ [e.etiquetaTablero, e.marca, e.modelo].filter(Boolean).join(' · ') }}</small>
                </button>
                <div class="acciones">
                  <button type="button" :disabled="i === 0" title="Subir" @click="mover(i, -1)">▲</button>
                  <button type="button" :disabled="i === lista.length - 1" title="Bajar" @click="mover(i, 1)">▼</button>
                  <button type="button" class="quitar" title="Quitar" @click="quitar(i)">✕</button>
                </div>
              </div>

              <div v-if="abierto === e.uid" class="detalle">
                <label>Nombre<input v-model="e.nombre" maxlength="100" placeholder="Nombre del equipo" /></label>
                <label>
                  Etiqueta de tablero<input v-model="e.etiquetaTablero" maxlength="100" placeholder="Ej. ODF TIN-NIZ" />
                </label>
                <label>Número de serie (máx. 20)<input v-model="e.serialNumber" maxlength="20" /></label>
                <label>Número R3<input v-model="e.numeroR3" inputmode="numeric" /></label>
              </div>
            </li>
          </ol>
        </div>

        <div v-if="registrados?.equipos.length" class="registrados">
          <h3>Ya registrados en este gabinete</h3>
          <ul>
            <li v-for="r in registrados.equipos" :key="r.id">
              <img :src="fotoModelo(r)" :alt="r.nombre" @error="sinFoto" />
              <span>{{ r.nombre }}</span>
              <small>{{ r.etiquetaTablero }}</small>
            </li>
          </ul>
        </div>

        <p class="nota">
          La posición solo define el orden en que se ven los equipos: el primero que agregas queda arriba
          ({{ POSICION_INICIAL }}) y cada siguiente resta 1. Si el gabinete ya tenía equipos, los nuevos van
          debajo de ellos. "Guardar borrador" no toca la base de datos; "Guardar en la base de datos" sí.
        </p>
      </section>
    </div>
  </main>
</template>

<style scoped>
.agregar {
  max-width: 78rem;
  margin: 0 auto;
  padding: 1rem 1.5rem 2rem;
}

.barra {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.75rem;
}

h1 {
  font-size: 1.3rem;
  color: var(--color-heading);
}

h2 {
  font-size: 1rem;
  margin-bottom: 0.6rem;
  color: var(--color-heading);
}

.guardar {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.pendiente {
  font-size: 0.8rem;
  color: #b9770e;
  font-weight: 600;
}

.boton-guardar {
  padding: 0.5rem 1.4rem;
  font-weight: 700;
  color: #fff;
  background: var(--cfe-green);
  border: 0;
  border-radius: 8px;
  cursor: pointer;
}

.boton-guardar:hover:not(:disabled) {
  background: var(--cfe-green-dark);
}

.boton-guardar:disabled,
.boton-borrador:disabled {
  opacity: 0.45;
  cursor: default;
}

.boton-borrador {
  padding: 0.5rem 1rem;
  font-weight: 600;
  color: var(--color-text);
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  cursor: pointer;
}

.boton-borrador:hover:not(:disabled) {
  background: var(--color-background-mute, #ececec);
}

.confirmar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  margin-bottom: 0.75rem;
  background: rgba(185, 119, 14, 0.12);
  border: 1px solid rgba(185, 119, 14, 0.5);
  border-radius: 8px;
  font-size: 0.9rem;
}

.confirmar p {
  margin: 0;
}

.confirmar-botones {
  display: flex;
  gap: 0.5rem;
}

.mensaje {
  padding: 0.6rem 0.9rem;
  margin-bottom: 0.75rem;
  border-radius: 8px;
  font-size: 0.9rem;
}

.mensaje.ok {
  background: rgba(30, 130, 76, 0.14);
  color: var(--cfe-green-dark);
}

.mensaje.error {
  background: rgba(192, 57, 43, 0.12);
  color: #c0392b;
}

.status {
  text-align: center;
  opacity: 0.7;
}

.cuerpo {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr);
  gap: 1rem;
  align-items: start;
}

.panel {
  padding: 1rem;
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: 10px;
}

.gabinete {
  position: sticky;
  top: 0.75rem;
  max-height: calc(100vh - 1.5rem);
  overflow-y: auto;
}

/* Catálogo */
.filtros {
  display: grid;
  grid-template-columns: 1fr 12rem;
  gap: 0.5rem;
}

.filtros input[type='search'],
.filtros select,
.selectores select,
.detalle input {
  padding: 0.5rem 0.65rem;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-background);
  color: var(--color-text);
  font-size: 0.9rem;
}

.comunes {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.82rem;
}

.ayuda {
  margin: 0.6rem 0;
  font-size: 0.8rem;
  opacity: 0.7;
}

.tarjetas {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(9.5rem, 1fr));
  gap: 0.5rem;
  list-style: none;
  padding: 0;
  margin: 0;
}

.tarjeta {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0.15rem;
  width: 100%;
  height: 100%;
  padding: 0.5rem;
  text-align: left;
  color: var(--color-text);
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  cursor: pointer;
}

.tarjeta:hover:not(:disabled) {
  border-color: var(--cfe-green);
  background: rgba(30, 130, 76, 0.07);
}

.tarjeta img {
  align-self: center;
  width: 100%;
  height: 4.2rem;
  object-fit: contain;
}

.t-nombre {
  font-size: 0.8rem;
  font-weight: 700;
  line-height: 1.15;
}

.t-detalle,
.t-etiqueta {
  font-size: 0.7rem;
  opacity: 0.7;
}

.t-subs {
  margin-top: auto;
  font-size: 0.66rem;
  font-weight: 600;
  color: var(--cfe-green-dark);
}

/* Gabinete */
.selectores {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.6rem;
  margin-bottom: 0.75rem;
}

.selectores label {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  font-size: 0.75rem;
  font-weight: 600;
}

.rack-cabecera {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding: 0.7rem 1rem;
  background: #949494;
  border-radius: 10px 10px 0 0;
  color: #1f1f1f;
}

.rack-sub {
  font-size: 1.1rem;
}

.rack-etiqueta {
  font-size: 1.5rem;
  font-weight: 700;
}

.rack-fondo {
  min-height: 9rem;
  padding: 0.6rem;
  background: #d8d8d8;
  border-radius: 0 0 10px 10px;
  transition: background 0.15s;
}

.rack-fondo.soltar {
  background: #bfe3cf;
  outline: 2px dashed var(--cfe-green);
}

.vacio {
  padding: 2rem 0;
  color: #333;
}

.equipos {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  list-style: none;
  padding: 0;
  margin: 0;
}

.equipo {
  background: #fff;
  border-radius: 8px;
  color: #222;
}

.fila {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.35rem 0.5rem;
}

.pos {
  flex-shrink: 0;
  width: 1.7rem;
  font-size: 0.8rem;
  font-weight: 700;
  text-align: center;
  color: #666;
}

.fila img {
  flex-shrink: 0;
  width: 4.5rem;
  height: 2.2rem;
  object-fit: contain;
}

.info {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  padding: 0;
  text-align: left;
  color: inherit;
  background: none;
  border: 0;
  cursor: pointer;
}

.info strong {
  font-size: 0.85rem;
}

.info small {
  font-size: 0.7rem;
  opacity: 0.7;
}

.acciones {
  display: flex;
  gap: 0.2rem;
}

.acciones button {
  width: 1.7rem;
  height: 1.7rem;
  font-size: 0.7rem;
  color: #444;
  background: #eee;
  border: 0;
  border-radius: 6px;
  cursor: pointer;
}

.acciones button:hover:not(:disabled) {
  background: #ddd;
}

.acciones button:disabled {
  opacity: 0.35;
  cursor: default;
}

.acciones .quitar:hover {
  color: #c0392b;
}

.detalle {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
  padding: 0.5rem 0.6rem 0.7rem;
  border-top: 1px solid #e5e5e5;
}

.detalle label {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  font-size: 0.72rem;
  font-weight: 600;
}

.registrados {
  margin-top: 0.9rem;
}

.registrados h3 {
  margin-bottom: 0.3rem;
  font-size: 0.85rem;
}

.registrados ul {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.registrados li {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
  opacity: 0.8;
}

.registrados img {
  width: 3.5rem;
  height: 1.6rem;
  object-fit: contain;
}

.nota {
  margin-top: 0.9rem;
  font-size: 0.75rem;
  opacity: 0.65;
}

@media (max-width: 960px) {
  .cuerpo {
    grid-template-columns: 1fr;
  }

  .gabinete {
    position: static;
    max-height: none;
  }
}
</style>
