<template>
  <AppLayout title="Administration plateforme">
    <template #nav>
      <div class="nav-item active">
        <i class="ti ti-building"></i> Organisations
      </div>
    </template>

    <template #actions>
      <button class="btn" @click="ouvrirCreationCompte()">
        <i class="ti ti-user-plus"></i> Créer un compte
      </button>
      <button class="btn btn-primary" @click="modalOrganisation = true">
        <i class="ti ti-plus"></i> Nouvelle organisation
      </button>
    </template>

    <CreerOrganisationModal
      v-if="modalOrganisation"
      @fermer="modalOrganisation = false"
      @creee="onOrganisationCreee"
    />

    <CreerCompteModal
      v-if="modalCompte"
      :organisations="organisations"
      :preselected-org-id="compteOrgPreselectionnee"
      @fermer="modalCompte = false"
      @creee="onCompteCree"
    />

    <ReinitialiserMotDePasseModal
      v-if="userCiblePassword"
      :user="userCiblePassword"
      @fermer="userCiblePassword = null"
    />

    <div class="admin-page">
      <div class="search-row">
        <i class="ti ti-search"></i>
        <input v-model="searchQuery" placeholder="Rechercher un athlète (nom ou email)" />
      </div>

      <div v-if="erreurAction" class="error">{{ erreurAction }}</div>

      <div v-if="loading" class="empty">Chargement...</div>
      <OrganisationTree
        v-else
        :organisations="organisationsAvecIndependant"
        :users="users"
        :search-query="searchQuery"
        @reassign="onReassign"
        @reset-password="ouvrirResetPassword"
        @delete="onDelete"
        @ajouter="ouvrirCreationCompte"
      />
    </div>
  </AppLayout>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { useApi } from '../services/api'
import AppLayout from '../components/AppLayout.vue'
import CreerOrganisationModal from '../components/superadmin/CreerOrganisationModal.vue'
import CreerCompteModal from '../components/superadmin/CreerCompteModal.vue'
import ReinitialiserMotDePasseModal from '../components/superadmin/ReinitialiserMotDePasseModal.vue'
import OrganisationTree from '../components/superadmin/OrganisationTree.vue'

const INDEPENDANT = { id: null, nom: 'Indépendant', slug: 'fr' }

export default {
  components: { AppLayout, CreerOrganisationModal, CreerCompteModal, ReinitialiserMotDePasseModal, OrganisationTree },
  setup() {
    const api = useApi()
    const organisations = ref([])
    const users = ref([])
    const loading = ref(false)
    const searchQuery = ref('')
    const erreurAction = ref('')

    const modalOrganisation = ref(false)
    const modalCompte = ref(false)
    const compteOrgPreselectionnee = ref(null)
    const userCiblePassword = ref(null)

    const organisationsAvecIndependant = computed(() => [...organisations.value, INDEPENDANT])

    const fetchTout = async () => {
      loading.value = true
      try {
        const [orgs, tousLesUsers] = await Promise.all([api.get('/organisations/'), api.get('/users/')])
        organisations.value = orgs
        users.value = tousLesUsers
      } finally {
        loading.value = false
      }
    }

    const onOrganisationCreee = (admin) => {
      organisations.value.push(admin.organisation)
      users.value.push(admin)
      modalOrganisation.value = false
    }

    const ouvrirCreationCompte = (orgId = null) => {
      compteOrgPreselectionnee.value = orgId
      modalCompte.value = true
    }

    const onCompteCree = (compte) => {
      users.value.push(compte)
      modalCompte.value = false
    }

    const ouvrirResetPassword = (user) => {
      userCiblePassword.value = user
    }

    const onReassign = async (user, nouvelleOrgId) => {
      erreurAction.value = ''
      try {
        const data = await api.patch(`/users/${user.id}/organisation`, { organisation_id: nouvelleOrgId })
        const idx = users.value.findIndex((u) => u.id === user.id)
        if (idx !== -1) users.value[idx] = data
      } catch (e) {
        erreurAction.value = e.message || 'Erreur lors de la réassignation'
      }
    }

    const onDelete = async (user) => {
      if (!confirm(`Supprimer "${user.nom}" ? Cette action est irréversible.`)) return
      erreurAction.value = ''
      try {
        await api.del(`/users/${user.id}`)
        users.value = users.value.filter((u) => u.id !== user.id)
      } catch (e) {
        erreurAction.value = e.message || 'Erreur lors de la suppression'
      }
    }

    onMounted(fetchTout)

    return {
      organisations, users, loading, searchQuery, erreurAction,
      modalOrganisation, modalCompte, compteOrgPreselectionnee, userCiblePassword,
      organisationsAvecIndependant,
      onOrganisationCreee, ouvrirCreationCompte, onCompteCree,
      ouvrirResetPassword, onReassign, onDelete
    }
  }
}
</script>

<style scoped>
.admin-page {
  flex: 1;
  padding: var(--spacing-xl) var(--spacing-2xl);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
  overflow-y: auto;
}

.search-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: 0 var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg);
  max-width: 420px;
}
.search-row i { color: var(--color-text-muted); }
.search-row input {
  flex: 1;
  min-height: var(--tap-min);
  border: none;
  outline: none;
  background: transparent;
  font-size: var(--font-size-base);
}

@media (max-width: 768px) {
  .admin-page { padding: var(--spacing-md) var(--spacing-lg); }
  .search-row { max-width: none; }
}
</style>
