<template>
  <AppLayout title="Administration plateforme">
    <template #nav>
      <div class="nav-item" :class="{ active: onglet === 'organisations' }" @click="onglet = 'organisations'">
        <i class="ti ti-building"></i> Organisations
      </div>
      <div class="nav-item" :class="{ active: onglet === 'athletes' }" @click="onglet = 'athletes'">
        <i class="ti ti-user-search"></i> Réassigner un athlète
      </div>
    </template>

    <template #actions>
      <button v-if="onglet === 'organisations'" class="btn btn-primary" @click="ouvrirCreationOrganisation">
        <i class="ti ti-plus"></i> Nouvelle organisation
      </button>
    </template>

    <!-- Modal création organisation -->
    <div v-if="modalOrganisation" class="modal-overlay" @click.self="modalOrganisation = false">
      <div class="modal">
        <div class="modal-header">
          <h3>Nouvelle organisation</h3>
          <button class="modal-close" @click="modalOrganisation = false"><i class="ti ti-x"></i></button>
        </div>
        <div class="modal-body">
          <div class="field">
            <label>Nom</label>
            <input v-model="newOrganisation.nom" placeholder="Les Ours de Toulouse" />
          </div>
          <div class="field">
            <label>Slug</label>
            <input v-model="newOrganisation.slug" placeholder="ours" />
            <span class="domain-preview">utilisé dans les emails des comptes : prenom.nom@role.{{ newOrganisation.slug || '…' }}</span>
          </div>
          <div v-if="organisationError" class="error">{{ organisationError }}</div>
        </div>
        <div class="modal-footer">
          <button class="btn" @click="modalOrganisation = false">Annuler</button>
          <button class="btn btn-primary" @click="creerOrganisation" :disabled="!newOrganisation.nom || !newOrganisation.slug">
            Créer
          </button>
        </div>
      </div>
    </div>

    <!-- Modal création admin d'organisation -->
    <div v-if="modalAdmin" class="modal-overlay" @click.self="modalAdmin = false">
      <div class="modal">
        <div class="modal-header">
          <h3>Nouvel admin — {{ organisationCible?.nom }}</h3>
          <button class="modal-close" @click="modalAdmin = false"><i class="ti ti-x"></i></button>
        </div>
        <div class="modal-body">
          <div class="field">
            <label>Identifiant</label>
            <input v-model="newAdmin.identifiant" placeholder="prenom.nom" />
            <span class="domain-preview" v-if="newAdmin.identifiant && organisationCible">
              → {{ newAdmin.identifiant }}@admin.{{ organisationCible.slug }}
            </span>
          </div>
          <div class="field">
            <label>Mot de passe</label>
            <input v-model="newAdmin.password" type="password" placeholder="••••••••" />
          </div>
          <div v-if="adminError" class="error">{{ adminError }}</div>
          <div v-if="adminSuccess" class="success">{{ adminSuccess }}</div>
        </div>
        <div class="modal-footer">
          <button class="btn" @click="modalAdmin = false">Fermer</button>
          <button class="btn btn-primary" @click="creerAdmin" :disabled="!newAdmin.identifiant || !newAdmin.password">
            Créer
          </button>
        </div>
      </div>
    </div>

    <!-- ONGLET ORGANISATIONS -->
    <div v-if="onglet === 'organisations'" class="admin-page">
      <div v-if="loading" class="empty">Chargement...</div>
      <div v-else-if="organisations.length === 0" class="empty">Aucune organisation pour l'instant.</div>
      <div v-else class="org-list">
        <div v-for="org in organisations" :key="org.id" class="org-row">
          <div class="org-info">
            <div class="org-nom">{{ org.nom }}</div>
            <div class="org-slug">{{ org.slug }}</div>
          </div>
          <button class="btn btn-sm" @click="ouvrirCreationAdmin(org)">
            <i class="ti ti-user-plus"></i> Admin
          </button>
        </div>
      </div>
    </div>

    <!-- ONGLET RÉASSIGNER UN ATHLÈTE -->
    <div v-if="onglet === 'athletes'" class="admin-page">
      <div class="section-title">Rechercher un athlète</div>
      <div class="add-athlete-row">
        <input v-model="searchEmail" placeholder="Email de l'athlète" type="email" @keyup.enter="rechercherAthlete" />
        <button class="btn" @click="rechercherAthlete" :disabled="!searchEmail">Rechercher</button>
      </div>
      <div v-if="searchError" class="error">{{ searchError }}</div>

      <div v-if="athleteTrouve" class="card athlete-card">
        <div class="athlete-card-nom">{{ athleteTrouve.nom }}</div>
        <div class="athlete-card-email">{{ athleteTrouve.email }}</div>
        <div class="athlete-card-org">
          Organisation actuelle : <strong>{{ athleteTrouve.organisation?.nom || 'Indépendant (aucune)' }}</strong>
        </div>
        <div class="field">
          <label>Nouvelle organisation</label>
          <select v-model="nouvelleOrgId">
            <option :value="null">Indépendant (aucune)</option>
            <option v-for="org in organisations" :key="org.id" :value="org.id">{{ org.nom }}</option>
          </select>
        </div>
        <div v-if="reassignError" class="error">{{ reassignError }}</div>
        <div v-if="reassignSuccess" class="success">{{ reassignSuccess }}</div>
        <button class="btn btn-primary" @click="reassigner">Réassigner</button>
      </div>
    </div>
  </AppLayout>
