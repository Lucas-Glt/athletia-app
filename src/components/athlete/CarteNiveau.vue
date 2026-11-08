<template>
  <div v-if="p" class="carte-niveau">
    <button type="button" class="niveau-ligne" @click="ouvert = true" aria-label="Voir mes titres et comment gagner de l'XP">
      <span class="niveau-icone"><i class="ti" :class="iconeActuelle"></i></span>
      <span class="niveau-info">
        <span class="niveau-tete">
          <strong>Niveau {{ p.niveau }}</strong>
          <span class="niveau-titre">{{ p.titre }}</span>
          <span v-if="p.serie_jours > 0" class="serie" :title="`${p.serie_jours} jour(s) d'affilée`">
            <i class="ti ti-flame serie-flamme"></i>{{ p.serie_jours }} j
          </span>
        </span>
        <span class="jauge" role="progressbar" :aria-valuenow="p.xp_dans_niveau" aria-valuemin="0" :aria-valuemax="p.xp_niveau_suivant || p.xp_dans_niveau">
          <span class="jauge-remplie" :style="{ width: `${pourcentage}%` }"></span>
        </span>
        <span class="niveau-xp">
          <template v-if="p.xp_niveau_suivant">{{ fr(p.xp_dans_niveau) }} / {{ fr(p.xp_niveau_suivant) }} XP</template>
          <template v-else>Niveau max · {{ fr(p.xp_total) }} XP</template>
          <span v-if="p.xp_aujourdhui" class="xp-jour">· +{{ fr(p.xp_aujourdhui) }} aujourd'hui</span>
        </span>
      </span>
      <i class="ti ti-chevron-right niveau-chevron"></i>
    </button>

    <div v-if="ouvert" class="modal-overlay" @click.self="ouvert = false">
      <div class="modal modal-badges">
        <div class="modal-header">
          <h3>Mes titres</h3>
          <button class="modal-close" @click="ouvert = false" aria-label="Fermer"><i class="ti ti-x"></i></button>
        </div>
        <div class="modal-body">
          <div class="titre-actuel">
            <span class="badge-rond"><i class="ti" :class="iconeActuelle"></i></span>
            <div class="titre-actuel-texte">
              <strong class="titre-actuel-nom">{{ p.titre }}</strong>
              <span class="titre-actuel-niveau">Niveau {{ p.niveau }} · {{ fr(p.xp_total) }} XP au total</span>
              <p v-if="p.phrase" class="titre-actuel-phrase">« {{ p.phrase }} »</p>
            </div>
          </div>
          <p class="badges-resume" v-if="p.xp_niveau_suivant">
            Plus que <strong>{{ fr(p.xp_niveau_suivant - p.xp_dans_niveau) }} XP</strong> avant le niveau {{ p.niveau + 1 }}.
            <template v-if="prochainTitre">
              Prochain titre : <strong>{{ prochainTitre.titre }}</strong> au niveau {{ prochainTitre.niveau }}.
            </template>
          </p>
          <p class="badges-resume" v-else>Niveau max atteint. Respect.</p>

          <!-- L'échelle des titres : la phrase se découvre en débloquant ; cinq
               niveaux après chaque titre, son évolution (le même + un adjectif) -->
          <ul class="echelle">
            <li
              v-for="b in p.badges"
              :key="b.niveau"
              class="echelon"
              :class="{ debloque: b.debloque, actuel: estActuel(b) }"
            >
              <span class="echelon-rond"><i class="ti" :class="b.debloque ? b.icone : 'ti-lock'"></i></span>
              <span class="echelon-texte">
                <span class="echelon-tete"><strong>{{ b.titre }}</strong><span class="echelon-niveau">niv. {{ b.niveau }}</span></span>
                <span v-if="b.debloque && b.phrase" class="echelon-phrase">{{ b.phrase }}</span>
                <span v-if="b.evolution" class="echelon-evolution" :class="{ debloque: b.evolution.debloque }">
                  <i class="ti" :class="b.evolution.debloque ? 'ti-chevrons-up' : 'ti-lock'"></i>
                  {{ b.evolution.titre }} · niv. {{ b.evolution.niveau }}
                </span>
              </span>
              <span v-if="estActuel(b)" class="echelon-toi">Toi</span>
            </li>
          </ul>

          <h4>Comment gagner de l'XP</h4>
          <ul class="bareme">
            <li v-for="l in BAREME" :key="l.label">
              <i class="ti" :class="l.icone"></i>
              <span>{{ l.label }}<small v-if="l.note">{{ l.note }}</small></span>
              <strong>{{ l.xp }}</strong>
            </li>
          </ul>
          <p class="bareme-note">100 niveaux, et chacun demande 500 XP de plus que le précédent : les premiers tombent vite, Légende se mérite sur des années.</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed } from 'vue'
