<template>
  <!-- Politique de confidentialité en fenêtre (contenu : src/data/confidentialite.js) -->
  <div class="modal-overlay" @click.self="$emit('fermer')">
    <div class="modal modal-politique" role="dialog" aria-modal="true" aria-labelledby="politique-titre">
      <div class="modal-header">
        <h3 id="politique-titre">Politique de confidentialité</h3>
        <button type="button" class="modal-close" @click="$emit('fermer')" aria-label="Fermer"><i class="ti ti-x"></i></button>
      </div>
      <div class="modal-body politique">
        <p class="politique-date">Mise à jour le {{ MISE_A_JOUR }}</p>
        <section v-for="section in SECTIONS" :key="section.titre">
          <h4>{{ section.titre }}</h4>
          <p v-for="(texte, i) in section.paragraphes || []" :key="'p' + i">{{ texte }}</p>
          <ul v-if="section.liste">
            <li v-for="(point, i) in section.liste" :key="i">{{ point }}</li>
          </ul>
          <p v-for="(texte, i) in section.paragraphesApres || []" :key="'a' + i">{{ texte }}</p>
        </section>
      </div>
    </div>
  </div>
</template>

<script>
import { MISE_A_JOUR, SECTIONS } from '../data/confidentialite'

export default {
  emits: ['fermer'],
  setup() {
    return { MISE_A_JOUR, SECTIONS }
  }
}
</script>

<style scoped>
.modal-politique { max-width: 560px; }
.politique { gap: var(--spacing-md); font-size: var(--font-size-sm); line-height: 1.5; }
.politique-date { margin: 0; color: var(--color-text-muted); font-size: var(--font-size-xs); }
.politique h4 { margin: 0 0 var(--spacing-xs); font-size: var(--font-size-base); }
.politique p { margin: 0 0 var(--spacing-xs); }
.politique ul { margin: 0; padding-left: 1.2em; display: flex; flex-direction: column; gap: 4px; }
</style>
