<template>
  <div class="mes-stats">
    <!-- Ressenti de séance à compléter -->
    <div class="stat-card" v-if="ressenti" ref="ressentiEl">
      <div class="stat-card-titre"><i class="ti ti-mood-smile"></i> Ressenti — {{ ressenti.seance_nom }}</div>
      <p class="stat-card-sub">Comment as-tu trouvé cette séance ?</p>

      <div class="rpe-picker">
        <button
          v-for="n in 11"
          :key="n - 1"
          class="rpe-btn"
          :class="{ active: rpeForm === n - 1 }"
          @click="rpeForm = n - 1"
        >{{ n - 1 }}</button>
      </div>
      <p class="rpe-label" v-if="rpeForm !== null">{{ labelRpe(rpeForm) }}</p>

      <div class="field-inline">
        <label>Durée de la séance</label>
        <input v-model.number="dureeForm" type="number" inputmode="numeric" min="1" placeholder="ex : 60" />
        <span>min</span>
      </div>

      <button
        class="btn btn-primary btn-envoyer"
        :disabled="rpeForm === null || !dureeForm"
        @click="envoyerRessenti"
      >
        <i class="ti ti-check"></i> Enregistrer
      </button>
      <p class="stat-card-note">Modifiable pendant une heure après la séance.</p>
    </div>

    <!-- Wellness du jour -->
    <div class="stat-card" ref="wellnessEl">
      <template v-if="wellnessFait">
        <div class="wellness-fait">
          <i class="ti ti-circle-check-filled"></i>
          <span>Wellness du jour envoyé. À demain !</span>
        </div>
      </template>
      <template v-else>
        <div class="stat-card-titre"><i class="ti ti-heart-rate-monitor"></i> Wellness du jour</div>
        <p class="stat-card-sub">4 questions, moins de 20 secondes.</p>

        <div class="wellness-item" v-for="item in itemsWellness" :key="item.champ">
          <div class="wellness-item-head">
            <span>{{ item.label }}</span>
            <span class="wellness-echelle">1 = très bon · 7 = très mauvais</span>
          </div>
          <div class="wellness-picker">
            <button
              v-for="n in 7"
              :key="n"
              class="wellness-btn"
              :class="{ active: wellnessForm[item.champ] === n }"
              @click="wellnessForm[item.champ] = n"
            >{{ n }}</button>
          </div>
        </div>

        <button class="btn btn-primary btn-envoyer" :disabled="!wellnessComplet" @click="envoyerWellness">
          <i class="ti ti-check"></i> Envoyer
        </button>
      </template>
    </div>

    <!-- Stats descriptives, aucune interprétation -->
    <div class="stat-card stat-hero" v-if="stats">
      <div class="hero-valeur">{{ formatNombre(stats.tonnage_total_musculation) }}<span> kg</span></div>
      <div class="hero-label">Tonnage soulevé au total (musculation)</div>
    </div>

    <div class="stat-card" v-if="stats">
      <div class="stat-card-titre"><i class="ti ti-calendar-stats"></i> Régularité</div>
      <p class="stat-card-sub">{{ stats.nb_seances_completees }} séance{{ stats.nb_seances_completees > 1 ? 's' : '' }} complétée{{ stats.nb_seances_completees > 1 ? 's' : '' }} au total</p>
      <div class="regularite-grille">
        <div
          v-for="j in derniersJours"
          :key="j.date"
          class="regularite-case"
          :class="{ actif: j.nb > 0, 'est-aujourdhui': j.estAujourdhui }"
          :title="j.date"
        ></div>
      </div>
      <p class="stat-card-note">Les 35 derniers jours — une case pleine = au moins une séance complétée.</p>
    </div>

    <div class="stat-card" v-if="stats && stats.repartition_types.length > 0">
      <GraphiqueBarres
        label="Répartition par type de séance"
        :barres="repartitionBarres"
      />
    </div>

    <div class="stat-card" v-if="performances.length > 0">
      <div class="stat-card-titre"><i class="ti ti-trending-up"></i> Progression</div>
      <select v-model="exerciceChoisiId" class="select-exercice">
        <option v-for="p in performances" :key="p.exercice_id" :value="p.exercice_id">{{ p.exercice_nom }}</option>
      </select>
      <CourbeProgression
        v-if="exerciceChoisi"
        :points="courbeExerciceChoisi"
        :label="exerciceChoisi.exercice_nom"
        :unite="exerciceChoisi.unite"
      />
    </div>

    <div class="empty" v-if="stats && stats.nb_seances_completees === 0">
      Valide ta première séance pour commencer à voir tes stats ici.
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useApi } from '../../services/api'
import CourbeProgression from './CourbeProgression.vue'
import GraphiqueBarres from '../monitoring/GraphiqueBarres.vue'

