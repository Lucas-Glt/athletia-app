<template>
  <div class="modal-overlay" @click.self="$emit('fermer')">
    <div class="modal modal-large">
      <div class="modal-header">
        <h3>Nouveau test</h3>
        <button class="modal-close" @click="$emit('fermer')"><i class="ti ti-x"></i></button>
      </div>

      <div class="modal-body">
        <!-- 1. Catégorie -->
        <div class="bloc">
          <div class="section-title">Catégorie</div>
          <div class="categorie-chips">
            <button
              v-for="c in CATEGORIES_TEST"
              :key="c.id"
              class="chip-filtre"
              :class="{ active: categorieId === c.id }"
              @click="choisirCategorie(c.id)"
            >
              <i class="ti" :class="c.icone"></i> {{ c.label }}
            </button>
          </div>
        </div>

        <!-- 2. Test précis -->
        <div class="bloc" v-if="categorieId">
          <div class="section-title">Test</div>
          <div class="test-chips">
            <button
              v-for="t in testsDeCategorie(categorieId)"
              :key="t.id"
              class="chip-filtre chip-test"
              :class="{ active: testId === t.id }"
              @click="testId = t.id"
            >
              {{ t.label }}
            </button>
          </div>
        </div>

        <!-- 3. Athlète, date, valeur, notes -->
        <template v-if="testChoisi">
          <div class="bloc">
            <div class="section-title">Athlète</div>
            <div class="athlete-chip-choisi" v-if="athleteChoisi">
              <div class="mini-av">{{ initiales(athleteChoisi.nom) }}</div>
              <div class="athlete-txt">
                <span class="athlete-nom">{{ athleteChoisi.nom }}</span>
                <span class="athlete-email" v-if="estSuperPrepa">{{ athleteChoisi.organisation?.nom || 'Indépendant' }}</span>
              </div>
              <button class="btn-icon-tiny" title="Changer d'athlète" @click="athleteChoisi = null"><i class="ti ti-x"></i></button>
            </div>
            <template v-else>
              <input
                v-model="rechercheAthlete"
                class="input-recherche-athlete"
                placeholder="Rechercher un athlète par nom..."
                autocomplete="off"
              />
              <div class="suggestions-athletes" v-if="suggestionsAthletes.length > 0">
                <button
                  v-for="a in suggestionsAthletes"
                  :key="a.id"
                  class="athlete-row suggestion"
                  @click="selectionnerAthlete(a)"
                >
                  <div class="mini-av">{{ initiales(a.nom) }}</div>
                  <div class="athlete-txt">
                    <span class="athlete-nom">{{ a.nom }}</span>
                    <span class="athlete-email" v-if="estSuperPrepa">{{ a.organisation?.nom || 'Indépendant' }}</span>
                  </div>
                </button>
              </div>
              <div class="empty-inline" v-else-if="rechercheAthlete">Aucun athlète trouvé.</div>
            </template>
          </div>

          <div class="bloc champs-resultat">
            <div class="field">
              <label>Date</label>
              <input v-model="date" type="date" />
            </div>
            <div class="field">
              <label>Résultat ({{ testChoisi.unite }})</label>
              <input v-model="valeur" type="number" step="any" :placeholder="`ex: 12.5`" />
            </div>
            <div class="field field-notes">
              <label>Notes (optionnel)</label>
              <input v-model="notes" placeholder="ex: sous fatigue, 2e tentative..." />
            </div>
          </div>

          <div v-if="erreur" class="error">{{ erreur }}</div>
        </template>
      </div>

      <div class="modal-footer" v-if="testChoisi">
        <button class="btn btn-secondary" @click="$emit('fermer')">Annuler</button>
        <button class="btn btn-primary" :disabled="!peutEnregistrer || enCours" @click="enregistrer">
          Enregistrer
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed } from 'vue'
import { useApi } from '../../services/api'
import { useAuthStore } from '../../stores/auth'
import { CATEGORIES_TEST, testsDeCategorie, testDe } from '../../data/catalogueTests'

const aujourdhui = () => new Date().toISOString().slice(0, 10)

