<template>
  <!-- Structure imposée par Atropos : .atropos > .atropos-scale >
       .atropos-rotate > .atropos-inner. data-atropos-offset décale chaque
       couche en profondeur quand la carte s'incline. -->
  <div
    ref="racine"
    class="atropos carte-titre"
    :class="[`carte-${taille}`, { verrouillee }]"
    role="img"
    :aria-label="verrouillee ? `${titre}, titre à débloquer au niveau ${niveau}` : `Titre ${titre}, niveau ${niveau}`"
  >
    <div class="atropos-scale">
      <div class="atropos-rotate">
        <div class="atropos-inner carte-face">
          <span class="carte-motif" data-atropos-offset="-4"></span>
          <span class="carte-niveau" data-atropos-offset="2">Niv. {{ niveau }}</span>
          <span class="carte-embleme" data-atropos-offset="7">
            <i class="ti" :class="icone"></i>
          </span>
          <strong class="carte-nom" data-atropos-offset="4">{{ titre }}</strong>
          <p v-if="verrouillee" class="carte-phrase" data-atropos-offset="3">Se débloque au niveau {{ niveau }}</p>
          <p v-else-if="phrase" class="carte-phrase" data-atropos-offset="3">« {{ phrase }} »</p>
          <span class="carte-marque" data-atropos-offset="1">Athletia</span>
          <span v-if="!verrouillee" class="carte-holo"></span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import Atropos from 'atropos'
import 'atropos/css'
import { mouvementReduit } from '../../animations/mouvement'

// Un titre (Crevette, Titan, Légende…) présenté en carte de collection : elle
// s'incline sous le doigt et son reflet holographique suit l'inclinaison. Un
// titre pas encore débloqué apparaît en silhouette.
export default {
  props: {
    titre: { type: String, required: true },
    niveau: { type: Number, required: true },
    icone: { type: String, default: 'ti-star' },
    phrase: { type: String, default: '' },
    verrouillee: { type: Boolean, default: false },
    // 'grande' (passage de niveau, aperçu) ou 'moyenne' (en tête de « Mes titres »)
    taille: { type: String, default: 'grande' },
    // Inclinaison au doigt. 'scroll-y' : le glissé vertical fait défiler la
    // page au lieu d'incliner la carte (carte posée dans une liste qui défile).
    inclinaison: { type: [Boolean, String], default: true }
  },
  setup(props) {
    const racine = ref(null)
    let atropos = null

    onMounted(() => {
      if (!props.inclinaison || mouvementReduit()) return
      atropos = Atropos({
        el: racine.value,
        activeOffset: 28,
        shadowScale: 1.04,
        rotateXMax: 16,
        rotateYMax: 16,
        rotateTouch: props.inclinaison,
        // Le reflet glisse à l'opposé de l'inclinaison, comme sur une vraie carte
        onRotate: (x, y) => {
          racine.value?.style.setProperty('--holo-x', `${50 - y * 3}%`)
          racine.value?.style.setProperty('--holo-y', `${50 + x * 3}%`)
        }
      })
    })
    onBeforeUnmount(() => atropos?.destroy())

    return { racine }
  }
}
</script>

<style scoped>
.carte-titre {
  --carte-l: 240px;
  width: var(--carte-l);
  max-width: 100%;
  aspect-ratio: 5 / 7;
  font-size: calc(var(--carte-l) / 15);
  /* Toujours de nuit, quel que soit le thème : c'est un objet de la marque */
  color: #F6F5FF;
}
.carte-moyenne { --carte-l: 176px; }

