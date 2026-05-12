<template>
  <div class="form-wrapper">

    <!-- Étape 1 : Programme -->
    <div v-if="etape === 1">
      <h2>Nouveau programme</h2>
      <input v-model="programme.nom" placeholder="Nom du programme" />
      <input v-model="programme.description" placeholder="Description (optionnelle)" />
      <button @click="creerProgramme" :disabled="!programme.nom">Créer et continuer →</button>
    </div>

    <!-- Étape 2 : Séances -->
    <div v-if="etape === 2">
      <h2>{{ programme.nom }} — Séances</h2>

      <div class="seance-form">
        <input v-model="nouvelleSeance.nom" placeholder="Nom de la séance (ex: Push A)" />
        <select v-model="nouvelleSeance.jour">
          <option value="">Jour (optionnel)</option>
          <option v-for="j in jours" :key="j" :value="j">{{ j }}</option>
        </select>
        <button @click="ajouterSeance" :disabled="!nouvelleSeance.nom">+ Ajouter séance</button>
      </div>

      <div v-for="seance in seances" :key="seance.id" class="seance-item">
        <span>{{ seance.nom }}</span>
        <span v-if="seance.jour" class="tag">{{ seance.jour }}</span>
      </div>

      <div class="actions">
        <button class="secondary" @click="etape = 1">← Retour</button>
        <button @click="etape = 3" :disabled="seances.length === 0">Continuer →</button>
      </div>
    </div>

    <!-- Étape 3 : Exercices + Séries -->
    <div v-if="etape === 3">
      <h2>{{ programme.nom }} — Exercices</h2>

      <div v-for="seance in seances" :key="seance.id" class="seance-block">
        <h3>{{ seance.nom }} <span v-if="seance.jour" class="tag">{{ seance.jour }}</span></h3>

        <!-- Exercices existants -->
        <div v-for="exercice in seance.exercices" :key="exercice.id" class="exercice-block">
          <div class="exercice-header">
            <strong>{{ exercice.ordre }}. {{ exercice.nom }}</strong>
            <span v-if="exercice.groupe" class="tag">Groupe {{ exercice.groupe }}</span>
          </div>

          <!-- Séries de cet exercice -->
          <div v-for="serie in exercice.series" :key="serie.id" class="serie-item">
            <span>{{ serie.nb_reps }} reps</span>
            <span v-if="serie.poids_cible">{{ serie.poids_cible }} kg</span>
            <span v-if="serie.rm">{{ serie.rm }}% RM</span>
            <span v-if="serie.tempo">Tempo {{ serie.tempo }}</span>
            <span v-if="serie.temps_repos">{{ serie.temps_repos }}s repos</span>
          </div>

          <!-- Formulaire nouvelle série -->
          <div class="serie-form">
            <input v-model.number="exercice._nouvelleSerie.nb_reps" type="number" placeholder="Reps *" />
            <input v-model.number="exercice._nouvelleSerie.poids_cible" type="number" placeholder="Poids (kg)" />
            <input v-model.number="exercice._nouvelleSerie.rm" type="number" placeholder="% RM" />
            <input v-model="exercice._nouvelleSerie.tempo" placeholder="Tempo (ex: 3-1-2-0)" />
            <input v-model.number="exercice._nouvelleSerie.temps_repos" type="number" placeholder="Repos (sec)" />
            <button @click="ajouterSerie(seance, exercice)" :disabled="!exercice._nouvelleSerie.nb_reps">
              + Série
            </button>
          </div>
        </div>

        <!-- Formulaire nouvel exercice -->
        <div class="exercice-form">
          <input v-model.number="seance._nouvelExercice.ordre" type="number" placeholder="Ordre *" />
          <input v-model="seance._nouvelExercice.nom" placeholder="Nom de l'exercice *" />
          <input v-model.number="seance._nouvelExercice.groupe" type="number" placeholder="Groupe superset (optionnel)" />
          <button
            @click="ajouterExercice(seance)"
            :disabled="!seance._nouvelExercice.nom || !seance._nouvelExercice.ordre"
          >
            + Exercice
          </button>
        </div>
      </div>

      <div class="actions">
        <button class="secondary" @click="etape = 2">← Retour</button>
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

    const ajouterExercice = async (seance) => {
      const data = await api.post(`/seances/${seance.id}/exercices/`, {
        nom: seance._nouvelExercice.nom,
        ordre: seance._nouvelExercice.ordre,
        groupe: seance._nouvelExercice.groupe || null
      })
      seance.exercices.push({
        ...data,
        series: [],
        _nouvelleSerie: { nb_reps: null, poids_cible: null, rm: null, tempo: '', temps_repos: null }
      })
      seance._nouvelExercice = { nom: '', ordre: seance.exercices.length + 1, groupe: null }
    }

    const ajouterSerie = async (seance, exercice) => {
      const s = exercice._nouvelleSerie
      const data = await api.post(`/exercices/${exercice.id}/series/`, {
        nb_reps: s.nb_reps,
        poids_cible: s.poids_cible || null,
        rm: s.rm || null,
        tempo: s.tempo || null,
        temps_repos: s.temps_repos || null
      })
      exercice.series.push(data)
      exercice._nouvelleSerie = { nb_reps: null, poids_cible: null, rm: null, tempo: '', temps_repos: null }
    }

    const terminer = () => {
      emit('termine')
    }

    return {
      etape, jours, programme, seances, nouvelleSeance,
      creerProgramme, ajouterSeance, ajouterExercice, ajouterSerie, terminer
    }
  }
}
</script>

<style scoped>
.form-wrapper { max-width: 700px; margin: 0 auto; padding: 20px; display: flex; flex-direction: column; gap: 16px; }
input, select { padding: 8px 12px; border: 1px solid #ccc; border-radius: 6px; font-size: 14px; }
button { padding: 8px 16px; background: #2563eb; color: white; border: none; border-radius: 6px; cursor: pointer; }
button:disabled { opacity: 0.4; cursor: not-allowed; }
button.secondary { background: #6b7280; }
.seance-form, .exercice-form, .serie-form { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; margin: 8px 0; }
.seance-item { display: flex; gap: 8px; align-items: center; padding: 8px; background: #f3f4f6; border-radius: 6px; }
.seance-block { border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; display: flex; flex-direction: column; gap: 12px; }
.exercice-block { background: #f9fafb; border-radius: 6px; padding: 12px; display: flex; flex-direction: column; gap: 8px; }
.exercice-header { display: flex; gap: 8px; align-items: center; }
.serie-item { display: flex; gap: 12px; font-size: 13px; color: #374151; padding: 4px 0; border-bottom: 1px solid #e5e7eb; }
.tag { font-size: 12px; background: #dbeafe; color: #1d4ed8; padding: 2px 8px; border-radius: 12px; }
.actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 8px; }
</style>