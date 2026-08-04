<template>
  <!-- Le planning du mois : la semaine type de l'athlète projetée sur chaque
       date. Une case = un jour, avec son numéro et le nom des séances qui y
       tombent, vertes une fois faites et validées. Le détail du jour choisi
       est repris en dessous, en grand, pour ouvrir la séance. -->
  <div class="planning">
    <div class="planning-head">
      <button class="btn btn-icon" @click="moisPrecedent" aria-label="Mois précédent">
        <i class="ti ti-chevron-left"></i>
      </button>
      <div class="planning-head-txt">
        <span class="planning-titre">{{ labelMois }}</span>
        <span class="planning-sub">
          {{ nbFaitesMois }} séance{{ nbFaitesMois > 1 ? 's' : '' }} faite{{ nbFaitesMois > 1 ? 's' : '' }}
        </span>
      </div>
      <button class="btn btn-icon" @click="moisSuivant" aria-label="Mois suivant">
        <i class="ti ti-chevron-right"></i>
      </button>
    </div>

    <div class="cal-grille">
      <span v-for="(label, i) in LABELS_COURTS" :key="'l' + i" class="cal-label">{{ label }}</span>
      <button
        v-for="(jour, i) in grille"
        :key="i"
        type="button"
        class="cal-case"
        :class="{
          vide: !jour,
          'est-aujourdhui': jour?.estAujourdhui,
          'est-selection': jour && jour.date === jourSelectionne
        }"
        :disabled="!jour"
        @click="jour && (jourSelectionne = jour.date)"
      >
        <template v-if="jour">
          <span class="cal-num">{{ jour.numero }}</span>
          <span
            v-for="occ in jour.occurrences.slice(0, 2)"
            :key="occ.seance.id"
            class="cal-chip"
            :class="occ.classe"
          >{{ occ.seance.nom }}</span>
          <span v-if="jour.occurrences.length > 2" class="cal-plus">
            +{{ jour.occurrences.length - 2 }}
          </span>
        </template>
      </button>
    </div>

    <!-- Jour sélectionné : les noms complets, et le seul endroit d'où on ouvre
         une séance (les puces du calendrier sont trop petites pour être des
         cibles fiables). -->
    <div class="jour-detail">
      <div class="jour-detail-head">
        <span class="jour-detail-titre">{{ labelJourSelectionne }}</span>
        <button class="btn btn-sm" @click="$emit('modifier')">
          <i class="ti ti-calendar-cog"></i> Ma semaine
        </button>
      </div>

      <button
        v-for="occ in occurrencesSelection"
        :key="occ.seance.id"
        class="planning-seance"
        :class="occ.classe"
        @click="$emit('ouvrir', { seance: occ.seance, dateFait: occ.dateFait })"
      >
        <div class="ps-main">
          <div class="ps-titre">{{ occ.seance.nom }}</div>
          <div class="ps-meta">
            <span class="type-badge" :class="`type-badge-${occ.seance.type_seance || 'musculation'}`">
              {{ labelType(occ.seance.type_seance) }}
            </span>
            <span class="ps-count">{{ occ.seance.exercices?.length || 0 }} exercices</span>
          </div>
          <div class="ps-note" v-if="occ.dateFait && occ.dateFait.split('T')[0] !== jourSelectionne">
            Faite le {{ formatCourt(occ.dateFait) }}
          </div>
        </div>
        <span class="ps-statut" v-if="occ.fait">
          <i class="ti ti-circle-check-filled"></i> Fait
        </span>
        <i class="ti ti-chevron-right ps-chevron" v-else></i>
      </button>

      <span v-if="occurrencesSelection.length === 0" class="jour-repos">
        <i class="ti ti-zzz"></i> Repos
      </span>
    </div>

    <!-- Séances du programme laissées hors de la semaine type : elles restent
         accessibles, sinon les placer deviendrait obligatoire pour les ouvrir. -->
    <template v-if="nonPlanifiees.length">
      <div class="section-title planning-hors">Hors semaine type</div>
      <button
        v-for="seance in nonPlanifiees"
        :key="seance.id"
        class="planning-seance is-hors"
        @click="$emit('ouvrir', { seance, dateFait: null })"
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
        <i class="ti ti-chevron-right ps-chevron"></i>
      </button>
    </template>
  </div>
