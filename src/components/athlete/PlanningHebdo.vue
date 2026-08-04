<template>
  <!-- Semaine type de l'athlète : ses séances posées sur les 7 jours, vertes
       une fois faites et validées cette semaine. Un jour sans séance est un
       jour de repos, affiché quand même pour que la semaine se lise d'un bloc. -->
  <div class="planning">
    <div class="planning-head">
      <div class="planning-head-txt">
        <span class="planning-titre">Ma semaine</span>
        <span class="planning-sub">{{ libelleSemaine }} · {{ nbFaites }}/{{ creneaux.length }} faites</span>
      </div>
      <button class="btn btn-sm" @click="$emit('modifier')">
        <i class="ti ti-calendar-cog"></i> Modifier
      </button>
    </div>

    <div
      v-for="jour in jours"
      :key="jour.cle"
      class="planning-jour"
      :class="{ 'est-aujourdhui': jour.estAujourdhui, 'est-repos': jour.seances.length === 0 }"
    >
      <div class="jour-col">
        <span class="jour-nom">{{ jour.court }}</span>
        <span class="jour-num">{{ jour.numero }}</span>
      </div>
      <div class="jour-contenu">
        <button
          v-for="seance in jour.seances"
          :key="seance.id"
          class="planning-seance"
          :class="{ 'est-faite': estFaite(seance) }"
          @click="$emit('ouvrir', seance)"
        >
          <div class="ps-main">
            <div class="ps-titre">{{ seance.nom }}</div>
            <div class="ps-meta">
              <span class="type-badge" :class="`type-badge-${seance.type_seance || 'musculation'}`">
                {{ labelType(seance.type_seance) }}
              </span>
              <span class="ps-count">{{ seance.exercices?.length || 0 }} exercices</span>
            </div>
            <div class="ps-derniere" v-if="!estFaite(seance) && derniereFois(seance)">
              Dernière fois le {{ derniereFois(seance) }}
            </div>
          </div>
          <span class="ps-statut" v-if="estFaite(seance)">
            <i class="ti ti-circle-check-filled"></i> Fait
          </span>
          <i class="ti ti-chevron-right ps-chevron" v-else></i>
        </button>
        <span v-if="jour.seances.length === 0" class="jour-repos">Repos</span>
      </div>
    </div>

    <!-- Séances du programme laissées hors de la semaine type : elles restent
         accessibles, sinon les placer deviendrait obligatoire pour les ouvrir. -->
    <template v-if="nonPlanifiees.length">
      <div class="section-title planning-hors">Hors semaine type</div>
      <button
        v-for="seance in nonPlanifiees"
        :key="seance.id"
        class="planning-seance is-hors"
        :class="{ 'est-faite': estFaite(seance) }"
        @click="$emit('ouvrir', seance)"
      >
        <div class="ps-main">
          <div class="ps-titre">{{ seance.nom }}</div>
          <div class="ps-meta">
            <span class="type-badge" :class="`type-badge-${seance.type_seance || 'musculation'}`">
              {{ labelType(seance.type_seance) }}
            </span>
            <span class="ps-count">{{ seance.exercices?.length || 0 }} exercices</span>
          </div>
        </div>
        <span class="ps-statut" v-if="estFaite(seance)">
          <i class="ti ti-circle-check-filled"></i> Fait
        </span>
        <i class="ti ti-chevron-right ps-chevron" v-else></i>
      </button>
    </template>
  </div>
</template>

<script>
import { computed } from 'vue'
import { JOURS_SEMAINE, lundiDeLaSemaine } from '../../data/joursSemaine'

const LABELS_TYPE = { musculation: 'Musculation', natation: 'Natation', athletisme: 'Athlétisme', pliometrie: 'Pliométrie' }

