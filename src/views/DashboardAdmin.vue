<template>
  <div class="dashboard">
    <header>
      <h1>Administration</h1>
      <button @click="logout">Déconnexion</button>
    </header>

    <section>
      <h2>Utilisateurs</h2>
      <button @click="showForm = !showForm">+ Nouvel utilisateur</button>

      <div v-if="showForm" class="form-card">
        <input v-model="newUser.nom" placeholder="Nom" />
        <input v-model="newUser.email" placeholder="Email" type="email" />
        <input v-model="newUser.password" placeholder="Mot de passe" type="password" />
        <select v-model="newUser.role">
          <option value="admin">Admin</option>
          <option value="prepa">Prépa physique</option>
          <option value="athlete">Athlète</option>
        </select>
        <button @click="createUser">Créer</button>
      </div>

      <div v-for="user in users" :key="user.id" class="user-card">
        <span>{{ user.nom }}</span>
        <span>{{ user.email }}</span>
        <span class="role">{{ user.role }}</span>
      </div>
    </section>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

export default {
  setup() {
    const users = ref([])
    const showForm = ref(false)
    const newUser = ref({ nom: '', email: '', password: '', role: 'athlete' })
    const router = useRouter()
    const authStore = useAuthStore()

    const fetchUsers = async () => {
      const response = await fetch('http://localhost:8000/users/', {
        headers: { Authorization: `Bearer ${authStore.token}` }
      })
      users.value = await response.json()
    }

    const createUser = async () => {
      await fetch('http://localhost:8000/users/', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authStore.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newUser.value)
      })
      newUser.value = { nom: '', email: '', password: '', role: 'athlete' }
      showForm.value = false
      fetchUsers()
    }

    const logout = () => {
      authStore.logout()
      router.push('/')
    }

    onMounted(fetchUsers)

    return { users, showForm, newUser, createUser, logout }
  }
}
</script>

<style scoped>
.dashboard { padding: 20px; }
header { display: flex; justify-content: space-between; align-items: center; }
.user-card { display: flex; gap: 16px; padding: 12px; border-bottom: 1px solid #eee; }
.form-card { background: #f5f5f5; padding: 16px; margin: 10px 0; border-radius: 8px; display: flex; flex-direction: column; gap: 8px; }
.role { color: #666; font-style: italic; }
</style>