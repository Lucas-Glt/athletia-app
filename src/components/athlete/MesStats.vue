<template>
  <div class="mes-stats">
    <!-- Niveau, XP et série en cours -->
    <CarteNiveau />

    <!-- Ressenti de séance à compléter -->
    <div class="stat-card" v-if="ressenti" ref="ressentiEl">
      <div class="stat-card-titre"><i class="ti ti-mood-smile"></i> Ressenti — {{ ressenti.seance_nom }}</div>
      <p class="stat-card-sub">Comment as-tu trouvé cette séance ?</p>

      <div class="rpe-picker">
        <button
          v-for="n in 11"
          :key="n - 1"
          class="rpe-btn"
          :class="{ active: rpeForm === n - 1 }"
          @click="rpeForm = n - 1"
        >{{ n - 1 }}</button>
      </div>
      <p class="rpe-label" v-if="rpeForm !== null">{{ labelRpe(rpeForm) }}</p>

      <div class="field-inline">
        <label>Durée de la séance</label>
        <input v-model.number="dureeForm" type="number" inputmode="numeric" min="1" placeholder="ex : 60" />
        <span>min</span>
      </div>

      <button
        class="btn btn-primary btn-envoyer"
        :disabled="rpeForm === null || !dureeForm"
        @click="envoyerRessenti"
      >
        <i class="ti ti-check"></i> Enregistrer
      </button>
      <p v-if="erreurRessenti" class="stat-card-erreur">{{ erreurRessenti }}</p>
      <p class="stat-card-note">
        À compléter dans les 24 h qui suivent la séance. Une fois enregistré, le ressenti n'est plus modifiable.
      </p>
    </div>

    <!-- Wellness du jour -->
    <div class="stat-card" ref="wellnessEl">
      <template v-if="wellnessFait">
        <div class="wellness-fait">
          <i class="ti ti-circle-check-filled"></i>
          <span>Wellness du jour envoyé. À demain !</span>
        </div>
      </template>
      <template v-else>
        <div class="stat-card-titre"><i class="ti ti-heart-rate-monitor"></i> Wellness du jour</div>
        <p class="stat-card-sub">5 questions, moins de 30 secondes.</p>

        <div class="wellness-item">
          <div class="wellness-item-head">
            <span>Temps de sommeil</span>
            <span class="wellness-echelle">la nuit dernière</span>
          </div>
          <div class="sommeil-stepper">
            <button
              class="sommeil-btn"
              :disabled="wellnessForm.heures_sommeil !== null && wellnessForm.heures_sommeil <= SOMMEIL_MIN"
              @click="ajusterSommeil(-1)"
              aria-label="Moins 15 minutes"
            ><i class="ti ti-minus"></i></button>
            <span class="sommeil-valeur" :class="{ vide: wellnessForm.heures_sommeil === null }">
              {{ wellnessForm.heures_sommeil === null ? '— h' : formatHeures(wellnessForm.heures_sommeil) }}
            </span>
            <button
              class="sommeil-btn"
              :disabled="wellnessForm.heures_sommeil !== null && wellnessForm.heures_sommeil >= SOMMEIL_MAX"
              @click="ajusterSommeil(1)"
              aria-label="Plus 15 minutes"
            ><i class="ti ti-plus"></i></button>
          </div>
        </div>

        <div class="wellness-item" v-for="item in itemsWellness" :key="item.champ">
          <div class="wellness-item-head">
            <span>{{ item.label }}</span>
            <span class="wellness-echelle">1 = très bon · 7 = très mauvais</span>
          </div>
          <div class="wellness-picker">
            <button
              v-for="n in 7"
              :key="n"
              class="wellness-btn"
              :class="{ active: wellnessForm[item.champ] === n }"
              @click="wellnessForm[item.champ] = n"
            >{{ n }}</button>
          </div>
        </div>

        <button class="btn btn-primary btn-envoyer" :disabled="!wellnessComplet" @click="envoyerWellness">
          <i class="ti ti-check"></i> Envoyer
        </button>
        <p v-if="erreurWellness" class="stat-card-erreur">{{ erreurWellness }}</p>
      </template>
    </div>

    <!-- En bref : trois chiffres, aucune interprétation. Le détail vit dans
         les onglets dédiés (courbe de poids dans Suivi, progression dans Perfs). -->
    <div class="en-bref" v-if="stats">
      <div class="bref-tuile">
        <span class="bref-valeur">{{ seancesSemaine }}</span>
        <span class="bref-label">séance{{ seancesSemaine > 1 ? 's' : '' }} cette semaine</span>
      </div>
      <div class="bref-tuile">
        <span class="bref-valeur">{{ stats.nb_seances_completees }}</span>
        <span class="bref-label">au total</span>
      </div>
      <button v-if="dernierPoids" type="button" class="bref-tuile bref-cliquable" @click="$emit('voir-poids')">
        <span class="bref-valeur">
          {{ dernierPoids }}<small> kg</small>
          <i v-if="tendancePoids" class="ti bref-tendance" :class="tendancePoids"></i>
        </span>
        <span class="bref-label">poids <i class="ti ti-chevron-right"></i></span>
      </button>
    </div>

    <div class="stat-card" v-if="stats">
      <div class="stat-card-titre">
        <i class="ti ti-calendar-stats"></i> Régularité
        <div class="bascule" role="group" aria-label="Régularité affichée">
          <button
            type="button"
            :class="{ active: vueRegularite === 'seances' }"
            :aria-pressed="vueRegularite === 'seances'"
            @click="choisirVueRegularite('seances')"
          >Séances</button>
          <button
            type="button"
            :class="{ active: vueRegularite === 'diete' }"
            :aria-pressed="vueRegularite === 'diete'"
            @click="choisirVueRegularite('diete')"
          >Diète</button>
        </div>
      </div>
      <!-- DIÈTE : calendrier de la réussite calorique, mois par mois -->
      <CalendrierDiete v-if="vueRegularite === 'diete'" />

      <template v-else>
      <div class="regularite-grille">
        <button
          v-for="j in derniersJours"
          :key="j.date"
          type="button"
          class="regularite-case"
          :class="{ 'est-aujourdhui': j.estAujourdhui, 'est-ouvert': jourOuvert === j.date }"
          :style="styleJour(j)"
          :title="j.date"
          :disabled="j.seances.length === 0"
          @click="basculerJour(j)"
        ></button>
      </div>

      <!-- Jour cliqué : quelles séances ont été complétées ce jour-là, avec le
           renvoi vers leurs résultats (onglet Séances, historique de la séance
           positionné sur cette date). -->
      <div class="jour-detail" v-if="jourDetail">
        <div class="jour-detail-date">{{ formatJourLong(jourDetail.date) }}</div>
        <div class="jour-detail-ligne" v-for="s in jourDetail.seances" :key="s.seance_id">
          <span class="jour-detail-nom">
            <span class="jour-detail-puce" :style="{ background: couleurType(s.type_seance) }"></span>
            {{ s.nom }}
          </span>
          <button
            class="btn-resultats"
            @click="$emit('voir-seance', { seanceId: s.seance_id, programmeId: s.programme_id, date: jourDetail.date })"
          >
            Aller voir les résultats <i class="ti ti-arrow-right"></i>
          </button>
        </div>
      </div>

      <!-- Légende = répartition : une pastille par type, avec son total -->
      <div class="regularite-legende" v-if="stats.repartition_types.length > 0">
        <span v-for="r in stats.repartition_types" :key="r.type_seance" class="legende-item">
          <span class="legende-puce" :style="{ background: couleurType(r.type_seance) }"></span>
          {{ labelType(r.type_seance) }} <strong>{{ r.nb_seances }}</strong>
        </span>
      </div>
      <p class="stat-card-note">35 derniers jours. Touche un jour coloré pour revoir ta séance.</p>
      </template>
    </div>

    <div class="empty" v-if="stats && stats.nb_seances_completees === 0">
      Valide ta première séance pour commencer à voir tes stats ici.
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useApi } from '../../services/api'
import { useProgressionStore } from '../../stores/progression'
import CarteNiveau from './CarteNiveau.vue'
import CalendrierDiete from './CalendrierDiete.vue'
import { SOMMEIL_MIN, SOMMEIL_MAX, SOMMEIL_PAS, SOMMEIL_DEFAUT, formatHeures } from '../../data/sommeil'

