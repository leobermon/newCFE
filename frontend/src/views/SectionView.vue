<script setup lang="ts">
import { useRoute } from 'vue-router'

const route = useRoute()
</script>

<template>
  <main class="section">
    <h1>{{ route.query.title ?? route.meta.title }}</h1>
    <p class="placeholder">Esta sección está en construcción.</p>
  </main>
</template>

<style scoped>
.section {
  max-width: 64rem;
  margin: 0 auto;
  padding: 1.5rem;
}

h1 {
  font-size: 1.3rem;
  margin-bottom: 0.75rem;
  color: var(--color-heading);
}

.placeholder {
  color: var(--color-text);
  opacity: 0.7;
}
</style>
