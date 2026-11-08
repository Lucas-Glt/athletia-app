<template>
  <div class="modal-overlay" @click.self="$emit('fermer')">
    <div class="modal modal-recap" role="dialog" aria-modal="true" aria-labelledby="recap-titre">
      <div class="recap-entete">
        <span class="recap-icone"><i class="ti ti-confetti"></i></span>
        <div class="recap-entete-texte">
          <h3 id="recap-titre">Ta semaine</h3>
          <p v-if="recap">du {{ formatJour(recap.debut) }} au {{ formatJour(recap.fin) }}</p>
        </div>
        <button class="modal-close" @click="$emit('fermer')" aria-label="Fermer"><i class="ti ti-x"></i></button>
      </div>

      <div class="modal-body">
        <div v-if="!recap && !erreur" class="empty">Chargement...</div>
        <p v-else-if="erreur" class="error">{{ erreur }}</p>

        <template v-else>
          <div class="recap-chiffres">
            <div class="recap-chiffre" style="--i: 0">
              <strong>{{ affiche.seances }}</strong>
              <span>séance{{ recap.seances.length > 1 ? 's' : '' }}</span>
            </div>
            <div class="recap-chiffre recap-chiffre-xp" style="--i: 1">
              <strong>+{{ affiche.xp.toLocaleString('fr-FR') }}</strong>
              <span>XP gagnée</span>
            </div>
            <div class="recap-chiffre" style="--i: 2">
              <strong>{{ affiche.jours }}<small>/7</small></strong>
              <span>jours actifs</span>
            </div>
          </div>

          <p class="recap-mot">{{ motDeLaSemaine }}</p>

          <section v-if="recap.seances.length" class="recap-section">
            <h4>Séances faites</h4>
            <ul class="recap-seances">
              <li v-for="(s, i) in recap.seances" :key="i" :style="{ '--i': i + 3 }">
                <span class="type-icone" :class="`type-icone-${typeSeance(s.type_seance)}`"><i class="ti" :class="iconeTypeSeance(s.type_seance)"></i></span>
                <span class="recap-seance-nom">{{ s.nom }}</span>
                <span class="recap-seance-date">{{ formatJourCourt(s.date) }}</span>
              </li>
            </ul>
          </section>

          <section class="recap-section">
            <h4>Ton suivi</h4>
            <div class="recap-ligne">
              <i class="ti ti-heart-rate-monitor"></i> Wellness
              <strong>{{ recap.wellness_remplis }}/7 jours</strong>
            </div>
            <div class="recap-ligne" v-if="recap.sommeil_moyen !== null">
              <i class="ti ti-zzz"></i> Sommeil moyen
              <strong>{{ formatHeures(recap.sommeil_moyen) }}</strong>
            </div>
            <div class="recap-ligne" v-if="recap.poids">
              <i class="ti ti-scale"></i> Poids
              <strong>{{ fr(recap.poids.debut) }} → {{ fr(recap.poids.fin) }} kg</strong>
            </div>
            <div class="recap-ligne" v-if="recap.diete">
              <i class="ti ti-salad"></i> Diète
              <span class="recap-diete">
                <span class="pastille pastille-reussi"></span>{{ recap.diete.reussis }}
                <span class="pastille pastille-proche"></span>{{ recap.diete.proches }}
                <span class="pastille pastille-loin"></span>{{ recap.diete.loin }}
              </span>
            </div>
          </section>

          <div class="recap-pied">
            <i class="ti ti-medal"></i> Niveau {{ recap.niveau }} · {{ recap.titre }}
            <span v-if="recap.serie_jours" class="recap-serie"><i class="ti ti-flame"></i> {{ recap.serie_jours }} j d'affilée</span>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { useApi } from '../../services/api'
import { typeSeance, iconeTypeSeance } from '../../data/typesSeance'
import { formatHeures } from '../../data/sommeil'

const DUREE_COMPTEUR_MS = 900

