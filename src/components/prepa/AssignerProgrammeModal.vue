<template>
  <div class="modal-overlay" @click.self="$emit('fermer')">
    <div class="modal modal-large">
      <div class="modal-header">
        <h3>Ajouter un programme</h3>
        <button class="modal-close" @click="$emit('fermer')"><i class="ti ti-x"></i></button>
      </div>
      <div class="modal-body">
        <input
          v-if="programmes.length > 5"
          v-model="recherche"
          class="input-recherche"
          placeholder="Rechercher un programme"
        />

        <div v-if="programmes.length === 0" class="empty">
          Tous vos programmes sont déjà assignés à cet athlète.
        </div>
        <div v-else-if="programmesFiltres.length === 0" class="empty">Aucun programme pour cette recherche.</div>

        <div class="prog-dispo-row" v-for="p in programmesFiltres" :key="p.id">
          <div class="prog-dispo-info">
            <div class="prog-dispo-nom">
              {{ p.nom }}
              <span class="badge" :class="p.statut === 'actif' ? 'badge-green' : 'badge-gray'">{{ p.statut }}</span>
            </div>
            <div class="prog-dispo-desc" v-if="p.description">{{ p.description }}</div>
            <div class="prog-dispo-meta">
              {{ p.athletes.length }} athlète{{ p.athletes.length > 1 ? 's' : '' }} déjà assigné{{ p.athletes.length > 1 ? 's' : '' }}
            </div>
          </div>
          <button class="btn btn-sm btn-primary" :disabled="enCours.has(p.id)" @click="$emit('assigner', p)">
            <i class="ti ti-plus"></i> Assigner
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed } from 'vue'

export default {
  emits: ['fermer', 'assigner'],
  props: {
    // Uniquement les programmes que l'athlète n'a pas encore : la liste se vide
    // au fur et à mesure des assignations (le parent recharge ses programmes).
    programmes: { type: Array, default: () => [] },
    enCours: { type: Set, default: () => new Set() }
  },
  setup(props) {
    const recherche = ref('')
    const programmesFiltres = computed(() =>
      props.programmes.filter(p => p.nom.toLowerCase().includes(recherche.value.toLowerCase()))
    )
    return { recherche, programmesFiltres }
  }
}
</script>

<style scoped>
.modal-large { max-width: 560px; }
.modal-body { display: flex; flex-direction: column; gap: var(--spacing-sm); }
.input-recherche {
  min-height: var(--tap-min);
  padding: 0 var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--font-size-base);
  background: var(--color-bg);
}
.prog-dispo-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-md);
  padding: var(--spacing-sm) var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg-secondary);
  flex-wrap: wrap;
}
.prog-dispo-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.prog-dispo-nom { font-size: var(--font-size-sm); font-weight: 600; display: flex; align-items: center; gap: var(--spacing-sm); flex-wrap: wrap; }
.prog-dispo-desc { font-size: var(--font-size-xs); color: var(--color-text-secondary); }
.prog-dispo-meta { font-size: var(--font-size-xs); color: var(--color-text-muted); }
</style>
