<template>
  <div class="celebration">
    <!-- XP gagnée : la pastille apparaît, monte et s'efface -->
    <TransitionGroup name="gain" tag="div" class="gains" aria-live="polite">
      <div v-for="g in store.gains" :key="g.id" class="gain">
        <span class="gain-xp">+{{ g.xp.toLocaleString('fr-FR') }} XP</span>
        <span v-if="g.motif" class="gain-motif">{{ g.motif }}</span>
      </div>
    </TransitionGroup>

    <div v-if="confettis.length" class="confettis" aria-hidden="true">
      <span v-for="c in confettis" :key="c.id" class="confetti" :style="c.style"></span>
    </div>

    <!-- Passage de niveau : badge qui arrive en tournant, rayons qui tournent -->
    <Transition name="niveau">
      <div v-if="store.niveauAtteint" class="niveau-overlay" @click.self="store.fermerNiveau()">
        <div class="niveau-carte" role="dialog" aria-modal="true" aria-labelledby="niveau-titre">
          <div class="niveau-rayons" aria-hidden="true"></div>
          <span class="niveau-badge"><i class="ti" :class="store.niveauAtteint.icone"></i></span>
          <p class="niveau-sur-titre">Niveau supérieur !</p>
          <h2 id="niveau-titre">Niveau {{ store.niveauAtteint.niveau }}</h2>
          <p class="niveau-titre" v-if="store.niveauAtteint.nouveauTitre">
            Nouveau titre débloqué : <strong>{{ store.niveauAtteint.titre }}</strong>
          </p>
          <p class="niveau-titre" v-else>{{ store.niveauAtteint.titre }}</p>
          <p v-if="store.niveauAtteint.nouveauTitre && store.niveauAtteint.phrase" class="niveau-phrase">
            « {{ store.niveauAtteint.phrase }} »
          </p>
          <button class="btn btn-primary" @click="store.fermerNiveau()">Continuer</button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script>
import { ref, watch, onBeforeUnmount } from 'vue'
import { useProgressionStore } from '../../stores/progression'

const COULEURS = ['#7F77DD', '#9D97E8', '#4ade80', '#fbbf24', '#f87171', '#60a5fa']
const NB_CONFETTIS = 70
const DUREE_CONFETTIS_MS = 3200

// Fêtes de l'espace athlète (séance validée, niveau gagné), pilotées par le
// store de progression. Montée une fois dans le dashboard athlète.
export default {
  setup() {
    const store = useProgressionStore()
    const confettis = ref([])
    let minuteur = null

    const mouvementReduit = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

    const lancerConfettis = () => {
      if (mouvementReduit()) return
      confettis.value = Array.from({ length: NB_CONFETTIS }, (_, i) => ({
        id: `${Date.now()}-${i}`,
        style: {
          left: `${Math.random() * 100}%`,
          width: `${6 + Math.random() * 6}px`,
          height: `${8 + Math.random() * 8}px`,
          background: COULEURS[i % COULEURS.length],
          borderRadius: Math.random() > 0.6 ? '50%' : '2px',
          animationDelay: `${Math.random() * 0.4}s`,
          animationDuration: `${1.6 + Math.random() * 1}s`,
          '--derive': `${(Math.random() - 0.5) * 180}px`,
          '--rotation': `${360 + Math.random() * 540}deg`
        }
      }))
      clearTimeout(minuteur)
      minuteur = setTimeout(() => { confettis.value = [] }, DUREE_CONFETTIS_MS)
    }

    watch(() => store.fete, lancerConfettis)
    onBeforeUnmount(() => clearTimeout(minuteur))

    return { store, confettis }
  }
}
</script>

<style scoped>
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
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 18px;
  border-radius: var(--radius-full);
  background: var(--gradient-primary);
  color: var(--color-on-primary);
  box-shadow: 0 10px 28px -8px rgba(83, 74, 183, 0.65);
  white-space: nowrap;
}
.gain-xp { font-size: var(--font-size-lg); font-weight: 800; letter-spacing: -0.3px; }
.gain-motif { font-size: var(--font-size-sm); font-weight: 600; opacity: 0.9; }
.gain-enter-active { animation: gain-pop 0.55s var(--ease-standard); }
.gain-leave-active { transition: opacity 0.45s ease, transform 0.45s ease; }
.gain-leave-to { opacity: 0; transform: translateY(-18px); }
@keyframes gain-pop {
  0% { opacity: 0; transform: translateY(12px) scale(0.6); }
  60% { opacity: 1; transform: translateY(0) scale(1.1); }
  100% { transform: scale(1); }
}

.confettis { position: fixed; inset: 0; z-index: 310; overflow: hidden; pointer-events: none; }
.confetti {
  position: absolute;
  top: -24px;
  animation-name: confetti-chute;
  animation-timing-function: cubic-bezier(0.25, 0.6, 0.5, 1);
  animation-fill-mode: forwards;
}
@keyframes confetti-chute {
  0% { transform: translate(0, 0) rotate(0deg); opacity: 1; }
  100% { transform: translate(var(--derive), 105vh) rotate(var(--rotation)); opacity: 0.85; }
}

.niveau-overlay {
  position: fixed;
  inset: 0;
  z-index: 305;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-lg);
  background: rgba(15, 12, 41, 0.55);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}
.niveau-carte {
  position: relative;
  overflow: hidden;
  width: 100%;
  max-width: 340px;
  padding: var(--spacing-3xl) var(--spacing-2xl) var(--spacing-2xl);
  border-radius: var(--radius-xl);
  background: var(--color-bg);
  box-shadow: var(--shadow-modal);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  text-align: center;
}
.niveau-rayons {
  position: absolute;
  top: -130px;
  left: 50%;
  width: 380px;
  height: 380px;
  margin-left: -190px;
  border-radius: 50%;
  background: repeating-conic-gradient(var(--color-primary-light) 0deg 12deg, transparent 12deg 24deg);
  animation: rayons 14s linear infinite;
}
@keyframes rayons { to { transform: rotate(360deg); } }
.niveau-badge {
  position: relative;
  width: 92px;
  height: 92px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--gradient-primary);
  color: var(--color-on-primary);
  font-size: 46px;
  box-shadow: 0 12px 32px -8px rgba(83, 74, 183, 0.7);
  animation: badge-arrivee 0.9s var(--ease-standard) both;
}
@keyframes badge-arrivee {
  0% { transform: scale(0) rotate(-200deg); }
  70% { transform: scale(1.15) rotate(12deg); }
  100% { transform: scale(1) rotate(0deg); }
}
.niveau-sur-titre {
  position: relative;
  margin: var(--spacing-md) 0 0;
  font-size: var(--font-size-sm);
  font-weight: 700;
  letter-spacing: 0.6px;
  text-transform: uppercase;
  color: var(--color-primary-dark);
}
.niveau-carte h2 { position: relative; margin: 0; font-size: 32px; font-weight: 800; letter-spacing: -0.5px; }
.niveau-titre { position: relative; margin: 0 0 var(--spacing-md); color: var(--color-text-secondary); }
.niveau-phrase {
  position: relative;
  margin: calc(-1 * var(--spacing-sm)) 0 var(--spacing-md);
  font-size: var(--font-size-sm);
  font-style: italic;
  color: var(--color-primary-dark);
}
.niveau-carte .btn { position: relative; width: 100%; }
.niveau-enter-active, .niveau-leave-active { transition: opacity 0.3s ease; }
.niveau-enter-from, .niveau-leave-to { opacity: 0; }

@media (prefers-reduced-motion: reduce) {
  .gain-enter-active, .niveau-rayons, .niveau-badge { animation: none; }
}
</style>
