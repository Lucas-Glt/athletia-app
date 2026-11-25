<template>
  <div class="detail-seance">
    <div v-if="chargement" class="detail-etat"><i class="ti ti-loader-2 tourne"></i> Chargement des séries…</div>
    <p v-else-if="erreur" class="detail-etat detail-erreur" role="alert">
      <i class="ti ti-alert-triangle"></i> {{ erreur }}
      <button type="button" class="lien" @click="charger">Réessayer</button>
    </p>
    <template v-else>
      <div
        v-for="groupe in groupes"
        :key="groupe.key"
        class="exo-groupe"
        :class="{ 'is-superset': groupe.exercices.length > 1 }"
      >
        <div v-if="groupe.exercices.length > 1" class="superset-banner">
          <i class="ti ti-link"></i>
          <span>{{ labelTypeGroupe(typeGroupe(groupe)) }} · {{ groupe.exercices.length }} exercices</span>
        </div>

        <div v-for="(exo, eidx) in groupe.exercices" :key="exo.id" class="exo-bloc">
          <div class="exo-entete">
            <span v-if="groupe.exercices.length > 1" class="exo-repere exo-lettre">{{ lettre(eidx) }}</span>
            <span v-else class="exo-repere">{{ exo.ordre }}</span>
            <span class="exo-nom">{{ exo.nom }}</span>
            <span v-if="recordDe(exo)" class="exo-record" :title="`Record personnel battu : ${texteRecord(recordDe(exo))}`">
              <i class="ti ti-trophy"></i> Record {{ texteRecord(recordDe(exo)) }}
            </span>
            <!-- Objectif de charge : l'athlète le voit dans sa séance et ses courbes -->
            <button
              v-if="objectifs"
              type="button"
              class="exo-objectif"
              :class="{ pose: objectifDe(objectifs, exo.nom), atteint: objectifDe(objectifs, exo.nom)?.atteint_le }"
              :aria-expanded="objectifOuvert === exo.id"
              :title="objectifDe(objectifs, exo.nom)?.atteint_le ? 'Objectif atteint' : 'Objectif de charge'"
              @click="ouvrirObjectif(exo)"
            >
              <i class="ti" :class="objectifDe(objectifs, exo.nom)?.atteint_le ? 'ti-circle-check' : 'ti-target-arrow'"></i>
              {{ objectifDe(objectifs, exo.nom) ? texteObjectif(objectifDe(objectifs, exo.nom)) : 'Objectif' }}
            </button>
            <span class="exo-bilan" :class="classeTaux(tauxExo(exo))">{{ faitesExo(exo) }}/{{ exo.logs.length }}</span>
          </div>

          <form v-if="objectifOuvert === exo.id" class="objectif-edition" @submit.prevent="enregistrerObjectif(exo)">
            <label class="objectif-champ">
              <span>Objectif</span>
              <input v-model="brouillonObjectif.poids" type="number" inputmode="decimal" step="0.5" min="0.5" max="1000" required aria-label="Charge visée en kg" />
              <span>kg</span>
            </label>
            <label class="objectif-champ">
              <span>×</span>
              <input v-model="brouillonObjectif.reps" type="number" inputmode="numeric" step="1" min="1" max="100" placeholder="reps" aria-label="Répétitions (facultatif)" />
            </label>
            <button type="submit" class="btn btn-sm btn-primary" :disabled="objectifEnvoi">Enregistrer</button>
            <button v-if="objectifDe(objectifs, exo.nom)" type="button" class="btn btn-sm btn-ghost" :disabled="objectifEnvoi" @click="retirerObjectif(exo)">Retirer</button>
            <span class="objectif-aide">
              <template v-if="objectifDe(objectifs, exo.nom)?.meilleure_charge">Meilleure charge : {{ texteCharge(objectifDe(objectifs, exo.nom).meilleure_charge) }}. </template>
              {{ athleteNom ? prenom(athleteNom) : 'Ton athlète' }} le verra dans sa séance et ses courbes.
            </span>
          </form>

          <div class="comparatif" role="table" :aria-label="`Séries de ${exo.nom}`">
            <div class="comparatif-entete" role="row">
              <span role="columnheader" class="entete-serie">Série</span>
              <span role="columnheader">Prescrit</span>
              <span aria-hidden="true"></span>
              <span role="columnheader">Réalisé</span>
              <span aria-hidden="true"></span>
              <span role="columnheader"><span class="sr-only">Réaction</span></span>
            </div>
            <template v-for="(log, i) in exo.logs" :key="log.id">
              <div class="comparatif-ligne" :class="`statut-${statutSerie(log, type)}`" role="row">
                <span class="serie-num" role="cell">{{ i + 1 }}</span>
                <span class="prescrit" role="cell">{{ textePrescrit(log.serie, type) }}</span>
                <i class="ti ti-arrow-right fleche" aria-hidden="true"></i>
                <span class="realise" role="cell">
                  <template v-if="texteRealise(log, type) !== null">{{ texteRealise(log, type) }}</template>
                  <span v-else class="non-fait"><i class="ti ti-x"></i> non réalisée</span>
                </span>
                <span class="statut" aria-hidden="true"><i class="ti" :class="ICONES_STATUT_SERIE[statutSerie(log, type)]"></i></span>
                <button
                  type="button"
                  class="btn-reaction"
                  :class="{ pose: log.reaction_prepa }"
                  :aria-label="log.reaction_prepa ? `Ta réaction : ${log.reaction_prepa}. Changer` : 'Réagir à cette série'"
                  :aria-expanded="reactionOuverte === log.id"
                  @click="reactionOuverte = reactionOuverte === log.id ? null : log.id"
                >
                  <span v-if="log.reaction_prepa">{{ log.reaction_prepa }}</span>
                  <i v-else class="ti ti-mood-plus"></i>
                </button>
              </div>
              <!-- L'athlète voit la réaction dans son historique, et en est
                   notifié à sa prochaine ouverture de l'appli. -->
              <div v-if="reactionOuverte === log.id" class="reaction-choix" role="group" aria-label="Réagir à cette série">
                <button
                  v-for="r in REACTIONS_PREPA"
                  :key="r"
                  type="button"
                  class="reaction-option"
                  :class="{ active: log.reaction_prepa === r }"
                  :aria-pressed="log.reaction_prepa === r"
                  @click="reagir(log, r)"
                >{{ r }}</button>
                <span class="reaction-aide">{{ athleteNom ? `${prenom(athleteNom)} est notifié` : 'Ton athlète est notifié' }} à sa prochaine ouverture de l'appli</span>
              </div>
            </template>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { useApi } from '../../services/api'
