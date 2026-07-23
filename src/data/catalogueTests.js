// Catalogue figé des tests physiques standards proposés au prépa. Un test
// n'est qu'une étiquette (catégorie, libellé, unité) : le résultat saisi
// reste une valeur numérique brute (cf. TestResultat côté backend), donc
// ajouter un test ici n'impose aucune migration.
export const CATEGORIES_TEST = [
  { id: 'musculation', label: 'Musculation', icone: 'ti-barbell' },
  { id: 'sprint', label: 'Sprint', icone: 'ti-run' },
  { id: 'cardio', label: 'Cardio', icone: 'ti-heartbeat' },
  { id: 'specifique', label: 'Spécifique', icone: 'ti-target-arrow' }
]

export const CATALOGUE_TESTS = [
  { id: 'squat_1rm', categorie: 'musculation', label: 'Squat — 1RM', unite: 'kg' },
  { id: 'developpe_couche_1rm', categorie: 'musculation', label: 'Développé couché — 1RM', unite: 'kg' },
  { id: 'souleve_terre_1rm', categorie: 'musculation', label: 'Soulevé de terre — 1RM', unite: 'kg' },
  { id: 'tirage_1rm', categorie: 'musculation', label: 'Tirage / Rowing — 1RM', unite: 'kg' },

  { id: 'sprint_10m', categorie: 'sprint', label: 'Sprint 10m', unite: 's' },
  { id: 'sprint_20m', categorie: 'sprint', label: 'Sprint 20m', unite: 's' },
  { id: 'sprint_30m', categorie: 'sprint', label: 'Sprint 30m', unite: 's' },
  { id: 'sprint_40m', categorie: 'sprint', label: 'Sprint 40m', unite: 's' },

  { id: 'vma', categorie: 'cardio', label: 'VMA (vitesse maximale aérobie)', unite: 'km/h' },
  { id: 'cooper', categorie: 'cardio', label: 'Test Cooper (distance / 12 min)', unite: 'm' },
  { id: 'luc_leger', categorie: 'cardio', label: 'Luc Léger (palier atteint)', unite: 'palier' },

  { id: 'hand_grip', categorie: 'specifique', label: 'Hand Grip (force de préhension)', unite: 'kg' },
  { id: 'broad_jump', categorie: 'specifique', label: 'Broad Jump (longueur de saut sans élan)', unite: 'cm' },
  { id: 'cmj', categorie: 'specifique', label: 'Détente verticale (CMJ)', unite: 'cm' },
  { id: 'agilite_5_10_5', categorie: 'specifique', label: 'Agilité 5-10-5', unite: 's' }
]

export const categorieDe = (id) => CATEGORIES_TEST.find((c) => c.id === id)
export const testDe = (id) => CATALOGUE_TESTS.find((t) => t.id === id)
export const testsDeCategorie = (categorieId) => CATALOGUE_TESTS.filter((t) => t.categorie === categorieId)
