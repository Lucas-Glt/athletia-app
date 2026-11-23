// Séances réalisées par les athlètes, vues par le prépa : le flux de l'onglet
// Séances et la liste de la fiche d'un athlète (GET /monitoring/seances), puis
// le détail série par série (GET /monitoring/seances/{id}/series).
import { joursDepuis, jourLocal } from './activite'
import { parseValeurSerie } from '../utils/valeurSerie'

// Réactions du prépa sur une série : liste fermée, identique à REACTIONS_PREPA
// côté API (app/schemas/log_serie.py) — changer les deux ensemble.
export const REACTIONS_PREPA = ['👏', '🔥', '💪', '🚀', '💯', '👀']

// Les dates de l'API sont en heure de Paris, sans fuseau : '2026-11-20T18:42:11'.
export const jourDe = (dateHeure) => String(dateHeure).slice(0, 10)
export const heureDe = (dateHeure) => String(dateHeure).slice(11, 16)

// En-tête d'un jour du flux : « Aujourd'hui », « Hier », puis « Lundi 17 novembre ».
export const libelleJour = (jour) => {
  const n = joursDepuis(jour)
  if (n === 0) return "Aujourd'hui"
  if (n === 1) return 'Hier'
  const date = jourLocal(jour)
  const options = { weekday: 'long', day: 'numeric', month: 'long' }
  if (date.getFullYear() !== new Date().getFullYear()) options.year = 'numeric'
  const texte = date.toLocaleDateString('fr-FR', options)
  return texte.charAt(0).toUpperCase() + texte.slice(1)
}

// 65 -> « 1 h 05 », 45 -> « 45 min »
export const formatDuree = (minutes) => {
  if (!minutes) return null
  if (minutes < 60) return `${minutes} min`
  return `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, '0')}`
}

// « RPE 7 · 1 h 05 », ou null tant que l'athlète n'a pas donné son ressenti.
export const texteRessenti = (seance) => {
  if (seance?.rpe === null || seance?.rpe === undefined) return null
  return [`RPE ${seance.rpe}`, formatDuree(seance.duree_minutes)].filter(Boolean).join(' · ')
}

// Part des séries faites (null quand rien n'a été enregistré).
export const tauxSeance = (seance) =>
  seance?.total ? Math.round((seance.faites / seance.total) * 100) : null

// Mêmes seuils que l'historique de l'athlète : vert, orange, rouge.
export const classeTaux = (taux) => {
  if (taux === null || taux === undefined) return ''
  return taux >= 90 ? 'taux-done' : taux >= 60 ? 'taux-warn' : 'taux-skip'
}

const estDistance = (type) => type === 'natation' || type === 'athletisme'

// Ce que le prépa avait demandé pour une série, en une ligne.
export const textePrescrit = (serie, type) => {
  const parts = []
  if (estDistance(type)) {
    if (serie.metres) parts.push(`${serie.metres} m`)
    if (serie.intensite) parts.push(serie.intensite)
  } else if (type === 'pliometrie') {
    if (serie.bonds) parts.push(`${serie.bonds} bonds`)
    if (serie.intensite) parts.push(serie.intensite)
  } else {
    if (serie.nb_reps) parts.push(`${serie.nb_reps} reps`)
    if (serie.poids_cible) parts.push(serie.poids_cible)
    if (serie.rm) parts.push(serie.rm)
  }
  return parts.join(' · ') || '—'
}

// Ce que l'athlète a fait (null : série non réalisée).
export const texteRealise = (log, type) => {
  if (!log.fait) return null
  const unite = estDistance(type) ? 'm' : type === 'pliometrie' ? 'bonds' : 'reps'
  const parts = []
  if (log.reps_realisees) parts.push(`${log.reps_realisees} ${unite}`)
  if (log.poids_realise) parts.push(log.poids_realise)
  return parts.join(' · ') || '—'
}

// 'done' (fait comme prévu), 'warn' (fait, en dessous ou sans valeur), 'skip'.
export const statutSerie = (log, type) => {
  if (!log.fait) return 'skip'
  if (!log.reps_realisees && !log.poids_realise) return 'warn'
  const prescrit = estDistance(type) ? log.serie.metres : type === 'pliometrie' ? log.serie.bonds : log.serie.nb_reps
  const attendu = parseValeurSerie(prescrit)
  const realise = parseValeurSerie(log.reps_realisees)
  if (!isNaN(attendu) && !isNaN(realise) && realise < attendu) return 'warn'
  return 'done'
}

export const ICONES_STATUT_SERIE = { done: 'ti-check', warn: 'ti-alert-triangle', skip: 'ti-x' }

// Exercice reconnu à son nom, sans accents ni casse (même règle que
// cle_exercice dans app/records.py).
export const cleExercice = (nom) =>
  String(nom || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().split(/\s+/).filter(Boolean).join(' ')

const nombreFr = (v) => Number(v).toLocaleString('fr-FR', { maximumFractionDigits: 2 })

// Record battu : « 55 kg (avant 50) », « 10 reps (avant 8) »
export const texteRecord = (r) => `${nombreFr(r.valeur)} ${r.unite} (avant ${nombreFr(r.precedent)})`
