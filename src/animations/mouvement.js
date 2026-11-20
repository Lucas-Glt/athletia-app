import { animate, createDrawable, stagger, cleanInlineStyles } from 'animejs'

// Préférence système « réduire les animations » : tout effet décoratif
// s'efface devant elle. L'information, elle, reste toujours affichée.
export const mouvementReduit = () =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

// Souris ou pavé tactile (ordinateur), ni doigt ni stylet.
export const pointeurFin = () =>
  window.matchMedia?.('(hover: hover) and (pointer: fine)').matches ?? false

// Écran de chargement (index.html) : temps laissé au logo pour s'assembler,
// compté depuis l'ouverture de la page.
export const DUREE_SPLASH_MS = 800

export const formatFr = (valeur, decimales = 0) =>
  Number(valeur).toLocaleString('fr-FR', {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales
  })

// Nombre lu depuis une valeur affichée : 72.4, « 72,4 », « 1 234 »… null si
// ce n'en est pas un (« — », texte).
export function lireNombre(valeur) {
  if (typeof valeur === 'number') return Number.isFinite(valeur) ? valeur : null
  if (typeof valeur !== 'string') return null
  const brut = valeur.replace(/[\s  ]/g, '').replace(',', '.')
  if (!/^-?\d+(\.\d+)?$/.test(brut)) return null
  return Number(brut)
}

// Décimales à afficher, déduites de la valeur telle qu'elle arrive
export function decimalesDe(valeur) {
  const texte = String(valeur)
  const sep = Math.max(texte.lastIndexOf(','), texte.lastIndexOf('.'))
  return sep === -1 ? 0 : Math.min(2, texte.length - sep - 1)
}

// Fait défiler le nombre écrit dans `el` de `depart` à `arrivee`. Renvoie
// l'animation (à annuler si une nouvelle valeur arrive entre-temps).
export function animerNombre(el, depart, arrivee, { duree = 900, decimales = 0, delai = 0 } = {}) {
  const ecrire = (v) => { el.textContent = formatFr(v, decimales) }
  if (mouvementReduit() || document.hidden || depart === arrivee) {
    ecrire(arrivee)
    return null
  }
  const etat = { v: depart }
  ecrire(depart)
  return animate(etat, {
    v: arrivee,
    duration: duree,
    delay: delai,
    ease: 'outExpo',
    onUpdate: () => ecrire(etat.v),
    onComplete: () => ecrire(arrivee)
  })
}

// Fait apparaître des éléments l'un après l'autre (fondu, légère montée).
// Seuls les premiers sont animés : les suivants sont hors écran, et une
// cascade trop longue retarderait l'accès au contenu.
export function cascade(elements, { decalage = 40, max = 12, depart = 0 } = {}) {
  const cibles = Array.from(elements)
    .filter((e) => e instanceof HTMLElement && e.offsetParent !== null)
    .slice(0, max)
  if (!cibles.length || mouvementReduit()) return null
  return animate(cibles, {
    opacity: { from: 0 },
    translateY: { from: 14 },
    duration: 420,
    delay: stagger(decalage, { start: depart }),
    ease: 'outQuart',
    // Styles en ligne retirés à la fin : un transform resté sur l'élément
    // écraserait ceux des feuilles de style (:active, survol…).
    onComplete: (a) => cleanInlineStyles(a)
  })
}

// Centre d'un élément en fraction de l'écran (origine des confettis)
export function origineDe(el) {
  const r = el?.getBoundingClientRect?.()
  if (!r || (!r.width && !r.height)) return null
  return {
    x: (r.left + r.width / 2) / window.innerWidth,
    y: (r.top + r.height / 2) / window.innerHeight
  }
}

// Dessine des traits SVG (lignes de courbe, coche) de leur début à leur fin.
export function dessiner(traits, { duree = 900, decalage = 0, ease = 'inOutQuad' } = {}) {
  const liste = traits instanceof Element ? [traits] : Array.from(traits || [])
  if (!liste.length || mouvementReduit()) return null
  return animate(createDrawable(liste), {
    draw: ['0 0', '0 1'],
    duration: duree,
    delay: stagger(decalage),
    ease,
    // Trait fini : on lui rend son état normal, sinon le pointillé posé par
    // l'animation resterait collé si le dessin change ensuite.
    onComplete: () => {
      liste.forEach((l) => {
        l.removeAttribute('pathLength')
        l.removeAttribute('stroke-dasharray')
        l.removeAttribute('stroke-dashoffset')
        l.style.strokeLinecap = ''
      })
    }
  })
}

// Petit rebond de confirmation (case cochée, bouton validé)
export function rebond(el, { depuis = 0.88, duree = 420 } = {}) {
  if (!el || mouvementReduit()) return null
  return animate(el, {
    scale: [depuis, 1.07, 1],
    duration: duree,
    ease: 'outQuad',
    onComplete: (a) => cleanInlineStyles(a)
  })
}

// Série ou exercice tout juste validé : la coche se dessine, le bouton
// rebondit et sa carte s'illumine brièvement (cf. .vient-detre-faite).
export function feterSerie(bouton) {
  if (!bouton?.isConnected || mouvementReduit()) return
  dessiner(bouton.querySelector('.coche path'), { duree: 380, ease: 'outQuad' })
  rebond(bouton)
  const carte = bouton.closest('.serie-card, .exo-bloc')
  if (carte) {
    carte.classList.remove('vient-detre-faite')
    void carte.offsetWidth // relance l'animation CSS si on revalide aussitôt
    carte.classList.add('vient-detre-faite')
  }
}

