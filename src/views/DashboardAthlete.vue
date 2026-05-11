<template>
  <div class="dashboard">
    <header>
      <h1>Mes Programmes</h1>
      <button @click="logout">Déconnexion</button>
    </header>

    <div v-if="programmes.length === 0">
      <p>Aucun programme assigné pour le moment.</p>
    </div>

    <div v-for="programme in programmes" :key="programme.id" class="programme-card">
      <h2>{{ programme.nom }}</h2>
      <p>{{ programme.description }}</p>
      <span :class="programme.statut">{{ programme.statut }}</span>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

export default {
  setup() {
    const programmes = ref([])
    const router = useRouter()
    const authStore = useAuthStore()

    const fetchProgrammes = async () => {
      const response = await fetch('http://localhost:8000/programmes/', {
        headers: { Authorization: `Bearer ${authStore.token}` }
      })
      programmes.value = await response.json()
    }

    const logout = () => {
      authStore.logout()
      router.push('/')
    }

    onMounted(fetchProgrammes)

    return { programmes, logout }
  }
}
</script>

<style scoped>
.dashboard { padding: 20px; }
header { display: flex; justify-content: space-between; align-items: center; }
.programme-card { border: 1px solid #ccc; padding: 16px; margin: 10px 0; border-radius: 8px; }
.actif { color: green; }
.bloque { color: red; }
</style>