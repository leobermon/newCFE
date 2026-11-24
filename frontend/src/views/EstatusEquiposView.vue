<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { estatusEquiposApi, type EstatusEquiposResponse } from '@/services/api'

const data = ref<EstatusEquiposResponse | null>(null)
const loading = ref(false)
const error = ref('')
const search = ref('')
const filtro = ref<'todos' | 'sin-respuesta'>('todos')

async function load() {
  loading.value = true
  error.value = ''
  try {
    data.value = await estatusEquiposApi.list()
  } catch {
    error.value = 'No se pudo conectar con el backend. ¿Está corriendo en el puerto 3000?'
  } finally {
    loading.value = false
  }
}

const gruposFiltrados = computed(() => {
  if (!data.value) return []

  const q = search.value.trim().toLowerCase()

  return data.value.grupos
    .map((grupo) => ({
      ...grupo,
      equipos: grupo.equipos.filter((e) => {
        if (filtro.value === 'sin-respuesta' && e.ping) return false
        if (q && !e.nombre.toLowerCase().includes(q) && !e.ip.includes(q)) return false
        return true
      }),
    }))
    .filter((grupo) => grupo.equipos.length > 0)
})

onMounted(load)
</script>

<template>
  <main class="estatus">
    <div class="header-bar">
      <h1>
        Estatus Equipos
        <span class="info-icon" title="Datos de ejemplo (IPs y estado de ping generados aleatoriamente) mientras se conecta el origen real.">i</span>
      </h1>

      <input
        v-if="data"
        v-model="search"
        type="search"
        class="search-input"
        placeholder="Buscar por nombre o IP..."
      />

      <div v-if="data" class="header-divider" />

      <div v-if="data" class="filtro-group">
        <button type="button" :class="{ active: filtro === 'todos' }" @click="filtro = 'todos'">
          Todos
        </button>
        <button
          type="button"
          :class="{ active: filtro === 'sin-respuesta' }"
          @click="filtro = 'sin-respuesta'"
        >
          Sin respuesta
        </button>
      </div>

      <div v-if="data" class="summary">
        <div class="tile">
          <span class="tile-value">{{ data.totales.total }}</span>
          <span class="tile-label">Total</span>
        </div>
        <div class="tile ok">
          <span class="tile-value">{{ data.totales.pingOk }}</span>
          <span class="tile-label">Con ping</span>
        </div>
        <div class="tile fail">
          <span class="tile-value">{{ data.totales.total - data.totales.pingOk }}</span>
          <span class="tile-label">Sin ping</span>
        </div>
      </div>
    </div>

    <p v-if="error" class="error">{{ error }}</p>
    <p v-else-if="loading" class="status">Cargando...</p>

    <template v-else-if="data">
      <p v-if="gruposFiltrados.length === 0" class="status">Sin resultados.</p>

      <div v-else class="grupos-grid">
        <section v-for="grupo in gruposFiltrados" :key="grupo.subestacion" class="grupo">
          <h2>
            {{ grupo.subestacion }}
            <span class="grupo-count">{{ grupo.pingOk }}/{{ grupo.total }}</span>
          </h2>
          <ul class="lista">
            <li v-for="e in grupo.equipos" :key="e.id" class="row">
              <div class="info">
                <span class="ip">{{ e.ip }}</span>
                <span class="nombre">{{ e.nombre }}</span>
              </div>
              <span class="badge" :class="e.ping ? 'ok' : 'fail'">
                {{ e.ping ? 'Ping OK' : 'Sin respuesta' }}
              </span>
            </li>
          </ul>
        </section>
      </div>
    </template>
  </main>
</template>

<style scoped>
.estatus {
  max-width: 80rem;
  margin: 0 auto;
  padding: 0.5rem;
}

.header-bar {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

h1 {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
  font-size: 1.6rem;
  color: var(--color-heading);
  white-space: nowrap;
}

.info-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.05rem;
  height: 1.05rem;
  flex-shrink: 0;
  border-radius: 50%;
  border: 1px solid var(--color-border);
  font-size: 0.7rem;
  font-style: normal;
  font-weight: 700;
  opacity: 0.55;
  cursor: help;
}

.header-divider {
  width: 1px;
  align-self: stretch;
  flex-shrink: 0;
  background: var(--color-border);
}

.error {
  color: #c0392b;
}

.status {
  opacity: 0.7;
}

