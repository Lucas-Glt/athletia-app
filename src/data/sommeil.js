// Durée de sommeil du questionnaire wellness. Les seuils doivent rester
// alignés sur app/monitoring_calc.py côté API (section « Sommeil »), qui les
// documente et cite les études : cible 8 h, nuit courte sous 7 h, sévère
// sous 6 h, lecture sur une fenêtre glissante de 7 nuits.
export const SOMMEIL_MIN = 0
export const SOMMEIL_MAX = 16
export const SOMMEIL_PAS = 0.25
// Point de départ du sélecteur. Volontairement en dessous de la cible de 8 h :
// afficher d'emblée la valeur recommandée pousserait à la valider sans y
// penser. L'athlète doit de toute façon toucher le sélecteur une fois pour
// que le questionnaire soit envoyable.
export const SOMMEIL_DEFAUT = 7

// 7.25 -> « 7 h 15 » (même rendu que formater_heures() côté API).
export const formatHeures = (heures) => {
  if (heures === null || heures === undefined) return '—'
  const totalMinutes = Math.round(heures * 60)
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  return m ? `${h} h ${String(m).padStart(2, '0')}` : `${h} h`
}

// Niveau de risque chronique renvoyé par l'API (jamais recalculé ici).
export const LABELS_NIVEAU_SOMMEIL = {
  faible: 'Sommeil suffisant',
  modere: 'Sommeil insuffisant',
  eleve: 'Déficit marqué'
}

export const labelNiveauSommeil = (niveau) => LABELS_NIVEAU_SOMMEIL[niveau] || null

export const estSommeilInsuffisant = (sommeil) =>
  sommeil?.niveau === 'modere' || sommeil?.niveau === 'eleve'
