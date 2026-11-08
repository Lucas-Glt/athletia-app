// Atelier de programme (prototype côté prépa) : un programme pensé comme une
// suite de semaines. L'athlète avance à son rythme — il passe à la semaine
// suivante quand il a fait les séances de la sienne — et aucun jour n'est
// imposé : chaque semaine est une suite ordonnée de séances, avec au plus un
// jour conseillé. Une séance = un modèle + les semaines où elle a lieu + une
// progression automatique d'une semaine à l'autre ; des tests en début et/ou
// en fin de cycle, dont l'athlète saisit lui-même les résultats.
// Tout se calcule ici à partir du brouillon : rien n'est envoyé à l'API.

export const JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']
export const NB_SEMAINES_MAX = 16
const VERSION_BROUILLON = 2

// Mêmes trois grandeurs que les séries du modèle actuel (séries × volume @
// intensité : nb_reps/metres/bonds, poids_cible/intensite), libellées selon
// le type de séance.
const CHAMPS_TYPE = {
  musculation: { volume: 'Reps', intensite: 'Charge', exVolume: '8', exIntensite: '40 kg' },
  natation: { volume: 'Mètres', intensite: 'Intensité', exVolume: '200', exIntensite: '75 %' },
  athletisme: { volume: 'Mètres', intensite: 'Intensité', exVolume: '30', exIntensite: 'max' },
  pliometrie: { volume: 'Bonds', intensite: 'Intensité', exVolume: '8', exIntensite: 'max' }
}
export const champsType = (type) => CHAMPS_TYPE[type] || CHAMPS_TYPE.musculation

export const PROGRESSIONS = ['aucune', 'intensite', 'volume', 'series']
export const labelProgression = (valeur, type) => {
  if (valeur === 'intensite') return champsType(type).intensite
  if (valeur === 'volume') return champsType(type).volume
  if (valeur === 'series') return 'Séries'
  return 'Aucune'
}

export const nouvelleCle = () =>
  globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`

// Le jour n'est qu'un conseil : sans lui, la séance se fait quand l'athlète veut.
export const libelleJour = (jour) => (jour ? `conseillée le ${jour}` : 'jour libre')

// --- Semaines ---
const plage = (n) => Array.from({ length: n }, (_, i) => i + 1)

export const semainesTest = (b) => {
  const s = new Set()
  if (b.testsDebut) s.add(1)
  if (b.testsFin) s.add(b.nbSemaines)
  return s
}

export const semainesNormales = (b) => {
  const tests = semainesTest(b)
  return plage(b.nbSemaines).filter(w => !tests.has(w))
}

// « Toutes les semaines » suit la durée du programme (et laisse de côté les
// semaines de tests) ; sinon, les semaines cochées une à une.
export const semainesDeSeance = (b, s) =>
  s.toutesSemaines
    ? semainesNormales(b)
    : [...new Set(s.semaines)].filter(w => w >= 1 && w <= b.nbSemaines).sort((x, y) => x - y)

// « S2 → S5 », « S2, S4 », « aucune semaine »
export const libelleSemaines = (semaines) => {
  if (semaines.length === 0) return 'aucune semaine'
  const consecutives = semaines.every((w, i) => i === 0 || w === semaines[i - 1] + 1)
  if (semaines.length > 2 && consecutives) return `S${semaines[0]} → S${semaines[semaines.length - 1]}`
  return semaines.map(w => `S${w}`).join(', ')
}

// --- Progression ---
const RE_NOMBRE = /^(\D*?)(\d+(?:[.,]\d+)?)(.*)$/
const formatNombre = (n) => (Math.round(n * 100) / 100).toLocaleString('fr-FR', { maximumFractionDigits: 2 })

// '70 kg' + 5 -> '75 kg', '72,5 %' + 2,5 -> '75 %' ; une valeur sans nombre
// (« max ») ne bouge pas.
export const ajouterAuNombre = (valeur, delta) => {
  if (!delta) return valeur
  const m = String(valeur ?? '').match(RE_NOMBRE)
  if (!m) return valeur
  return `${m[1]}${formatNombre(parseFloat(m[2].replace(',', '.')) + delta)}${m[3]}`
}

// Prescription d'un exercice pour la (rang + 1)-ième semaine où sa séance a
// lieu : la progression s'applique à chaque nouvelle semaine de la séance,
// pas au numéro de semaine du programme (une séance des S4 et S5 seulement
// démarre à sa valeur de base en S4).
export const prescriptionSemaine = (exo, rang) => {
  const delta = (Number(String(exo.pas).replace(',', '.')) || 0) * rang
  const series = Number(exo.series) || 0
  return {
    series: exo.progression === 'series' ? Math.max(1, Math.round(series + delta)) : series,
    volume: exo.progression === 'volume' ? ajouterAuNombre(exo.volume, delta) : exo.volume,
    intensite: exo.progression === 'intensite' ? ajouterAuNombre(exo.intensite, delta) : exo.intensite,
    repos: exo.repos
  }
}

export const resumePrescription = (p) => {
  const volume = p.series && p.volume ? `${p.series} × ${p.volume}` : p.series ? `${p.series} séries` : p.volume
  return [volume, p.intensite, p.repos && `repos ${p.repos}`].filter(Boolean).join(' · ')
}

// --- Contenu d'une semaine : la suite de séances, dans l'ordre du prépa ---
export const detailSemaine = (b, w) => {
  const tests = semainesTest(b)
  const seances = b.seances
    .map(s => {
      const rang = semainesDeSeance(b, s).indexOf(w)
      if (rang === -1) return null
      return { ...s, exercices: s.exercices.map(e => ({ ...e, prescrit: prescriptionSemaine(e, rang) })) }
    })
    .filter(Boolean)
  return {
    numero: w,
    tests: tests.has(w) ? { moment: w === 1 && b.testsDebut ? 'debut' : 'fin', liste: b.tests } : null,
    seances
  }
}

export const toutesLesSemaines = (b) => plage(b.nbSemaines).map(w => detailSemaine(b, w))

// Ce qui mérite l'attention du prépa avant de valider sa structure.
export const pointsAttention = (b) => {
  const points = []
  if (!b.nom.trim()) points.push('Le programme n\'a pas encore de nom.')
  if ((b.testsDebut || b.testsFin) && b.tests.length === 0) points.push('Tests activés, mais aucun test choisi.')
  const vides = toutesLesSemaines(b).filter(s => !s.tests && s.seances.length === 0).map(s => s.numero)
  if (vides.length) points.push(`${vides.length > 1 ? 'Semaines' : 'Semaine'} sans séance : ${libelleSemaines(vides)}.`)
  b.seances.forEach(s => {
    if (s.exercices.length === 0) points.push(`« ${s.nom || 'Séance sans nom'} » n'a pas encore d'exercice.`)
    if (semainesDeSeance(b, s).length === 0) points.push(`« ${s.nom || 'Séance sans nom'} » n'a lieu aucune semaine.`)
  })
  return points
}