const LABELS_TYPE = { musculation: 'Musculation', natation: 'Natation', athletisme: 'Athlétisme', pliometrie: 'Pliométrie' }

const LABELS_RPE = {
  0: 'Repos', 1: 'Très très facile', 2: 'Facile', 3: 'Modéré', 4: 'Assez dur',
  5: 'Dur', 6: 'Très dur', 7: 'Très dur', 8: 'Très très dur', 9: 'Très très dur', 10: 'Maximal'
}

export default {
  components: { CourbeProgression, GraphiqueBarres },
  emits: ['focus-consomme'],
  props: {
    focusRessenti: { type: Boolean, default: false },
    focusWellness: { type: Boolean, default: false }
  },
  setup(props, { emit }) {
    const api = useApi()
    const stats = ref(null)
    const ressenti = ref(null)
    const rpeForm = ref(null)
    const dureeForm = ref('')
    const wellnessFait = ref(false)
    const wellnessForm = ref({ sommeil: null, fatigue: null, courbatures: null, stress: null })
    const performances = ref([])
    const exerciceChoisiId = ref(null)
    const historiqueExercice = ref([])
    const ressentiEl = ref(null)
    const wellnessEl = ref(null)

    const itemsWellness = [
      { champ: 'sommeil', label: 'Qualité du sommeil' },
      { champ: 'fatigue', label: 'Fatigue' },
      { champ: 'courbatures', label: 'Courbatures' },
      { champ: 'stress', label: 'Stress' }
    ]

    const labelRpe = (v) => LABELS_RPE[v] || ''

    const fetchStats = async () => { stats.value = await api.get('/mes-stats/') }

    const fetchRessenti = async () => {
      ressenti.value = await api.get('/mes-stats/ressenti-a-completer')
      rpeForm.value = ressenti.value?.rpe ?? null
      dureeForm.value = ressenti.value?.duree_minutes ?? ''
    }

    const fetchWellness = async () => {
      const entree = await api.get('/wellness/aujourdhui')
      wellnessFait.value = !!entree
    }

    const fetchPerformances = async () => {
      performances.value = await api.get('/performances/moi')
      if (performances.value.length > 0 && !exerciceChoisiId.value) {
        exerciceChoisiId.value = performances.value[0].exercice_id
      }
    }

    const exerciceChoisi = computed(() => performances.value.find(p => p.exercice_id === exerciceChoisiId.value))

    const champPourType = (type) => type === 'musculation' ? 'poids_realise' : 'reps_realisees'

    const fetchHistoriqueExercice = async () => {
      if (!exerciceChoisi.value) { historiqueExercice.value = []; return }
      historiqueExercice.value = await api.get(`/logs/programme/${exerciceChoisi.value.programme_id}/moi`)
    }

    const cleTentative = (l) => l.session_id || l.date.split('T')[0]

    const courbeExerciceChoisi = computed(() => {
      if (!exerciceChoisi.value) return []
      const champ = champPourType(exerciceChoisi.value.type_seance)
      const parTentative = {}
      historiqueExercice.value
        .filter(l => l.exercice.nom === exerciceChoisi.value.exercice_nom)
        .forEach(l => {
          const valeur = parseFloat(l[champ])
          if (isNaN(valeur)) return
          const cle = cleTentative(l)
          if (!parTentative[cle]) parTentative[cle] = { date: l.date.split('T')[0], total: 0, n: 0 }
          parTentative[cle].total += valeur
          parTentative[cle].n += 1
        })
      return Object.values(parTentative)
        .map(t => ({ date: t.date, valeur: Math.round((t.total / t.n) * 100) / 100 }))
        .sort((a, b) => new Date(a.date) - new Date(b.date))
    })

    watch(exerciceChoisiId, fetchHistoriqueExercice)

    const envoyerRessenti = async () => {
      if (rpeForm.value === null || !dureeForm.value) return
      await api.post(`/seances/${ressenti.value.seance_id}/charge`, {
        session_id: ressenti.value.session_id, rpe: rpeForm.value, duree_minutes: dureeForm.value
      })
      ressenti.value = null
      await fetchStats()
    }

    const wellnessComplet = computed(() => Object.values(wellnessForm.value).every(v => v !== null))

    const envoyerWellness = async () => {
      if (!wellnessComplet.value) return
      await api.post('/wellness/', wellnessForm.value)
      wellnessFait.value = true
    }

    const repartitionBarres = computed(() =>
      (stats.value?.repartition_types || []).map(r => ({
        cle: r.type_seance, nom: LABELS_TYPE[r.type_seance] || r.type_seance, valeur: r.nb_seances
      }))
    )

    const derniersJours = computed(() => {
      const parJour = {}
      ;(stats.value?.jours_avec_seance || []).forEach(j => { parJour[j.date] = j.nb_seances })
      const today = new Date()
      const jours = []
      for (let i = 34; i >= 0; i--) {
        const d = new Date(today)
        d.setDate(d.getDate() - i)
        const iso = d.toISOString().split('T')[0]
        jours.push({ date: iso, nb: parJour[iso] || 0, estAujourdhui: i === 0 })
      }
      return jours
    })

    const formatNombre = (v) => Math.round(v).toLocaleString('fr-FR')

    const scrollVers = async (el) => {
      await nextTick()
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }

    watch(() => props.focusRessenti, async (actif) => {
      if (!actif) return
      await fetchRessenti()
      await scrollVers(ressentiEl.value)
      emit('focus-consomme', 'ressenti')
    })

    watch(() => props.focusWellness, async (actif) => {
      if (!actif) return
      await scrollVers(wellnessEl.value)
      emit('focus-consomme', 'wellness')
    })

    onMounted(async () => {
      await Promise.all([fetchStats(), fetchRessenti(), fetchWellness(), fetchPerformances()])
      await fetchHistoriqueExercice()
      if (props.focusRessenti) { await scrollVers(ressentiEl.value); emit('focus-consomme', 'ressenti') }
      if (props.focusWellness) { await scrollVers(wellnessEl.value); emit('focus-consomme', 'wellness') }
    })

    return {
      stats, ressenti, rpeForm, dureeForm, labelRpe, envoyerRessenti,
      wellnessFait, wellnessForm, itemsWellness, wellnessComplet, envoyerWellness,
      performances, exerciceChoisiId, exerciceChoisi, courbeExerciceChoisi,
      repartitionBarres, derniersJours, formatNombre,
      ressentiEl, wellnessEl
    }
  }
}
</script>

