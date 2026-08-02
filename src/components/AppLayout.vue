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
          <button class="avatar" @click="toggleMenu">{{ initiales }}</button>
          <div v-if="menuOuvert" class="profile-dropdown">
            <div class="profile-info">
              <div class="profile-nom">{{ authStore.user?.nom }}</div>
              <div class="profile-role">{{ roleLabel }}</div>
            </div>
            <div class="dropdown-divider"></div>
            <button class="dropdown-item" @click="ouvrirModalePassword">
              <i class="ti ti-lock"></i> Changer le mot de passe
            </button>
            <button class="dropdown-item" @click="themeStore.toggleTheme()">
              <i class="ti" :class="themeStore.theme === 'dark' ? 'ti-sun' : 'ti-moon'"></i>
              {{ themeStore.theme === 'dark' ? 'Mode clair' : 'Mode sombre' }}
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

    <!-- Barre d'onglets mobile : la navigation sous le pouce, identique pour tous les rôles -->
    <nav class="bottom-nav">
      <slot name="nav" />
    </nav>

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
          <button class="btn" @click="fermerModalePassword">Annuler</button>
          <button class="btn btn-primary" @click="changerPassword" :disabled="loadingPassword">
            {{ loadingPassword ? 'Enregistrement...' : 'Enregistrer' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Bannière PWA Android/Chrome -->
    <div v-if="showInstallBanner && !isInStandaloneMode" class="install-banner">
      <div class="install-banner-content">
        <i class="ti ti-device-mobile install-icon"></i>
        <div>
          <div class="install-title">Installer Athletia</div>
          <div class="install-sub">Accès rapide depuis ton écran d'accueil</div>
        </div>
      </div>
      <div class="install-actions">
        <button class="btn btn-primary btn-sm" @click="installerApp">Installer</button>
        <button class="btn btn-sm" @click="showInstallBanner = false">Plus tard</button>
      </div>
    </div>

    <!-- Bannière PWA iOS -->
    <div v-if="isIos && !isInStandaloneMode && showIosBanner" class="install-banner">
      <div class="install-banner-content">
        <i class="ti ti-device-mobile install-icon"></i>
        <div>
          <div class="install-title">Installer Athletia</div>
          <div class="install-sub">
            Appuie sur <i class="ti ti-share"></i> puis "Sur l'écran d'accueil"
          </div>
        </div>
      </div>
      <div class="install-actions">
        <button class="btn btn-sm" @click="showIosBanner = false">OK</button>
      </div>
    </div>
  </div>
</template>

<script>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useThemeStore } from '../stores/theme'
import { useRouter } from 'vue-router'
import { useApi } from '../services/api'

export default {
  props: {
    title: { type: String, required: true }
  },
  setup() {
    const authStore = useAuthStore()
    const themeStore = useThemeStore()
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
      const labels = {
        prepa: 'Préparateur physique',
        athlete: 'Athlète',
        admin: 'Administrateur',
        super_prepa: 'Préparateur physique (sans organisation)',
        super_admin: 'Administrateur plateforme'
      }
      return labels[authStore.role] || ''
    })

    const brandLetter = computed(() => {
      if (authStore.role === 'prepa' || authStore.role === 'super_prepa') return 'P'
      if (authStore.role === 'admin' || authStore.role === 'super_admin') return 'A'
      return 'A'
    })

    const brandColor = computed(() => {
      if (authStore.role === 'prepa' || authStore.role === 'super_prepa') return 'linear-gradient(135deg, #7F77DD, #534AB7)'
      if (authStore.role === 'super_admin') return 'linear-gradient(135deg, #534AB7, #17153A)'
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

    const onInstallPrompt = (e) => {
      e.preventDefault()
      installPrompt.value = e
      if (!isInStandaloneMode) showInstallBanner.value = true
    }

    onMounted(() => {
      document.addEventListener('click', fermerMenu)
      window.addEventListener('beforeinstallprompt', onInstallPrompt)
    })
    onUnmounted(() => {
      document.removeEventListener('click', fermerMenu)
      // le listener restait attaché à window à chaque démontage du layout
      // (connexion -> dashboard, changement de rôle) et s'accumulait
      window.removeEventListener('beforeinstallprompt', onInstallPrompt)
    })

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

    const installPrompt = ref(null)
    const showInstallBanner = ref(false)
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent)
    // navigator.standalone en plus du media query : sur iOS, une app lancée
    // depuis l'écran d'accueil ne remonte pas display-mode: standalone, si
    // bien que la bannière « installez l'app » restait affichée en
    // permanence… dans l'app déjà installée.
    const isInStandaloneMode =
      window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true
    const showIosBanner = ref(isIos && !isInStandaloneMode)

    const installerApp = async () => {
      if (!installPrompt.value) return
      installPrompt.value.prompt()
      const result = await installPrompt.value.userChoice
      if (result.outcome === 'accepted') showInstallBanner.value = false
      installPrompt.value = null
    }

    return {
      authStore, themeStore, roleLabel, brandLetter, brandColor, initiales,
      menuOuvert, toggleMenu, avatarRef, deconnexion,
      modalePassword, ouvrirModalePassword, fermerModalePassword,
      form, changerPassword, loadingPassword, passwordError, passwordSuccess,
      installPrompt, showInstallBanner, isIos, isInStandaloneMode, showIosBanner, installerApp
    }
  }
}
</script>