import { afficherToast } from '../../composables/useToast'
import { grouperExercices, typeGroupe, labelTypeGroupe } from '../../data/typesGroupe'
import { objectifDe, objectifsParCle, texteCharge, texteObjectif } from '../../data/objectifs'
import { parseValeurSerie } from '../../utils/valeurSerie'
import {
  REACTIONS_PREPA, ICONES_STATUT_SERIE, textePrescrit, texteRealise, statutSerie, classeTaux, cleExercice, texteRecord
} from '../../data/seancesRealisees'

// Le détail d'une séance réalisée : chaque exercice, série par série, le
// prescrit face au réalisé, et la réaction du prépa sur chaque série.
export default {
  props: {
    // Une ligne de GET /monitoring/seances
    seance: { type: Object, required: true },
    athleteNom: { type: String, default: '' }
  },
  emits: ['reaction'],
  setup(props, { emit }) {
    const api = useApi()
    const logs = ref([])
    const chargement = ref(true)
    const erreur = ref('')
    const reactionOuverte = ref(null)

    const type = computed(() => props.seance.type_seance)

    // Objectifs de charge de l'athlète (musculation seulement) ; null tant
    // qu'ils ne sont pas lus, et en cas d'échec : le bouton n'apparaît pas.
    const objectifs = ref(null)
    const chargerObjectifs = async () => {
      if (type.value !== 'musculation') return
      try {
        objectifs.value = objectifsParCle(await api.get(`/objectifs/athletes/${props.seance.athlete_id}`))
      } catch {
        objectifs.value = null
      }
    }

    const charger = async () => {
      chargement.value = true
      erreur.value = ''
      chargerObjectifs()
      try {
        logs.value = await api.get(`/monitoring/seances/${props.seance.id}/series`)
      } catch (e) {
        erreur.value = e.message || 'Impossible de charger les séries'
      } finally {
        chargement.value = false
      }
    }

    // Les séries arrivent dans l'ordre de la séance (exercice, puis série) :
    // on les range par exercice, puis par superset.
    const groupes = computed(() => {
      const parExo = new Map()
      for (const log of logs.value) {
        const exo = log.exercice
        if (!parExo.has(exo.id)) parExo.set(exo.id, { ...exo, logs: [] })
        parExo.get(exo.id).logs.push(log)
      }
      return grouperExercices([...parExo.values()])
    })

    // Record battu sur cet exercice pendant la séance (calculé par l'API)
    const recordDe = (exo) => (props.seance.records || []).find((r) => cleExercice(r.exercice) === cleExercice(exo.nom)) || null

    const faitesExo = (exo) => exo.logs.filter((l) => l.fait).length
    const tauxExo = (exo) => (exo.logs.length ? Math.round((faitesExo(exo) / exo.logs.length) * 100) : null)
    const lettre = (idx) => String.fromCharCode(65 + idx)
    const prenom = (nom) => nom.split(' ')[0]

    // Retoucher la réaction déjà posée la retire.
    const reagir = async (log, reaction) => {
      const avant = log.reaction_prepa
      const nouvelle = avant === reaction ? null : reaction
      reactionOuverte.value = null
      try {
        const maj = await api.patch(`/logs/${log.id}/reaction`, { reaction: nouvelle })
        log.reaction_prepa = maj.reaction_prepa
        emit('reaction', Number(!!maj.reaction_prepa) - Number(!!avant))
      } catch (e) {
        afficherToast(e.message || "La réaction n'a pas pu être enregistrée", 'erreur')
      }
    }

    // Ouvert sur l'objectif en place, sinon sur la meilleure charge faite
    // pendant cette séance : le prépa n'a plus qu'à l'ajuster.
    const objectifOuvert = ref(null)
    const objectifEnvoi = ref(false)
    const brouillonObjectif = ref({ poids: '', reps: '' })
    const ouvrirObjectif = (exo) => {
      if (objectifOuvert.value === exo.id) { objectifOuvert.value = null; return }
      const actuel = objectifDe(objectifs.value, exo.nom)
      const charges = exo.logs.filter((l) => l.fait).map((l) => parseValeurSerie(l.poids_realise)).filter((v) => !isNaN(v))
      brouillonObjectif.value = actuel
        ? { poids: actuel.poids, reps: actuel.reps ?? '' }
        : { poids: charges.length ? Math.max(...charges) : '', reps: '' }
      objectifOuvert.value = exo.id
    }
    const majObjectifs = async (requete) => {
      objectifEnvoi.value = true
      try {
        objectifs.value = objectifsParCle(await requete())
        objectifOuvert.value = null
      } catch (e) {
        afficherToast(e.message || "L'objectif n'a pas pu être enregistré", 'erreur')
      } finally {
        objectifEnvoi.value = false
      }
    }
    const enregistrerObjectif = (exo) => majObjectifs(() => api.put(`/objectifs/athletes/${props.seance.athlete_id}`, {
      exercice_nom: exo.nom,
      poids: Number(brouillonObjectif.value.poids),
      reps: brouillonObjectif.value.reps === '' ? null : Number(brouillonObjectif.value.reps)
    }))
    const retirerObjectif = (exo) => majObjectifs(() =>
      api.del(`/objectifs/athletes/${props.seance.athlete_id}/${objectifDe(objectifs.value, exo.nom).id}`)
    )

    onMounted(charger)

    return {
      REACTIONS_PREPA, ICONES_STATUT_SERIE,
      logs, chargement, erreur, charger, groupes, type, reactionOuverte, reagir,
      faitesExo, tauxExo, lettre, prenom, recordDe, texteRecord,
      objectifs, objectifDe, texteObjectif, texteCharge, objectifOuvert, objectifEnvoi, brouillonObjectif,
      ouvrirObjectif, enregistrerObjectif, retirerObjectif,
      typeGroupe, labelTypeGroupe, textePrescrit, texteRealise, statutSerie, classeTaux
    }
  }
}
</script>

