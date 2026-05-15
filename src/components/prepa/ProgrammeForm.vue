<template>
  <div class="form-wrapper">

    <!-- Étape 1 : Programme -->
    <div v-if="etape === 1" class="etape">
      <h2>Nouveau programme</h2>
      <input v-model="programme.nom" placeholder="Nom du programme" />
      <input v-model="programme.description" placeholder="Description (optionnelle)" />
      <div class="actions">
        <button class="btn-secondary" @click="$emit('termine')">Annuler</button>
        <button @click="creerProgramme" :disabled="!programme.nom">Créer et continuer →</button>
      </div>
    </div>

    <!-- Étape 2 : Séances + Exercices + Séries -->
    <div v-if="etape === 2" class="etape">
      <div class="etape-header">
        <h2>{{ programme.nom }}</h2>
        <button @click="terminer">✓ Terminer</button>
      </div>

      <!-- Séances existantes -->
      <div v-for="seance in seances" :key="seance.id" class="seance-block">
        <div class="seance-head">
          <span class="badge badge-purple" v-if="seance.jour">{{ seance.jour }}</span>
          <span class="seance-nom">{{ seance.nom }}</span>
          <button class="btn-icon btn-danger" @click="supprimerSeance(seance)" title="Supprimer la séance">
            <i class="ti ti-trash"></i>
          </button>
        </div>

        <!-- Exercices de cette séance -->
        <div v-for="exercice in seance.exercices" :key="exercice.id" class="exercice-block">
          <div class="exercice-head">
            <span class="exo-num">{{ exercice.ordre }}</span>
            <span class="exo-nom">{{ exercice.nom }}</span>
            <span v-if="exercice.groupe" class="tag">Groupe {{ exercice.groupe }}</span>
            <button class="btn-icon btn-danger" @click="supprimerExercice(seance, exercice)" title="Supprimer">
              <i class="ti ti-trash"></i>
            </button>
          </div>

          <!-- Modèle de génération -->
          <div v-if="exercice.series.length === 0" class="modele-form">
            <div class="modele-hint">
              Reps : <code>5</code> ou <code>3+3</code> · Charge : <code>100kg</code> ou <code>BW</code> · RM : <code>80%</code> · Tempo : <code>3010</code> ou <code>X020</code> · Repos : <code>3min</code> ou <code>90s</code>
            </div>
            <div class="modele-grid">
              <div class="field">
                <label>Séries</label>
                <input v-model.number="exercice._modele.nb_series" type="number" min="1" placeholder="4" />
              </div>
              <div class="field">
                <label>Reps</label>
                <input v-model="exercice._modele.nb_reps" placeholder="ex: 5" />
              </div>
              <div class="field">
                <label>Charge</label>
                <input v-model="exercice._modele.poids_cible" placeholder="ex: 100kg" />
              </div>
              <div class="field">
                <label>% RM</label>
                <input v-model="exercice._modele.rm" placeholder="ex: 80%" />
              </div>
              <div class="field">
                <label>Tempo</label>
                <input v-model="exercice._modele.tempo" placeholder="ex: 3010" />
              </div>
              <div class="field">
                <label>Repos</label>
                <input v-model="exercice._modele.repos" placeholder="ex: 3min" />
              </div>
            </div>
            <button @click="genererSeries(exercice)" :disabled="exercice._modele.nb_series < 1">
              Générer {{ exercice._modele.nb_series || '?' }} séries
            </button>
          </div>

          <!-- Tableau séries éditables -->
          <div v-if="exercice.series.length > 0" class="series-table">
            <div class="series-header">
              <span>#</span>
              <span>Reps</span>
              <span>Charge</span>
              <span>% RM</span>
              <span>Tempo</span>
              <span>Repos</span>
              <span></span>
            </div>
            <div v-for="(serie, idx) in exercice.series" :key="serie.id" class="serie-row">
              <span class="serie-num">{{ idx + 1 }}</span>
              <input v-model="serie.nb_reps" @change="mettreAJourSerie(serie)" placeholder="–" />
              <input v-model="serie.poids_cible" @change="mettreAJourSerie(serie)" placeholder="–" />
              <input v-model="serie.rm" @change="mettreAJourSerie(serie)" placeholder="–" />
              <input v-model="serie.tempo" @change="mettreAJourSerie(serie)" placeholder="–" />
              <input v-model="serie.temps_repos" @change="mettreAJourSerie(serie)" placeholder="–" />
              <button class="btn-icon btn-danger" @click="supprimerSerie(exercice, serie)">
                <i class="ti ti-trash"></i>
              </button>
            </div>
            <button class="btn-secondary btn-sm" @click="resetSeries(exercice)">↺ Réinitialiser</button>
          </div>
        </div>

        <!-- Formulaire ajout exercice -->
        <div class="add-exercice-form">
          <input v-model.number="seance._nouvelExercice.ordre" type="number" placeholder="Ordre" class="input-sm" />
          <input v-model="seance._nouvelExercice.nom" placeholder="Nom de l'exercice" class="input-flex" />
          <input v-model.number="seance._nouvelExercice.groupe" type="number" placeholder="Groupe" class="input-sm" />
          <button
            class="btn-secondary"
            @click="ajouterExercice(seance)"
            :disabled="!seance._nouvelExercice.nom || !seance._nouvelExercice.ordre"
          >
            + Exercice
          </button>
        </div>
      </div>

      <!-- Formulaire ajout séance -->
      <div class="add-seance-form">
        <input v-model="nouvelleSeance.nom" placeholder="Nom de la séance (ex: Push A)" class="input-flex" />
        <select v-model="nouvelleSeance.jour">
          <option value="">Jour (optionnel)</option>
          <option v-for="j in jours" :key="j" :value="j">{{ j }}</option>
        </select>
        <button @click="ajouterSeance" :disabled="!nouvelleSeance.nom">+ Séance</button>
      </div>

      <div class="actions">
        <button class="btn-secondary" @click="$emit('termine')">← Retour au dashboard</button>
        <button @click="terminer">✓ Terminer</button>
      </div>
    </div>

  </div>
