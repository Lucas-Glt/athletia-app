<template>
  <!-- Récap de la semaine en « story » plein écran : une diapo à la fois,
       qui avance seule (barres en haut). Toucher à droite : suivante, à
       gauche : précédente, appui long : pause. Clavier : flèches, Échap. -->
  <div
    ref="racine"
    class="story"
    role="dialog"
    aria-modal="true"
    aria-label="Ton récap de la semaine"
    tabindex="-1"
    @keydown="clavier"
  >
    <FondNeon class="story-fond" :intensite="0.6" :vitesse="1.4" />

    <div class="story-haut">
      <div class="story-barres" aria-hidden="true">
        <span v-for="(d, i) in diapos" :key="d" class="story-barre">
          <span
            :key="`${i}-${tour}`"
            class="story-barre-rempli"
            :class="{
              passee: i < index || (i === index && (dernier || !defile)),
              'en-cours': i === index && !dernier && defile,
              'en-pause': pause
            }"
            @animationend="suivante"
          ></span>
        </span>
      </div>
      <button type="button" class="story-fermer" aria-label="Fermer le récap" @click="$emit('fermer')">
        <i class="ti ti-x"></i>
      </button>
    </div>

    <div v-if="!recap && !erreur" class="story-attente">Chargement…</div>
    <div v-else-if="erreur" class="story-attente">
      <p>{{ erreur }}</p>
      <button type="button" class="btn" @click="$emit('fermer')">Fermer</button>
    </div>

    <div
      v-else
      class="story-scene"
      @pointerdown="appui"
      @pointerup="relache"
      @pointercancel="annulerAppui"
      @pointerleave="annulerAppui"
    >
      <Transition :name="`diapo-${sens}`" mode="out-in">
        <!-- 1. Ouverture -->
        <section v-if="diapo === 'intro'" key="intro" class="diapo diapo-intro">
          <LogoAnime :taille="64" :delai="150" />
          <p class="diapo-sur-titre">Ton récap</p>
          <h2 class="diapo-titre" aria-label="Ta semaine">
            <span v-for="(c, i) in 'Ta semaine'" :key="i" class="lettre" :style="{ '--i': i }" aria-hidden="true">{{ c === ' ' ? '\u00a0' : c }}</span>
          </h2>
          <p class="diapo-texte">du {{ formatJour(recap.debut) }} au {{ formatJour(recap.fin) }}</p>
        </section>

        <!-- 2. Séances -->
        <section v-else-if="diapo === 'seances'" key="seances" class="diapo">
          <p class="diapo-sur-titre">Séances</p>
          <p class="diapo-chiffre"><span v-compteur="recap.seances.length"></span></p>
          <p class="diapo-texte">{{ recap.seances.length > 1 ? 'séances validées' : 'séance validée' }}</p>
          <ul v-if="recap.seances.length" v-cascade class="diapo-liste">
            <li v-for="(s, i) in recap.seances.slice(0, 6)" :key="i">
              <span class="type-icone" :class="`type-icone-${typeSeance(s.type_seance)}`"><i class="ti" :class="iconeTypeSeance(s.type_seance)"></i></span>
              <span class="diapo-liste-nom">{{ s.nom }}</span>
              <span class="diapo-liste-date">{{ formatJourCourt(s.date) }}</span>
            </li>
            <li v-if="recap.seances.length > 6" class="diapo-liste-plus">et {{ recap.seances.length - 6 }} de plus</li>
          </ul>
          <p v-else class="diapo-texte diapo-doux">Pas de séance cette semaine : la prochaine est une page blanche.</p>
        </section>

        <!-- 3. XP -->
        <section v-else-if="diapo === 'xp'" key="xp" class="diapo">
          <p class="diapo-sur-titre">Expérience</p>
          <p class="diapo-chiffre diapo-neon">+<span v-compteur="recap.xp_gagne"></span></p>
          <p class="diapo-texte">XP gagnée</p>
          <p class="diapo-pastille"><i class="ti ti-medal"></i> Niveau {{ recap.niveau }} · {{ recap.titre }}</p>
          <p v-if="recap.serie_jours" class="diapo-serie">
            <i class="ti ti-flame"></i> {{ recap.serie_jours }} jour{{ recap.serie_jours > 1 ? 's' : '' }} d'affilée
          </p>
        </section>

        <!-- 4. Régularité : les jours actifs s'allument un par un -->
        <section v-else-if="diapo === 'regularite'" key="regularite" class="diapo">
          <p class="diapo-sur-titre">Régularité</p>
          <p class="diapo-chiffre"><span v-compteur="recap.jours_actifs"></span><small>/7</small></p>
          <p class="diapo-texte">jours actifs</p>
          <div v-if="recap.jours?.length === 7" class="diapo-jours">
            <span
              v-for="(j, i) in recap.jours"
              :key="j.date"
              class="jour"
              :class="{ actif: j.actif }"
              :style="{ '--i': i }"
              :title="formatJourCourt(j.date)"
            >{{ INITIALES_JOURS[i] }}</span>
          </div>
          <p class="diapo-texte diapo-doux">{{ motRegularite }}</p>
        </section>

        <!-- 5. Suivi -->
        <section v-else-if="diapo === 'suivi'" key="suivi" class="diapo">
          <p class="diapo-sur-titre">Ton suivi</p>
          <div v-cascade class="diapo-suivi">
            <div class="suivi-ligne">
              <i class="ti ti-heart-rate-monitor"></i> Wellness
              <strong>{{ recap.wellness_remplis }}/7 jours</strong>
            </div>
            <div v-if="recap.sommeil_moyen !== null" class="suivi-ligne">
              <i class="ti ti-zzz"></i> Sommeil moyen
              <strong>{{ formatHeures(recap.sommeil_moyen) }}</strong>
            </div>
            <div v-if="recap.poids" class="suivi-ligne">
              <i class="ti ti-scale"></i> Poids
              <strong>{{ fr(recap.poids.debut) }} → {{ fr(recap.poids.fin) }} kg</strong>
            </div>
            <div v-if="recap.diete" class="suivi-ligne">
              <i class="ti ti-salad"></i> Diète
              <span class="suivi-diete">
                <span class="pastille pastille-reussi"></span>{{ recap.diete.reussis }}
                <span class="pastille pastille-proche"></span>{{ recap.diete.proches }}
                <span class="pastille pastille-loin"></span>{{ recap.diete.loin }}
              </span>
            </div>
          </div>
        </section>

        <!-- 6. Le mot de la fin -->
        <section v-else key="fin" class="diapo">
          <i class="ti ti-quote diapo-guillemet" aria-hidden="true"></i>
          <p class="diapo-mot">{{ motDeLaSemaine }}</p>
          <p class="diapo-pastille"><i class="ti ti-medal"></i> Niveau {{ recap.niveau }} · {{ recap.titre }}</p>
          <div class="diapo-actions">
            <button type="button" class="btn btn-primary" @click="$emit('fermer')">C'est parti !</button>
            <button type="button" class="btn btn-ghost diapo-revoir" @click="aller(0)">
              <i class="ti ti-player-track-prev"></i> Revoir
            </button>
          </div>
        </section>
      </Transition>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useApi } from '../../services/api'
