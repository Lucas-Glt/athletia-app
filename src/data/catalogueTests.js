// Catalogue figé des tests physiques standards proposés au prépa. Un test
// n'est qu'une étiquette (catégorie, libellé, unité) : le résultat saisi
// reste une valeur numérique brute (cf. TestResultat côté backend), donc
// ajouter un test ici n'impose aucune migration. Le prépa peut aussi créer
// un test hors catalogue depuis NouveauTestModal (nom/catégorie/unité libres).
export const CATEGORIES_TEST = [
  { id: 'musculation', label: 'Musculation', icone: 'ti-barbell' },
  { id: 'sprint', label: 'Sprint', icone: 'ti-run' },
  { id: 'cardio', label: 'Cardio', icone: 'ti-heartbeat' },
  { id: 'forme', label: 'Test de forme', icone: 'ti-target-arrow' },
  { id: 'terrain', label: 'Test terrain', icone: 'ti-map-pin' }
]

export const CATALOGUE_TESTS = [
  { id: 'squat_1rm', categorie: 'musculation', label: 'Squat — 1RM', unite: 'kg' },
  { id: 'developpe_couche_1rm', categorie: 'musculation', label: 'Développé couché — 1RM', unite: 'kg' },
  { id: 'souleve_terre_1rm', categorie: 'musculation', label: 'Soulevé de terre — 1RM', unite: 'kg' },
  { id: 'tirage_1rm', categorie: 'musculation', label: 'Tirage / Rowing — 1RM', unite: 'kg' },
  { id: 'epaule_1rm', categorie: 'musculation', label: 'Épaulé (Clean) — 1RM', unite: 'kg' },
  { id: 'front_squat_1rm', categorie: 'musculation', label: 'Front Squat — 1RM', unite: 'kg' },

  { id: 'sprint_10m', categorie: 'sprint', label: 'Sprint 10m', unite: 's' },
  { id: 'sprint_20m', categorie: 'sprint', label: 'Sprint 20m', unite: 's' },
  { id: 'sprint_30m', categorie: 'sprint', label: 'Sprint 30m', unite: 's' },
  { id: 'sprint_40m', categorie: 'sprint', label: 'Sprint 40m', unite: 's' },

  { id: 'vma', categorie: 'cardio', label: 'VMA (vitesse maximale aérobie)', unite: 'km/h' },
  { id: 'cooper', categorie: 'cardio', label: 'Test Cooper (distance / 12 min)', unite: 'm' },
  { id: 'luc_leger', categorie: 'cardio', label: 'Luc Léger (palier atteint)', unite: 'palier' },
  { id: 'bronco', categorie: 'cardio', label: 'Bronco Test (rugby)', unite: 's' },
  { id: 'yoyo_ir', categorie: 'cardio', label: 'Yo-Yo Intermittent Recovery Test', unite: 'm' },

  { id: 'hand_grip', categorie: 'forme', label: 'Hand Grip (force de préhension)', unite: 'kg' },
  { id: 'vertical_jump', categorie: 'forme', label: 'Vertical Jump (détente verticale)', unite: 'cm' },

  { id: 'broad_jump', categorie: 'terrain', label: 'Broad Jump (longueur de saut sans élan)', unite: 'cm' },
  { id: 'agilite_5_10_5', categorie: 'terrain', label: 'Agilité 5-10-5', unite: 's' }
]

export const categorieDe = (id) => CATEGORIES_TEST.find((c) => c.id === id)
export const testDe = (id) => CATALOGUE_TESTS.find((t) => t.id === id)
export const testsDeCategorie = (categorieId) => CATALOGUE_TESTS.filter((t) => t.categorie === categorieId)

// Estimation du 1RM à partir d'une charge et d'un nombre de répétitions
// (formule d'Epley) — jugée fiable seulement jusqu'à 5 répétitions, au-delà
// l'estimation dérive trop pour rester exploitable en musculation.
export const REPS_MAX_ESTIMATION_1RM = 5
export const estimer1RM = (charge, reps) => Math.round(charge * (1 + reps / 30) * 10) / 10
