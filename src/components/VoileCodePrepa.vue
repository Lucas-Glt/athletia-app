<template>
  <!-- Athlète suivi par aucun préparateur : l'appli reste visible et la
       navigation utilisable (en-tête, barre du bas), mais le contenu est
       voilé tant que le code de son préparateur n'est pas saisi. Le code
       saisi, le voile se dissipe. -->
  <div class="voile" :class="{ remonte }" role="dialog" aria-modal="false" aria-labelledby="voile-titre">
    <div ref="carte" class="voile-carte" :class="{ ouverte: deverrouille }">
      <span class="voile-icone" aria-hidden="true">
        <i class="ti" :class="deverrouille ? 'ti-lock-open' : 'ti-lock'"></i>
      </span>

      <template v-if="!deverrouille">
        <h2 id="voile-titre">Entrez le code de votre préparateur physique</h2>
        <p class="voile-texte voile-explication">
          6 lettres et chiffres, donnés par votre préparateur. Une fois le code saisi,
          il suit votre entraînement et toute l'application se débloque.
        </p>

        <form class="voile-form" @submit.prevent="valider">
          <label ref="cases" class="cases" :class="{ erreur: !!erreur, actif: focus }">
            <span class="sr-only">Code de votre préparateur</span>
            <input
              ref="champ"
              :value="code"
              class="champ"
              type="text"
              inputmode="text"
              autocapitalize="characters"
              autocomplete="off"
              autocorrect="off"
              spellcheck="false"
              :maxlength="LONGUEUR + 4"
              :disabled="envoi"
              aria-describedby="voile-aide"
              @input="saisir"
              @focus="auFocus"
              @blur="focus = false"
            />
            <span
              v-for="i in LONGUEUR"
              :key="i"
              class="case"
              :class="{ remplie: !!code[i - 1], courante: focus && i - 1 === Math.min(code.length, LONGUEUR - 1) }"
              aria-hidden="true"
            >{{ code[i - 1] || '' }}</span>
          </label>

          <p v-if="erreur" class="voile-erreur" role="alert">{{ erreur }}</p>
          <p v-else-if="info" class="voile-info" role="status">{{ info }}</p>

          <button class="btn btn-primary voile-bouton" type="submit" :disabled="code.length < LONGUEUR || envoi">
            <i class="ti" :class="envoi ? 'ti-loader-2 tourne' : 'ti-lock-open'"></i>
            {{ envoi ? 'Vérification…' : 'Débloquer' }}
          </button>
        </form>

        <p id="voile-aide" class="voile-aide">Pas encore de code ? Demandez-le à votre préparateur physique.</p>
      </template>

      <template v-else>
        <h2 id="voile-titre">C'est parti !</h2>
        <p class="voile-texte" role="status">{{ succes }}</p>
      </template>
    </div>
  </div>
</template>

<script>
import { nextTick, onMounted, ref } from 'vue'
import { useApi } from '../services/api'
import { useAuthStore } from '../stores/auth'
import { gerbe } from '../animations/confettis'
import { origineDe, pointeurFin } from '../animations/mouvement'

const LONGUEUR = 6
// Temps laissé au cadenas ouvert avant que le voile se dissipe
const PAUSE_DEVERROUILLAGE_MS = 1100

export default {
  setup() {
    const api = useApi()
    const authStore = useAuthStore()
    const code = ref('')
    const envoi = ref(false)
    const erreur = ref('')
    const info = ref('')
    const succes = ref('')
    const deverrouille = ref(false)
    const focus = ref(false)
    // Au téléphone, le clavier couvre la moitié basse de l'écran : dès la
    // première saisie, la fenêtre remonte (et le reste, même clavier fermé,
    // pour que rien ne bouge sous le doigt au moment de toucher un bouton).
    const remonte = ref(false)
    const auFocus = () => {
      focus.value = true
      if (!pointeurFin()) remonte.value = true
    }
    const champ = ref(null)
    const cases = ref(null)
    const carte = ref(null)

    // « k7p-4qx », un code collé avec des espaces… : seules les lettres et
    // les chiffres comptent, en majuscules.
    const saisir = (e) => {
      const propre = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, LONGUEUR)
      code.value = propre
      if (e.target.value !== propre) e.target.value = propre
      erreur.value = ''
      // Le 6e caractère tapé valide directement.
      if (propre.length === LONGUEUR) valider()
    }

    const secouer = () => {
      const el = cases.value
      if (!el) return
      el.classList.remove('secoue')
      void el.offsetWidth
      el.classList.add('secoue')
    }

    const valider = async () => {
      if (envoi.value || code.value.length < LONGUEUR) return
      envoi.value = true
      erreur.value = ''
      info.value = ''
      try {
        const resultat = await api.post('/users/me/code', { code: code.value })
        const user = await api.get('/users/me')
        if (user.a_un_prepa === false) {
          // Code de club : le club est rejoint, mais toujours aucun préparateur.
          info.value = `${resultat.message} Il manque encore le code de votre préparateur.`
          code.value = ''
          authStore.setAuth(authStore.token, user.role, user)
          return
        }
        succes.value = resultat.message
        deverrouille.value = true
        await nextTick()
        gerbe(origineDe(carte.value))
        setTimeout(() => authStore.setAuth(authStore.token, user.role, user), PAUSE_DEVERROUILLAGE_MS)
      } catch (e) {
        erreur.value = e.message || 'Code refusé'
        secouer()
        await nextTick()
        champ.value?.select()
      } finally {
        envoi.value = false
      }
    }

    // À l'ordinateur, on peut taper tout de suite. Au téléphone, le clavier
    // ne s'ouvre pas tout seul : il cacherait la moitié de la fenêtre.
    onMounted(() => {
      if (pointeurFin()) champ.value?.focus({ preventScroll: true })
    })

    return { LONGUEUR, code, envoi, erreur, info, succes, deverrouille, focus, remonte, auFocus, champ, cases, carte, saisir, valider }
  }
}
</script>

