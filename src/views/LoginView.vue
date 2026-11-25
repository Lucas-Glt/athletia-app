<template>
  <div class="login-container">
    <!-- Nuit néon animée derrière les cartes (WebGL, en pause hors écran) -->
    <FondNeon class="login-fond" />
    <div class="login-card">
      <div class="login-brand">
        <LogoAnime class="login-logo" :taille="64" :delai="delaiLogo" />
        <h1>Athletia</h1>
        <span>Plateforme de suivi sportif</span>
      </div>
      <InscriptionForm v-if="modeInscription" @inscrit="surInscription" @annuler="modeInscription = false" />

      <!-- Mot de passe oublié : lien envoyé à l'adresse confirmée du compte
           (seulement si l'envoi d'emails est configuré sur le serveur). -->
      <form v-else-if="modeOubli" @submit.prevent="demanderLien" class="login-form">
        <p class="aide-login">Saisissez l'email de votre compte : vous recevrez un lien pour choisir un nouveau mot de passe.</p>
        <div class="field">
          <label for="oubli-email">Email</label>
          <input id="oubli-email" v-model="emailOubli" type="email" autocomplete="email" autocapitalize="none" required />
        </div>
        <p v-if="messageOubli" class="info-session" role="status"><i class="ti ti-mail"></i> {{ messageOubli }}</p>
        <p v-if="error" class="error">{{ error }}</p>
        <button type="submit" class="btn btn-primary btn-login" :disabled="loading">
          {{ loading ? 'Envoi…' : 'Recevoir le lien' }}
        </button>
        <button type="button" class="btn btn-ghost btn-creer-compte" @click="fermerOubli">Retour à la connexion</button>
        <p class="aide-login aide-oubli">
          Vous vous connectez avec un identifiant prenom.nom, ou votre email n'est pas confirmé ? Demandez à votre préparateur ou à l'administrateur de votre club.
        </p>
      </form>

      <form v-else @submit.prevent="handleLogin" class="login-form">
        <p v-if="sessionExpiree" class="info-session">
          <i class="ti ti-clock"></i> Votre session a expiré : reconnectez-vous.
        </p>
        <div class="field">
          <!-- Email réel pour les comptes récents ; les comptes créés avec un
               identifiant (prenom.nom@athlete.club…) se connectent avec ce
               prenom.nom seul, tant qu'ils ne l'ont pas remplacé par leur
               email dans leur profil. -->
          <label for="login-identifiant">Email ou identifiant</label>
          <!-- type="text" et non "email" : la validation native de type="email"
               bloque l'envoi sur certains identifiants valides côté serveur
               (ex. domaine super_prepa.fr), sans message clair sur mobile. -->
          <input
            id="login-identifiant"
            v-model="email"
            type="text"
            inputmode="email"
            name="email"
            autocomplete="username"
            autocapitalize="none"
            autocorrect="off"
            spellcheck="false"
            placeholder="prenom.nom ou vous@exemple.fr"
            aria-describedby="aide-identifiant"
            required
          />
          <span id="aide-identifiant" class="aide-login">Votre email, ou l'identifiant qui vous a été donné (prenom.nom).</span>
        </div>
        <div class="field">
          <label for="login-mdp">Mot de passe</label>
          <input
            id="login-mdp"
            v-model="password"
            type="password"
            name="password"
            autocomplete="current-password"
            placeholder="••••••••"
            required
          />
        </div>
        <p v-if="error" class="error">{{ error }}</p>
        <button type="button" class="btn btn-ghost btn-creer-compte" @click="modeInscription = true">
          <i class="ti ti-user-plus"></i> Créer un compte
        </button>
        <button v-if="emailsActifs" type="button" class="lien aide-login aide-oubli" @click="ouvrirOubli">Mot de passe oublié ?</button>
        <p v-else class="aide-login aide-oubli">
          Mot de passe oublié ? Demandez à votre préparateur ou à l'administrateur de votre club de le réinitialiser.
        </p>
        <button type="submit" class="btn btn-primary btn-login" :disabled="loading">
          <span v-if="loading">Connexion...</span>
          <span v-else>Se connecter</span>
        </button>
      </form>
      <button type="button" class="lien-politique" @click="politiqueOuverte = true">Politique de confidentialité</button>
    </div>
    <PolitiqueConfidentialite v-if="politiqueOuverte" @fermer="politiqueOuverte = false" />

  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { lireCorps, messageErreur, requeteReseau, CLE_SESSION_EXPIREE } from '../services/api'
import InscriptionForm from '../components/InscriptionForm.vue'
import PolitiqueConfidentialite from '../components/PolitiqueConfidentialite.vue'
import FondNeon from '../components/FondNeon.vue'
import LogoAnime from '../components/LogoAnime.vue'
import { DUREE_SPLASH_MS } from '../animations/mouvement'

const ROUTES_PAR_ROLE = {
  athlete: '/athlete',
  prepa: '/prepa',
  super_prepa: '/prepa',
  admin: '/admin',
  super_admin: '/super-admin'
}

