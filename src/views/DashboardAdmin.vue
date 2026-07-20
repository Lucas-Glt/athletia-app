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
          <button class="modal-close" @click="modalCreation = false"><i class="ti ti-x"></i></button>
        </div>
        <div class="modal-body">
          <div class="field">
            <label>Identifiant</label>
            <input v-model="newUser.identifiant" placeholder="prenom.nom" />
            <span class="domain-preview" v-if="newUser.identifiant">
              → {{ newUser.identifiant }}@{{ newUser.role }}.{{ moi?.organisation?.slug }}
            </span>
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
            </select>
          </div>
          <div v-if="createError" class="error">{{ createError }}</div>
        </div>
        <div class="modal-footer">
          <button class="btn" @click="modalCreation = false">Annuler</button>
          <button class="btn btn-primary" @click="creerUtilisateur" :disabled="!newUser.identifiant || !newUser.password">
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
          <button class="modal-close" @click="modalResetPassword = false"><i class="ti ti-x"></i></button>
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
              v-if="user.role !== 'admin'"
              :value="user.role"
              @change="changerRole(user, $event.target.value)"
              class="role-select"
              :class="`role-${user.role}`"
            >
              <option value="athlete">Athlète</option>
              <option value="prepa">Préparateur</option>
            </select>
            <span v-else class="role-select role-admin role-readonly">Admin</span>
          </div>
          <div class="actions-cell">
            <template v-if="user.role !== 'admin'">
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
            </template>
            <span v-else-if="user.id === moi?.id" class="badge-moi">Vous</span>
          </div>
        </div>

        <div v-if="usersFiltres.length === 0" class="empty">Aucun utilisateur dans cette catégorie.</div>
      </div>
    </div>
  </AppLayout>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
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
    const api = useApi()

    // Création
    const modalCreation = ref(false)
    const createError = ref('')
    const newUser = ref({ identifiant: '', password: '', role: 'athlete' })

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
      newUser.value = { identifiant: '', password: '', role: 'athlete' }
      createError.value = ''
      modalCreation.value = true
    }

    const creerUtilisateur = async () => {
      createError.value = ''
      try {
        const data = await api.post('/users/organisation', newUser.value)
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
.btn-warning {
  background: var(--color-warning-bg);
  color: var(--color-warning-text-strong);
  border-color: var(--color-warning-border);
}
.btn-warning:hover { background: var(--color-warning-bg-hover); }

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

/* Page admin */
.admin-page {
  flex: 1;
  padding: var(--spacing-xl) var(--spacing-2xl);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
  overflow-y: auto;
}

.filters { display: flex; gap: var(--spacing-sm); flex-wrap: wrap; }
.filter-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 40px;
  padding: 0 var(--spacing-lg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  cursor: pointer;
  background: var(--color-bg);
  color: var(--color-text-secondary);
}
.filter-btn:hover { border-color: var(--color-primary); }
.filter-btn.active {
  background: var(--color-primary-light);
  border-color: var(--color-primary);
  color: var(--color-primary-text);
  font-weight: 600;
}
.count {
  font-size: var(--font-size-xs);
  background: var(--color-bg-tertiary);
  padding: 1px 8px;
  border-radius: var(--radius-full);
  color: var(--color-text-secondary);
}
.filter-btn.active .count { background: var(--color-primary-lighter); color: var(--color-primary-text); }

/* Table */
.users-table {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  background: var(--color-bg);
}
.table-header {
  display: grid;
  grid-template-columns: 1.5fr 2fr 1fr 110px;
  gap: var(--spacing-md);
  padding: var(--spacing-md) var(--spacing-lg);
  background: var(--color-bg-secondary);
  border-bottom: 1px solid var(--color-border);
  font-size: var(--font-size-xs);
  font-weight: 600;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.4px;
}
.table-row {
  display: grid;
  grid-template-columns: 1.5fr 2fr 1fr 110px;
  gap: var(--spacing-md);
  padding: var(--spacing-md) var(--spacing-lg);
  border-bottom: 1px solid var(--color-bg-tertiary);
  align-items: center;
}
.table-row:last-child { border-bottom: none; }
.table-row:hover { background: var(--color-bg-hover); }

.user-info { display: flex; align-items: center; gap: var(--spacing-sm); }
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
.user-nom { font-size: var(--font-size-sm); font-weight: 500; }
.user-email { font-size: var(--font-size-sm); color: var(--color-text-secondary); overflow: hidden; text-overflow: ellipsis; }

.role-cell { display: flex; }
.role-select {
  min-height: 36px;
  padding: 0 var(--spacing-sm);
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  font-weight: 600;
  cursor: pointer;
  border: 1px solid transparent;
}
.role-select:focus { outline: none; }
.role-select.role-admin { background: var(--color-danger-bg); color: var(--color-danger-text); }
.role-select.role-prepa { background: var(--color-primary-light); color: var(--color-primary-text); }
.role-select.role-athlete { background: var(--color-success-bg); color: var(--color-success-text); }

.actions-cell { display: flex; justify-content: flex-end; gap: 6px; }

.domain-preview { font-size: var(--font-size-xs); color: var(--color-text-secondary); font-family: monospace; }
.role-readonly { cursor: default; }
.badge-moi { font-size: var(--font-size-xs); color: var(--color-text-muted); font-style: italic; }

@media (max-width: 768px) {
  .admin-page { padding: var(--spacing-md) var(--spacing-lg); }

  .table-header { display: none; }

  .users-table { border: none; gap: var(--spacing-sm); background: transparent; overflow: visible; }

  .table-row {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: var(--spacing-sm);
    padding: var(--spacing-lg);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    background: var(--color-bg);
  }

  .user-info { justify-content: flex-start; }
  .role-cell { justify-content: flex-start; }
  .actions-cell { justify-content: flex-start; }

  .filters { gap: 6px; }
}
</style>
