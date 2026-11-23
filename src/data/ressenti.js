// Questionnaire de charge d'une séance (méthode de Foster : RPE × durée),
// partagé par le ressenti d'une séance du programme et la déclaration d'une
// séance hors programme. Bornes alignées sur l'API (DUREE_MAX_MINUTES dans
// app/schemas/monitoring.py).
export const DUREE_MAX = 600
// Au-delà, une durée saisie est faite confirmer (faute de frappe : 600 pour 60).
export const DUREE_A_CONFIRMER = 240

export const LABELS_RPE = {
  0: 'Repos', 1: 'Très très facile', 2: 'Facile', 3: 'Modéré', 4: 'Assez dur',
  5: 'Dur', 6: 'Très dur', 7: 'Très dur', 8: 'Très très dur', 9: 'Très très dur', 10: 'Maximal'
}

export const labelRpe = (v) => LABELS_RPE[v] || ''

// 65 -> « 1 h 05 »
export const dureeEnHeures = (minutes) => {
  const m = Math.round(Number(minutes) || 0)
  return `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}`
}