export default {
  emits: ['fermer', 'cree'],
  props: {
    monCercle: { type: Array, default: () => [] }
  },
  setup(props, { emit }) {
    const api = useApi()
    const authStore = useAuthStore()
    const estSuperPrepa = computed(() => authStore.role === 'super_prepa')

    const categorieId = ref(null)
    const testId = ref(null)
    const athleteChoisi = ref(null)
    const rechercheAthlete = ref('')
    const date = ref(aujourdhui())
    const valeur = ref('')
    const notes = ref('')
    const erreur = ref('')
    const enCours = ref(false)

    const testChoisi = computed(() => (testId.value ? testDe(testId.value) : null))

    const choisirCategorie = (id) => {
      categorieId.value = id
      testId.value = null
    }

    const suggestionsAthletes = computed(() => {
      const q = rechercheAthlete.value.trim().toLowerCase()
      if (!q) return []
      return props.monCercle.filter((a) => a.nom.toLowerCase().includes(q)).slice(0, 8)
    })

    const selectionnerAthlete = (a) => {
      athleteChoisi.value = a
      rechercheAthlete.value = ''
    }

    const initiales = (nom) => nom.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)

    const peutEnregistrer = computed(() =>
      !!(athleteChoisi.value && date.value && valeur.value !== '' && !isNaN(parseFloat(valeur.value)))
    )

    const enregistrer = async () => {
      if (!peutEnregistrer.value) return
      erreur.value = ''
      enCours.value = true
      try {
        await api.post('/tests/', {
          athlete_id: athleteChoisi.value.id,
          categorie: categorieId.value,
          type_test: testId.value,
          valeur: parseFloat(valeur.value),
          unite: testChoisi.value.unite,
          date: date.value,
          notes: notes.value || null
        })
        emit('cree')
        emit('fermer')
      } catch {
        erreur.value = "Erreur lors de l'enregistrement du test."
      } finally {
        enCours.value = false
      }
    }

    return {
      CATEGORIES_TEST, testsDeCategorie,
      categorieId, testId, testChoisi, choisirCategorie,
      athleteChoisi, rechercheAthlete, suggestionsAthletes, selectionnerAthlete,
      date, valeur, notes, erreur, enCours, peutEnregistrer, enregistrer,
      estSuperPrepa, initiales
    }
  }
}
</script>

<style scoped>
.modal-large { max-width: 560px; }
.bloc { display: flex; flex-direction: column; gap: var(--spacing-sm); }

.categorie-chips, .test-chips { display: flex; gap: 6px; flex-wrap: wrap; }
.chip-filtre {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 36px;
  padding: 0 var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  font-size: var(--font-size-sm);
  background: var(--color-bg);
  color: var(--color-text-secondary);
  cursor: pointer;
}
.chip-filtre:hover { border-color: var(--color-primary); }
.chip-filtre.active { background: var(--color-primary-light); border-color: var(--color-primary); color: var(--color-primary-text); font-weight: 600; }
.chip-test { border-radius: var(--radius-md); }

.input-recherche-athlete {
  min-height: var(--tap-min);
  padding: 0 var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--font-size-base);
  background: var(--color-bg);
}
.input-recherche-athlete:focus { outline: none; border-color: var(--color-primary); }

.suggestions-athletes { display: flex; flex-direction: column; gap: 4px; max-height: 220px; overflow-y: auto; }
.athlete-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-bg-secondary);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
}
.athlete-row.suggestion { width: 100%; text-align: left; cursor: pointer; font-family: inherit; }
.athlete-row.suggestion:hover { border-color: var(--color-primary); background: var(--color-primary-light); }
.athlete-chip-choisi { display: flex; align-items: center; gap: var(--spacing-sm); padding: var(--spacing-sm) var(--spacing-md); background: var(--color-primary-light); border-radius: var(--radius-md); border: 1px solid var(--color-primary); }
.mini-av {
  width: var(--avatar-md);
  height: var(--avatar-md);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--font-size-xs);
  font-weight: 600;
  flex-shrink: 0;
  background: var(--color-avatar-athlete-bg);
  color: var(--color-avatar-athlete-text);
}
.athlete-txt { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.athlete-nom { font-size: var(--font-size-sm); font-weight: 600; }
.athlete-email { font-size: var(--font-size-xs); color: var(--color-text-secondary); }
.empty-inline { font-size: var(--font-size-sm); color: var(--color-text-muted); }

.btn-icon-tiny {
  width: 28px; height: 28px; padding: 0; flex-shrink: 0;
  display: inline-flex; align-items: center; justify-content: center;
  border-radius: var(--radius-sm); border: none; cursor: pointer;
  background: transparent; color: var(--color-text-secondary);
}
.btn-icon-tiny:hover { background: var(--color-bg-tertiary); color: var(--color-text); }

.champs-resultat { display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-md); }
.field { display: flex; flex-direction: column; gap: 4px; }
.field-notes { grid-column: 1 / -1; }
.field label { font-size: var(--font-size-xs); color: var(--color-text-secondary); font-weight: 500; }
.field input {
  min-height: var(--tap-min);
  padding: 0 var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--font-size-base);
  background: var(--color-bg);
}
.field input:focus { outline: none; border-color: var(--color-primary); }

@media (max-width: 480px) {
  .champs-resultat { grid-template-columns: 1fr; }
  .field-notes { grid-column: auto; }
}
</style>
