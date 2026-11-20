<template>
  <div class="celebration">
    <!-- XP gagnée : la pastille arrive, le nombre défile et la jauge du
         niveau se remplit sous les yeux -->
    <TransitionGroup name="gain" tag="div" class="gains" aria-live="polite">
      <div v-for="g in store.gains" :key="g.id" class="gain" :data-gain="g.id">
        <div class="gain-tete">
          <span class="gain-xp" aria-hidden="true">+<span v-compteur="g.xp"></span> XP</span>
          <span class="sr-only">+{{ g.xp }} XP</span>
          <span v-if="g.motif" class="gain-motif">{{ g.motif }}</span>
        </div>
        <div v-if="g.jauge" v-jauge-gain="g.jauge" class="gain-jauge" aria-hidden="true">
          <span class="gain-niveau">Niv. {{ g.jauge.niveau }}</span>
          <span class="gain-piste"><span class="gain-rempli" :style="{ width: `${g.jauge.de}%` }"></span></span>
        </div>
      </div>
    </TransitionGroup>

    <!-- Passage de niveau : flash, le badge (ou la carte du nouveau titre)
         tombe et rebondit, le texte s'écrit, les confettis partent. -->
    <Transition name="niveau">
      <div
        v-if="n"
        ref="overlay"
        tabindex="-1"
        class="niveau-overlay"
        :class="{ 'en-scene': enScene }"
        role="dialog"
        aria-modal="true"
        aria-labelledby="niveau-titre"
        @click.self="fermer"
        @keydown.esc="fermer"
      >
        <span ref="flash" class="niveau-flash" aria-hidden="true"></span>
        <div class="niveau-scene">
          <div ref="objet" class="niveau-objet">
            <span ref="rayons" class="niveau-rayons" aria-hidden="true"></span>
            <CarteTitre
              v-if="n.nouveauTitre"
              :titre="n.titre"
              :niveau="n.niveau"
              :icone="n.icone"
              :phrase="n.phrase"
            />
            <div v-else ref="badgeAtropos" class="atropos niveau-atropos">
              <div class="atropos-scale">
                <div class="atropos-rotate">
                  <div class="atropos-inner">
                    <span class="niveau-badge" data-atropos-offset="6"><i class="ti" :class="n.icone"></i></span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <p ref="surTitreEl" class="niveau-sur-titre" :aria-label="surTitre">
            <span v-for="(c, i) in surTitre" :key="i" class="lettre" aria-hidden="true">{{ c === ' ' ? '\u00a0' : c }}</span>
          </p>
          <h2 id="niveau-titre" ref="titreNiveau">Niveau <span ref="numero">{{ n.niveau }}</span></h2>
          <p v-if="!n.nouveauTitre" ref="sousTitre" class="niveau-titre">{{ n.titre }}</p>
          <button ref="bouton" class="btn btn-primary niveau-continuer" @click="fermer">Continuer</button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script>
import { ref, computed, watch, nextTick, onBeforeUnmount } from 'vue'
import { animate, createTimeline, stagger, spring, cleanInlineStyles } from 'animejs'
import Atropos from 'atropos'
import 'atropos/css'
import { useProgressionStore } from '../../stores/progression'
import { mouvementReduit, animerNombre, formatFr, origineDe } from '../../animations/mouvement'
import { gerbe, canons } from '../../animations/confettis'
import CarteTitre from './CarteTitre.vue'

// Jauge de la pastille d'XP : de l'ancien avancement au nouveau, en passant
// par « pleine » puis « vide » si un niveau est franchi entre les deux.
const vJaugeGain = {
  mounted(el, { value: j }) {
    const rempli = el.querySelector('.gain-rempli')
    if (mouvementReduit()) {
      rempli.style.width = `${j.a}%`
      return
    }
    const tl = createTimeline({ delay: 450 })
    if (j.montee) {
      tl.add(rempli, { width: [`${j.de}%`, '100%'], duration: 600, ease: 'inOutQuad' })
        .add(rempli, { width: ['0%', `${j.a}%`], duration: 700, ease: 'outExpo' })
    } else {
      tl.add(rempli, { width: [`${j.de}%`, `${j.a}%`], duration: 1000, ease: 'outExpo' })
    }
  }
}