export default {
  components: { InscriptionForm, PolitiqueConfidentialite, FondNeon, LogoAnime },
  setup() {
    const email = ref('')
    const password = ref('')
    const error = ref('')
    // Posé par services/api.js quand une requête revient en 401 : affiché
    // une fois, puis oublié.
    const lireSessionExpiree = () => {
      try {
        const expiree = sessionStorage.getItem(CLE_SESSION_EXPIREE) === '1'
        sessionStorage.removeItem(CLE_SESSION_EXPIREE)
        return expiree
      } catch {
        return false
      }
    }
    const sessionExpiree = ref(lireSessionExpiree())
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

    // Jeton obtenu (connexion ou inscription) : compte chargé, puis tableau
    // de bord du rôle.
    const modeInscription = ref(false)

    // Mot de passe oublié : proposé seulement si le serveur envoie des emails.
    const emailsActifs = ref(false)
    onMounted(async () => {
      try {
        emailsActifs.value = (await requete('/auth/options')).emails_actifs === true
      } catch {
        emailsActifs.value = false
      }
    })
    const modeOubli = ref(false)
    const emailOubli = ref('')
    const messageOubli = ref('')
    const ouvrirOubli = () => {
      error.value = ''
      messageOubli.value = ''
      emailOubli.value = email.value.includes('@') ? email.value.trim() : ''
      modeOubli.value = true
    }
    const fermerOubli = () => {
      error.value = ''
      modeOubli.value = false
    }
    const demanderLien = async () => {
      error.value = ''
      messageOubli.value = ''
      loading.value = true
      try {
        messageOubli.value = (await requete('/auth/mot-de-passe-oublie', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: emailOubli.value.trim() })
        })).message
      } catch (e) {
        error.value = e.message
      } finally {
        loading.value = false
      }
    }
    const finaliserConnexion = async (accessToken) => {
      // Rôle lu sur /users/me plutôt qu'en décodant le JWT à la main.
      const user = await requete('/users/me', {
        headers: { Authorization: `Bearer ${accessToken}` }
      })
      const route = ROUTES_PAR_ROLE[user?.role]
      if (!route) throw new Error('Rôle de compte non reconnu')
      authStore.setAuth(accessToken, user.role, user)
      router.push(route)
    }

    // Compte créé mais chargement raté (réseau) : le compte existe, on
    // repasse sur la connexion avec le message plutôt que de rester bloqué.
    const surInscription = async (accessToken) => {
      try {
        await finaliserConnexion(accessToken)
      } catch (e) {
        modeInscription.value = false
        error.value = `Compte créé : ${e.message}. Connectez-vous avec votre email.`
      }
    }

    const handleLogin = async () => {
      error.value = ''
      sessionExpiree.value = false
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
        await finaliserConnexion(access_token)
      } catch (e) {
        error.value = e.message
      } finally {
        loading.value = false
      }
    }

    const politiqueOuverte = ref(false)
    // À l'ouverture de l'appli, le logo de l'écran de chargement s'assemble
    // d'abord : celui de la carte prend le relais quand il s'efface.
    const delaiLogo = document.getElementById('splash')
      ? Math.max(150, DUREE_SPLASH_MS + 150 - performance.now())
      : 150

    return {
      email, password, error, loading, handleLogin, sessionExpiree, modeInscription, surInscription,
      politiqueOuverte, emailsActifs, modeOubli, emailOubli, messageOubli, ouvrirOubli, fermerOubli, demanderLien,
      delaiLogo
    }
  }
}
</script>

<style scoped>
/* La carte de connexion, centrée sur le fond de nuit. */
.login-container {
  position: relative;
  isolation: isolate;
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-xl);
  background: #0C0A22;
  padding: var(--spacing-xl);
}
/* Fixé à l'écran : si la page défile (inscription), le fond reste derrière. */
.login-fond { position: fixed; z-index: -1; }
/* Cartes posées sur la nuit : ombre profonde et liseré lavande */
.login-container { --shadow-sur-neon: 0 24px 60px -18px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(194, 188, 255, 0.14); }
.login-card {
  background: var(--color-bg);
  border-radius: var(--radius-xl);
  padding: var(--spacing-3xl) var(--spacing-2xl);
  width: 100%;
  max-width: 400px;
  box-shadow: var(--shadow-sur-neon);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2xl);
}
.login-brand { text-align: center; }
.login-logo { margin: 0 auto var(--spacing-md); }
.login-brand h1 {
  font-size: var(--font-size-2xl);
  font-weight: 700;
  color: var(--color-primary-dark);
  letter-spacing: -0.5px;
  margin: 0 0 4px;
}
.login-brand span { font-size: var(--font-size-sm); color: var(--color-text-secondary); }
.login-form { display: flex; flex-direction: column; gap: var(--spacing-lg); }
.aide-login { font-size: var(--font-size-xs); color: var(--color-text-secondary); }
.aide-oubli { margin: 0; text-align: center; }
.lien-politique {
  align-self: center;
  margin-top: calc(-1 * var(--spacing-md));
  background: none;
  border: none;
  padding: var(--spacing-xs);
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  text-decoration: underline;
  cursor: pointer;
}
.btn-creer-compte { width: 100%; }
.info-session {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius-md);
  background: var(--color-warning-bg-soft);
  color: var(--color-warning-text);
  font-size: var(--font-size-sm);
}
.btn-login {
  min-height: var(--input-h);
  font-size: var(--font-size-base);
  margin-top: var(--spacing-xs);
}
</style>