import { typeSeance, iconeTypeSeance } from '../../data/typesSeance'
import { formatHeures } from '../../data/sommeil'
import { mouvementReduit } from '../../animations/mouvement'
import FondNeon from '../FondNeon.vue'
import LogoAnime from '../LogoAnime.vue'

const DIAPOS = ['intro', 'seances', 'xp', 'regularite', 'suivi', 'fin']
const INITIALES_JOURS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
// Au-delà, un appui n'est plus un toucher (navigation) mais une pause
const APPUI_LONG_MS = 220

// Récap de la semaine écoulée (lundi → dimanche), proposé par une bannière
// en début de semaine.
export default {
  components: { FondNeon, LogoAnime },
  emits: ['fermer'],
  setup(props, { emit }) {
    const api = useApi()
    const racine = ref(null)
    const recap = ref(null)
    const erreur = ref('')

    // --- Navigation ---
    const index = ref(0)
    const sens = ref(1)
    // Incrémenté à chaque diapo : relance l'animation de la barre en cours
    const tour = ref(0)
    const pause = ref(false)
    // Avance automatique une fois le récap chargé, sauf si l'utilisateur
    // réduit les animations : il avance alors à son rythme, en touchant l'écran.
    const auto = !mouvementReduit()
    const defile = computed(() => auto && !!recap.value)
    const diapos = DIAPOS
    const diapo = computed(() => DIAPOS[index.value])
    const dernier = computed(() => index.value === DIAPOS.length - 1)

    const aller = (i) => {
      if (i < 0 || i >= DIAPOS.length || i === index.value) return
      sens.value = i > index.value ? 1 : -1
      index.value = i
      tour.value++
      pause.value = false
    }
    const suivante = () => aller(index.value + 1)
    const precedente = () => aller(index.value - 1)

    // Toucher court : navigation selon le côté ; appui long : pause tant
    // que le doigt reste posé.
    let minuteurAppui = null
    let enAppuiLong = false
    const appui = (e) => {
      if (e.target.closest('button')) return
      enAppuiLong = false
      clearTimeout(minuteurAppui)
      minuteurAppui = setTimeout(() => {
        enAppuiLong = true
        pause.value = true
      }, APPUI_LONG_MS)
    }
    const relache = (e) => {
      if (e.target.closest('button')) return
      clearTimeout(minuteurAppui)
      if (enAppuiLong) {
        enAppuiLong = false
        pause.value = false
        return
      }
      const largeur = racine.value?.clientWidth || window.innerWidth
      if (e.clientX < largeur / 3) precedente()
      else suivante()
    }
    const annulerAppui = () => {
      clearTimeout(minuteurAppui)
      if (enAppuiLong) {
        enAppuiLong = false
        pause.value = false
      }
    }
    const clavier = (e) => {
      if (e.key === 'Escape') emit('fermer')
      else if (e.key === 'ArrowRight') suivante()
      else if (e.key === 'ArrowLeft') precedente()
    }
    // Appli en arrière-plan : la story attend le retour
    const surVisibilite = () => { pause.value = document.hidden }

    onMounted(async () => {
      racine.value?.focus({ preventScroll: true })
      document.addEventListener('visibilitychange', surVisibilite)
      try {
        recap.value = await api.get('/progression/recap-semaine')
      } catch (e) {
        erreur.value = e.message || 'Récap indisponible pour le moment.'
      }
    })
    onBeforeUnmount(() => {
      clearTimeout(minuteurAppui)
      document.removeEventListener('visibilitychange', surVisibilite)
    })

    const motDeLaSemaine = computed(() => {
      const n = recap.value?.seances.length || 0
      if (n >= 5) return 'Semaine de monstre. Rien à ajouter : continue !'
      if (n >= 3) return 'Grosse semaine, bien joué. Garde ce rythme !'
      if (n >= 1) return 'Bon début. Vise une séance de plus cette semaine !'
      return 'Nouvelle semaine, nouveau départ : on s\'y remet ?'
    })
    const motRegularite = computed(() => {
      const n = recap.value?.jours_actifs || 0
      if (n === 7) return 'Pas un seul jour sans. Respect.'
      if (n >= 4) return 'Régulier comme une horloge.'
      if (n >= 1) return 'Chaque jour compte : vise-en un de plus.'
      return 'Cette semaine, on s\'y remet.'
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
      racine, recap, erreur, diapos, diapo, index, sens, tour, pause, defile, dernier,
      aller, suivante, appui, relache, annulerAppui, clavier,
      motDeLaSemaine, motRegularite, INITIALES_JOURS,
      formatJour, formatJourCourt, formatHeures, fr, typeSeance, iconeTypeSeance
    }
  }
}
</script>

<style scoped>
/* Toujours de nuit, quel que soit le thème : couleurs de texte fixes */
.story {
  position: fixed;
  inset: 0;
  z-index: 260;
  display: flex;
  flex-direction: column;
  color: #F6F5FF;
  background: #0C0A22;
  outline: none;
  overflow: hidden;
}
.story-fond { z-index: 0; }

.story-haut {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: calc(var(--spacing-md) + env(safe-area-inset-top, 0px)) var(--spacing-md) 0 var(--spacing-lg);
}
.story-barres { flex: 1; display: flex; gap: 4px; }
.story-barre { flex: 1; height: 3px; border-radius: 3px; background: rgba(194, 188, 255, 0.25); overflow: hidden; }
.story-barre-rempli {
  display: block;
  height: 100%;
  background: #F6F5FF;
  transform: scaleX(0);
  transform-origin: left center;
}
.story-barre-rempli.passee { transform: scaleX(1); }
.story-barre-rempli.en-cours { animation: remplir 5s linear forwards; }
.story-barre-rempli.en-pause { animation-play-state: paused; }
@keyframes remplir { to { transform: scaleX(1); } }
.story-fermer {
  width: var(--tap-min);
  height: var(--tap-min);
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: inherit;
  font-size: 22px;
  cursor: pointer;
}
.story-fermer:hover { background: rgba(194, 188, 255, 0.12); }

.story-attente {
  position: relative;
  z-index: 1;
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-lg);
  padding: var(--spacing-xl);
  text-align: center;
  color: #C2BCFF;
}

