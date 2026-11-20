<template>
  <div v-if="p" class="carte-niveau">
    <!-- Bandeau « Nuit néon » : le fond animé (WebGL) passe derrière la
         carte, qui reste lisible et cliquable par-dessus. -->
    <div class="niveau-bandeau">
      <FondNeon class="niveau-fond" :intensite="0.9" />
      <button type="button" class="niveau-ligne" @click="ouvert = true" aria-label="Voir mes titres et comment gagner de l'XP">
        <span class="niveau-icone"><i class="ti" :class="iconeActuelle"></i></span>
        <span class="niveau-info">
          <span class="niveau-tete">
            <strong>Niveau {{ p.niveau }}</strong>
            <span class="niveau-titre">{{ p.titre }}</span>
            <span v-if="p.serie_jours > 0" class="serie" :style="styleSerie" :title="`${p.serie_jours} jour(s) d'affilée`">
              <i class="ti ti-flame serie-flamme"></i>{{ p.serie_jours }} j
            </span>
          </span>
          <span class="jauge" role="progressbar" :aria-valuenow="p.xp_dans_niveau" aria-valuemin="0" :aria-valuemax="p.xp_niveau_suivant || p.xp_dans_niveau">
            <span ref="jaugeRemplie" class="jauge-remplie"></span>
          </span>
          <span class="niveau-xp">
            <template v-if="p.xp_niveau_suivant"><span ref="xpTexte"></span> / {{ fr(p.xp_niveau_suivant) }} XP</template>
            <template v-else>Niveau max · {{ fr(p.xp_total) }} XP</template>
            <span v-if="p.xp_aujourdhui" class="xp-jour">· +<span v-compteur="p.xp_aujourdhui"></span> aujourd'hui</span>
          </span>
        </span>
        <i class="ti ti-chevron-right niveau-chevron"></i>
      </button>
    </div>

    <div v-if="ouvert" class="modal-overlay" @click.self="ouvert = false">
      <div class="modal modal-badges">
        <div class="modal-header">
          <h3>Mes titres</h3>
          <button class="modal-close" @click="ouvert = false" aria-label="Fermer"><i class="ti ti-x"></i></button>
        </div>
        <div class="modal-body">
          <!-- Le titre en cours, en carte de collection à incliner -->
          <div class="titre-actuel">
            <CarteTitre
              taille="moyenne"
              inclinaison="scroll-y"
              :titre="p.titre"
              :niveau="p.niveau"
              :icone="iconeActuelle"
              :phrase="p.phrase || ''"
            />
            <span class="titre-actuel-niveau">{{ fr(p.xp_total) }} XP au total</span>
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
            <li v-for="b in p.badges" :key="b.niveau">
              <!-- Touché : la carte du titre, en grand (en silhouette s'il
                   reste à débloquer) -->
              <button
                type="button"
                class="echelon"
                :class="{ debloque: b.debloque, actuel: estActuel(b) }"
                :aria-label="`Voir la carte ${b.titre}`"
                @click="apercu = b"
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
              </button>
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

    <Transition name="apercu">
      <div
        v-if="apercu"
        ref="apercuEl"
        class="apercu-overlay"
        role="dialog"
        aria-modal="true"
        :aria-label="`Carte du titre ${apercu.titre}`"
        tabindex="-1"
        @click.self="apercu = null"
        @keydown.esc="apercu = null"
      >
        <CarteTitre
          :key="apercu.niveau"
          :titre="apercu.titre"
          :niveau="apercu.niveau"
          :icone="apercu.icone"
          :phrase="apercu.debloque ? apercu.phrase || '' : ''"
          :verrouillee="!apercu.debloque"
        />
        <button type="button" class="btn apercu-fermer" @click="apercu = null">Fermer</button>
      </div>
    </Transition>
  </div>
</template>

<script>
import { ref, computed, watch, nextTick, onBeforeUnmount } from 'vue'
import { animate, createTimeline } from 'animejs'
import { useProgressionStore, pourcentageNiveau } from '../../stores/progression'
import { animerNombre, mouvementReduit } from '../../animations/mouvement'
import FondNeon from '../FondNeon.vue'
import CarteTitre from './CarteTitre.vue'

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

// Après un gain, la jauge attend que la puce « +500 » partie de la pastille
// d'XP (CelebrationXp) l'ait rejointe.
const DELAI_GAIN_MS = 1350

