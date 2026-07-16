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

      <div
        v-for="seance in seances"
        :key="seance.id"
        class="seance-block"
        :class="`type-${seance.type_seance || 'musculation'}`"
      >
        <div class="seance-head">
          <span class="type-badge" :class="`type-badge-${seance.type_seance || 'musculation'}`">
            {{ labelType(seance.type_seance) }}
          </span>
          <span class="badge badge-purple" v-if="seance.jour">{{ seance.jour }}</span>
          <span class="seance-nom">{{ seance.nom }}</span>
          <button class="btn-icon btn-danger" @click="supprimerSeance(seance)" title="Supprimer">
            <i class="ti ti-trash"></i>
          </button>
        </div>

        <div
          v-for="groupe in seance._groupes"
          :key="groupe.id"
          class="exo-group"
          :class="{ 'is-superset': groupe.exercices.length > 1 }"
        >
          <div v-if="groupe.exercices.length > 1" class="superset-banner">
            <i class="ti ti-link"></i>
            <span>Superset/Biset · {{ groupe.exercices.length }} exercices</span>
          </div>

          <!-- Pour chaque exo du groupe : nom + ses propres champs -->
          <div v-if="!groupe.hasSeries" class="exo-config-list">
            <div v-for="(exo, eidx) in groupe.exercices" :key="exo.id" class="exo-config" :class="{ 'is-optionnel': exo.optionnel }">
              <div class="exo-head">
                <span class="exo-letter" v-if="groupe.exercices.length > 1">{{ letterFor(eidx) }}</span>
                <span class="exo-num" v-else>{{ exo.ordre }}</span>
                <span class="exo-nom">{{ exo.nom }}</span>
                <label class="optionnel-check">
                  <input type="checkbox" v-model="exo.optionnel" @change="toggleOptionnel(exo)" />
                  Optionnelle
                </label>
                <button class="btn-icon btn-danger" @click="supprimerExercice(seance, groupe, exo)">
                  <i class="ti ti-trash"></i>
                </button>
              </div>

              <!-- Champs spécifiques selon le type -->
              <template v-if="seance.type_seance === 'musculation' || !seance.type_seance">
                <div class="exo-fields grid-muscu">
                  <div class="field"><label>Reps</label><input v-model="exo._params.nb_reps" placeholder="ex: 5" /></div>
                  <div class="field"><label>Charge</label><input v-model="exo._params.poids_cible" placeholder="ex: 100kg" /></div>
                  <div class="field"><label>% RM</label><input v-model="exo._params.rm" placeholder="ex: 80%" /></div>
                  <div class="field"><label>Tempo</label><input v-model="exo._params.tempo" placeholder="ex: 3010" /></div>
                </div>
              </template>

              <template v-else-if="seance.type_seance === 'natation' || seance.type_seance === 'athletisme'">
                <div class="exo-fields grid-nat-edit">
                  <div class="field"><label>Mètres</label><input v-model="exo._params.metres" placeholder="ex: 100" /></div>
                  <div class="field"><label>Intensité</label><input v-model="exo._params.intensite" placeholder="ex: rapide" /></div>
                </div>
              </template>

              <template v-else-if="seance.type_seance === 'pliometrie'">
                <div class="exo-fields grid-plio-edit">
                  <div class="field"><label>Bonds</label><input v-model="exo._params.bonds" placeholder="ex: 10" /></div>
                  <div class="field"><label>Intensité</label><input v-model="exo._params.intensite" placeholder="ex: max" /></div>
                </div>
              </template>
            </div>

            <!-- Bouton + Superset -->
            <button
              v-if="!groupe._formOpen"
              class="btn-secondary btn-sm btn-superset"
              @click="groupe._formOpen = true"
            >
              <i class="ti ti-link"></i> Ajouter un superset à ce groupe
            </button>

            <div v-if="groupe._formOpen" class="add-exo-form">
              <input v-model="groupe._nouvelExoNom" placeholder="Nom de l'exercice à enchaîner" class="input-flex" />
              <button @click="ajouterAuSuperset(seance, groupe)" :disabled="!groupe._nouvelExoNom">+ Ajouter</button>
              <button class="btn-secondary" @click="groupe._formOpen = false">Annuler</button>
            </div>

            <!-- Paramètres communs au groupe : nb_series + repos -->
            <div class="groupe-commun">
              <div class="field" style="width:90px">
                <label>Nb séries</label>
                <input v-model.number="groupe._nb_series" type="number" min="1" placeholder="4" />
              </div>
              <div class="field" style="flex:1">
                <label>Repos (commun)</label>
                <input v-model="groupe._temps_repos" placeholder="ex: 1min30" />
              </div>
              <button @click="genererSeriesGroupe(groupe, seance)" :disabled="groupe._nb_series < 1">
                Générer {{ groupe._nb_series || '?' }} séries
              </button>
            </div>
          </div>

          <!-- Affichage des séries générées (modifiables individuellement) -->
          <div v-if="groupe.hasSeries" class="series-display">
            <div class="series-summary">
              <span class="series-count">{{ groupe.exercices[0].series.length }} séries</span>
              <span v-if="groupe.exercices[0].series[0]?.temps_repos">
                · repos {{ groupe.exercices[0].series[0].temps_repos }}
              </span>
            </div>

            <div v-for="serieIdx in groupe.exercices[0].series.length" :key="serieIdx" class="serie-group-row">
              <div class="serie-label">Série {{ serieIdx }}</div>
              <div class="serie-exos">
                <div v-for="(exo, eidx) in groupe.exercices" :key="exo.id" class="serie-exo">
                  <span class="exo-letter-mini" v-if="groupe.exercices.length > 1">{{ letterFor(eidx) }}</span>
                  <strong :class="{ 'is-optionnel': exo.optionnel }">{{ exo.nom }}</strong>
                  <span v-if="exo.optionnel" class="optionnel-badge">optionnelle</span>

                  <template v-if="seance.type_seance === 'musculation' || !seance.type_seance">
                    <input v-model="exo.series[serieIdx-1].nb_reps" @change="mettreAJourSerie(exo.series[serieIdx-1])" placeholder="reps" class="mini-input" />
                    <input v-model="exo.series[serieIdx-1].poids_cible" @change="mettreAJourSerie(exo.series[serieIdx-1])" placeholder="charge" class="mini-input" />
                  </template>
                  <template v-else-if="seance.type_seance === 'natation' || seance.type_seance === 'athletisme'">
                    <input v-model="exo.series[serieIdx-1].metres" @change="mettreAJourSerie(exo.series[serieIdx-1])" placeholder="mètres" class="mini-input" />
                    <input v-model="exo.series[serieIdx-1].intensite" @change="mettreAJourSerie(exo.series[serieIdx-1])" placeholder="intensité" class="mini-input" />
                  </template>
                  <template v-else-if="seance.type_seance === 'pliometrie'">
                    <input v-model="exo.series[serieIdx-1].bonds" @change="mettreAJourSerie(exo.series[serieIdx-1])" placeholder="bonds" class="mini-input" />
                    <input v-model="exo.series[serieIdx-1].intensite" @change="mettreAJourSerie(exo.series[serieIdx-1])" placeholder="intensité" class="mini-input" />
                  </template>
                </div>
              </div>
            </div>

            <button class="btn-secondary btn-sm" @click="resetSeriesGroupe(seance, groupe)">↺ Réinitialiser</button>
          </div>
        </div>

        <div class="add-exercice-form">
          <input v-model="seance._nouvelExercice.nom" placeholder="Nom du nouvel exercice" class="input-flex" />
          <button class="btn-secondary" @click="ajouterExercice(seance)" :disabled="!seance._nouvelExercice.nom">
            + Exercice
          </button>
        </div>
      </div>

      <div class="add-seance-form">
        <input v-model="nouvelleSeance.nom" placeholder="Nom de la séance" class="input-flex" />
        <select v-model="nouvelleSeance.type_seance">
          <option value="musculation">Musculation</option>
          <option value="natation">Natation</option>
          <option value="athletisme">Athlétisme</option>
          <option value="pliometrie">Pliométrie</option>
        </select>
        <select v-model="nouvelleSeance.jour">
          <option value="">Jour</option>
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
    const nouvelleSeance = ref({ nom: '', jour: '', type_seance: 'musculation' })

    const labelType = (t) => {
      const map = { musculation: 'Musculation', natation: 'Natation', athletisme: 'Athlétisme', pliometrie: 'Pliométrie' }
      return map[t] || 'Musculation'
    }

    const letterFor = (idx) => String.fromCharCode(65 + idx)

    const paramsVides = () => ({
      nb_reps: '', poids_cible: '', rm: '', tempo: '',
      metres: '', bonds: '', intensite: ''
    })

    const nouveauGroupe = (exo) => ({
      id: `g_${exo.id}_${Date.now()}`,
      groupeNum: null,
      exercices: [exo],
      hasSeries: false,
      _nb_series: 4,
      _temps_repos: '',
      _formOpen: false,
      _nouvelExoNom: ''
    })

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
        jour: nouvelleSeance.value.jour || null,
        semaine: 1,
        type_seance: nouvelleSeance.value.type_seance
      })
      seances.value.push({
        ...data,
        exercices: [],
        _groupes: [],
        _nouvelExercice: { nom: '' }
      })
      nouvelleSeance.value = { nom: '', jour: '', type_seance: 'musculation' }
    }

    const supprimerSeance = async (seance) => {
      if (!confirm(`Supprimer la séance "${seance.nom}" ?`)) return
      await api.del(`/seances/${seance.id}`)
      seances.value = seances.value.filter(s => s.id !== seance.id)
    }

    const ajouterExercice = async (seance) => {
      const data = await api.post(`/seances/${seance.id}/exercices/`, {
        nom: seance._nouvelExercice.nom,
        ordre: seance.exercices.length + 1,
        groupe: null
      })
      const exo = { ...data, series: [], _params: paramsVides() }
      seance.exercices.push(exo)
      seance._groupes.push(nouveauGroupe(exo))
      seance._nouvelExercice = { nom: '' }
    }

    const ajouterAuSuperset = async (seance, groupe) => {
      if (!groupe.groupeNum) {
        const maxGroupe = Math.max(0, ...seance.exercices.map(e => e.groupe || 0))
        groupe.groupeNum = maxGroupe + 1
        const premierExo = groupe.exercices[0]
        await api.patch(`/exercices/${premierExo.id}`, {
          nom: premierExo.nom,
          ordre: premierExo.ordre,
          groupe: groupe.groupeNum,
          optionnel: premierExo.optionnel || false
        })
        premierExo.groupe = groupe.groupeNum
      }

      const data = await api.post(`/seances/${seance.id}/exercices/`, {
        nom: groupe._nouvelExoNom,
        ordre: seance.exercices.length + 1,
        groupe: groupe.groupeNum
      })
      const exo = { ...data, series: [], _params: paramsVides() }
      seance.exercices.push(exo)
      groupe.exercices.push(exo)
      groupe._nouvelExoNom = ''
      groupe._formOpen = false
    }

    const supprimerExercice = async (seance, groupe, exercice) => {
      if (!confirm(`Supprimer l'exercice "${exercice.nom}" ?`)) return
      await api.del(`/exercices/${exercice.id}`)
      seance.exercices = seance.exercices.filter(e => e.id !== exercice.id)
      groupe.exercices = groupe.exercices.filter(e => e.id !== exercice.id)
      if (groupe.exercices.length === 0) {
        seance._groupes = seance._groupes.filter(g => g.id !== groupe.id)
      }
    }

    const toggleOptionnel = async (exo) => {
      await api.patch(`/exercices/${exo.id}`, {
        nom: exo.nom,
        ordre: exo.ordre,
        groupe: exo.groupe || null,
        optionnel: exo.optionnel
      })
    }

    // Génère N séries en utilisant les params PROPRES de chaque exo + repos commun
    const genererSeriesGroupe = async (groupe, seance) => {
      const type = seance.type_seance || 'musculation'
      const tempsRepos = groupe._temps_repos || null

      const buildPayload = (params) => {
        if (type === 'musculation') {
          return {
            nb_reps: params.nb_reps || null,
            poids_cible: params.poids_cible || null,
            rm: params.rm || null,
            tempo: params.tempo || null,
            temps_repos: tempsRepos
          }
        }
        if (type === 'natation' || type === 'athletisme') {
          return {
            nb_series: '1',
            metres: params.metres || null,
            intensite: params.intensite || null,
            temps_repos: tempsRepos
          }
        }
        if (type === 'pliometrie') {
          return {
            nb_series: '1',
            bonds: params.bonds || null,
            intensite: params.intensite || null,
            temps_repos: tempsRepos
          }
        }
        return {}
      }

      // Pour chaque exo : on utilise SES PROPRES params
      for (const exo of groupe.exercices) {
        for (let i = 0; i < groupe._nb_series; i++) {
          const data = await api.post(`/exercices/${exo.id}/series/`, buildPayload(exo._params))
          exo.series.push(data)
        }
      }
      groupe.hasSeries = true
    }

    const mettreAJourSerie = async (serie) => {
      await api.patch(`/series/${serie.id}`, {
        nb_reps: serie.nb_reps || null,
        poids_cible: serie.poids_cible || null,
        rm: serie.rm || null,
        tempo: serie.tempo || null,
        metres: serie.metres || null,
        bonds: serie.bonds || null,
        nb_series: serie.nb_series || null,
        intensite: serie.intensite || null,
        temps_repos: serie.temps_repos || null
      })
    }

    const resetSeriesGroupe = async (seance, groupe) => {
      if (!confirm('Supprimer toutes les séries de ce groupe ?')) return
      for (const exo of groupe.exercices) {
        for (const serie of exo.series) {
          await api.del(`/series/${serie.id}`)
        }
        exo.series = []
        exo._params = paramsVides()
      }
      groupe.hasSeries = false
      groupe._nb_series = 4
      groupe._temps_repos = ''
    }

    const terminer = () => emit('termine')

    return {
      etape, jours, programme, seances, nouvelleSeance,
      labelType, letterFor,
      creerProgramme, ajouterSeance, supprimerSeance,
      ajouterExercice, ajouterAuSuperset, supprimerExercice,
      genererSeriesGroupe, mettreAJourSerie, resetSeriesGroupe,
      toggleOptionnel, terminer
    }
  }
}
</script>

