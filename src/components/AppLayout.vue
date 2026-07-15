<template>
  <div class="app">
    <header class="app-header">
      <div class="brand">
        <button class="hamburger" @click="drawerOuvert = !drawerOuvert">
          <i class="ti ti-menu-2"></i>
        </button>
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

    <!-- Drawer mobile -->
    <div class="drawer-overlay" v-if="drawerOuvert" @click="drawerOuvert = false"></div>
    <div class="drawer" :class="{ open: drawerOuvert }">
      <div class="drawer-header">
        <div class="brand-icon" :style="{ background: brandColor }">{{ brandLetter }}</div>
        <span class="drawer-title">{{ roleLabel }}</span>
        <button class="drawer-close" @click="drawerOuvert = false"><i class="ti ti-x"></i></button>
      </div>
      <div class="drawer-nav" @click="drawerOuvert = false">
        <slot name="nav" />
      </div>
      <div class="drawer-actions">
        <slot name="actions" />
      </div>
    </div>

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
    <!-- Bannière PWA Android/Chrome -->
    <div v-if="showInstallBanner && !isInStandaloneMode" class="install-banner">
      <div class="install-banner-content">
        <i class="ti ti-device-mobile" style="font-size:24px;color:#7F77DD"></i>
        <div>
          <div class="install-title">Installer Athletia</div>
          <div class="install-sub">Accès rapide depuis ton écran d'accueil</div>
        </div>
      </div>
      <div class="install-actions">
        <button class="install-btn" @click="installerApp">Installer</button>
        <button class="install-dismiss" @click="showInstallBanner = false">Plus tard</button>
      </div>
    </div>

    <!-- Bannière PWA iOS -->
    <div v-if="isIos && !isInStandaloneMode && showIosBanner" class="install-banner">
      <div class="install-banner-content">
        <i class="ti ti-device-mobile" style="font-size:24px;color:#7F77DD"></i>
        <div>
          <div class="install-title">Installer Athletia</div>
          <div class="install-sub">
            Appuie sur <i class="ti ti-share"></i> puis "Sur l'écran d'accueil"
          </div>
        </div>
      </div>
      <div class="install-actions">
        <button class="install-dismiss" @click="showIosBanner = false">OK</button>
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

    onMounted(() => {
      document.addEventListener('click', fermerMenu)
      window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault()
        installPrompt.value = e
        if (!isInStandaloneMode) showInstallBanner.value = true
      })
    })
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

    const drawerOuvert = ref(false)
    const installPrompt = ref(null)
    const showInstallBanner = ref(false)
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent)
    const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches
    const showIosBanner = ref(isIos && !isInStandaloneMode)

    const installerApp = async () => {
      if (!installPrompt.value) return
      installPrompt.value.prompt()
      const result = await installPrompt.value.userChoice
      if (result.outcome === 'accepted') showInstallBanner.value = false
      installPrompt.value = null
    }

    return {
      authStore, roleLabel, brandLetter, brandColor, initiales,
      menuOuvert, toggleMenu, avatarRef, deconnexion,
      modalePassword, ouvrirModalePassword, fermerModalePassword,
      form, changerPassword, loadingPassword, passwordError, passwordSuccess, drawerOuvert,
      installPrompt, showInstallBanner, isIos, isInStandaloneMode, showIosBanner, installerApp
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
  background: var(--color-bg-app);
}

.app-header {
  height: var(--header-height-desktop);
  padding: 0 var(--spacing-2xl);
  border-bottom: 1px solid var(--color-primary-light);
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
  background: var(--color-bg);
  box-shadow: var(--shadow-header);
  z-index: 20;
  gap: var(--spacing-2xl);
}