<style scoped>
.detail-seance { display: flex; flex-direction: column; gap: var(--spacing-md); }
.detail-etat {
  display: flex; align-items: center; gap: 6px; flex-wrap: wrap;
  margin: 0; padding: var(--spacing-sm) 0;
  font-size: var(--font-size-sm); color: var(--color-text-muted);
}
.detail-erreur { color: var(--color-danger-text); }
.tourne { animation: tourner 0.9s linear infinite; }
@keyframes tourner { to { transform: rotate(360deg); } }

.exo-groupe { display: flex; flex-direction: column; gap: var(--spacing-md); }
.exo-groupe + .exo-groupe:not(.is-superset) { padding-top: var(--spacing-md); border-top: 1px solid var(--color-border); }
.exo-groupe.is-superset {
  padding: var(--spacing-md);
  background: var(--color-superset-bg);
  border: 1px solid var(--color-superset-border);
  border-left: 4px solid var(--color-primary);
  border-radius: var(--radius-lg);
}
.exo-groupe.is-superset .exo-bloc + .exo-bloc { padding-top: var(--spacing-md); border-top: 1px dashed var(--color-superset-border); }
.superset-banner { display: flex; align-items: center; gap: 6px; font-size: var(--font-size-xs); font-weight: 600; color: var(--color-superset-text); }

