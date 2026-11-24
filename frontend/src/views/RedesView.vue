<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import TerminalSsh from '@/components/TerminalSsh.vue'
import { subestacionesApi } from '@/services/api'
import { TIPOS, redEjemplo, redPrueba, type DispositivoRed, type RedSubestacion, type TipoDispositivo } from '@/data/redesEjemplo'

const redes = ref<RedSubestacion[]>([])
const loading = ref(true)
const error = ref('')
const busqueda = ref('')
const abiertas = reactive(new Set<string>())

const TIPOS_LISTA = Object.keys(TIPOS) as TipoDispositivo[]

const filtradas = computed(() => {
  const q = busqueda.value.trim().toLowerCase()
  if (!q) return redes.value
  return redes.value.filter(
    (r) =>
      r.alias.toLowerCase().includes(q) ||
      r.nombre.toLowerCase().includes(q) ||
      r.segmento.includes(q) ||
      r.dispositivos.some(
        (d) =>
          d.ip.includes(q) || d.loopback1.includes(q) || d.loopback2.includes(q) || d.nombre.toLowerCase().includes(q),
      ),
  )
})

const totales = computed(() => {
  const n: Record<TipoDispositivo, number> = { router: 0, switch: 0, ap: 0 }
  for (const r of redes.value) for (const d of r.dispositivos) n[d.tipo]++
  return n
})

function cuenta(r: RedSubestacion, tipo: TipoDispositivo) {
  return r.dispositivos.filter((d) => d.tipo === tipo).length
}

// Consola SSH: se abre una terminal en la página para el equipo elegido.
const consola = ref<{ nombre: string; ip: string; usuario: string; contrasena: string } | null>(null)

function abrirConsola(d: DispositivoRed) {
  consola.value = { nombre: d.nombre, ip: d.ip, usuario: d.usuario, contrasena: d.contrasena }
}

// Las contraseñas se muestran ocultas; "Ver" la descubre solo en esa fila.
const visibles = reactive(new Set<string>())
const clave = (r: RedSubestacion, d: DispositivoRed) => `${r.alias}|${d.nombre}`

function alternarClave(r: RedSubestacion, d: DispositivoRed) {
  const k = clave(r, d)
  if (visibles.has(k)) visibles.delete(k)
  else visibles.add(k)
}

function alternar(alias: string) {
  if (abiertas.has(alias)) abiertas.delete(alias)
  else abiertas.add(alias)
}

const todasAbiertas = computed(() => filtradas.value.length > 0 && filtradas.value.every((r) => abiertas.has(r.alias)))

function alternarTodas() {
  if (todasAbiertas.value) filtradas.value.forEach((r) => abiertas.delete(r.alias))
  else filtradas.value.forEach((r) => abiertas.add(r.alias))
}