const LABELS_TYPE = { musculation: 'Musculation', natation: 'Natation', athletisme: 'Athlétisme', pliometrie: 'Pliométrie' }

const COULEUR_TYPE = {
  musculation: 'var(--color-type-musculation-text)',
  natation: 'var(--color-type-natation-text)',
  athletisme: 'var(--color-type-athletisme-text)',
  pliometrie: 'var(--color-type-pliometrie-text)'
}

const LABELS_RPE = {
  0: 'Repos', 1: 'Très très facile', 2: 'Facile', 3: 'Modéré', 4: 'Assez dur',
  5: 'Dur', 6: 'Très dur', 7: 'Très dur', 8: 'Très très dur', 9: 'Très très dur', 10: 'Maximal'
}

export default {
  components: { CarteNiveau, CalendrierDiete },
  // ressenti-envoye / wellness-envoye : la bannière du dashboard propose le
  // même questionnaire. Sans ces signaux, y répondre ici la laissait affichée,
  // à proposer quelque chose qui venait d'être fait.
  // voir-seance : la grille de régularité ne sait pas ouvrir une séance, c'est
  // le dashboard qui détient le programme et sa liste de séances.
  // voir-poids : la tuile Poids ouvre l'onglet Poids (calendrier + courbe).
  emits: ['focus-consomme', 'ressenti-envoye', 'wellness-envoye', 'voir-seance', 'voir-poids'],
  props: {
    focusRessenti: { type: Boolean, default: false },
    focusWellness: { type: Boolean, default: false }
  },
  setup(props, { emit }) {
    const api = useApi()
    const progression = useProgressionStore()
    const stats = ref(null)
    const ressenti = ref(null)
    const rpeForm = ref(null)
    const dureeForm = ref('')
    const wellnessFait = ref(false)
    // heures_sommeil est la durée de la nuit ; l'item « sommeil » reste la
    // note de qualité 1-7 du questionnaire de Hooper. Les deux comptent, et
    // pour des raisons différentes (cf. monitoring_calc.py côté API).
    const wellnessForm = ref({ sommeil: null, fatigue: null, courbatures: null, stress: null, heures_sommeil: null })
    const ressentiEl = ref(null)
    const wellnessEl = ref(null)

    const itemsWellness = [
      { champ: 'sommeil', label: 'Qualité du sommeil' },
      { champ: 'fatigue', label: 'Fatigue' },
      { champ: 'courbatures', label: 'Courbatures' },
      { champ: 'stress', label: 'Stress' }
    ]

    const labelRpe = (v) => LABELS_RPE[v] || ''

    // Premier appui : on part de SOMMEIL_DEFAUT sans appliquer le pas, pour
    // que « + » comme « − » amènent au même point de départ.
    const ajusterSommeil = (sens) => {
      const actuel = wellnessForm.value.heures_sommeil
      if (actuel === null) { wellnessForm.value.heures_sommeil = SOMMEIL_DEFAUT; return }
      const valeur = actuel + sens * SOMMEIL_PAS
      wellnessForm.value.heures_sommeil = Math.min(SOMMEIL_MAX, Math.max(SOMMEIL_MIN, Math.round(valeur * 4) / 4))
    }

    const fetchStats = async () => { stats.value = await api.get('/mes-stats/') }

    // L'API ne remonte que les ressentis jamais renseignés : le formulaire
    // repart donc toujours vierge.
    const fetchRessenti = async () => {
      ressenti.value = await api.get('/mes-stats/ressenti-a-completer')
      rpeForm.value = null
      dureeForm.value = ''
    }

    const fetchWellness = async () => {
      const entree = await api.get('/wellness/aujourdhui')
      wellnessFait.value = !!entree
    }

    const entriesPoids = ref([])
    const fetchPoids = async () => {
      try {
        entriesPoids.value = await api.get('/poids/moi')
      } catch (e) {
        console.error('Erreur chargement poids:', e)
      }
    }
    // Tuile Poids : la dernière pesée et le sens par rapport à la précédente,
    // sans jugement (monter ou descendre n'est ni bien ni mal en soi).
    const peseesTriees = computed(() => [...entriesPoids.value].sort((a, b) => new Date(a.date) - new Date(b.date)))
    const dernierPoids = computed(() => {
      const derniere = peseesTriees.value[peseesTriees.value.length - 1]
      return derniere ? derniere.poids.toLocaleString('fr-FR') : null
    })
    const tendancePoids = computed(() => {
      const p = peseesTriees.value
      if (p.length < 2) return null
      const ecart = p[p.length - 1].poids - p[p.length - 2].poids
      return ecart > 0 ? 'ti-trending-up' : ecart < 0 ? 'ti-trending-down' : 'ti-minus'
    })

    // Sans ces messages, un envoi qui échoue ne produisait rien du tout à
    // l'écran : le bouton restait actif et l'athlète ne savait pas si c'était
    // enregistré.
    const erreurRessenti = ref('')
    const erreurWellness = ref('')

    const envoyerRessenti = async () => {
      if (rpeForm.value === null || !dureeForm.value) return
      erreurRessenti.value = ''
      try {
        await api.post(`/seances/${ressenti.value.seance_id}/charge`, {
          session_id: ressenti.value.session_id, rpe: rpeForm.value, duree_minutes: dureeForm.value
        })
      } catch (e) {
        erreurRessenti.value = e.message || "Erreur lors de l'enregistrement"
        return
      }
      ressenti.value = null
      progression.actualiser('Ressenti')
      emit('ressenti-envoye')
      // Une autre tentative peut rester à compléter (deux séances validées
      // dans les 24 h) : on redemande au lieu de la masquer jusqu'au prochain
      // affichage de l'onglet.
      await fetchRessenti().catch(e => console.error('Erreur rechargement ressenti:', e))
      await fetchStats().catch(e => console.error('Erreur rechargement stats:', e))
    }

    const wellnessComplet = computed(() => Object.values(wellnessForm.value).every(v => v !== null))

    const envoyerWellness = async () => {
      if (!wellnessComplet.value) return
      erreurWellness.value = ''
      try {
        await api.post('/wellness/', wellnessForm.value)
      } catch (e) {
        erreurWellness.value = e.message || "Erreur lors de l'envoi"
        return
      }
      wellnessFait.value = true
      progression.actualiser('Wellness du jour')
      emit('wellness-envoye')
    }

    const labelType = (t) => LABELS_TYPE[t] || t

    // Date locale au format ISO : toISOString() bascule en UTC et décalait la
    // grille d'un jour entre minuit et 2 h du matin (France en UTC+1/+2),
    // marquant « aujourd'hui » sur la case de la veille.
    const pad2 = (n) => String(n).padStart(2, '0')
    const dateISOLocale = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`

    // Séances complétées depuis lundi (dates ISO locales, comparables en texte).
    const seancesSemaine = computed(() => {
      const lundi = new Date()
      lundi.setDate(lundi.getDate() - ((lundi.getDay() + 6) % 7))
      const debut = dateISOLocale(lundi)
      return (stats.value?.jours_avec_seance || [])
        .filter(j => j.date >= debut)
        .reduce((total, j) => total + j.nb_seances, 0)
    })

    // --- Régularité : séances (grille des 35 jours) ou diète (calendrier) ---
    const vueRegularite = ref('seances')

    const derniersJours = computed(() => {
      const parJour = {}
      ;(stats.value?.jours_avec_seance || []).forEach(j => { parJour[j.date] = j })
      const today = new Date()
      const jours = []
      for (let i = 34; i >= 0; i--) {
        const d = new Date(today)
        d.setDate(d.getDate() - i)
        const iso = dateISOLocale(d)
        const info = parJour[iso]
        jours.push({
          date: iso,
          nb: info?.nb_seances || 0,
          types: info?.types || [],
          // absent d'une version antérieure de l'API : la grille reste
          // affichable, seulement pas cliquable
          seances: info?.seances || [],
          estAujourdhui: i === 0
        })
      }
      return jours
    })

    // Jour dont le détail est déplié (date ISO), null sinon.
    const jourOuvert = ref(null)
    // Relu depuis derniersJours plutôt que figé à l'ouverture : le détail suit
    // un rechargement des stats (validation d'une séance, ressenti envoyé).
    const jourDetail = computed(() =>
      derniersJours.value.find(j => j.date === jourOuvert.value && j.seances.length > 0) || null
    )
    const choisirVueRegularite = (vue) => {
      vueRegularite.value = vue
      jourOuvert.value = null
    }
    const basculerJour = (j) => {
      if (j.seances.length === 0) return
      jourOuvert.value = jourOuvert.value === j.date ? null : j.date
    }

    // « lundi 8 septembre » : la date ISO est interprétée en UTC par Date, ce
    // qui reste le bon jour en France (UTC+1/+2).
    const formatJourLong = (iso) =>
      new Date(iso).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

    const couleurType = (t) => COULEUR_TYPE[t] || 'var(--color-valid-text-strong)'

    // Une couleur par type ; plusieurs types le même jour => dégradé partagé
    // à parts égales entre chaque couleur.
    const styleJour = (j) => {
      if (j.types.length === 0) return {}
      const couleurs = j.types.map(couleurType)
      if (couleurs.length === 1) return { background: couleurs[0] }
      const pas = 100 / couleurs.length
      const stops = couleurs.map((c, i) => `${c} ${i * pas}%, ${c} ${(i + 1) * pas}%`).join(', ')
      return { background: `linear-gradient(90deg, ${stops})` }
    }

    const scrollVers = async (el) => {
      await nextTick()
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }

    watch(() => props.focusRessenti, async (actif) => {
      if (!actif) return
      await fetchRessenti()
      await scrollVers(ressentiEl.value)
      emit('focus-consomme', 'ressenti')
    })

    watch(() => props.focusWellness, async (actif) => {
      if (!actif) return
      await scrollVers(wellnessEl.value)
      emit('focus-consomme', 'wellness')
    })

    onMounted(async () => {
      // allSettled et pas all : c'est l'onglet d'accueil de l'athlète, un seul
      // appel en échec (réseau coupé en salle, endpoint en erreur) laissait
      // l'écran entièrement vide et sautait tout ce qui suit.
      const resultats = await Promise.allSettled([
        fetchStats(), fetchRessenti(), fetchWellness(), fetchPoids()
      ])
      resultats
        .filter(r => r.status === 'rejected')
        .forEach(r => console.error('Erreur chargement stats athlète:', r.reason))
      if (props.focusRessenti) { await scrollVers(ressentiEl.value); emit('focus-consomme', 'ressenti') }
      if (props.focusWellness) { await scrollVers(wellnessEl.value); emit('focus-consomme', 'wellness') }
    })

    return {
      stats, ressenti, rpeForm, dureeForm, labelRpe, envoyerRessenti,
      wellnessFait, wellnessForm, itemsWellness, wellnessComplet, envoyerWellness,
      ajusterSommeil, formatHeures, SOMMEIL_MIN, SOMMEIL_MAX,
      erreurRessenti, erreurWellness,
      seancesSemaine, dernierPoids, tendancePoids, labelType,
      vueRegularite, choisirVueRegularite,
      derniersJours, styleJour,
      jourOuvert, jourDetail, basculerJour, formatJourLong, couleurType,
      ressentiEl, wellnessEl
    }
  }
}
</script>

<style scoped>
/* flex/min-height : le volet est le conteneur de défilement de l'onglet.
   touch-action : sans lui, un glissement horizontal était happé par le
   navigateur (pointercancel) et le swipe entre onglets ne partait jamais
   depuis l'accueil, contrairement aux autres onglets qui le déclarent. */
.mes-stats {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: var(--spacing-lg);
  padding: var(--spacing-lg) var(--spacing-xl);
  overflow-y: auto;
  min-height: 0;
  touch-action: pan-y;
}

.stat-card {
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  box-shadow: var(--shadow-card);
}
.stat-card-titre { display: flex; align-items: center; gap: 8px; font-size: var(--font-size-base); font-weight: 700; }
.stat-card-sub { font-size: var(--font-size-sm); color: var(--color-text-secondary); margin: 0; }
.stat-card-note { font-size: var(--font-size-xs); color: var(--color-text-muted); margin: 0; }
.stat-card-erreur { font-size: var(--font-size-sm); color: var(--color-danger-text); margin: 0; }
.stat-card-periode { margin-left: auto; font-size: var(--font-size-xs); font-weight: 500; color: var(--color-text-muted); }

/* --- En bref : trois tuiles, une ligne --- */
.en-bref { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--spacing-sm); flex-shrink: 0; }
.bref-tuile {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: var(--spacing-md);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
  font-family: inherit;
  color: inherit;
  text-align: left;
}
.bref-cliquable { cursor: pointer; transition: border-color var(--transition-fast); }
.bref-cliquable:hover { border-color: var(--color-primary); }
.bref-valeur {
  display: flex;
  align-items: baseline;
  gap: 2px;
  font-size: var(--font-size-xl);
  font-weight: 700;
  letter-spacing: -0.3px;
  font-variant-numeric: tabular-nums;
  color: var(--color-text);
}
.bref-valeur small { font-size: var(--font-size-sm); font-weight: 600; color: var(--color-text-secondary); }
.bref-tendance { margin-left: 4px; font-size: var(--font-size-base); color: var(--color-text-secondary); align-self: center; }
.bref-label { display: flex; align-items: center; gap: 2px; font-size: var(--font-size-xs); color: var(--color-text-secondary); }

/* --- Bascule Séances / Diète de la régularité --- */
.bascule {
  margin-left: auto;
  display: inline-flex;
  padding: 3px;
  gap: 2px;
  border-radius: var(--radius-full);
  background: var(--color-bg-tertiary);
}
.bascule button {
  min-height: 30px;
  padding: 0 var(--spacing-md);
  border: none;
  border-radius: var(--radius-full);
  background: transparent;
  font-family: inherit;
  font-size: var(--font-size-xs);
  font-weight: 700;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: background var(--transition-fast), color var(--transition-fast);
}
.bascule button.active { background: var(--color-bg); color: var(--color-primary-dark); box-shadow: var(--shadow-sm); }

/* --- Légende de la régularité (fait aussi office de répartition) --- */
.regularite-legende { display: flex; flex-wrap: wrap; gap: 4px var(--spacing-md); font-size: var(--font-size-xs); color: var(--color-text-secondary); }
.legende-item { display: inline-flex; align-items: center; gap: 5px; }
.legende-item strong { color: var(--color-text); }
.legende-puce { width: 10px; height: 10px; border-radius: 3px; flex-shrink: 0; }

.rpe-picker { display: flex; flex-wrap: wrap; gap: 6px; }
.rpe-btn {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: var(--color-bg);
  font-weight: 700;
  cursor: pointer;
  transition: background var(--transition-fast), border-color var(--transition-fast), transform var(--transition-fast);
}
.rpe-btn:active { transform: scale(0.92); }
.rpe-btn.active { background: var(--gradient-primary-hover); border-color: var(--color-primary-dark); color: var(--color-on-primary); }
.rpe-label { font-size: var(--font-size-sm); font-weight: 600; color: var(--color-primary-text); margin: 0; }

.field-inline { display: flex; align-items: center; gap: var(--spacing-sm); }
.field-inline label { font-size: var(--font-size-sm); color: var(--color-text-secondary); flex-shrink: 0; }
.field-inline input {
  width: 90px;
  min-height: var(--tap-min);
  padding: 0 var(--spacing-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--font-size-base);
  background: var(--color-bg);
}
.btn-envoyer { align-self: flex-start; }

.wellness-fait { display: flex; align-items: center; gap: var(--spacing-sm); color: var(--color-valid-text-strong); font-weight: 600; }
.wellness-item { display: flex; flex-direction: column; gap: 6px; }
.wellness-item-head { display: flex; justify-content: space-between; align-items: baseline; gap: var(--spacing-sm); flex-wrap: wrap; }
.wellness-item-head span:first-child { font-size: var(--font-size-sm); font-weight: 600; }
.wellness-echelle { font-size: 10px; color: var(--color-text-muted); }
.wellness-picker { display: flex; gap: 6px; }
.wellness-btn {
  flex: 1;
  height: var(--tap-min);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: var(--color-bg);
  font-weight: 600;
  cursor: pointer;
  transition: background var(--transition-fast), border-color var(--transition-fast), transform var(--transition-fast);
}
.wellness-btn:active { transform: scale(0.92); }
.wellness-btn.active { background: var(--gradient-primary-hover); border-color: var(--color-primary-dark); color: var(--color-on-primary); }

.sommeil-stepper { display: flex; align-items: center; gap: var(--spacing-sm); }
.sommeil-btn {
  width: var(--tap-min);
  height: var(--tap-min);
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: var(--color-bg);
  font-size: var(--font-size-base);
  cursor: pointer;
  transition: background var(--transition-fast), transform var(--transition-fast);
}
.sommeil-btn:active:not(:disabled) { transform: scale(0.92); }
.sommeil-btn:disabled { opacity: 0.4; cursor: default; }
.sommeil-valeur { flex: 1; text-align: center; font-size: var(--font-size-lg); font-weight: 700; }
.sommeil-valeur.vide { color: var(--color-text-muted); font-weight: 500; }

.regularite-grille { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; }
.regularite-case {
  aspect-ratio: 1;
  padding: 0;
  border: none;
  border-radius: 4px;
  background: var(--color-bg-tertiary);
  cursor: pointer;
}
.regularite-case:disabled { cursor: default; }
.regularite-case.est-aujourdhui { outline: 2px solid var(--color-primary); outline-offset: 1px; }
/* Anneau (et non outline) pour rester lisible sur la case du jour, qui a déjà
   le sien. */
.regularite-case.est-ouvert { box-shadow: 0 0 0 2px var(--color-bg), 0 0 0 4px var(--color-text); }

.jour-detail {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  padding: var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg-secondary);
}
.jour-detail-date { font-size: var(--font-size-sm); font-weight: 700; text-transform: capitalize; }
.jour-detail-ligne {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-sm);
  flex-wrap: wrap;
}
.jour-detail-nom { display: flex; align-items: center; gap: 6px; font-size: var(--font-size-sm); font-weight: 600; }
.jour-detail-puce { width: 10px; height: 10px; border-radius: 3px; flex-shrink: 0; }
.btn-resultats {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-height: var(--tap-min);
  padding: 0 var(--spacing-md);
  border: 1px solid var(--color-primary);
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--color-primary-text);
  font-size: var(--font-size-sm);
  font-weight: 600;
  cursor: pointer;
}

</style>
