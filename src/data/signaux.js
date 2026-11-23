// Signaux automatiques du résumé d'un athlète (GET /monitoring/cercle,
// `signaux` + `signaux_codes` dans le même ordre, cf. _resume_athlete côté
// API) : un libellé court pour la liste, le texte complet au survol et dans
// la fiche.
import { estInactif } from './activite'

const SIGNAUX = {
  surcharge: { court: 'Surcharge', icone: 'ti-trending-up', ton: 'surcharge' },
  vigilance: { court: 'Charge en hausse', icone: 'ti-trending-up', ton: 'vigilance' },
  wellness_degrade: { court: 'Wellness en baisse', icone: 'ti-mood-sad', ton: 'vigilance' },
  sommeil: { court: 'Manque de sommeil', icone: 'ti-zzz', ton: 'vigilance' },
  charge_sommeil: { court: 'Charge + sommeil', icone: 'ti-alert-triangle', ton: 'surcharge' }
}

export const signauxDe = (resume) =>
  (resume?.signaux || []).map((texte, i) => {
    const code = resume.signaux_codes?.[i]
    const connu = SIGNAUX[code]
    return connu
      ? { cle: code, texte, ...connu }
      : { cle: `signal-${i}`, texte, court: texte, icone: 'ti-alert-triangle', ton: 'vigilance' }
  })

// « Rien à signaler » : aucun signal ET assez d'historique pour que l'ACWR soit
// calculable — sans ça, l'absence de signal ne prouve rien. Une blessure
// déclarée disqualifie aussi le RAS : elle n'est pas un signal automatique,
// mais afficher « rien à signaler » sur un athlète blessé serait faux. Même
// chose pour un athlète qui a décroché : sans activité depuis une semaine,
// l'absence de signal vient du silence, pas de la forme.
export const estRAS = (r) => r.signaux.length === 0 && !!r.acwr.zone && !r.blessures_en_cours && !estInactif(r)
