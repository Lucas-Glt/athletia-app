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

// Lundi 00:00 de la semaine contenant `date`. Sert de borne au « fait cette
// semaine » : la semaine type se relit chaque lundi, une séance faite la
// semaine dernière redevient à faire.
export const lundiDeLaSemaine = (date = new Date()) => {
  const lundi = new Date(date)
  lundi.setHours(0, 0, 0, 0)
  lundi.setDate(lundi.getDate() - ((lundi.getDay() + 6) % 7))
  return lundi
}
