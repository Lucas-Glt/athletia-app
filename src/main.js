import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { useRegisterSW } from 'virtual:pwa-register/vue'

import App from './App.vue'
import router from './router'
import { useThemeStore } from './stores/theme'

import '@tabler/icons-webfont/dist/tabler-icons.min.css'
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

const app = createApp(App)

app.use(createPinia())
app.use(router)

useThemeStore().appliquer()

app.mount('#app')
