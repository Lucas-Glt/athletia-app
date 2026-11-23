<template>
  <div class="gcj">
    <div class="gcj-entete">
      <span class="gcj-titre">Charge des 14 derniers jours</span>
      <span class="gcj-totaux">
        7 derniers jours <strong>{{ fr(totalRecent) }} UA</strong>
        <span class="gcj-avant">· 7 précédents {{ fr(totalAvant) }} UA</span>
      </span>
    </div>

    <p v-if="maxJour === 0" class="gcj-vide">Aucune charge enregistrée ces 14 derniers jours.</p>

    <template v-else>
      <div class="gcj-zone">
        <!-- Graduations : 0, la moitié et le haut de l'échelle -->
        <div class="gcj-grille" aria-hidden="true">
          <span v-for="g in graduations" :key="g" class="gcj-ligne" :style="{ bottom: `${(g / echelle) * 100}%` }">
            <span class="gcj-graduation">{{ fr(g) }}</span>
          </span>
        </div>
        <div class="gcj-colonnes" role="list" aria-label="Charge par jour">
          <button
            v-for="(j, i) in jours"
            :key="j.date"
            type="button"
            role="listitem"
            class="gcj-colonne"
            :class="{ recent: i >= jours.length - 7, active: jourChoisi === j.date }"
            :aria-label="descriptionJour(j)"
            @mouseenter="jourChoisi = j.date"
            @focus="jourChoisi = j.date"
            @click="jourChoisi = j.date"
          >
            <span class="gcj-barre" :style="{ height: totalJour(j) ? `max(4px, ${(totalJour(j) / echelle) * 100}%)` : '0' }">
              <span
                v-for="(p, k) in partsTriees(j)"
                :key="k"
                class="gcj-part"
                :class="{ libre: p.hors_programme }"
                :style="{ flexGrow: p.charge, '--c': couleur(p.type_seance) }"
              ></span>
            </span>
            <span v-if="j.sans_ressenti" class="gcj-sans-ressenti" aria-hidden="true"></span>
          </button>
        </div>
      </div>
      <div class="gcj-axe" aria-hidden="true">
        <span v-for="(j, i) in jours" :key="j.date" class="gcj-jour" :class="{ aujourdhui: i === jours.length - 1 }">
          <span>{{ initialeJour(j.date) }}</span>
          <span>{{ Number(j.date.slice(8, 10)) }}</span>
        </span>
      </div>

      <!-- Détail du jour survolé ou touché (par défaut, le dernier jour chargé) -->
      <p class="gcj-detail" aria-live="polite">
        <strong>{{ libelleJour(jourDetail.date) }}</strong>
        <template v-if="jourDetail.parts.length">
          · <template v-for="(p, k) in partsTriees(jourDetail)" :key="k">{{ k ? ' · ' : '' }}{{ labelTypeSeance(p.type_seance) }}{{ p.hors_programme ? ' (hors programme)' : '' }} {{ fr(p.charge) }} UA</template>
        </template>
        <template v-else> · aucune charge</template>
        <template v-if="jourDetail.sans_ressenti"> · {{ jourDetail.sans_ressenti }} séance{{ jourDetail.sans_ressenti > 1 ? 's' : '' }} sans ressenti</template>
      </p>

      <div class="gcj-legende">
        <span v-for="t in typesPresents" :key="t" class="gcj-cle">
          <span class="gcj-pastille" :style="{ '--c': couleur(t) }"></span>{{ labelTypeSeance(t) }}
        </span>
        <span v-if="avecHorsProgramme" class="gcj-cle">
          <span class="gcj-pastille libre" style="--c: var(--color-text-secondary)"></span>hachuré : hors programme
        </span>
        <span v-if="avecSansRessenti" class="gcj-cle">
          <span class="gcj-rond"></span>séance sans ressenti (pas de charge)
        </span>
      </div>

      <details class="gcj-tableau">
        <summary>Voir en tableau</summary>
        <table>
          <thead><tr><th>Jour</th><th>Détail</th><th>Total</th></tr></thead>
          <tbody>
            <tr v-for="j in [...jours].reverse()" :key="j.date">
              <td>{{ libelleJour(j.date) }}</td>
              <td>
                <template v-for="(p, k) in partsTriees(j)" :key="k">{{ k ? ', ' : '' }}{{ labelTypeSeance(p.type_seance) }}{{ p.hors_programme ? ' (hors programme)' : '' }} {{ fr(p.charge) }}</template>
                <template v-if="j.sans_ressenti">{{ j.parts.length ? ', ' : '' }}{{ j.sans_ressenti }} sans ressenti</template>
                <template v-if="!j.parts.length && !j.sans_ressenti">—</template>
              </td>
              <td>{{ fr(totalJour(j)) }} UA</td>
            </tr>
          </tbody>
        </table>
      </details>
    </template>
  </div>
