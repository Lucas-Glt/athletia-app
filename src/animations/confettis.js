import { mouvementReduit } from './mouvement'

// Violets de la marque, encre néon du logo, et trois teintes de fête
const COULEURS = ['#7F77DD', '#9D97E8', '#C2BCFF', '#4FE3D6', '#4ade80', '#fbbf24', '#f87171']
// Au-dessus du passage de niveau (305) et du récap (260)
const Z_CONFETTIS = 310
// Le canvas plein écran tourne tant qu'il existe, même vide : il est détruit
// une fois la dernière gerbe retombée.
const FIN_DE_FETE_MS = 5000

// tsParticles (~70 ko) n'est téléchargé qu'à la première fête
let module = null
const charger = () => (module ??= import('@tsparticles/confetti'))

let conteneur = null
let minuteurFin = null

// À appeler quand une fête devient probable (feuille de séance ouverte) :
// la première gerbe n'attend pas le téléchargement.
export function prechargerConfettis() {
  if (!mouvementReduit()) charger().catch(() => {})
}

async function tirer(options) {
  if (mouvementReduit()) return
  try {
    const { confetti } = await charger()
    conteneur = await confetti({
      zIndex: Z_CONFETTIS,
      colors: COULEURS,
      disableForReducedMotion: true,
      ...options
    })
    clearTimeout(minuteurFin)
    minuteurFin = setTimeout(() => {
      conteneur?.destroy()
      conteneur = null
    }, FIN_DE_FETE_MS)
  } catch (e) {
    // Hors ligne ou fichier introuvable : la fête se passera de confettis
    console.warn('Confettis indisponibles :', e)
  }
}

// Gerbe vers le haut depuis un point de l'écran (bouton « Valider »…).
// `origine` en fraction de l'écran, cf. origineDe().
export function gerbe(origine) {
  const origin = origine || { x: 0.5, y: 0.75 }
  return Promise.all([
    tirer({ origin, angle: 90, spread: 70, startVelocity: 46, particleCount: 70, ticks: 220 }),
    tirer({ origin, angle: 90, spread: 130, startVelocity: 28, particleCount: 35, scalar: 0.8, ticks: 180 })
  ])
}

// Deux canons depuis les coins bas, qui se croisent : passage de niveau
export function canons() {
  return Promise.all([
    tirer({ origin: { x: 0, y: 0.95 }, angle: 60, spread: 55, startVelocity: 62, particleCount: 80 }),
    tirer({ origin: { x: 1, y: 0.95 }, angle: 120, spread: 55, startVelocity: 62, particleCount: 80 })
  ])
}

// Pluie d'emojis (réaction du prépa) qui jaillit d'un point
export function pluieEmoji(emojis, origine) {
  return tirer({
    origin: origine || { x: 0.5, y: 0.85 },
    angle: 90,
    spread: 75,
    startVelocity: 36,
    particleCount: 16,
    gravity: 0.9,
    ticks: 170,
    flat: true,
    scalar: 2.4,
    shapes: ['emoji'],
    shapeOptions: { emoji: { value: emojis } }
  })
}
