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

    <!-- Préparateur qui a encore des programmes : un autre les reprend
         avant que le compte soit supprimé (ses athlètes en dépendent). -->
    <div v-if="transfert" class="modal-overlay" @click.self="transfert = null">
      <div class="modal">
        <div class="modal-header">
          <h3>Supprimer {{ transfert.user.nom }}</h3>
          <button class="modal-close" @click="transfert = null" aria-label="Fermer"><i class="ti ti-x"></i></button>
        </div>
        <div class="modal-body">
          <p class="transfert-texte">{{ transfert.message }}</p>
          <div class="field" v-if="repreneurs.length">
            <label for="repreneur-sa">Repris par</label>
            <select id="repreneur-sa" v-model="transfert.repreneurId">
              <option :value="null" disabled>Choisir un préparateur</option>
              <option v-for="r in repreneurs" :key="r.id" :value="r.id">
                {{ r.nom }} — {{ r.organisation?.nom || 'Indépendant' }}
              </option>
            </select>
            <span class="transfert-aide">Programmes, tests, groupes et athlètes suivis lui sont transférés, puis le compte est supprimé.</span>
          </div>
          <p v-else class="error">Aucun autre préparateur disponible pour reprendre ses programmes.</p>
          <p v-if="erreurTransfert" class="error">{{ erreurTransfert }}</p>
        </div>
        <div class="modal-footer">
          <button class="btn" @click="transfert = null">Annuler</button>
          <button class="btn btn-danger" :disabled="!transfert.repreneurId || transfertEnCours" @click="confirmerTransfert">
            Transférer et supprimer
          </button>
        </div>
      </div>
    </div>

    <ReinitialiserMotDePasseModal
      v-if="userCiblePassword"
      :user="userCiblePassword"
      @fermer="userCiblePassword = null"
    />

    <div class="admin-page">
      <!-- Dupliqué du slot #actions (masqué en mobile par AppLayout, cf.
           ".header-right :deep(.btn) { display: none }") : les actions
           doivent aussi vivre dans le contenu pour rester joignables sur
           petit écran, comme "+ Nouveau" dans DashboardPrepa.vue. -->
      <div class="mobile-actions">
        <button class="btn" @click="ouvrirCreationCompte()">
          <i class="ti ti-user-plus"></i> Créer un compte
        </button>
        <button class="btn btn-primary" @click="modalOrganisation = true">
          <i class="ti ti-plus"></i> Nouvelle organisation
        </button>
      </div>

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
      } catch (e) {
        erreurAction.value = e.message || 'Impossible de charger les organisations'
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

    // Préparateur avec des programmes : l'API demande qui les reprend (409).
    const transfert = ref(null)
    const transfertEnCours = ref(false)
    const erreurTransfert = ref('')
    const repreneurs = computed(() =>
      transfert.value
        ? users.value.filter((u) => ['prepa', 'super_prepa'].includes(u.role) && u.id !== transfert.value.user.id)
        : []
    )

    const onDelete = async (user) => {
      const message = user.role === 'athlete'
        ? `Supprimer ${user.nom} et toutes ses données (séances, pesées, diète, blessures, tests) ? Cette action est irréversible.`
        : `Supprimer le compte de ${user.nom} ? Cette action est irréversible.`
      if (!confirm(message)) return
      erreurAction.value = ''
      try {
        await api.del(`/users/${user.id}`)
        users.value = users.value.filter((u) => u.id !== user.id)
      } catch (e) {
        if (e.status === 409 && e.data?.detail?.code === 'transfert_requis') {
          erreurTransfert.value = ''
          transfert.value = { user, message: e.message, repreneurId: null }
          return
        }
        erreurAction.value = e.message || 'Erreur lors de la suppression'
      }
    }

    const confirmerTransfert = async () => {
      if (transfertEnCours.value) return
      const { user, repreneurId } = transfert.value
      transfertEnCours.value = true
      erreurTransfert.value = ''
      try {
        await api.del(`/users/${user.id}?transfert_vers=${repreneurId}`)
        users.value = users.value.filter((u) => u.id !== user.id)
        transfert.value = null
      } catch (e) {
        erreurTransfert.value = e.message || 'Erreur lors de la suppression'
      } finally {
        transfertEnCours.value = false
      }
    }

    onMounted(fetchTout)

    return {
      organisations, users, loading, searchQuery, erreurAction,
      modalOrganisation, modalCompte, compteOrgPreselectionnee, userCiblePassword,
      organisationsAvecIndependant,
      onOrganisationCreee, ouvrirCreationCompte, onCompteCree,
      ouvrirResetPassword, onReassign, onDelete,
      transfert, transfertEnCours, erreurTransfert, repreneurs, confirmerTransfert
    }
  }
}
</script>

<style scoped>
.transfert-texte { margin: 0; color: var(--color-text-body); }
.transfert-aide { font-size: var(--font-size-xs); color: var(--color-text-secondary); }
.admin-page {
  flex: 1;
  padding: var(--spacing-xl) var(--spacing-2xl);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
  overflow-y: auto;
}

.mobile-actions { display: none; gap: var(--spacing-sm); flex-wrap: wrap; }

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
  .mobile-actions { display: flex; }
}
</style>