</template>

<script>
import { ref, computed } from 'vue'
import { labelTypeSeance } from '../../data/typesSeance'
import { libelleJour } from '../../data/seancesRealisees'

// Ordre d'empilement = ordre de la palette validée (cf. --color-chart-* dans
// tokens.css) : du bas vers le haut de chaque barre.
const ORDRE_TYPES = ['natation', 'pliometrie', 'match', 'autre', 'musculation', 'athletisme']
const rangType = (t) => (ORDRE_TYPES.includes(t) ? ORDRE_TYPES.indexOf(t) : ORDRE_TYPES.indexOf('musculation'))

// Charge (sRPE) jour par jour sur deux semaines, empilée par type de séance ;
// la part faite hors programme est hachurée. Lecture seule, côté prépa.
export default {
  props: {
    // [{ date, parts: [{ type_seance, hors_programme, charge }], sans_ressenti }]
    // (GET /monitoring/athlete/{id} → charge_par_type), du plus ancien au plus récent
    jours: { type: Array, default: () => [] }
  },
  setup(props) {
    const fr = (n) => Math.round(n || 0).toLocaleString('fr-FR')
    const totalJour = (j) => j.parts.reduce((t, p) => t + p.charge, 0)
    const partsTriees = (j) =>
      [...j.parts].sort((a, b) => rangType(a.type_seance) - rangType(b.type_seance) || Number(a.hors_programme) - Number(b.hors_programme))
    const couleur = (t) => `var(--color-chart-${ORDRE_TYPES.includes(t) ? t : 'musculation'})`

    const maxJour = computed(() => Math.max(0, ...props.jours.map(totalJour)))
    // Échelle arrondie à un nombre rond, pour des graduations lisibles
    const echelle = computed(() => {
      const max = maxJour.value
      if (!max) return 1
      const pas = 10 ** Math.floor(Math.log10(max))
      return Math.ceil(max / (pas / 2)) * (pas / 2)
    })
    const graduations = computed(() => [0, echelle.value / 2, echelle.value])

    const totalRecent = computed(() => props.jours.slice(-7).reduce((t, j) => t + totalJour(j), 0))
    const totalAvant = computed(() => props.jours.slice(0, -7).reduce((t, j) => t + totalJour(j), 0))

    const typesPresents = computed(() => {
      const presents = new Set(props.jours.flatMap((j) => j.parts.map((p) => p.type_seance)))
      return [...presents].sort((a, b) => rangType(a) - rangType(b))
    })
    const avecHorsProgramme = computed(() => props.jours.some((j) => j.parts.some((p) => p.hors_programme)))
    const avecSansRessenti = computed(() => props.jours.some((j) => j.sans_ressenti))

    // Jour détaillé : survolé ou touché, sinon le dernier jour avec de la charge
    const jourChoisi = ref(null)
    const jourDetail = computed(() =>
      props.jours.find((j) => j.date === jourChoisi.value) ||
      [...props.jours].reverse().find((j) => j.parts.length) ||
      props.jours[props.jours.length - 1] || { date: '', parts: [], sans_ressenti: 0 }
    )

    const initialeJour = (iso) => ['D', 'L', 'M', 'M', 'J', 'V', 'S'][new Date(`${iso}T12:00:00`).getDay()]
    const descriptionJour = (j) => {
      const parts = partsTriees(j).map((p) => `${labelTypeSeance(p.type_seance)}${p.hors_programme ? ' hors programme' : ''} ${fr(p.charge)} UA`)
      return `${libelleJour(j.date)} : ${parts.length ? parts.join(', ') : 'aucune charge'}`
    }

    return {
      fr, totalJour, partsTriees, couleur, maxJour, echelle, graduations, totalRecent, totalAvant,
      typesPresents, avecHorsProgramme, avecSansRessenti, jourChoisi, jourDetail,
      initialeJour, descriptionJour, libelleJour, labelTypeSeance
    }
  }
}
</script>

