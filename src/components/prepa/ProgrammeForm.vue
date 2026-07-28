<template>
  <div class="form-wrapper">

    <!-- Étape 1 : Programme -->
    <div v-if="etape === 1" class="etape etape-creation">
      <h2>Nouveau programme</h2>
      <div class="field">
        <label>Nom du programme</label>
        <input v-model="programme.nom" placeholder="ex: Préparation été 2026" />
      </div>
      <div class="field">
        <label>Description (optionnelle)</label>
        <input v-model="programme.description" placeholder="ex: Cycle force 6 semaines" />
      </div>
      <div class="actions">
        <button class="btn btn-secondary" @click="$emit('termine')">Annuler</button>
        <button class="btn btn-primary" @click="creerProgramme" :disabled="!programme.nom">Créer et continuer →</button>
      </div>
    </div>

    <!-- Étape 2 : Séances + Exercices + Séries -->
    <div v-if="etape === 2" class="etape">
      <div class="etape-header">
        <h2>{{ programme.nom }}</h2>
        <button class="btn btn-primary" @click="terminer">✓ Terminer</button>
      </div>

      <div
        v-for="seance in seances"
        :key="seance.id"
        class="seance-block"
      >
        <div class="seance-head">
          <span class="type-badge" :class="`type-badge-${seance.type_seance || 'musculation'}`">
            {{ labelType(seance.type_seance) }}
          </span>
          <span class="badge badge-purple" v-if="seance.jour">{{ seance.jour }}</span>
          <span class="seance-nom">{{ seance.nom }}</span>
          <button class="btn btn-sm btn-danger" @click="supprimerSeance(seance)" title="Supprimer">
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
                <ExerciceImage :src="exo.image_url" :src2="exo.image_url_2" :nom="exo.nom" size="md" />
                <span class="exo-nom">{{ exo.nom }}</span>
                <label class="optionnel-check">
                  <input type="checkbox" v-model="exo.optionnel" @change="toggleOptionnel(exo)" />
                  Optionnelle
                </label>
                <button class="btn btn-sm btn-danger" @click="supprimerExercice(seance, groupe, exo)">
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
                <div class="exo-fields grid-duo">
                  <div class="field"><label>Mètres</label><input v-model="exo._params.metres" placeholder="ex: 100" /></div>
                  <div class="field"><label>Intensité</label><input v-model="exo._params.intensite" placeholder="ex: rapide" /></div>
                </div>
              </template>

              <template v-else-if="seance.type_seance === 'pliometrie'">
                <div class="exo-fields grid-duo">
                  <div class="field"><label>Bonds</label><input v-model="exo._params.bonds" placeholder="ex: 10" /></div>
                  <div class="field"><label>Intensité</label><input v-model="exo._params.intensite" placeholder="ex: max" /></div>
                </div>
              </template>
            </div>

            <!-- Bouton + Superset -->
            <button
              v-if="!groupe._formOpen"
              class="btn btn-sm btn-secondary btn-superset"
              @click="groupe._formOpen = true"
            >
              <i class="ti ti-link"></i> Ajouter un superset à ce groupe
            </button>

            <div v-if="groupe._formOpen" class="add-exo-form">
              <ExerciceAutocomplete
                v-model="groupe._nouvelExoNom"
                placeholder="Nom de l'exercice à enchaîner"
                @select="item => groupe._nouvelExoCatalogueId = item?.id ?? null"
              />
              <button class="btn btn-sm btn-primary" @click="ajouterAuSuperset(seance, groupe)" :disabled="!groupe._nouvelExoNom">+ Ajouter</button>
              <button class="btn btn-sm btn-secondary" @click="groupe._formOpen = false">Annuler</button>
            </div>

            <!-- Paramètres communs au groupe : nb_series + repos -->
            <div class="groupe-commun">
              <div class="field field-nb">
                <label>Nb séries</label>
                <input v-model.number="groupe._nb_series" type="number" min="1" placeholder="4" />
              </div>
              <div class="field field-repos">
                <label>Repos (commun)</label>
                <input v-model="groupe._temps_repos" placeholder="ex: 1min30" />
              </div>
              <button class="btn btn-primary" @click="genererSeriesGroupe(groupe, seance)" :disabled="groupe._nb_series < 1">
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

            <button class="btn btn-sm btn-secondary btn-reset" @click="resetSeriesGroupe(seance, groupe)">↺ Réinitialiser</button>
          </div>
        </div>

        <div class="add-exercice-form">
          <ExerciceAutocomplete
            v-model="seance._nouvelExercice.nom"
            placeholder="Nom du nouvel exercice"
            @select="item => seance._nouvelExercice.catalogueId = item?.id ?? null"
          />
          <button class="btn btn-secondary" @click="ajouterExercice(seance)" :disabled="!seance._nouvelExercice.nom">
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
        <button class="btn btn-primary" @click="ajouterSeance" :disabled="!nouvelleSeance.nom">+ Séance</button>
      </div>

      <div class="actions">
        <button class="btn btn-secondary" @click="$emit('termine')">← Retour au dashboard</button>
        <button class="btn btn-primary" @click="terminer">✓ Terminer</button>
      </div>
    </div>

  </div>
