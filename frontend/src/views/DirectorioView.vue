<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { directorioApi, type ContactoDirectorio } from '@/services/api'

const contactos = ref<ContactoDirectorio[]>([])
const search = ref('')
const loading = ref(false)
const error = ref('')

let debounceHandle: ReturnType<typeof setTimeout> | undefined

async function load() {
  loading.value = true
  error.value = ''
  try {
    contactos.value = await directorioApi.list(search.value.trim() || undefined)
  } catch {
    error.value = 'No se pudo conectar con el directorio. ¿Está corriendo el backend?'
  } finally {
    loading.value = false
  }
}

function onSearchInput() {
  if (debounceHandle) clearTimeout(debounceHandle)
  debounceHandle = setTimeout(load, 300)
}

function nombreCompleto(c: ContactoDirectorio) {
  const partes = [c.nombre?.trim(), c.apellido?.trim()].filter(Boolean)
  return partes.length ? partes.join(' ') : null
}

onMounted(load)
onUnmounted(() => {
  if (debounceHandle) clearTimeout(debounceHandle)
})
</script>

<template>
  <main class="directorio">
    <h1>Directorio Telefónico</h1>

    <input
      v-model="search"
      type="search"
      class="search-input"
      placeholder="Buscar por nombre o extensión..."
      @input="onSearchInput"
    />

    <p v-if="error" class="error">{{ error }}</p>

    <p v-else-if="loading" class="status">Cargando...</p>

    <p v-else-if="contactos.length === 0" class="status">Sin resultados.</p>

    <ul v-else class="list">
      <li v-for="c in contactos" :key="c.id" class="row">
        <div class="info">
          <span class="nombre">{{ nombreCompleto(c) ?? c.puesto ?? 'Sin nombre' }}</span>
          <span v-if="nombreCompleto(c) && c.puesto" class="puesto">{{ c.puesto }}</span>
          <span v-if="c.departamento" class="departamento">{{ c.departamento }}</span>
        </div>
        <span class="extension">{{ c.extension ?? '—' }}</span>
      </li>
    </ul>
  </main>
</template>

<style scoped>
.directorio {
  max-width: 40rem;
  margin: 0 auto;
  padding: 1.5rem;
}

h1 {
  font-size: 1.3rem;
  margin-bottom: 1rem;
  color: var(--color-heading);
}

.search-input {
  width: 100%;
  padding: 0.65rem 0.9rem;
  border-radius: 8px;
  border: 1px solid var(--color-border);
  background: var(--color-background-soft);
  color: var(--color-text);
  font-size: 0.95rem;
  margin-bottom: 1.25rem;
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

.list {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  list-style: none;
  padding: 0;
  margin: 0;
}

.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.75rem 1rem;
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.info {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  min-width: 0;
}

.nombre {
  font-weight: 600;
  color: var(--color-heading);
}

.puesto {
  font-size: 0.82rem;
  opacity: 0.75;
}

.departamento {
  font-size: 0.78rem;
  opacity: 0.6;
}

.extension {
  flex-shrink: 0;
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--cfe-green-dark);
  background: var(--color-background-mute);
  padding: 0.3rem 0.7rem;
  border-radius: 6px;
}
</style>
