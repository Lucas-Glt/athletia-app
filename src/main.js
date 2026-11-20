import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { useRegisterSW } from 'virtual:pwa-register/vue'

import App from './App.vue'
import router from './router'
import { useThemeStore } from './stores/theme'
import { installerDirectives } from './animations/directives'
import { mouvementReduit, DUREE_SPLASH_MS } from './animations/mouvement'
import './services/installationPwa'

import '@tabler/icons-webfont/dist/tabler-icons.min.css'
// Police servie par l'application elle-même (et gardée hors connexion par le
// service worker) plutôt que par Google Fonts, qui recevait l'adresse IP de
// chaque visiteur.
import '@fontsource-variable/inter/wght.css'
import './assets/tokens.css'
import './assets/base.css'

// registerType: 'autoUpdate' (vite.config.js) ne suffit pas à lui seul :
// sans cet appel, le nouveau service worker s'active bien en arrière-plan
// après un déploiement (skipWaiting/clientsClaim), mais rien ne recharge
// la page déjà ouverte — elle continue de tourner sur le JS périmé (des
// chunks lazy-load peuvent même 404 puisque l'ancien build a été effacé)
// jusqu'à ce que l'utilisateur quitte et relance l'app à la main. Ce hook
// recharge automatiquement dès qu'un nouveau SW prend le contrôle.
useRegisterSW({ immediate: true })

// iOS ignore `user-scalable=no` / `maximum-scale` de la balise viewport depuis
// iOS 10 : le pinch-to-zoom ne peut être bloqué qu'en annulant les événements
// gesture* de WebKit (inexistants ailleurs, l'écoute est donc sans effet).
for (const evt of ['gesturestart', 'gesturechange', 'gestureend']) {
  document.addEventListener(evt, (e) => e.preventDefault(), { passive: false })
}

const app = createApp(App)

app.use(createPinia())
app.use(router)
installerDirectives(app)

useThemeStore().appliquer()

app.mount('#app')

// Écran de chargement (index.html) : il s'efface une fois la première page
// prête (les tableaux de bord sont chargés à part, la page resterait blanche
// entre-temps), en laissant au logo le temps de s'assembler (0,8 s depuis
// l'ouverture de la page).
const splash = document.getElementById('splash')
if (splash) {
  const effacer = () => {
    const reste = mouvementReduit() ? 0 : Math.max(0, DUREE_SPLASH_MS - performance.now())
    setTimeout(() => {
      splash.classList.add('fini')
      setTimeout(() => splash.remove(), 400)
    }, reste)
  }
  router.isReady().then(effacer, effacer)
}
