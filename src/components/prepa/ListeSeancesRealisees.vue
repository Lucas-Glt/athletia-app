<template>
  <div class="liste-seances" :class="{ 'avec-athlete': afficherAthlete }">
    <p v-if="erreur" class="erreur-liste" role="alert">
      <i class="ti ti-alert-triangle"></i> {{ erreur }}
      <button type="button" class="lien" @click="charger()">Réessayer</button>
    </p>

    <div v-if="chargement && seances.length === 0" class="squelettes" aria-busy="true" aria-label="Chargement des séances">
      <span v-for="n in 3" :key="n" class="squelette"></span>
    </div>
    <div v-else-if="seances.length === 0 && !erreur" class="vide">
      <i class="ti ti-calendar-event"></i>
      <span>{{ texteVide }}</span>
    </div>

    <section v-for="jour in jours" :key="jour.date" class="jour" :aria-label="jour.libelle">
      <h3 class="jour-titre">
        <span>{{ jour.libelle }}</span>
        <span class="jour-compte">{{ jour.seances.length }} séance{{ jour.seances.length > 1 ? 's' : '' }}</span>
      </h3>

      <article
        v-for="s in jour.seances"
        :key="s.id"
        class="seance"
        :class="{ ouverte: ouvertes.has(s.id), nouvelle: estNouvelle(s) }"
      >
        <button
          type="button"
          class="seance-ligne"
          :aria-expanded="ouvertes.has(s.id)"
          @click="basculer(s.id)"
        >
          <span class="seance-visuel" aria-hidden="true">
            <template v-if="afficherAthlete">
              <span class="avatar">
                <img v-if="s.photo_url" class="avatar-photo" :src="urlApi(s.photo_url)" alt="" />
                <template v-else>{{ initiales(s.athlete_nom) }}</template>
              </span>
              <span class="type-mini" :class="`type-icone-${typeSeance(s.type_seance)}`">
                <i class="ti" :class="iconeTypeSeance(s.type_seance)"></i>
              </span>
            </template>
            <span v-else class="type-icone" :class="`type-icone-${typeSeance(s.type_seance)}`">
              <i class="ti" :class="iconeTypeSeance(s.type_seance)"></i>
            </span>
          </span>

          <span class="seance-infos">
            <span class="ligne-principale">
              <template v-if="afficherAthlete">
                <span class="athlete-nom">{{ s.athlete_nom }}</span>
                <TitreAthlete v-if="progressionDe(s.athlete_id)" :progression="progressionDe(s.athlete_id)" :avec-serie="false" />
              </template>
              <span v-else class="seance-nom">{{ s.seance_nom }}</span>
              <span v-if="estNouvelle(s)" class="pastille-nouvelle">Nouveau</span>
            </span>
            <span class="ligne-secondaire">
              <span v-if="afficherAthlete" class="seance-nom-sec">{{ s.seance_nom }}</span>
              <span v-if="s.hors_programme" class="programme hors-programme"><i class="ti ti-plus"></i> Hors programme</span>
              <span v-else class="programme">{{ s.programme_nom }}<template v-if="s.semaine"> · sem. {{ s.semaine }}</template></span>
            </span>
          </span>

          <span class="seance-badges">
            <span v-if="s.total" class="badge-taux" :class="classeTaux(tauxSeance(s))">
              <i class="ti" :class="tauxSeance(s) >= 90 ? 'ti-circle-check' : 'ti-list-check'"></i>{{ s.faites }}/{{ s.total }}<span class="libelle-long"> séries</span>
            </span>
            <span v-if="texteRessenti(s)" class="badge-ressenti" :title="s.charge ? `Charge : ${s.charge} UA` : null">
              <i class="ti ti-heartbeat"></i>{{ texteRessenti(s) }}
            </span>
            <span v-else class="badge-ressenti en-attente" :title="ressentiEnAttente(s) ? 'L\'athlète a 24 h pour donner son ressenti' : 'Ressenti jamais donné'">
              <i class="ti ti-hourglass"></i>{{ ressentiEnAttente(s) ? 'Ressenti à venir' : 'Sans ressenti' }}
            </span>
            <span v-if="s.reactions" class="badge-reactions" :title="`${s.reactions} réaction${s.reactions > 1 ? 's' : ''} de ta part`">
              <i class="ti ti-mood-heart"></i>{{ s.reactions }}
            </span>
          </span>

          <span class="seance-fin">
            <time class="heure" :datetime="s.date">{{ heureDe(s.date) }}</time>
            <i class="ti ti-chevron-down chevron" aria-hidden="true"></i>
          </span>
        </button>

        <div v-if="ouvertes.has(s.id)" class="seance-detail">
          <SeanceRealiseeDetail
            v-if="s.detail_disponible"
            :seance="s"
            :athlete-nom="s.athlete_nom"
            @reaction="(delta) => (s.reactions += delta)"
          />
          <p v-else class="detail-indispo">
            <i class="ti ti-info-circle"></i>
            {{ s.hors_programme
              ? "Séance faite en plus du programme et déclarée par l'athlète : son ressenti et sa durée comptent dans sa charge, sans détail de séries."
              : s.faites === null
                ? 'Aucune série enregistrée pour cette séance : elle a été validée sans détail.'
                : "Séance d'un programme d'un autre préparateur : son détail lui est réservé." }}
          </p>
          <div v-if="afficherAthlete" class="detail-actions">
            <button type="button" class="btn btn-sm" @click="$emit('ouvrir-athlete', s.athlete_id)">
              <i class="ti ti-user"></i> Fiche de {{ prenom(s.athlete_nom) }}
            </button>
          </div>
        </div>
      </article>
    </section>

    <button v-if="suite" type="button" class="btn plus-anciennes" :disabled="chargementSuite" @click="chargerSuite">
      <i class="ti" :class="chargementSuite ? 'ti-loader-2 tourne' : 'ti-history'"></i>
      Séances plus anciennes
    </button>
    <p v-else-if="seances.length > 0" class="fin-liste">C'est tout pour {{ afficherAthlete ? 'ces athlètes' : 'cet athlète' }}.</p>
  </div>
