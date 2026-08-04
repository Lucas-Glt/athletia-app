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
  // Corps lu en texte puis parsé : une réponse vide (204) ou non-JSON (page
  // d'erreur nginx sur un 502) faisait lever un SyntaxError à response.json(),
  // affiché tel quel à l'utilisateur (« Unexpected token '<' »).
  const texte = await response.text()
  let data = null
  if (texte) {
    try {
      data = JSON.parse(texte)
    } catch {
      data = null
    }
  }

  if (!response.ok) {
    throw new Error(messageErreur(data, response.status))
  }
  return data
}

// FastAPI renvoie `detail` en texte, ou en liste d'objets pour les erreurs de
// validation (422) — cette liste s'affichait « [object Object] ».
function messageErreur(data, status) {
  const detail = data?.detail
  if (typeof detail === 'string' && detail) return detail
  if (Array.isArray(detail)) {
    const messages = detail.map(d => d?.msg).filter(Boolean)
    if (messages.length) return messages.join(', ')
  }
  return `Erreur serveur (${status})`
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

  const put = (path, body) =>
    fetch(`${BASE_URL}${path}`, {
      method: 'PUT',
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

  return { get, post, put, patch, del }
}