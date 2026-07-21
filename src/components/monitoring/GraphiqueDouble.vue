<template>
  <div class="gdouble">
    <div class="gdouble-head">
      <span class="gdouble-label">{{ label }}</span>
      <div class="gdouble-legende">
        <span class="gdouble-legende-item"><i class="gdouble-dot aigue"></i> {{ labelA }}</span>
        <span class="gdouble-legende-item"><i class="gdouble-dot chronique"></i> {{ labelB }}</span>
      </div>
    </div>

    <div v-if="points.length < 2" class="gdouble-vide">Pas encore assez de données pour tracer une courbe.</div>

    <template v-else>
      <div class="gdouble-plot">
        <div class="gdouble-axe-y">
          <span>{{ Math.round(maxY) }}</span>
          <span>{{ Math.round(minY) }}</span>
        </div>
        <svg class="gdouble-svg" viewBox="0 0 300 120" preserveAspectRatio="none">
          <polyline class="ligne chronique" :points="ligneChronique" />
          <polyline class="ligne aigue" :points="ligneAigue" />
        </svg>
      </div>
      <div class="gdouble-axe-x">
        <span>{{ formatDate(points[0].date) }}</span>
        <span>{{ formatDate(points[points.length - 1].date) }}</span>
      </div>
    </template>
  </div>
</template>

<script>
import { computed } from 'vue'

const LARGEUR = 300
const HAUTEUR = 120
const MARGE = { haut: 10, bas: 10, gauche: 2, droite: 2 }

export default {
  props: {
    // [{ date, valeurA, valeurB }] triés du plus ancien au plus récent
    points: { type: Array, default: () => [] },
    label: { type: String, required: true },
    labelA: { type: String, default: 'Aiguë' },
    labelB: { type: String, default: 'Chronique' }
  },
  setup(props) {
    const toutesValeurs = computed(() => props.points.flatMap(p => [p.valeurA, p.valeurB]))
    const minY = computed(() => Math.min(0, ...toutesValeurs.value))
    const maxY = computed(() => Math.max(...toutesValeurs.value, 1))

    const coordsPour = (champ) => {
      const n = props.points.length
      if (n === 0) return []
      let min = minY.value
      let max = maxY.value
      if (min === max) { min -= 1; max += 1 }
      const largeurUtile = LARGEUR - MARGE.gauche - MARGE.droite
      const hauteurUtile = HAUTEUR - MARGE.haut - MARGE.bas
      const pas = n > 1 ? largeurUtile / (n - 1) : 0
      return props.points.map((p, i) => ({
        x: MARGE.gauche + (n > 1 ? i * pas : largeurUtile / 2),
        y: MARGE.haut + (1 - (p[champ] - min) / (max - min)) * hauteurUtile
      }))
    }

    const ligneAigue = computed(() => coordsPour('valeurA').map(p => `${p.x},${p.y}`).join(' '))
    const ligneChronique = computed(() => coordsPour('valeurB').map(p => `${p.x},${p.y}`).join(' '))

    const formatDate = (d) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })

    return { minY, maxY, ligneAigue, ligneChronique, formatDate }
  }
}
</script>

<style scoped>
.gdouble { display: flex; flex-direction: column; gap: 6px; }
.gdouble-head { display: flex; align-items: center; justify-content: space-between; gap: var(--spacing-sm); flex-wrap: wrap; }
.gdouble-label { font-size: var(--font-size-xs); font-weight: 700; color: var(--color-text-secondary); }
.gdouble-legende { display: flex; gap: var(--spacing-md); font-size: 10px; color: var(--color-text-muted); }
.gdouble-legende-item { display: inline-flex; align-items: center; gap: 4px; }
.gdouble-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
.gdouble-dot.aigue { background: var(--color-primary); }
.gdouble-dot.chronique { background: var(--color-text-muted); }
.gdouble-vide { font-size: var(--font-size-xs); color: var(--color-text-muted); font-style: italic; padding: var(--spacing-md) 0; }
.gdouble-plot { display: flex; align-items: stretch; gap: 6px; }
.gdouble-axe-y { display: flex; flex-direction: column; justify-content: space-between; font-size: 10px; color: var(--color-text-muted); flex-shrink: 0; text-align: right; }
.gdouble-svg { flex: 1; width: 100%; height: 90px; display: block; }
.ligne { fill: none; stroke-width: 2; }
.ligne.aigue { stroke: var(--color-primary); }
.ligne.chronique { stroke: var(--color-text-muted); stroke-dasharray: 4 3; }
.gdouble-axe-x { display: flex; justify-content: space-between; font-size: 10px; color: var(--color-text-muted); padding-left: 24px; }
</style>