// Fêtes de l'espace athlète (séance validée, XP gagnée, niveau franchi),
// pilotées par le store de progression. Montée une fois dans le dashboard.
export default {
  components: { CarteTitre },
  directives: { jaugeGain: vJaugeGain },
  setup() {
    const store = useProgressionStore()
    const n = computed(() => store.niveauAtteint)
    const surTitre = computed(() => (n.value?.nouveauTitre ? 'Nouveau titre débloqué !' : 'Niveau supérieur !'))
    // Mise en scène animée : les éléments partent masqués (cf. .en-scene) et
    // la timeline les fait apparaître. Sinon, tout est affiché d'emblée.
    const enScene = !mouvementReduit()

    const overlay = ref(null)
    const flash = ref(null)
    const objet = ref(null)
    const rayons = ref(null)
    const badgeAtropos = ref(null)
    const surTitreEl = ref(null)
    const titreNiveau = ref(null)
    const numero = ref(null)
    const sousTitre = ref(null)
    const bouton = ref(null)
    let timeline = null
    let atropos = null
    let minuteurs = []

    // --- Séance validée : gerbe depuis le bouton ---
    watch(() => store.fete, () => gerbe(store.origineFete))

    // --- XP gagnée : si la jauge de l'accueil est à l'écran, un « +500 »
    // s'envole de la pastille jusqu'à elle ---
    const jaugeAccueilVisible = () => {
      const jauge = document.querySelector('.carte-niveau .jauge')
      const r = jauge?.getBoundingClientRect()
      return r && r.width && r.bottom > 0 && r.top < window.innerHeight ? { jauge, r } : null
    }
    const envoler = (gain) => {
      const cible = jaugeAccueilVisible()
      const pastille = document.querySelector(`[data-gain="${gain.id}"]`)
      if (!cible || !pastille || mouvementReduit()) return
      const depart = pastille.getBoundingClientRect()
      const puce = document.createElement('span')
      puce.textContent = `+${formatFr(gain.xp)}`
      Object.assign(puce.style, {
        position: 'fixed',
        zIndex: '301',
        pointerEvents: 'none',
        padding: '4px 10px',
        borderRadius: '999px',
        background: 'linear-gradient(90deg, #7F77DD, #2BB8AE)',
        color: '#fff',
        font: '800 14px/1.2 var(--font-sans)',
        boxShadow: '0 0 14px rgba(79, 227, 214, 0.55)'
      })
      document.body.appendChild(puce)
      const x0 = depart.left + depart.width / 2 - puce.offsetWidth / 2
      const y0 = depart.top + depart.height / 2 - puce.offsetHeight / 2
      puce.style.left = `${x0}px`
      puce.style.top = `${y0}px`
      const avancement = gain.jauge ? gain.jauge.a / 100 : 0.5
      const xCible = cible.r.left + cible.r.width * avancement - puce.offsetWidth / 2
      const yCible = cible.r.top + cible.r.height / 2 - puce.offsetHeight / 2
      animate(puce, {
        // x et y n'ont pas la même courbe : la puce décrit un arc
        translateX: { to: xCible - x0, ease: 'inOutSine' },
        translateY: { to: yCible - y0, ease: 'inBack(1.8)' },
        scale: { to: 0.55, ease: 'inQuad' },
        duration: 780,
        delay: 650,
        onComplete: () => {
          puce.remove()
          animate(cible.jauge, {
            scaleY: [1, 1.9, 1],
            duration: 520,
            ease: 'outQuad',
            onComplete: (a) => cleanInlineStyles(a)
          })
        }
      })
    }
    watch(
      () => store.gains.length,
      (apres, avant) => {
        if (apres <= avant) return
        const gain = store.gains[store.gains.length - 1]
        nextTick(() => envoler(gain))
      }
    )

    // --- Passage de niveau ---
    const fermer = () => store.fermerNiveau()

    const mettreEnScene = () => {
      // Focus sur la fenêtre (Échap ferme, Tab mène à « Continuer ») sans
      // l'anneau de focus qu'afficherait le bouton focalisé par script.
      overlay.value?.focus({ preventScroll: true })
      const lettres = surTitreEl.value?.querySelectorAll('.lettre') || []
      if (badgeAtropos.value && !mouvementReduit()) {
        atropos = Atropos({
          el: badgeAtropos.value,
          activeOffset: 30,
          shadow: false,
          rotateXMax: 22,
          rotateYMax: 22
        })
      }
      if (mouvementReduit()) return
      const textes = [sousTitre.value, bouton.value].filter(Boolean)
      timeline = createTimeline()
      timeline
        .add(flash.value, { opacity: [0, 0.9, 0], scale: [0.4, 1.8], duration: 700, ease: 'outQuad' }, 0)
        .add(
          objet.value,
          {
            translateY: [-300, 0],
            rotate: [-16, 0],
            scale: [0.7, 1],
            opacity: { from: 0, to: 1, duration: 200 },
            ease: spring({ bounce: 0.45, duration: 750 })
          },
          120
        )
        .add(rayons.value, { opacity: [0, 1], scale: [0.5, 1], duration: 900, ease: 'outQuad' }, 300)
        .add(lettres, { opacity: [0, 1], translateY: [16, 0], duration: 420, delay: stagger(22), ease: 'outBack(2)' }, 560)
        .add(titreNiveau.value, { opacity: [0, 1], scale: [0.6, 1], duration: 520, ease: 'outBack(2.2)' }, 760)
        .add(textes, { opacity: [0, 1], translateY: [12, 0], duration: 420, delay: stagger(140), ease: 'outQuad' }, 980)
      // Le numéro défile de l'ancien niveau au nouveau
      minuteurs.push(setTimeout(() => {
        if (numero.value) animerNombre(numero.value, n.value.niveauAvant, n.value.niveau, { duree: 600 })
      }, 760))
      // Canons au flash, gerbe quand le badge atterrit
      minuteurs.push(setTimeout(canons, 150))
      minuteurs.push(setTimeout(() => gerbe(origineDe(objet.value)), 700))
    }

    const nettoyer = () => {
      timeline?.pause()
      timeline = null
      atropos?.destroy()
      atropos = null
      minuteurs.forEach(clearTimeout)
      minuteurs = []
    }
    watch(n, (valeur) => {
      nettoyer()
      if (valeur) nextTick(mettreEnScene)
    })
    onBeforeUnmount(nettoyer)

    return {
      store, n, surTitre, enScene, fermer,
      overlay, flash, objet, rayons, badgeAtropos, surTitreEl, titreNiveau, numero, sousTitre, bouton
    }
  }
}
</script>

