// Petit message éphémère affiché en haut de l'écran, par-dessus les modales :
// pour une confirmation qu'on doit voir tout de suite (ex. « Lien envoyé à… »)
// même quand le bouton est en bas d'une modale qui défile sur téléphone.
// Un seul message à la fois : le suivant remplace le précédent.
import { ref } from 'vue'

const toast = ref(null)
let minuteur = null
let compteur = 0

export function fermerToast() {
  clearTimeout(minuteur)
  toast.value = null
}

export function afficherToast(texte, type = 'succes', duree = 6000) {
  clearTimeout(minuteur)
  toast.value = { id: ++compteur, texte, type }
  if (duree) minuteur = setTimeout(fermerToast, duree)
}

export function useToast() {
  return { toast, afficherToast, fermerToast }
}
