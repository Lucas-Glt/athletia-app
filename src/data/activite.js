// Assiduité de l'athlète, calculée par l'API (cf. _activite_cercle dans
// app/routes/monitoring.py) : nombre de jours, sur les 28 derniers, où il a
// fait au moins une action dans l'app (série cochée, séance validée,
// wellness, pesée, repas), et date de la dernière. Sert à classer la liste
// des athlètes du prépa, des plus actifs aux moins actifs.
export const FENETRE_ACTIVITE = 28

// 3 jours par semaine sur 4 semaines : en dessous, l'usage n'est plus régulier.
export const SEUIL_REGULIER = 12

// Sans aucune action depuis une semaine, l'athlète est à relancer.
export const SEUIL_INACTIF_JOURS = 7

// 'YYYY-MM-DD' ou date-heure ISO -> minuit local du même jour calendaire.
// new Date('2026-11-08') serait minuit UTC, donc la veille au soir dans un
// fuseau en retard sur UTC : on ne garde que la partie date.
const jourLocal = (valeur) => {
  const [annee, mois, jour] = String(valeur).slice(0, 10).split('-').map(Number)
  return new Date(annee, mois - 1, jour)
}

export const joursDepuis = (valeur) => {
  const aujourdhui = new Date()
  aujourdhui.setHours(0, 0, 0, 0)
  return Math.round((aujourdhui - jourLocal(valeur)) / 86400000)
}

// « aujourd'hui », « hier », « il y a 3 j », puis la date au-delà d'une semaine.
export const formatJourRelatif = (valeur) => {
  if (!valeur) return '—'
  const n = joursDepuis(valeur)
  if (n <= 0) return "aujourd'hui"
  if (n === 1) return 'hier'
  if (n < 7) return `il y a ${n} j`
  return jourLocal(valeur).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

// Repli tant que l'API ne renvoie pas encore derniere_activite (front déployé
// avant le back) : la plus récente des dates déjà présentes dans le résumé.
export const derniereActivite = (resume) => {
  if (!resume) return null
  if (resume.derniere_activite !== undefined) return resume.derniere_activite
  const dates = [resume.derniere_seance, resume.dernier_wellness, resume.dernier_poids?.date]
    .filter(Boolean)
    .map(d => String(d).slice(0, 10))
  return dates.length ? dates.sort().pop() : null
}

export const estInactif = (resume) => {
  const derniere = derniereActivite(resume)
  return !derniere || joursDepuis(derniere) >= SEUIL_INACTIF_JOURS
}

// Régulier : 3 jours actifs par semaine en moyenne ; irrégulier : actif cette
// semaine, mais moins souvent ; inactif : rien depuis 7 jours.
export const LABELS_NIVEAU_ACTIVITE = { regulier: 'Régulier', irregulier: 'Irrégulier', actif: 'Actif', inactif: 'Inactif' }

export const niveauActivite = (resume) => {
  if (estInactif(resume)) return 'inactif'
  // API pas encore à jour : on sait qu'il est actif, pas à quelle fréquence.
  if (resume.jours_actifs_28j === undefined) return 'actif'
  return resume.jours_actifs_28j >= SEUIL_REGULIER ? 'regulier' : 'irregulier'
}

export const libelleActivite = (resume) => {
  const derniere = derniereActivite(resume)
  if (!derniere) return 'Aucune activité'
  const n = joursDepuis(derniere)
  if (n <= 0) return "Actif aujourd'hui"
  if (n === 1) return 'Actif hier'
  if (n < SEUIL_INACTIF_JOURS) return `Actif il y a ${n} j`
  return `Inactif depuis ${n} j`
}

// Les inactifs toujours en bas, même s'ils étaient très actifs avant de
// décrocher ; sinon le plus de jours actifs d'abord, puis l'activité la plus
// récente, puis le nom, pour un ordre qui ne bouge pas d'un chargement à l'autre.
export const comparerActivite = (a, b) => {
  const inactif = Number(estInactif(a.resume)) - Number(estInactif(b.resume))
  if (inactif) return inactif
  const jours = (b.resume?.jours_actifs_28j ?? 0) - (a.resume?.jours_actifs_28j ?? 0)
  if (jours) return jours
  const da = derniereActivite(a.resume) || ''
  const db = derniereActivite(b.resume) || ''
  if (da !== db) return da < db ? 1 : -1
  return a.nom.localeCompare(b.nom, 'fr')
}
