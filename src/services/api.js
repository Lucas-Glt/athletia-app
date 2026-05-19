import { useAuthStore } from '../stores/auth'
import router from '../router'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

async function handleResponse(response) {
  if (response.status === 401) {
    const authStore = useAuthStore()
    authStore.logout()
    router.push('/')
    throw new Error('Session expirée')
  }
  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.detail || 'Erreur serveur')
  }
  return data
}

export function useApi() {
  const authStore = useAuthStore()

  const headers = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${authStore.token}`
  })

  const get = (path) =>
    fetch(`${BASE_URL}${path}`, { headers: headers() }).then(handleResponse)

  const post = (path, body) =>
    fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(body)
    }).then(handleResponse)

  const patch = (path, body) =>
    fetch(`${BASE_URL}${path}`, {
      method: 'PATCH',
      headers: headers(),
      body: JSON.stringify(body)
    }).then(handleResponse)

  const del = (path) =>
    fetch(`${BASE_URL}${path}`, {
      method: 'DELETE',
      headers: headers()
    }).then(handleResponse)

  return { get, post, patch, del }
}