<script setup lang="ts">
import { LISTA_ULTIMA_MILLA } from '@/data/ultimaMilla'
</script>

<template>
  <main class="lista-um">
    <h1>Última milla</h1>
    <p class="sub">Selecciona un tramo para verlo en el mapa.</p>

    <ul>
      <li v-for="t in LISTA_ULTIMA_MILLA" :key="t.ruta">
        <span>{{ t.nombre }}</span>
        <RouterLink :to="t.ruta" class="ver">Ver</RouterLink>
      </li>
    </ul>
  </main>
</template>

<style scoped>
.lista-um {
  max-width: 44rem;
  margin: 0 auto;
  padding: 1.5rem;
}

h1 {
  font-size: 1.3rem;
  color: var(--color-heading);
}

.sub {
  margin: 0.2rem 0 1rem;
  opacity: 0.7;
}

ul {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  list-style: none;
  padding: 0;
  margin: 0;
}

li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.7rem 1rem;
  font-weight: 600;
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.ver {
  padding: 0.35rem 1.1rem;
  font-weight: 700;
  color: #fff;
  background: var(--cfe-green);
  border-radius: 8px;
  text-decoration: none;
}

.ver:hover {
  background: var(--cfe-green-dark);
}
</style>