.story-scene {
  position: relative;
  z-index: 1;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-xl) var(--spacing-xl) calc(var(--spacing-3xl) + env(safe-area-inset-bottom, 0px));
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
  cursor: pointer;
}

.diapo {
  width: 100%;
  max-width: 420px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-sm);
  text-align: center;
}
.diapo-sur-titre {
  margin: 0;
  font-size: var(--font-size-sm);
  font-weight: 800;
  letter-spacing: 1.4px;
  text-transform: uppercase;
  color: #4FE3D6;
}
.diapo-titre { margin: 0; font-size: 48px; font-weight: 800; letter-spacing: -1px; line-height: 1.05; }
.diapo-intro { gap: var(--spacing-md); }
.lettre { display: inline-block; animation: lettre 0.5s var(--ease-standard) both; animation-delay: calc(0.35s + var(--i) * 45ms); }
@keyframes lettre { from { opacity: 0; transform: translateY(22px) rotate(8deg); } }
.diapo-chiffre {
  margin: 0;
  font-size: 96px;
  font-weight: 800;
  letter-spacing: -3px;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}
.diapo-chiffre small { font-size: 36px; letter-spacing: 0; color: #A8A3CF; }
.diapo-neon {
  background: linear-gradient(90deg, #C2BCFF, #4FE3D6);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  filter: drop-shadow(0 0 18px rgba(79, 227, 214, 0.35));
}
.diapo-texte { margin: 0; font-size: var(--font-size-lg); font-weight: 600; color: #C2BCFF; }
.diapo-doux { font-size: var(--font-size-base); font-weight: 500; color: #DCD8FF; margin-top: var(--spacing-md); }
.diapo-pastille {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin: var(--spacing-lg) 0 0;
  padding: 6px 14px;
  border-radius: 999px;
  background: rgba(194, 188, 255, 0.14);
  font-size: var(--font-size-sm);
  font-weight: 700;
}
.diapo-serie { margin: var(--spacing-sm) 0 0; font-weight: 700; color: #FCD34D; }
.diapo-serie .ti { color: #FB923C; }

.diapo-liste {
  width: 100%;
  margin: var(--spacing-lg) 0 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.diapo-liste li {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: 8px 12px;
  border-radius: var(--radius-lg);
  background: rgba(194, 188, 255, 0.1);
  text-align: left;
}
.diapo-liste-nom { flex: 1; min-width: 0; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.diapo-liste-date { font-size: var(--font-size-xs); color: #A8A3CF; text-transform: capitalize; }
.diapo-liste .diapo-liste-plus { justify-content: center; background: none; color: #A8A3CF; font-size: var(--font-size-sm); }

.diapo-jours { display: flex; gap: 8px; margin-top: var(--spacing-lg); }
.jour {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--font-size-sm);
  font-weight: 800;
  background: rgba(194, 188, 255, 0.1);
  color: #7C77A8;
}
/* Jour actif : il s'allume à son tour, du lundi au dimanche */
.jour.actif {
  background: linear-gradient(135deg, #C2BCFF, #4FE3D6);
  color: #0C0A22;
  box-shadow: 0 0 16px rgba(79, 227, 214, 0.55);
  animation: allume 0.5s var(--ease-standard) both;
  animation-delay: calc(0.5s + var(--i) * 120ms);
}
@keyframes allume {
  0% { transform: scale(0.4); background: rgba(194, 188, 255, 0.1); color: #7C77A8; box-shadow: none; }
  60% { transform: scale(1.18); }
  100% { transform: scale(1); }
}

.diapo-suivi { width: 100%; display: flex; flex-direction: column; gap: 10px; margin-top: var(--spacing-md); }
.suivi-ligne {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: 12px 14px;
  border-radius: var(--radius-lg);
  background: rgba(194, 188, 255, 0.1);
  color: #C2BCFF;
  text-align: left;
}
.suivi-ligne > .ti { font-size: var(--font-size-lg); color: #4FE3D6; }
.suivi-ligne strong, .suivi-diete { margin-left: auto; color: #F6F5FF; font-weight: 700; }
.suivi-diete { display: inline-flex; align-items: center; gap: 4px; }
.pastille { width: 10px; height: 10px; border-radius: 50%; margin-left: 6px; }
.pastille-reussi { background: #4ade80; }
.pastille-proche { background: #fbbf24; }
.pastille-loin { background: #f87171; }

.diapo-guillemet { font-size: 40px; color: #4FE3D6; }
.diapo-mot { margin: 0; font-size: 28px; font-weight: 800; line-height: 1.2; letter-spacing: -0.5px; }
.diapo-actions { display: flex; flex-direction: column; align-items: center; gap: var(--spacing-sm); width: 100%; margin-top: var(--spacing-2xl); }
.diapo-actions .btn-primary { width: 100%; max-width: 280px; min-height: var(--input-h); font-size: var(--font-size-base); }
.diapo-revoir { color: #C2BCFF; }
.diapo-revoir:hover:not(:disabled) { background: rgba(194, 188, 255, 0.12); color: #F6F5FF; }

/* Passage d'une diapo à l'autre, dans le sens de la navigation */
.diapo-1-enter-active, .diapo-1-leave-active,
.diapo--1-enter-active, .diapo--1-leave-active { transition: opacity 0.25s ease, transform 0.25s var(--ease-standard); }
.diapo-1-enter-from, .diapo--1-leave-to { opacity: 0; transform: translateX(36px); }
.diapo-1-leave-to, .diapo--1-enter-from { opacity: 0; transform: translateX(-36px); }

@media (prefers-reduced-motion: reduce) {
  .lettre, .jour.actif { animation: none; }
  .diapo-1-enter-active, .diapo-1-leave-active,
  .diapo--1-enter-active, .diapo--1-leave-active { transition: none; }
}
</style>