import { useProgressionStore } from '../../stores/progression'

// Rappel du barème pour l'athlète. Le calcul, lui, ne vit que côté API
// (app/progression_calc.py) : garder ces libellés alignés dessus.
const BAREME = [
  { icone: 'ti-barbell', label: 'Séance validée', xp: '+500' },
  { icone: 'ti-heart-rate-monitor', label: 'Wellness du jour', xp: '+100' },
  { icone: 'ti-mood-smile', label: 'Ressenti de séance', xp: '+50' },
  { icone: 'ti-scale', label: 'Pesée', xp: '+50' },
  { icone: 'ti-salad', label: 'Repas renseigné', note: 'collation +25, 6 par jour au plus', xp: '+50' },
  { icone: 'ti-flame', label: 'Bonus régularité', note: 'par jour d\'affilée, jusqu\'à +250 par jour', xp: '+25' }
]

// Niveau, titre, jauge d'XP et série en cours, en tête de l'accueil athlète.
export default {
  setup() {
    const store = useProgressionStore()
    const ouvert = ref(false)
    const p = computed(() => store.progression)
    const pourcentage = computed(() => {
      if (!p.value) return 0
      // Niveau max : plus de niveau suivant, la jauge reste pleine
      if (!p.value.xp_niveau_suivant) return 100
      return Math.min(100, Math.round((p.value.xp_dans_niveau / p.value.xp_niveau_suivant) * 100))
    })
    const iconeActuelle = computed(() => p.value?.badges.filter(b => b.debloque).pop()?.icone || 'ti-device-gamepad-2')
    // Le titre affiché est soit le titre lui-même, soit son évolution
    const estActuel = (b) => !!p.value && (p.value.titre === b.titre || p.value.titre === b.evolution?.titre)
    // Prochain titre ou adjectif à débloquer, dans l'ordre des niveaux
    const prochainTitre = computed(() => {
      const echelons = (p.value?.badges || []).flatMap(b => (b.evolution ? [b, b.evolution] : [b]))
      return echelons.find(e => !e.debloque) || null
    })
    const fr = (n) => Number(n).toLocaleString('fr-FR')
    return { p, ouvert, pourcentage, iconeActuelle, prochainTitre, estActuel, fr, BAREME }
  }
}
</script>

