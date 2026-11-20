<template>
  <span ref="emoji" class="reaction-arrivee" aria-hidden="true">{{ emojis[0] }}</span>
</template>

<script>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { createTimeline, spring } from 'animejs'
import { mouvementReduit } from '../../animations/mouvement'
import { pluieEmoji } from '../../animations/confettis'

// Hauteur du centre de l'emoji, en fraction de l'écran (cf. .reaction-arrivee)
const HAUTEUR = 0.42

// Réaction du prépa qui vient d'arriver : son emoji surgit en grand avec un
// rebond, une petite pluie du même emoji (ou des emojis reçus) jaillit, puis
// il plonge se poser dans la bannière qui l'annonce (cf. PopupBanniere).
export default {
  props: {
    emojis: { type: Array, required: true }
  },
  emits: ['fini'],
  setup(props, { emit }) {
    const emoji = ref(null)
    let timeline = null

    onMounted(() => {
      if (mouvementReduit()) {
        emit('fini')
        return
      }
      const el = emoji.value
      const depart = el.getBoundingClientRect()
      const cible = document.querySelector('.popup-emoji')?.getBoundingClientRect()
      const dx = cible ? cible.left + cible.width / 2 - (depart.left + depart.width / 2) : 0
      const dy = cible ? cible.top + cible.height / 2 - (depart.top + depart.height / 2) : 160
      timeline = createTimeline({ onComplete: () => emit('fini') })
        .add(el, {
          scale: [0, 1],
          rotate: [-30, 0],
          opacity: { from: 0, to: 1, duration: 150 },
          ease: spring({ bounce: 0.6, duration: 650 })
        })
        .call(() => pluieEmoji(props.emojis, { x: 0.5, y: HAUTEUR }), 180)
        .add(el, { rotate: [0, -12, 10, 0], duration: 520, ease: 'inOutSine' }, 600)
        .add(
          el,
          {
            translateX: dx,
            translateY: dy,
            scale: 0.25,
            opacity: { to: 0, delay: 380, duration: 170 },
            duration: 550,
            ease: 'inBack(1.3)'
          },
          1250
        )
    })
    onBeforeUnmount(() => timeline?.pause())

    return { emoji }
  }
}
</script>

<style scoped>
.reaction-arrivee {
  position: fixed;
  left: 50%;
  top: 42%;
  z-index: 160;
  width: 104px;
  height: 104px;
  margin: -52px 0 0 -52px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 88px;
  line-height: 1;
  opacity: 0;
  pointer-events: none;
  filter: drop-shadow(0 10px 22px rgba(12, 10, 34, 0.35));
}
</style>
