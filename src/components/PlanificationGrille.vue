<template>
  <!-- Une ligne par mois, une case par semaine (repérée par son lundi),
       colorée par son développement. Modifiable chez le prépa (les cases
       sont des boutons), en lecture seule chez l'athlète. -->
  <div class="grille-planif" :class="{ 'est-editable': editable }">
    <div v-for="(m, i) in mois" :key="m.cle" class="mois-ligne">
      <span class="mois-label">
        {{ m.label }}
        <small v-if="i === 0 || m.cle.endsWith('-01')">{{ m.annee }}</small>
      </span>
      <div class="mois-semaines">
        <component
          :is="editable ? 'button' : 'span'"
          v-for="lundi in m.lundis"
          :key="lundi"
          :type="editable ? 'button' : undefined"
          class="semaine"
          :class="{
            'est-planifiee': !!semaines[lundi],
            'est-courante': lundi === courant,
            'est-passee': lundi < courant,
            'est-choisie': estChoisie(lundi)
          }"
          :style="semaines[lundi] ? { '--fond': developpement(semaines[lundi]).couleur, '--encre': developpement(semaines[lundi]).texte } : null"
          :title="titre(lundi)"
          :aria-label="titre(lundi)"
          :aria-pressed="editable ? String(estChoisie(lundi)) : undefined"
          @click="editable && $emit('choisir', lundi)"
        >
          <span class="semaine-jour">{{ Number(lundi.slice(8)) }}</span>
          <i v-if="semaines[lundi]" class="ti semaine-icone" :class="developpement(semaines[lundi]).icone" aria-hidden="true"></i>
        </component>
      </div>
    </div>
  </div>
</template>

<script>
import { computed } from 'vue'
import { developpement } from '../data/developpements'
import { formatJour, lundiCourant, moisDeLaGrille } from '../utils/planification'

export default {
  emits: ['choisir'],
  props: {
    // { 'AAAA-MM-JJ' (lundi): clé de développement }
    semaines: { type: Object, required: true },
    premierMois: { type: Date, required: true },
    nbMois: { type: Number, default: 12 },
    editable: { type: Boolean, default: false },
    // Période choisie (lundis, debut <= fin)
    choix: { type: Object, default: null }
  },
  setup(props) {
    const mois = computed(() => moisDeLaGrille(props.premierMois, props.nbMois))
    const courant = lundiCourant()
    const estChoisie = (lundi) => !!props.choix && props.choix.debut <= lundi && lundi <= props.choix.fin
    const titre = (lundi) => {
      const dev = props.semaines[lundi]
      const quand = lundi === courant ? `Cette semaine (${formatJour(lundi)})` : `Semaine du ${formatJour(lundi)}`
      return `${quand} : ${dev ? developpement(dev).label : 'non planifiée'}`
    }
    return { mois, courant, estChoisie, titre, developpement }
  }
}
</script>

<style scoped>
.grille-planif { display: flex; flex-direction: column; gap: 6px; }
.mois-ligne { display: grid; grid-template-columns: 56px minmax(0, 1fr); align-items: center; gap: var(--spacing-sm); }
.mois-label {
  font-size: var(--font-size-xs);
  font-weight: 700;
  color: var(--color-text-secondary);
  text-transform: capitalize;
  line-height: 1.1;
}
.mois-label small { display: block; font-weight: 500; color: var(--color-text-muted); }
/* Cinq colonnes pour tous les mois : les semaines restent alignées d'un
   mois à l'autre, un mois de quatre lundis laisse sa dernière case vide. */
.mois-semaines { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 6px; }

.semaine {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 40px;
  padding: 0;
  border: 1px dashed var(--color-border-strong);
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-text-muted);
  font: inherit;
  font-size: var(--font-size-xs);
  -webkit-tap-highlight-color: transparent;
}
.semaine.est-planifiee {
  border: none;
  background: var(--fond);
  color: var(--encre);
}
.semaine-jour { font-weight: 600; }
.semaine.est-planifiee .semaine-jour {
  position: absolute;
  top: 2px;
  left: 5px;
  font-size: 10px;
  opacity: 0.85;
}
.semaine-icone { font-size: 17px; }
/* Le passé s'efface un peu : l'œil va à ce qui vient */
.semaine.est-passee { opacity: 0.45; }
.semaine.est-courante { opacity: 1; box-shadow: 0 0 0 2px var(--color-bg), 0 0 0 4px var(--color-text); }

.est-editable .semaine { cursor: pointer; transition: transform var(--transition-fast); }
.est-editable .semaine:hover { transform: translateY(-1px); }
.est-editable .semaine:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }
.semaine.est-choisie {
  opacity: 1;
  box-shadow: 0 0 0 2px var(--color-bg), 0 0 0 4px var(--color-primary);
  transform: scale(0.94);
}
.semaine.est-choisie:not(.est-planifiee) { background: var(--color-primary-light); border-style: solid; border-color: var(--color-primary); }
@media (prefers-reduced-motion: reduce) {
  .est-editable .semaine { transition: none; }
}
</style>
