<template>
  <!-- Liens reçus par email (accessibles sans être connecté) :
       /confirmer-email?jeton=…      confirme l'adresse du compte
       /nouveau-mot-de-passe?jeton=… choisit un nouveau mot de passe -->
  <div class="lien-container">
    <div class="lien-card">
      <h1>Athletia</h1>

      <template v-if="!jeton">
        <p class="error">Ce lien est incomplet : ouvrez-le directement depuis l'email reçu.</p>
      </template>

      <template v-else-if="action === 'confirmer'">
        <p v-if="etat === 'envoi'" class="info"><i class="ti ti-loader-2"></i> Confirmation de votre adresse…</p>
        <p v-else-if="etat === 'ok'" class="success"><i class="ti ti-circle-check"></i> {{ message }}</p>
        <p v-else class="error">{{ message }}</p>
        <button v-if="etat !== 'envoi'" type="button" class="btn btn-primary" @click="ouvrirApp">Ouvrir Athletia</button>
      </template>

      <template v-else>
        <form v-if="etat !== 'ok'" class="lien-form" @submit.prevent="changerMotDePasse">
          <p class="info">Choisissez votre nouveau mot de passe.</p>
          <div class="field">
            <label for="lien-mdp">Nouveau mot de passe</label>
            <input id="lien-mdp" v-model="mdp" type="password" autocomplete="new-password" placeholder="8 caractères minimum" required />
          </div>
          <div class="field">
            <label for="lien-mdp2">Confirmation</label>
            <input id="lien-mdp2" v-model="confirmation" type="password" autocomplete="new-password" required />
          </div>
          <p v-if="message" class="error" role="alert">{{ message }}</p>
          <button type="submit" class="btn btn-primary" :disabled="etat === 'envoi'">
            {{ etat === 'envoi' ? 'Enregistrement…' : 'Changer mon mot de passe' }}
          </button>
        </form>
        <template v-else>
          <p class="success"><i class="ti ti-circle-check"></i> {{ message }}</p>
          <button type="button" class="btn btn-primary" @click="ouvrirApp">Se connecter</button>
        </template>
      </template>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { lireCorps, messageErreur, requeteReseau } from '../services/api'
import { erreurMotDePasse } from '../utils/motDePasse'

export default {
  setup() {
    const route = useRoute()
    const router = useRouter()
    const action = route.name === 'confirmer-email' ? 'confirmer' : 'reinitialiser'
    const jeton = typeof route.query.jeton === 'string' ? route.query.jeton : ''
    const etat = ref('')
    const message = ref('')
    const mdp = ref('')
    const confirmation = ref('')

    const envoyer = async (chemin, corps) => {
      const response = await requeteReseau(chemin, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(corps)
      })
      const data = await lireCorps(response)
      if (!response.ok) throw new Error(messageErreur(data, response.status))
      return data
    }

    onMounted(async () => {
      if (action !== 'confirmer' || !jeton) return
      etat.value = 'envoi'
      try {
        const data = await envoyer('/auth/verifier-email', { token: jeton })
        message.value = `${data.message} (${data.email})`
        etat.value = 'ok'
      } catch (e) {
        message.value = e.message
        etat.value = 'erreur'
      }
    })

    const changerMotDePasse = async () => {
      message.value = erreurMotDePasse(mdp.value)
      if (!message.value && mdp.value !== confirmation.value) message.value = 'Les mots de passe ne correspondent pas'
      if (message.value) return
      etat.value = 'envoi'
      try {
        message.value = (await envoyer('/auth/reinitialiser', { token: jeton, nouveau_mdp: mdp.value })).message
        etat.value = 'ok'
      } catch (e) {
        message.value = e.message
        etat.value = 'erreur'
      }
    }

    // Connecté sur cet appareil : l'écran de connexion renvoie au tableau de bord.
    const ouvrirApp = () => router.push({ name: 'login' })

    return { action, jeton, etat, message, mdp, confirmation, changerMotDePasse, ouvrirApp }
  }
}
</script>

<style scoped>
.lien-container {
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg-app);
  padding: var(--spacing-xl);
}
.lien-card {
  background: var(--color-bg);
  border-radius: var(--radius-xl);
  padding: var(--spacing-2xl);
  width: 100%;
  max-width: 400px;
  box-shadow: var(--shadow-card);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}
.lien-card h1 { margin: 0; text-align: center; font-size: var(--font-size-2xl); color: var(--color-primary-dark); }
.lien-form { display: flex; flex-direction: column; gap: var(--spacing-lg); }
.info, .success, .error { margin: 0; font-size: var(--font-size-sm); line-height: 1.5; }
.success { color: var(--color-valid-text-strong); }
</style>
