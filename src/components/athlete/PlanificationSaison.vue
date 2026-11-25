<template>
  <!-- Planification faite par le prépa : le cycle en cours en une ligne,
       toute la saison en lecture seule au toucher. Rien sans cycle en cours
       ni à venir. -->
  <button v-if="situation.actuel || situation.suivant" type="button" class="saison-carte" @click="ouverte = true">
    <span class="saison-icone" :style="pastille((situation.actuel || situation.suivant).developpement)">
      <i class="ti" :class="developpement((situation.actuel || situation.suivant).developpement).icone"></i>
    </span>
    <span class="saison-texte">
      <span class="saison-label">Ta saison</span>
      <span v-if="situation.actuel" class="saison-titre">
        {{ developpement(situation.actuel.developpement).label }}
        <small>· semaine {{ situation.actuel.semaine }} sur {{ situation.actuel.nbSemaines }}</small>
      </span>
      <span v-else class="saison-titre">Prochain cycle : {{ developpement(situation.suivant.developpement).label }}</span>
      <span v-if="situation.suivant" class="saison-sous">
        {{ situation.actuel ? `Puis ${developpement(situation.suivant.developpement).label} ` : 'Dès ' }}{{ formatDebutCycle(situation.suivant.debut) }}
      </span>
    </span>
    <i class="ti ti-chevron-right saison-chevron" aria-hidden="true"></i>
  </button>

  <Teleport to="body">
    <div v-if="ouverte" class="modal-overlay" @click.self="ouverte = false" @keydown.esc="ouverte = false">
      <div class="modal modal-saison" role="dialog" aria-modal="true" aria-labelledby="titre-saison">
        <div class="modal-header">
          <h3 id="titre-saison">Ta saison</h3>
          <button class="modal-close" aria-label="Fermer" @click="ouverte = false"><i class="ti ti-x"></i></button>
        </div>
        <div class="modal-body">
          <p class="saison-explication">Prévue par ton prépa, semaine par semaine : ce que chaque période cherche à développer.</p>
          <PlanificationGrille :semaines="semaines" :premier-mois="premierMois" :nb-mois="nbMois" />
          <div>
            <div class="section-title">Cycles</div>
            <PlanificationCycles :cycles="cyclesAVenir" :en-cours="situation.actuel?.debut" />
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script>
import { computed, ref } from 'vue'
import { developpement } from '../../data/developpements'
import PlanificationGrille from '../PlanificationGrille.vue'
import PlanificationCycles from '../PlanificationCycles.vue'
import { cyclesDe, formatDebutCycle, lundiCourant, premierDuMois, situationCycle } from '../../utils/planification'

export default {
  components: { PlanificationGrille, PlanificationCycles },
  props: {
    // { lundi: développement }
    semaines: { type: Object, required: true }
  },
  setup(props) {
    const ouverte = ref(false)
    const situation = computed(() => situationCycle(props.semaines))
    // Ce qui est fini n'intéresse plus l'athlète : le cycle en cours et la suite
    const cyclesAVenir = computed(() => cyclesDe(props.semaines).filter(c => c.fin >= lundiCourant()))
    // Du mois en cours au dernier mois planifié : pas de mois vides en bout de grille
    const premierMois = premierDuMois()
    const nbMois = computed(() => {
      const fin = cyclesAVenir.value.at(-1)?.fin
      if (!fin) return 1
      const [annee, mois] = fin.split('-').map(Number)
      return Math.max(1, (annee - premierMois.getFullYear()) * 12 + (mois - 1 - premierMois.getMonth()) + 1)
    })
    const pastille = (cle) => ({ background: developpement(cle).couleur, color: developpement(cle).texte })
    return { ouverte, situation, cyclesAVenir, premierMois, nbMois, pastille, developpement, formatDebutCycle }
  }
}
</script>

<style scoped>
.saison-carte {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  width: 100%;
  padding: var(--spacing-md);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  font: inherit;
  text-align: left;
  color: var(--color-text);
  cursor: pointer;
}
.saison-carte:hover { border-color: var(--color-primary-lighter); }
.saison-icone {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-md);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
}
.saison-texte { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.saison-label {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-text-muted);
}
.saison-titre { font-size: var(--font-size-base); font-weight: 700; }
.saison-titre small { font-size: var(--font-size-sm); font-weight: 500; color: var(--color-text-secondary); }
.saison-sous { font-size: var(--font-size-xs); color: var(--color-text-secondary); }
.saison-chevron { color: var(--color-text-muted); }

.modal-saison { max-width: 520px; }
.saison-explication { margin: 0; font-size: var(--font-size-sm); color: var(--color-text-secondary); }
</style>
