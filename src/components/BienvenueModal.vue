<template>
  <!-- Message de bienvenue : une fois par compte (enregistré sur le serveur,
       donc pas réaffiché sur un autre appareil). Après l'accord à la
       politique de confidentialité s'il était demandé. -->
  <div class="modal-overlay" @click.self="fermer()">
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="bienvenue-titre">
      <div class="modal-header">
        <h3 id="bienvenue-titre">Bienvenue sur Athletia{{ prenom ? `, ${prenom}` : '' }} !</h3>
        <button type="button" class="modal-close" @click="fermer()" aria-label="Fermer"><i class="ti ti-x"></i></button>
      </div>
      <div class="modal-body">
        <p v-if="user.identifiant_court" class="texte">
          Pour vous connecter, tapez simplement <b class="identifiant">{{ user.identifiant_court }}</b> avec votre mot de passe.
        </p>
        <p v-else class="texte">
          Pour vous connecter : votre email <b class="identifiant">{{ user.email }}</b> et votre mot de passe.
        </p>
        <div>
          <p class="texte">Pour bien commencer :</p>
          <ul class="texte">
            <li v-if="!user.inscription_libre">
              Changez le mot de passe qui vous a été donné (menu de votre avatar, en haut à droite).
            </li>
            <li>Complétez votre profil : {{ user.role === 'athlete' ? 'photo, email, sports pratiqués…' : 'photo, email…' }}</li>
          </ul>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn" @click="fermer('profil')">
          <i class="ti ti-user-edit"></i> Compléter mon profil
        </button>
        <button type="button" class="btn btn-primary" @click="fermer()">C'est parti</button>
      </div>
    </div>
  </div>
</template>

<script>
import { computed } from 'vue'
import { useApi } from '../services/api'
import { useAuthStore } from '../stores/auth'

export default {
  emits: ['ferme', 'profil'],
  setup(_, { emit }) {
    const { post } = useApi()
    const authStore = useAuthStore()
    const user = computed(() => authStore.user || {})
    const prenom = computed(() => (user.value.nom || '').trim().split(/\s+/)[0])

    // Fermé tout de suite ; « vu » enregistré en arrière-plan. Hors réseau,
    // le message reviendra simplement à la prochaine ouverture.
    const fermer = async (suite) => {
      emit('ferme')
      if (suite === 'profil') emit('profil')
      try {
        const compte = await post('/users/me/bienvenue')
        authStore.setAuth(authStore.token, compte.role, compte)
      } catch (e) {
        console.error('Message de bienvenue non enregistré comme vu :', e)
      }
    }

    return { user, prenom, fermer }
  }
}
</script>

<style scoped>
.texte { margin: 0; font-size: var(--font-size-sm); line-height: 1.5; }
ul.texte { padding-left: 1.2em; display: flex; flex-direction: column; gap: 4px; margin-top: 4px; }
.identifiant { color: var(--color-primary-text); overflow-wrap: anywhere; }
</style>
