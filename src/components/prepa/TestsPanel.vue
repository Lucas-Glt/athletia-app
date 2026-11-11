<template>
  <div class="tests-panel">
    <div v-if="erreurTests" class="error" role="alert">{{ erreurTests }}</div>
    <!-- LISTE DES TESTS (une page par test créé) -->
    <template v-if="!testSelectionne">
      <div class="tests-panel-header">
        <div>
          <h2 class="tests-panel-titre">Tests</h2>
          <p class="tests-panel-sous-titre" v-if="tests.length > 0">
            {{ tests.length }} test{{ tests.length > 1 ? 's' : '' }} créé{{ tests.length > 1 ? 's' : '' }}
          </p>
        </div>
        <button class="btn btn-primary" @click="modalNouveauTest = true"><i class="ti ti-plus"></i> Nouveau test</button>
      </div>

      <div class="filtres-row">
        <label class="recherche">
          <i class="ti ti-search"></i>
          <input v-model="rechercheTest" type="search" placeholder="Rechercher un test" aria-label="Rechercher un test" />
        </label>
        <div class="groupe-filtre-chips">
          <button class="chip-filtre" :class="{ active: categorieFiltre === 'tous' }" @click="categorieFiltre = 'tous'">Tous</button>
          <button
            v-for="c in CATEGORIES_TEST"
            :key="c.id"
            class="chip-filtre"
            :class="{ active: categorieFiltre === c.id }"
            @click="categorieFiltre = categorieFiltre === c.id ? 'tous' : c.id"
          >
            <i class="ti" :class="c.icone"></i> {{ c.label }}
          </button>
        </div>
      </div>

      <div v-if="loading" class="empty">Chargement...</div>
      <div v-else-if="tests.length === 0" class="empty">Aucun test pour l'instant : « Nouveau test » pour créer le premier.</div>
      <div v-else-if="testsFiltres.length === 0" class="empty">Aucun test pour ce filtre.</div>

      <div class="tests-grid" v-else>
        <div class="test-card" v-for="t in testsFiltres" :key="t.id" @click="ouvrirTest(t)">
          <div class="test-card-head">
            <span class="type-icone type-icone-programme"><i class="ti" :class="iconeCategorie(t.categorie)"></i></span>
            <button class="btn-icon-tiny" title="Supprimer ce test" @click.stop="supprimerTest(t)"><i class="ti ti-trash"></i></button>
          </div>
          <div class="test-card-nom">{{ t.type_test }}</div>
          <div class="test-card-meta">
            <span class="badge badge-purple">{{ labelCategorie(t.categorie) }}</span>
            <span>{{ t.nb_resultats }} résultat{{ t.nb_resultats > 1 ? 's' : '' }} · {{ t.unite }}</span>
          </div>
        </div>
      </div>
    </template>

    <!-- DÉTAIL D'UN TEST : résultats par athlète -->
    <template v-else>
      <div class="tests-panel-header">
        <button class="btn btn-sm btn-ghost retour-test" @click="fermerTest"><i class="ti ti-arrow-left"></i> Tests</button>
        <button class="btn btn-primary" @click="modalAjouterResultat = true"><i class="ti ti-plus"></i> Ajouter un résultat</button>
      </div>

      <div class="test-detail-titre">
        <span class="type-icone type-icone-programme"><i class="ti" :class="iconeCategorie(testSelectionne.categorie)"></i></span>
        <div>
          <h2>{{ testSelectionne.type_test }}</h2>
          <span class="test-detail-meta">{{ labelCategorie(testSelectionne.categorie) }} · en {{ testSelectionne.unite }}</span>
        </div>
      </div>

      <div class="filtres-row">
        <label class="recherche">
          <i class="ti ti-search"></i>
          <input v-model="rechercheNom" type="search" placeholder="Rechercher un athlète" aria-label="Rechercher un athlète" />
        </label>
        <select v-model="tri" class="select-filtre">
          <option value="recent">Plus récent</option>
          <option value="nom">Athlète A → Z</option>
          <option value="perf_asc">Performance croissante</option>
          <option value="perf_desc">Performance décroissante</option>
        </select>
      </div>

      <div v-if="loadingResultats" class="empty">Chargement...</div>
      <div v-else-if="resultatsFiltres.length === 0" class="empty">Aucun résultat enregistré pour ce filtre.</div>

      <div class="tests-list" v-else>
        <div class="test-row" v-for="r in resultatsFiltres" :key="r.id">
          <div class="mini-av-lg">{{ initiales(r.athlete.nom) }}</div>
          <div class="test-info">
            <div class="test-athlete-nom">
              {{ r.athlete.nom }}
              <span class="badge badge-gray org-badge" v-if="estSuperPrepa">{{ r.athlete.organisation?.nom || 'Indépendant' }}</span>
            </div>
            <div class="test-meta">
              <span class="test-date">{{ formatDate(r.date) }}</span>
            </div>
            <div class="test-notes" v-if="r.notes">{{ r.notes }}</div>
          </div>
          <div class="test-valeur">{{ r.valeur }}<span class="test-unite">{{ testSelectionne.unite }}</span></div>
          <button class="btn-icon-tiny" title="Supprimer" @click="supprimerResultat(r)"><i class="ti ti-trash"></i></button>
        </div>
      </div>
    </template>

    <NouveauTestModal
      v-if="modalNouveauTest"
      @fermer="modalNouveauTest = false"
      @cree="onTestCree"
    />
    <AjouterResultatModal
      v-if="modalAjouterResultat"
      :test="testSelectionne"
      :monCercle="monCercle"
      @fermer="modalAjouterResultat = false"
      @cree="onResultatCree"
    />
  </div>
