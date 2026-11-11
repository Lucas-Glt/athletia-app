<template>
  <!-- Répartition des calories de la journée entre les trois macros. Le
       camembert donne la proportion d'un coup d'œil ; la légende porte les
       grammes et les pourcentages, la couleur seule n'est jamais l'info. -->
  <div class="camembert">
    <svg class="camembert-svg" viewBox="0 0 100 100" role="img" :aria-label="resume">
      <circle v-if="!parts.length" class="camembert-vide" cx="50" cy="50" r="46" />
      <template v-for="p in parts" :key="p.cle">
        <circle
          v-if="p.chemin === null"
          class="camembert-part"
          :class="{ estompee: actif && actif !== p.cle }"
          cx="50" cy="50" r="48"
          :style="{ fill: p.couleur }"
          @mouseenter="actif = p.cle"
          @mouseleave="actif = null"
        ><title>{{ p.titre }}</title></circle>
        <path
          v-else
          class="camembert-part"
          :class="{ estompee: actif && actif !== p.cle }"
          :d="p.chemin"
          :style="{ fill: p.couleur }"
          @mouseenter="actif = p.cle"
          @mouseleave="actif = null"
        ><title>{{ p.titre }}</title></path>
      </template>
    </svg>

    <ul class="camembert-legende">
      <li
        v-for="m in macros"
        :key="m.cle"
        class="legende-ligne"
        :class="{ estompee: actif && actif !== m.cle }"
        @mouseenter="m.grammes > 0 && (actif = m.cle)"
        @mouseleave="actif = null"
      >
        <span class="legende-pastille" :style="{ background: m.couleur }"></span>
        <span class="legende-nom">{{ m.label }}</span>
        <span class="legende-g">
          <b>{{ fr(m.grammes) }}</b><template v-if="m.cible">/{{ fr(m.cible) }}</template> g
        </span>
        <span class="legende-pct">{{ m.pct === null ? '—' : `${m.pct} %` }}</span>
      </li>
    </ul>
  </div>
</template>

<script>
import { ref, computed } from 'vue'

// kcal par gramme : la part de chaque macro est une part de l'énergie, pas
// du poids — 30 g de lipides pèsent plus dans l'assiette calorique que 30 g
// de glucides.
const MACROS = [
  { cle: 'proteines', label: 'Protéines', kcalParG: 4, couleur: 'var(--color-macro-proteines)' },
  { cle: 'glucides', label: 'Glucides', kcalParG: 4, couleur: 'var(--color-macro-glucides)' },
  { cle: 'lipides', label: 'Lipides', kcalParG: 9, couleur: 'var(--color-macro-lipides)' }
]

// Pourcentages entiers qui totalisent 100 (méthode du plus fort reste) :
// sinon 33 + 33 + 33 affiche 99 % au total.
const pourcentages = (valeurs) => {
  const total = valeurs.reduce((a, b) => a + b, 0)
  const bruts = valeurs.map(v => (v / total) * 100)
  const entiers = bruts.map(Math.floor)
  let manque = 100 - entiers.reduce((a, b) => a + b, 0)
  bruts
    .map((b, i) => ({ i, reste: b - entiers[i] }))
    .sort((a, b) => b.reste - a.reste)
    .forEach(({ i }) => { if (manque > 0) { entiers[i]++; manque-- } })
  return entiers
}

const point = (angle, r = 48) => [50 + r * Math.cos(angle), 50 + r * Math.sin(angle)]
  .map(n => n.toFixed(3))
  .join(' ')

export default {
  props: {
    proteines: { type: Number, default: 0 },
    glucides: { type: Number, default: 0 },
    lipides: { type: Number, default: 0 },
    // Cible de protéines de l'objectif, si l'athlète en a un.
    proteinesCible: { type: Number, default: null }
  },
  setup(props) {
    const actif = ref(null)
    const fr = (n) => Number(n).toLocaleString('fr-FR', { maximumFractionDigits: 1 })

    const macros = computed(() => {
      const liste = MACROS.map(m => {
        const grammes = Math.max(0, props[m.cle] || 0)
        return { ...m, grammes, kcal: grammes * m.kcalParG }
      })
      const total = liste.reduce((a, m) => a + m.kcal, 0)
      const pcts = total > 0 ? pourcentages(liste.map(m => m.kcal)) : null
      return liste.map((m, i) => ({
        ...m,
        cible: m.cle === 'proteines' ? props.proteinesCible : null,
        part: total > 0 ? m.kcal / total : 0,
        pct: pcts ? pcts[i] : null
      }))
    })

    // Parts tracées dans le sens horaire depuis midi ; une part à 100 % est un
    // disque (un arc de 360° ne se dessine pas).
    const parts = computed(() => {
      let angle = -Math.PI / 2
      return macros.value
        .filter(m => m.part > 0)
        .map(m => {
          const titre = `${m.label} : ${fr(m.grammes)} g · ${m.pct} % des calories`
          if (m.part >= 0.9999) return { cle: m.cle, couleur: m.couleur, titre, chemin: null }
          const fin = angle + m.part * 2 * Math.PI
          const grandArc = m.part > 0.5 ? 1 : 0
          const chemin = `M 50 50 L ${point(angle)} A 48 48 0 ${grandArc} 1 ${point(fin)} Z`
          angle = fin
          return { cle: m.cle, couleur: m.couleur, titre, chemin }
        })
    })

    const resume = computed(() => {
      if (!parts.value.length) return 'Répartition des macros : rien de saisi'
      return 'Répartition des calories : ' + macros.value
        .map(m => `${m.label.toLowerCase()} ${m.pct} %`)
        .join(', ')
    })

    return { actif, fr, macros, parts, resume }
  }
}
</script>

<style scoped>
.camembert {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-lg);
  margin-top: var(--spacing-md);
  text-align: left;
}

.camembert-svg { width: 96px; height: 96px; flex-shrink: 0; overflow: visible; }

/* Liseré de la couleur du fond : un vide de 2 px entre deux parts voisines. */
.camembert-part {
  stroke: var(--color-primary-light);
  stroke-width: 2;
  stroke-linejoin: round;
  transition: opacity var(--transition-fast);
}
.camembert-vide {
  fill: none;
  stroke: var(--color-primary-lighter);
  stroke-width: 4;
}

.camembert-legende {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
  font-size: var(--font-size-xs);
  color: var(--color-primary-text);
}
.legende-ligne {
  display: grid;
  grid-template-columns: 10px auto 1fr auto;
  align-items: center;
  column-gap: 6px;
  transition: opacity var(--transition-fast);
}
.legende-pastille { width: 10px; height: 10px; border-radius: 3px; }
.legende-nom { font-weight: 600; }
.legende-g { text-align: right; padding-left: var(--spacing-sm); white-space: nowrap; }
.legende-g b { font-size: var(--font-size-sm); }
.legende-pct {
  min-width: 3.2em;
  text-align: right;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.estompee { opacity: 0.35; }
</style>
