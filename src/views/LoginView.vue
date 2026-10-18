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
          <!-- type="text" et non "email" : la validation native de type="email"
               bloque l'envoi sur certains identifiants valides côté serveur
               (ex. domaine super_prepa.fr), sans message clair sur mobile. -->
          <input
            v-model="email"
            type="text"
            inputmode="email"
            name="email"
            autocomplete="username"
            autocapitalize="none"
            autocorrect="off"
            spellcheck="false"
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
import { lireCorps, messageErreur, requeteReseau } from '../services/api'

const ROUTES_PAR_ROLE = {
  athlete: '/athlete',
  prepa: '/prepa',
  super_prepa: '/prepa',
  admin: '/admin',
  super_admin: '/super-admin'
}

export default {
  setup() {
    const email = ref('')
    const password = ref('')
    const error = ref('')
    const loading = ref(false)
    const router = useRouter()
    const authStore = useAuthStore()

    // La PWA installée démarre toujours sur start_url "/" : sans ça, un
    // utilisateur déjà connecté retombait sur le formulaire à chaque
    // ouverture de l'app. Un token expiré renverra un 401 depuis le
    // dashboard, qui déconnecte et ramène ici.
    if (authStore.isAuthenticated && ROUTES_PAR_ROLE[authStore.role]) {
      router.replace(ROUTES_PAR_ROLE[authStore.role])
    }

    const requete = async (path, options) => {
      const response = await requeteReseau(path, options)
      const data = await lireCorps(response)
      if (!response.ok) throw new Error(messageErreur(data, response.status))
      return data
    }

    const handleLogin = async () => {
      error.value = ''
      loading.value = true
      try {
        const formData = new URLSearchParams()
        formData.append('username', email.value.trim())
        formData.append('password', password.value)

        const { access_token } = await requete('/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: formData
        })
        // Rôle lu sur /users/me plutôt qu'en décodant le JWT à la main.
        const user = await requete('/users/me', {
          headers: { Authorization: `Bearer ${access_token}` }
        })
        const route = ROUTES_PAR_ROLE[user?.role]
        if (!route) throw new Error('Rôle de compte non reconnu')

        authStore.setAuth(access_token, user.role, user)
        router.push(route)
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
