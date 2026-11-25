// Planification annuelle : semaines repérées par leur lundi ('AAAA-MM-JJ'),
// chacune avec un développement (cf. src/data/developpements.js). Logique
// pure, partagée par la fiche du prépa et la vue de l'athlète. Le rappel de
// changement de cycle, lui, est décidé par l'API (app/planification.py).
import { dateISO, lundiDeLaSemaine } from '../data/joursSemaine'
import { jourLocal } from '../data/activite'

// Réponse de l'API ([{ lundi, developpement }]) -> { lundi: développement }
export const carteSemaines = (semaines = []) =>
  Object.fromEntries(semaines.map((s) => [s.lundi, s.developpement]))

export const lundiCourant = (aujourdhui = new Date()) => dateISO(lundiDeLaSemaine(aujourdhui))

export const decalerSemaines = (lundi, n) => {
  const d = jourLocal(lundi)
  d.setDate(d.getDate() + 7 * n)
  return dateISO(d)
}

// Nombre de semaines de `debut` à `fin` inclus (lundis)
export const nbSemaines = (debut, fin) =>
  Math.round((jourLocal(fin) - jourLocal(debut)) / (7 * 86400000)) + 1

// Suites de semaines consécutives au même développement, dans l'ordre
export const cyclesDe = (carte) => {
  const cycles = []
  for (const lundi of Object.keys(carte).sort()) {
    const dev = carte[lundi]
    const dernier = cycles[cycles.length - 1]
    if (dernier && dernier.developpement === dev && decalerSemaines(dernier.fin, 1) === lundi) {
      dernier.fin = lundi
      dernier.nbSemaines++
    } else {
      cycles.push({ developpement: dev, debut: lundi, fin: lundi, nbSemaines: 1 })
    }
  }
  return cycles
}

// Où en est l'athlète : le cycle de la semaine en cours (avec le rang de
// cette semaine) et le prochain cycle planifié.
export const situationCycle = (carte, aujourdhui = new Date()) => {
  const lundi = lundiCourant(aujourdhui)
  const cycles = cyclesDe(carte)
  const i = cycles.findIndex((c) => c.debut <= lundi && lundi <= c.fin)
  return {
    actuel: i >= 0 ? { ...cycles[i], semaine: nbSemaines(cycles[i].debut, lundi) } : null,
    suivant: cycles.find((c) => c.debut > lundi) || null
  }
}

// Mois de la grille : chacun avec les lundis qui tombent dedans
export const moisDeLaGrille = (premierMois, nbMois) => {
  const mois = []
  for (let m = 0; m < nbMois; m++) {
    const debut = new Date(premierMois.getFullYear(), premierMois.getMonth() + m, 1)
    const lundi = lundiDeLaSemaine(debut)
    if (lundi < debut) lundi.setDate(lundi.getDate() + 7)
    const lundis = []
    while (lundi.getMonth() === debut.getMonth()) {
      lundis.push(dateISO(lundi))
      lundi.setDate(lundi.getDate() + 7)
    }
    mois.push({
      cle: dateISO(debut).slice(0, 7),
      label: debut.toLocaleDateString('fr-FR', { month: 'short' }),
      annee: debut.getFullYear(),
      lundis
    })
  }
  return mois
}

export const premierDuMois = (date = new Date(), decalage = 0) =>
  new Date(date.getFullYear(), date.getMonth() + decalage, 1)

// « 1 déc. »
export const formatJour = (iso) => jourLocal(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })

// Dimanche de la semaine de ce lundi : « 7 déc. »
export const formatDimanche = (lundi) => {
  const dimanche = jourLocal(lundi)
  dimanche.setDate(dimanche.getDate() + 6)
  return formatJour(dateISO(dimanche))
}

// « du 1 déc. au 28 déc. » : du lundi de la première semaine au dimanche de la dernière
export const formatPeriode = (debut, fin) => `du ${formatJour(debut)} au ${formatDimanche(fin)}`

// « lundi », « lundi 8 déc. »… relatif à la semaine en cours
export const formatDebutCycle = (lundi, aujourdhui = new Date()) => {
  const ecart = nbSemaines(lundiCourant(aujourdhui), lundi) - 1
  if (ecart === 0) return 'cette semaine'
  if (ecart === 1) return 'lundi prochain'
  return `le ${formatJour(lundi)}`
}
