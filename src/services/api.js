import { useAuthStore } from '../stores/auth'
import router from '../router'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// fetch ne rejette que sur une erreur réseau (hors ligne, serveur arrêté
// pendant un déploiement, CORS) avec un message brut et propre à chaque
// navigateur : « Failed to fetch » (Chrome), « Load failed » (Safari),
// « NetworkError when attempting to fetch resource » (Firefox).
export async function requeteReseau(path, options) {
  try {
    return await fetch(`${BASE_URL}${path}`, options)
  } catch {
    throw new Error('Serveur injoignable. Vérifiez votre connexion internet.')
  }
}

async function handleResponse(response) {
  if (response.status === 401) {
    const authStore = useAuthStore()
    authStore.logout()
    router.push('/')
    throw new Error('Session expirée')
  }
  const data = await lireCorps(response)
  if (!response.ok) {
    throw new Error(messageErreur(data, response.status))
  }
  return data
}

// Corps lu en texte puis parsé : une réponse vide (204) ou non-JSON (page
// d'erreur nginx sur un 502) faisait lever un SyntaxError à response.json(),
// affiché tel quel à l'utilisateur (« Unexpected token '<' »).
export async function lireCorps(response) {
  const texte = await response.text()
  if (!texte) return null
  try {
    return JSON.parse(texte)
  } catch {
    return null
  }
}

// FastAPI renvoie `detail` en texte, ou en liste d'objets pour les erreurs de
// validation (422) — cette liste s'affichait « [object Object] ».
export function messageErreur(data, status) {
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
    requeteReseau(path, { headers: headers() }).then(handleResponse)

  const post = (path, body) =>
    requeteReseau(path, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(body)
    }).then(handleResponse)

  const put = (path, body) =>
    requeteReseau(path, {
      method: 'PUT',
      headers: headers(),
      body: JSON.stringify(body)
    }).then(handleResponse)

  const patch = (path, body) =>
    requeteReseau(path, {
      method: 'PATCH',
      headers: headers(),
      body: JSON.stringify(body)
    }).then(handleResponse)

  const del = (path) =>
    requeteReseau(path, {
      method: 'DELETE',
      headers: headers()
    }).then(handleResponse)

  return { get, post, put, patch, del }
}