</template>

<script>
import { ref, computed, watch, onMounted } from 'vue'
import { useApi, urlApi } from '../../services/api'
import SeanceRealiseeDetail from './SeanceRealiseeDetail.vue'
import TitreAthlete from './TitreAthlete.vue'
import { typeSeance, iconeTypeSeance } from '../../data/typesSeance'
import {
  jourDe, heureDe, libelleJour, texteRessenti, tauxSeance, classeTaux
} from '../../data/seancesRealisees'

const TAILLE_PAGE = 30
// Au retour sur l'écran, les séances se rechargent si elles datent de plus
// d'une minute — sans « Chargement… » : la liste en place reste affichée.
const FRAICHEUR_MS = 60 * 1000
const DELAI_RESSENTI_MS = 24 * 60 * 60 * 1000

// Séances validées, regroupées par jour, la plus récente en haut : tout le
// cercle (onglet Séances) ou un athlète (sa fiche). Une séance se déplie sur
// son détail série par série, où le prépa peut réagir.
export default {
  components: { SeanceRealiseeDetail, TitreAthlete },
  props: {
    // null : tout le cercle ; [] : aucun athlète (filtre sans résultat)
    athleteIds: { type: Array, default: null },
    afficherAthlete: { type: Boolean, default: false },
    // athlete_id -> résumé du cercle (titre et niveau)
    resumesParId: { type: Object, default: () => ({}) },
    // Séances plus récentes que cette date : marquées « Nouveau »
    vuJusqua: { type: String, default: null },
    actif: { type: Boolean, default: true },
    deplierPremiere: { type: Boolean, default: false },
    texteVide: { type: String, default: 'Aucune séance validée pour le moment.' }
  },
  emits: ['ouvrir-athlete', 'premiere-page'],
  setup(props, { emit, expose }) {
    const api = useApi()
    const seances = ref([])
    const suite = ref(null)
    const chargement = ref(false)
    const chargementSuite = ref(false)
    const erreur = ref('')
    const ouvertes = ref(new Set())
    let generation = 0
    let chargeLe = 0

    const requete = (curseur) => {
      const params = new URLSearchParams()
      ;(props.athleteIds || []).forEach((id) => params.append('athlete_id', id))
      params.set('limite', TAILLE_PAGE)
      if (curseur) params.set('suite', curseur)
      return `/monitoring/seances?${params}`
    }

    // Recharge la première page. Les pages déjà dépliées plus bas restent :
    // on garde ce qui est plus ancien que la nouvelle première page.
    const charger = async ({ reinitialiser = false } = {}) => {
      const g = ++generation
      if (reinitialiser) {
        seances.value = []
        suite.value = null
        ouvertes.value = new Set()
      }
      if (props.athleteIds && props.athleteIds.length === 0) {
        seances.value = []
        suite.value = null
        chargement.value = false
        return
      }
      chargement.value = true
      erreur.value = ''
      try {
        const page = await api.get(requete())
        if (g !== generation) return
        const nouvelles = page.seances
        const derniere = nouvelles[nouvelles.length - 1]
        const ids = new Set(nouvelles.map((s) => s.id))
        const anciennes = derniere
          ? seances.value.filter((s) => !ids.has(s.id) && (s.date < derniere.date || (s.date === derniere.date && s.id < derniere.id)))
          : []
        const premierChargement = seances.value.length === 0
        seances.value = [...nouvelles, ...anciennes]
        if (!anciennes.length) suite.value = page.suite
        chargeLe = Date.now()
        if (premierChargement && props.deplierPremiere && nouvelles[0]) ouvertes.value = new Set([nouvelles[0].id])
        emit('premiere-page', nouvelles)
      } catch (e) {
        if (g === generation) erreur.value = e.message || 'Impossible de charger les séances'
      } finally {
        if (g === generation) chargement.value = false
      }
    }

    const chargerSuite = async () => {
      if (!suite.value || chargementSuite.value) return
      const g = generation
      chargementSuite.value = true
      erreur.value = ''
      try {
        const page = await api.get(requete(suite.value))
        if (g !== generation) return
        const dejaLa = new Set(seances.value.map((s) => s.id))
        seances.value = [...seances.value, ...page.seances.filter((s) => !dejaLa.has(s.id))]
        suite.value = page.suite
      } catch (e) {
        if (g === generation) erreur.value = e.message || 'Impossible de charger la suite'
      } finally {
        chargementSuite.value = false
      }
    }

    const rafraichir = () => charger()
    const rafraichirSiAncien = () => {
      if (Date.now() - chargeLe > FRAICHEUR_MS) charger()
    }
    expose({ rafraichir, rafraichirSiAncien })

    const jours = computed(() => {
      const parJour = new Map()
      for (const s of seances.value) {
        const jour = jourDe(s.date)
        if (!parJour.has(jour)) parJour.set(jour, { date: jour, libelle: libelleJour(jour), seances: [] })
        parJour.get(jour).seances.push(s)
      }
      return [...parJour.values()]
    })

    const basculer = (id) => {
      const suivantes = new Set(ouvertes.value)
      if (suivantes.has(id)) suivantes.delete(id)
      else suivantes.add(id)
      ouvertes.value = suivantes
    }

    const estNouvelle = (s) => !!props.vuJusqua && s.date > props.vuJusqua
    const progressionDe = (athleteId) => props.resumesParId[athleteId]?.progression || null
    const ressentiEnAttente = (s) => Date.now() - new Date(s.date).getTime() < DELAI_RESSENTI_MS
    const initiales = (nom) => (nom || '?').split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    const prenom = (nom) => (nom || '').split(' ')[0]

    // Autre filtre (athlètes cherchés, groupe) : nouvelle liste
    watch(() => JSON.stringify(props.athleteIds), () => charger({ reinitialiser: true }))
    watch(() => props.actif, (actif) => { if (actif) rafraichirSiAncien() })
    onMounted(() => charger())

    return {
      seances, suite, chargement, chargementSuite, erreur, ouvertes, jours,
      charger, chargerSuite, basculer, estNouvelle, progressionDe, ressentiEnAttente, initiales, prenom,
      urlApi, typeSeance, iconeTypeSeance, heureDe, texteRessenti, tauxSeance, classeTaux
    }
  }
}
</script>

