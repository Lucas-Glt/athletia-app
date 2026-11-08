<template>
  <div v-if="p" class="carte-niveau">
    <button type="button" class="niveau-ligne" @click="ouvert = true" aria-label="Voir mes badges et comment gagner de l'XP">
      <span class="niveau-icone"><i class="ti" :class="iconeActuelle"></i></span>
      <span class="niveau-info">
        <span class="niveau-tete">
          <strong>Niveau {{ p.niveau }}</strong>
          <span class="niveau-titre">{{ p.titre }}</span>
          <span v-if="p.serie_jours > 0" class="serie" :title="`${p.serie_jours} jour(s) d'affilée`">
            <i class="ti ti-flame serie-flamme"></i>{{ p.serie_jours }} j
          </span>
        </span>
        <span class="jauge" role="progressbar" :aria-valuenow="p.xp_dans_niveau" aria-valuemin="0" :aria-valuemax="p.xp_niveau_suivant">
          <span class="jauge-remplie" :style="{ width: `${pourcentage}%` }"></span>
        </span>
        <span class="niveau-xp">
          {{ fr(p.xp_dans_niveau) }} / {{ fr(p.xp_niveau_suivant) }} XP
          <span v-if="p.xp_aujourdhui" class="xp-jour">· +{{ fr(p.xp_aujourdhui) }} aujourd'hui</span>
        </span>
      </span>
      <i class="ti ti-chevron-right niveau-chevron"></i>
    </button>

    <div v-if="ouvert" class="modal-overlay" @click.self="ouvert = false">
      <div class="modal modal-badges">
        <div class="modal-header">
          <h3>Mes badges</h3>
          <button class="modal-close" @click="ouvert = false" aria-label="Fermer"><i class="ti ti-x"></i></button>
        </div>
        <div class="modal-body">
          <p class="badges-resume">
            <strong>{{ fr(p.xp_total) }} XP</strong> au total · niveau {{ p.niveau }}, plus que
            <strong>{{ fr(p.xp_niveau_suivant - p.xp_dans_niveau) }} XP</strong> avant le suivant.
          </p>
          <div class="badges-grille">
            <div v-for="(b, i) in p.badges" :key="b.niveau" class="badge-item" :class="{ debloque: b.debloque }" :style="{ '--i': i }">
              <span class="badge-rond"><i class="ti" :class="b.debloque ? b.icone : 'ti-lock'"></i></span>
              <span class="badge-nom">{{ b.titre }}</span>
              <span class="badge-niveau">Niveau {{ b.niveau }}</span>
            </div>
          </div>

          <h4>Comment gagner de l'XP</h4>
          <ul class="bareme">
            <li v-for="l in BAREME" :key="l.label">
              <i class="ti" :class="l.icone"></i>
              <span>{{ l.label }}<small v-if="l.note">{{ l.note }}</small></span>
              <strong>{{ l.xp }}</strong>
            </li>
          </ul>
          <p class="bareme-note">Chaque niveau demande un peu plus d'XP que le précédent : les premiers tombent vite, les suivants se méritent.</p>
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
    const pourcentage = computed(() =>
      p.value ? Math.min(100, Math.round((p.value.xp_dans_niveau / p.value.xp_niveau_suivant) * 100)) : 0
    )
    const iconeActuelle = computed(() => p.value?.badges.filter(b => b.debloque).pop()?.icone || 'ti-seeding')
    const fr = (n) => Number(n).toLocaleString('fr-FR')
    return { p, ouvert, pourcentage, iconeActuelle, fr, BAREME }
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
.badges-grille { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--spacing-sm); }
.badge-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: var(--spacing-md) var(--spacing-xs);
  border-radius: var(--radius-lg);
  background: var(--color-bg-secondary);
  text-align: center;
  animation: badge-entree 0.4s var(--ease-standard) both;
  animation-delay: calc(var(--i) * 60ms);
}
@keyframes badge-entree { from { opacity: 0; transform: translateY(8px) scale(0.9); } }
.badge-rond {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  background: var(--color-bg-tertiary);
  color: var(--color-text-muted);
}
.badge-item.debloque { background: var(--color-primary-light); }
.badge-item.debloque .badge-rond { background: var(--gradient-primary); color: var(--color-on-primary); box-shadow: 0 6px 14px -6px rgba(83, 74, 183, 0.6); }
.badge-nom { font-size: var(--font-size-sm); font-weight: 700; color: var(--color-text); }
.badge-item:not(.debloque) .badge-nom { color: var(--color-text-muted); }
.badge-niveau { font-size: 11px; color: var(--color-text-muted); }

.modal-body h4 { margin: var(--spacing-sm) 0 0; font-size: var(--font-size-sm); font-weight: 700; }
.bareme { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
.bareme li { display: flex; align-items: center; gap: var(--spacing-sm); font-size: var(--font-size-sm); }
.bareme li > .ti { color: var(--color-primary-dark); font-size: var(--font-size-lg); }
.bareme li span { flex: 1; display: flex; flex-direction: column; }
.bareme li small { font-size: var(--font-size-xs); color: var(--color-text-muted); }
.bareme li strong { color: var(--color-valid-text-strong); font-variant-numeric: tabular-nums; }
.bareme-note { margin: 0; font-size: var(--font-size-xs); color: var(--color-text-muted); }

@media (prefers-reduced-motion: reduce) {
  .serie-flamme, .badge-item { animation: none; }
}
</style>
