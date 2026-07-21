<template>
  <div class="gbarres">
    <div class="gbarres-label" v-if="label">{{ label }}</div>
    <div v-if="barres.length === 0" class="gbarres-vide">Pas encore de données.</div>
    <div class="gbarres-liste" v-else>
      <div class="gbarre-row" v-for="b in barres" :key="b.cle">
        <span class="gbarre-nom">{{ b.nom }}</span>
        <div class="gbarre-track">
          <div class="gbarre-fill" :style="{ width: (max ? (b.valeur / max * 100) : 0) + '%' }"></div>
        </div>
        <span class="gbarre-valeur">{{ b.valeur }}{{ unite }}</span>
      </div>
    </div>
  </div>
</template>

<script>
import { computed } from 'vue'

export default {
  props: {
    // [{ cle, nom, valeur }]
    barres: { type: Array, default: () => [] },
    label: { type: String, default: '' },
    unite: { type: String, default: '' }
  },
  setup(props) {
    const max = computed(() => Math.max(1, ...props.barres.map(b => b.valeur)))
    return { max }
  }
}
</script>

<style scoped>
.gbarres { display: flex; flex-direction: column; gap: var(--spacing-sm); }
.gbarres-label { font-size: var(--font-size-xs); font-weight: 700; color: var(--color-text-secondary); }
.gbarres-vide { font-size: var(--font-size-xs); color: var(--color-text-muted); font-style: italic; }
.gbarres-liste { display: flex; flex-direction: column; gap: 8px; }
.gbarre-row { display: flex; align-items: center; gap: var(--spacing-sm); }
.gbarre-nom { width: 90px; flex-shrink: 0; font-size: var(--font-size-sm); font-weight: 500; }
.gbarre-track { flex: 1; height: 10px; border-radius: var(--radius-full); background: var(--color-bg-tertiary); overflow: hidden; }
.gbarre-fill { height: 100%; background: var(--color-primary); border-radius: var(--radius-full); transition: width 0.3s; }
.gbarre-valeur { width: 40px; flex-shrink: 0; text-align: right; font-size: var(--font-size-sm); font-weight: 600; color: var(--color-text-secondary); }
</style>
