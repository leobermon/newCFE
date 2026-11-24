<script setup lang="ts">
import { RouterLink } from 'vue-router'
import MenuIcon from './MenuIcon.vue'

const props = defineProps<{
  to?: string
  href?: string
  title: string
  icon: InstanceType<typeof MenuIcon>['$props']['name']
}>()

const isExternal = !!props.href
</script>

<template>
  <component
    :is="isExternal ? 'a' : RouterLink"
    v-bind="isExternal ? { href, target: '_blank', rel: 'noopener' } : { to }"
    class="menu-button"
  >
    <span class="icon-wrap">
      <MenuIcon :name="icon" class="icon" />
    </span>
    <span class="title">{{ title }}</span>
  </component>
</template>

<style scoped>
.menu-button {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  padding: 0.7rem 1.1rem;
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  text-decoration: none;
  color: var(--color-heading);
  transition:
    transform 0.12s,
    border-color 0.12s,
    box-shadow 0.12s;
}

.menu-button:hover {
  border-color: var(--cfe-green);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.08);
  transform: translateY(-1px);
}

.icon-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 3rem;
  height: 3rem;
  flex-shrink: 0;
  border-radius: 8px;
  background: var(--color-background-mute);
  color: #4b4b4b;
}

.icon {
  width: 1.9rem;
  height: 1.9rem;
}

@media (max-width: 640px) {
  /* Cuadritos: icono arriba, nombre abajo. */
  .menu-button {
    flex-direction: column;
    justify-content: center;
    min-height: 5.2rem;
    padding: 0.4rem 0.3rem;
    gap: 0.3rem;
    text-align: center;
  }

  .icon-wrap {
    width: 2.3rem;
    height: 2.3rem;
  }

  .icon {
    width: 1.5rem;
    height: 1.5rem;
  }

  .title {
    font-size: 0.64rem;
    overflow-wrap: anywhere;
  }
}

.title {
  font-size: 1rem;
  font-weight: 600;
  letter-spacing: 0.01em;
  line-height: 1.25;
}
</style>