.carte-titre :deep(.atropos-shadow) { background: #0C0A22; }

.carte-face {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.55em;
  padding: 1.6em 1.1em 1.4em;
  border-radius: 1.1em;
  text-align: center;
  /* Bordure en dégradé (encre du logo) sous un fond nuit */
  border: 2px solid transparent;
  background:
    linear-gradient(165deg, #2A2268 0%, #15123A 52%, #0C0A22 100%) padding-box,
    linear-gradient(140deg, #C2BCFF, #7F77DD 45%, #4FE3D6) border-box;
  box-shadow: 0 18px 40px -14px rgba(12, 10, 34, 0.75);
}
.carte-motif {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background:
    radial-gradient(circle at 50% 38%, rgba(127, 119, 221, 0.45), transparent 58%),
    repeating-linear-gradient(135deg, rgba(194, 188, 255, 0.05) 0 2px, transparent 2px 11px);
  pointer-events: none;
}
.carte-niveau {
  position: absolute;
  top: 0.9em;
  left: 0.9em;
  padding: 0.2em 0.6em;
  border-radius: 999px;
  background: rgba(79, 227, 214, 0.14);
  color: #4FE3D6;
  font-size: 0.72em;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.carte-embleme {
  position: relative;
  width: 4.6em;
  height: 4.6em;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1em;
  background: linear-gradient(135deg, #9D97E8, #5A51BE);
  box-shadow: 0 0 0 0.25em rgba(194, 188, 255, 0.18), 0 0 2.2em rgba(127, 119, 221, 0.75);
}
.carte-embleme .ti { font-size: 2.4em; color: #fff; }
.carte-nom {
  position: relative;
  margin-top: 0.4em;
  font-size: 1.45em;
  font-weight: 800;
  line-height: 1.1;
  letter-spacing: -0.02em;
}
.carte-phrase {
  position: relative;
  margin: 0;
  font-size: 0.78em;
  font-style: italic;
  line-height: 1.35;
  color: #C2BCFF;
}
.carte-marque {
  position: absolute;
  bottom: 0.8em;
  font-size: 0.6em;
  font-weight: 700;
  letter-spacing: 0.32em;
  text-transform: uppercase;
  color: rgba(194, 188, 255, 0.45);
}

/* Reflet holographique : un arc-en-ciel discret qui suit l'inclinaison
   (--holo-x/y posées par Atropos), et un éclat qui passe de temps en temps. */
.carte-holo {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  background: linear-gradient(
    115deg,
    transparent 22%,
    rgba(194, 188, 255, 0.28) 36%,
    rgba(79, 227, 214, 0.26) 46%,
    rgba(255, 255, 255, 0.3) 52%,
    rgba(255, 190, 240, 0.2) 60%,
    transparent 74%
  );
  background-size: 250% 250%;
  background-position: var(--holo-x, 50%) var(--holo-y, 50%);
  mix-blend-mode: screen;
  opacity: 0.75;
  transition: background-position 0.2s ease-out;
}
.carte-holo::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: linear-gradient(105deg, transparent 40%, rgba(255, 255, 255, 0.35) 50%, transparent 60%);
  transform: translateX(-120%);
  animation: eclat 4.5s ease-in-out 1s infinite;
}
@keyframes eclat {
  0%, 60% { transform: translateX(-120%); }
  85%, 100% { transform: translateX(120%); }
}

/* Pas encore débloqué : silhouette */
.verrouillee .carte-face {
  background:
    linear-gradient(165deg, #1E1A40 0%, #121029 100%) padding-box,
    linear-gradient(140deg, #3B3570, #2A2460) border-box;
}
.verrouillee .carte-motif { background: repeating-linear-gradient(135deg, rgba(194, 188, 255, 0.03) 0 2px, transparent 2px 11px); }
.verrouillee .carte-embleme { background: #1A1640; box-shadow: inset 0 0 0 0.15em #2C2660; }
.verrouillee .carte-embleme .ti { color: #0C0A22; filter: drop-shadow(0 0 1px #3B3570); }
.verrouillee .carte-nom { color: #7C77A8; }
.verrouillee .carte-niveau { background: rgba(124, 119, 168, 0.15); color: #A8A3CF; }
.verrouillee .carte-phrase { font-style: normal; color: #7C77A8; }

@media (prefers-reduced-motion: reduce) {
  .carte-holo::after { animation: none; }
}
</style>
