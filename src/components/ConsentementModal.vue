<template>
  <!-- Accord à la politique de confidentialité pour les comptes créés par un
       club ou le super admin, avant la case d'inscription. Demandé une fois et
       bloquant : une bannière qu'on ferme ne vaudrait pas accord. -->
  <div class="modal-overlay accord-overlay">
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="accord-titre">
      <div class="modal-header">
        <h3 id="accord-titre">Politique de confidentialité</h3>
      </div>
      <div class="modal-body">
        <p class="accord-texte">
          Athletia enregistre vos données d'entraînement et de santé (forme, blessures, poids, alimentation)
          pour votre suivi sportif. Avant de continuer, merci de lire et d'accepter notre
          <button type="button" class="lien" @click="politiqueOuverte = true">politique de confidentialité</button>.
        </p>
        <label class="case-accord">
          <input v-model="accepte" type="checkbox" />
          <span>J'accepte la politique de confidentialité, y compris le traitement de mes données de santé pour mon suivi sportif.</span>
        </label>
        <p class="aide">Vous ne souhaitez pas accepter ? Déconnectez-vous et écrivez à {{ CONTACT }}.</p>
        <p v-if="erreur" class="error" role="alert">{{ erreur }}</p>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn" @click="$emit('deconnexion')">Se déconnecter</button>
        <button type="button" class="btn btn-primary" :disabled="!accepte || envoi" @click="accepter">
          {{ envoi ? 'Enregistrement…' : 'Continuer' }}
        </button>
      </div>
    </div>
    <PolitiqueConfidentialite v-if="politiqueOuverte" @fermer="politiqueOuverte = false" />
  </div>
</template>

<script>
import { ref } from 'vue'
import { useApi } from '../services/api'
import { useAuthStore } from '../stores/auth'
import { CONTACT } from '../data/confidentialite'
import PolitiqueConfidentialite from './PolitiqueConfidentialite.vue'

export default {
  components: { PolitiqueConfidentialite },
  emits: ['deconnexion'],
  setup() {
    const { post } = useApi()
    const authStore = useAuthStore()
    const accepte = ref(false)
    const envoi = ref(false)
    const erreur = ref('')
    const politiqueOuverte = ref(false)

    // Le compte relu (avec la date de l'accord) ferme la fenêtre.
    const accepter = async () => {
      erreur.value = ''
      envoi.value = true
      try {
        const user = await post('/users/me/consentement')
        authStore.setAuth(authStore.token, user.role, user)
      } catch (e) {
        erreur.value = e.message
      } finally {
        envoi.value = false
      }
    }

    return { CONTACT, accepte, envoi, erreur, politiqueOuverte, accepter }
  }
}
</script>

<style scoped>
/* Au-dessus de tout le reste (bannières, célébrations, installation PWA) :
   rien ne doit être cliquable avant l'accord. */
.accord-overlay { z-index: 500; }
.accord-texte { margin: 0; font-size: var(--font-size-sm); line-height: 1.5; }
.aide { margin: 0; font-size: var(--font-size-xs); color: var(--color-text-secondary); }
</style>