// Niveau, titre, jauge d'XP et série en cours, en tête de l'accueil athlète.
export default {
  components: { FondNeon, CarteTitre },
  setup() {
    const store = useProgressionStore()
    const ouvert = ref(false)
    // Titre dont la carte est montrée en grand (échelle de « Mes titres »)
    const apercu = ref(null)
    const apercuEl = ref(null)
    const p = computed(() => store.progression)
    const iconeActuelle = computed(() => p.value?.badges.filter(b => b.debloque).pop()?.icone || 'ti-device-gamepad-2')
    // Le titre affiché est soit le titre lui-même, soit son évolution
    const estActuel = (b) => !!p.value && (p.value.titre === b.titre || p.value.titre === b.evolution?.titre)
    // Prochain titre ou adjectif à débloquer, dans l'ordre des niveaux
    const prochainTitre = computed(() => {
      const echelons = (p.value?.badges || []).flatMap(b => (b.evolution ? [b, b.evolution] : [b]))
      return echelons.find(e => !e.debloque) || null
    })
    // La flamme grossit et s'agite avec la série (plafond à 30 jours)
    const styleSerie = computed(() => ({
      '--flamme': (1 + (Math.min(p.value?.serie_jours || 0, 30) / 30) * 0.6).toFixed(2)
    }))
    const fr = (n) => Number(n).toLocaleString('fr-FR')

    // --- Jauge vivante : elle se remplit à l'affichage, puis suit chaque
    // gain depuis l'ancienne valeur (pleine, puis vide si un niveau passe) ---
    const jaugeRemplie = ref(null)
    const xpTexte = ref(null)
    let animations = []
    let affiche = null // { niveau, pct, xp } : ce que la jauge montre
    const etat = () => ({ niveau: p.value.niveau, pct: pourcentageNiveau(p.value), xp: p.value.xp_dans_niveau })
    const stopper = () => {
      animations.forEach(a => a?.pause())
      animations = []
    }
    const afficher = (cible, { depuis = null, delai = 0 } = {}) => {
      const el = jaugeRemplie.value
      if (!el) return
      stopper()
      const montee = !!depuis && cible.niveau > depuis.niveau
      if (xpTexte.value) {
        const xpDepart = depuis && !montee ? depuis.xp : 0
        animations.push(animerNombre(xpTexte.value, xpDepart, cible.xp, { delai: delai + (montee ? 500 : 0), duree: 1000 }))
      }
      if (mouvementReduit()) {
        el.style.width = `${cible.pct}%`
        return
      }
      const de = depuis?.pct ?? 0
      if (montee) {
        animations.push(
          createTimeline({ delay: delai })
            .add(el, { width: [`${de}%`, '100%'], duration: 500, ease: 'inQuad' })
            .add(el, { width: ['0%', `${cible.pct}%`], duration: 900, ease: 'outExpo' })
        )
      } else {
        animations.push(animate(el, { width: [`${de}%`, `${cible.pct}%`], duration: 1100, delay: delai, ease: 'outExpo' }))
      }
    }
    // Premier affichage (ou retour sur l'accueil) : depuis zéro
    watch(jaugeRemplie, (el) => {
      if (!el || !p.value) return
      affiche = etat()
      afficher(affiche, { delai: 250 })
    }, { flush: 'post' })
    // XP gagnée (ou perdue : séance supprimée) depuis
    watch(
      () => p.value && [p.value.niveau, p.value.xp_dans_niveau],
      () => {
        if (!jaugeRemplie.value || !affiche || !p.value) return
        const cible = etat()
        if (cible.niveau === affiche.niveau && cible.xp === affiche.xp) return
        const gain = cible.niveau > affiche.niveau || cible.xp > affiche.xp
        afficher(cible, { depuis: affiche, delai: gain ? DELAI_GAIN_MS : 0 })
        affiche = cible
      },
      { flush: 'post' }
    )
    onBeforeUnmount(stopper)

    // Focus sur l'aperçu : Échap le ferme
    watch(apercu, (b) => { if (b) nextTick(() => apercuEl.value?.focus({ preventScroll: true })) })

    return {
      p, ouvert, apercu, apercuEl, iconeActuelle, prochainTitre, estActuel, styleSerie, fr, BAREME,
      jaugeRemplie, xpTexte
    }
  }
}
</script>

<style scoped>
.carte-niveau { flex-shrink: 0; }

/* Bandeau néon : toujours de nuit, quel que soit le thème (comme la tuile
   du logo) — les couleurs du texte y sont donc fixes. */
