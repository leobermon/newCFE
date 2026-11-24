<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { CustomMarker, GoogleMap, Marker, Polyline } from 'vue3-google-map'
import { ESTILOS_MAPA_PLANO, mapasTulum } from '@/data/ultimaMilla'

const route = useRoute()
const apiKey = String(import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '')

const mapa = computed(() => mapasTulum[String(route.params.ruta)])

const restriction = {
  latLngBounds: { north: 22, south: 20, east: -84, west: -90 },
  strictBounds: false,
}

const estilos = ESTILOS_MAPA_PLANO

const iconoCaseta = { url: '/img/mapas/caseta.svg', scaledSize: { width: 27, height: 39 } }

// Zoom actual del mapa (solo se lee: el mapa sigue su propio zoom). Los iconos se achican al alejar
// para que, sin agrupar, no se encimen, y los números de torre solo salen al acercarse.
const zoomActual = ref(0)
const mapaCambio = computed(() => String(route.params.ruta))
watch(
  mapaCambio,
  () => {
    zoomActual.value = mapa.value?.zoom ?? 12
  },
  { immediate: true },
)

const MOSTRAR_NUMEROS_DESDE = 14
const verNumeros = computed(() => zoomActual.value >= MOSTRAR_NUMEROS_DESDE)

// El mapa de Tulum–Agencia usa postes; el de Playa del Carmen usa torres.
const icono = computed(() => {
  const z = zoomActual.value
  const [width, height] = z >= 14 ? [27, 39] : z >= 12 ? [18, 26] : [11, 16]
  const archivo = route.params.ruta === 'tulum-agencia' ? 'poste' : 'torre'
  return { url: `/img/mapas/${archivo}.svg`, scaledSize: { width, height } }
})
</script>

<template>
  <main class="mapa-um">
    <header class="barra">
      <RouterLink to="/ultima-milla" class="atras">‹ Última milla</RouterLink>
      <h1>Última milla {{ mapa?.titulo }}</h1>
    </header>

    <p v-if="!mapa" class="error">Ese tramo no existe.</p>
    <p v-else-if="!apiKey" class="error">
      Falta la llave de Google Maps: agrega VITE_GOOGLE_MAPS_API_KEY en frontend/.env y reinicia el frontend.
    </p>

    <div v-else class="mapa">
      <GoogleMap
        :key="String(route.params.ruta)"
        :api-key="apiKey"
        style="width: 100%; height: 100%"
        :center="mapa.center"
        :zoom="mapa.zoom"
        :min-zoom="9"
        :max-zoom="20"
        :restriction="restriction"
        :styles="estilos"
        @zoom_changed="zoomActual = $event ?? zoomActual"
      >
        <Polyline v-for="(l, i) in mapa.lineas" :key="i" :options="l" />

        <template v-for="(p, i) in mapa.subestaciones" :key="i">
          <Marker :options="{ position: { lat: p.lat, lng: p.lng }, icon: icono }" />
          <CustomMarker
            v-if="verNumeros"
            :options="{ position: { lat: p.lat, lng: p.lng }, anchorPoint: 'TOP_CENTER' }"
            class="etiqueta-torre"
          >
            <div>{{ p.torre }}</div>
          </CustomMarker>
        </template>

        <template v-for="c in mapa.casetas" :key="c.nombre">
          <Marker :options="{ position: { lat: c.lat, lng: c.lng }, icon: iconoCaseta }" />
          <CustomMarker :options="{ position: { lat: c.lat, lng: c.lng }, anchorPoint: 'TOP_CENTER' }">
            <div class="etiqueta-se">{{ c.nombre }}</div>
          </CustomMarker>
        </template>
      </GoogleMap>
    </div>
  </main>
</template>

<style scoped>
.mapa-um {
  padding: 1rem 1.5rem;
}

.barra {
  display: flex;
  align-items: baseline;
  gap: 1rem;
  margin-bottom: 0.75rem;
}

h1 {
  font-size: 1.2rem;
  color: var(--color-heading);
}

.atras {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--cfe-green-dark);
  text-decoration: none;
}

.error {
  padding: 0.6rem 0.9rem;
  color: #c0392b;
  background: rgba(192, 57, 43, 0.1);
  border-radius: 8px;
}

.mapa {
  height: calc(100vh - 11rem);
  min-height: 24rem;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  overflow: hidden;
}

/* El contenido de los marcadores se dibuja dentro del mapa, por eso :deep. */
:deep(.etiqueta-torre > div),
.etiqueta-se {
  padding: 0.05rem 0.35rem;
  font-size: 0.95rem;
  font-weight: 700;
  color: #1a1a1a;
  text-align: center;
  background: #f9fafb;
  border: 2px solid #4f46e5;
  border-radius: 8px;
}

.etiqueta-se {
  color: #0b03fc;
}
</style>
