<template>
  <div class="dashboard">
    <header>
      <h1>Athletia — Préparateur</h1>
      <div class="header-actions">
        <button @click="vue = 'form'" v-if="vue === 'liste'">+ Nouveau programme</button>
        <button @click="logout">Déconnexion</button>
      </div>
    </header>

    <!-- Formulaire création -->
    <ProgrammeForm v-if="vue === 'form'" @termine="onTermine" />

    <!-- Liste des programmes -->
    <div v-if="vue === 'liste'">
      <div v-if="programmes.length === 0" class="empty">Aucun programme. Créez-en un !</div>
      <div v-for="p in programmes" :key="p.id" class="programme-card">
        <div class="programme-header">
          <h2>{{ p.nom }}</h2>
          <span :class="['tag', p.statut]">{{ p.statut }}</span>
        </div>
        <p v-if="p.description" class="description">{{ p.description }}</p>
        <div v-if="p.athletes.length > 0" class="athletes">
          <span>Athlètes : </span>
          <span v-for="a in p.athletes" :key="a.id" class="athlete-tag">{{ a.nom }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useApi } from '../services/api'
import ProgrammeForm from '../components/prepa/ProgrammeForm.vue'

export default {
  components: { ProgrammeForm },
  setup() {
    const programmes = ref([])
    const vue = ref('liste')
    const router = useRouter()
    const authStore = useAuthStore()
    const api = useApi()

    const fetchProgrammes = async () => {
      programmes.value = await api.get('/programmes/')
    }

    const onTermine = () => {
      vue.value = 'liste'
      fetchProgrammes()
    }

    const logout = () => {
      authStore.logout()
      router.push('/')
    }

    onMounted(fetchProgrammes)

    return { programmes, vue, onTermine, logout }
  }
}
</script>

<style scoped>
.dashboard { padding: 24px; max-width: 900px; margin: 0 auto; }
header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.header-actions { display: flex; gap: 10px; }
button { padding: 8px 16px; background: #2563eb; color: white; border: none; border-radius: 6px; cursor: pointer; }
.programme-card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 12px; }
.programme-header { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
.description { color: #6b7280; font-size: 14px; margin-bottom: 8px; }
.tag { font-size: 12px; padding: 2px 8px; border-radius: 12px; }
.tag.actif { background: #dcfce7; color: #16a34a; }
.tag.bloque { background: #fee2e2; color: #dc2626; }
.athletes { display: flex; gap: 8px; align-items: center; font-size: 14px; flex-wrap: wrap; }
.athlete-tag { background: #dbeafe; color: #1d4ed8; padding: 2px 8px; border-radius: 12px; font-size: 12px; }
.empty { color: #9ca3af; text-align: center; padding: 40px; }
</style>