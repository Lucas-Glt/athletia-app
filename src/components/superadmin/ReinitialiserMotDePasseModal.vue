<template>
  <div class="modal-overlay" @click.self="$emit('fermer')">
    <div class="modal">
      <div class="modal-header">
        <h3>Réinitialiser le mot de passe</h3>
        <button class="modal-close" @click="$emit('fermer')"><i class="ti ti-x"></i></button>
      </div>
      <div class="modal-body">
        <div class="user-cible-info">
          <div class="avatar">{{ initiales(user.nom) }}</div>
          <div>
            <div class="user-nom">{{ user.nom }}</div>
            <div class="user-email">{{ user.email }}</div>
          </div>
        </div>
        <div class="field">
          <label>Nouveau mot de passe</label>
          <input v-model="newPassword" type="password" placeholder="8 caractères minimum" />
        </div>
        <div v-if="error" class="error">{{ error }}</div>
        <div v-if="success" class="success">{{ success }}</div>
      </div>
      <div class="modal-footer">
        <button class="btn" @click="$emit('fermer')">Annuler</button>
        <button class="btn btn-primary" @click="reinitialiser" :disabled="!newPassword || loading">
          {{ loading ? 'Enregistrement...' : 'Enregistrer' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref } from 'vue'
import { useApi } from '../../services/api'

export default {
  emits: ['fermer'],
  props: {
    user: { type: Object, required: true }
  },
  setup(props) {
    const api = useApi()
    const newPassword = ref('')
    const error = ref('')
    const success = ref('')
    const loading = ref(false)

    const initiales = (nom) => nom.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

    const reinitialiser = async () => {
      error.value = ''
      success.value = ''
      if (newPassword.value.length < 8) {
        error.value = 'Le mot de passe doit faire au moins 8 caractères'
        return
      }
      loading.value = true
      try {
        await api.patch(`/users/${props.user.id}/password`, { nouveau_mdp: newPassword.value })
        success.value = 'Mot de passe modifié avec succès !'
      } catch (e) {
        error.value = e.message || 'Erreur lors de la réinitialisation'
      } finally {
        loading.value = false
      }
    }

    return { newPassword, error, success, loading, initiales, reinitialiser }
  }
}
</script>

<style scoped>
.user-cible-info {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  background: var(--color-bg-secondary);
  border-radius: var(--radius-lg);
}
.user-cible-info .user-nom { font-size: var(--font-size-sm); font-weight: 600; }
.user-cible-info .user-email { font-size: var(--font-size-xs); color: var(--color-text-secondary); }
.avatar {
  width: var(--avatar-md);
  height: var(--avatar-md);
  border-radius: 50%;
  background: var(--color-avatar-prepa-bg);
  color: var(--color-avatar-prepa-text);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--font-size-xs);
  font-weight: 600;
  flex-shrink: 0;
}
</style>
