// Libellé et icône d'un type de séance (champ `type_seance`). Les séances
// créées avant l'introduction des types n'en ont pas : lues en musculation.
const TYPES_SEANCE = {
  musculation: { label: 'Musculation', icone: 'ti-barbell' },
  natation: { label: 'Natation', icone: 'ti-swimming' },
  athletisme: { label: 'Athlétisme', icone: 'ti-run' },
  pliometrie: { label: 'Pliométrie', icone: 'ti-bolt' }
}

export const typeSeance = (t) => (TYPES_SEANCE[t] ? t : 'musculation')
export const labelTypeSeance = (t) => TYPES_SEANCE[typeSeance(t)].label
export const iconeTypeSeance = (t) => TYPES_SEANCE[typeSeance(t)].icone
