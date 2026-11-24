<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import CasetaDiagrama from '@/components/CasetaDiagrama.vue'
import { PLANOS } from '@/data/planosCaseta'

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

// El título ya viene dibujado dentro de la imagen del diagrama, así que no se muestra aparte.
</script>

<template>
  <main class="diagrama">
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

.status {
  text-align: center;
  opacity: 0.7;
}

.centro {
  display: flex;
  justify-content: center;
}
</style>