<style scoped>
.carte-niveau { flex-shrink: 0; }
.niveau-ligne {
  width: 100%;
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-md) var(--spacing-lg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-bg);
  box-shadow: var(--shadow-card);
  font-family: inherit;
  color: inherit;
  text-align: left;
  cursor: pointer;
  transition: border-color var(--transition-fast);
}
.niveau-ligne:hover { border-color: var(--color-primary); }
.niveau-icone {
  flex-shrink: 0;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--gradient-primary);
  color: var(--color-on-primary);
  font-size: 24px;
  box-shadow: 0 6px 16px -6px rgba(83, 74, 183, 0.6);
}
.niveau-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 5px; }
.niveau-tete { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.niveau-tete strong { font-size: var(--font-size-base); font-weight: 800; }
.niveau-titre { font-size: var(--font-size-sm); font-weight: 600; color: var(--color-primary-dark); }
.serie {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 2px 8px;
  border-radius: var(--radius-full);
  background: var(--color-warning-bg);
  color: var(--color-warning-text-strong);
  font-size: var(--font-size-xs);
  font-weight: 700;
}
.serie-flamme { font-size: var(--font-size-base); animation: flamme 1.6s ease-in-out infinite; transform-origin: 50% 90%; }
@keyframes flamme {
  0%, 100% { transform: scale(1) rotate(-3deg); }
  50% { transform: scale(1.15) rotate(3deg); }
}
.jauge { display: block; height: 8px; border-radius: var(--radius-full); background: var(--color-bg-tertiary); overflow: hidden; }
.jauge-remplie {
  display: block;
  height: 100%;
  border-radius: var(--radius-full);
  background: var(--gradient-primary);
  transition: width 0.8s var(--ease-standard);
}
.niveau-xp { font-size: var(--font-size-xs); color: var(--color-text-secondary); font-variant-numeric: tabular-nums; }
.xp-jour { color: var(--color-valid-text-strong); font-weight: 600; }
.niveau-chevron { flex-shrink: 0; color: var(--color-text-muted); font-size: var(--font-size-lg); }

.modal-badges { max-width: 480px; }
.badges-resume { margin: 0; font-size: var(--font-size-sm); color: var(--color-text-secondary); }
.badge-rond {
  flex-shrink: 0;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26px;
  background: var(--gradient-primary);
  color: var(--color-on-primary);
  box-shadow: 0 6px 14px -6px rgba(83, 74, 183, 0.6);
}
.titre-actuel {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  border-radius: var(--radius-lg);
  background: var(--color-primary-light);
}
.titre-actuel-texte { min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.titre-actuel-nom { font-size: var(--font-size-lg); font-weight: 800; color: var(--color-text); }
.titre-actuel-niveau { font-size: var(--font-size-xs); color: var(--color-text-secondary); }
.titre-actuel-phrase { margin: 2px 0 0; font-size: var(--font-size-sm); font-style: italic; color: var(--color-primary-dark); }

.echelle { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 2px; }
.echelon {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: 6px var(--spacing-sm);
  border-radius: var(--radius-md);
}
.echelon-rond {
  flex-shrink: 0;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 17px;
  background: var(--color-bg-tertiary);
  color: var(--color-text-muted);
}
.echelon.debloque .echelon-rond { background: var(--gradient-primary); color: var(--color-on-primary); }
.echelon-texte { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.echelon-tete { display: flex; align-items: baseline; gap: 6px; }
.echelon-tete strong { font-size: var(--font-size-sm); font-weight: 700; color: var(--color-text); }
.echelon:not(.debloque) .echelon-tete strong { font-weight: 600; color: var(--color-text-muted); }
.echelon-niveau { font-size: 11px; color: var(--color-text-muted); white-space: nowrap; }
.echelon-phrase { font-size: var(--font-size-xs); color: var(--color-text-secondary); }
.echelon-evolution { display: inline-flex; align-items: center; gap: 4px; margin-top: 2px; font-size: 11px; color: var(--color-text-muted); }
.echelon-evolution.debloque { font-weight: 600; color: var(--color-primary-dark); }
.echelon.actuel { background: var(--color-primary-light); box-shadow: inset 0 0 0 1px var(--color-primary); }
.echelon-toi {
  flex-shrink: 0;
  padding: 2px 8px;
  border-radius: var(--radius-full);
  background: var(--color-primary);
  color: var(--color-on-primary);
  font-size: 11px;
  font-weight: 700;
}

.modal-body h4 { margin: var(--spacing-sm) 0 0; font-size: var(--font-size-sm); font-weight: 700; }
.bareme { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
.bareme li { display: flex; align-items: center; gap: var(--spacing-sm); font-size: var(--font-size-sm); }
.bareme li > .ti { color: var(--color-primary-dark); font-size: var(--font-size-lg); }
.bareme li span { flex: 1; display: flex; flex-direction: column; }
.bareme li small { font-size: var(--font-size-xs); color: var(--color-text-muted); }
.bareme li strong { color: var(--color-valid-text-strong); font-variant-numeric: tabular-nums; }
.bareme-note { margin: 0; font-size: var(--font-size-xs); color: var(--color-text-muted); }

@media (prefers-reduced-motion: reduce) {
  .serie-flamme { animation: none; }
}
</style>
