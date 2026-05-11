<template>
  <div class="dashboard">
    <header>
      <h1>Mes Programmes</h1>
      <button @click="showForm = !showForm">+ Nouveau programme</button>
      <button @click="logout">Déconnexion</button>
    </header>

    <div v-if="showForm" class="form-card">
      <input v-model="newProgramme.nom" placeholder="Nom du programme" />
      <input v-model="newProgramme.description" placeholder="Description" />
      <button @click="createProgramme">Créer</button>
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
    const showForm = ref(false)
    const newProgramme = ref({ nom: '', description: '' })
    const router = useRouter()
    const authStore = useAuthStore()

    const fetchProgrammes = async () => {
      const response = await fetch('http://localhost:8000/programmes/', {
        headers: { Authorization: `Bearer ${authStore.token}` }
      })
      programmes.value = await response.json()
    }

    const createProgramme = async () => {
      await fetch('http://localhost:8000/programmes/', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authStore.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newProgramme.value)
      })
      newProgramme.value = { nom: '', description: '' }
      showForm.value = false
      fetchProgrammes()
    }

    const logout = () => {
      authStore.logout()
      router.push('/')
    }

    onMounted(fetchProgrammes)

    return { programmes, showForm, newProgramme, createProgramme, logout }
  }
}
</script>

<style scoped>
.dashboard { padding: 20px; }
header { display: flex; gap: 10px; align-items: center; }
.programme-card { border: 1px solid #ccc; padding: 16px; margin: 10px 0; border-radius: 8px; }
.form-card { background: #f5f5f5; padding: 16px; margin: 10px 0; border-radius: 8px; display: flex; flex-direction: column; gap: 8px; }
.actif { color: green; }
.bloque { color: red; }
</style>