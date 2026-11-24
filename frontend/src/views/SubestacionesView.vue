<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { subestacionesApi, type Subestacion } from '@/services/api'

interface TipoInstalacion {
  label: string
  slug: string
}

const TIPOS: Record<number, TipoInstalacion> = {
  1: { label: 'CASETA', slug: 'caseta' },
  3: { label: 'GIS 115', slug: 'gis-115' },
  4: { label: 'GIS 230', slug: 'gis-230' },
  5: { label: 'GIS 400', slug: 'gis-400' },
  16: { label: 'CASETA REI', slug: 'caseta-rei' },
  17: { label: 'STATCOM', slug: 'statcom' },
}

const COLUMNAS = Object.entries(TIPOS).map(([codigo, tipo]) => ({ codigo: Number(codigo), ...tipo }))

const subestaciones = ref<Subestacion[]>([])
const loading = ref(false)
const error = ref('')
const search = ref('')

const subestacionesFiltradas = computed(() => {
  const q = search.value.trim().toLowerCase()

  return subestaciones.value
    .filter((sub) => !q || sub.nombre.toLowerCase().includes(q) || sub.alias.toLowerCase().includes(q))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
})

async function load() {
  loading.value = true
  error.value = ''
  try {
    subestaciones.value = await subestacionesApi.list()
  } catch {
    error.value = 'No se pudo conectar con el backend. ¿Está corriendo en el puerto 3000?'
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <main class="subestaciones">
    <div class="header-bar">
      <h1>Subestaciones</h1>

      <input
        v-if="subestaciones.length > 0"
        v-model="search"
        type="search"
        class="search-input"
        placeholder="Buscar por nombre o abreviación..."
      />
    </div>

    <p v-if="error" class="error">{{ error }}</p>
    <p v-else-if="loading" class="status">Cargando...</p>
    <p v-else-if="subestaciones.length === 0" class="status">Sin subestaciones activas.</p>
    <p v-else-if="subestacionesFiltradas.length === 0" class="status">Sin resultados.</p>

    <ul v-else class="lista">
      <li v-for="sub in subestacionesFiltradas" :key="sub.id" class="card">
        <div class="info">
          <span class="alias">{{ sub.alias }}</span>
          <span class="nombre">{{ sub.nombre }}</span>
        </div>
        <div class="botones">
          <template v-for="tipo in COLUMNAS" :key="tipo.slug">
            <RouterLink
              v-if="sub.instalaciones.includes(tipo.codigo)"
              class="boton"
              :to="{
                name: 'subestacion-diagrama',
                params: { alias: tipo.slug === 'statcom' ? `${sub.alias}statcom` : sub.alias },
              }"
            >
              {{ tipo.label }}
            </RouterLink>
            <span v-else class="boton hueco" aria-hidden="true"></span>
          </template>
        </div>
      </li>
    </ul>
  </main>
</template>

<style scoped>
.subestaciones {
  max-width: 56rem;
  margin: 0 auto;
  padding: 1.5rem;
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
  flex: 0 1 16rem;
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

.error {
  color: #c0392b;
}

.status {
  opacity: 0.7;
}

.lista {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  list-style: none;
  padding: 0;
  margin: 0;
}

.card {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
  padding: 0.5rem 0.75rem;
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.info {
  display: flex;
  align-items: baseline;
  gap: 0.4rem;
  min-width: 0;
}

.alias {
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--color-heading);
}

.nombre {
  font-size: 0.85rem;
  opacity: 0.65;
}

.botones {
  display: grid;
  grid-template-columns: repeat(6, 4.4rem);
  gap: 0.2rem;
  flex-shrink: 0;
  margin-left: auto;
  margin-right: -0.35rem;
}

.boton {
  display: block;
  box-sizing: border-box;
  width: 100%;
  font-size: 0.7rem;
  font-weight: 600;
  text-align: center;
  padding: 0.18rem 0.4rem;
  border-radius: 4px;
  text-decoration: none;
  color: var(--cfe-green-dark);
  background: rgba(30, 130, 76, 0.12);
  transition: background 0.15s;
}

.boton.hueco {
  visibility: hidden;
}

.boton:hover {
  background: rgba(30, 130, 76, 0.22);
}

@media (max-width: 860px) {
  .botones {
    display: flex;
    flex-wrap: wrap;
  }

  .boton {
    width: auto;
  }

  .boton.hueco {
    display: none;
  }
}

@media (max-width: 480px) {
  .card {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
