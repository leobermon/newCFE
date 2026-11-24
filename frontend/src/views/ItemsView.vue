<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { itemsApi, type Item } from '@/services/api'

const items = ref<Item[]>([])
const name = ref('')
const description = ref('')
const loading = ref(false)
const error = ref('')

async function load() {
  loading.value = true
  error.value = ''
  try {
    items.value = await itemsApi.list()
  } catch (e) {
    error.value = 'No se pudo conectar con el backend. ¿Está corriendo en el puerto 3000?'
  } finally {
    loading.value = false
  }
}

async function addItem() {
  if (!name.value.trim()) return
  await itemsApi.create({ name: name.value, description: description.value || undefined })
  name.value = ''
  description.value = ''
  await load()
}

async function removeItem(id: number) {
  await itemsApi.remove(id)
  await load()
}

onMounted(load)
</script>

<template>
  <main class="items">
    <h1>Items</h1>
    <p v-if="error" class="error">{{ error }}</p>

    <form @submit.prevent="addItem">
      <input v-model="name" placeholder="Nombre" required />
      <input v-model="description" placeholder="Descripción (opcional)" />
      <button type="submit">Agregar</button>
    </form>

    <p v-if="loading">Cargando...</p>
    <ul v-else>
      <li v-for="item in items" :key="item.id">
        <strong>{{ item.name }}</strong>
        <span v-if="item.description"> — {{ item.description }}</span>
        <button @click="removeItem(item.id)">Eliminar</button>
      </li>
    </ul>
  </main>
</template>

<style scoped>
.items {
  max-width: 40rem;
  margin: 0 auto;
  padding: 1rem;
}
form {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}
.error {
  color: #c0392b;
}
li {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0;
}
</style>
