import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// Version (package.json) y commit (git) que se muestran en el pie del menu principal.
const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8'))
function commitCorto() {
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()
  } catch {
    return 'sin-git'
  }
}

// https://vite.dev/config/
export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(version),
    __APP_COMMIT__: JSON.stringify(commitCorto()),
  },
  // Sin vite-plugin-vue-devtools: no se muestra el icono flotante de Vue en la pantalla.
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