.exo-bloc { display: flex; flex-direction: column; gap: var(--spacing-sm); }
.exo-entete { display: flex; flex-wrap: wrap; align-items: center; gap: var(--spacing-sm); }
.exo-repere {
  width: 26px; height: 26px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  border-radius: var(--radius-sm);
  background: var(--color-primary-light); color: var(--color-superset-text);
  font-size: var(--font-size-xs); font-weight: 700;
}
.exo-lettre { background: var(--color-primary); color: var(--color-on-primary); }
.exo-nom { flex: 1; min-width: 0; font-size: var(--font-size-base); font-weight: 600; overflow-wrap: anywhere; }
.exo-record {
  display: inline-flex; align-items: center; gap: 4px; flex-shrink: 0;
  padding: 2px 8px; border-radius: var(--radius-full);
  background: var(--color-warning-bg); color: var(--color-warning-text-strong);
  font-size: var(--font-size-xs); font-weight: 700; white-space: nowrap;
}
.exo-objectif {
  display: inline-flex; align-items: center; gap: 4px; flex-shrink: 0;
  padding: 2px 9px; border-radius: var(--radius-full);
  border: 1px dashed var(--color-border-strong); background: transparent;
  font: inherit; font-size: var(--font-size-xs); font-weight: 700; white-space: nowrap;
  color: var(--color-text-muted); cursor: pointer;
}
.exo-objectif:hover { color: var(--color-primary-dark); border-color: var(--color-primary); }
.exo-objectif.pose { border-style: solid; border-color: var(--color-warning-border); background: var(--color-warning-bg); color: var(--color-warning-text-strong); }
.exo-objectif.atteint { border-color: transparent; background: var(--color-valid-bg); color: var(--color-valid-text-strong); }
.objectif-edition {
  display: flex; flex-wrap: wrap; align-items: center; gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  border: 1px solid var(--color-warning-border); border-radius: var(--radius-md);
  background: var(--color-warning-bg-soft);
  animation: reaction-arrivee 0.25s var(--ease-standard);
}
.objectif-champ { display: inline-flex; align-items: center; gap: 6px; font-size: var(--font-size-sm); font-weight: 600; color: var(--color-text-secondary); }
.objectif-champ input { width: 76px; min-height: 36px; padding: 0 8px; text-align: center; }
.objectif-aide { flex-basis: 100%; font-size: var(--font-size-xs); color: var(--color-text-muted); }
.exo-bilan {
  flex-shrink: 0; padding: 2px 8px; border-radius: var(--radius-full);
  font-size: var(--font-size-xs); font-weight: 700; font-variant-numeric: tabular-nums;
  background: var(--color-bg-tertiary); color: var(--color-text-secondary);
}
.exo-bilan.taux-done { background: var(--color-valid-bg); color: var(--color-valid-text-strong); }
.exo-bilan.taux-warn { background: var(--color-warning-bg); color: var(--color-warning-text-strong); }
.exo-bilan.taux-skip { background: var(--color-danger-bg); color: var(--color-danger-text); }

