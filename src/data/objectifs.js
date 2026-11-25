// Objectifs de charge fixés par le prépa sur un exercice (GET /objectifs/…).
// Un objectif est reconnu au nom de l'exercice sans accents ni casse,
// comme les records : il vaut pour toutes les semaines du programme.
import { cleExercice } from './seancesRealisees'

const kg = (v) => Number(v).toLocaleString('fr-FR', { maximumFractionDigits: 2 })

// « 100 kg », « 100 kg × 5 »
export const texteObjectif = (o) => `${kg(o.poids)} kg${o.reps ? ` × ${o.reps}` : ''}`

export const texteCharge = (v) => `${kg(v)} kg`

// [objectifs] -> { clé d'exercice: objectif }
export const objectifsParCle = (liste = []) => Object.fromEntries(liste.map((o) => [o.exercice_cle, o]))

export const objectifDe = (parCle, nomExercice) => parCle[cleExercice(nomExercice)] || null