<style scoped>
.gcj { display: flex; flex-direction: column; gap: var(--spacing-sm); }
.gcj-entete { display: flex; align-items: baseline; justify-content: space-between; gap: 4px var(--spacing-md); flex-wrap: wrap; }
.gcj-titre { font-size: var(--font-size-sm); font-weight: 700; color: var(--color-text); }
.gcj-totaux { font-size: var(--font-size-xs); color: var(--color-text-secondary); font-variant-numeric: tabular-nums; }
.gcj-totaux strong { color: var(--color-text); }
.gcj-avant { color: var(--color-text-muted); }
.gcj-vide { margin: 0; padding: var(--spacing-lg) 0; font-size: var(--font-size-sm); color: var(--color-text-muted); }

/* Zone de tracé : graduations derrière, colonnes devant */
.gcj-zone { position: relative; height: 160px; margin-left: 36px; margin-top: 8px; }
.gcj-grille { position: absolute; inset: 0; pointer-events: none; }
.gcj-ligne { position: absolute; left: 0; right: 0; height: 1px; background: var(--color-chart-grille); }
.gcj-graduation {
  position: absolute; right: calc(100% + 6px); top: -7px;
  font-size: 10px; color: var(--color-text-muted); font-variant-numeric: tabular-nums; white-space: nowrap;
}
.gcj-colonnes { position: absolute; inset: 0; display: grid; grid-template-columns: repeat(14, minmax(0, 1fr)); }
.gcj-colonne {
  position: relative; display: flex; align-items: flex-end; justify-content: center;
  height: 100%; padding: 0; border: none; border-radius: var(--radius-sm);
  background: transparent; cursor: pointer;
}
/* Les 7 derniers jours sur une bande à peine marquée */
.gcj-colonne.recent { background: color-mix(in srgb, var(--color-primary) 5%, transparent); }
.gcj-colonne.active, .gcj-colonne:hover { background: color-mix(in srgb, var(--color-primary) 12%, transparent); }
.gcj-colonne:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 1px; }
.gcj-barre {
  display: flex; flex-direction: column-reverse; gap: 2px;
  width: min(24px, 70%); min-height: 0;
  border-radius: 4px 4px 0 0; overflow: hidden;
}
.gcj-part { flex-basis: 0; min-height: 3px; background: var(--c); }
/* Hors programme : la même teinte, hachurée */
.gcj-part.libre, .gcj-pastille.libre {
  background: repeating-linear-gradient(135deg, var(--c) 0 3px, color-mix(in srgb, var(--c) 30%, var(--color-bg)) 3px 6px);
}
.gcj-sans-ressenti {
  position: absolute; bottom: 4px; left: 50%; transform: translateX(-50%);
  width: 8px; height: 8px; border-radius: 50%;
  border: 2px solid var(--color-text-muted); background: var(--color-bg);
}

.gcj-axe { display: grid; grid-template-columns: repeat(14, minmax(0, 1fr)); margin-left: 36px; }
.gcj-jour { display: flex; flex-direction: column; align-items: center; font-size: 10px; line-height: 1.25; color: var(--color-text-muted); font-variant-numeric: tabular-nums; }
.gcj-jour.aujourdhui { color: var(--color-text); font-weight: 700; }

.gcj-detail { margin: 2px 0 0; min-height: 1.4em; font-size: var(--font-size-xs); color: var(--color-text-secondary); }
.gcj-detail strong { color: var(--color-text); }

.gcj-legende { display: flex; flex-wrap: wrap; gap: 4px var(--spacing-md); font-size: var(--font-size-xs); color: var(--color-text-secondary); }
.gcj-cle { display: inline-flex; align-items: center; gap: 5px; }
.gcj-pastille { width: 12px; height: 12px; border-radius: 3px; background: var(--c); }
.gcj-rond { width: 8px; height: 8px; border-radius: 50%; border: 2px solid var(--color-text-muted); }

.gcj-tableau summary { cursor: pointer; font-size: var(--font-size-xs); font-weight: 600; color: var(--color-primary-text); }
.gcj-tableau table { width: 100%; margin-top: var(--spacing-sm); border-collapse: collapse; font-size: var(--font-size-xs); }
.gcj-tableau th, .gcj-tableau td { padding: 4px 6px; border-bottom: 1px solid var(--color-border); text-align: left; vertical-align: top; }
.gcj-tableau th { color: var(--color-text-muted); font-weight: 600; }
.gcj-tableau td:last-child, .gcj-tableau th:last-child { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
</style>
