<script setup lang="ts">
import { onMounted, onUnmounted, reactive, ref } from 'vue'
import { r3Api, type EquipoR3 } from '@/services/api'

const equipos = ref<EquipoR3[]>([])
const search = ref('')
const loading = ref(false)
const error = ref('')
const expandedIds = reactive(new Set<number>())

let debounceHandle: ReturnType<typeof setTimeout> | undefined

async function load() {
  loading.value = true
  error.value = ''
  try {
    equipos.value = await r3Api.list(search.value.trim() || undefined)
  } catch {
    error.value = 'No se pudo conectar con el backend. ¿Está corriendo en el puerto 3000?'
  } finally {
    loading.value = false
  }
}

function onSearchInput() {
  if (debounceHandle) clearTimeout(debounceHandle)
  debounceHandle = setTimeout(load, 300)
}

function toggleExpand(id: number) {
  if (expandedIds.has(id)) {
    expandedIds.delete(id)
  } else {
    expandedIds.add(id)
  }
}

onMounted(load)
onUnmounted(() => {
  if (debounceHandle) clearTimeout(debounceHandle)
})
</script>

<template>
  <main class="r3">
    <div class="header-bar">
      <h1>Equipos R3</h1>

      <input
        v-model="search"
        type="search"
        class="search-input"
        placeholder="Buscar por equipo, denominación, ubicación, fabricante o serie..."
        @input="onSearchInput"
      />

      <span v-if="!loading && !error" class="count">{{ equipos.length }} equipo(s)</span>
    </div>

    <p v-if="error" class="error">{{ error }}</p>
    <p v-else-if="loading" class="status">Cargando...</p>
    <p v-else-if="equipos.length === 0" class="status">Sin resultados.</p>

    <template v-else>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th class="col-equipo">Equipo (R3)</th>
              <th class="col-denominacion">Denominación</th>
              <th class="col-extra">Ubicación técnica</th>
              <th class="col-extra">Fabricante</th>
              <th class="col-extra">Serie</th>
              <th class="col-extra">Activo fijo</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="e in equipos" :key="e.id">
              <tr class="row-main" @click="toggleExpand(e.id)">
                <td class="col-equipo">{{ e.equipo ?? '—' }}</td>
                <td class="col-denominacion">
                  {{ e.denominacion ?? '—' }}
                  <span class="chevron" :class="{ open: expandedIds.has(e.id) }">▸</span>
                </td>
                <td class="col-extra">{{ e.ubicacionTecnica ?? '—' }}</td>
                <td class="col-extra">{{ e.fabricante || '—' }}</td>
                <td class="col-extra">{{ e.serie || '—' }}</td>
                <td class="col-extra">{{ e.activoFijo ?? '—' }}</td>
              </tr>
              <tr v-if="expandedIds.has(e.id)" class="row-detail">
                <td colspan="2">
                  <dl>
                    <dt>Ubicación técnica</dt>
                    <dd>{{ e.ubicacionTecnica ?? '—' }}</dd>
                    <dt>Fabricante</dt>
                    <dd>{{ e.fabricante || '—' }}</dd>
                    <dt>Serie</dt>
                    <dd>{{ e.serie || '—' }}</dd>
                    <dt>Activo fijo</dt>
                    <dd>{{ e.activoFijo ?? '—' }}</dd>
                  </dl>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </template>
  </main>
</template>

<style scoped>
.r3 {
  max-width: 100rem;
  margin: 0 auto;
  padding: 1.5rem 2rem;
}

.header-bar {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

h1 {
  flex-shrink: 0;
  font-size: 1.3rem;
  color: var(--color-heading);
  white-space: nowrap;
}

.search-input {
  flex: 1;
  min-width: 8rem;
  padding: 0.65rem 0.9rem;
  border-radius: 8px;
  border: 1px solid var(--color-border);
  background: var(--color-background-soft);
  color: var(--color-text);
  font-size: 0.95rem;
}

.search-input:focus {
  outline: 2px solid var(--cfe-green);
  outline-offset: 1px;
}

.error {
  color: #c0392b;
}

.status {
  opacity: 0.7;
}

.count {
  flex-shrink: 0;
  font-size: 0.85rem;
  opacity: 0.65;
  white-space: nowrap;
}

.table-wrap {
  overflow: auto;
  max-height: calc(100vh - 11rem);
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
  white-space: nowrap;
}

th,
td {
  text-align: left;
  padding: 0.3rem 0.8rem;
  border-bottom: 1px solid var(--color-border);
}

th {
  background: var(--color-background-mute);
  color: var(--color-heading);
  position: sticky;
  top: 0;
}

tbody tr.row-main:hover {
  background: var(--color-background-soft);
}

tbody tr.row-main:last-child td {
  border-bottom: none;
}

.chevron {
  display: none;
  margin-left: 0.4rem;
  opacity: 0.5;
  transition: transform 0.15s;
}

.chevron.open {
  transform: rotate(90deg);
}

.row-detail {
  display: none;
}

.row-detail td {
  background: var(--color-background-soft);
}

.row-detail dl {
  margin: 0;
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.35rem 1rem;
  font-size: 0.82rem;
}

.row-detail dt {
  opacity: 0.6;
}

.row-detail dd {
  margin: 0;
}

@media (max-width: 640px) {
  .r3 {
    padding: 1rem;
  }

  .header-bar {
    flex-wrap: wrap;
  }

  .search-input {
    flex-basis: 100%;
    order: 1;
  }

  .count {
    order: 2;
  }

  .col-extra {
    display: none;
  }

  th,
  td {
    white-space: normal;
  }

  .row-main {
    cursor: pointer;
  }

  .chevron {
    display: inline-block;
  }

  .row-detail {
    display: table-row;
  }
}
</style>
