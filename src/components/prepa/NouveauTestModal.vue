<template>
  <div class="modal-overlay" @click.self="$emit('fermer')">
    <div class="modal modal-large">
      <div class="modal-header">
        <h3>Nouveau test</h3>
        <button class="modal-close" @click="$emit('fermer')"><i class="ti ti-x"></i></button>
      </div>

      <div class="modal-body">
        <!-- Mode : catalogue ou test personnalisé -->
        <div class="bloc">
          <div class="mode-creation-toggle">
            <button class="chip-filtre" :class="{ active: modeCreation === 'catalogue' }" @click="modeCreation = 'catalogue'">Catalogue</button>
            <button class="chip-filtre" :class="{ active: modeCreation === 'personnalise' }" @click="modeCreation = 'personnalise'">
              <i class="ti ti-plus"></i> Test personnalisé
            </button>
          </div>
        </div>

        <template v-if="modeCreation === 'catalogue'">
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
        </template>

        <!-- Test personnalisé : nom / catégorie / unité libres -->
        <div class="bloc champs-perso" v-else>
          <div class="field">
            <label>Nom du test</label>
            <input v-model="testPerso.nom" placeholder="ex: Sit and reach" />
          </div>
          <div class="field">
            <label>Catégorie</label>
            <select v-model="testPerso.categorie">
              <option value="" disabled>Choisir une catégorie</option>
              <option v-for="c in CATEGORIES_TEST" :key="c.id" :value="c.id">{{ c.label }}</option>
            </select>
          </div>
          <div class="field">
            <label>Unité</label>
            <input v-model="testPerso.unite" placeholder="ex: kg, s, cm, reps..." />
          </div>
        </div>

        <div v-if="erreur" class="error">{{ erreur }}</div>
      </div>

      <div class="modal-footer" v-if="testChoisi">
        <button class="btn btn-secondary" @click="$emit('fermer')">Annuler</button>
        <button class="btn btn-primary" :disabled="enCours" @click="enregistrer">
          Créer ce test
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch } from 'vue'
import { useApi } from '../../services/api'
import { CATEGORIES_TEST, testsDeCategorie, testDe } from '../../data/catalogueTests'

export default {
  emits: ['fermer', 'cree'],
  setup(_, { emit }) {
    const api = useApi()

    const modeCreation = ref('catalogue')
    const categorieId = ref(null)
    const testId = ref(null)
    const testPerso = ref({ nom: '', categorie: '', unite: '' })
    const erreur = ref('')
    const enCours = ref(false)

    const testChoisi = computed(() => {
      if (modeCreation.value === 'personnalise') {
        const { nom, categorie, unite } = testPerso.value
        if (!nom.trim() || !categorie || !unite.trim()) return null
        return { categorie, type_test: nom.trim(), unite: unite.trim() }
      }
      if (!testId.value) return null
      const t = testDe(testId.value)
      return { categorie: t.categorie, type_test: t.label, unite: t.unite }
    })

    watch(modeCreation, () => {
      categorieId.value = null
      testId.value = null
      testPerso.value = { nom: '', categorie: '', unite: '' }
    })

    const choisirCategorie = (id) => {
      categorieId.value = id
      testId.value = null
    }

    const enregistrer = async () => {
      if (!testChoisi.value) return
      erreur.value = ''
      enCours.value = true
      try {
        const data = await api.post('/tests/', testChoisi.value)
        emit('cree', data)
        emit('fermer')
      } catch {
        erreur.value = 'Erreur lors de la création du test.'
      } finally {
        enCours.value = false
      }
    }

    return {
      CATEGORIES_TEST, testsDeCategorie,
      modeCreation, testPerso,
      categorieId, testId, testChoisi, choisirCategorie,
      erreur, enCours, enregistrer
    }
  }
}
</script>

<style scoped>
.modal-large { max-width: 560px; }
.bloc { display: flex; flex-direction: column; gap: var(--spacing-sm); }

.mode-creation-toggle { display: flex; gap: 6px; flex-wrap: wrap; }
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

.champs-perso { display: grid; grid-template-columns: 2fr 1.4fr 1fr; gap: var(--spacing-md); }
.champs-perso select {
  min-height: var(--tap-min);
  padding: 0 var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--font-size-base);
  background: var(--color-bg);
}
.field { display: flex; flex-direction: column; gap: 4px; }
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
  .champs-perso { grid-template-columns: 1fr; }
}
</style>