</template>

<script>
import { ref, computed, watch, onMounted } from 'vue'
import { useApi } from '../../services/api'
import { useAuthStore } from '../../stores/auth'
import { CATEGORIES_TEST, categorieDe } from '../../data/catalogueTests'
import NouveauTestModal from './NouveauTestModal.vue'
import AjouterResultatModal from './AjouterResultatModal.vue'

export default {
  components: { NouveauTestModal, AjouterResultatModal },
  props: {
    monCercle: { type: Array, default: () => [] },
    actif: { type: Boolean, default: false }
  },
  setup(props) {
    const api = useApi()
    const authStore = useAuthStore()
    const estSuperPrepa = computed(() => authStore.role === 'super_prepa')

    const tests = ref([])
    const loading = ref(false)
    const modalNouveauTest = ref(false)
    const categorieFiltre = ref('tous')
    const rechercheTest = ref('')

    // Échec affiché au lieu d'un « Chargement… » sans fin ou d'un clic sans effet.
    const erreurTests = ref('')
    const fetchTests = async () => {
      loading.value = true
      erreurTests.value = ''
      try {
        tests.value = await api.get('/tests/')
      } catch (e) {
        erreurTests.value = e.message || 'Impossible de charger les tests'
      } finally {
        loading.value = false
      }
    }

    const testsFiltres = computed(() =>
      tests.value.filter((t) => {
        if (categorieFiltre.value !== 'tous' && t.categorie !== categorieFiltre.value) return false
        if (rechercheTest.value && !t.type_test.toLowerCase().includes(rechercheTest.value.toLowerCase())) return false
        return true
      })
    )

    const onTestCree = (nouveauTest) => {
      tests.value.push({ ...nouveauTest, nb_resultats: 0 })
    }

    const supprimerTest = async (t) => {
      if (!confirm(`Supprimer le test "${t.type_test}" et tous ses résultats ?`)) return
      erreurTests.value = ''
      try {
        await api.del(`/tests/${t.id}`)
        tests.value = tests.value.filter((x) => x.id !== t.id)
      } catch (e) {
        erreurTests.value = e.message || 'Impossible de supprimer ce test'
      }
    }

    // --- Détail d'un test : résultats par athlète (recherche + tri vivent ici) ---
    const testSelectionne = ref(null)
    const resultats = ref([])
    const loadingResultats = ref(false)
    const modalAjouterResultat = ref(false)
    const rechercheNom = ref('')
    const tri = ref('recent')

    const fetchResultats = async (testId) => {
      loadingResultats.value = true
      erreurTests.value = ''
      try {
        resultats.value = await api.get(`/tests/${testId}/resultats`)
      } catch (e) {
        erreurTests.value = e.message || 'Impossible de charger les résultats'
      } finally {
        loadingResultats.value = false
      }
    }

    const ouvrirTest = (t) => {
      testSelectionne.value = t
      rechercheNom.value = ''
      tri.value = 'recent'
      fetchResultats(t.id)
    }

    const fermerTest = () => { testSelectionne.value = null }

    const resultatsFiltres = computed(() => {
      const liste = resultats.value.filter(
        (r) => !rechercheNom.value || r.athlete.nom.toLowerCase().includes(rechercheNom.value.toLowerCase())
      )
      if (tri.value === 'nom') return [...liste].sort((a, b) => a.athlete.nom.localeCompare(b.athlete.nom))
      if (tri.value === 'perf_asc') return [...liste].sort((a, b) => a.valeur - b.valeur)
      if (tri.value === 'perf_desc') return [...liste].sort((a, b) => b.valeur - a.valeur)
      return [...liste].sort((a, b) => b.date.localeCompare(a.date))
    })

    const onResultatCree = () => {
      const t = tests.value.find((x) => x.id === testSelectionne.value.id)
      if (t) t.nb_resultats++
      fetchResultats(testSelectionne.value.id)
    }

    const supprimerResultat = async (r) => {
      if (!confirm(`Supprimer ce résultat (${r.athlete.nom}) ?`)) return
      erreurTests.value = ''
      try {
        await api.del(`/tests/${testSelectionne.value.id}/resultats/${r.id}`)
      } catch (e) {
        erreurTests.value = e.message || 'Impossible de supprimer ce résultat'
        return
      }
      resultats.value = resultats.value.filter((x) => x.id !== r.id)
      const t = tests.value.find((x) => x.id === testSelectionne.value.id)
      if (t) t.nb_resultats--
    }

    const labelCategorie = (id) => categorieDe(id)?.label || id
    const iconeCategorie = (id) => categorieDe(id)?.icone || 'ti-clipboard-list'
    const initiales = (nom) => nom.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    const formatDate = (d) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })

    watch(() => props.actif, (actif) => { if (actif && tests.value.length === 0 && !loading.value) fetchTests() })
    onMounted(() => { if (props.actif) fetchTests() })

    return {
      CATEGORIES_TEST, tests, loading, erreurTests, modalNouveauTest, categorieFiltre, rechercheTest, testsFiltres,
      onTestCree, supprimerTest,
      testSelectionne, resultats, loadingResultats, modalAjouterResultat, ouvrirTest, fermerTest,
      rechercheNom, tri, resultatsFiltres, onResultatCree, supprimerResultat,
      labelCategorie, iconeCategorie, initiales, formatDate, estSuperPrepa
    }
  }
}
</script>

