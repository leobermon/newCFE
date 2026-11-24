<script setup lang="ts">
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()

function goBack() {
  if (window.history.length > 1) {
    router.back()
  } else {
    router.push('/')
  }
}

function goHome() {
  router.push('/')
}
</script>

<template>
  <header class="app-header">
    <div class="brand">
      <span class="brand-logo-wrap">
        <img src="/logo-cfe.png" alt="CFE" class="brand-logo" />
      </span>
      <div class="brand-text">
        <span>Transmisión</span>
      </div>
    </div>

    <nav class="actions">
      <button type="button" class="nav-btn" :disabled="route.path === '/'" @click="goBack">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M15 18l-6-6 6-6"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        <span>Regresar</span>
      </button>
      <button type="button" class="nav-btn" :disabled="route.path === '/'" @click="goHome">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M4 11.5 12 4l8 7.5M6 10v9h4v-5h4v5h4v-9"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        <span>Inicio</span>
      </button>
    </nav>
  </header>
</template>

<style scoped>
.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.75rem 1.5rem;
  background: var(--cfe-green-dark);
  color: #fff;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
  position: sticky;
  top: 0;
  z-index: 10;
}

.brand {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.brand-logo-wrap {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  padding: 0.3rem 0.55rem;
  background: #fff;
  border-radius: 6px;
}

.brand-logo {
  display: block;
  height: 1.6rem;
  width: auto;
}

.brand-text {
  display: flex;
  flex-direction: column;
  line-height: 1.15;
}

.brand-text span {
  font-size: 0.85rem;
  opacity: 0.9;
}

.actions {
  display: flex;
  gap: 0.5rem;
}

.nav-btn {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.45rem 0.9rem;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.35);
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
  font-size: 0.85rem;
  cursor: pointer;
  transition:
    background 0.15s,
    opacity 0.15s;
}

.nav-btn svg {
  width: 1.1rem;
  height: 1.1rem;
}

.nav-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.2);
}

.nav-btn:disabled {
  opacity: 0.4;
  cursor: default;
}

@media (max-width: 480px) {
  .app-header {
    padding: 0.6rem 0.9rem;
  }

  .nav-btn {
    padding: 0.4rem 0.6rem;
  }

  .nav-btn span {
    display: none;
  }

  .brand-text span {
    display: none;
  }
}
</style>
