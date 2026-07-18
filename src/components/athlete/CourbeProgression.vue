<template>
  <div class="courbe">
    <div class="courbe-head">
      <span class="courbe-label">{{ label }}</span>
      <span v-if="delta" class="courbe-delta" :class="delta.classe">{{ delta.texte }}</span>
    </div>

    <div v-if="points.length < 2" class="courbe-vide">
      Pas encore assez de données pour tracer une courbe.
    </div>

    <template v-else>
      <svg class="courbe-svg" viewBox="0 0 300 140" preserveAspectRatio="none">
        <polyline class="courbe-ligne" :points="lignePoints" />
        <circle
          v-for="(p, i) in coords"
          :key="i"
          class="courbe-point"
          :cx="p.x"
          :cy="p.y"
          r="3"
        />
        <text class="courbe-valeur" :x="coords[0].x" :y="coords[0].y - 8" text-anchor="start">
          {{ formatValeur(points[0].valeur) }}
        </text>
        <text
          class="courbe-valeur"
          :x="coords[coords.length - 1].x"
          :y="coords[coords.length - 1].y - 8"
          text-anchor="end"
        >
          {{ formatValeur(points[points.length - 1].valeur) }}
        </text>
      </svg>

      <div class="courbe-dates">
        <span>{{ formatDate(points[0].date) }}</span>
        <span>{{ formatDate(points[points.length - 1].date) }}</span>
      </div>
    </template>
  </div>
</template>

<script>
import { computed } from 'vue'

const LARGEUR = 300
const HAUTEUR = 140
const MARGE = { haut: 22, bas: 6, gauche: 10, droite: 10 }

export default {
  props: {
    // [{ date: 'YYYY-MM-DD', valeur: Number }], triés du plus ancien au plus récent
    points: { type: Array, default: () => [] },
    label: { type: String, required: true },
    unite: { type: String, default: '' }
  },
  setup(props) {
    const coords = computed(() => {
      const n = props.points.length
      if (n === 0) return []
      const valeurs = props.points.map(p => p.valeur)
      let min = Math.min(...valeurs)
      let max = Math.max(...valeurs)
      if (min === max) { min -= 1; max += 1 }

      const largeurUtile = LARGEUR - MARGE.gauche - MARGE.droite
      const hauteurUtile = HAUTEUR - MARGE.haut - MARGE.bas
      const pas = n > 1 ? largeurUtile / (n - 1) : 0

      return props.points.map((p, i) => ({
        x: MARGE.gauche + (n > 1 ? i * pas : largeurUtile / 2),
        y: MARGE.haut + (1 - (p.valeur - min) / (max - min)) * hauteurUtile
      }))
    })

    const lignePoints = computed(() => coords.value.map(p => `${p.x},${p.y}`).join(' '))

    const delta = computed(() => {
      if (props.points.length < 2) return null
      const premier = props.points[0].valeur
      const dernier = props.points[props.points.length - 1].valeur
      const ecart = Math.round((dernier - premier) * 100) / 100
      if (ecart === 0) return { texte: '=', classe: 'diff-neutre' }
      return {
        texte: (ecart > 0 ? '+' : '') + ecart + props.unite,
        classe: ecart > 0 ? 'diff-positif' : 'diff-negatif'
      }
    })

    const formatValeur = (v) => `${v}${props.unite}`
    const formatDate = (d) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })

    return { coords, lignePoints, delta, formatValeur, formatDate }
  }
}
</script>

<style scoped>
.courbe { display: flex; flex-direction: column; gap: 4px; }
.courbe-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-sm);
}
.courbe-label { font-size: var(--font-size-xs); font-weight: 700; color: var(--color-text-secondary); }
.courbe-delta {
  font-size: 11px;
  font-weight: 700;
  padding: 1px 7px;
  border-radius: var(--radius-full, 999px);
}
.courbe-delta.diff-positif { background: var(--color-valid-bg); color: var(--color-valid-text-strong); }
.courbe-delta.diff-negatif { background: var(--color-danger-bg); color: var(--color-danger-text); }
.courbe-delta.diff-neutre { background: var(--color-bg-tertiary); color: var(--color-text-muted); }
.courbe-vide {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
  font-style: italic;
  padding: var(--spacing-md) 0;
}
.courbe-svg { width: 100%; height: 90px; display: block; }
.courbe-ligne { fill: none; stroke: var(--color-primary); stroke-width: 2; }
.courbe-point { fill: var(--color-primary); }
.courbe-valeur { font-size: 10px; font-weight: 700; fill: var(--color-text); }
.courbe-dates {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  color: var(--color-text-muted);
}
</style>
