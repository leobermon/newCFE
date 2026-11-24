<script setup lang="ts">
import { computed, reactive, ref, watchEffect } from 'vue'
import { onBeforeRouteLeave, useRoute } from 'vue-router'
import { equiposApi, type EdicionEquipo, type EquipoDetalle } from '@/services/api'

const route = useRoute()
const equipo = ref<EquipoDetalle | null>(null)
const error = ref('')
const visibles = ref(new Set<number>())

// ---------- Edición ----------
const editando = ref(false)
const guardando = ref(false)
const errorGuardar = ref('')
const tipos = ref<{ id: number; nombre: string }[]>([])
const edicion = reactive<EdicionEquipo>({
  nombre: '',
  etiquetaTablero: '',
  numeroR3: null,
  caracteristicas: [],
  puertos: [],
})
let original = ''

async function empezarEdicion() {
  const e = equipo.value
  if (!e) return
  errorGuardar.value = ''
  edicion.nombre = e.nombre ?? ''
  edicion.etiquetaTablero = e.etiquetaTablero ?? ''
  edicion.numeroR3 = e.numeroR3
  edicion.caracteristicas = e.caracteristicas.map((c) => ({ id: c.id, tipoId: c.tipoId ?? 0, valor: c.valor ?? '' }))
  edicion.puertos = e.puertos.map((p) => ({
    id: p.id,
    puerto: p.puerto ?? '',
    origen: p.origen ?? '',
    destino: p.destino ?? '',
    servicio: p.servicio ?? '',
    observacion: p.observacion ?? '',
  }))
  original = JSON.stringify(edicion)
  editando.value = true
  if (!tipos.value.length) {
    try {
      tipos.value = await equiposApi.tiposCaracteristica()
    } catch {
      errorGuardar.value = 'No se pudo cargar la lista de características.'
    }
  }
}

const hayCambios = computed(() => editando.value && JSON.stringify(edicion) !== original)

function cancelarEdicion() {
  if (hayCambios.value && !window.confirm('Hay cambios sin guardar. ¿Descartarlos?')) return
  editando.value = false
}

function agregarCaracteristica(nombre?: string) {
  const tipo = nombre ? tipos.value.find((t) => t.nombre === nombre) : undefined
  edicion.caracteristicas.push({ id: null, tipoId: tipo?.id ?? tipos.value[0]?.id ?? 0, valor: '' })
}

function agregarPuerto() {
  edicion.puertos.push({ id: null, puerto: '', origen: '', destino: '', servicio: '', observacion: '' })
}

function mensajeDe(e: unknown) {
  const m = (e as { response?: { data?: { message?: string | string[] } } }).response?.data?.message
  return (Array.isArray(m) ? m.join(' ') : m) ?? 'No se pudo guardar. ¿Está corriendo el backend?'
}

async function guardar() {
  const e = equipo.value
  if (!e || guardando.value) return
  errorGuardar.value = ''
  if (!edicion.nombre.trim()) {
    errorGuardar.value = 'El nombre no puede quedar vacío.'
    return
  }
  guardando.value = true
  try {
    equipo.value = await equiposApi.guardar(e.id, {
      ...edicion,
      numeroR3: edicion.numeroR3 === null || String(edicion.numeroR3) === '' ? null : Number(edicion.numeroR3),
      caracteristicas: edicion.caracteristicas.filter((c) => c.valor.trim() !== '' || c.id !== null),
      puertos: edicion.puertos.filter((p) => p.puerto.trim() !== '' || p.id !== null),
    })
    editando.value = false
    visibles.value = new Set()
  } catch (err) {
    errorGuardar.value = mensajeDe(err)
  } finally {
    guardando.value = false
  }
}

onBeforeRouteLeave(() => {
  if (hayCambios.value) return window.confirm('Hay cambios sin guardar. ¿Salir sin guardar?')
})

watchEffect(async () => {
  error.value = ''
  equipo.value = null
  editando.value = false
  visibles.value = new Set()
  try {
    equipo.value = await equiposApi.get(String(route.params.id))
  } catch {
    error.value = 'No se encontró el equipo.'
  }
})

const identificacion = computed(() => {
  const e = equipo.value
  if (!e) return []
  return [
    { etiqueta: 'ID equipo', valor: e.id },
    { etiqueta: 'Nombre', valor: e.nombre },
    { etiqueta: 'Marca', valor: e.marca },
    { etiqueta: 'Modelo', valor: e.modelo },
    { etiqueta: 'R3', valor: e.numeroR3 },
    { etiqueta: 'N. de serie', valor: e.serialNumber },
  ].filter((d) => d.valor !== null && d.valor !== '')
})

const esSecreto = (nombre: string | null) => /pass|contrase/i.test(nombre ?? '')