<style scoped>
.form-wrapper { width: 100%; height: 100%; padding: var(--spacing-xl) var(--spacing-2xl); display: flex; flex-direction: column; gap: var(--spacing-lg); overflow-y: auto; box-sizing: border-box; }
.etape { display: flex; flex-direction: column; gap: var(--spacing-lg); }
.etape-header { display: flex; justify-content: space-between; align-items: center; }
h2 { font-size: var(--font-size-lg); font-weight: 500; margin: 0; }
input, select { padding: 7px 10px; border: 1px solid var(--color-border); border-radius: var(--radius-md); font-size: var(--font-size-md); background: var(--color-bg); box-sizing: border-box; }
input:focus { outline: none; border-color: var(--color-primary); }
button { padding: 7px 14px; background: var(--color-primary); color: var(--color-bg); border: none; border-radius: var(--radius-md); cursor: pointer; font-size: var(--font-size-md); white-space: nowrap; }
button:disabled { opacity: 0.4; cursor: not-allowed; }
button:hover:not(:disabled) { background: var(--color-primary-dark); }
.btn-secondary { background: var(--color-bg-tertiary); color: var(--color-text-body); border: 1px solid var(--color-border); }
.btn-secondary:hover:not(:disabled) { background: var(--color-border); }
.btn-sm { font-size: var(--font-size-sm); padding: 4px 10px; }
.btn-icon { width: 28px; height: 28px; padding: 0; display: inline-flex; align-items: center; justify-content: center; border-radius: var(--radius-md); flex-shrink: 0; }
.btn-danger { background: var(--color-danger-bg); color: var(--color-danger-text); border: 1px solid #fca5a5; }
.btn-danger:hover { background: #fecaca; }
.seance-block { border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: var(--spacing-lg); display: flex; flex-direction: column; gap: var(--spacing-md); border-left-width: 4px; }
.seance-block.type-musculation { border-left-color: var(--color-type-musculation-border); }
.seance-block.type-natation { border-left-color: var(--color-type-natation-border); }
.seance-block.type-athletisme { border-left-color: var(--color-type-athletisme-border); }
.seance-block.type-pliometrie { border-left-color: var(--color-type-pliometrie-border); }
.type-badge { display: inline-flex; align-items: center; font-size: var(--font-size-2xs); font-weight: 500; padding: 2px 8px; border-radius: var(--radius-full); }
.type-badge-musculation { background: var(--color-type-musculation-bg); color: var(--color-type-musculation-text); }
.type-badge-natation { background: var(--color-type-natation-bg); color: var(--color-type-natation-text); }
.type-badge-athletisme { background: var(--color-type-athletisme-bg); color: var(--color-type-athletisme-text); }
.type-badge-pliometrie { background: var(--color-type-pliometrie-bg); color: var(--color-type-pliometrie-text); }
.seance-head { display: flex; align-items: center; gap: var(--spacing-sm); }
.seance-nom { font-size: var(--font-size-base); font-weight: 500; flex: 1; }
.exo-group { display: flex; flex-direction: column; gap: 10px; padding: var(--spacing-md); background: var(--color-bg-secondary); border-radius: var(--radius-lg); border: 1px solid var(--color-border); }
.exo-group.is-superset { background: var(--color-superset-bg); border: 1px solid var(--color-superset-border); border-left: 3px solid var(--color-primary); }
.superset-banner { display: flex; align-items: center; gap: 6px; font-size: var(--font-size-xs); color: var(--color-superset-text); font-weight: 500; }
.exo-config-list { display: flex; flex-direction: column; gap: var(--spacing-sm); }
.exo-config { display: flex; flex-direction: column; gap: var(--spacing-sm); background: var(--color-bg); border-radius: var(--radius-md); padding: 10px; border: 1px solid var(--color-border); }
.exo-head { display: flex; align-items: center; gap: var(--spacing-sm); }
.exo-num, .exo-letter { width: 22px; height: 22px; border-radius: var(--radius-sm); background: var(--color-primary-light); color: var(--color-superset-text); font-size: var(--font-size-xs); font-weight: 600; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.exo-letter { background: var(--color-primary); color: var(--color-bg); }
.exo-nom { font-size: var(--font-size-md); font-weight: 500; flex: 1; }
.optionnel-check { display: inline-flex; align-items: center; gap: 4px; font-size: var(--font-size-xs); color: var(--color-text-secondary); cursor: pointer; white-space: nowrap; flex-shrink: 0; }
.optionnel-check input { width: auto; }
.exo-config.is-optionnel { background: var(--color-bg-tertiary); opacity: 0.75; }
.optionnel-badge { font-size: var(--font-size-2xs); font-weight: 500; color: var(--color-text-muted); background: var(--color-bg-tertiary); padding: 2px 6px; border-radius: var(--radius-full); text-transform: uppercase; letter-spacing: 0.3px; }
strong.is-optionnel { color: var(--color-text-muted); }
.exo-fields { display: grid; gap: var(--spacing-sm); }
.exo-fields.grid-muscu { grid-template-columns: repeat(4, 1fr); }
.exo-fields.grid-nat-edit, .exo-fields.grid-plio-edit { grid-template-columns: repeat(2, 1fr); }
.field { display: flex; flex-direction: column; gap: 4px; }
.field label { font-size: var(--font-size-xs); color: var(--color-text-secondary); font-weight: 500; }
.field input { width: 100%; }
.btn-superset { align-self: flex-start; }
.add-exo-form { display: flex; gap: var(--spacing-sm); align-items: center; padding: var(--spacing-sm); background: var(--color-bg); border-radius: var(--radius-md); border: 1px dashed var(--color-superset-border); }
.groupe-commun { display: flex; gap: var(--spacing-sm); align-items: flex-end; padding: var(--spacing-sm); background: var(--color-bg); border-radius: var(--radius-md); border: 1px solid var(--color-border); }
.series-display { display: flex; flex-direction: column; gap: var(--spacing-sm); }
.series-summary { font-size: var(--font-size-sm); color: var(--color-superset-text); font-weight: 500; padding-bottom: 4px; border-bottom: 1px solid var(--color-border); }
.series-count { font-weight: 600; }
.serie-group-row { display: flex; gap: var(--spacing-md); align-items: flex-start; padding: var(--spacing-sm); background: var(--color-bg); border-radius: var(--radius-md); border: 1px solid var(--color-border); }
.serie-label { font-size: var(--font-size-xs); font-weight: 600; color: var(--color-superset-text); padding: 4px 8px; background: var(--color-primary-light); border-radius: var(--radius-sm); white-space: nowrap; flex-shrink: 0; }
.serie-exos { display: flex; flex-direction: column; gap: 6px; flex: 1; }
.serie-exo { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.exo-letter-mini { font-size: var(--font-size-2xs); font-weight: 700; color: var(--color-bg); background: var(--color-primary); padding: 2px 6px; border-radius: var(--radius-sm); }
.serie-exo strong { font-size: var(--font-size-sm); min-width: 100px; }
.mini-input { padding: 4px 8px; font-size: var(--font-size-sm); width: 80px; border: 1px solid var(--color-border); border-radius: var(--radius-sm); }
.add-exercice-form { display: flex; gap: var(--spacing-sm); align-items: center; padding-top: var(--spacing-sm); border-top: 1px dashed var(--color-border); }
.add-seance-form { display: flex; gap: var(--spacing-sm); align-items: center; padding: var(--spacing-md) var(--spacing-lg); background: var(--color-bg-secondary); border: 1px dashed var(--color-border); border-radius: var(--radius-lg); flex-wrap: wrap; }
.input-flex { flex: 1; min-width: 0; }
.badge { display: inline-flex; font-size: var(--font-size-xs); padding: 2px 8px; border-radius: var(--radius-full); }
.badge-purple { background: var(--color-primary-light); color: var(--color-primary-text); }
.actions { display: flex; gap: var(--spacing-sm); justify-content: space-between; margin-top: 4px; }

@media (max-width: 768px) {
  .form-wrapper { padding: var(--spacing-md) var(--spacing-lg); }
  .exo-fields.grid-muscu { grid-template-columns: repeat(2, 1fr); }
}
</style>