.brand { display: flex; align-items: center; gap: var(--spacing-md); flex-shrink: 0; }
.brand-icon {
  width: 38px; height: 38px; border-radius: var(--radius-md);
  color: var(--color-bg); font-size: var(--font-size-xl); font-weight: 700;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.brand-text h1 { font-size: var(--font-size-xl); font-weight: 700; color: var(--color-text); letter-spacing: -0.3px; margin: 0; line-height: 1.2; }
.brand-text span { font-size: var(--font-size-xs); color: var(--color-text-muted); }

.header-nav { display: flex; align-items: center; gap: 4px; flex: 1; }
.header-right { display: flex; align-items: center; gap: var(--spacing-sm); flex-shrink: 0; }

.avatar-wrapper { position: relative; }

.avatar {
  width: var(--avatar-lg); height: var(--avatar-lg); border-radius: 50%;
  background: linear-gradient(135deg, var(--color-avatar-prepa-bg), var(--color-superset-border));
  color: var(--color-primary-text);
  display: flex; align-items: center; justify-content: center;
  font-size: var(--font-size-sm); font-weight: 700; flex-shrink: 0;
  cursor: pointer;
  transition: opacity 0.15s;
}
.avatar:hover { opacity: 0.85; }

.profile-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  background: var(--color-bg);
  border: 1px solid var(--color-primary-light);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-dropdown);
  min-width: 200px;
  z-index: 100;
  overflow: hidden;
}

.profile-info { padding: var(--spacing-md) var(--spacing-lg); }
.profile-nom { font-size: var(--font-size-md); font-weight: 600; color: var(--color-text); }
.profile-role { font-size: var(--font-size-xs); color: var(--color-text-muted); margin-top: 2px; }

.dropdown-divider { height: 1px; background: var(--color-bg-tertiary); }

.dropdown-item {
  width: 100%; padding: var(--spacing-sm) var(--spacing-lg);
  background: none; border: none;
  text-align: left; font-size: var(--font-size-md); color: var(--color-text-body);
  cursor: pointer; display: flex; align-items: center; gap: var(--spacing-sm);
  transition: background 0.1s;
}
.dropdown-item:hover { background: var(--color-bg-secondary); }
.dropdown-item.danger { color: var(--color-danger-text); }
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
  background: var(--color-bg); border-radius: var(--radius-xl);
  width: 100%; max-width: 420px;
  box-shadow: var(--shadow-modal);
  overflow: hidden;
}
.modal-header {
  padding: var(--spacing-lg) var(--spacing-xl);
  display: flex; align-items: center; justify-content: space-between;
  border-bottom: 1px solid var(--color-bg-tertiary);
}
.modal-header h3 { margin: 0; font-size: var(--font-size-15); font-weight: 600; }
.modal-close { background: none; border: none; cursor: pointer; color: var(--color-text-muted); font-size: var(--font-size-xl); padding: 0; }
.modal-close:hover { color: var(--color-text-body); }

.modal-body { padding: var(--spacing-xl); display: flex; flex-direction: column; gap: 14px; }

.field { display: flex; flex-direction: column; gap: 5px; }
.field label { font-size: var(--font-size-sm); font-weight: 500; color: var(--color-text-body); }
.field input {
  padding: 9px var(--spacing-md); border: 1px solid var(--color-border);
  border-radius: var(--radius-md); font-size: var(--font-size-base);
}
.field input:focus { outline: none; border-color: var(--color-primary); }

.error { font-size: var(--font-size-sm); color: var(--color-danger-text); background: var(--color-danger-bg); padding: var(--spacing-sm) var(--spacing-md); border-radius: var(--radius-md); margin: 0; }
.success { font-size: var(--font-size-sm); color: var(--color-valid-text); background: var(--color-valid-bg); padding: var(--spacing-sm) var(--spacing-md); border-radius: var(--radius-md); margin: 0; }

