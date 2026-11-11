import { useAuthStore } from '../stores/auth'
import router from '../router'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// fetch natif n'a pas de timeout : une connexion qui stagne (4G qui dégrade
// plutôt que de couper franchement, salle en sous-sol) laisse la promesse
// pendue indéfiniment au lieu de rejeter — le bouton reste bloqué "en cours"
// sans jamais signaler d'erreur à l'athlète.
const TIMEOUT_MS = 15000

// fetch ne rejette que sur une erreur réseau (hors ligne, serveur arrêté
// pendant un déploiement, CORS) avec un message brut et propre à chaque
// navigateur : « Failed to fetch » (Chrome), « Load failed » (Safari),
// « NetworkError when attempting to fetch resource » (Firefox). Un abandon
// par timeout rejette de la même façon (AbortError) et tombe dans le même
// message : du point de vue de l'athlète, stagner ou échouer, c'est pareil.
export async function requeteReseau(path, options) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    return await fetch(`${BASE_URL}${path}`, { ...options, signal: controller.signal })
  } catch {
    throw new Error('Serveur injoignable. Vérifiez votre connexion internet.')
  } finally {
    clearTimeout(timeoutId)
  }
}

// Lu par l'écran de connexion : sans ça, une session expirée renvoyait sur
// le formulaire sans un mot d'explication.
export const CLE_SESSION_EXPIREE = 'athletia:session-expiree'

async function handleResponse(response) {
  if (response.status === 401) {
    const authStore = useAuthStore()
    authStore.logout()
    try {
      sessionStorage.setItem(CLE_SESSION_EXPIREE, '1')
    } catch {
      // stockage indisponible : la reconnexion se fera sans le message
    }
    router.push('/')
    throw new Error('Session expirée')
  }
  const data = await lireCorps(response)
  if (!response.ok) {
    // status et corps joints à l'erreur : certains écrans réagissent à un
    // refus précis (ex. 409 « transfert requis » à la suppression d'un compte).
    const erreur = new Error(messageErreur(data, response.status))
    erreur.status = response.status
    erreur.data = data
    throw erreur
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
  // Refus détaillé ({ code, message, … }) : le message est fait pour l'écran.
  if (typeof detail?.message === 'string' && detail.message) return detail.message
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