</template>

<script>
import { ref, computed } from 'vue'
import { lundiDeLaSemaine, dateISO, cleOccurrence, jourDeLaDate } from '../../data/joursSemaine'

const LABELS_TYPE = { musculation: 'Musculation', natation: 'Natation', athletisme: 'Athlétisme', pliometrie: 'Pliométrie' }
const LABELS_COURTS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

export default {
  emits: ['ouvrir', 'modifier'],
  props: {
    // Une séance par créneau (la version de la semaine courante, cf.
    // seancesAffichees côté dashboard).
    creneaux: { type: Array, required: true },
    // [{ creneau, jour }] — la semaine type enregistrée.
    planning: { type: Array, required: true },
    // { 'creneau||lundi ISO': date ISO de la séance validée } — le rattachement
    // est hebdomadaire : une séance faite avec un jour de retard reste celle de
    // son créneau.
    faites: { type: Object, default: () => ({}) }
  },
  setup(props) {
    const labelType = (t) => LABELS_TYPE[t] || LABELS_TYPE.musculation
    const formatCourt = (d) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })

    const aujourdhui = new Date()
    aujourdhui.setHours(0, 0, 0, 0)

    const moisAffiche = ref(new Date(aujourdhui.getFullYear(), aujourdhui.getMonth(), 1))
    const jourSelectionne = ref(dateISO(aujourdhui))

    const jourParCreneau = computed(() => {
      const map = {}
      props.planning.forEach(e => { map[e.creneau] = e.jour })
      return map
    })

    // Séances tombant sur cette date d'après la semaine type, avec leur état.
    // « Manquée » ne se dit que d'une semaine révolue : dans la semaine en
    // cours, une séance non faite reste à faire, quel que soit le jour.
    const occurrences = (date) => {
      const jour = jourDeLaDate(date)
      const semainePassee = lundiDeLaSemaine(date) < lundiDeLaSemaine(aujourdhui)
      return props.creneaux
        .filter(s => jourParCreneau.value[s.nom] === jour)
        .map(s => {
          const dateFait = props.faites[cleOccurrence(s.nom, date)] || null
          return {
            seance: s,
            dateFait,
            fait: !!dateFait,
            classe: dateFait ? 'est-faite' : (semainePassee ? 'est-manquee' : '')
          }
        })
    }

    // Grille lundi -> dimanche, complétée par des cases vides pour aligner le
    // premier jour du mois et finir la dernière semaine (même principe que le
    // calendrier de pesée).
    const grille = computed(() => {
      const annee = moisAffiche.value.getFullYear()
      const mois = moisAffiche.value.getMonth()
      const nbJours = new Date(annee, mois + 1, 0).getDate()
      const decalage = (new Date(annee, mois, 1).getDay() + 6) % 7

      const cases = new Array(decalage).fill(null)
      for (let n = 1; n <= nbJours; n++) {
        const date = new Date(annee, mois, n)
        cases.push({
          date: dateISO(date),
          numero: n,
          estAujourdhui: date.getTime() === aujourdhui.getTime(),
          occurrences: occurrences(date)
        })
      }
      while (cases.length % 7 !== 0) cases.push(null)
      return cases
    })

    const occurrencesSelection = computed(() => {
      const jour = grille.value.find(c => c && c.date === jourSelectionne.value)
      return jour ? jour.occurrences : []
    })

    const nbFaitesMois = computed(() =>
      grille.value.filter(Boolean).reduce((n, c) => n + c.occurrences.filter(o => o.fait).length, 0)
    )

    const nonPlanifiees = computed(() =>
      props.creneaux.filter(s => !jourParCreneau.value[s.nom])
    )

    const majuscule = (t) => t.charAt(0).toUpperCase() + t.slice(1)
    const labelMois = computed(() =>
      majuscule(moisAffiche.value.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }))
    )
    const labelJourSelectionne = computed(() => {
      if (jourSelectionne.value === dateISO(aujourdhui)) return "Aujourd'hui"
      return majuscule(new Date(jourSelectionne.value).toLocaleDateString('fr-FR', {
        weekday: 'long', day: 'numeric', month: 'long'
      }))
    })

    // Le détail suit le mois affiché : on se cale sur son premier jour, ou sur
    // aujourd'hui dès qu'on revient au mois courant.
    const changerMois = (delta) => {
      const nouveau = new Date(moisAffiche.value.getFullYear(), moisAffiche.value.getMonth() + delta, 1)
      moisAffiche.value = nouveau
      const moisCourant = nouveau.getFullYear() === aujourdhui.getFullYear()
        && nouveau.getMonth() === aujourdhui.getMonth()
      jourSelectionne.value = dateISO(moisCourant ? aujourdhui : nouveau)
    }
    const moisPrecedent = () => changerMois(-1)
    const moisSuivant = () => changerMois(1)

    return {
      LABELS_COURTS,
      labelType, formatCourt,
      jourSelectionne, grille, occurrencesSelection, nbFaitesMois,
      nonPlanifiees, labelMois, labelJourSelectionne, moisPrecedent, moisSuivant
    }
  }
}
</script>