<style scoped>
/* Colonne centrée sur grand écran, sans déplacer la barre de défilement. */
.tests-panel {
  display: flex; flex-direction: column; gap: var(--spacing-lg);
  padding: var(--spacing-xl) max(var(--spacing-2xl), calc((100% - 1080px) / 2));
  overflow-y: auto; flex: 1; min-height: 0;
}

.tests-panel-header { display: flex; align-items: flex-end; justify-content: space-between; gap: var(--spacing-md); flex-wrap: wrap; }
.tests-panel-titre { margin: 0; font-size: var(--font-size-xl); font-weight: 700; letter-spacing: -0.3px; }
.tests-panel-sous-titre { margin: 2px 0 0; font-size: var(--font-size-sm); color: var(--color-text-secondary); }
.retour-test { margin-left: calc(-1 * var(--spacing-md)); }

.filtres-row { display: flex; align-items: center; gap: var(--spacing-sm) var(--spacing-md); flex-wrap: wrap; }
.recherche { position: relative; flex: 1; min-width: 200px; display: flex; align-items: center; }
.recherche i { position: absolute; left: 14px; font-size: var(--font-size-lg); color: var(--color-text-muted); pointer-events: none; }
.recherche input {
  width: 100%; min-height: var(--tap-min);
  padding: 0 var(--spacing-lg) 0 42px;
  border: 1px solid var(--color-border); border-radius: var(--radius-full);
  font-size: var(--font-size-base); background: var(--color-bg);
  appearance: none;
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
}
.recherche input:focus { outline: none; border-color: var(--color-primary); box-shadow: var(--shadow-focus); }
.groupe-filtre-chips { display: flex; gap: 6px; flex-wrap: wrap; }
.chip-filtre {
  display: inline-flex; align-items: center; gap: 6px;
  min-height: 36px; padding: 0 var(--spacing-md);
  border: 1px solid var(--color-border); border-radius: var(--radius-full);
  font-family: inherit; font-size: var(--font-size-sm);
  background: var(--color-bg); color: var(--color-text-secondary); cursor: pointer;
  transition: background var(--transition-fast), border-color var(--transition-fast), color var(--transition-fast);
}
.chip-filtre:hover { border-color: var(--color-border-strong); }
.chip-filtre.active { background: var(--color-primary-light); border-color: var(--color-primary); color: var(--color-primary-text); font-weight: 600; }
.select-filtre {
  min-height: var(--tap-min); padding: 0 var(--spacing-md);
  border: 1px solid var(--color-border); border-radius: var(--radius-md);
  font-size: var(--font-size-sm); background: var(--color-bg);
}

