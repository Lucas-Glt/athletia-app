<template>
  <div class="login-container">
    <div class="login-card">
      <div class="login-brand">
        <h1>Athletia</h1>
        <span>Plateforme de suivi sportif</span>
      </div>
      <form @submit.prevent="handleLogin" class="login-form">
        <div class="field">
          <label>Email</label>
          <input
            v-model="email"
            type="email"
            name="email"
            autocomplete="email"
            placeholder="votre@email.com"
            required
          />
        </div>
        <div class="field">
          <label>Mot de passe</label>
          <input
            v-model="password"
            type="password"
            name="password"
            autocomplete="current-password"
            placeholder="••••••••"
            required
          />
        </div>
        <p v-if="error" class="error">{{ error }}</p>
        <button type="submit" :disabled="loading">
          <span v-if="loading">Connexion...</span>
          <span v-else>Se connecter</span>
        </button>
      </form>
    </div>
  </div>
</template>

<script>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

export default {
  setup() {
    const email = ref('')
    const password = ref('')
    const error = ref('')
    const loading = ref(false)
    const router = useRouter()
    const authStore = useAuthStore()

    const handleLogin = async () => {
      error.value = ''
      loading.value = true
      try {
        const formData = new URLSearchParams()
        formData.append('username', email.value)
        formData.append('password', password.value)

        const response = await fetch('http://localhost:8000/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: formData
        })

        if (response.status === 429) {
          const data = await response.json()
          throw new Error(data.detail || 'Trop de tentatives. Réessayez dans 15 minutes.')
        }

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.detail || 'Identifiants incorrects')
        }

        const data = await response.json()
        const payload = JSON.parse(atob(data.access_token.split('.')[1]))

        const userResponse = await fetch('http://localhost:8000/users/me', {
          headers: { Authorization: `Bearer ${data.access_token}` }
        })
        const user = await userResponse.json()

        authStore.setAuth(data.access_token, payload.role, user)

        if (payload.role === 'athlete') router.push('/athlete')
        else if (payload.role === 'prepa') router.push('/prepa')
        else if (payload.role === 'admin') router.push('/admin')

      } catch (e) {
        error.value = e.message
      } finally {
        loading.value = false
      }
    }

    return { email, password, error, loading, handleLogin }
  }
}
</script>

<style scoped>
* { box-sizing: border-box; }
.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f3f4f6;
  padding: 20px;
}
.login-card {
  background: white;
  border-radius: 12px;
  padding: 36px 32px;
  width: 100%;
  max-width: 400px;
  box-shadow: 0 4px 24px rgba(0,0,0,0.08);
  display: flex;
  flex-direction: column;
  gap: 24px;
}
.login-brand { text-align: center; }
.login-brand h1 { font-size: 24px; font-weight: 700; color: #7F77DD; letter-spacing: -0.5px; margin: 0 0 4px; }
.login-brand span { font-size: 13px; color: #9ca3af; }
.login-form { display: flex; flex-direction: column; gap: 14px; }
.field { display: flex; flex-direction: column; gap: 5px; }
.field label { font-size: 12px; font-weight: 500; color: #374151; }
.field input {
  padding: 10px 14px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 14px;
  transition: border-color 0.15s;
}
.field input:focus { outline: none; border-color: #7F77DD; }
button {
  padding: 11px;
  background: #7F77DD;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  margin-top: 4px;
  transition: background 0.15s;
}
button:hover:not(:disabled) { background: #534AB7; }
button:disabled { opacity: 0.6; cursor: not-allowed; }
.error { font-size: 12px; color: #dc2626; background: #fee2e2; padding: 8px 12px; border-radius: 6px; margin: 0; }
</style>