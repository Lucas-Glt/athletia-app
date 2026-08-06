<template>
  <div class="courbe-obj">
    <div class="courbe-obj-head">
      <span class="courbe-obj-label">Poids (kg)</span>
      <span v-if="ecart" class="courbe-obj-badge" :class="ecart.classe">{{ ecart.texte }}</span>
    </div>

    <div v-if="reel.length < 1" class="courbe-obj-vide">
      Pesez-vous depuis l'onglet Poids pour voir votre courbe se tracer.
    </div>

    <template v-else>
      <div class="courbe-obj-plot">
        <div class="courbe-obj-axe-y">
          <span>{{ fr(bornes.max) }}</span>
          <span>{{ fr(bornes.min) }}</span>
        </div>
        <svg class="courbe-obj-svg" :viewBox="`0 0 ${L} ${H}`" preserveAspectRatio="none">
          <!-- Trajectoire visée : en pointillés, elle est une référence, pas
               une mesure. Tracée en premier pour passer sous les pesées. -->
          <polyline
            v-if="traceCible"
            class="courbe-obj-cible"
            :points="traceCible"
            vector-effect="non-scaling-stroke"
          />
          <polyline
            v-if="reel.length > 1"
            class="courbe-obj-reel"
            :points="traceReel"
            vector-effect="non-scaling-stroke"
          />
          <circle
            v-for="(p, i) in coordsReel"
            :key="i"
            class="courbe-obj-point"
            :cx="p.x"
            :cy="p.y"
            r="3.5"
          />
        </svg>
      </div>

      <div class="courbe-obj-axe-x">
        <span>{{ formatDate(domaine.debut) }}</span>
        <span>{{ formatDate(domaine.fin) }}</span>
      </div>

      <div class="courbe-obj-legende">
        <span class="courbe-obj-legende-item"><i class="trait-plein"></i> Vos pesées</span>
        <span class="courbe-obj-legende-item"><i class="trait-pointille"></i> Trajectoire visée</span>
      </div>
    </template>
  </div>
</template>

<script>
import { computed } from 'vue'

const L = 300
const H = 130
const MARGE = { haut: 10, bas: 10, gauche: 6, droite: 6 }

const enTimestamp = (iso) => new Date(`${iso}T00:00:00`).getTime()
const fr = (n) => Number(n).toLocaleString('fr-FR', { maximumFractionDigits: 1 })