/* --- Liste des tests (cartes) --- */
.tests-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: var(--spacing-md); }
.test-card {
  display: flex; flex-direction: column; gap: var(--spacing-sm);
  padding: var(--spacing-lg);
  border: 1px solid var(--color-border); border-radius: var(--radius-lg);
  background: var(--color-bg); box-shadow: var(--shadow-card); cursor: pointer;
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast), transform var(--transition-fast);
}
.test-card:hover { border-color: var(--color-primary); box-shadow: var(--shadow-card-hover); }
.test-card:active { transform: scale(0.99); }
.test-card-head { display: flex; align-items: flex-start; justify-content: space-between; }
.test-card-nom { font-size: var(--font-size-base); font-weight: 600; overflow-wrap: anywhere; }
.test-card-meta { display: flex; align-items: center; gap: var(--spacing-sm); flex-wrap: wrap; font-size: var(--font-size-xs); color: var(--color-text-secondary); }

/* --- Détail d'un test --- */
.test-detail-titre { display: flex; align-items: center; gap: var(--spacing-md); }
.test-detail-titre .type-icone { width: 44px; height: 44px; font-size: 22px; border-radius: var(--radius-lg); }
.test-detail-titre h2 { margin: 0; font-size: var(--font-size-xl); font-weight: 700; letter-spacing: -0.3px; }
.test-detail-meta { font-size: var(--font-size-sm); color: var(--color-text-secondary); }

.tests-list { display: flex; flex-direction: column; gap: var(--spacing-sm); }
.test-row {
  display: flex; align-items: center; gap: var(--spacing-md);
  padding: var(--spacing-md) var(--spacing-lg);
  border: 1px solid var(--color-border); border-radius: var(--radius-lg);
  background: var(--color-bg);
  transition: border-color var(--transition-fast);
}
.test-row:hover { border-color: var(--color-border-strong); }
.mini-av-lg {
  width: var(--avatar-md); height: var(--avatar-md); border-radius: 50%;
  background: var(--color-avatar-athlete-bg); color: var(--color-avatar-athlete-text);
  display: flex; align-items: center; justify-content: center;
  font-size: var(--font-size-xs); font-weight: 600; flex-shrink: 0;
}
.test-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.test-athlete-nom { font-size: var(--font-size-sm); font-weight: 600; }
.test-athlete-nom .org-badge { margin-left: 6px; font-weight: 500; }
.test-meta { display: flex; align-items: center; gap: var(--spacing-sm); font-size: var(--font-size-xs); color: var(--color-text-secondary); flex-wrap: wrap; }
.test-date { color: var(--color-text-muted); }
.test-notes { font-size: var(--font-size-xs); color: var(--color-text-muted); font-style: italic; }
.test-valeur { font-size: var(--font-size-lg); font-weight: 700; color: var(--color-primary-dark); white-space: nowrap; flex-shrink: 0; }
.test-unite { font-size: var(--font-size-xs); font-weight: 500; color: var(--color-text-secondary); margin-left: 3px; }

.btn-icon-tiny {
  width: 32px; height: 32px; padding: 0; flex-shrink: 0;
  display: inline-flex; align-items: center; justify-content: center;
  border-radius: var(--radius-sm); border: none; cursor: pointer;
  background: transparent; color: var(--color-text-secondary);
}
.btn-icon-tiny:hover { background: var(--color-danger-bg); color: var(--color-danger-text); }

@media (max-width: 768px) {
  .tests-panel { padding: var(--spacing-md) var(--spacing-lg); }
  .test-row { flex-wrap: wrap; }
  .tests-grid { grid-template-columns: 1fr 1fr; }
}
</style>