<style scoped>
/* Entre l'en-tête et la barre du bas, sous leurs menus : on navigue, mais le
   contenu reste inaccessible (AppLayout le rend inerte). */
.voile {
  position: fixed;
  top: var(--header-height-desktop);
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-lg) var(--spacing-lg) 12vh;
  background: color-mix(in srgb, var(--color-bg-app) 55%, transparent);
  backdrop-filter: blur(9px) saturate(0.7);
  -webkit-backdrop-filter: blur(9px) saturate(0.7);
  overflow-y: auto;
}

.voile-carte {
  width: 100%;
  max-width: 400px;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-modal);
  padding: var(--spacing-xl) var(--spacing-xl) var(--spacing-lg);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-sm);
  text-align: center;
  animation: arrivee 0.45s cubic-bezier(0.2, 0.9, 0.3, 1.15) backwards;
  transition: box-shadow 0.4s ease, border-color 0.4s ease;
}
/* Clavier ouvert : la fenêtre en haut, sans le texte d'explication, pour
   garder les cases et le message d'erreur au-dessus du clavier. */
.voile.remonte { align-items: flex-start; padding-top: var(--spacing-md); }
.remonte .voile-explication { display: none; }

.voile-carte.ouverte { border-color: var(--color-primary); box-shadow: var(--shadow-modal), var(--glow-neon); }

.voile-icone {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 28px;
  color: var(--color-primary-text);
  background: var(--color-primary-light);
  margin-bottom: var(--spacing-xs);
}
.ouverte .voile-icone { animation: deverrouillage 0.55s cubic-bezier(0.2, 0.9, 0.3, 1.4); }

h2 { margin: 0; font-size: var(--font-size-lg); font-weight: 700; color: var(--color-text); line-height: 1.3; }
.voile-texte { margin: 0; font-size: var(--font-size-sm); color: var(--color-text-secondary); line-height: 1.5; }

.voile-form { width: 100%; display: flex; flex-direction: column; align-items: center; gap: var(--spacing-md); margin-top: var(--spacing-md); }

/* Six cases ; le vrai champ, invisible, est posé dessus (saisie, collage,
   correcteur et lecteurs d'écran passent par lui). */
.cases { position: relative; display: flex; gap: 8px; cursor: text; }
.champ {
  position: absolute;
  inset: 0;
  width: 100%;
  opacity: 0;
  border: 0;
  /* 16 px : en dessous, iOS zoome sur le champ */
  font-size: 16px;
  color: transparent;
  caret-color: transparent;
  background: transparent;
}
.case {
  width: 44px;
  height: 54px;
  display: grid;
  place-items: center;
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg-app);
  font-size: var(--font-size-xl);
  font-weight: 800;
  color: var(--color-text);
  font-variant-numeric: tabular-nums;
  transition: border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;
}
.case.remplie { border-color: var(--color-primary-lighter); animation: frappe 0.18s ease-out; }
.case.courante { border-color: var(--color-primary); box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary) 25%, transparent); }
.cases.erreur .case { border-color: var(--color-danger-border); }
.cases.secoue { animation: secousse 0.4s ease; }

.voile-erreur { margin: 0; font-size: var(--font-size-sm); color: var(--color-danger-text); }
.voile-info { margin: 0; font-size: var(--font-size-sm); color: var(--color-primary-text); }
.voile-bouton { width: 100%; justify-content: center; }
.voile-aide { margin: var(--spacing-xs) 0 0; font-size: var(--font-size-xs); color: var(--color-text-secondary); }

.tourne { animation: tourne 0.9s linear infinite; }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }

@keyframes arrivee { from { opacity: 0; transform: translateY(14px) scale(0.96); } }
@keyframes frappe { 50% { transform: scale(1.08); } }
@keyframes secousse {
  20%, 60% { transform: translateX(-6px); }
  40%, 80% { transform: translateX(6px); }
}
@keyframes deverrouillage {
  40% { transform: scale(1.25) rotate(-12deg); }
  100% { transform: scale(1) rotate(0); }
}
@keyframes tourne { to { transform: rotate(360deg); } }

@media (max-width: 768px) {
  .voile {
    top: var(--header-height-mobile);
    padding-bottom: calc(var(--bottom-nav-h) + env(safe-area-inset-bottom) + 8vh);
  }
  .voile-carte { padding: var(--spacing-lg); }
}
@media (max-width: 380px) {
  .cases { gap: 6px; }
  .case { width: 40px; height: 50px; }
}
@media (prefers-reduced-motion: reduce) {
  .voile-carte, .case.remplie, .cases.secoue, .ouverte .voile-icone { animation: none; }
}
</style>