export default {
  emits: ['ouvrir', 'modifier'],
  props: {
    // Une séance par créneau (la version de la semaine courante, cf.
    // seancesAffichees côté dashboard).
    creneaux: { type: Array, required: true },
    // [{ creneau, jour }] — la semaine type enregistrée.
    planning: { type: Array, required: true },
    // { [creneau]: { fait: bool, derniereDate: iso|null } } — « fait » vaut
    // pour la semaine en cours uniquement.
    statuts: { type: Object, default: () => ({}) }
  },
  setup(props) {
    const labelType = (t) => LABELS_TYPE[t] || LABELS_TYPE.musculation

    const jourParCreneau = computed(() => {
      const map = {}
      props.planning.forEach(e => { map[e.creneau] = e.jour })
      return map
    })

    const estFaite = (seance) => !!props.statuts[seance.nom]?.fait
    const derniereFois = (seance) => {
      const date = props.statuts[seance.nom]?.derniereDate
      return date ? new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : null
    }

    const jours = computed(() => {
      const lundi = lundiDeLaSemaine()
      const aujourdhui = new Date()
      aujourdhui.setHours(0, 0, 0, 0)
      return JOURS_SEMAINE.map((jour, i) => {
        const date = new Date(lundi)
        date.setDate(lundi.getDate() + i)
        return {
          ...jour,
          numero: date.getDate(),
          estAujourdhui: date.getTime() === aujourdhui.getTime(),
          seances: props.creneaux.filter(s => jourParCreneau.value[s.nom] === jour.cle)
        }
      })
    })

    const nonPlanifiees = computed(() =>
      props.creneaux.filter(s => !jourParCreneau.value[s.nom])
    )

    const nbFaites = computed(() => props.creneaux.filter(estFaite).length)

    // « 4 – 10 août » : le mois n'est répété que s'il change en cours de semaine.
    const libelleSemaine = computed(() => {
      const lundi = lundiDeLaSemaine()
      const dimanche = new Date(lundi)
      dimanche.setDate(lundi.getDate() + 6)
      const memeMois = lundi.getMonth() === dimanche.getMonth()
      const debut = lundi.toLocaleDateString('fr-FR', memeMois ? { day: 'numeric' } : { day: 'numeric', month: 'short' })
      const fin = dimanche.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
      return `${debut} – ${fin}`
    })

    return { labelType, jours, nonPlanifiees, nbFaites, libelleSemaine, estFaite, derniereFois }
  }
}
</script>

<style scoped>
/* flex-shrink: 0 — le calendrier est un enfant de .screen (flex column
   scrollable) : sans ça les 7 jours se compriment au lieu de scroller. */
.planning { display: flex; flex-direction: column; gap: var(--spacing-sm); flex-shrink: 0; }

.planning-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-md);
}
.planning-head-txt { display: flex; flex-direction: column; }
.planning-titre { font-size: var(--font-size-lg); font-weight: 700; color: var(--color-text); }
.planning-sub { font-size: var(--font-size-xs); color: var(--color-text-secondary); }

.planning-jour {
  display: flex;
  gap: var(--spacing-md);
  padding: var(--spacing-sm) var(--spacing-sm) var(--spacing-sm) 0;
  border-radius: var(--radius-lg);
}
.planning-jour.est-aujourdhui { background: var(--color-primary-light); }
.planning-jour.est-repos { opacity: 0.75; }

.jour-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  width: 48px;
  flex-shrink: 0;
  padding-top: var(--spacing-sm);
}
.jour-nom {
  font-size: var(--font-size-xs);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  color: var(--color-text-secondary);
}
.jour-num { font-size: var(--font-size-lg); font-weight: 700; color: var(--color-text); line-height: 1.2; }
.est-aujourdhui .jour-nom,
.est-aujourdhui .jour-num { color: var(--color-primary-dark); }

.jour-contenu { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: var(--spacing-sm); }
.jour-repos {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
  padding: var(--spacing-sm) 0;
}

.planning-seance {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  width: 100%;
  text-align: left;
  padding: var(--spacing-md);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-left: 4px solid var(--color-primary);
  border-radius: var(--radius-lg);
  cursor: pointer;
}
.planning-seance:hover { background: var(--color-bg-hover); }
.planning-seance.est-faite {
  background: var(--color-valid-bg-soft);
  border-color: var(--color-valid-border);
  border-left-color: var(--color-valid-border-strong);
}
.planning-seance.is-hors { border-left-color: var(--color-border-strong); }

.ps-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6px; }
.ps-titre { font-size: var(--font-size-base); font-weight: 600; color: var(--color-text); }
.ps-meta { display: flex; align-items: center; gap: var(--spacing-sm); flex-wrap: wrap; }
.ps-count { font-size: var(--font-size-xs); color: var(--color-text-secondary); }
.ps-derniere { font-size: var(--font-size-xs); color: var(--color-text-muted); }

.ps-statut {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  font-size: var(--font-size-xs);
  font-weight: 700;
  color: var(--color-valid-text-strong);
}
.ps-chevron { color: var(--color-text-muted); flex-shrink: 0; }

.planning-hors { margin-top: var(--spacing-md); }
</style>
