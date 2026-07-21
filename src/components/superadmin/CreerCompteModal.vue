<template>
  <div class="modal-overlay" @click.self="$emit('fermer')">
    <div class="modal">
      <div class="modal-header">
        <h3>Créer un compte</h3>
        <button class="modal-close" @click="$emit('fermer')"><i class="ti ti-x"></i></button>
      </div>
      <div class="modal-body">
        <div class="field">
          <label>Rôle</label>
          <select v-model="form.role">
            <option value="athlete">Athlète</option>
            <option value="prepa">Préparateur physique</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <div class="field">
          <label>Organisation</label>
          <select v-model="organisationIdSelectionnee">
            <option :value="null">Indépendant</option>
            <option v-for="org in organisations" :key="org.id" :value="org.id">{{ org.nom }}</option>
          </select>
        </div>
        <div class="field">
          <label>Identifiant</label>
          <input v-model="form.identifiant" placeholder="prenom.nom" />
          <span class="domain-preview" v-if="form.identifiant">
            → {{ form.identifiant }}@{{ form.role }}.{{ domaine }}
          </span>
        </div>
        <div class="field">
          <label>Mot de passe</label>
          <input v-model="form.password" type="password" placeholder="••••••••" />
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

export default {
  emits: ['fermer', 'creee'],
  props: {
    organisations: { type: Array, default: () => [] },
    preselectedOrgId: { type: Number, default: null }
  },
  setup(props, { emit }) {
    const api = useApi()
    const form = ref({ identifiant: '', password: '', role: 'athlete' })
    const organisationIdSelectionnee = ref(props.preselectedOrgId)
    const error = ref('')
    const loading = ref(false)

    const domaine = computed(() => {
      const org = props.organisations.find(o => o.id === organisationIdSelectionnee.value)
      return org ? org.slug : 'fr'
    })

    const formValide = computed(() => form.value.identifiant && form.value.password)

    const creer = async () => {
      error.value = ''
      loading.value = true
      try {
        const compte = await api.post('/users/comptes', {
          ...form.value,
          organisation_id: organisationIdSelectionnee.value
        })
        emit('creee', compte)
      } catch (e) {
        error.value = e.message || 'Erreur lors de la création'
      } finally {
        loading.value = false
      }
    }

    return { form, organisationIdSelectionnee, error, loading, domaine, formValide, creer }
  }
}
</script>

<style scoped>
.domain-preview { font-size: var(--font-size-xs); color: var(--color-text-secondary); font-family: monospace; }
</style>
