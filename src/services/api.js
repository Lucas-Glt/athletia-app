import { useAuthStore } from '../stores/auth'

const BASE_URL = 'http://localhost:8000'

export function useApi() {
  const authStore = useAuthStore()

  const headers = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${authStore.token}`
  })

  const get = (path) =>
    fetch(`${BASE_URL}${path}`, { headers: headers() }).then(r => r.json())

  const post = (path, body) =>
    fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(body)
    }).then(r => r.json())

  const patch = (path, body) =>
    fetch(`${BASE_URL}${path}`, {
      method: 'PATCH',
      headers: headers(),
      body: JSON.stringify(body)
    }).then(r => r.json())

  const del = (path) =>
    fetch(`${BASE_URL}${path}`, {
      method: 'DELETE',
      headers: headers()
    }).then(r => r.json())

  return { get, post, patch, del }
}