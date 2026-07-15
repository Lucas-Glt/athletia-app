<template>
  <AppLayout title="Administration">
    <template #nav>
      <div class="nav-item" :class="{ active: onglet === 'users' }" @click="onglet = 'users'">
        <i class="ti ti-users"></i> Utilisateurs
      </div>
    </template>

    <template #actions>
      <button class="btn btn-primary" @click="ouvrirCreation">
        <i class="ti ti-plus"></i> Nouvel utilisateur
      </button>
    </template>

    <!-- Modal création -->
    <div v-if="modalCreation" class="modal-overlay" @click.self="modalCreation = false">
      <div class="modal">
        <div class="modal-header">
          <h3>Nouvel utilisateur</h3>
          <button class="btn-icon" @click="modalCreation = false"><i class="ti ti-x"></i></button>
        </div>
        <div class="modal-body">
          <div class="field">
            <label>Nom</label>
            <input v-model="newUser.nom" placeholder="Prénom Nom" />
          </div>
          <div class="field">
            <label>Email</label>
            <input v-model="newUser.email" type="email" placeholder="email@example.com" />
          </div>
          <div class="field">
            <label>Mot de passe</label>
            <input v-model="newUser.password" type="password" placeholder="••••••••" />
          </div>
          <div class="field">
            <label>Rôle</label>
            <select v-model="newUser.role">
              <option value="athlete">Athlète</option>
              <option value="prepa">Préparateur physique</option>
              <option value="admin">Administrateur</option>
            </select>
          </div>
          <div v-if="createError" class="error">{{ createError }}</div>
        </div>
        <div class="modal-footer">
          <button class="btn" @click="modalCreation = false">Annuler</button>
          <button class="btn btn-primary" @click="creerUtilisateur" :disabled="!newUser.nom || !newUser.email || !newUser.password">
            Créer
          </button>
        </div>
      </div>
    </div>

    <!-- Modal reset password -->
    <div v-if="modalResetPassword" class="modal-overlay" @click.self="modalResetPassword = false">
      <div class="modal">
        <div class="modal-header">
          <h3>Réinitialiser le mot de passe</h3>
          <button class="btn-icon" @click="modalResetPassword = false"><i class="ti ti-x"></i></button>
        </div>
        <div class="modal-body">
          <div class="user-cible-info">
            <div class="avatar">{{ initiales(userCible?.nom || '') }}</div>
            <div>
              <div class="user-nom">{{ userCible?.nom }}</div>
              <div class="user-email">{{ userCible?.email }}</div>
            </div>
          </div>
          <div class="field">
            <label>Nouveau mot de passe</label>
            <input v-model="newPassword" type="password" placeholder="8 caractères minimum" />
          </div>
          <div v-if="resetError" class="error">{{ resetError }}</div>
          <div v-if="resetSuccess" class="success">{{ resetSuccess }}</div>
        </div>
        <div class="modal-footer">
          <button class="btn" @click="modalResetPassword = false">Annuler</button>
          <button class="btn btn-primary" @click="resetPassword" :disabled="!newPassword || loadingReset">
            {{ loadingReset ? 'Enregistrement...' : 'Enregistrer' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Liste des utilisateurs -->
    <div v-if="onglet === 'users'" class="admin-page">
      <div class="filters">
        <button
          v-for="role in ['tous', 'admin', 'prepa', 'athlete']"
          :key="role"
          class="filter-btn"
          :class="{ active: filtreRole === role }"
          @click="filtreRole = role"
        >
          {{ role === 'tous' ? 'Tous' : role === 'prepa' ? 'Préparateurs' : role === 'athlete' ? 'Athlètes' : 'Admins' }}
          <span class="count">{{ compteRole(role) }}</span>
        </button>
      </div>

      <div v-if="loading" class="empty">Chargement...</div>

      <div v-else class="users-table">
        <div class="table-header">
          <span>Nom</span>
          <span>Email</span>
          <span>Rôle</span>
          <span>Actions</span>
        </div>

        <div v-for="user in usersFiltres" :key="user.id" class="table-row">
          <div class="user-info">
            <div class="avatar">{{ initiales(user.nom) }}</div>
            <span class="user-nom">{{ user.nom }}</span>
          </div>
          <span class="user-email">{{ user.email }}</span>
          <div class="role-cell">
            <select
              :value="user.role"
              @change="changerRole(user, $event.target.value)"
              class="role-select"
              :class="`role-${user.role}`"
            >
              <option value="athlete">Athlète</option>
              <option value="prepa">Préparateur</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div class="actions-cell">
            <button
              class="btn btn-sm btn-warning"
              @click="ouvrirResetPassword(user)"
              title="Réinitialiser le mot de passe"
            >
              <i class="ti ti-lock"></i>
            </button>
            <button
              class="btn btn-sm btn-danger"
              @click="supprimerUtilisateur(user)"
              :disabled="user.id === moi?.id"
              title="Supprimer"
            >
              <i class="ti ti-trash"></i>
            </button>
          </div>
        </div>

        <div v-if="usersFiltres.length === 0" class="empty">Aucun utilisateur dans cette catégorie.</div>
      </div>
    </div>
  </AppLayout>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useApi } from '../services/api'
import AppLayout from '../components/AppLayout.vue'

export default {
  components: { AppLayout },
  setup() {
    const users = ref([])
    const moi = ref(null)
    const loading = ref(false)
    const filtreRole = ref('tous')
    const onglet = ref('users')
    const authStore = useAuthStore()
    const api = useApi()

    // Création
    const modalCreation = ref(false)
    const createError = ref('')
    const newUser = ref({ nom: '', email: '', password: '', role: 'athlete' })

    // Reset password
    const modalResetPassword = ref(false)
    const userCible = ref(null)
    const newPassword = ref('')
    const resetError = ref('')
    const resetSuccess = ref('')
    const loadingReset = ref(false)

    const fetchUsers = async () => {
      loading.value = true
      try {
        users.value = await api.get('/users/')
        moi.value = await api.get('/users/me')
      } finally {
        loading.value = false
      }
    }

    const usersFiltres = computed(() => {
      if (filtreRole.value === 'tous') return users.value
      return users.value.filter(u => u.role === filtreRole.value)
    })

    const compteRole = (role) => {
      if (role === 'tous') return users.value.length
      return users.value.filter(u => u.role === role).length
    }

    const ouvrirCreation = () => {
      newUser.value = { nom: '', email: '', password: '', role: 'athlete' }
      createError.value = ''
      modalCreation.value = true
    }

    const creerUtilisateur = async () => {
      createError.value = ''
      try {
        const data = await api.post('/users/', newUser.value)
        users.value.push(data)
        modalCreation.value = false
      } catch (e) {
        createError.value = e.message || 'Erreur lors de la création'
      }
    }

    const changerRole = async (user, newRole) => {
      if (user.id === moi.value?.id) return
      await api.patch(`/users/${user.id}`, { role: newRole })
      user.role = newRole
    }

    const supprimerUtilisateur = async (user) => {
      if (user.id === moi.value?.id) return
      if (!confirm(`Supprimer "${user.nom}" ? Cette action est irréversible.`)) return
      await api.del(`/users/${user.id}`)
      users.value = users.value.filter(u => u.id !== user.id)
    }

    const ouvrirResetPassword = (user) => {
      userCible.value = user
      newPassword.value = ''
      resetError.value = ''
      resetSuccess.value = ''
      modalResetPassword.value = true
    }

    const resetPassword = async () => {
      resetError.value = ''
      resetSuccess.value = ''
      if (newPassword.value.length < 8) {
        resetError.value = 'Le mot de passe doit faire au moins 8 caractères'
        return
      }
      loadingReset.value = true
      try {
        await api.patch(`/users/${userCible.value.id}/password`, { nouveau_mdp: newPassword.value })
        resetSuccess.value = 'Mot de passe modifié avec succès !'
        setTimeout(() => { modalResetPassword.value = false }, 1500)
      } catch (e) {
        resetError.value = e.message || 'Erreur lors de la réinitialisation'
      } finally {
        loadingReset.value = false
      }
    }

    const initiales = (nom) => nom.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

    onMounted(fetchUsers)

    return {
      users, moi, loading, filtreRole, onglet,
      modalCreation, createError, newUser,
      modalResetPassword, userCible, newPassword, resetError, resetSuccess, loadingReset,
      usersFiltres, compteRole,
      ouvrirCreation, creerUtilisateur, changerRole, supprimerUtilisateur,
      ouvrirResetPassword, resetPassword,
      initiales
    }
  }
}
</script>

<style scoped>
* { box-sizing: border-box; }

.btn { display: inline-flex; align-items: center; gap: 6px; padding: 7px 14px; border-radius: var(--radius-md); border: 1px solid var(--color-border); font-size: var(--font-size-md); cursor: pointer; background: transparent; color: var(--color-text-body); }
.btn:hover { background: var(--color-bg-secondary); }
.btn-primary { background: var(--color-primary); color: var(--color-bg); border-color: var(--color-primary-dark); }
.btn-primary:hover:not(:disabled) { background: var(--color-primary-dark); }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-sm { padding: 5px 8px; font-size: var(--font-size-sm); }
.btn-icon { width: 28px; height: 28px; padding: 0; display: inline-flex; align-items: center; justify-content: center; border-radius: var(--radius-md); border: none; cursor: pointer; background: transparent; color: var(--color-text-secondary); }
.btn-danger { background: var(--color-danger-bg); color: var(--color-danger-text); border-color: #fca5a5; }
.btn-danger:hover:not(:disabled) { background: #fecaca; }
.btn-danger:disabled { opacity: 0.3; cursor: not-allowed; }
.btn-warning { background: var(--color-warning-bg); color: #b45309; border-color: #fcd34d; }
.btn-warning:hover { background: #fde68a; }

.nav-item { display: flex; align-items: center; gap: 6px; padding: 6px 12px; font-size: var(--font-size-md); cursor: pointer; color: var(--color-text-secondary); border-radius: var(--radius-md); font-weight: 500; border: none; background: transparent; }
.nav-item:hover { background: var(--color-bg-app); color: var(--color-text-body); }
.nav-item.active { background: var(--color-primary-light); color: var(--color-primary-dark); }

/* Modal */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; z-index: 100; }
.modal { background: var(--color-bg); border-radius: var(--radius-xl); width: 420px; box-shadow: var(--shadow-modal); overflow: hidden; }
.modal-header { display: flex; align-items: center; justify-content: space-between; padding: var(--spacing-lg) var(--spacing-xl); border-bottom: 1px solid var(--color-border); }
.modal-header h3 { font-size: var(--font-size-15); font-weight: 600; margin: 0; }
.modal-body { padding: var(--spacing-xl); display: flex; flex-direction: column; gap: 14px; }
.modal-footer { display: flex; justify-content: flex-end; gap: var(--spacing-sm); padding: var(--spacing-lg) var(--spacing-xl); border-top: 1px solid var(--color-border); }

.user-cible-info { display: flex; align-items: center; gap: var(--spacing-md); padding: var(--spacing-md); background: var(--color-bg-secondary); border-radius: var(--radius-lg); }
.user-cible-info .user-nom { font-size: var(--font-size-md); font-weight: 600; }
.user-cible-info .user-email { font-size: var(--font-size-sm); color: var(--color-text-secondary); }

.field { display: flex; flex-direction: column; gap: 5px; }
.field label { font-size: var(--font-size-sm); font-weight: 500; color: var(--color-text-body); }
.field input, .field select { padding: 8px var(--spacing-md); border: 1px solid var(--color-border); border-radius: var(--radius-md); font-size: var(--font-size-md); }
.field input:focus, .field select:focus { outline: none; border-color: var(--color-primary); }

/* Page admin */
.admin-page { flex: 1; padding: var(--spacing-xl) var(--spacing-2xl); display: flex; flex-direction: column; gap: var(--spacing-lg); overflow-y: auto; }

.filters { display: flex; gap: var(--spacing-sm); flex-wrap: wrap; }
.filter-btn { display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; border: 1px solid var(--color-border); border-radius: var(--radius-md); font-size: var(--font-size-md); cursor: pointer; background: var(--color-bg); color: var(--color-text-secondary); }
.filter-btn:hover { border-color: var(--color-primary); }
.filter-btn.active { background: var(--color-primary-light); border-color: var(--color-primary); color: var(--color-primary-text); font-weight: 500; }
.count { font-size: var(--font-size-xs); background: var(--color-bg-tertiary); padding: 1px 6px; border-radius: 10px; color: var(--color-text-secondary); }
.filter-btn.active .count { background: #C8C4F5; color: var(--color-primary-text); }

/* Table */
.users-table { display: flex; flex-direction: column; border: 1px solid var(--color-border); border-radius: var(--radius-lg); overflow: hidden; }
.table-header { display: grid; grid-template-columns: 1.5fr 2fr 1fr 100px; gap: var(--spacing-md); padding: 10px var(--spacing-lg); background: var(--color-bg-secondary); border-bottom: 1px solid var(--color-border); font-size: var(--font-size-xs); font-weight: 500; color: var(--color-text-secondary); text-transform: uppercase; letter-spacing: 0.4px; }
.table-row { display: grid; grid-template-columns: 1.5fr 2fr 1fr 100px; gap: var(--spacing-md); padding: var(--spacing-md) var(--spacing-lg); border-bottom: 1px solid var(--color-bg-tertiary); align-items: center; }
.table-row:last-child { border-bottom: none; }
.table-row:hover { background: #fafafa; }

.user-info { display: flex; align-items: center; gap: var(--spacing-sm); }
.avatar { width: var(--avatar-md); height: var(--avatar-md); border-radius: 50%; background: var(--color-avatar-prepa-bg); color: var(--color-avatar-prepa-text); display: flex; align-items: center; justify-content: center; font-size: var(--font-size-xs); font-weight: 600; flex-shrink: 0; }
.user-nom { font-size: var(--font-size-md); font-weight: 500; }
.user-email { font-size: var(--font-size-sm); color: var(--color-text-secondary); }

.role-cell { display: flex; }
.role-select { padding: 4px 8px; border-radius: var(--radius-full); font-size: var(--font-size-xs); font-weight: 500; cursor: pointer; border: 1px solid transparent; }
.role-select:focus { outline: none; }
.role-select.role-admin { background: #FEE2E2; color: #B91C1C; }
.role-select.role-prepa { background: var(--color-primary-light); color: var(--color-primary-text); }
.role-select.role-athlete { background: var(--color-success-bg); color: var(--color-success-text); }

.actions-cell { display: flex; justify-content: flex-end; gap: 6px; }

.empty { color: var(--color-text-muted); text-align: center; padding: 40px; font-size: var(--font-size-md); }
.error { font-size: var(--font-size-sm); color: var(--color-danger-text); background: var(--color-danger-bg); padding: var(--spacing-sm) var(--spacing-md); border-radius: var(--radius-md); }
.success { font-size: var(--font-size-sm); color: var(--color-valid-text); background: var(--color-valid-bg); padding: var(--spacing-sm) var(--spacing-md); border-radius: var(--radius-md); }

@media (max-width: 768px) {
  .admin-page { padding: var(--spacing-md) var(--spacing-lg); }

  .table-header { display: none; }

  .users-table { border: none; gap: var(--spacing-sm); background: transparent; }

  .table-row {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
    padding: var(--spacing-md);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-xl);
    background: var(--color-bg);
  }

  .user-info { justify-content: flex-start; }
  .user-email { font-size: var(--font-size-sm); color: var(--color-text-secondary); }

  .role-cell { justify-content: flex-start; }

  .actions-cell { justify-content: flex-start; }

  .modal { width: calc(100vw - 32px); max-width: 420px; }

  .filters { gap: 6px; }
  .filter-btn { padding: 5px 10px; font-size: var(--font-size-sm); }
}
</style>