export default {
  props: {
    // [{ date: 'YYYY-MM-DD', poids: Number }] triés du plus ancien au plus récent
    reel: { type: Array, default: () => [] },
    // Droite de référence, 2 ou 3 points (départ → poids visé → plateau)
    cible: { type: Array, default: () => [] },
    // 'perte' | 'prise' | 'maintien' : décide si s'éloigner du départ est bon
    objectif: { type: String, default: 'maintien' }
  },
  setup(props) {
    const tous = computed(() => [...props.reel, ...props.cible])

    // Axe X partagé par les deux séries : sans ça, une pesée et le point de
    // trajectoire du même jour ne tomberaient pas à la même abscisse.
    const domaine = computed(() => {
      const dates = tous.value.map(p => p.date)
      return {
        debut: dates.length ? dates.reduce((a, b) => (a < b ? a : b)) : null,
        fin: dates.length ? dates.reduce((a, b) => (a > b ? a : b)) : null
      }
    })

    // Échelle Y d'au moins 2 kg : sur une série presque plate, un domaine
    // calé au ras des valeurs transforme 100 g de variation en montagne.
    const bornes = computed(() => {
      const poids = tous.value.map(p => p.poids)
      if (!poids.length) return { min: 0, max: 1 }
      let min = Math.min(...poids)
      let max = Math.max(...poids)
      const marge = Math.max(0.5, (max - min) * 0.1)
      min -= marge
      max += marge
      if (max - min < 2) {
        const centre = (min + max) / 2
        min = centre - 1
        max = centre + 1
      }
      return { min: Math.round(min * 10) / 10, max: Math.round(max * 10) / 10 }
    })

    const projeter = (points) => {
      const { debut, fin } = domaine.value
      if (!debut) return []
      const t0 = enTimestamp(debut)
      const etendue = enTimestamp(fin) - t0
      const { min, max } = bornes.value
      const largeur = L - MARGE.gauche - MARGE.droite
      const hauteur = H - MARGE.haut - MARGE.bas

      return points.map(p => ({
        x: MARGE.gauche + (etendue ? ((enTimestamp(p.date) - t0) / etendue) * largeur : largeur / 2),
        y: MARGE.haut + (1 - (p.poids - min) / (max - min)) * hauteur
      }))
    }

    const enChaine = (coords) => coords.map(p => `${p.x},${p.y}`).join(' ')

    const coordsReel = computed(() => projeter(props.reel))
    const traceReel = computed(() => enChaine(coordsReel.value))
    const traceCible = computed(() =>
      props.cible.length > 1 ? enChaine(projeter(props.cible)) : ''
    )

    // Écart depuis la première pesée, lu comme bon ou mauvais selon l'objectif.
    const ecart = computed(() => {
      if (props.reel.length < 2) return null
      const delta = props.reel[props.reel.length - 1].poids - props.reel[0].poids
      const arrondi = Math.round(delta * 10) / 10
      if (arrondi === 0) return { texte: 'stable', classe: 'neutre' }
      const favorable = props.objectif === 'perte' ? arrondi < 0
        : props.objectif === 'prise' ? arrondi > 0
          : Math.abs(arrondi) < 1
      return {
        texte: `${arrondi > 0 ? '+' : ''}${fr(arrondi)} kg`,
        classe: favorable ? 'positif' : 'negatif'
      }
    })

    const formatDate = (iso) =>
      iso ? new Date(`${iso}T00:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : ''

    return { L, H, domaine, bornes, coordsReel, traceReel, traceCible, ecart, formatDate, fr }
  }
}
</script>

<style scoped>
.courbe-obj { display: flex; flex-direction: column; gap: 6px; }
.courbe-obj-head { display: flex; align-items: center; justify-content: space-between; gap: var(--spacing-sm); }
.courbe-obj-label { font-size: var(--font-size-xs); font-weight: 700; color: var(--color-text-secondary); }
.courbe-obj-badge {
  font-size: 11px;
  font-weight: 700;
  padding: 1px 7px;
  border-radius: var(--radius-full);
}
.courbe-obj-badge.positif { background: var(--color-valid-bg); color: var(--color-valid-text-strong); }
.courbe-obj-badge.negatif { background: var(--color-danger-bg); color: var(--color-danger-text); }
.courbe-obj-badge.neutre { background: var(--color-bg-tertiary); color: var(--color-text-muted); }

.courbe-obj-vide {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
  font-style: italic;
  padding: var(--spacing-md) 0;
}

.courbe-obj-plot { display: flex; align-items: stretch; gap: 6px; }
.courbe-obj-axe-y {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  font-size: 10px;
  color: var(--color-text-muted);
  flex-shrink: 0;
  text-align: right;
}
.courbe-obj-svg { flex: 1; width: 100%; height: 110px; display: block; }
.courbe-obj-reel { fill: none; stroke: var(--color-primary); stroke-width: 2; }
.courbe-obj-point { fill: var(--color-primary); }
.courbe-obj-cible {
  fill: none;
  stroke: var(--color-text-muted);
  stroke-width: 1.5;
  stroke-dasharray: 5 4;
}

.courbe-obj-axe-x {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  color: var(--color-text-muted);
  padding-left: 28px;
}
.courbe-obj-legende {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  font-size: 10px;
  color: var(--color-text-muted);
}
.courbe-obj-legende-item { display: inline-flex; align-items: center; gap: 4px; }
.courbe-obj-legende i { width: 14px; height: 0; display: inline-block; }
.trait-plein { border-top: 2px solid var(--color-primary); }
.trait-pointille { border-top: 2px dashed var(--color-text-muted); }
</style>