function alternar(i: number) {
  const s = new Set(visibles.value)
  if (!s.delete(i)) s.add(i)
  visibles.value = s
}

function fotoModelo(e: EquipoDetalle) {
  return `/img/ModeloEquipo/${e.imgActive && e.modeloId ? e.modeloId : 0}.webp`
}

function sinFoto(ev: Event) {
  const img = ev.target as HTMLImageElement
  if (!img.src.endsWith('/0.webp')) img.src = '/img/ModeloEquipo/0.webp'
}

function ocultar(ev: Event) {
  ;(ev.target as HTMLImageElement).style.display = 'none'
}
</script>

<template>
  <main class="equipo">
    <p v-if="error" class="mensaje error">{{ error }}</p>
    <p v-else-if="!equipo" class="mensaje">Cargando...</p>

    <template v-else>
      <!-- Ruta de ubicación -->
      <nav class="ruta-ubicacion">
        <span v-if="equipo.subestacion">{{ equipo.subestacion }}</span>
        <template v-if="equipo.gabinete && equipo.gabineteId">
          <span class="sep">/</span>
          <RouterLink :to="{ name: 'rack', params: { id: equipo.gabineteId } }">
            Gabinete {{ equipo.gabinete }}
          </RouterLink>
        </template>
      </nav>

      <header class="titulo">
        <div>
          <h1>{{ equipo.etiquetaTablero || equipo.nombre }}</h1>
          <p v-if="equipo.modelo" class="modelo">
            {{ equipo.marca }} <span v-if="equipo.marca">·</span> {{ equipo.modelo }}
          </p>
        </div>
        <div class="acciones">
          <span v-if="equipo.tipo" class="tipo">{{ equipo.tipo }}</span>
          <button v-if="!editando" type="button" class="btn editar" @click="empezarEdicion">✎ Editar</button>
          <template v-else>
            <button type="button" class="btn guardar" :disabled="guardando || !hayCambios" @click="guardar">
              {{ guardando ? 'Guardando...' : 'Guardar cambios' }}
            </button>
            <button type="button" class="btn" :disabled="guardando" @click="cancelarEdicion">Cancelar</button>
          </template>
        </div>
      </header>
      <p v-if="errorGuardar" class="mensaje error" role="alert">{{ errorGuardar }}</p>

      <div class="ficha">
        <!-- Columna de foto -->
        <aside class="lateral">
          <div class="foto">
            <img :src="fotoModelo(equipo)" :alt="equipo.nombre" @error="sinFoto" />
          </div>
          <img
            v-if="equipo.marcaId"
            :src="`/img/Marcas/${equipo.marcaId}.png`"
            :alt="equipo.marca ?? ''"
            class="marca"
            @error="ocultar"
          />
        </aside>

        <!-- Columna de datos -->
        <div class="datos">
          <section>
            <h2>Identificación</h2>
            <dl class="filas">
              <template v-if="!editando">
                <div v-for="d in identificacion" :key="d.etiqueta" class="fila">
                  <dt>{{ d.etiqueta }}</dt>
                  <dd>{{ d.valor }}</dd>
                </div>
              </template>
              <template v-else>
                <div class="fila">
                  <dt>Nombre</dt>
                  <dd><input v-model="edicion.nombre" maxlength="100" class="campo" /></dd>
                </div>
                <div class="fila">
                  <dt>Etiqueta de tablero</dt>
                  <dd><input v-model="edicion.etiquetaTablero" maxlength="100" class="campo" /></dd>
                </div>
                <div class="fila">
                  <dt>R3</dt>
                  <dd><input v-model="edicion.numeroR3" inputmode="numeric" class="campo" /></dd>
                </div>
                <div v-for="d in identificacion.filter((x) => ['Marca', 'Modelo', 'N. de serie', 'ID equipo'].includes(x.etiqueta))" :key="d.etiqueta" class="fila fija">
                  <dt>{{ d.etiqueta }}</dt>
                  <dd>{{ d.valor }}</dd>
                </div>
              </template>
            </dl>
          </section>

          <section v-if="equipo.caracteristicas.length || editando">
            <h2>Características</h2>
            <dl v-if="!editando" class="filas">
              <div v-for="(c, i) in equipo.caracteristicas" :key="i" class="fila">
                <dt>{{ c.nombre }}</dt>
                <dd v-if="esSecreto(c.nombre)">
                  <span class="mono">{{ visibles.has(i) ? c.valor : '••••••••' }}</span>
                  <button type="button" class="ver" @click="alternar(i)">
                    {{ visibles.has(i) ? 'ocultar' : 'mostrar' }}
                  </button>
                </dd>
                <dd v-else>{{ c.valor }}</dd>
              </div>
            </dl>
            <div v-else class="editor">
              <div v-for="(c, i) in edicion.caracteristicas" :key="c.id ?? `n${i}`" class="fila-edicion">
                <select v-model.number="c.tipoId" class="campo" aria-label="Tipo de característica">
                  <option v-for="t in tipos" :key="t.id" :value="t.id">{{ t.nombre }}</option>
                </select>
                <input v-model="c.valor" class="campo" :class="{ mono: true }" aria-label="Valor" />
                <button type="button" class="quitar" title="Quitar" @click="edicion.caracteristicas.splice(i, 1)">✕</button>
              </div>
              <div class="agregar">
                <button type="button" class="btn" @click="agregarCaracteristica('DIRECCION IP')">+ Dirección IP</button>
                <button type="button" class="btn" @click="agregarCaracteristica()">+ Otra característica</button>
              </div>
            </div>
          </section>

          <section v-if="equipo.puertos.length && !editando">
            <h2>Puertos y servicios</h2>
            <table class="puertos">
              <thead>
                <tr>
                  <th>Pto.</th>
                  <th>Origen</th>
                  <th>Destino</th>
                  <th>Servicio</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="p in equipo.puertos" :key="p.id">
                  <td class="pto">{{ p.puerto }}</td>
                  <td>{{ p.origen }}</td>
                  <td>{{ p.destino }}</td>
                  <td>
                    {{ p.servicio }}
                    <small v-if="p.observacion">{{ p.observacion }}</small>
                  </td>
                </tr>
              </tbody>
            </table>
          </section>

          <section v-if="editando">
            <h2>Puertos y servicios</h2>
            <div class="editor">
              <div v-for="(p, i) in edicion.puertos" :key="p.id ?? `n${i}`" class="puerto-edicion">
                <input v-model="p.puerto" class="campo corto" maxlength="20" placeholder="Pto." aria-label="Puerto" />
                <input v-model="p.origen" class="campo" maxlength="250" placeholder="Origen" aria-label="Origen" />
                <input v-model="p.destino" class="campo" maxlength="250" placeholder="Destino" aria-label="Destino" />
                <input v-model="p.servicio" class="campo" maxlength="250" placeholder="Servicio" aria-label="Servicio" />
                <button type="button" class="quitar" title="Quitar puerto" @click="edicion.puertos.splice(i, 1)">✕</button>
                <input v-model="p.observacion" class="campo obs" placeholder="Observación" aria-label="Observación" />
              </div>
              <div class="agregar">
                <button type="button" class="btn" @click="agregarPuerto">+ Agregar puerto</button>
              </div>
            </div>
          </section>

          <section v-if="equipo.notas.length">
            <h2>Notas</h2>
            <blockquote v-for="n in equipo.notas" :key="n.id" class="nota">
              <p>{{ n.nota }}</p>
              <footer>{{ n.usuario }} · {{ n.fecha?.slice(0, 10) }}</footer>
            </blockquote>
          </section>
        </div>
      </div>
    </template>
  </main>
