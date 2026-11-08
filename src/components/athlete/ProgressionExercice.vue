<template>
  <div class="progression-card" v-if="performances.length > 0">
    <div class="progression-titre"><i class="ti ti-trending-up"></i> Progression</div>
    <select v-model="exerciceChoisiId" class="select-exercice" aria-label="Exercice">
      <option v-for="p in performances" :key="p.exercice_id" :value="p.exercice_id">{{ p.exercice_nom }}</option>
    </select>
    <CourbeProgression
      v-if="exerciceChoisi"
      :points="courbeExerciceChoisi"
      :label="exerciceChoisi.exercice_nom"
      :unite="exerciceChoisi.unite"
    />
  </div>
</template>

<script>
import { ref, computed, watch } from 'vue'
import { useApi } from '../../services/api'
import CourbeProgression from './CourbeProgression.vue'
import { parseValeurSerie } from '../../utils/valeurSerie'

// Courbe d'un exercice suivi (étoile), moyenne de chaque tentative. Vit dans
// l'onglet Perfs, à côté des meilleures performances : l'accueil ne garde que
// l'essentiel du jour.
export default {
  components: { CourbeProgression },
  props: {
    // Exercices suivis, tels que renvoyés par /performances/moi
    performances: { type: Array, default: () => [] }
  },
  setup(props) {
    const api = useApi()
    const exerciceChoisiId = ref(null)
    const historiqueExercice = ref([])

    const exerciceChoisi = computed(() => props.performances.find(p => p.exercice_id === exerciceChoisiId.value))

    // Premier exercice choisi d'office, et de nouveau si celui affiché n'est
    // plus suivi.
    watch(() => props.performances, (liste) => {
      if (!liste.some(p => p.exercice_id === exerciceChoisiId.value)) {
        exerciceChoisiId.value = liste[0]?.exercice_id ?? null
      }
    }, { immediate: true })

    const champPourType = (type) => type === 'musculation' ? 'poids_realise' : 'reps_realisees'

    const fetchHistoriqueExercice = async () => {
      if (!exerciceChoisi.value) { historiqueExercice.value = []; return }
      try {
        historiqueExercice.value = await api.get(`/logs/programme/${exerciceChoisi.value.programme_id}/moi`)
      } catch (e) {
        console.error('Erreur chargement historique exercice:', e)
        historiqueExercice.value = []
      }
    }
    watch(exerciceChoisiId, fetchHistoriqueExercice, { immediate: true })

    const cleTentative = (l) => l.session_id || l.date.split('T')[0]

    const courbeExerciceChoisi = computed(() => {
      if (!exerciceChoisi.value) return []
      const champ = champPourType(exerciceChoisi.value.type_seance)
      const parTentative = {}
      historiqueExercice.value
        .filter(l => l.exercice.nom === exerciceChoisi.value.exercice_nom)
        .forEach(l => {
          const valeur = parseValeurSerie(l[champ])
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

    return { exerciceChoisiId, exerciceChoisi, courbeExerciceChoisi }
  }
}
</script>

<style scoped>
.progression-card {
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  box-shadow: var(--shadow-card);
}
.progression-titre { display: flex; align-items: center; gap: 8px; font-size: var(--font-size-base); font-weight: 700; }
.select-exercice {
  min-height: var(--tap-min);
  padding: 0 var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--font-size-base);
  background: var(--color-bg);
}
</style>