<style scoped>
.mes-stats { display: flex; flex-direction: column; gap: var(--spacing-lg); padding: var(--spacing-lg) var(--spacing-xl); overflow-y: auto; }

.stat-card {
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}
.stat-card-titre { display: flex; align-items: center; gap: 8px; font-size: var(--font-size-base); font-weight: 700; }
.stat-card-sub { font-size: var(--font-size-sm); color: var(--color-text-secondary); margin: 0; }
.stat-card-note { font-size: var(--font-size-xs); color: var(--color-text-muted); margin: 0; }

.rpe-picker { display: flex; flex-wrap: wrap; gap: 6px; }
.rpe-btn {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: var(--color-bg);
  font-weight: 700;
  cursor: pointer;
}
.rpe-btn.active { background: var(--color-primary); border-color: var(--color-primary); color: var(--color-on-primary); }
.rpe-label { font-size: var(--font-size-sm); font-weight: 600; color: var(--color-primary-text); margin: 0; }

.field-inline { display: flex; align-items: center; gap: var(--spacing-sm); }
.field-inline label { font-size: var(--font-size-sm); color: var(--color-text-secondary); flex-shrink: 0; }
.field-inline input {
  width: 90px;
  min-height: var(--tap-min);
  padding: 0 var(--spacing-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--font-size-base);
  background: var(--color-bg);
}
.btn-envoyer { align-self: flex-start; }

.wellness-fait { display: flex; align-items: center; gap: var(--spacing-sm); color: var(--color-valid-text-strong); font-weight: 600; }
.wellness-item { display: flex; flex-direction: column; gap: 6px; }
.wellness-item-head { display: flex; justify-content: space-between; align-items: baseline; gap: var(--spacing-sm); flex-wrap: wrap; }
.wellness-item-head span:first-child { font-size: var(--font-size-sm); font-weight: 600; }
.wellness-echelle { font-size: 10px; color: var(--color-text-muted); }
.wellness-picker { display: flex; gap: 6px; }
.wellness-btn {
  flex: 1;
  height: 36px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: var(--color-bg);
  font-weight: 600;
  cursor: pointer;
}
.wellness-btn.active { background: var(--color-primary); border-color: var(--color-primary); color: var(--color-on-primary); }

.stat-hero { align-items: center; text-align: center; background: var(--color-primary-light); border-color: var(--color-primary); }
.hero-valeur { font-size: 40px; font-weight: 800; color: var(--color-primary-text); line-height: 1; }
.hero-valeur span { font-size: var(--font-size-lg); font-weight: 600; }
.hero-label { font-size: var(--font-size-sm); color: var(--color-primary-text); }

.regularite-grille { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; }
.regularite-case { aspect-ratio: 1; border-radius: 4px; background: var(--color-bg-tertiary); }
.regularite-case.actif { background: var(--color-valid-text-strong); }
.regularite-case.est-aujourdhui { outline: 2px solid var(--color-primary); outline-offset: 1px; }

.select-exercice {
  min-height: var(--tap-min);
  padding: 0 var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--font-size-base);
  background: var(--color-bg);
}
</style>