<style scoped>
.liste-seances { display: flex; flex-direction: column; gap: var(--spacing-lg); }

.erreur-liste {
  display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin: 0;
  padding: var(--spacing-sm) var(--spacing-md); border-radius: var(--radius-md);
  background: var(--color-danger-bg-soft); color: var(--color-danger-text); font-size: var(--font-size-sm);
}
.vide {
  display: flex; flex-direction: column; align-items: center; gap: var(--spacing-sm);
  padding: var(--spacing-3xl) var(--spacing-lg);
  border: 1px dashed var(--color-border-strong); border-radius: var(--radius-lg);
  color: var(--color-text-muted); font-size: var(--font-size-sm); text-align: center;
}
.vide .ti { font-size: 28px; }

.squelettes { display: flex; flex-direction: column; gap: var(--spacing-sm); }
.squelette {
  height: 76px; border-radius: var(--radius-lg);
  background: linear-gradient(90deg, var(--color-bg-tertiary), var(--color-bg-secondary), var(--color-bg-tertiary));
  background-size: 200% 100%;
  animation: reflet-squelette 1.2s ease-in-out infinite;
}
@keyframes reflet-squelette { from { background-position: 100% 0; } to { background-position: -100% 0; } }

.jour { display: flex; flex-direction: column; gap: var(--spacing-sm); }
.jour-titre {
  display: flex; align-items: baseline; justify-content: space-between; gap: var(--spacing-sm);
  margin: 0; padding: 0 2px;
  font-size: var(--font-size-sm); font-weight: 700; color: var(--color-text);
}
.jour-compte { font-size: var(--font-size-xs); font-weight: 500; color: var(--color-text-muted); }

