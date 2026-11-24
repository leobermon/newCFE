<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import CasetaDiagrama from '@/components/CasetaDiagrama.vue'
import { PLANOS } from '@/data/planosCaseta'
import { subestacionesApi, type Subestacion } from '@/services/api'

const route = useRoute()

const alias = computed(() => String(route.params.alias ?? '').toUpperCase())
// /diagramas/KNTstatcom es el plano de STATCOM de KNT; el resto de la ruta es el alias de la subestación.
const esStatcom = computed(() => alias.value.endsWith('STATCOM'))
const aliasBase = computed(() => (esStatcom.value ? alias.value.slice(0, -'STATCOM'.length) : alias.value))

// La búsqueda ignora mayúsculas para que /diagramas/niz o /diagramas/KNTstatcom (links externos) también funcionen.
function buscarPlano(clave: string) {
  const key = Object.keys(PLANOS).find((k) => k.toLowerCase() === clave.toLowerCase())
  return key ? PLANOS[key] : undefined
}
// STATCOM usa el plano "<ALIAS>statcom" si existe; si no, el de la caseta.
const plano = computed(() => (esStatcom.value ? buscarPlano(alias.value) : undefined) ?? buscarPlano(aliasBase.value))

// El encabezado muestra el nombre completo; mientras llega (o si el backend no responde) se queda con el alias.
const subestaciones = ref<Subestacion[]>([])
onMounted(async () => {
  try {
    subestaciones.value = await subestacionesApi.list()
  } catch {
    // Sin backend el diagrama se ve igual, solo con el alias como título.
  }
})
const title = computed(() => {
  const nombre = subestaciones.value.find((sub) => sub.alias?.toUpperCase() === aliasBase.value)?.nombre
  return `${nombre ?? aliasBase.value}${esStatcom.value ? ' - STATCOM' : ''}`
})
</script>

<template>
  <main class="diagrama">
    <h1>{{ title }}</h1>

    <p v-if="!plano" class="status">
      No hay diagrama disponible para <strong>{{ alias }}</strong
      >.
    </p>
    <div v-else class="centro">
      <CasetaDiagrama :plano="plano" />
    </div>
  </main>
</template>

<style scoped>
.diagrama {
  padding: 1rem 1.5rem;
}

h1 {
  font-size: 1.1rem;
  margin-bottom: 1rem;
  text-align: center;
  color: var(--color-heading);
}

.status {
  text-align: center;
  opacity: 0.7;
}

.centro {
  display: flex;
  justify-content: center;
}
</style>
