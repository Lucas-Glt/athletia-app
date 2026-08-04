// Jours de la semaine, dans l'ordre. Les clés doivent rester alignées sur
// JourEnum côté API (app/models/seance.py) : une valeur hors liste est refusée
// en 422 à l'enregistrement de la semaine type.
export const JOURS_SEMAINE = [
  { cle: 'lundi', label: 'Lundi', court: 'Lun' },
  { cle: 'mardi', label: 'Mardi', court: 'Mar' },
  { cle: 'mercredi', label: 'Mercredi', court: 'Mer' },
  { cle: 'jeudi', label: 'Jeudi', court: 'Jeu' },
  { cle: 'vendredi', label: 'Vendredi', court: 'Ven' },
  { cle: 'samedi', label: 'Samedi', court: 'Sam' },
  { cle: 'dimanche', label: 'Dimanche', court: 'Dim' }
]

// Lundi 00:00 de la semaine contenant `date`. La semaine type est un modèle
// hebdomadaire : c'est à la semaine, pas au jour, qu'on rattache une séance
// réalisée — faite avec un jour de retard, elle compte pour son créneau.
export const lundiDeLaSemaine = (date = new Date()) => {
  const lundi = new Date(date)
  lundi.setHours(0, 0, 0, 0)
  lundi.setDate(lundi.getDate() - ((lundi.getDay() + 6) % 7))
  return lundi
}

// 'AAAA-MM-JJ' dans le fuseau local (toISOString() bascule en UTC et décale
// d'un jour en soirée).
export const dateISO = (date) => {
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

// Clé d'une occurrence de séance : un créneau, une semaine.
export const cleOccurrence = (creneau, date) => `${creneau}||${dateISO(lundiDeLaSemaine(date))}`

// Jour de la semaine ('lundi'...) d'une date.
export const jourDeLaDate = (date) => JOURS_SEMAINE[(date.getDay() + 6) % 7].cle