</template>

<script>
import { ref, onMounted } from 'vue'
import { useApi } from '../services/api'
import AppLayout from '../components/AppLayout.vue'

export default {
  components: { AppLayout },
  setup() {
    const onglet = ref('organisations')
    const organisations = ref([])
    const loading = ref(false)
    const api = useApi()

    const modalOrganisation = ref(false)
    const newOrganisation = ref({ nom: '', slug: '' })
    const organisationError = ref('')

    const modalAdmin = ref(false)
    const organisationCible = ref(null)
    const newAdmin = ref({ identifiant: '', password: '' })
    const adminError = ref('')
    const adminSuccess = ref('')

    const searchEmail = ref('')
    const athleteTrouve = ref(null)
    const nouvelleOrgId = ref(null)
    const searchError = ref('')
    const reassignError = ref('')
    const reassignSuccess = ref('')

    const fetchOrganisations = async () => {
      loading.value = true
      try {
        organisations.value = await api.get('/organisations/')
      } finally {
        loading.value = false
      }
    }

    const ouvrirCreationOrganisation = () => {
      newOrganisation.value = { nom: '', slug: '' }
      organisationError.value = ''
      modalOrganisation.value = true
    }

    const creerOrganisation = async () => {
      organisationError.value = ''
      try {
        const data = await api.post('/organisations/', newOrganisation.value)
        organisations.value.push(data)
        modalOrganisation.value = false
      } catch (e) {
        organisationError.value = e.message || 'Erreur lors de la création'
      }
    }

    const ouvrirCreationAdmin = (org) => {
      organisationCible.value = org
      newAdmin.value = { identifiant: '', password: '' }
      adminError.value = ''
      adminSuccess.value = ''
      modalAdmin.value = true
    }

    const creerAdmin = async () => {
      adminError.value = ''
      adminSuccess.value = ''
      try {
        const data = await api.post(`/organisations/${organisationCible.value.id}/admins`, newAdmin.value)
        adminSuccess.value = `Compte créé : ${data.email}`
        newAdmin.value = { identifiant: '', password: '' }
      } catch (e) {
        adminError.value = e.message || 'Erreur lors de la création'
      }
    }

    const rechercherAthlete = async () => {
      searchError.value = ''
      athleteTrouve.value = null
      reassignError.value = ''
      reassignSuccess.value = ''
      try {
        const found = await api.get(`/users/recherche?email=${encodeURIComponent(searchEmail.value)}`)
        if (found.role !== 'athlete') {
          searchError.value = 'Ce compte n\'est pas un athlète'
          return
        }
        athleteTrouve.value = found
        nouvelleOrgId.value = found.organisation_id
      } catch (e) {
        searchError.value = e.message || 'Athlète introuvable'
      }
    }

    const reassigner = async () => {
      reassignError.value = ''
      reassignSuccess.value = ''
      try {
        const data = await api.patch(`/users/${athleteTrouve.value.id}/organisation`, { organisation_id: nouvelleOrgId.value })
        athleteTrouve.value = data
        reassignSuccess.value = 'Organisation mise à jour.'
      } catch (e) {
        reassignError.value = e.message || 'Erreur lors de la réassignation'
      }
    }

    onMounted(fetchOrganisations)

    return {
      onglet, organisations, loading,
      modalOrganisation, newOrganisation, organisationError, ouvrirCreationOrganisation, creerOrganisation,
      modalAdmin, organisationCible, newAdmin, adminError, adminSuccess, ouvrirCreationAdmin, creerAdmin,
      searchEmail, athleteTrouve, nouvelleOrgId, searchError, reassignError, reassignSuccess,
      rechercherAthlete, reassigner
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

.domain-preview { font-size: var(--font-size-xs); color: var(--color-text-secondary); font-family: monospace; }

.org-list { display: flex; flex-direction: column; gap: var(--spacing-sm); }
.org-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-md) var(--spacing-lg);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}
.org-info { flex: 1; min-width: 0; }
.org-nom { font-size: var(--font-size-sm); font-weight: 600; }
.org-slug { font-size: var(--font-size-xs); color: var(--color-text-secondary); font-family: monospace; }

.add-athlete-row { display: flex; gap: var(--spacing-sm); flex-wrap: wrap; }
.add-athlete-row input {
  flex: 1;
  min-width: 200px;
  min-height: var(--tap-min);
  padding: 0 var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--font-size-base);
}

.athlete-card { padding: var(--spacing-lg); display: flex; flex-direction: column; gap: var(--spacing-md); max-width: 420px; }
.athlete-card-nom { font-size: var(--font-size-base); font-weight: 700; }
.athlete-card-email { font-size: var(--font-size-sm); color: var(--color-text-secondary); }
.athlete-card-org { font-size: var(--font-size-sm); color: var(--color-text-body); }

@media (max-width: 768px) {
  .admin-page { padding: var(--spacing-md) var(--spacing-lg); }
}
</style>