.seance {
  background: var(--color-bg); border: 1px solid var(--color-border); border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card); overflow: hidden;
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
}
.seance:hover { border-color: var(--color-border-strong); }
.seance.ouverte { border-color: var(--color-primary); }
.seance.nouvelle { box-shadow: inset 3px 0 0 var(--color-accent), var(--shadow-card); }

/* Téléphone : visuel | infos | heure, les badges sous les infos. */
.seance-ligne {
  width: 100%;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  grid-template-areas:
    'visuel infos fin'
    'visuel badges badges';
  align-items: center;
  column-gap: var(--spacing-md);
  row-gap: 6px;
  padding: var(--spacing-md) var(--spacing-lg);
  border: none; background: transparent;
  font-family: inherit; color: inherit; text-align: left; cursor: pointer;
  transition: background var(--transition-fast);
}
.seance-ligne:hover { background: var(--color-bg-hover); }
.seance-ligne:focus-visible { outline: none; box-shadow: inset 0 0 0 2px var(--color-primary); }

.seance-visuel { grid-area: visuel; position: relative; align-self: start; }
.avatar {
  width: 42px; height: 42px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  background: var(--color-avatar-athlete-bg); color: var(--color-avatar-athlete-text);
  font-size: var(--font-size-sm); font-weight: 700;
}
.type-mini {
  position: absolute; right: -4px; bottom: -4px;
  width: 22px; height: 22px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  border: 2px solid var(--color-bg); font-size: 12px;
}

