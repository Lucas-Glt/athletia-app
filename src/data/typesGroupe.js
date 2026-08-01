// Nature d'un groupe d'exercices enchaînés (champ `type_groupe` porté par
// chaque exercice du groupe). Purement descriptif côté prescription : seul
// `complexe` change l'affichage, en déroulant série par série (A S1, B S1,
// C S1, puis A S2…) au lieu d'exercice par exercice, pour rendre évident
// qu'on enchaîne tous les exercices avant de passer à la série suivante.
export const TYPES_GROUPE = [
  { valeur: 'superset', label: 'Superset' },
  { valeur: 'biset', label: 'Biset' },
  { valeur: 'circuit', label: 'Circuit' },
  { valeur: 'complexe', label: 'Complexe' }
]

// Groupes créés avant l'introduction du champ : type_groupe est NULL, on les
// lit en superset (le libellé historique de l'interface).
export const TYPE_GROUPE_DEFAUT = 'superset'

export const typeGroupe = (groupe) =>
  groupe?.exercices?.[0]?.type_groupe || TYPE_GROUPE_DEFAUT

export const labelTypeGroupe = (valeur) =>
  TYPES_GROUPE.find(t => t.valeur === (valeur || TYPE_GROUPE_DEFAUT))?.label || 'Superset'

// Un groupe d'un seul exercice n'est pas un enchaînement : son type est ignoré.
export const estComplexe = (groupe) =>
  groupe?.exercices?.length > 1 && typeGroupe(groupe) === 'complexe'
