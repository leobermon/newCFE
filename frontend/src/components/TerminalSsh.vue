<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { terminalApi } from '@/services/api'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'

const props = defineProps<{
  equipo: { nombre: string; ip: string; usuario: string; contrasena: string }
}>()
const emit = defineEmits<{ cerrar: [] }>()

type Estado = 'formulario' | 'conectando' | 'conectado' | 'cerrado'

const CLAVE_GUARDADA = 'terminal_clave'
const URL_WS = `${String(import.meta.env.VITE_API_URL ?? 'http://localhost:3000').replace(/^http/, 'ws')}/terminal`

function leerClaveGuardada() {
  try {
    return sessionStorage.getItem(CLAVE_GUARDADA) ?? ''
  } catch {
    return ''
  }
}

// El backend dice si hay que pedir la clave de acceso (por defecto sí, hasta que responda).
const requiereClave = ref(true)

onMounted(async () => {
  try {
    requiereClave.value = (await terminalApi.config()).requiereClave
  } catch {
    // Si no responde, se deja el campo visible; el error real saldrá al conectar.
  }
})

const estado = ref<Estado>('formulario')
const mensaje = ref('')
const huella = ref('')
const contenedor = ref<HTMLDivElement | null>(null)

const form = reactive({
  ip: props.equipo.ip,
  puerto: '22',
  usuario: props.equipo.usuario,
  contrasena: props.equipo.contrasena,
  clave: leerClaveGuardada(),
})

let term: Terminal | null = null
let fit: FitAddon | null = null
let ws: WebSocket | null = null
let observador: ResizeObserver | null = null

function enfocar() {
  term?.focus()
}

function enviar(msg: Record<string, unknown>) {
  if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg))
}

function iniciarTerminal() {
  if (term || !contenedor.value) return
  term = new Terminal({
    cursorBlink: true,
    fontFamily: "'Cascadia Mono', Consolas, 'Courier New', monospace",
    fontSize: 14,
    scrollback: 5000,
    theme: { background: '#0b1220', foreground: '#d7e2f0', cursor: '#7be0a5' },
  })
  fit = new FitAddon()
  term.loadAddon(fit)
  term.open(contenedor.value)
  fit.fit()
  term.onData((data) => enviar({ type: 'data', data }))
  term.onResize(({ cols, rows }) => enviar({ type: 'resize', cols, rows }))
  observador = new ResizeObserver(() => fit?.fit())
  observador.observe(contenedor.value)
}

async function conectar() {
  mensaje.value = ''
  if (!form.ip.trim() || !form.usuario.trim() || (requiereClave.value && !form.clave)) {
    mensaje.value = requiereClave.value
      ? 'Faltan la dirección IP, el usuario o la clave de acceso.'
      : 'Faltan la dirección IP o el usuario.'
    return
  }
  if (requiereClave.value) {
    try {
      sessionStorage.setItem(CLAVE_GUARDADA, form.clave)
    } catch {
      // Sin sessionStorage solo habrá que volver a escribir la clave.
    }
  }

  estado.value = 'conectando'
  await nextTick()
  iniciarTerminal()
  term?.reset()
  term?.writeln(`Conectando a ${form.ip.trim()}:${form.puerto || 22} ...`)
  fit?.fit()

  ws?.close()
  const socket = new WebSocket(URL_WS)
  ws = socket

  socket.onopen = () =>
    socket.send(
      JSON.stringify({
        type: 'connect',
        clave: requiereClave.value ? form.clave : undefined,
        host: form.ip.trim(),
        puerto: Number(form.puerto) || 22,
        usuario: form.usuario.trim(),
        contrasena: form.contrasena,
        equipo: props.equipo.nombre,
        cols: term?.cols ?? 100,
        rows: term?.rows ?? 30,
      }),
    )

  socket.onmessage = (ev) => {
    if (ws !== socket) return
    const msg = JSON.parse(String(ev.data)) as { type: string; data?: string; mensaje?: string; huella?: string }
    if (msg.type === 'data') {
      term?.write(msg.data ?? '')
    } else if (msg.type === 'connected') {
      huella.value = msg.huella ?? ''
      estado.value = 'conectado'
      term?.reset()
      enviar({ type: 'resize', cols: term?.cols ?? 100, rows: term?.rows ?? 30 })
      // El formulario acaba de desaparecer: se espera al siguiente cuadro para que el foco no se pierda.
      void nextTick(() => term?.focus())
    } else if (msg.type === 'error') {
      mensaje.value = msg.mensaje ?? 'No se pudo conectar.'
      // Si falló antes de conectar se vuelve al formulario para corregir; si fue en plena sesión, se deja la consola.
      if (estado.value === 'conectando') estado.value = 'formulario'
    } else if (msg.type === 'closed') {
      term?.writeln(`\r\n\x1b[33m[Sesión cerrada: ${msg.mensaje ?? ''}]\x1b[0m`)
      estado.value = 'cerrado'
    }
  }

  socket.onclose = () => {
    if (ws !== socket) return
    if (estado.value === 'conectando') {
      mensaje.value ||= 'No se pudo conectar con el backend. ¿Está corriendo?'
      estado.value = 'formulario'
    } else if (estado.value === 'conectado') {
      term?.writeln('\r\n\x1b[33m[Conexión cerrada]\x1b[0m')
      estado.value = 'cerrado'
    }
  }
}

function desconectar() {
  ws?.close()
  estado.value = 'cerrado'
}

function nuevaConexion() {
  estado.value = 'formulario'
}

