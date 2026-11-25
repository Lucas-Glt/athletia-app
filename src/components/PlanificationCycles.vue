<template>
  <!-- Les cycles de la planification, dans l'ordre. Chez le prépa, toucher
       un cycle le sélectionne dans la grille pour le modifier. -->
  <div class="cycles">
    <component
      :is="editable ? 'button' : 'div'"
      v-for="c in cycles"
      :key="c.debut"
      :type="editable ? 'button' : undefined"
      class="cycle-ligne"
      :class="{ 'est-en-cours': c.debut === enCours, 'est-passe': c.fin < courant, 'est-editable': editable }"
      @click="editable && $emit('choisir', c)"
    >
      <span class="cycle-couleur" :style="{ background: developpement(c.developpement).couleur, color: developpement(c.developpement).texte }">
        <i class="ti" :class="developpement(c.developpement).icone"></i>
      </span>
      <span class="cycle-infos">
        <span class="cycle-nom">
          {{ developpement(c.developpement).label }}
          <small v-if="c.debut === enCours" class="cycle-badge">en cours</small>
        </span>
        <span class="cycle-dates">{{ formatPeriode(c.debut, c.fin) }} · {{ c.nbSemaines }} sem.</span>
      </span>
      <i v-if="editable" class="ti ti-pencil cycle-edit" aria-hidden="true"></i>
    </component>
  </div>
</template>

<script>
import { developpement } from '../data/developpements'
import { formatPeriode, lundiCourant } from '../utils/planification'

export default {
  emits: ['choisir'],
  props: {
    cycles: { type: Array, required: true },
    // Lundi de début du cycle en cours
    enCours: { type: String, default: null },
    editable: { type: Boolean, default: false }
  },
  setup() {
    return { developpement, formatPeriode, courant: lundiCourant() }
  }
}
</script>

<style scoped>
.cycles { display: flex; flex-direction: column; gap: var(--spacing-sm); }
.cycle-ligne {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  width: 100%;
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font: inherit;
  text-align: left;
  color: var(--color-text);
}
.cycle-ligne.est-editable { cursor: pointer; }
.cycle-ligne.est-editable:hover { border-color: var(--color-primary-lighter); }
.cycle-ligne.est-en-cours { border-color: var(--color-primary); box-shadow: var(--shadow-sm); }
.cycle-ligne.est-passe { opacity: 0.6; }
.cycle-couleur {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-sm);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 17px;
  flex-shrink: 0;
}
.cycle-infos { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.cycle-nom { font-size: var(--font-size-sm); font-weight: 700; display: flex; align-items: center; gap: 6px; }
.cycle-badge {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 1px 6px;
  border-radius: var(--radius-full);
  background: var(--color-primary-light);
  color: var(--color-primary-dark);
}
.cycle-dates { font-size: var(--font-size-xs); color: var(--color-text-secondary); }
.cycle-edit { color: var(--color-text-muted); }
</style>