</template>

<script>
import { ref } from 'vue'
import { useApi } from '../../services/api'

export default {
  emits: ['termine'],
  setup(_, { emit }) {
    const api = useApi()
    const etape = ref(1)
    const jours = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']

    const programme = ref({ nom: '', description: '', id: null })
    const seances = ref([])
    const nouvelleSeance = ref({ nom: '', jour: '' })

    const creerProgramme = async () => {
      const data = await api.post('/programmes/', {
        nom: programme.value.nom,
        description: programme.value.description || null
      })
      programme.value.id = data.id
      etape.value = 2
    }

    const ajouterSeance = async () => {
      const data = await api.post(`/programmes/${programme.value.id}/seances/`, {
        nom: nouvelleSeance.value.nom,
        ordre: seances.value.length + 1,
        jour: nouvelleSeance.value.jour || null
      })
      seances.value.push({
        ...data,
        exercices: [],
        _nouvelExercice: { nom: '', ordre: 1, groupe: null }
      })
      nouvelleSeance.value = { nom: '', jour: '' }
    }

    const supprimerSeance = async (seance) => {
      await api.del(`/seances/${seance.id}`)
      seances.value = seances.value.filter(s => s.id !== seance.id)
    }

    const ajouterExercice = async (seance) => {
      const data = await api.post(`/seances/${seance.id}/exercices/`, {
        nom: seance._nouvelExercice.nom,
        ordre: seance._nouvelExercice.ordre,
        groupe: seance._nouvelExercice.groupe || null
      })
      seance.exercices.push({
        ...data,
        series: [],
        _modele: { nb_series: 4, nb_reps: '', poids_cible: '', rm: '', tempo: '', repos: '' }
      })
      seance._nouvelExercice = { nom: '', ordre: seance.exercices.length + 1, groupe: null }
    }

    const supprimerExercice = async (seance, exercice) => {
      await api.del(`/exercices/${exercice.id}`)
      seance.exercices = seance.exercices.filter(e => e.id !== exercice.id)
    }

    const genererSeries = async (exercice) => {
      const m = exercice._modele
      for (let i = 0; i < m.nb_series; i++) {
        const data = await api.post(`/exercices/${exercice.id}/series/`, {
          nb_reps: m.nb_reps || null,
          poids_cible: m.poids_cible || null,
          rm: m.rm || null,
          tempo: m.tempo || null,
          temps_repos: m.repos || null
        })
        exercice.series.push({
          ...data,
          nb_reps: m.nb_reps,
          poids_cible: m.poids_cible,
          rm: m.rm,
          tempo: m.tempo,
          temps_repos: m.repos
        })
      }
    }

    const mettreAJourSerie = async (serie) => {
      await api.patch(`/series/${serie.id}`, {
        nb_reps: serie.nb_reps || null,
        poids_cible: serie.poids_cible || null,
        rm: serie.rm || null,
        tempo: serie.tempo || null,
        temps_repos: serie.temps_repos || null
      })
    }

    const supprimerSerie = async (exercice, serie) => {
      await api.del(`/series/${serie.id}`)
      exercice.series = exercice.series.filter(s => s.id !== serie.id)
    }

    const resetSeries = (exercice) => {
      exercice.series = []
      exercice._modele = { nb_series: 4, nb_reps: '', poids_cible: '', rm: '', tempo: '', repos: '' }
    }

    const terminer = () => emit('termine')

    return {
      etape, jours, programme, seances, nouvelleSeance,
      creerProgramme, ajouterSeance, supprimerSeance,
      ajouterExercice, supprimerExercice,
      genererSeries, mettreAJourSerie, supprimerSerie, resetSeries,
      terminer
    }
  }
}
</script>

