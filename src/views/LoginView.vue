<template>
  <div class="login-container">
    <h1>Athletia</h1>
    <form @submit.prevent="handleLogin">
      <input v-model="email" type="email" placeholder="Email" required />
      <input v-model="password" type="password" placeholder="Mot de passe" required />
      <button type="submit">Se connecter</button>
      <p v-if="error" class="error">{{ error }}</p>
    </form>
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
    const router = useRouter()
    const authStore = useAuthStore()

    const handleLogin = async () => {
      try {
        const formData = new URLSearchParams()
        formData.append('username', email.value)
        formData.append('password', password.value)

        const response = await fetch('http://localhost:8000/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: formData
        })

        if (!response.ok) throw new Error('Identifiants incorrects')

        const data = await response.json()
        const payload = JSON.parse(atob(data.access_token.split('.')[1]))

        authStore.setAuth(data.access_token, payload.role)

        if (payload.role === 'athlete') router.push('/athlete')
        else if (payload.role === 'prepa') router.push('/prepa')
        else if (payload.role === 'admin') router.push('/admin')

      } catch (e) {
        error.value = e.message
      }
    }

    return { email, password, error, handleLogin }
  }
}
</script>

<style scoped>
.login-container {
  max-width: 400px;
  margin: 100px auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
input, button {
  padding: 12px;
  font-size: 16px;
  width: 100%;
}
.error { color: red; }
</style>