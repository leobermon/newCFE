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
  gap: 1rem;
  padding: 1.1rem 1.4rem;
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
  width: 4rem;
  height: 4rem;
  flex-shrink: 0;
  border-radius: 8px;
  background: var(--color-background-mute);
  color: #4b4b4b;
}

.icon {
  width: 2.5rem;
  height: 2.5rem;
}

@media (max-width: 640px) {
  .menu-button {
    padding: 0.9rem 1.1rem;
    gap: 0.85rem;
  }

  .icon-wrap {
    width: 3.25rem;
    height: 3.25rem;
  }

  .icon {
    width: 2rem;
    height: 2rem;
  }

  .title {
    font-size: 0.9rem;
  }
}

.title {
  font-size: 1rem;
  font-weight: 600;
  letter-spacing: 0.01em;
  line-height: 1.25;
}
</style>