onMounted(async () => {
  try {
    const subs = await subestacionesApi.list()
    // El equipo de prueba (real) va primero; el resto sigue siendo de ejemplo.
    redes.value = [
      redPrueba,
      ...[...subs]
        .sort((a, b) => (a.nombre ?? '').localeCompare(b.nombre ?? '', 'es'))
        .map((s, i) => redEjemplo(s.alias ?? '', s.nombre ?? s.alias ?? '', i)),
    ]
    if (redes.value[0]) abiertas.add(redes.value[0].alias)
  } catch {
    error.value = 'No se pudo conectar con el backend. ¿Está corriendo en el puerto 3000?'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <main class="redes">
    <header class="barra">
      <h1>Redes por subestación</h1>
      <span class="ejemplo" title="Las direcciones son inventadas, solo para ver el diseño">Datos de ejemplo</span>
    </header>

    <p v-if="error" class="error">{{ error }}</p>
    <p v-else-if="loading" class="status">Cargando...</p>

    <template v-else>
      <section class="resumen" aria-label="Totales">
        <div class="dato">
          <strong>{{ redes.length }}</strong>
          <span>Subestaciones</span>
        </div>
        <div v-for="t in TIPOS_LISTA" :key="t" class="dato" :class="`tipo-${t}`">
          <strong>{{ totales[t] }}</strong>
          <span>{{ TIPOS[t].plural }}</span>
        </div>
      </section>

      <div class="herramientas">
        <input v-model="busqueda" type="search" placeholder="Buscar subestación, IP o equipo..." />
        <button type="button" class="enlace" @click="alternarTodas">
          {{ todasAbiertas ? 'Contraer todas' : 'Expandir todas' }}
        </button>
      </div>

      <p v-if="!filtradas.length" class="status">Sin resultados.</p>

      <ul class="lista">
        <li v-for="r in filtradas" :key="r.alias" class="tarjeta" :class="{ abierta: abiertas.has(r.alias) }">
          <button
            type="button"
            class="cabecera"
            :aria-expanded="abiertas.has(r.alias)"
            @click="alternar(r.alias)"
          >
            <span class="flecha" aria-hidden="true">›</span>
            <span class="alias">{{ r.alias }}</span>
            <span class="nombre">{{ r.nombre }}</span>
            <span class="segmento">{{ r.segmento || '—' }}</span>
            <span class="conteos">
              <span v-for="t in TIPOS_LISTA" :key="t" class="chip" :class="`tipo-${t}`" :title="TIPOS[t].plural">
                {{ cuenta(r, t) }} {{ t === 'ap' ? 'AP' : TIPOS[t].singular }}
              </span>
            </span>
          </button>

          <div v-if="abiertas.has(r.alias)" class="detalle">
            <dl class="red">
              <div>
                <dt>Segmento de red</dt>
                <dd>{{ r.segmento || '—' }}</dd>
              </div>
              <div>
                <dt>Máscara</dt>
                <dd>{{ r.mascara || '—' }}</dd>
              </div>
              <div>
                <dt>Gateway</dt>
                <dd>{{ r.gateway || '—' }}</dd>
              </div>
            </dl>

            <div class="tabla-envoltura">
              <table>
                <thead>
                  <tr>
                    <th>Tipo</th>
                    <th>Equipo</th>
                    <th>Dirección IP</th>
                    <th>Loopback 1</th>
                    <th>Loopback 2</th>
                    <th>Modelo</th>
                    <th>Usuario</th>
                    <th>Contraseña</th>
                    <th>Consola</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="d in r.dispositivos" :key="d.nombre">
                    <td>
                      <span class="chip" :class="`tipo-${d.tipo}`">{{ TIPOS[d.tipo].singular }}</span>
                    </td>
                    <td>{{ d.nombre }}</td>
                    <td class="ip">{{ d.ip }}</td>
                    <td class="ip">{{ d.loopback1 || '—' }}</td>
                    <td class="ip">{{ d.loopback2 || '—' }}</td>
                    <td class="modelo">{{ d.modelo || '—' }}</td>
                    <td class="usuario">{{ d.usuario }}</td>
                    <td class="clave">
                      <code>{{ visibles.has(clave(r, d)) ? d.contrasena : '••••••••' }}</code>
                      <button
                        type="button"
                        class="ver"
                        :aria-label="visibles.has(clave(r, d)) ? 'Ocultar contraseña' : 'Ver contraseña'"
                        @click="alternarClave(r, d)"
                      >
                        {{ visibles.has(clave(r, d)) ? 'Ocultar' : 'Ver' }}
                      </button>
                    </td>
                    <td>
                      <button type="button" class="ssh" :title="`Abrir consola SSH de ${d.nombre}`" @click="abrirConsola(d)">
                        &gt;_ SSH
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </li>
      </ul>
    </template>

    <TerminalSsh v-if="consola" :key="consola.nombre" :equipo="consola" @cerrar="consola = null" />
  </main>
</template>

<style scoped>
.redes {
  max-width: 68rem;
  margin: 0 auto;
  padding: 1.5rem;
}

.barra {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

h1 {
  font-size: 1.3rem;
  color: var(--color-heading);
}

.ejemplo {
  padding: 0.15rem 0.6rem;
  font-size: 0.72rem;
  font-weight: 700;
  color: #8a5a00;
  background: rgba(185, 119, 14, 0.15);
  border-radius: 999px;
}

.error {
  color: #c0392b;
}

.status {
  text-align: center;
  opacity: 0.7;
}

/* Totales */
.resumen {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.6rem;
  margin-bottom: 1rem;
}

.dato {
  display: flex;
  flex-direction: column;
  padding: 0.7rem 0.9rem;
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-left: 4px solid var(--cfe-green);
  border-radius: 8px;
}

.dato strong {
  font-size: 1.5rem;
  line-height: 1.1;
  color: var(--color-heading);
}

.dato span {
  font-size: 0.78rem;
  opacity: 0.7;
}

.dato.tipo-router {
  border-left-color: #1e824c;
}

.dato.tipo-switch {
  border-left-color: #2f6fb5;
}

.dato.tipo-ap {
  border-left-color: #d9822b;
}

/* Búsqueda */
.herramientas {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.herramientas input {
  flex: 1;
  max-width: 24rem;
  padding: 0.55rem 0.8rem;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-background-soft);
  color: var(--color-text);
  font-size: 0.9rem;
}

.herramientas input:focus {
  outline: 2px solid var(--cfe-green);
  outline-offset: 1px;
}

.enlace {
  margin-left: auto;
  padding: 0.3rem 0.5rem;
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--cfe-green-dark);
  background: none;
  border: 0;
  cursor: pointer;
}

.enlace:hover {
  text-decoration: underline;
}

/* Lista */
.lista {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  list-style: none;
  padding: 0;
  margin: 0;
}

.tarjeta {
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  overflow: hidden;
}

.cabecera {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  width: 100%;
  padding: 0.6rem 0.85rem;
  text-align: left;
  color: var(--color-text);
  background: none;
  border: 0;
  cursor: pointer;
}

.cabecera:hover {
  background: rgba(30, 130, 76, 0.06);
}

.flecha {
  flex-shrink: 0;
  width: 0.8rem;
  font-size: 1.2rem;
  line-height: 1;
  color: var(--cfe-green-dark);
  transition: transform 0.15s;
}

.abierta .flecha {
  transform: rotate(90deg);
}

.alias {
  flex-shrink: 0;
  min-width: 3.2rem;
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--color-heading);
}

.nombre {
  flex: 1;
  min-width: 0;
  font-size: 0.85rem;
  opacity: 0.65;
}

.segmento {
  flex-shrink: 0;
  font-family: ui-monospace, 'Cascadia Mono', Consolas, monospace;
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--color-heading);
}

.conteos {
  display: flex;
  flex-shrink: 0;
  gap: 0.25rem;
}

.chip {
  display: inline-block;
  padding: 0.1rem 0.5rem;
  font-size: 0.7rem;
  font-weight: 700;
  white-space: nowrap;
  border-radius: 999px;
}

.chip.tipo-router {
  color: #14683c;
  background: rgba(30, 130, 76, 0.15);
}

.chip.tipo-switch {
  color: #214f86;
  background: rgba(47, 111, 181, 0.15);
}

.chip.tipo-ap {
  color: #9a560d;
  background: rgba(217, 130, 43, 0.18);
}

/* Detalle */
.detalle {
  padding: 0.25rem 1rem 1rem 2.4rem;
  border-top: 1px solid var(--color-border);
}

.red {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.6rem;
  margin: 0.75rem 0;
}

.red div {
  padding: 0.5rem 0.75rem;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.red dt {
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  opacity: 0.65;
}

.red dd {
  margin: 0.1rem 0 0;
  font-family: ui-monospace, 'Cascadia Mono', Consolas, monospace;
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-heading);
}

.tabla-envoltura {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
}

th {
  padding: 0.35rem 0.6rem;
  text-align: left;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  opacity: 0.65;
  border-bottom: 1px solid var(--color-border);
}

td {
  padding: 0.4rem 0.6rem;
  border-bottom: 1px solid var(--color-border);
}

tbody tr:last-child td {
  border-bottom: 0;
}

.ip {
  font-family: ui-monospace, 'Cascadia Mono', Consolas, monospace;
  font-weight: 600;
  color: var(--color-heading);
}

.modelo {
  opacity: 0.7;
  white-space: nowrap;
}

.usuario {
  font-weight: 600;
}

.clave {
  white-space: nowrap;
}

.clave code {
  display: inline-block;
  min-width: 5.5rem;
  font-family: ui-monospace, 'Cascadia Mono', Consolas, monospace;
  font-size: 0.82rem;
}

.ver {
  margin-left: 0.3rem;
  padding: 0.1rem 0.5rem;
  font-size: 0.68rem;
  font-weight: 600;
  color: var(--cfe-green-dark);
  background: rgba(30, 130, 76, 0.12);
  border: 0;
  border-radius: 4px;
  cursor: pointer;
}

.ver:hover {
  background: rgba(30, 130, 76, 0.22);
}

td.ip {
  white-space: nowrap;
}

.ssh {
  padding: 0.2rem 0.6rem;
  font-family: ui-monospace, 'Cascadia Mono', Consolas, monospace;
  font-size: 0.74rem;
  font-weight: 700;
  white-space: nowrap;
  color: #d7e2f0;
  background: #0b1220;
  border: 0;
  border-radius: 5px;
  cursor: pointer;
}

.ssh:hover {
  background: #1b2c4d;
}

@media (max-width: 860px) {
  .conteos {
    display: none;
  }
}

@media (max-width: 600px) {
  .resumen {
    grid-template-columns: repeat(2, 1fr);
  }

  .red {
    grid-template-columns: 1fr;
  }

  .nombre {
    display: none;
  }

  .segmento {
    margin-left: auto;
  }

  .detalle {
    padding-left: 1rem;
  }
}
</style>
