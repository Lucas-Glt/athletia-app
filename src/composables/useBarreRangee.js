import { ref, computed, reactive, watch, nextTick, onBeforeUnmount } from 'vue'

// Barre d'action rangée sous le bas de l'écran (la barre « Valider la
// séance ») : elle ne mange pas l'écran pendant qu'on remplit la séance.
//
// - En fin de défilement, elle sort au rythme du contenu, comme si elle en
//   était le dernier bloc : le conteneur réserve sa hauteur sous le contenu
//   (`hauteur`, à poser en espace vide en bas du conteneur) et les `hauteur`
//   derniers pixels de défilement la dévoilent. Contenu plus court que
//   l'écran : rien à défiler, elle est sortie d'emblée.
// - Une languette la relève d'un coup à tout moment (`relevee`), d'un tap ou
//   d'un glissé vers le haut ; un glissé vers le bas la range.
//
// `conteneur` : l'élément qui défile ; `barre` : la barre, positionnée en bas
// de ce conteneur et translatée de (1 - sortie) × (sa hauteur - depasse).
// `depasse` : hauteur (px) qui reste visible quand elle est rangée, pour
// qu'on devine la barre sur toute la largeur.
export function useBarreRangee(conteneur, barre, { depasse = 0 } = {}) {
  const hauteur = ref(0)
  // 0 = rangée … 1 = entièrement sortie, d'après le défilement seul
  const parDefilement = ref(0)
  const relevee = ref(false)
  // Pendant un défilement la barre suit le contenu au pixel près : pas de
  // transition, sinon elle traîne derrière le doigt.
  const defile = ref(false)
  const sortie = computed(() => (relevee.value ? 1 : parDefilement.value))

  const mesurer = () => {
    const el = conteneur.value
    const b = barre.value
    if (!el || !b) return
    hauteur.value = b.offsetHeight
    const reste = el.scrollHeight - el.scrollTop - el.clientHeight
    // Ce qui est caché sort pixel pour pixel avec le défilement. < 1 px :
    // défilement fractionnaire (zoom, écrans haute densité).
    const cache = Math.max(1, hauteur.value - depasse)
    parDefilement.value = reste < 1 ? 1 : Math.max(0, 1 - reste / cache)
  }
  // L'espace réservé suit la hauteur de la barre (message d'erreur…) : la
  // longueur à défiler change au rendu suivant, on remesure à ce moment-là.
  watch(hauteur, () => nextTick(mesurer))

  let finDefilement = null
  const surDefilement = () => {
    defile.value = true
    clearTimeout(finDefilement)
    finDefilement = setTimeout(() => { defile.value = false }, 150)
    mesurer()
  }

  let detacher = null
  watch([conteneur, barre], ([el, b]) => {
    detacher?.()
    detacher = null
    if (!el || !b) return
    // Le contenu change de hauteur sans que le conteneur bouge (autre séance,
    // police chargée) : on observe aussi chacun de ses enfants.
    const ro = new ResizeObserver(() => mesurer())
    const suivreEnfants = () => { for (const enfant of el.children) ro.observe(enfant) }
    ro.observe(el)
    ro.observe(b)
    suivreEnfants()
    const mo = new MutationObserver(() => { suivreEnfants(); mesurer() })
    mo.observe(el, { childList: true })
    el.addEventListener('scroll', surDefilement, { passive: true })
    mesurer()
    detacher = () => {
      ro.disconnect()
      mo.disconnect()
      el.removeEventListener('scroll', surDefilement)
      clearTimeout(finDefilement)
      defile.value = false
    }
  }, { flush: 'post' })
  onBeforeUnmount(() => detacher?.())

  // Languette : un tap bascule, un glissé vertical décide du sens. Le clic qui
  // suit un glissé (même doigt) est ignoré, sinon il annulerait le geste.
  let departY = null
  let dernierGeste = 0
  const languetteBas = (e) => {
    departY = e.clientY
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }
  const languetteHaut = (e) => {
    if (departY === null) return
    const dy = e.clientY - departY
    departY = null
    if (Math.abs(dy) < 12) return
    relevee.value = dy < 0
    dernierGeste = Date.now()
  }
  const languetteAnnulee = () => { departY = null }
  const languetteClic = () => {
    if (Date.now() - dernierGeste < 400) return
    relevee.value = !relevee.value
  }

  return reactive({
    hauteur, depasse, parDefilement, relevee, defile, sortie,
    languetteBas, languetteHaut, languetteAnnulee, languetteClic
  })
}