<style scoped>
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}

/* --- Pastille d'XP --- */
.gains {
  position: fixed;
  top: calc(72px + env(safe-area-inset-top, 0px));
  left: 50%;
  transform: translateX(-50%);
  z-index: 300;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  pointer-events: none;
}
.gain {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 210px;
  padding: 10px 18px 12px;
  border-radius: var(--radius-xl);
  background: linear-gradient(135deg, #2A2268, #0C0A22);
  color: #F6F5FF;
  box-shadow: 0 14px 34px -10px rgba(12, 10, 34, 0.7), 0 0 0 1px rgba(194, 188, 255, 0.2);
  white-space: nowrap;
}
.gain-tete { display: flex; align-items: baseline; justify-content: center; gap: 8px; }
.gain-xp {
  font-size: var(--font-size-xl);
  font-weight: 800;
  letter-spacing: -0.3px;
  font-variant-numeric: tabular-nums;
  background: linear-gradient(90deg, #C2BCFF, #4FE3D6);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
.gain-motif { font-size: var(--font-size-sm); font-weight: 600; color: #C2BCFF; }
.gain-jauge { display: flex; align-items: center; gap: 8px; }
.gain-niveau { font-size: 11px; font-weight: 700; color: #A8A3CF; }
.gain-piste { flex: 1; height: 6px; border-radius: 999px; background: rgba(194, 188, 255, 0.16); overflow: hidden; }
.gain-rempli {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #C2BCFF, #4FE3D6);
  box-shadow: 0 0 10px rgba(79, 227, 214, 0.6);
}
.gain-enter-active { animation: gain-pop 0.55s var(--ease-standard); }
.gain-leave-active { transition: opacity 0.45s ease, transform 0.45s ease; }
.gain-leave-to { opacity: 0; transform: translateY(-18px); }
@keyframes gain-pop {
  0% { opacity: 0; transform: translateY(12px) scale(0.6); }
  60% { opacity: 1; transform: translateY(0) scale(1.08); }
  100% { transform: scale(1); }
}

/* --- Passage de niveau --- */
.niveau-overlay {
  outline: none;
  position: fixed;
  inset: 0;
  z-index: 305;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-xl);
  overflow: hidden;
  background: radial-gradient(circle at 50% 36%, rgba(90, 81, 190, 0.6), rgba(12, 10, 34, 0.94) 64%);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  color: #F6F5FF;
}
.niveau-flash {
  position: absolute;
  left: 50%;
  top: 36%;
  width: 560px;
  height: 560px;
  margin: -280px 0 0 -280px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.95), rgba(194, 188, 255, 0.45) 35%, transparent 65%);
  opacity: 0;
  pointer-events: none;
}
.niveau-scene {
  position: relative;
  width: 100%;
  max-width: 360px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  text-align: center;
}
.niveau-objet {
  position: relative;
  display: flex;
  justify-content: center;
  margin-bottom: var(--spacing-lg);
}
.niveau-rayons {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 480px;
  height: 480px;
  margin: -240px 0 0 -240px;
  border-radius: 50%;
  background: repeating-conic-gradient(rgba(194, 188, 255, 0.16) 0deg 10deg, transparent 10deg 20deg);
  -webkit-mask: radial-gradient(circle, #000 28%, transparent 68%);
  mask: radial-gradient(circle, #000 28%, transparent 68%);
  animation: rayons 18s linear infinite;
  pointer-events: none;
}
@keyframes rayons { to { rotate: 360deg; } }
.niveau-atropos { width: 140px; height: 140px; }
.niveau-atropos :deep(.atropos-inner) { overflow: visible; }
.niveau-badge {
  width: 140px;
  height: 140px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #9D97E8, #5A51BE);
  color: #fff;
  font-size: 68px;
  box-shadow:
    0 0 0 6px rgba(194, 188, 255, 0.18),
    0 0 0 14px rgba(79, 227, 214, 0.08),
    0 0 60px rgba(127, 119, 221, 0.85);
}
.niveau-sur-titre {
  margin: 0;
  font-size: var(--font-size-sm);
  font-weight: 800;
  letter-spacing: 1.2px;
  text-transform: uppercase;
  color: #4FE3D6;
}
.lettre { display: inline-block; }
.niveau-scene h2 {
  margin: 0;
  font-size: 40px;
  font-weight: 800;
  letter-spacing: -0.8px;
  font-variant-numeric: tabular-nums;
}
.niveau-titre { margin: 0 0 var(--spacing-md); font-weight: 600; color: #C2BCFF; }
.niveau-continuer { width: 100%; max-width: 280px; margin-top: var(--spacing-md); min-height: var(--input-h); font-size: var(--font-size-base); }
/* Masqués jusqu'à leur entrée dans la timeline (styles en ligne d'anime.js) */
.en-scene .niveau-objet,
.en-scene .niveau-rayons,
.en-scene .lettre,
.en-scene h2,
.en-scene .niveau-titre,
.en-scene .niveau-continuer { opacity: 0; }
.niveau-enter-active, .niveau-leave-active { transition: opacity 0.3s ease; }
.niveau-enter-from, .niveau-leave-to { opacity: 0; }

@media (prefers-reduced-motion: reduce) {
  .gain-enter-active, .niveau-rayons { animation: none; }
}
</style>
