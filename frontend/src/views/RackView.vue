<script setup lang="ts">
import { ref, watchEffect } from 'vue'
import { useRoute } from 'vue-router'
import { racksApi, type RackDetalle } from '@/services/api'

const route = useRoute()
const rack = ref<RackDetalle | null>(null)
const error = ref('')

watchEffect(async () => {
  error.value = ''
  rack.value = null
  try {
    rack.value = await racksApi.get(String(route.params.id))
  } catch {
    error.value = 'No se encontró el rack.'
  }
})

function fotoModelo(e: { modeloId: number; imgActive: boolean }) {
  return `/img/ModeloEquipo/${e.imgActive ? e.modeloId : 0}.webp`
}

function sinFoto(ev: Event) {
  const img = ev.target as HTMLImageElement
  if (!img.src.endsWith('/0.webp')) img.src = '/img/ModeloEquipo/0.webp'
}
</script>

<template>
  <main class="rack">
    <p v-if="error" class="error">{{ error }}</p>
    <p v-else-if="!rack" class="status">Cargando...</p>

    <template v-else>
      <header class="cabecera">
        <div class="titulos">
          <h1>SUBESTACIÓN {{ rack.alias }}</h1>
          <span class="etiqueta">{{ rack.etiqueta }}</span>
        </div>

        <div v-if="rack.archivos.length" class="archivos">
          <a
            v-for="a in rack.archivos"
            :key="a.id"
            :href="`/PDF/${a.id}.pdf`"
            target="_blank"
            rel="noopener"
            class="archivo"
          >
            <span class="pdf">PDF</span>{{ a.nombre }}
          </a>
        </div>
      </header>

      <section class="fondo">
        <p v-if="!rack.equipos.length" class="status">Este rack no tiene equipos registrados.</p>
        <ul v-else class="equipos">
          <li v-for="e in rack.equipos" :key="e.id" class="equipo">
            <RouterLink :to="{ name: 'equipo', params: { id: e.id } }" class="enlace">
              <h2>{{ e.nombre }}</h2>
              <img :src="fotoModelo(e)" :alt="e.nombre" loading="lazy" @error="sinFoto" />
            </RouterLink>
          </li>
        </ul>
      </section>
    </template>
  </main>
</template>

<style scoped>
.rack {
  max-width: 40rem;
  margin: 0 auto;
  padding: 1rem 1.5rem 2rem;
}

.error {
  color: #c0392b;
}

.status {
  text-align: center;
  opacity: 0.7;
}

.cabecera {
  padding: 1rem 1.25rem;
  background: #949494;
  border-radius: 10px 10px 0 0;
}

.titulos {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
}

h1 {
  font-size: 1.5rem;
  font-weight: 500;
  color: #1f1f1f;
}

.etiqueta {
  font-size: 1.8rem;
  font-weight: 700;
  color: #1f1f1f;
}

.archivos {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-top: 0.75rem;
}

.archivo {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.35rem 0.6rem;
  font-size: 0.75rem;
  font-weight: 500;
  color: #333;
  text-decoration: none;
  background: #fff;
  border-radius: 8px;
}

.archivo:hover {
  background: #e8f5ee;
}

.pdf {
  padding: 0 0.3rem;
  font-size: 0.65rem;
  font-weight: 700;
  color: #fff;
  background: #c0392b;
  border-radius: 3px;
}

/* Rack dibujado con CSS: interior oscuro + dos rieles con orificios.
   Para volver a la imagen: background: #e5e7eb url('/img/rack-fondo.webp') no-repeat center / 100% 100%; */
.fondo {
  position: relative;
  min-height: 30rem;
  padding: 1.5rem 4rem;
  background:
    linear-gradient(90deg, rgba(0, 0, 0, 0.08), transparent 12%, transparent 88%, rgba(0, 0, 0, 0.08)),
    linear-gradient(180deg, #d9dce0, #e8eaed 40%, #d9dce0);
  border: 0.7rem solid #7d7d7d;
  border-top: 0;
  border-radius: 0 0 10px 10px;
}

.fondo::before,
.fondo::after {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  width: 1.5rem;
  background:
    radial-gradient(circle at center, #4b4e53 0 2.5px, transparent 3px) 0 0 / 100% 1.1rem,
    linear-gradient(90deg, #b3b7bc, #cfd2d6 50%, #b3b7bc);
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.18);
}

.fondo::before {
  left: 1.1rem;
}

.fondo::after {
  right: 1.1rem;
}

.equipos {
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
  margin: 0 auto;
  padding: 0;
  list-style: none;
}

.equipo {
  text-align: center;
}

.enlace {
  display: block;
  color: inherit;
  text-decoration: none;
}

.enlace:hover h2 {
  background: #a8c9b6;
  border-color: var(--cfe-green);
}

.equipo h2 {
  padding: 0.1rem 0.5rem;
  font-size: 0.95rem;
  font-weight: 600;
  color: #1f1f1f;
  background: #949494;
  border: 2px solid #6b7280;
  border-radius: 4px;
}

.equipo img {
  display: block;
  max-width: 100%;
  margin: 0 auto;
}

/* Vista movil: sin rieles laterales, titulos mas chicos e imagenes a todo lo ancho. */
@media (max-width: 640px) {
  .rack {
    padding: 0.5rem 0.5rem 1.5rem;
  }

  .cabecera {
    padding: 0.5rem 0.75rem;
  }

  h1 {
    font-size: 1rem;
  }

  .etiqueta {
    font-size: 1.15rem;
  }

  .archivos {
    margin-top: 0.4rem;
  }

  .fondo {
    min-height: 0;
    padding: 0.75rem 1.1rem;
    border-width: 0.4rem;
  }

  .fondo::before,
  .fondo::after {
    display: none;
  }

  .equipos {
    gap: 0.8rem;
  }

  .equipo h2 {
    padding: 0.05rem 0.4rem;
    font-size: 0.75rem;
  }

  .equipo img {
    width: 100%;
  }
}
</style>
