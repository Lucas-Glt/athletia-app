// Fourchettes d'indisponibilité proposées à la déclaration. Doit rester
// aligné sur DUREES_ESTIMEES côté API (app/schemas/blessure.py) : une valeur
// hors liste est refusée en 422.
export const DUREES_BLESSURE = [
  { valeur: 'moins_1_semaine', label: "Moins d'une semaine" },
  { valeur: '1_2_semaines', label: '1 à 2 semaines' },
  { valeur: '2_4_semaines', label: '2 à 4 semaines' },
  { valeur: '1_3_mois', label: '1 à 3 mois' },
  { valeur: 'plus_3_mois', label: 'Plus de 3 mois' },
  { valeur: 'inconnu', label: 'Je ne sais pas encore' }
]

export const labelDureeBlessure = (valeur) =>
  DUREES_BLESSURE.find(d => d.valeur === valeur)?.label || null

export const formatDateBlessure = (iso) =>
  iso ? new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : ''

// Durée écoulée depuis le début de la blessure : ce que l'athlète comme le
// prépa lisent en premier sur une blessure encore en cours.
export const joursDepuis = (iso) => {
  if (!iso) return null
  const debut = new Date(iso)
  const jours = Math.floor((Date.now() - debut.getTime()) / 86400000)
  return jours < 0 ? 0 : jours
}

export const labelAnciennete = (iso) => {
  const jours = joursDepuis(iso)
  if (jours === null) return ''
  if (jours === 0) return "depuis aujourd'hui"
  if (jours === 1) return 'depuis 1 jour'
  if (jours < 31) return `depuis ${jours} jours`
  const mois = Math.floor(jours / 30)
  return mois === 1 ? 'depuis 1 mois' : `depuis ${mois} mois`
}