<style scoped>
.app {
  display: flex;
  flex-direction: column;
  height: 100vh;
  height: 100dvh;
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
  color: #fff; font-size: var(--font-size-lg); font-weight: 700;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.brand-text h1 { font-size: var(--font-size-lg); font-weight: 700; color: var(--color-text); letter-spacing: -0.3px; margin: 0; line-height: 1.2; }
.brand-text span { font-size: var(--font-size-xs); color: var(--color-text-secondary); }

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
  border: none;
  padding: 0;
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
  min-width: 230px;
  z-index: 100;
  overflow: hidden;
}

.profile-info { padding: var(--spacing-md) var(--spacing-lg); }
.profile-nom { font-size: var(--font-size-sm); font-weight: 600; color: var(--color-text); }
.profile-role { font-size: var(--font-size-xs); color: var(--color-text-secondary); margin-top: 2px; }

.dropdown-divider { height: 1px; background: var(--color-bg-tertiary); }

.dropdown-item {
  width: 100%;
  min-height: var(--tap-min);
  padding: 0 var(--spacing-lg);
  background: none; border: none;
  text-align: left; font-size: var(--font-size-sm); color: var(--color-text-body);
  cursor: pointer; display: flex; align-items: center; gap: var(--spacing-sm);
  transition: background 0.1s;
}
.dropdown-item:hover { background: var(--color-bg-secondary); }
.dropdown-item.danger { color: var(--color-danger-text); }
.dropdown-item.danger:hover { background: var(--color-danger-bg-soft); }

.main-content { flex: 1; overflow: hidden; display: flex; flex-direction: column; min-height: 0; }

/* --- Barre d'onglets mobile --- */
.bottom-nav {
  display: none;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: var(--color-bg);
  border-top: 1px solid var(--color-border);
  z-index: 90;
  padding-bottom: env(safe-area-inset-bottom);
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

.install-icon { font-size: 24px; color: var(--color-primary); }

.install-title {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text);
}

.install-sub {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  margin-top: 2px;
}

.install-actions {
  display: flex;
  gap: var(--spacing-sm);
  flex-shrink: 0;
}

@media (max-width: 768px) {
  .app-header {
    padding: 0 var(--spacing-lg);
    gap: var(--spacing-sm);
    height: var(--header-height-mobile);
  }
  .brand-text span { display: none; }
  .brand-text h1 { font-size: var(--font-size-base); }
  .brand-icon { width: var(--avatar-md); height: var(--avatar-md); font-size: var(--font-size-base); border-radius: var(--radius-md); }

  /* La nav du header part dans la barre du bas ; les actions vivent dans le contenu */
  .header-nav { display: none; }
  .header-right :deep(.btn) { display: none; }

  .bottom-nav { display: flex; }
  .bottom-nav :deep(.nav-item) {
    flex: 1;
    flex-direction: column;
    justify-content: center;
    gap: 2px;
    min-height: var(--bottom-nav-h);
    /* Padding minimal et débordement coupé : avec cinq onglets (athlète), la
       largeur par item tombe sous la longueur d'un libellé, et un mot trop
       long débordait sur ses voisins au lieu de rester dans sa case. */
    padding: var(--spacing-xs) 2px;
    font-size: var(--font-size-xs);
    text-align: center;
    line-height: 1.15;
    min-width: 0;
    overflow: hidden;
    border-radius: 0;
  }
  .bottom-nav :deep(.nav-item i) { font-size: 22px; }
  .bottom-nav :deep(.nav-item.active) {
    background: var(--color-primary-light);
    color: var(--color-primary-dark);
  }

  /* Le contenu ne doit jamais passer sous la barre */
  .main-content { padding-bottom: calc(var(--bottom-nav-h) + env(safe-area-inset-bottom)); }

  .install-banner { bottom: calc(var(--bottom-nav-h) + env(safe-area-inset-bottom)); }
}
</style>
