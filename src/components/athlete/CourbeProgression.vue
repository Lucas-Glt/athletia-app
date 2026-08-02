<template>
  <div class="courbe">
    <div class="courbe-head">
      <span class="courbe-label">{{ label }}<span v-if="unite" class="courbe-unite"> ({{ unite }})</span></span>
      <span v-if="delta" class="courbe-delta" :class="delta.classe">{{ delta.texte }}</span>
    </div>

    <div v-if="points.length < 2" class="courbe-vide">
      Pas encore assez de données pour tracer une courbe.
    </div>

    <template v-else>
      <div class="courbe-plot">
        <div class="courbe-axe-y">
          <span>{{ formatValeur(maxY) }}</span>
          <span>{{ formatValeur(minY) }}</span>
        </div>
        <svg class="courbe-svg" viewBox="0 0 300 120" preserveAspectRatio="none">
          <polyline class="courbe-ligne" :points="lignePoints" />
          <circle
            v-for="(p, i) in coords"
            :key="i"
            class="courbe-point"
            :class="couleurPoint(i)"
            :cx="p.x"
            :cy="p.y"
            r="4"
          />
        </svg>
      </div>

      <div class="courbe-axe-x">
        <template v-if="axeX === 'dates'">
          <span>{{ formatDateAxe(points[0].date) }}</span>
          <span>{{ formatDateAxe(points[points.length - 1].date) }}</span>
        </template>
        <template v-else>
          <span v-for="(p, i) in points" :key="i">S{{ i + 1 }}</span>
        </template>
      </div>

      <div class="courbe-legende">
        <span class="courbe-legende-item"><i class="courbe-dot" :class="classeVariation(1)"></i> En hausse</span>
        <span class="courbe-legende-item"><i class="courbe-dot diff-neutre"></i> Stable</span>
        <span class="courbe-legende-item"><i class="courbe-dot" :class="classeVariation(-1)"></i> En baisse</span>
      </div>
    </template>
  </div>
</template>

<script>
import { computed } from 'vue'

const LARGEUR = 300
const HAUTEUR = 120
const MARGE = { haut: 10, bas: 10, gauche: 8, droite: 8 }

export default {
  props: {
    // [{ date: 'YYYY-MM-DD', valeur: Number }], triés du plus ancien au plus récent,
    // un point par tentative (S1 = la plus ancienne, Sn = la plus récente)
    points: { type: Array, default: () => [] },
    label: { type: String, required: true },
    unite: { type: String, default: '' },
    // 'tentatives' (défaut, "S1"/"S2"/...) ou 'dates' (bornes début/fin
    // formatées) — utile pour les séries longues (charge quotidienne sur
    // plusieurs mois) où un label par point déborderait.
    axeX: { type: String, default: 'tentatives' },
    // Sens de lecture d'une variation. Par défaut, monter est une progression
    // (poids soulevé, distance). À passer à false pour les indicateurs où une
    // valeur haute est mauvaise — Hooper Index, monotonie, contrainte : monter
    // y est un signal négatif, et le vert de la hausse disait l'inverse.
    hausseFavorable: { type: Boolean, default: true }
  },
  setup(props) {
    const minY = computed(() => Math.min(...props.points.map(p => p.valeur)))
    const maxY = computed(() => Math.max(...props.points.map(p => p.valeur)))

    const coords = computed(() => {
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
        y: MARGE.haut + (1 - (p.valeur - min) / (max - min)) * hauteurUtile
      }))
    })

    const lignePoints = computed(() => coords.value.map(p => `${p.x},${p.y}`).join(' '))

    // diff-positif = vert, diff-negatif = rouge : les classes disent « bon /
    // mauvais », pas « monte / descend ». C'est hausseFavorable qui fait le
    // lien entre les deux.
    const classeVariation = (ecart) => {
      if (ecart === 0) return 'diff-neutre'
      const favorable = ecart > 0 ? props.hausseFavorable : !props.hausseFavorable
      return favorable ? 'diff-positif' : 'diff-negatif'
    }

    const delta = computed(() => {
      if (props.points.length < 2) return null
      const premier = props.points[0].valeur
      const dernier = props.points[props.points.length - 1].valeur
      const ecart = Math.round((dernier - premier) * 100) / 100
      if (ecart === 0) return { texte: '=', classe: 'diff-neutre' }
      return {
        texte: (ecart > 0 ? '+' : '') + ecart + props.unite,
        classe: classeVariation(ecart)
      }
    })

    // Couleur d'un point selon son évolution par rapport au précédent
    const couleurPoint = (i) => {
      if (i === 0) return 'diff-neutre'
      return classeVariation(props.points[i].valeur - props.points[i - 1].valeur)
    }

    const formatValeur = (v) => `${v}${props.unite}`
    const formatDateAxe = (d) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })

    return { coords, lignePoints, delta, minY, maxY, couleurPoint, classeVariation, formatValeur, formatDateAxe }
  }
}
</script>

<style scoped>
.courbe { display: flex; flex-direction: column; gap: 6px; }
.courbe-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-sm);
}
.courbe-label { font-size: var(--font-size-xs); font-weight: 700; color: var(--color-text-secondary); }
.courbe-unite { font-weight: 400; }
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
.courbe-plot { display: flex; align-items: stretch; gap: 6px; }
.courbe-axe-y {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  font-size: 10px;
  color: var(--color-text-muted);
  flex-shrink: 0;
  text-align: right;
}
.courbe-svg { flex: 1; width: 100%; height: 80px; display: block; }
.courbe-ligne { fill: none; stroke: var(--color-primary); stroke-width: 2; }
.courbe-point.diff-positif { fill: var(--color-valid-text-strong); }
.courbe-point.diff-negatif { fill: var(--color-danger-text); }
.courbe-point.diff-neutre { fill: var(--color-text-muted); }
.courbe-axe-x {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  color: var(--color-text-muted);
  padding-left: 24px;
}
.courbe-legende {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  font-size: 10px;
  color: var(--color-text-muted);
}
.courbe-legende-item { display: inline-flex; align-items: center; gap: 4px; }
.courbe-dot { width: 7px; height: 7px; border-radius: 50%; display: inline-block; }
.courbe-dot.diff-positif { background: var(--color-valid-text-strong); }
.courbe-dot.diff-negatif { background: var(--color-danger-text); }
.courbe-dot.diff-neutre { background: var(--color-text-muted); }
</style>