</template>

<style scoped>
.equipo {
  max-width: 62rem;
  margin: 0 auto;
  padding: 1.25rem 1.5rem 3rem;
}

.mensaje {
  text-align: center;
  opacity: 0.7;
}

.error {
  color: #c0392b;
  opacity: 1;
}

/* ---------- Ubicación y título ---------- */
.ruta-ubicacion {
  display: flex;
  gap: 0.4rem;
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #6b7280;
}

.ruta-ubicacion a {
  color: var(--cfe-green);
  text-decoration: none;
}

.ruta-ubicacion a:hover {
  text-decoration: underline;
}

.sep {
  opacity: 0.5;
}

.titulo {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.5rem 0 1.1rem;
  margin-bottom: 1.5rem;
  border-bottom: 2px solid var(--color-heading);
}

h1 {
  font-size: 2rem;
  font-weight: 800;
  line-height: 1.1;
  letter-spacing: -0.02em;
  color: var(--color-heading);
  overflow-wrap: anywhere;
}

.modelo {
  margin-top: 0.3rem;
  font-size: 1rem;
  color: #6b7280;
}

.tipo {
  flex-shrink: 0;
  margin-top: 0.4rem;
  padding: 0.25rem 0.7rem;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--cfe-green-dark);
  border: 1.5px solid var(--cfe-green);
  border-radius: 4px;
}

/* ---------- Ficha ---------- */
.ficha {
  display: grid;
  grid-template-columns: 17rem minmax(0, 1fr);
  gap: 2.5rem;
  align-items: start;
}

.lateral {
  position: sticky;
  top: 1rem;
}

.foto {
  display: grid;
  place-items: center;
  padding: 1rem;
  background: #fff;
  border: 1px solid var(--color-border-hover);
}

.foto img {
  max-width: 100%;
  max-height: 14rem;
  object-fit: contain;
}