</template>

<script>
import { ref } from 'vue'
import { useApi } from '../../services/api'
import ExerciceAutocomplete from './ExerciceAutocomplete.vue'
import ExerciceImage from '../ExerciceImage.vue'

export default {
  components: { ExerciceAutocomplete, ExerciceImage },
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
      _nouvelExoNom: '',
      _nouvelExoCatalogueId: null
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
        _nouvelExercice: { nom: '', catalogueId: null }
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
        groupe: null,
        catalogue_id: seance._nouvelExercice.catalogueId
      })
      const exo = { ...data, series: [], _params: paramsVides() }
      seance.exercices.push(exo)
      seance._groupes.push(nouveauGroupe(exo))
      seance._nouvelExercice = { nom: '', catalogueId: null }
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
          optionnel: premierExo.optionnel || false,
          catalogue_id: premierExo.catalogue_id
        })
        premierExo.groupe = groupe.groupeNum
      }

      const data = await api.post(`/seances/${seance.id}/exercices/`, {
        nom: groupe._nouvelExoNom,
        ordre: seance.exercices.length + 1,
        groupe: groupe.groupeNum,
        catalogue_id: groupe._nouvelExoCatalogueId
      })
      const exo = { ...data, series: [], _params: paramsVides() }
      seance.exercices.push(exo)
      groupe.exercices.push(exo)
      groupe._nouvelExoNom = ''
      groupe._nouvelExoCatalogueId = null
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
        optionnel: exo.optionnel,
        catalogue_id: exo.catalogue_id
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
.form-wrapper {
  width: 100%;
  height: 100%;
  padding: var(--spacing-xl) var(--spacing-2xl);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
  overflow-y: auto;
}
.etape { display: flex; flex-direction: column; gap: var(--spacing-lg); }
.etape-creation { max-width: 480px; }
.etape-header { display: flex; justify-content: space-between; align-items: center; gap: var(--spacing-md); flex-wrap: wrap; }
h2 { font-size: var(--font-size-xl); font-weight: 700; margin: 0; }

.seance-block {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  background: var(--color-bg);
}
.seance-head { display: flex; align-items: center; gap: var(--spacing-sm); flex-wrap: wrap; }
.seance-nom { font-size: var(--font-size-base); font-weight: 600; flex: 1; }

