<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { GoogleMap, Marker, Polyline } from 'vue3-google-map'
import { ESTILOS_MAPA_PLANO, INFO_CANCUN, tramosCancun, type Tramo } from '@/data/ultimaMilla'

const apiKey = String(import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '')

const center = ref({ lat: 21.15626667, lng: -86.82509444 })
const zoom = ref(12)
const marcados = reactive(new Set<number>())

// Los postes solo se pintan en el tramo elegido; en un mapa con ~970 puntos sería ilegible.
const seleccionados = computed(() => tramosCancun.filter((t) => marcados.has(t.id)))

const restriction = {
  latLngBounds: { north: 21.2376, south: 21.0096, east: -86.72, west: -87 },
  strictBounds: false,
}

// Se ocultan los comercios y el transporte del mapa base para que se vea mejor la ruta.
const estilos = ESTILOS_MAPA_PLANO

const iconoPoste = {
  url: '/img/mapas/poste.svg',
  scaledSize: { width: 27, height: 39 },
}

function etiqueta(t: Tramo) {
  return INFO_CANCUN[t.id]?.nombre ?? `Tramo ${t.id}`
}

function alternar(t: Tramo) {
  if (marcados.has(t.id)) {
    marcados.delete(t.id)
    return
  }
  marcados.add(t.id)
  const primero = t.path[0]
  if (primero) {
    center.value = { lat: primero.lat, lng: primero.lng }
    zoom.value = 16
  }
}

function limpiar() {
  marcados.clear()
}
</script>

<template>
  <main class="mapa-um">
    <header class="barra">
      <RouterLink to="/ultima-milla" class="atras">‹ Última milla</RouterLink>
      <h1>Últimas millas de Cancún</h1>
    </header>

    <p v-if="!apiKey" class="error">
      Falta la llave de Google Maps: agrega VITE_GOOGLE_MAPS_API_KEY en frontend/.env y reinicia el frontend.
    </p>

    <div v-else class="cuerpo">
      <div class="mapa">
        <GoogleMap
          :api-key="apiKey"
          style="width: 100%; height: 100%"
          :center="center"
          :zoom="zoom"
          :min-zoom="9"
          :max-zoom="20"
          :restriction="restriction"
          :styles="estilos"
          @zoom_changed="zoom = $event ?? zoom"
        >
          <template v-for="t in seleccionados" :key="t.id">
            <Polyline
              :options="{ path: t.path, geodesic: true, strokeColor: t.strokeColor, strokeOpacity: 1, strokeWeight: 4 }"
            />
            <Marker
              v-for="(p, i) in t.path"
              :key="`${t.id}-${i}`"
              :options="{ position: { lat: p.lat, lng: p.lng }, icon: iconoPoste, title: p.torre ? `Torre ${p.torre}` : '' }"
            />
          </template>
        </GoogleMap>
      </div>

      <aside class="panel">
        <div class="panel-cab">
          <h2>Selecciona última milla</h2>
          <button v-if="marcados.size" type="button" class="enlace" @click="limpiar">Quitar todas</button>
        </div>
        <ul>
          <li v-for="t in tramosCancun" :key="t.id">
            <label>
              <input type="checkbox" :checked="marcados.has(t.id)" @change="alternar(t)" />
              <span class="color" :style="{ background: t.strokeColor }"></span>
              <span class="texto">
                <strong>{{ etiqueta(t) }}</strong>
                <small>{{ t.name }}</small>
              </span>
              <span class="dist">{{ INFO_CANCUN[t.id]?.distancia ?? '' }}</span>
            </label>
          </li>
        </ul>
      </aside>
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

.cuerpo {
  display: grid;
  grid-template-columns: 1fr 19rem;
  gap: 1rem;
  height: calc(100vh - 11rem);
  min-height: 24rem;
}

.mapa {
  min-width: 0;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  overflow: hidden;
}

.panel {
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.panel-cab {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.6rem 0.8rem;
  border-bottom: 1px solid var(--color-border);
}

.panel-cab h2 {
  font-size: 0.9rem;
  color: var(--color-heading);
}

.enlace {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--cfe-green-dark);
  background: none;
  border: 0;
  cursor: pointer;
}

.panel ul {
  flex: 1;
  margin: 0;
  padding: 0;
  list-style: none;
  overflow-y: auto;
}

.panel li {
  border-bottom: 1px solid var(--color-border);
}

.panel label {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  padding: 0.5rem 0.8rem;
  cursor: pointer;
}

.panel label:hover {
  background: rgba(30, 130, 76, 0.06);
}

.color {
  flex-shrink: 0;
  width: 0.7rem;
  height: 0.7rem;
  border-radius: 50%;
}

.texto {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  font-size: 0.85rem;
}

.texto small {
  font-size: 0.7rem;
  opacity: 0.6;
}

.dist {
  font-size: 0.75rem;
  white-space: nowrap;
  opacity: 0.75;
}

@media (max-width: 800px) {
  .cuerpo {
    grid-template-columns: 1fr;
    grid-template-rows: 22rem auto;
    height: auto;
  }

  .panel ul {
    max-height: 18rem;
  }
}
</style>
