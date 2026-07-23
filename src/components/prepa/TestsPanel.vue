<template>
  <div class="tests-panel">
    <div class="tests-panel-header">
      <h2 class="tests-panel-titre">Tests</h2>
      <button class="btn btn-primary" @click="modalOuverte = true"><i class="ti ti-plus"></i> Nouveau test</button>
    </div>

    <div class="filtres-row">
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
      <select v-model="testFiltre" class="select-filtre">
        <option value="tous">Tous les tests</option>
        <option v-for="t in optionsTestFiltre" :key="t.id" :value="t.id">{{ t.label }}</option>
      </select>
    </div>

    <div class="filtres-row">
      <input v-model="rechercheNom" class="input-recherche" placeholder="Rechercher un athlète" />
      <select v-model="tri" class="select-filtre">
        <option value="recent">Plus récent</option>
        <option value="nom">Athlète A → Z</option>
        <option value="perf_asc">Performance croissante</option>
        <option value="perf_desc">Performance décroissante</option>
      </select>
    </div>

    <div v-if="loading" class="empty">Chargement...</div>
    <div v-else-if="testsFiltres.length === 0" class="empty">Aucun test enregistré pour ce filtre.</div>

    <div class="tests-list" v-else>
      <div class="test-row" v-for="t in testsFiltres" :key="t.id">
        <div class="mini-av-lg">{{ initiales(t.athlete.nom) }}</div>
        <div class="test-info">
          <div class="test-athlete-nom">
            {{ t.athlete.nom }}
            <span class="badge badge-gray org-badge" v-if="estSuperPrepa">{{ t.athlete.organisation?.nom || 'Indépendant' }}</span>
          </div>
          <div class="test-meta">
            <span class="badge badge-purple">{{ labelCategorie(t.categorie) }}</span>
            <span class="test-nom">{{ labelTest(t.type_test) }}</span>
            <span class="test-date">{{ formatDate(t.date) }}</span>
          </div>
          <div class="test-notes" v-if="t.notes">{{ t.notes }}</div>
        </div>
        <div class="test-valeur">{{ t.valeur }}<span class="test-unite">{{ t.unite }}</span></div>
        <button class="btn-icon-tiny" title="Supprimer" @click="supprimer(t)"><i class="ti ti-trash"></i></button>
      </div>
    </div>

    <NouveauTestModal
      v-if="modalOuverte"
      :monCercle="monCercle"
      @fermer="modalOuverte = false"
      @cree="fetchTests"
    />
  </div>
</template>

<script>
import { ref, computed, watch, onMounted } from 'vue'
import { useApi } from '../../services/api'
import { useAuthStore } from '../../stores/auth'
import { CATEGORIES_TEST, CATALOGUE_TESTS, categorieDe, testDe, testsDeCategorie } from '../../data/catalogueTests'
import NouveauTestModal from './NouveauTestModal.vue'

export default {
  components: { NouveauTestModal },
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
    const modalOuverte = ref(false)

    const categorieFiltre = ref('tous')
    const testFiltre = ref('tous')
    const rechercheNom = ref('')
    const tri = ref('recent')

    const optionsTestFiltre = computed(() =>
      categorieFiltre.value === 'tous' ? CATALOGUE_TESTS : testsDeCategorie(categorieFiltre.value)
    )
    watch(categorieFiltre, () => { testFiltre.value = 'tous' })

    const fetchTests = async () => {
      loading.value = true
      tests.value = await api.get('/tests/cercle')
      loading.value = false
    }

    const testsFiltres = computed(() => {
      const liste = tests.value.filter((t) => {
        if (categorieFiltre.value !== 'tous' && t.categorie !== categorieFiltre.value) return false
        if (testFiltre.value !== 'tous' && t.type_test !== testFiltre.value) return false
        if (rechercheNom.value && !t.athlete.nom.toLowerCase().includes(rechercheNom.value.toLowerCase())) return false
        return true
      })
      if (tri.value === 'nom') return [...liste].sort((a, b) => a.athlete.nom.localeCompare(b.athlete.nom))
      if (tri.value === 'perf_asc') return [...liste].sort((a, b) => a.valeur - b.valeur)
      if (tri.value === 'perf_desc') return [...liste].sort((a, b) => b.valeur - a.valeur)
      return [...liste].sort((a, b) => b.date.localeCompare(a.date))
    })

    const supprimer = async (t) => {
      if (!confirm(`Supprimer ce test (${labelTest(t.type_test)} — ${t.athlete.nom}) ?`)) return
      await api.del(`/tests/${t.id}`)
      tests.value = tests.value.filter((x) => x.id !== t.id)
    }

    const labelCategorie = (id) => categorieDe(id)?.label || id
    const labelTest = (id) => testDe(id)?.label || id
    const initiales = (nom) => nom.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    const formatDate = (d) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })

    watch(() => props.actif, (actif) => { if (actif && tests.value.length === 0 && !loading.value) fetchTests() })
    onMounted(() => { if (props.actif) fetchTests() })

    return {
      CATEGORIES_TEST, tests, loading, modalOuverte,
      categorieFiltre, testFiltre, optionsTestFiltre, rechercheNom, tri,
      testsFiltres, fetchTests, supprimer,
      labelCategorie, labelTest, initiales, formatDate, estSuperPrepa
    }
  }
}
</script>

<style scoped>
.tests-panel { display: flex; flex-direction: column; gap: var(--spacing-lg); padding: var(--spacing-xl) var(--spacing-2xl); overflow-y: auto; flex: 1; }

.tests-panel-header { display: flex; align-items: center; justify-content: space-between; gap: var(--spacing-md); flex-wrap: wrap; }
.tests-panel-titre { margin: 0; font-size: var(--font-size-lg); font-weight: 700; }

.filtres-row { display: flex; align-items: center; gap: var(--spacing-md); flex-wrap: wrap; }
.groupe-filtre-chips { display: flex; gap: 6px; flex-wrap: wrap; }
.chip-filtre {
  display: inline-flex; align-items: center; gap: 6px;
  min-height: 36px; padding: 0 var(--spacing-md);
  border: 1px solid var(--color-border); border-radius: var(--radius-full);
  font-size: var(--font-size-sm); background: var(--color-bg); color: var(--color-text-secondary); cursor: pointer;
}
.chip-filtre.active { background: var(--color-primary-light); border-color: var(--color-primary); color: var(--color-primary-text); font-weight: 600; }
.select-filtre {
  min-height: 36px; padding: 0 var(--spacing-md);
  border: 1px solid var(--color-border); border-radius: var(--radius-md);
  font-size: var(--font-size-sm); background: var(--color-bg);
}
.input-recherche {
  min-height: var(--tap-min);
  padding: 0 var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--font-size-base);
  background: var(--color-bg);
  min-width: 200px;
  flex: 1;
}

.tests-list { display: flex; flex-direction: column; gap: var(--spacing-sm); }
.test-row {
  display: flex; align-items: center; gap: var(--spacing-md);
  padding: var(--spacing-md) var(--spacing-lg);
  border: 1px solid var(--color-border); border-radius: var(--radius-lg);
  background: var(--color-bg);
}
.test-row:hover { border-color: var(--color-primary); background: var(--color-bg-secondary); }
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
.test-nom { font-weight: 500; }
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
}
</style>