.exo-group {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  background: var(--color-bg-secondary);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
}
.exo-group.is-superset { background: var(--color-superset-bg); border: 1px solid var(--color-superset-border); border-left: 4px solid var(--color-primary); }
.superset-banner { display: flex; align-items: center; gap: 6px; font-size: var(--font-size-xs); color: var(--color-superset-text); font-weight: 600; }
.exo-config-list { display: flex; flex-direction: column; gap: var(--spacing-sm); }
.exo-config {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  background: var(--color-bg);
  border-radius: var(--radius-md);
  padding: var(--spacing-md);
  border: 1px solid var(--color-border);
}
.exo-config.is-optionnel { background: var(--color-bg-tertiary); }
.exo-head { display: flex; align-items: center; gap: var(--spacing-sm); flex-wrap: wrap; }
.exo-num, .exo-letter {
  width: 24px;
  height: 24px;
  border-radius: var(--radius-sm);
  background: var(--color-primary-light);
  color: var(--color-superset-text);
  font-size: var(--font-size-xs);
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.exo-letter { background: var(--color-primary); color: var(--color-on-primary); }
.exo-nom { font-size: var(--font-size-base); font-weight: 600; flex: 1; }
.optionnel-check {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: var(--tap-min);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
}
.optionnel-check input { width: 18px; height: 18px; }
.optionnel-badge {
  font-size: var(--font-size-xs);
  font-weight: 500;
  color: var(--color-text-secondary);
  background: var(--color-bg-tertiary);
  padding: 2px 8px;
  border-radius: var(--radius-full);
  text-transform: uppercase;
  letter-spacing: 0.3px;
}
strong.is-optionnel { color: var(--color-text-secondary); }

.exo-fields { display: grid; gap: var(--spacing-sm); }
.exo-fields.grid-muscu { grid-template-columns: repeat(4, 1fr); }
.exo-fields.grid-duo { grid-template-columns: repeat(2, 1fr); }

.btn-superset { align-self: flex-start; }
.btn-reset { align-self: flex-start; }
.add-exo-form {
  display: flex;
  gap: var(--spacing-sm);
  align-items: center;
  padding: var(--spacing-sm);
  background: var(--color-bg);
  border-radius: var(--radius-md);
  border: 1px dashed var(--color-superset-border);
  flex-wrap: wrap;
}
.groupe-commun {
  display: flex;
  gap: var(--spacing-md);
  align-items: flex-end;
  padding: var(--spacing-md);
  background: var(--color-bg);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  flex-wrap: wrap;
}
.field-nb { width: 100px; }
.field-repos { flex: 1; min-width: 140px; }

.series-display { display: flex; flex-direction: column; gap: var(--spacing-sm); }
.series-summary {
  font-size: var(--font-size-sm);
  color: var(--color-superset-text);
  font-weight: 600;
  padding-bottom: 4px;
  border-bottom: 1px solid var(--color-border);
}
.series-count { font-weight: 700; }
.serie-group-row {
  display: flex;
  gap: var(--spacing-md);
  align-items: flex-start;
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-bg);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
}
.serie-label {
  font-size: var(--font-size-xs);
  font-weight: 700;
  color: var(--color-superset-text);
  padding: 4px 8px;
  background: var(--color-primary-light);
  border-radius: var(--radius-sm);
  white-space: nowrap;
  flex-shrink: 0;
}
.serie-exos { display: flex; flex-direction: column; gap: 6px; flex: 1; min-width: 0; }
.serie-exo { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.exo-letter-mini {
  font-size: var(--font-size-xs);
  font-weight: 700;
  color: var(--color-on-primary);
  background: var(--color-primary);
  padding: 2px 8px;
  border-radius: var(--radius-sm);
}
.serie-exo strong { font-size: var(--font-size-sm); font-weight: 600; min-width: 100px; }

.mini-input {
  min-height: 40px;
  padding: 0 var(--spacing-sm);
  font-size: var(--font-size-base);
  width: 86px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-bg);
}
.mini-input:focus { outline: none; border-color: var(--color-primary); }

.add-exercice-form { display: flex; gap: var(--spacing-sm); align-items: center; padding-top: var(--spacing-sm); border-top: 1px dashed var(--color-border); flex-wrap: wrap; }
.add-seance-form {
  display: flex;
  gap: var(--spacing-sm);
  align-items: center;
  padding: var(--spacing-md) var(--spacing-lg);
  background: var(--color-bg-secondary);
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-lg);
  flex-wrap: wrap;
}
.add-seance-form select {
  min-height: var(--tap-min);
  padding: 0 var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  background: var(--color-bg);
}
.input-flex {
  flex: 1;
  min-width: 140px;
  min-height: var(--tap-min);
  padding: 0 var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--font-size-base);
  background: var(--color-bg);
}
.input-flex:focus { outline: none; border-color: var(--color-primary); }

.actions { display: flex; gap: var(--spacing-sm); justify-content: space-between; margin-top: 4px; flex-wrap: wrap; }

@media (max-width: 768px) {
  .form-wrapper { padding: var(--spacing-md) var(--spacing-lg); }
  .exo-fields.grid-muscu { grid-template-columns: repeat(2, 1fr); }
}
</style>