.marca {
  display: block;
  max-width: 6rem;
  max-height: 2.5rem;
  margin-top: 0.9rem;
  object-fit: contain;
}

.datos {
  display: flex;
  flex-direction: column;
  gap: 1.75rem;
}

h2 {
  margin-bottom: 0.2rem;
  padding-bottom: 0.35rem;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--cfe-green-dark);
  border-bottom: 1px solid var(--color-border-hover);
}

/* Filas etiqueta / valor */
.filas {
  margin: 0;
}

.fila {
  display: grid;
  grid-template-columns: 11rem minmax(0, 1fr);
  gap: 1rem;
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--color-border);
}

dt {
  font-size: 0.85rem;
  color: #6b7280;
}

dd {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--color-heading);
  overflow-wrap: anywhere;
}

.mono {
  font-family: ui-monospace, 'Cascadia Mono', Consolas, monospace;
  font-weight: 500;
}

.ver {
  margin-left: 0.6rem;
  padding: 0;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--cfe-green);
  background: none;
  border: 0;
  cursor: pointer;
}

.ver:hover {
  text-decoration: underline;
}

/* ---------- Puertos ---------- */
.puertos {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.88rem;
}

.puertos th {
  padding: 0.5rem 0.5rem 0.4rem 0;
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-align: left;
  text-transform: uppercase;
  color: #6b7280;
  border-bottom: 1px solid var(--color-border-hover);
}

.puertos td {
  padding: 0.55rem 0.5rem 0.55rem 0;
  vertical-align: top;
  border-bottom: 1px solid var(--color-border);
}

.pto {
  width: 2.5rem;
  font-weight: 700;
  color: var(--cfe-green-dark);
}

.puertos small {
  display: block;
  font-size: 0.75rem;
  color: #6b7280;
}

/* ---------- Notas ---------- */
.nota {
  margin: 0.6rem 0 0;
  padding: 0.1rem 0 0.1rem 0.9rem;
  border-left: 3px solid var(--cfe-green);
}

.nota p {
  font-size: 0.92rem;
  white-space: pre-line;
}

.nota footer {
  margin-top: 0.2rem;
  font-size: 0.75rem;
  color: #6b7280;
}

/* ---------- Edición ---------- */
.acciones {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 0.5rem;
}

.acciones .tipo {
  margin-top: 0;
}

.btn {
  padding: 0.4rem 0.9rem;
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--color-text);
  background: var(--color-background-soft);
  border: 1px solid var(--color-border-hover);
  border-radius: 8px;
  cursor: pointer;
}

.btn:hover:not(:disabled) {
  border-color: var(--cfe-green);
}

.btn:disabled {
  opacity: 0.5;
  cursor: default;
}

.btn.guardar {
  color: #fff;
  background: var(--cfe-green);
  border-color: var(--cfe-green);
}

.campo {
  width: 100%;
  padding: 0.4rem 0.55rem;
  font-size: 0.9rem;
  color: var(--color-text);
  background: var(--color-background-soft);
  border: 1px solid var(--color-border-hover);
  border-radius: 6px;
}

.campo:focus {
  outline: 2px solid var(--cfe-green);
  outline-offset: 1px;
}

.fila.fija {
  opacity: 0.65;
}

.editor {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding-top: 0.5rem;
}

.fila-edicion {
  display: grid;
  grid-template-columns: 13rem minmax(0, 1fr) auto;
  gap: 0.5rem;
}

.puerto-edicion {
  display: grid;
  grid-template-columns: 4.5rem repeat(3, minmax(0, 1fr)) auto;
  gap: 0.4rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--color-border);
}

.puerto-edicion .obs {
  grid-column: 1 / -1;
}

.quitar {
  width: 2rem;
  color: #c0392b;
  background: none;
  border: 0;
  border-radius: 6px;
  cursor: pointer;
}

.quitar:hover {
  background: rgba(192, 57, 43, 0.12);
}

.agregar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

/* ---------- Móvil ---------- */
@media (max-width: 720px) {
  .equipo {
    padding: 1rem 1rem 2.5rem;
  }

  h1 {
    font-size: 1.5rem;
  }

  .titulo {
    flex-direction: column;
    gap: 0.5rem;
  }

  .ficha {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }

  .lateral {
    position: static;
  }

  .fila {
    grid-template-columns: 7.5rem minmax(0, 1fr);
    gap: 0.75rem;
  }

  .fila-edicion {
    grid-template-columns: 1fr auto;
  }

  .fila-edicion select {
    grid-column: 1 / -1;
  }

  .puerto-edicion {
    grid-template-columns: 4.5rem 1fr auto;
  }

  .puerto-edicion input:not(.corto):not(.obs) {
    grid-column: 1 / -1;
  }

  .puertos th:nth-child(2),
  .puertos td:nth-child(2) {
    display: none;
  }
}
</style>