<style scoped>
.form-wrapper { width: 100%; height: 100%; padding: 20px 24px; display: flex; flex-direction: column; gap: 16px; overflow-y: auto; box-sizing: border-box; }
.etape { display: flex; flex-direction: column; gap: 16px; }
.etape-header { display: flex; justify-content: space-between; align-items: center; }
h2 { font-size: 16px; font-weight: 500; margin: 0; }
input, select { padding: 7px 10px; border: 1px solid #e5e7eb; border-radius: 6px; font-size: 13px; background: white; box-sizing: border-box; }
input:focus { outline: none; border-color: #7F77DD; }
button { padding: 7px 14px; background: #7F77DD; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 13px; white-space: nowrap; }
button:disabled { opacity: 0.4; cursor: not-allowed; }
button:hover:not(:disabled) { background: #534AB7; }
.btn-secondary { background: #f3f4f6; color: #374151; border: 1px solid #e5e7eb; }
.btn-secondary:hover:not(:disabled) { background: #e5e7eb; }
.btn-sm { font-size: 12px; padding: 4px 10px; }
.btn-icon { width: 28px; height: 28px; padding: 0; display: inline-flex; align-items: center; justify-content: center; border-radius: 6px; flex-shrink: 0; }
.btn-danger { background: #fee2e2; color: #dc2626; border: 1px solid #fca5a5; }
.btn-danger:hover { background: #fecaca; }
.seance-block { border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; display: flex; flex-direction: column; gap: 12px; }
.seance-head { display: flex; align-items: center; gap: 8px; }
.seance-nom { font-size: 14px; font-weight: 500; flex: 1; }
.exercice-block { background: #f9fafb; border-radius: 6px; padding: 12px; display: flex; flex-direction: column; gap: 10px; border: 1px solid #e5e7eb; }
.exercice-head { display: flex; align-items: center; gap: 8px; }
.exo-num { width: 20px; height: 20px; border-radius: 4px; background: #EEEDFE; color: #534AB7; font-size: 11px; font-weight: 500; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.exo-nom { font-size: 13px; font-weight: 500; flex: 1; }
.modele-hint { font-size: 11px; color: #9ca3af; line-height: 1.6; }
.modele-hint code { background: #f3f4f6; padding: 1px 5px; border-radius: 3px; color: #534AB7; font-size: 11px; }
.modele-form { display: flex; flex-direction: column; gap: 10px; }
.modele-grid { display: grid; grid-template-columns: 80px repeat(5, 1fr); gap: 8px; }
.field { display: flex; flex-direction: column; gap: 4px; }
.field label { font-size: 11px; color: #6b7280; font-weight: 500; }
.field input { width: 100%; }
.series-table { display: flex; flex-direction: column; gap: 4px; }
.series-header { display: grid; grid-template-columns: 32px repeat(5, 1fr) 32px; gap: 6px; font-size: 11px; color: #6b7280; font-weight: 500; padding: 0 2px; }
.serie-row { display: grid; grid-template-columns: 32px repeat(5, 1fr) 32px; gap: 6px; align-items: center; }
.serie-num { font-size: 12px; color: #9ca3af; text-align: center; }
.serie-row input { padding: 5px 8px; font-size: 12px; width: 100%; }
.add-exercice-form { display: flex; gap: 8px; align-items: center; padding-top: 8px; border-top: 1px solid #e5e7eb; }
.add-seance-form { display: flex; gap: 8px; align-items: center; padding: 12px 16px; background: #f9fafb; border: 1px dashed #e5e7eb; border-radius: 8px; }
.input-sm { width: 70px; flex-shrink: 0; }
.input-flex { flex: 1; min-width: 0; }
.tag { font-size: 11px; background: #EEEDFE; color: #3C3489; padding: 2px 8px; border-radius: 12px; }
.badge { display: inline-flex; font-size: 11px; padding: 2px 8px; border-radius: 20px; }
.badge-purple { background: #EEEDFE; color: #3C3489; }
.actions { display: flex; gap: 8px; justify-content: space-between; margin-top: 4px; }
</style>