.niveau-bandeau {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  border-radius: var(--radius-lg);
  box-shadow: 0 10px 28px -12px rgba(12, 10, 34, 0.65);
}
.niveau-fond { z-index: -1; }
.niveau-ligne {
  width: 100%;
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-lg);
  border: 1px solid rgba(194, 188, 255, 0.18);
  border-radius: inherit;
  background: linear-gradient(90deg, rgba(12, 10, 34, 0.55), rgba(12, 10, 34, 0.15));
  font-family: inherit;
  color: #F6F5FF;
  text-align: left;
  cursor: pointer;
  transition: border-color var(--transition-fast);
}
.niveau-ligne:hover { border-color: rgba(79, 227, 214, 0.6); }
.niveau-ligne:focus-visible { outline: 2px solid #4FE3D6; outline-offset: 2px; }
.niveau-icone {
  flex-shrink: 0;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #9D97E8, #5A51BE);
  color: #fff;
  font-size: 26px;
  box-shadow: 0 0 0 3px rgba(194, 188, 255, 0.2), 0 0 22px rgba(127, 119, 221, 0.7);
}
.niveau-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6px; }
.niveau-tete { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.niveau-tete strong { font-size: var(--font-size-base); font-weight: 800; }
.niveau-titre { font-size: var(--font-size-sm); font-weight: 600; color: #C2BCFF; }
.serie {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 2px 8px;
  border-radius: var(--radius-full);
  background: rgba(251, 191, 36, 0.16);
  color: #FCD34D;
  font-size: var(--font-size-xs);
  font-weight: 700;
}
/* --flamme (1 à 1,6) : plus la série est longue, plus elle est grande,
   rapide et lumineuse */
.serie-flamme {
  font-size: calc(var(--font-size-base) * var(--flamme, 1));
  color: #FB923C;
  filter: drop-shadow(0 0 calc(3px * var(--flamme, 1)) rgba(251, 146, 60, 0.85));
  animation: flamme calc(1.8s / var(--flamme, 1)) ease-in-out infinite;
  transform-origin: 50% 90%;
}
@keyframes flamme {
  0%, 100% { transform: scale(1) rotate(-4deg); }
  50% { transform: scale(1.18) rotate(4deg); }
}
.jauge { display: block; height: 8px; border-radius: var(--radius-full); background: rgba(194, 188, 255, 0.16); overflow: hidden; }
.jauge-remplie {
  position: relative;
  display: block;
  width: 0;
  height: 100%;
  overflow: hidden;
  border-radius: var(--radius-full);
  background: linear-gradient(90deg, #C2BCFF, #4FE3D6);
  box-shadow: 0 0 12px rgba(79, 227, 214, 0.65);
}
/* Reflet qui traverse la jauge de temps en temps */
.jauge-remplie::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.75), transparent);
  transform: translateX(-100%);
  animation: reflet 6s ease-in-out 1.6s infinite;
}
@keyframes reflet {
  0%, 78% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}
.niveau-xp { font-size: var(--font-size-xs); color: #A8A3CF; font-variant-numeric: tabular-nums; }
.xp-jour { color: #4FE3D6; font-weight: 600; }
.niveau-chevron { flex-shrink: 0; color: #A8A3CF; font-size: var(--font-size-lg); }

.modal-badges { max-width: 480px; }
.badges-resume { margin: 0; font-size: var(--font-size-sm); color: var(--color-text-secondary); }
.titre-actuel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-lg) 0 var(--spacing-sm);
}
.titre-actuel-niveau { font-size: var(--font-size-xs); color: var(--color-text-secondary); font-variant-numeric: tabular-nums; }

.echelle { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 2px; }
.echelon {
  width: 100%;
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: 6px var(--spacing-sm);
  border: none;
  border-radius: var(--radius-md);
  background: transparent;
  font: inherit;
  color: inherit;
  text-align: left;
  cursor: pointer;
  transition: background var(--transition-fast);
}
.echelon:hover { background: var(--color-bg-secondary); }
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

/* Aperçu d'une carte de titre, par-dessus « Mes titres » */
.apercu-overlay {
  position: fixed;
  inset: 0;
  z-index: 210;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-2xl);
  padding: var(--spacing-xl);
  background: radial-gradient(circle at 50% 40%, rgba(90, 81, 190, 0.45), rgba(12, 10, 34, 0.92) 65%);
  backdrop-filter: blur(5px);
  -webkit-backdrop-filter: blur(5px);
}
.apercu-overlay:focus { outline: none; }
.apercu-fermer {
  min-width: 160px;
  background: rgba(194, 188, 255, 0.14);
  border-color: rgba(194, 188, 255, 0.3);
  color: #F6F5FF;
}
.apercu-fermer:hover:not(:disabled) { background: rgba(194, 188, 255, 0.24); }
.apercu-enter-active { transition: opacity 0.25s ease; }
.apercu-enter-active .carte-titre { animation: apercu-carte 0.55s var(--ease-standard); }
.apercu-leave-active { transition: opacity 0.2s ease; }
.apercu-enter-from, .apercu-leave-to { opacity: 0; }
@keyframes apercu-carte {
  from { transform: translateY(24px) scale(0.85) rotate(-4deg); opacity: 0; }
}

@media (prefers-reduced-motion: reduce) {
  .serie-flamme, .jauge-remplie::after, .apercu-enter-active .carte-titre { animation: none; }
}
</style>
