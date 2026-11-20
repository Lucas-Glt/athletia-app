import { animate, stagger, cleanInlineStyles } from 'animejs'
import {
  animerNombre,
  cascade,
  decimalesDe,
  dessiner,
  formatFr,
  lireNombre,
  mouvementReduit,
  pointeurFin
} from './mouvement'

// Directives d'animation, enregistrées une fois dans main.js. Chacune
// s'efface d'elle-même si l'utilisateur a demandé à réduire les animations.

// v-cascade="cle" : les enfants directs apparaissent l'un après l'autre au
// montage. Ensuite, seuls les nouveaux venus (bloc chargé après coup, liste
// filtrée) font leur entrée — sauf si la clé change (autre programme, autre
// mode) : tout le contenu est alors renouvelé et rejoue la cascade.
function cascaderNouveaux(el, tous) {
  const vus = (el._cascadeVus ??= new WeakSet())
  const enfants = Array.from(el.children)
  const nouveaux = tous ? enfants : enfants.filter((e) => !vus.has(e))
  enfants.forEach((e) => vus.add(e))
  if (nouveaux.length) cascade(nouveaux)
}
export const vCascade = {
  mounted(el, { value }) {
    el._cascadeCle = value
    cascaderNouveaux(el, true)
  },
  updated(el, { value }) {
    const cleChangee = value !== el._cascadeCle
    el._cascadeCle = value
    cascaderNouveaux(el, cleChangee)
  }
}

// v-compteur="valeur" : affiche le nombre en le faisant défiler (depuis 0 au
// premier affichage, puis depuis l'ancienne valeur). L'élément doit rester
// vide dans le gabarit : la directive est seule à écrire dedans. Une valeur
// qui n'est pas un nombre (« — ») s'affiche telle quelle.
// v-compteur:1="…" impose le nombre de décimales.
function ecrireCompteur(el, { value, arg }, depuis) {
  el._compteurAnim?.pause()
  el._compteurAnim = null
  const cible = lireNombre(value)
  if (cible === null) {
    el.textContent = value ?? ''
    el._compteurValeur = null
    return
  }
  const decimales = arg !== undefined ? Number(arg) : decimalesDe(value)
  const depart = depuis ?? 0
  el._compteurValeur = cible
  if (depart === cible) {
    el.textContent = formatFr(cible, decimales)
    return
  }
  el._compteurAnim = animerNombre(el, depart, cible, { decimales })
}
export const vCompteur = {
  mounted(el, binding) {
    ecrireCompteur(el, binding, 0)
  },
  updated(el, binding) {
    if (binding.value === binding.oldValue) return
    ecrireCompteur(el, binding, el._compteurValeur)
  },
  beforeUnmount(el) {
    el._compteurAnim?.pause()
  }
}

// v-trace="cle" sur un graphique : ses lignes [data-trace] se dessinent de
// gauche à droite, puis ses points [data-point] apparaissent ; ses barres
// [data-barre] poussent depuis la gauche. Rejoué quand la clé (en pratique,
// les données du graphique) change.
function tracer(racine) {
  if (mouvementReduit()) return
  const lignes = racine.querySelectorAll('[data-trace]')
  dessiner(lignes, { decalage: 150 })
  const points = racine.querySelectorAll('[data-point]')
  if (points.length) {
    animate(points, {
      opacity: { from: 0 },
      duration: 350,
      delay: stagger(Math.min(60, 700 / points.length), { start: lignes.length ? 450 : 0 }),
      ease: 'outQuad',
      onComplete: (a) => cleanInlineStyles(a)
    })
  }
  const barres = racine.querySelectorAll('[data-barre]')
  if (barres.length) {
    animate(barres, {
      scaleX: { from: 0 },
      duration: 700,
      delay: stagger(60),
      ease: 'outExpo',
      onComplete: (a) => cleanInlineStyles(a)
    })
  }
}
export const vTrace = {
  mounted(el, { value }) {
    el._traceCle = value
    tracer(el)
  },
  updated(el, { value }) {
    if (value === el._traceCle) return
    el._traceCle = value
    tracer(el)
  }
}

// v-entree-onglet="sens" : le panneau d'un onglet arrive en glissant depuis
// la droite (sens 1) ou la gauche (sens -1). Sens 0 (premier affichage) :
// pas d'animation.
export const vEntreeOnglet = {
  mounted(el, { value }) {
    if (!value || mouvementReduit()) return
    animate(el, {
      opacity: { from: 0 },
      translateX: { from: 32 * Math.sign(value) },
      duration: 340,
      ease: 'outCubic',
      onComplete: (a) => cleanInlineStyles(a)
    })
  }
}

// v-defilement-fluide sur un conteneur qui défile : défilement amorti à la
// molette, sur ordinateur seulement (au doigt, le défilement natif est
// meilleur). Lenis n'est téléchargé que dans ce cas.
export const vDefilementFluide = {
  async mounted(el) {
    if (!pointeurFin() || mouvementReduit()) return
    const { default: Lenis } = await import('lenis')
    // Démonté pendant le téléchargement
    if (el._lenisAnnule || !el.isConnected) return
    el._lenis = new Lenis({
      wrapper: el,
      content: el,
      autoRaf: true,
      lerp: 0.12,
      // Hauteur relue à chaque défilement : le contenu change sans cesse
      // (onglets, listes filtrées) sans que le conteneur change de taille.
      naiveDimensions: true,
      // Une liste qui défile elle-même (menu, autocomplétion) garde son
      // défilement natif, et une modale ouverte par-dessus ne fait pas
      // défiler la page derrière elle.
      allowNestedScroll: true,
      prevent: (noeud) => noeud.matches?.('.modal-overlay, [data-lenis-prevent]') ?? false,
      // Conteneur momentanément figé (overflow: hidden, ex. la liste des
      // athlètes quand une fiche est ouverte) : on laisse faire le navigateur.
      virtualScroll: () => getComputedStyle(el).overflowY !== 'hidden'
    })
  },
  beforeUnmount(el) {
    el._lenisAnnule = true
    el._lenis?.destroy()
    el._lenis = null
  }
}

export function installerDirectives(app) {
  app.directive('cascade', vCascade)
  app.directive('compteur', vCompteur)
  app.directive('trace', vTrace)
  app.directive('entree-onglet', vEntreeOnglet)
  app.directive('defilement-fluide', vDefilementFluide)
}