.modal-footer {
  padding: var(--spacing-lg) var(--spacing-xl); border-top: 1px solid var(--color-bg-tertiary);
  display: flex; justify-content: flex-end; gap: var(--spacing-sm);
}
.btn-primary {
  padding: var(--spacing-sm) var(--spacing-lg); background: var(--color-primary); color: var(--color-bg);
  border: none; border-radius: var(--radius-lg); font-size: var(--font-size-md); font-weight: 500;
  cursor: pointer;
}
.btn-primary:hover:not(:disabled) { background: var(--color-primary-dark); }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-secondary {
  padding: var(--spacing-sm) var(--spacing-lg); background: var(--color-bg-tertiary); color: var(--color-text-body);
  border: none; border-radius: var(--radius-lg); font-size: var(--font-size-md); font-weight: 500;
  cursor: pointer;
}
.btn-secondary:hover { background: var(--color-border); }

.hamburger {
  display: none;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--color-text-body);
  font-size: var(--font-size-xl);
  padding: 4px;
  border-radius: var(--radius-md);
  flex-shrink: 0;
}
.hamburger:hover { background: var(--color-bg-tertiary); }

.drawer-overlay {
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.3);
  z-index: 50;
}
.drawer {
  display: none;
  position: fixed;
  top: 0; left: 0; bottom: 0;
  width: 260px;
  background: var(--color-bg);
  z-index: 60;
  flex-direction: column;
  transform: translateX(-100%);
  transition: transform 0.25s ease;
  box-shadow: var(--shadow-drawer);
}
.drawer.open { transform: translateX(0); }

.drawer-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-lg);
  border-bottom: 1px solid var(--color-bg-tertiary);
}
.drawer-title { font-size: var(--font-size-md); font-weight: 500; color: var(--color-text-body); flex: 1; }
.drawer-close {
  background: none; border: none; cursor: pointer;
  color: var(--color-text-muted); font-size: var(--font-size-xl); padding: 4px;
}
.drawer-nav {
  flex: 1;
  padding: var(--spacing-md);
  display: flex;
  flex-direction: column;
  gap: 4px;
  overflow-y: auto;
}
.drawer-actions {
  padding: var(--spacing-md) var(--spacing-lg);
  border-top: 1px solid var(--color-bg-tertiary);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

@media (max-width: 768px) {
  .app-header {
    padding: 0 var(--spacing-md);
    gap: var(--spacing-sm);
    height: var(--header-height-mobile);
  }
  .brand-text span { display: none; }
  .brand-text h1 { font-size: var(--font-size-15); }
  .brand-icon { width: var(--avatar-md); height: var(--avatar-md); font-size: var(--font-size-15); border-radius: var(--radius-lg); }
  .header-nav { display: none; }
  .hamburger { display: flex; align-items: center; justify-content: center; }
  .drawer-overlay { display: block; }
  .drawer { display: flex; }

  /* Masquer les actions du header sur mobile — elles sont dans le drawer */
  .header-right :deep(.btn) { display: none; }

  .modal { width: calc(100vw - 32px); }
}

.install-banner {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: var(--color-bg);
  border-top: 1px solid var(--color-primary-light);
  box-shadow: var(--shadow-banner);
  padding: var(--spacing-md) var(--spacing-lg);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-md);
  z-index: 300;
}

.install-banner-content {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.install-title {
  font-size: var(--font-size-md);
  font-weight: 600;
  color: var(--color-text);
}

.install-sub {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin-top: 2px;
}

.install-actions {
  display: flex;
  gap: var(--spacing-sm);
  flex-shrink: 0;
}

.install-btn {
  padding: 7px var(--spacing-lg);
  background: var(--color-primary);
  color: var(--color-bg);
  border: none;
  border-radius: var(--radius-lg);
  font-size: var(--font-size-md);
  font-weight: 500;
  cursor: pointer;
}

.install-btn:hover { background: var(--color-primary-dark); }

.install-dismiss {
  padding: 7px var(--spacing-lg);
  background: var(--color-bg-tertiary);
  color: var(--color-text-body);
  border: none;
  border-radius: var(--radius-lg);
  font-size: var(--font-size-md);
  cursor: pointer;
}

.install-dismiss:hover { background: var(--color-border); }
</style>