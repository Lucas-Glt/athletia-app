<template>
  <div class="login-container">
    <div class="login-card">
      <div class="login-brand">
        <h1>Athletia</h1>
        <span>Plateforme de suivi sportif</span>
      </div>
      <InscriptionForm v-if="modeInscription" @inscrit="surInscription" @annuler="modeInscription = false" />

      <form v-else @submit.prevent="handleLogin" class="login-form">
        <p v-if="sessionExpiree" class="info-session">
          <i class="ti ti-clock"></i> Votre session a expiré : reconnectez-vous.
        </p>
        <div class="field">
          <!-- Email réel pour les comptes récents ; les anciens comptes se
               connectent encore avec l'identifiant donné par leur club
               (prenom.nom@athlete.club), tant qu'ils ne l'ont pas remplacé
               par leur email dans leur profil. -->
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
            placeholder="vous@exemple.fr"
            aria-describedby="aide-identifiant"
            required
          />
          <span id="aide-identifiant" class="aide-login">Votre email, ou l'identifiant fourni par votre club (prenom.nom@athlete.club).</span>
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
        <p class="aide-login aide-oubli">
          Mot de passe oublié ? Demandez à l'administrateur de votre club de le réinitialiser.
        </p>
        <button type="submit" class="btn btn-primary btn-login" :disabled="loading">
          <span v-if="loading">Connexion...</span>
          <span v-else>Se connecter</span>
        </button>
      </form>
    </div>

    <!-- Mot du prépa et notes de mise à jour (contenu : src/data/notesMaj.js) -->
    <aside class="maj-card" aria-labelledby="maj-titre">
      <div class="maj-entete">
        <span class="maj-icone"><i class="ti ti-speakerphone"></i></span>
        <h2 id="maj-titre">Le mot du prépa</h2>
      </div>
      <div class="maj-mot">
        <p v-for="(paragraphe, i) in MOT_DU_PREPA" :key="i">{{ paragraphe }}</p>
        <p class="maj-signature">{{ SIGNATURE_MOT }}</p>
      </div>

      <div v-if="derniereNote" class="maj-notes">
        <span class="section-title">Notes de mise à jour</span>
        <article class="maj-note maj-note-recente">
          <div class="maj-note-tete">
            <span class="maj-badge"><i class="ti ti-sparkles"></i> Nouveau</span>
            <span class="maj-date">{{ derniereNote.date }}</span>
          </div>
          <h3>{{ derniereNote.titre }}</h3>
          <ul>
            <li v-for="(point, i) in derniereNote.points" :key="i">{{ point }}</li>
          </ul>
        </article>

        <details v-if="notesPrecedentes.length" class="maj-precedentes">
          <summary><i class="ti ti-history"></i> Mises à jour précédentes</summary>
          <article v-for="note in notesPrecedentes" :key="note.date" class="maj-note">
            <span class="maj-date">{{ note.date }}</span>
            <h3>{{ note.titre }}</h3>
            <ul>
              <li v-for="(point, i) in note.points" :key="i">{{ point }}</li>
            </ul>
          </article>
        </details>
      </div>
    </aside>
  </div>
</template>

<script>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { lireCorps, messageErreur, requeteReseau, CLE_SESSION_EXPIREE } from '../services/api'
import { MOT_DU_PREPA, SIGNATURE_MOT, NOTES_MAJ } from '../data/notesMaj'
import InscriptionForm from '../components/InscriptionForm.vue'

const ROUTES_PAR_ROLE = {
  athlete: '/athlete',
  prepa: '/prepa',
  super_prepa: '/prepa',
  admin: '/admin',
  super_admin: '/super-admin'
}

export default {
  components: { InscriptionForm },
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

    const [derniereNote, ...notesPrecedentes] = NOTES_MAJ

    return {
      email, password, error, loading, handleLogin, sessionExpiree, modeInscription, surInscription,
      MOT_DU_PREPA, SIGNATURE_MOT, derniereNote, notesPrecedentes
    }
  }
}
</script>

<style scoped>
/* Connexion et mot du prépa côte à côte sur grand écran ; sur mobile, la
   connexion d'abord, le mot du prépa en dessous. */
.login-container {
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-xl);
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
.aide-login { font-size: var(--font-size-xs); color: var(--color-text-secondary); }
.aide-oubli { margin: 0; text-align: center; }
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

/* --- Mot du prépa et notes de mise à jour --- */
.maj-card {
  width: 100%;
  max-width: 440px;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
  padding: var(--spacing-2xl);
  background: var(--color-bg);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-card);
}
.maj-entete { display: flex; align-items: center; gap: var(--spacing-md); }
.maj-entete h2 { margin: 0; font-size: var(--font-size-lg); font-weight: 700; letter-spacing: -0.3px; }
.maj-icone {
  width: 40px; height: 40px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  border-radius: var(--radius-lg);
  background: var(--gradient-primary); color: var(--color-on-primary);
  font-size: 20px;
}
.maj-mot { display: flex; flex-direction: column; gap: var(--spacing-sm); }
.maj-mot p { margin: 0; font-size: var(--font-size-sm); line-height: 1.6; color: var(--color-text-body); }
.maj-mot .maj-signature { font-weight: 700; color: var(--color-primary-dark); }

.maj-notes {
  display: flex; flex-direction: column; gap: var(--spacing-md);
  padding-top: var(--spacing-lg); border-top: 1px solid var(--color-border);
}
.maj-note { display: flex; flex-direction: column; gap: 4px; }
.maj-note-recente {
  padding: var(--spacing-md) var(--spacing-lg);
  border-radius: var(--radius-lg);
  background: var(--color-primary-light);
}
.maj-note-tete { display: flex; align-items: center; justify-content: space-between; gap: var(--spacing-sm); flex-wrap: wrap; }
.maj-badge {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 2px 8px; border-radius: var(--radius-full);
  background: var(--color-primary); color: var(--color-on-primary);
  font-size: var(--font-size-xs); font-weight: 700;
}
.maj-date { font-size: var(--font-size-xs); font-weight: 600; color: var(--color-text-muted); }
.maj-note h3 { margin: 2px 0 0; font-size: var(--font-size-base); font-weight: 700; color: var(--color-text); }
.maj-note ul { margin: 0; padding-left: 18px; display: flex; flex-direction: column; gap: 4px; }
.maj-note li { font-size: var(--font-size-sm); line-height: 1.5; color: var(--color-text-body); }

.maj-precedentes summary {
  display: flex; align-items: center; gap: 6px;
  min-height: var(--tap-min);
  font-size: var(--font-size-sm); font-weight: 600; color: var(--color-primary-dark);
  cursor: pointer; list-style: none;
}
.maj-precedentes summary::-webkit-details-marker { display: none; }
.maj-precedentes[open] summary { margin-bottom: var(--spacing-sm); }
.maj-precedentes .maj-note + .maj-note { margin-top: var(--spacing-md); padding-top: var(--spacing-md); border-top: 1px solid var(--color-border); }

@media (max-width: 480px) {
  .maj-card { padding: var(--spacing-xl) var(--spacing-lg); }
}
</style>