<style scoped>
/* flex-shrink: 0 — le calendrier est un enfant de .screen (flex column
   scrollable) : sans ça la grille se comprime au lieu de scroller. */
.planning { display: flex; flex-direction: column; gap: var(--spacing-md); flex-shrink: 0; }

.planning-head { display: flex; align-items: center; justify-content: space-between; gap: var(--spacing-sm); }
.planning-head-txt { display: flex; flex-direction: column; align-items: center; text-align: center; }
.planning-titre { font-size: var(--font-size-lg); font-weight: 700; color: var(--color-text); }
.planning-sub { font-size: var(--font-size-xs); color: var(--color-text-secondary); }

/* --- Grille du mois --- */
.cal-grille { display: grid; grid-template-columns: repeat(7, 1fr); gap: 3px; }
.cal-label {
  text-align: center;
  font-size: var(--font-size-xs);
  font-weight: 700;
  color: var(--color-text-muted);
  padding-bottom: 2px;
}
.cal-case {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 2px;
  min-height: 62px;
  padding: 3px;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  overflow: hidden;
}
.cal-case.vide { background: transparent; border-color: transparent; cursor: default; }
.cal-case.est-aujourdhui { background: var(--color-primary-light); border-color: var(--color-primary); }
.cal-case.est-selection { border-color: var(--color-primary-dark); box-shadow: inset 0 0 0 1px var(--color-primary-dark); }

.cal-num {
  font-size: var(--font-size-xs);
  font-weight: 600;
  color: var(--color-text-secondary);
  text-align: right;
  line-height: 1.1;
}
.est-aujourdhui .cal-num { color: var(--color-primary-dark); font-weight: 700; }

/* Nom de séance dans la case : tronqué, le détail du jour donne le nom entier. */
.cal-chip {
  font-size: 10px;
  font-weight: 600;
  line-height: 1.3;
  padding: 1px 3px;
  border-radius: 3px;
  background: var(--color-primary-light);
  color: var(--color-primary-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-align: left;
}
.cal-chip.est-faite { background: var(--color-valid-bg); color: var(--color-valid-text-strong); }
.cal-chip.est-manquee { background: var(--color-bg-tertiary); color: var(--color-text-muted); }
.cal-plus { font-size: 9px; color: var(--color-text-muted); text-align: left; padding-left: 3px; }

/* --- Détail du jour choisi --- */
.jour-detail { display: flex; flex-direction: column; gap: var(--spacing-sm); }
.jour-detail-head { display: flex; align-items: center; justify-content: space-between; gap: var(--spacing-sm); }
.jour-detail-titre { font-size: var(--font-size-base); font-weight: 700; color: var(--color-text); }
.jour-repos {
  display: inline-flex;
  align-items: center;
  gap: 6px;
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
.planning-seance.est-manquee { border-left-color: var(--color-border-strong); }
.planning-seance.is-hors { border-left-color: var(--color-border-strong); }

.ps-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6px; }
.ps-titre { font-size: var(--font-size-base); font-weight: 600; color: var(--color-text); }
.ps-meta { display: flex; align-items: center; gap: var(--spacing-sm); flex-wrap: wrap; }
.ps-count { font-size: var(--font-size-xs); color: var(--color-text-secondary); }
.ps-note { font-size: var(--font-size-xs); color: var(--color-text-muted); }

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

.planning-hors { margin-top: var(--spacing-sm); }
</style>