function cerrar() {
  ws?.close()
  emit('cerrar')
}

onBeforeUnmount(() => {
  ws?.close()
  observador?.disconnect()
  term?.dispose()
})
</script>

<template>
  <div class="velo" role="dialog" aria-modal="true" :aria-label="`Consola SSH de ${equipo.nombre}`">
    <div class="panel">
      <header class="cabecera">
        <h2>
          Consola SSH · {{ equipo.nombre }}
          <small v-if="estado === 'conectado'">{{ form.usuario }}@{{ form.ip }}</small>
        </h2>
        <div class="acciones">
          <button v-if="estado === 'conectado'" type="button" class="secundario" @click="desconectar">
            Desconectar
          </button>
          <button v-if="estado === 'cerrado'" type="button" class="secundario" @click="nuevaConexion">
            Volver a conectar
          </button>
          <button type="button" class="cerrar" aria-label="Cerrar" @click="cerrar">✕</button>
        </div>
      </header>

      <form v-if="estado === 'formulario'" class="formulario" @submit.prevent="conectar">
        <label class="ancho">
          Dirección IP
          <input v-model="form.ip" inputmode="decimal" autocomplete="off" />
        </label>
        <label>
          Puerto
          <input v-model="form.puerto" inputmode="numeric" autocomplete="off" />
        </label>
        <label>
          Usuario
          <input v-model="form.usuario" autocomplete="off" />
        </label>
        <label>
          Contraseña del equipo
          <input v-model="form.contrasena" type="password" autocomplete="new-password" />
        </label>
        <label v-if="requiereClave" class="ancho">
          Clave de acceso a la terminal
          <input v-model="form.clave" type="password" autocomplete="off" placeholder="La de backend/.env (TERMINAL_CLAVE)" />
        </label>

        <p v-if="mensaje" class="error" role="alert">{{ mensaje }}</p>
        <div class="ancho pie">
          <button type="submit" class="primario">Conectar</button>
          <button type="button" class="secundario" @click="cerrar">Cancelar</button>
        </div>
        <p class="aviso ancho">
          Cada conexión queda registrada (equipo, usuario, desde dónde y cuándo). No se guarda lo que escribes.
        </p>
      </form>

      <div v-show="estado !== 'formulario'" class="escenario">
        <div ref="contenedor" class="terminal" @click="enfocar"></div>
        <p v-if="estado === 'conectado' && huella" class="huella" title="Huella SHA-256 de la llave del equipo">
          Huella del equipo: {{ huella }}
        </p>
        <p v-if="mensaje && estado !== 'formulario'" class="error">{{ mensaje }}</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.velo {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: rgba(0, 0, 0, 0.6);
}

.panel {
  display: flex;
  flex-direction: column;
  width: min(62rem, 100%);
  max-height: 100%;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  overflow: hidden;
}

.cabecera {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.6rem 0.9rem;
  background: var(--color-background-soft);
  border-bottom: 1px solid var(--color-border);
}

.cabecera h2 {
  font-size: 1rem;
  color: var(--color-heading);
}

.cabecera small {
  margin-left: 0.5rem;
  font-family: ui-monospace, 'Cascadia Mono', Consolas, monospace;
  font-size: 0.8rem;
  font-weight: 500;
  opacity: 0.7;
}

.acciones {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.cerrar {
  width: 1.9rem;
  height: 1.9rem;
  color: var(--color-text);
  background: none;
  border: 0;
  border-radius: 6px;
  cursor: pointer;
}

.cerrar:hover {
  background: rgba(192, 57, 43, 0.15);
  color: #c0392b;
}

.formulario {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
  padding: 1rem 1.1rem;
}

.formulario label {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  font-size: 0.78rem;
  font-weight: 600;
}

.formulario input {
  padding: 0.5rem 0.65rem;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-background-soft);
  color: var(--color-text);
  font-size: 0.92rem;
}

.formulario input:focus {
  outline: 2px solid var(--cfe-green);
  outline-offset: 1px;
}

.ancho {
  grid-column: 1 / -1;
}

.pie {
  display: flex;
  gap: 0.5rem;
}

.primario,
.secundario {
  padding: 0.5rem 1.2rem;
  font-weight: 700;
  border-radius: 8px;
  cursor: pointer;
}

.primario {
  color: #fff;
  background: var(--cfe-green);
  border: 0;
}

.primario:hover {
  background: var(--cfe-green-dark);
}

.secundario {
  padding: 0.3rem 0.8rem;
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--color-text);
  background: var(--color-background);
  border: 1px solid var(--color-border);
}

.error {
  grid-column: 1 / -1;
  margin: 0;
  padding: 0.5rem 0.75rem;
  font-size: 0.85rem;
  color: #c0392b;
  background: rgba(192, 57, 43, 0.1);
  border-radius: 8px;
}

.aviso {
  margin: 0;
  font-size: 0.74rem;
  opacity: 0.65;
}

.escenario {
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: #0b1220;
}

.terminal {
  height: min(32rem, 70vh);
  padding: 0.5rem 0.6rem;
}

.huella {
  margin: 0;
  padding: 0.3rem 0.8rem;
  font-family: ui-monospace, 'Cascadia Mono', Consolas, monospace;
  font-size: 0.68rem;
  color: #7f8fa6;
  border-top: 1px solid #1c2740;
  word-break: break-all;
}

@media (max-width: 600px) {
  .formulario {
    grid-template-columns: 1fr;
  }
}
</style>