.comparatif { display: flex; flex-direction: column; gap: 4px; max-width: 760px; }
.comparatif-entete, .comparatif-ligne {
  display: grid;
  grid-template-columns: 36px minmax(0, 1.2fr) 18px minmax(0, 1.2fr) 22px 40px;
  gap: var(--spacing-sm);
  align-items: center;
}
.comparatif-entete {
  padding: 0 var(--spacing-sm) 2px;
  font-size: var(--font-size-xs); font-weight: 600; color: var(--color-text-muted);
  text-transform: uppercase; letter-spacing: 0.3px;
}
.comparatif-ligne { padding: 6px var(--spacing-sm); border-radius: var(--radius-md); font-size: var(--font-size-sm); }
.comparatif-ligne.statut-done { background: var(--color-valid-bg-soft); }
.comparatif-ligne.statut-done .statut { color: var(--color-valid-text); }
.comparatif-ligne.statut-warn { background: var(--color-warning-bg-soft); }
.comparatif-ligne.statut-warn .statut { color: var(--color-warning-icon); }
.comparatif-ligne.statut-skip { background: var(--color-danger-bg-soft); }
.comparatif-ligne.statut-skip .statut { color: var(--color-danger-text); }
.serie-num {
  padding: 3px 0; border-radius: var(--radius-sm);
  background: var(--color-bg-tertiary); color: var(--color-text-secondary);
  font-size: var(--font-size-xs); font-weight: 700; text-align: center;
}
.prescrit { color: var(--color-text-secondary); overflow-wrap: anywhere; }
.fleche { justify-self: center; color: var(--color-text-muted); }
.realise { font-weight: 600; color: var(--color-text); overflow-wrap: anywhere; }
.non-fait { display: inline-flex; align-items: center; gap: 4px; font-weight: 500; color: var(--color-danger-text); }
.statut { display: flex; justify-content: center; }

.btn-reaction {
  width: 36px; height: 36px; justify-self: end;
  display: inline-flex; align-items: center; justify-content: center;
  border: 1px dashed var(--color-border-strong); border-radius: 50%;
  background: transparent; color: var(--color-text-muted);
  font-size: var(--font-size-lg); line-height: 1; cursor: pointer;
  transition: background var(--transition-fast), color var(--transition-fast);
}
.btn-reaction:hover { background: var(--color-bg); color: var(--color-primary-dark); }
.btn-reaction.pose { border-style: solid; border-color: var(--color-primary); background: var(--color-primary-light); }
.reaction-choix {
  display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 6px;
  padding: 4px var(--spacing-sm) var(--spacing-sm);
  animation: reaction-arrivee 0.25s var(--ease-standard);
}
@keyframes reaction-arrivee { from { opacity: 0; transform: translateY(-4px); } }
.reaction-option {
  width: 40px; height: 40px;
  border: 1px solid var(--color-border); border-radius: 50%;
  background: var(--color-bg); font-size: 20px; line-height: 1; cursor: pointer;
  transition: transform var(--transition-fast);
}
.reaction-option:hover { transform: scale(1.15); }
.reaction-option.active { border-color: var(--color-primary); background: var(--color-primary-light); }
.reaction-aide { flex-basis: 100%; text-align: right; font-size: var(--font-size-xs); color: var(--color-text-muted); }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }

@media (prefers-reduced-motion: reduce) {
  .reaction-choix, .tourne, .objectif-edition { animation: none; }
  .reaction-option:hover { transform: none; }
}
@media (max-width: 768px) {
  .comparatif-entete, .comparatif-ligne { grid-template-columns: 28px minmax(0, 1fr) 14px minmax(0, 1fr) 18px 36px; gap: 6px; }
  .comparatif-ligne { font-size: var(--font-size-xs); padding: 6px; }
  .entete-serie { visibility: hidden; }
  .realise { font-size: var(--font-size-sm); }
}
</style>