// Récap de la semaine écoulée (lundi → dimanche), proposé par une bannière
// en début de semaine. Les gros chiffres défilent de 0 à leur valeur.
export default {
  emits: ['fermer'],
  setup() {
    const api = useApi()
    const recap = ref(null)
    const erreur = ref('')
    const affiche = ref({ seances: 0, xp: 0, jours: 0 })

    const animer = (cibles) => {
      const reduit = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
      if (reduit) { affiche.value = cibles; return }
      const debut = performance.now()
      const etape = (maintenant) => {
        const t = Math.min(1, (maintenant - debut) / DUREE_COMPTEUR_MS)
        const ease = 1 - Math.pow(1 - t, 3)
        affiche.value = {
          seances: Math.round(cibles.seances * ease),
          xp: Math.round(cibles.xp * ease),
          jours: Math.round(cibles.jours * ease)
        }
        if (t < 1) requestAnimationFrame(etape)
      }
      requestAnimationFrame(etape)
      // Filet : sans affichage (onglet en arrière-plan), requestAnimationFrame
      // ne tourne pas et les chiffres resteraient à 0.
      setTimeout(() => { affiche.value = cibles }, DUREE_COMPTEUR_MS + 100)
    }

    onMounted(async () => {
      try {
        recap.value = await api.get('/progression/recap-semaine')
        animer({ seances: recap.value.seances.length, xp: recap.value.xp_gagne, jours: recap.value.jours_actifs })
      } catch (e) {
        erreur.value = e.message || 'Récap indisponible pour le moment.'
      }
    })

    const motDeLaSemaine = computed(() => {
      const n = recap.value?.seances.length || 0
      if (n >= 5) return 'Semaine de monstre. Rien à ajouter : continue !'
      if (n >= 3) return 'Grosse semaine, bien joué. Garde ce rythme !'
      if (n >= 1) return 'Bon début. Vise une séance de plus cette semaine !'
      return 'Nouvelle semaine, nouveau départ : on s\'y remet ?'
    })

    // « 'YYYY-MM-DD' » lu comme un jour local (Date le lirait en UTC)
    const versDate = (iso) => {
      const [a, m, j] = iso.split('-').map(Number)
      return new Date(a, m - 1, j)
    }
    const formatJour = (iso) => versDate(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
    const formatJourCourt = (iso) => versDate(iso).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' })
    const fr = (n) => Number(n).toLocaleString('fr-FR')

    return {
      recap, erreur, affiche, motDeLaSemaine,
      formatJour, formatJourCourt, formatHeures, fr, typeSeance, iconeTypeSeance
    }
  }
}
</script>

<style scoped>
.modal-recap { max-width: 420px; }
.recap-entete {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-lg) var(--spacing-xl);
  background: var(--gradient-primary);
  color: var(--color-on-primary);
}
.recap-icone {
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-lg);
  background: rgba(255, 255, 255, 0.18);
  font-size: 24px;
  animation: secousse 1.2s ease 0.3s both;
}
@keyframes secousse {
  0%, 100% { transform: rotate(0); }
  20% { transform: rotate(-14deg) scale(1.1); }
  40% { transform: rotate(10deg) scale(1.1); }
  60% { transform: rotate(-6deg); }
}
.recap-entete-texte { flex: 1; min-width: 0; }
.recap-entete h3 { margin: 0; font-size: var(--font-size-lg); font-weight: 800; }
.recap-entete p { margin: 0; font-size: var(--font-size-sm); opacity: 0.9; }
.recap-entete .modal-close { color: inherit; }

.recap-chiffres { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--spacing-sm); }
.recap-chiffre {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: var(--spacing-md) var(--spacing-xs);
  border-radius: var(--radius-lg);
  background: var(--color-bg-secondary);
  text-align: center;
  animation: monte 0.45s var(--ease-standard) both;
  animation-delay: calc(var(--i) * 90ms);
}
.recap-chiffre strong { font-size: var(--font-size-2xl); font-weight: 800; letter-spacing: -0.5px; font-variant-numeric: tabular-nums; }
.recap-chiffre strong small { font-size: var(--font-size-sm); color: var(--color-text-muted); }
.recap-chiffre span { font-size: var(--font-size-xs); color: var(--color-text-secondary); }
.recap-chiffre-xp { background: var(--color-primary-light); }
.recap-chiffre-xp strong { color: var(--color-primary-dark); }
@keyframes monte { from { opacity: 0; transform: translateY(10px); } }

.recap-mot { margin: 0; text-align: center; font-weight: 700; color: var(--color-text); }

.recap-section { display: flex; flex-direction: column; gap: 6px; }
.recap-section h4 { margin: 0; font-size: var(--font-size-xs); font-weight: 700; text-transform: uppercase; letter-spacing: 0.4px; color: var(--color-text-muted); }
.recap-seances { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
.recap-seances li {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  animation: monte 0.4s var(--ease-standard) both;
  animation-delay: calc(var(--i) * 70ms);
}
.recap-seance-nom { flex: 1; min-width: 0; font-size: var(--font-size-sm); font-weight: 600; }
.recap-seance-date { font-size: var(--font-size-xs); color: var(--color-text-muted); text-transform: capitalize; }
.recap-ligne { display: flex; align-items: center; gap: var(--spacing-sm); font-size: var(--font-size-sm); color: var(--color-text-secondary); }
.recap-ligne > .ti { color: var(--color-primary-dark); font-size: var(--font-size-lg); }
.recap-ligne strong, .recap-diete { margin-left: auto; color: var(--color-text); font-weight: 700; }
.recap-diete { display: inline-flex; align-items: center; gap: 4px; }
.pastille { width: 10px; height: 10px; border-radius: 50%; margin-left: 6px; }
.pastille-reussi { background: var(--color-valid-text); }
.pastille-proche { background: var(--color-warning-icon); }
.pastille-loin { background: var(--color-danger-text); }

.recap-pied {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  padding-top: var(--spacing-md);
  border-top: 1px solid var(--color-border);
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-primary-dark);
}
.recap-serie { margin-left: auto; color: var(--color-warning-text-strong); }

@media (prefers-reduced-motion: reduce) {
  .recap-icone, .recap-chiffre, .recap-seances li { animation: none; }
}
</style>
