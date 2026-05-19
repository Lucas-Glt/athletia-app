<template>
  <div class="app">
    <header class="app-header">
      <div class="brand">
        <div class="brand-icon" :style="{ background: brandColor }">{{ brandLetter }}</div>
        <div class="brand-text">
          <h1>Athletia</h1>
          <span>{{ roleLabel }}</span>
        </div>
      </div>

      <nav class="header-nav">
        <slot name="nav" />
      </nav>

      <div class="header-right">
        <slot name="actions" />
        <div class="avatar-wrapper" ref="avatarRef">
          <div class="avatar" @click="toggleMenu">{{ initiales }}</div>
          <div v-if="menuOuvert" class="profile-dropdown">
            <div class="profile-info">
              <div class="profile-nom">{{ authStore.user?.nom }}</div>
              <div class="profile-role">{{ roleLabel }}</div>
            </div>
            <div class="dropdown-divider"></div>
            <button class="dropdown-item" @click="ouvrirModalePassword">
              <i class="ti ti-lock"></i> Changer le mot de passe
            </button>
            <div class="dropdown-divider"></div>
            <button class="dropdown-item danger" @click="deconnexion">
              <i class="ti ti-logout"></i> Se déconnecter
            </button>
          </div>
        </div>
      </div>
    </header>

    <div class="main-content">
      <slot />
    </div>

    <!-- Modale changement de mot de passe -->
    <div v-if="modalePassword" class="modal-overlay" @click.self="fermerModalePassword">
      <div class="modal">
        <div class="modal-header">
          <h3>Changer le mot de passe</h3>
          <button class="modal-close" @click="fermerModalePassword">
            <i class="ti ti-x"></i>
          </button>
        </div>
        <div class="modal-body">
          <div class="field">
            <label>Ancien mot de passe</label>
            <input v-model="form.ancien" type="password" placeholder="••••••••" />
          </div>
          <div class="field">
            <label>Nouveau mot de passe</label>
            <input v-model="form.nouveau" type="password" placeholder="••••••••" />
          </div>
          <div class="field">
            <label>Confirmer le nouveau mot de passe</label>
            <input v-model="form.confirmation" type="password" placeholder="••••••••" />
          </div>
          <p v-if="passwordError" class="error">{{ passwordError }}</p>
          <p v-if="passwordSuccess" class="success">{{ passwordSuccess }}</p>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" @click="fermerModalePassword">Annuler</button>
          <button class="btn-primary" @click="changerPassword" :disabled="loadingPassword">
            {{ loadingPassword ? 'Enregistrement...' : 'Enregistrer' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useRouter } from 'vue-router'
import { useApi } from '../services/api'

export default {
  props: {
    title: { type: String, required: true }
  },
  setup() {
    const authStore = useAuthStore()
    const router = useRouter()
    const { patch } = useApi()

    const menuOuvert = ref(false)
    const modalePassword = ref(false)
    const avatarRef = ref(null)
    const loadingPassword = ref(false)
    const passwordError = ref('')
    const passwordSuccess = ref('')

    const form = ref({ ancien: '', nouveau: '', confirmation: '' })

    const roleLabel = computed(() => {
      const labels = { prepa: 'Préparateur physique', athlete: 'Athlète', admin: 'Administrateur' }
      return labels[authStore.role] || ''
    })

    const brandLetter = computed(() => {
      if (authStore.role === 'prepa') return 'P'
      if (authStore.role === 'admin') return 'A'
      return 'A'
    })

    const brandColor = computed(() => {
      if (authStore.role === 'prepa') return 'linear-gradient(135deg, #7F77DD, #534AB7)'
      if (authStore.role === 'admin') return 'linear-gradient(135deg, #dc2626, #b91c1c)'
      return 'linear-gradient(135deg, #16a34a, #15803d)'
    })

    const initiales = computed(() => {
      const nom = authStore.user?.nom || ''
      return nom.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    })

    const toggleMenu = () => { menuOuvert.value = !menuOuvert.value }

    const fermerMenu = (e) => {
      if (avatarRef.value && !avatarRef.value.contains(e.target)) {
        menuOuvert.value = false
      }
    }

    onMounted(() => document.addEventListener('click', fermerMenu))
    onUnmounted(() => document.removeEventListener('click', fermerMenu))

    const deconnexion = () => {
      authStore.logout()
      router.push('/')
    }

    const ouvrirModalePassword = () => {
      menuOuvert.value = false
      modalePassword.value = true
      form.value = { ancien: '', nouveau: '', confirmation: '' }
      passwordError.value = ''
      passwordSuccess.value = ''
    }

    const fermerModalePassword = () => {
      modalePassword.value = false
    }

    const changerPassword = async () => {
      passwordError.value = ''
      passwordSuccess.value = ''

      if (!form.value.ancien || !form.value.nouveau || !form.value.confirmation) {
        passwordError.value = 'Tous les champs sont obligatoires'
        return
      }
      if (form.value.nouveau.length < 8) {
        passwordError.value = 'Le nouveau mot de passe doit faire au moins 8 caractères'
        return
      }
      if (form.value.nouveau !== form.value.confirmation) {
        passwordError.value = 'Les mots de passe ne correspondent pas'
        return
      }

      loadingPassword.value = true
      try {
        await patch('/users/me/password', {
          ancien_mdp: form.value.ancien,
          nouveau_mdp: form.value.nouveau
        })
        passwordSuccess.value = 'Mot de passe modifié avec succès !'
        form.value = { ancien: '', nouveau: '', confirmation: '' }
        setTimeout(() => fermerModalePassword(), 1500)
      } catch (e) {
        passwordError.value = e.message || 'Erreur lors du changement de mot de passe'
      } finally {
        loadingPassword.value = false
      }
    }

    return {
      authStore, roleLabel, brandLetter, brandColor, initiales,
      menuOuvert, toggleMenu, avatarRef, deconnexion,
      modalePassword, ouvrirModalePassword, fermerModalePassword,
      form, changerPassword, loadingPassword, passwordError, passwordSuccess
    }
  }
}
</script>

<style scoped>
* { box-sizing: border-box; }

.app {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
  background: #F8F7FF;
  font-family: 'Inter', system-ui, sans-serif;
}

.app-header {
  height: 60px;
  padding: 0 24px;
  border-bottom: 1px solid #EEEDF8;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
  background: white;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
  z-index: 20;
  gap: 24px;
}

.brand { display: flex; align-items: center; gap: 12px; flex-shrink: 0; }
.brand-icon {
  width: 38px; height: 38px; border-radius: 10px;
  color: white; font-size: 18px; font-weight: 700;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.brand-text h1 { font-size: 18px; font-weight: 700; color: #111; letter-spacing: -0.3px; margin: 0; line-height: 1.2; }
.brand-text span { font-size: 11px; color: #9ca3af; }

.header-nav { display: flex; align-items: center; gap: 4px; flex: 1; }
.header-right { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }

.avatar-wrapper { position: relative; }

.avatar {
  width: 34px; height: 34px; border-radius: 50%;
  background: linear-gradient(135deg, #CECBF6, #AFA9EC);
  color: #3C3489;
  display: flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: 700; flex-shrink: 0;
  cursor: pointer;
  transition: opacity 0.15s;
}
.avatar:hover { opacity: 0.85; }

.profile-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  background: white;
  border: 1px solid #EEEDF8;
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.10);
  min-width: 200px;
  z-index: 100;
  overflow: hidden;
}

.profile-info { padding: 12px 16px; }
.profile-nom { font-size: 13px; font-weight: 600; color: #111; }
.profile-role { font-size: 11px; color: #9ca3af; margin-top: 2px; }

.dropdown-divider { height: 1px; background: #f3f4f6; }

.dropdown-item {
  width: 100%; padding: 10px 16px;
  background: none; border: none;
  text-align: left; font-size: 13px; color: #374151;
  cursor: pointer; display: flex; align-items: center; gap: 8px;
  transition: background 0.1s;
}
.dropdown-item:hover { background: #f9fafb; }
.dropdown-item.danger { color: #dc2626; }
.dropdown-item.danger:hover { background: #fef2f2; }

.main-content { flex: 1; overflow: hidden; display: flex; flex-direction: column; min-height: 0; }

/* Modale */
.modal-overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.3);
  display: flex; align-items: center; justify-content: center;
  z-index: 200;
}
.modal {
  background: white; border-radius: 14px;
  width: 100%; max-width: 420px;
  box-shadow: 0 16px 48px rgba(0,0,0,0.15);
  overflow: hidden;
}
.modal-header {
  padding: 16px 20px;
  display: flex; align-items: center; justify-content: space-between;
  border-bottom: 1px solid #f3f4f6;
}
.modal-header h3 { margin: 0; font-size: 15px; font-weight: 600; }
.modal-close { background: none; border: none; cursor: pointer; color: #9ca3af; font-size: 18px; padding: 0; }
.modal-close:hover { color: #374151; }

.modal-body { padding: 20px; display: flex; flex-direction: column; gap: 14px; }

.field { display: flex; flex-direction: column; gap: 5px; }
.field label { font-size: 12px; font-weight: 500; color: #374151; }
.field input {
  padding: 9px 12px; border: 1px solid #e5e7eb;
  border-radius: 8px; font-size: 14px;
}
.field input:focus { outline: none; border-color: #7F77DD; }

.error { font-size: 12px; color: #dc2626; background: #fee2e2; padding: 8px 12px; border-radius: 6px; margin: 0; }
.success { font-size: 12px; color: #16a34a; background: #dcfce7; padding: 8px 12px; border-radius: 6px; margin: 0; }

.modal-footer {
  padding: 16px 20px; border-top: 1px solid #f3f4f6;
  display: flex; justify-content: flex-end; gap: 8px;
}
.btn-primary {
  padding: 8px 16px; background: #7F77DD; color: white;
  border: none; border-radius: 8px; font-size: 13px; font-weight: 500;
  cursor: pointer;
}
.btn-primary:hover:not(:disabled) { background: #534AB7; }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-secondary {
  padding: 8px 16px; background: #f3f4f6; color: #374151;
  border: none; border-radius: 8px; font-size: 13px; font-weight: 500;
  cursor: pointer;
}
.btn-secondary:hover { background: #e5e7eb; }
</style>