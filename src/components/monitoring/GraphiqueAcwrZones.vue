<template>
  <div class="gacwr">
    <div class="gacwr-head">
      <span class="gacwr-label">ACWR (charge aiguë / chronique)</span>
      <span class="gacwr-valeur" :class="'zone-' + (actuel.zone || 'insuffisant')">
        {{ actuel.valeur !== null ? actuel.valeur.toFixed(2) : '—' }}
        <span class="gacwr-zone-txt">{{ libelleZone(actuel.zone) }}</span>
      </span>
    </div>

    <div v-if="pointsValides.length < 2" class="gacwr-vide">
      Données insuffisantes — l'ACWR nécessite 28 jours de suivi.
    </div>

    <template v-else>
      <div class="gacwr-plot">
        <svg class="gacwr-svg" viewBox="0 0 300 110" preserveAspectRatio="none">
          <rect x="0" :y="yPour(plafond)" width="300" :height="yPour(0.8) - yPour(plafond)" class="bande sous_charge" />
          <rect x="0" :y="yPour(1.3)" width="300" :height="yPour(0.8) - yPour(1.3)" class="bande optimale" />
          <rect x="0" :y="yPour(1.5)" width="300" :height="yPour(1.3) - yPour(1.5)" class="bande vigilance" />
          <rect x="0" y="0" width="300" :height="yPour(1.5)" class="bande surcharge" />
          <polyline class="ligne-acwr" :points="ligne" />
        </svg>
      </div>
      <div class="gacwr-axe-x">
        <span>{{ formatDate(pointsValides[0].date) }}</span>
        <span>{{ formatDate(pointsValides[pointsValides.length - 1].date) }}</span>
      </div>
      <div class="gacwr-legende">
        <span class="gacwr-legende-item"><i class="dot surcharge"></i> Surcharge &gt;1,5</span>
        <span class="gacwr-legende-item"><i class="dot vigilance"></i> Vigilance 1,3-1,5</span>
        <span class="gacwr-legende-item"><i class="dot optimale"></i> Optimale 0,8-1,3</span>
        <span class="gacwr-legende-item"><i class="dot sous_charge"></i> Sous-charge &lt;0,8</span>
      </div>
    </template>
  </div>
</template>

<script>
import { computed } from 'vue'

const LARGEUR = 300
const HAUTEUR = 110
const MARGE = { haut: 6, bas: 6 }

export default {
  props: {
    // [{ date, acwr: Number|null }] triés du plus ancien au plus récent
    points: { type: Array, default: () => [] },
    // { valeur, zone, statut } — l'ACWR du jour courant
    actuel: { type: Object, required: true }
  },
  setup(props) {
    const pointsValides = computed(() => props.points.filter(p => p.acwr !== null && p.acwr !== undefined))
    const plafond = computed(() => Math.max(2, ...pointsValides.value.map(p => p.acwr)) + 0.1)

    const hauteurUtile = HAUTEUR - MARGE.haut - MARGE.bas
    const yPour = (valeur) => {
      const v = Math.min(valeur, plafond.value)
      return MARGE.haut + (1 - v / plafond.value) * hauteurUtile
    }

    const ligne = computed(() => {
      const n = pointsValides.value.length
      if (n === 0) return ''
      const pas = n > 1 ? LARGEUR / (n - 1) : 0
      return pointsValides.value
        .map((p, i) => `${n > 1 ? i * pas : LARGEUR / 2},${yPour(p.acwr)}`)
        .join(' ')
    })

    const libelleZone = (zone) => ({
      sous_charge: 'sous-charge', optimale: 'optimale', vigilance: 'vigilance', surcharge: 'surcharge'
    }[zone] || 'données insuffisantes')

    const formatDate = (d) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })

    return { pointsValides, plafond, yPour, ligne, libelleZone, formatDate }
  }
}
</script>

<style scoped>
.gacwr { display: flex; flex-direction: column; gap: 6px; }
.gacwr-head { display: flex; align-items: center; justify-content: space-between; gap: var(--spacing-sm); flex-wrap: wrap; }
.gacwr-label { font-size: var(--font-size-xs); font-weight: 700; color: var(--color-text-secondary); }
.gacwr-valeur { font-size: var(--font-size-lg); font-weight: 700; display: inline-flex; align-items: baseline; gap: 6px; }
.gacwr-zone-txt { font-size: var(--font-size-xs); font-weight: 600; text-transform: capitalize; }
.gacwr-valeur.zone-optimale { color: var(--color-valid-text-strong); }
.gacwr-valeur.zone-vigilance { color: var(--color-warning-text-strong); }
.gacwr-valeur.zone-surcharge { color: var(--color-danger-text); }
.gacwr-valeur.zone-sous_charge { color: var(--color-text-secondary); }
.gacwr-valeur.zone-insuffisant { color: var(--color-text-muted); font-size: var(--font-size-base); }
.gacwr-vide { font-size: var(--font-size-xs); color: var(--color-text-muted); font-style: italic; padding: var(--spacing-md) 0; }
.gacwr-plot { width: 100%; }
.gacwr-svg { width: 100%; height: 100px; display: block; border-radius: var(--radius-sm); overflow: hidden; }
.bande.sous_charge { fill: var(--color-bg-tertiary); }
.bande.optimale { fill: var(--color-valid-bg); }
.bande.vigilance { fill: var(--color-warning-bg); }
.bande.surcharge { fill: var(--color-danger-bg); }
.ligne-acwr { fill: none; stroke: var(--color-text); stroke-width: 2.5; }
.gacwr-axe-x { display: flex; justify-content: space-between; font-size: 10px; color: var(--color-text-muted); }
.gacwr-legende { display: flex; gap: var(--spacing-sm); flex-wrap: wrap; font-size: 10px; color: var(--color-text-muted); }
.gacwr-legende-item { display: inline-flex; align-items: center; gap: 4px; }
.dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
.dot.sous_charge { background: var(--color-text-muted); }
.dot.optimale { background: var(--color-valid-text-strong); }
.dot.vigilance { background: var(--color-warning-text-strong); }
.dot.surcharge { background: var(--color-danger-text); }
</style>