// --- Brouillons ---
export const nouvelExercice = (type) => ({
  cle: nouvelleCle(), nom: '', series: 3, volume: champsType(type).exVolume, intensite: '', repos: '',
  progression: 'aucune', pas: 0
})

export const nouvelleSeance = (b) => ({
  cle: nouvelleCle(),
  nom: `Séance ${b.seances.length + 1}`,
  type: 'musculation',
  jour: null,
  toutesSemaines: true,
  semaines: semainesNormales(b),
  exercices: []
})

export const nouveauBrouillon = () => ({
  version: VERSION_BROUILLON,
  nom: '',
  nbSemaines: 6,
  testsDebut: true,
  testsFin: true,
  tests: [],
  seances: []
})

// Brouillon relu depuis l'appareil. La v1 calait les semaines sur des dates :
// on retire la date de début et le jour des tests, et les jours fixés
// deviennent des jours conseillés. Toute autre forme est ignorée.
export const migrerBrouillon = (brouillon) => {
  if (brouillon?.version === VERSION_BROUILLON) return brouillon
  if (brouillon?.version !== 1) return null
  const migre = { ...brouillon, version: VERSION_BROUILLON }
  delete migre.dateDebut
  delete migre.jourTests
  return migre
}

const exo = (nom, series, volume, intensite, repos, progression = 'aucune', pas = 0) =>
  ({ cle: nouvelleCle(), nom, series, volume, intensite, repos, progression, pas })

// Exemple de départ : 6 semaines, tests en S1 et S6, trois séances
// équivalentes avec progression et une séance de vitesse qui change en S4.
// Aucun jour fixé : l'athlète place ses séances comme il veut.
export const exempleBrouillon = () => ({
  ...nouveauBrouillon(),
  nom: 'Cycle force & vitesse',
  tests: [
    { cle: nouvelleCle(), nom: 'Squat 1RM', unite: 'kg' },
    { cle: nouvelleCle(), nom: 'CMJ', unite: 'cm' },
    { cle: nouvelleCle(), nom: 'Sprint 30 m', unite: 's' }
  ],
  seances: [
    {
      cle: nouvelleCle(), nom: 'Force bas du corps', type: 'musculation', jour: null, toutesSemaines: true, semaines: [],
      exercices: [
        exo('Squat', 4, '5', '75 %', '3 min', 'intensite', '2,5'),
        exo('Fentes bulgares', 3, '8', '20 kg', '90 s', 'intensite', '2'),
        exo('Gainage', 3, '45 s', '', '45 s')
      ]
    },
    {
      cle: nouvelleCle(), nom: 'Force haut du corps', type: 'musculation', jour: null, toutesSemaines: true, semaines: [],
      exercices: [
        exo('Développé couché', 4, '6', '60 kg', '2 min', 'intensite', '2,5'),
        exo('Tractions', 4, '5', '', '2 min', 'volume', '1')
      ]
    },
    {
      cle: nouvelleCle(), nom: 'Vitesse — accélérations', type: 'athletisme', jour: null, toutesSemaines: false, semaines: [2, 3],
      exercices: [exo('Sprint départ arrêté', 6, '30 m', 'max', '3 min', 'series', '1')]
    },
    {
      cle: nouvelleCle(), nom: 'Vitesse — lancés', type: 'athletisme', jour: null, toutesSemaines: false, semaines: [4, 5],
      exercices: [exo('Sprint lancé', 5, '40 m', '95 %', '4 min')]
    },
    {
      cle: nouvelleCle(), nom: 'Pliométrie', type: 'pliometrie', jour: null, toutesSemaines: true, semaines: [],
      exercices: [
        exo('Box jump', 4, '6', 'max', '90 s', 'volume', '1'),
        exo('Bonds horizontaux', 3, '5', 'max', '2 min')
      ]
    }
  ]
})
