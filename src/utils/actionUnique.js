import { ref } from 'vue'

// Une action à la fois, et toujours un message en cas d'échec.
//
// Sans ça, un double-clic sur « Créer et continuer » ou « Générer 4 séries »
// envoyait deux fois la requête (2 programmes, 8 séries au lieu de 4), et un
// appel refusé par l'API ne produisait rien du tout à l'écran : le bouton ne
// faisait simplement rien.
//
//   const { occupe, erreur, executer, signaler } = useActionUnique()
//   const creer = () => executer(async () => { ... })
//   <button :disabled="occupe" @click="creer">  <p v-if="erreur">{{ erreur }}</p>
export function useActionUnique() {
  const occupe = ref(false)
  const erreur = ref('')

  const executer = async (action) => {
    if (occupe.value) return undefined
    occupe.value = true
    erreur.value = ''
    try {
      return await action()
    } catch (e) {
      erreur.value = e?.message || 'Une erreur est survenue, réessayez.'
      return undefined
    } finally {
      occupe.value = false
    }
  }

  // Pour l'enregistrement d'un champ modifié (PATCH, idempotent) : jamais
  // bloqué par une action en cours — une modification ne doit pas se perdre —
  // mais un échec s'affiche quand même.
  const signaler = async (action) => {
    try {
      return await action()
    } catch (e) {
      erreur.value = e?.message || "La modification n'a pas pu être enregistrée."
      return undefined
    }
  }

  return { occupe, erreur, executer, signaler }
}
