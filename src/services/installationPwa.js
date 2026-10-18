import { ref } from 'vue'

// Chrome/Edge/Samsung Internet n'émettent beforeinstallprompt qu'UNE fois, tôt
// au chargement de la page — en pratique pendant que l'utilisateur est sur
// l'écran de connexion. Écouté seulement depuis AppLayout (monté après login,
// sans rechargement), l'événement était perdu et la bannière d'installation
// n'apparaissait jamais. Ce module est importé dans main.js avant le montage.
export const promptInstallation = ref(null)

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  promptInstallation.value = e
})

window.addEventListener('appinstalled', () => {
  promptInstallation.value = null
})
