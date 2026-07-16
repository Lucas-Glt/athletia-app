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
        <button type="submit" class="btn btn-primary btn-login" :disabled="loading">
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

        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/auth/login`, {
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

        const userResponse = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/users/me`, {
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
.login-container {
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg-app);
  padding: var(--spacing-xl);
}
.login-card {
  background: var(--color-bg);
  border-radius: var(--radius-xl);
  padding: var(--spacing-3xl) var(--spacing-2xl);
  width: 100%;
  max-width: 400px;
  box-shadow: var(--shadow-card);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2xl);
}
.login-brand { text-align: center; }
.login-brand h1 {
  font-size: var(--font-size-2xl);
  font-weight: 700;
  color: var(--color-primary-dark);
  letter-spacing: -0.5px;
  margin: 0 0 4px;
}
.login-brand span { font-size: var(--font-size-sm); color: var(--color-text-secondary); }
.login-form { display: flex; flex-direction: column; gap: var(--spacing-lg); }
.btn-login {
  min-height: var(--input-h);
  font-size: var(--font-size-base);
  margin-top: var(--spacing-xs);
}
</style>