.seance-infos { grid-area: infos; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.ligne-principale { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; min-width: 0; }
.athlete-nom, .seance-nom { font-size: var(--font-size-base); font-weight: 600; color: var(--color-text); overflow-wrap: anywhere; }
.ligne-secondaire {
  display: flex; flex-wrap: wrap; column-gap: 6px;
  font-size: var(--font-size-xs); color: var(--color-text-secondary);
}
.seance-nom-sec { font-weight: 600; color: var(--color-text-body); }
.avec-athlete .ligne-secondaire { flex-direction: column; }
.hors-programme { display: inline-flex; align-items: center; gap: 3px; font-weight: 600; color: var(--color-primary-text); }
.hors-programme .ti { font-size: 12px; }
.pastille-nouvelle {
  padding: 1px 7px; border-radius: var(--radius-full);
  background: color-mix(in srgb, var(--color-accent) 16%, transparent); color: var(--color-accent);
  font-size: 10px; font-weight: 800; letter-spacing: 0.4px; text-transform: uppercase;
}

.seance-badges { grid-area: badges; display: flex; flex-wrap: wrap; gap: 6px; }
.badge-taux, .badge-ressenti, .badge-reactions {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 3px 9px; border-radius: var(--radius-full);
  font-size: var(--font-size-xs); font-weight: 600; white-space: nowrap; font-variant-numeric: tabular-nums;
  background: var(--color-bg-tertiary); color: var(--color-text-secondary);
}
.badge-taux .ti, .badge-ressenti .ti, .badge-reactions .ti { font-size: 14px; }
.badge-taux.taux-done { background: var(--color-valid-bg); color: var(--color-valid-text-strong); }
.badge-taux.taux-warn { background: var(--color-warning-bg); color: var(--color-warning-text-strong); }
.badge-taux.taux-skip { background: var(--color-danger-bg); color: var(--color-danger-text); }
.badge-ressenti { background: var(--color-primary-light); color: var(--color-primary-text); }
.badge-ressenti.en-attente { background: transparent; border: 1px dashed var(--color-border-strong); color: var(--color-text-muted); font-weight: 500; }
.badge-reactions { background: color-mix(in srgb, var(--color-accent) 12%, transparent); color: var(--color-accent); }

.seance-fin { grid-area: fin; display: flex; align-items: center; gap: 6px; align-self: start; }
.heure { font-size: var(--font-size-sm); font-weight: 600; color: var(--color-text-secondary); font-variant-numeric: tabular-nums; }
.chevron { color: var(--color-text-muted); transition: transform var(--transition-fast); }
.seance.ouverte .chevron { transform: rotate(180deg); color: var(--color-primary); }

.seance-detail {
  display: flex; flex-direction: column; gap: var(--spacing-md);
  padding: var(--spacing-md) var(--spacing-lg) var(--spacing-lg);
  border-top: 1px solid var(--color-border);
  animation: deplier 0.2s var(--ease-standard);
}
@keyframes deplier { from { opacity: 0; transform: translateY(-4px); } }
.detail-indispo { display: flex; gap: 6px; margin: 0; font-size: var(--font-size-sm); color: var(--color-text-secondary); }
.detail-indispo .ti { flex-shrink: 0; margin-top: 2px; }
.detail-actions { display: flex; justify-content: flex-end; }

.plus-anciennes { align-self: center; }
.fin-liste { margin: 0; text-align: center; font-size: var(--font-size-xs); color: var(--color-text-muted); }
.tourne { animation: tourner 0.9s linear infinite; }
@keyframes tourner { to { transform: rotate(360deg); } }

/* Ordinateur : une ligne par séance, badges alignés à droite. */
@media (min-width: 900px) {
  .seance-ligne {
    grid-template-columns: auto minmax(0, 1fr) auto auto;
    grid-template-areas: 'visuel infos badges fin';
  }
  .seance-badges { justify-content: flex-end; }
  .seance-fin, .seance-visuel { align-self: center; }
  .avec-athlete .ligne-secondaire { flex-direction: row; }
  .seance-nom-sec::after { content: '·'; margin-left: 6px; color: var(--color-text-muted); font-weight: 400; }
}
@media (max-width: 420px) {
  .libelle-long { display: none; }
  .seance-ligne { padding: var(--spacing-md); column-gap: var(--spacing-sm); }
}
@media (prefers-reduced-motion: reduce) {
  .squelette, .tourne, .seance-detail { animation: none; }
}
</style>
