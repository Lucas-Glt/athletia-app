// Libellé et icône d'un type de séance (champ `type_seance`). Les séances
// créées avant l'introduction des types n'en ont pas : lues en musculation.
const TYPES_SEANCE = {
  musculation: { label: 'Musculation', icone: 'ti-barbell' },
  natation: { label: 'Natation', icone: 'ti-swimming' },
  athletisme: { label: 'Athlétisme', icone: 'ti-run' },
  pliometrie: { label: 'Pliométrie', icone: 'ti-bolt' },
  // Séance hors programme seulement : un programme n'en contient jamais
  // (cf. TYPES_SEANCE_LIBRE côté API).
  match: { label: 'Match', icone: 'ti-ball-football' },
  autre: { label: 'Autre', icone: 'ti-dots' }
}

// Types d'une séance de programme (l'API refuse les autres)
export const CLES_TYPES_SEANCE = ['musculation', 'natation', 'athletisme', 'pliometrie']
// Types proposés pour une séance hors programme, dans l'ordre affiché
export const CLES_TYPES_SEANCE_LIBRE = ['musculation', 'athletisme', 'natation', 'pliometrie', 'match', 'autre']
export const typeSeance = (t) => (TYPES_SEANCE[t] ? t : 'musculation')
export const labelTypeSeance = (t) => TYPES_SEANCE[typeSeance(t)].label
export const iconeTypeSeance = (t) => TYPES_SEANCE[typeSeance(t)].icone