.search-input {
  flex: 0 1 14rem;
  min-width: 8rem;
  margin-left: auto;
  padding: 0.55rem 0.8rem;
  border-radius: 8px;
  border: 1px solid var(--color-border);
  background: var(--color-background-soft);
  color: var(--color-text);
  font-size: 0.9rem;
}

.search-input:focus {
  outline: 2px solid var(--cfe-green);
  outline-offset: 1px;
}

.filtro-group {
  display: flex;
  flex-shrink: 0;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  overflow: hidden;
}

.filtro-group button {
  padding: 0.55rem 0.9rem;
  font-size: 0.85rem;
  border: none;
  background: var(--color-background-soft);
  color: var(--color-text);
  cursor: pointer;
  white-space: nowrap;
}

.filtro-group button + button {
  border-left: 1px solid var(--color-border);
}

.filtro-group button.active {
  background: var(--cfe-green-dark);
  color: #fff;
}

.summary {
  display: flex;
  gap: 0.5rem;
  flex-shrink: 0;
}

.tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.1rem;
  padding: 0.4rem 0.7rem;
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.tile-value {
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--color-heading);
}

.tile.ok .tile-value {
  color: #1e824c;
}

.tile.fail .tile-value {
  color: #c0392b;
}

.tile-label {
  font-size: 0.7rem;
  opacity: 0.65;
}

.grupos-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.65rem;
}

.grupo {
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: 0.2rem;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 10px;
}

.grupo h2 {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.5rem;
  font-size: 0.85rem;
  color: var(--color-heading);
  margin-bottom: 0.35rem;
  padding-bottom: 0.25rem;
  border-bottom: 1px solid var(--color-border);
}

.grupo-count {
  flex-shrink: 0;
  font-size: 0.72rem;
  font-weight: 400;
  opacity: 0.6;
}

.lista {
  display: flex;
  flex-direction: column;
  gap: 0.12rem;
  list-style: none;
  padding: 0 0.15rem 0 0;
  margin: 0;
  overflow-y: auto;
  max-height: 15.5rem;
  scrollbar-width: thin;
  scrollbar-color: rgba(128, 128, 128, 0.25) transparent;
}

.lista::-webkit-scrollbar {
  width: 4px;
}

.lista::-webkit-scrollbar-track {
  background: transparent;
}

.lista::-webkit-scrollbar-thumb {
  background: rgba(128, 128, 128, 0.25);
  border-radius: 999px;
}

.lista::-webkit-scrollbar-thumb:hover {
  background: rgba(128, 128, 128, 0.4);
}

.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.35rem;
  padding: 0.15rem 0.4rem;
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: 5px;
}

.info {
  display: flex;
  align-items: baseline;
  gap: 0.35rem;
  min-width: 0;
  overflow: hidden;
}

.ip {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.65rem;
  line-height: 1.3;
  flex-shrink: 0;
  opacity: 0.6;
}

.nombre {
  font-size: 0.7rem;
  line-height: 1.3;
  font-weight: 600;
  color: var(--color-heading);
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.badge {
  flex-shrink: 0;
  font-size: 0.58rem;
  font-weight: 600;
  padding: 0.12rem 0.35rem;
  border-radius: 999px;
  white-space: nowrap;
}

.badge.ok {
  color: #1e824c;
  background: rgba(30, 130, 76, 0.12);
}

.badge.fail {
  color: #c0392b;
  background: rgba(192, 57, 43, 0.12);
}

@media (max-width: 1150px) {
  .grupos-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 860px) {
  .grupos-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 640px) {
  .grupos-grid {
    grid-template-columns: 1fr;
  }

  .lista {
    max-height: 13rem;
  }

  .header-bar {
    flex-wrap: wrap;
    gap: 0.4rem;
  }

  h1 {
    font-size: 1.05rem;
    gap: 0.3rem;
  }

  .info-icon {
    width: 0.85rem;
    height: 0.85rem;
    font-size: 0.55rem;
  }

  .header-divider {
    display: none;
  }

  .summary {
    justify-content: space-between;
    gap: 0.35rem;
  }

  .tile {
    padding: 0.25rem 0.4rem;
  }

  .tile-value {
    font-size: 0.85rem;
  }

  .tile-label {
    font-size: 0.55rem;
  }

  .search-input {
    flex-basis: 100%;
    padding: 0.4rem 0.6rem;
    font-size: 0.8rem;
  }

  .filtro-group {
    flex: 1;
    align-self: stretch;
  }

  .filtro-group button {
    flex: 1;
    padding: 0.35rem 0.5rem;
    font-size: 0.75rem;
  }
}
</style>
