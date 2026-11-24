<script setup lang="ts">
import MenuButton from '@/components/MenuButton.vue'

const options = [
  { to: '/subestaciones', title: 'SUBESTACIONES', icon: 'subestaciones' },
  { to: '/directorio-telefonico', title: 'DIRECTORIO TELEFONICO', icon: 'directorio' },
  { to: '/enlaces-otn', title: 'ENLACES OTN', icon: 'otn' },
  { href: '/diagramas/eci.svg', title: 'ENLACES ECI', icon: 'eci' },
  { to: '/enlaces-oplat', title: 'ENLACES OPLAT', icon: 'oplat' },
  { to: '/equipos-r3', title: 'EQUIPOS R3', icon: 'r3' },
  { href: '/diagramas/rdo.svg', title: 'DIAGRAMA RDO ZOT', icon: 'rdo-zot' },
  { href: '/diagramas/visio.svg', title: 'ENLACES F.O GRTP', icon: 'fo-grtp' },
  { to: '/ultima-milla', title: 'ULTIMA MILLA', icon: 'ultima-milla' },
  { to: '/estatus-equipos', title: 'ESTATUS EQUIPOS', icon: 'estatus' },
  { to: '/redes', title: 'REDES POR SUBESTACIÓN', icon: 'redes' },
  { to: '/agregar-equipos', title: 'AGREGAR EQUIPOS', icon: 'r3' },
] as const
</script>

<template>
  <main class="home">
    <h1>Menú principal</h1>
    <div class="grid">
      <MenuButton
        v-for="option in options"
        :key="option.title"
        :to="'to' in option ? option.to : undefined"
        :href="'href' in option ? option.href : undefined"
        :title="option.title"
        :icon="option.icon"
      />
    </div>
  </main>
</template>

<style scoped>
.home {
  max-width: 64rem;
  margin: 0 auto;
  padding: 1.5rem;
}

h1 {
  font-size: 1.3rem;
  margin-bottom: 1.25rem;
  color: var(--color-heading);
}

.grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}

@media (max-width: 640px) {
  .grid {
    grid-template-columns: 1fr;
  }
}
</style>
