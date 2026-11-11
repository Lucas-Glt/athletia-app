<template>
  <div class="modal-overlay" @click.self="$emit('fermer')">
    <div class="modal">
      <div class="modal-header">
        <h3>Nouvelle organisation</h3>
        <button class="modal-close" @click="$emit('fermer')"><i class="ti ti-x"></i></button>
      </div>
      <div class="modal-body">
        <div class="field">
          <label>Nom</label>
          <input v-model="form.nom" placeholder="Les Ours de Toulouse" />
        </div>
        <div class="field">
          <label>Slug</label>
          <input v-model="form.slug" placeholder="ours" />
          <span class="domain-preview">Identifiant technique du club (minuscules, chiffres, tirets).</span>
        </div>
        <div class="section-title">Admin de l'organisation (obligatoire)</div>
        <div class="field">
          <label>Prénom</label>
          <input v-model="form.admin_prenom" autocomplete="off" />
        </div>
        <div class="field">
          <label>Nom</label>
          <input v-model="form.admin_nom" autocomplete="off" />
        </div>
        <div class="field">
          <label>Email</label>
          <input v-model="form.admin_email" type="email" autocomplete="off" placeholder="admin@club.fr" />
          <span class="domain-preview">Son identifiant de connexion.</span>
        </div>
        <div class="field">
          <label>Mot de passe</label>
          <input v-model="form.admin_password" type="password" autocomplete="new-password" placeholder="8 caractères minimum" />
        </div>
        <div v-if="error" class="error">{{ error }}</div>
      </div>
      <div class="modal-footer">
        <button class="btn" @click="$emit('fermer')">Annuler</button>
        <button class="btn btn-primary" @click="creer" :disabled="!formValide || loading">
          {{ loading ? 'Création...' : 'Créer' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed } from 'vue'
import { useApi } from '../../services/api'
import { erreurMotDePasse } from '../../utils/motDePasse'

export default {
  emits: ['fermer', 'creee'],
  setup(props, { emit }) {
    const api = useApi()
    const form = ref({ nom: '', slug: '', admin_email: '', admin_prenom: '', admin_nom: '', admin_password: '' })
    const error = ref('')
    const loading = ref(false)

    const formValide = computed(() =>
      form.value.nom && form.value.slug && form.value.admin_email && form.value.admin_prenom && form.value.admin_nom && form.value.admin_password
    )

    const creer = async () => {
      error.value = erreurMotDePasse(form.value.admin_password)
      if (error.value) return
      loading.value = true
      try {
        const admin = await api.post('/organisations/', form.value)
        emit('creee', admin)
      } catch (e) {
        error.value = e.message || 'Erreur lors de la création'
      } finally {
        loading.value = false
      }
    }

    return { form, error, loading, formValide, creer }
  }
}
</script>

<style scoped>
.domain-preview { font-size: var(--font-size-xs); color: var(--color-text-secondary); font-family: monospace; }
</style>
