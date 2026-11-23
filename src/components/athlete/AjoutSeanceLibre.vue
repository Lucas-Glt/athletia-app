<template>
  <div class="ajout-libre-bloc">
    <button type="button" class="ajout-libre" @click="ouverte = true">
      <span class="ajout-libre-icone"><i class="ti ti-plus"></i></span>
      <span class="ajout-libre-texte">
        <strong>Séance hors programme</strong>
        <span>Un match, un footing, une séance en plus ? Déclare-la pour ton prépa</span>
      </span>
      <i class="ti ti-chevron-right ajout-libre-chevron"></i>
    </button>

    <!-- Les gestes de la fenêtre ne doivent pas faire changer d'onglet ou de
         séance derrière elle. -->
    <SeanceLibreModal
      v-if="ouverte"
      @fermer="ouverte = false"
      @ajoutee="surAjout"
      @pointerdown.stop
      @pointermove.stop
      @pointerup.stop
    />
  </div>
</template>

<script>
import { ref } from 'vue'
import { useProgressionStore } from '../../stores/progression'
import SeanceLibreModal from './SeanceLibreModal.vue'

// Point d'entrée de la déclaration d'une séance hors programme, dans l'onglet
// Séances (avec ou sans programme assigné). Elle se retrouve ensuite dans la
// régularité de l'accueil, où elle se supprime en cas d'erreur.
export default {
  components: { SeanceLibreModal },
  setup() {
    const progression = useProgressionStore()
    const ouverte = ref(false)
    const surAjout = () => {
      ouverte.value = false
      progression.actualiser('Séance hors programme')
    }
    return { ouverte, surAjout }
  }
}
</script>

<style scoped>
.ajout-libre-bloc { display: contents; }
.ajout-libre {
  display: flex; align-items: center; gap: var(--spacing-md);
  width: 100%; padding: var(--spacing-md) var(--spacing-lg);
  border: 1px dashed var(--color-border-strong); border-radius: var(--radius-lg);
  background: transparent; color: inherit; font-family: inherit; text-align: left; cursor: pointer;
  transition: border-color var(--transition-fast), background var(--transition-fast);
}
.ajout-libre:hover { border-color: var(--color-primary); background: var(--color-bg); }
.ajout-libre-icone {
  flex-shrink: 0; width: 36px; height: 36px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  background: var(--color-primary-light); color: var(--color-primary-dark); font-size: var(--font-size-lg);
}
.ajout-libre-texte { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.ajout-libre-texte strong { font-size: var(--font-size-sm); color: var(--color-text); }
.ajout-libre-texte span { font-size: var(--font-size-xs); color: var(--color-text-secondary); }
.ajout-libre-chevron { color: var(--color-text-muted); }
</style>
