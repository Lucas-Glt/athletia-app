<template>
  <!-- Le logo (public/logo.svg) en ligne : ses trois tranches peuvent ainsi
       glisser en place une par une. Garder les deux dessins identiques. -->
  <svg
    class="logo-anime"
    :class="{ allume }"
    viewBox="0 0 100 100"
    :width="taille"
    :height="taille"
    aria-hidden="true"
  >
    <defs>
      <linearGradient :id="ids.fond" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#1D1846" />
        <stop offset="1" stop-color="#0C0A22" />
      </linearGradient>
      <linearGradient :id="ids.encre" gradientUnits="userSpaceOnUse" x1="15" y1="5" x2="85" y2="95">
        <stop offset="0" stop-color="#C2BCFF" />
        <stop offset="1" stop-color="#4FE3D6" />
      </linearGradient>
      <path
        :id="ids.a"
        d="M39 10H61L88 90H68L63.5 76H36.5L32 90H12Z M50 34L58 60H42Z"
        fill-rule="evenodd"
        :fill="`url(#${ids.encre})`"
      />
      <clipPath :id="ids.t0"><rect x="-40" y="-10" width="180" height="49" /></clipPath>
      <clipPath :id="ids.t1"><rect x="-40" y="42" width="180" height="23" /></clipPath>
      <clipPath :id="ids.t2"><rect x="-40" y="68" width="180" height="42" /></clipPath>
    </defs>
    <rect width="100" height="100" rx="22" :fill="`url(#${ids.fond})`" />
    <g transform="translate(50 50) scale(0.66) translate(-50 -50) translate(10.6 0) skewX(-12)">
      <g :clip-path="`url(#${ids.t0})`"><use ref="t0" :href="`#${ids.a}`" x="9" /></g>
      <g :clip-path="`url(#${ids.t1})`"><use ref="t1" :href="`#${ids.a}`" x="2" /></g>
      <g :clip-path="`url(#${ids.t2})`"><use ref="t2" :href="`#${ids.a}`" x="-5" /></g>
    </g>
  </svg>
</template>

<script>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { createTimeline } from 'animejs'
import { mouvementReduit } from '../animations/mouvement'

// Identifiants SVG propres à chaque logo affiché : deux logos sur la même
// page se partageraient sinon dégradés et découpes.
let compteur = 0

// Logo « Tranches » qui s'assemble : chaque tranche du A arrive de son côté,
// de haut en bas, puis le néon s'allume.
export default {
  props: {
    taille: { type: Number, default: 64 },
    // Délai avant l'assemblage (ms), pour l'enchaîner avec un autre effet
    delai: { type: Number, default: 0 }
  },
  emits: ['assemble'],
  setup(props, { emit }) {
    const n = ++compteur
    const ids = {
      fond: `logo-fond-${n}`,
      encre: `logo-encre-${n}`,
      a: `logo-a-${n}`,
      t0: `logo-t0-${n}`,
      t1: `logo-t1-${n}`,
      t2: `logo-t2-${n}`
    }
    const t0 = ref(null)
    const t1 = ref(null)
    const t2 = ref(null)
    const allume = ref(false)
    let timeline = null

    onMounted(() => {
      if (mouvementReduit()) {
        allume.value = true
        emit('assemble')
        return
      }
      // Tranches du haut et du bas depuis la gauche, celle du milieu depuis la
      // droite : le A se « recoud » comme il a été découpé.
      const tranches = [
        { el: t0.value, x: 9, depuis: -70 },
        { el: t1.value, x: 2, depuis: 70 },
        { el: t2.value, x: -5, depuis: -70 }
      ]
      // Masquées avant le premier rendu : sans ça le logo complet
      // apparaîtrait un instant avant de se défaire pour s'assembler.
      tranches.forEach((t) => { t.el.style.opacity = '0' })
      timeline = createTimeline({
        delay: props.delai,
        onComplete: () => {
          allume.value = true
          emit('assemble')
        }
      })
      tranches.forEach((t, i) => {
        timeline.add(
          t.el,
          { x: { from: t.x + t.depuis, to: t.x }, opacity: { from: 0, to: 1 }, duration: 620, ease: 'outBack(1.4)' },
          i * 110
        )
      })
    })
    onBeforeUnmount(() => timeline?.pause())

    return { ids, t0, t1, t2, allume }
  }
}
</script>

<style scoped>
.logo-anime {
  display: block;
  border-radius: 22%;
  transition: box-shadow 0.6s var(--ease-standard);
}
/* Assemblé : le néon s'allume d'un coup puis se pose */
.logo-anime.allume { animation: neon-allume 1.1s ease-out both; }
@keyframes neon-allume {
  0% { box-shadow: 0 0 0 0 rgba(79, 227, 214, 0); }
  35% { box-shadow: 0 0 34px 6px rgba(79, 227, 214, 0.55); }
  100% { box-shadow: 0 0 18px 0 rgba(79, 227, 214, 0.22); }
}
@media (prefers-reduced-motion: reduce) {
  .logo-anime.allume { animation: none; box-shadow: 0 0 18px 0 rgba(79, 227, 214, 0.22); }
}
</style>
