<template>
  <div class="athletes-panel">
    <!-- VUE LISTE -->
    <template v-if="!athleteSelectionne">
      <div class="athletes-panel-header">
        <h2 class="athletes-panel-titre">Athlètes</h2>
        <div class="header-actions">
          <button class="btn btn-sm" @click="ouvrirGestionGroupes()"><i class="ti ti-tags"></i> Gérer mes groupes</button>
          <button class="btn-aide" @click="aideOuverte = true">
            <i class="ti ti-help-circle"></i> Comment lire ces indicateurs ?
          </button>
        </div>
      </div>

      <div class="resume-cercle" v-if="!loading && resumes.length > 0">
        <div class="resume-groupe" v-for="groupe in GROUPES_INDICATEURS" :key="groupe.titre">
          <div class="resume-groupe-titre">{{ groupe.titre }}</div>
          <div class="resume-grid">
            <button
              v-for="cle in groupe.cles"
              :key="cle"
              type="button"
              class="resume-tile"
              :class="[compteurs[cle] > 0 ? `resume-tile-${INDICATEURS[cle].ton}` : '', { active: indicateurFiltre === cle }]"
              :disabled="cle !== 'tous' && compteurs[cle] === 0"
              @click="filtrerPar(cle)"
            >
              <div class="resume-valeur">
                {{ compteurs[cle] }}<span v-if="INDICATEURS[cle].surTotal" class="resume-total">/{{ compteurs.tous }}</span>
              </div>
              <div class="resume-label">{{ INDICATEURS[cle].label }}</div>
              <div class="resume-aide">{{ INDICATEURS[cle].aide }}</div>
            </button>
          </div>
        </div>
        <div class="filtre-actif" v-if="indicateurFiltre !== 'tous'">
          <i class="ti ti-filter"></i>
          <span>{{ INDICATEURS[indicateurFiltre].label }} — {{ INDICATEURS[indicateurFiltre].aide }}</span>
          <button class="btn-effacer-filtre" @click="filtrerPar('tous')"><i class="ti ti-x"></i> Tout afficher</button>
        </div>
      </div>

      <div class="filtres-row">
        <input v-model="rechercheNom" class="input-recherche" placeholder="Rechercher un athlète" />
        <div class="groupe-filtre-chips" v-if="groupes.length > 0">
          <button class="chip-filtre" :class="{ active: groupeFiltre === 'tous' }" @click="groupeFiltre = 'tous'">Tous</button>
          <button
            v-for="g in groupes"
            :key="g.id"
            class="chip-filtre"
            :class="{ active: groupeFiltre === g.id }"
            @click="groupeFiltre = groupeFiltre === g.id ? 'tous' : g.id"
          >
            <span class="groupe-dot" :style="{ background: g.couleur || 'var(--color-primary)' }"></span>
            {{ g.nom }}
          </button>
        </div>
        <select v-if="estSuperPrepa" v-model="organisationFiltre" class="select-org-filtre">
          <option value="toutes">Toutes organisations</option>
          <option value="independant">Indépendant</option>
          <option v-for="org in organisationsCercle" :key="org.id" :value="org.id">{{ org.nom }}</option>
        </select>
      </div>

      <div v-if="loading" class="empty">Chargement...</div>
      <div v-else-if="athletesFiltres.length === 0" class="empty">Aucun athlète pour ce filtre.</div>

      <div class="athlete-monitoring-list">
        <div class="athlete-monitoring-card" v-for="a in athletesFiltres" :key="a.id" @click="ouvrirFiche(a)">
          <div class="amc-clic">
            <div class="amc-head">
              <div class="mini-av-lg">{{ initiales(a.nom) }}</div>
              <div class="amc-info">
                <div class="amc-nom">
                  {{ a.nom }}
                  <span class="badge badge-gray org-badge" v-if="estSuperPrepa">{{ a.organisation?.nom || 'Indépendant' }}</span>
                </div>
                <div class="amc-meta" v-if="a.resume">
                  <span>Charge semaine : <strong>{{ Math.round(a.resume.charge_semaine) }}</strong></span>
                  <i class="ti tendance-icon" :class="iconeTendance(a.resume.tendance)"></i>
                  <span class="wellness-statut" :class="{ ok: a.resume.wellness_repondu_aujourdhui }">
                    <i class="ti" :class="a.resume.wellness_repondu_aujourdhui ? 'ti-circle-check' : 'ti-circle-dashed'"></i>
                    wellness
                  </span>
                </div>
                <div class="amc-infos-recentes" v-if="a.resume">
                  <span><i class="ti ti-run"></i> Dernière séance : <strong>{{ formatDateRecente(a.resume.derniere_seance) }}</strong></span>
                  <span>
                    <i class="ti ti-mood-check"></i> Wellness : <strong>{{ formatDateRecente(a.resume.dernier_wellness) }}</strong>
                    <span v-if="a.resume.hooper_dernier" class="hooper-badge" :class="'wellness-' + a.resume.wellness_zone">{{ a.resume.hooper_dernier }}/28</span>
                  </span>
                  <span>
                    <i class="ti ti-zzz"></i> Sommeil 7 j :
                    <strong>{{ a.resume.sommeil.moyenne !== null ? formatHeures(a.resume.sommeil.moyenne) : '—' }}</strong>
                    <span v-if="a.resume.sommeil.nuits_courtes > 0" class="sommeil-badge" :class="'sommeil-' + a.resume.sommeil.niveau">
                      {{ a.resume.sommeil.nuits_courtes }} nuit{{ a.resume.sommeil.nuits_courtes > 1 ? 's' : '' }} &lt; 7 h
                    </span>
                  </span>
                  <span><i class="ti ti-weight"></i> Poids : <strong>{{ a.resume.dernier_poids ? `${a.resume.dernier_poids.poids}kg (${formatDateRecente(a.resume.dernier_poids.date)})` : '—' }}</strong></span>
                </div>
                <div class="groupes-badges" v-if="groupesDe(a.id).length > 0">
                  <span
                    class="groupe-badge"
                    v-for="g in groupesDe(a.id)"
                    :key="g.id"
                    :style="{ background: (g.couleur || '#7F77DD') + '22', color: g.couleur || 'var(--color-primary-dark)' }"
                  >{{ g.nom }}</span>
                </div>
              </div>
              <span class="acwr-badge" v-if="a.resume" :class="'zone-' + (a.resume.acwr.zone || 'insuffisant')">
                {{ a.resume.acwr.valeur !== null ? a.resume.acwr.valeur.toFixed(2) : '—' }}
              </span>
            </div>
            <div class="amc-signaux" v-if="a.resume">
              <span class="signal-badge signal-blessure" v-if="a.resume.blessures_en_cours > 0">
                <i class="ti ti-bandage"></i>
                {{ a.resume.blessures_en_cours }} blessure{{ a.resume.blessures_en_cours > 1 ? 's' : '' }} en cours
              </span>
              <span class="signal-badge" v-for="(s, i) in a.resume.signaux" :key="i">
                <i class="ti ti-alert-triangle"></i> {{ s }}
              </span>
              <span class="signal-badge signal-ras" v-if="estRAS(a.resume)">
                <i class="ti ti-circle-check"></i> RAS
              </span>
              <span class="signal-badge signal-attente" v-else-if="a.resume.signaux.length === 0">
                <i class="ti ti-hourglass"></i> ACWR pas encore calculable
              </span>
            </div>
          </div>
          <div class="amc-actions">
            <button class="btn-icon-tiny" title="Voir/modifier ses groupes" @click.stop="ouvrirGestionGroupes(a)"><i class="ti ti-tags"></i></button>
            <button class="btn btn-sm btn-danger" @click.stop="retirerDuCercle(a)">Retirer</button>
          </div>
        </div>
      </div>

      <div class="add-athlete-row">
        <input v-model="searchEmail" placeholder="Email de l'athlète" type="email" />
        <button class="btn" @click="rechercherAthlète" :disabled="!searchEmail">Rechercher</button>
      </div>
      <div v-if="athleteTrouve" class="athlete-row found">
        <div class="mini-av-lg">{{ initiales(athleteTrouve.nom) }}</div>
        <div class="athlete-info">
          <div class="athlete-nom">{{ athleteTrouve.nom }}</div>
          <div class="athlete-email">{{ athleteTrouve.email }}</div>
        </div>
        <button class="btn btn-sm btn-primary" @click="ajouterAuCercle">+ Ajouter</button>
      </div>
      <div v-if="searchError" class="error">{{ searchError }}</div>
    </template>

    <!-- FICHE ATHLÈTE -->
    <FicheAthlete
      v-else
      :key="athleteSelectionne.id"
      :athlete="athleteSelectionne"
      :programmes="programmes"
      :groupes="groupes"
      :monCercle="monCercle"
      @fermer="athleteSelectionneId = null"
      @modifie="onModifie"
      @ouvrir-programme="$emit('ouvrir-programme', $event)"
    />

    <GroupesManagerModal
      v-if="modalGroupes"
      :groupes="groupes"
      :monCercle="monCercle"
      :athleteFocus="athleteFocusGroupes"
      @fermer="modalGroupes = false"
      @modifie="onModifie"
    />

    <div class="modal-overlay" v-if="aideOuverte" @click.self="aideOuverte = false">
      <div class="modal modal-large">
        <div class="modal-header">
          <h3>Comment lire ces indicateurs ?</h3>
          <button class="modal-close" @click="aideOuverte = false"><i class="ti ti-x"></i></button>
        </div>
        <div class="modal-body">
          <div class="aide-section">
            <h4>Les indicateurs du tableau de bord</h4>
            <p>Chaque indicateur est cliquable : il filtre la liste sur les athlètes qu'il compte.</p>
            <ul class="aide-indicateurs">
              <li v-for="cle in CLES_INDICATEURS" :key="cle">
                <span class="aide-pastille" :class="`resume-tile-${INDICATEURS[cle].ton}`">{{ compteurs[cle] }}</span>
                <span><strong>{{ INDICATEURS[cle].label }}</strong> — {{ INDICATEURS[cle].definition }}</span>
              </li>
            </ul>
          </div>
          <div class="aide-section">
            <h4>Charge de séance (sRPE)</h4>
            <p>Chaque séance validée par l'athlète donne une charge en UA (unités arbitraires) = <strong>ressenti d'effort (RPE, 0 à 10) × durée en minutes</strong>. C'est la brique de base de tous les indicateurs ci-dessous.</p>
          </div>
          <div class="aide-section">
            <h4>ACWR — charge aiguë / charge chronique</h4>
            <p>Compare la charge des <strong>7 derniers jours</strong> (aiguë) à la moyenne des <strong>28 derniers jours</strong> (chronique). Indisponible avant 28 jours d'historique (badge "—").</p>
            <ul class="aide-zones">
              <li><span class="aide-dot aide-dot-sous_charge"></span><strong>&lt; 0,8</strong> — sous-charge : l'athlète s'entraîne nettement moins que d'habitude.</li>
              <li><span class="aide-dot aide-dot-optimale"></span><strong>0,8 à 1,3</strong> — zone optimale.</li>
              <li><span class="aide-dot aide-dot-vigilance"></span><strong>1,3 à 1,5</strong> — vigilance : montée de charge à surveiller.</li>
              <li><span class="aide-dot aide-dot-surcharge"></span><strong>&gt; 1,5</strong> — surcharge : risque de blessure accru, montée trop rapide.</li>
            </ul>
          </div>
          <div class="aide-section">
            <h4>Monotonie &amp; contrainte</h4>
            <p><strong>Monotonie</strong> = régularité de la charge sur la semaine (charge moyenne ÷ écart-type quotidien). Une monotonie élevée signifie un entraînement peu varié d'un jour à l'autre — un facteur de risque même à charge modérée.</p>
            <p><strong>Contrainte</strong> = charge de la semaine × monotonie. Combine volume et manque de variation : c'est ce chiffre qui grimpe le plus vite en cas de programmation trop répétitive.</p>
          </div>
          <div class="aide-section">
            <h4>Wellness — Hooper Index</h4>
            <p>L'athlète note chaque jour 4 critères de 1 à 7 : sommeil, fatigue, courbatures, stress. Le total va de <strong>4 (forme parfaite) à 28 (très dégradé)</strong> — plus bas = mieux. Un signal se déclenche si l'indice se dégrade 3 jours de suite.</p>
          </div>
          <div class="aide-section">
            <h4>Sommeil — durée</h4>
            <p>L'athlète déclare aussi <strong>combien de temps il a dormi</strong>. C'est une donnée à part du Hooper Index (une durée, pas une note sur 7) : la qualité ressentie et la quantité effective sont deux choses différentes.</p>
            <p>La lecture se fait sur une <strong>fenêtre glissante de 7 nuits</strong>, jamais sur la nuit de la veille : dans la littérature, c'est le manque de sommeil <em>installé</em> qui est associé à la blessure. Sous 4 nuits renseignées sur 7, rien n'est affiché.</p>
            <ul class="aide-zones">
              <li><span class="aide-dot aide-dot-optimale"></span><strong>≥ 8 h</strong> — cible. Chez l'adolescent sportif, dormir 8 h ou plus est associé à environ <strong>deux fois moins</strong> de blessures (Milewski 2014 : &lt; 8 h → OR 1,7).</li>
              <li><span class="aide-dot aide-dot-vigilance"></span><strong>7 à 8 h</strong> — plancher adulte. En dessous de 7 h sur au moins deux semaines, le risque de blessure musculo-squelettique est multiplié par ~1,7.</li>
              <li><span class="aide-dot aide-dot-surcharge"></span><strong>&lt; 6 h</strong> — déficit marqué, signal automatique.</li>
            </ul>
            <p>Une moyenne correcte obtenue avec plusieurs nuits courtes rattrapées par des grasses matinées compte aussi comme insuffisante : l'irrégularité pèse, comme la monotonie sur la charge.</p>
          </div>
          <div class="aide-section">
            <h4>Signaux &amp; RAS</h4>
            <p>Les signaux sont générés automatiquement, sans action du prépa : zone de vigilance ou surcharge sur l'ACWR, wellness dégradé 3 jours de suite, sommeil chronique insuffisant, ou <strong>charge en hausse sur sommeil insuffisant</strong>.</p>
            <p>Ce dernier est le plus important : sommeil réduit <em>pendant</em> une montée de charge est le facteur le plus fortement associé à la blessure (OR ≈ 2,25, contre ~1,5 pour chacun pris isolément). Les deux signaux séparés peuvent être verts alors que leur croisement ne l'est pas.</p>
            <p>Un athlète est marqué <strong>RAS</strong> quand il n'a aucun signal <em>et</em> que son ACWR est calculable. Sans signal mais avec moins de 28 jours de données, il porte le badge <strong>« ACWR pas encore calculable »</strong> : rien ne le signale, mais rien ne prouve non plus que tout va bien.</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch, onMounted } from 'vue'
import { useApi } from '../../services/api'
import { useAuthStore } from '../../stores/auth'
import FicheAthlete from './FicheAthlete.vue'
import GroupesManagerModal from './GroupesManagerModal.vue'
import { formatHeures, estSommeilInsuffisant } from '../../data/sommeil'

// Au-delà, un relevé wellness ne dit plus rien de l'état actuel de l'athlète :
// on ne le compte plus comme « wellness bon ».
const FRAICHEUR_WELLNESS_JOURS = 3
const joursDepuis = (date) => Math.floor((Date.now() - new Date(date).getTime()) / 86400000)

// « Rien à signaler » : aucun signal ET assez d'historique pour que l'ACWR soit
// calculable — sans ça, l'absence de signal ne prouve rien. Une blessure
// déclarée disqualifie aussi le RAS : elle n'est pas un signal automatique,
// mais afficher « rien à signaler » sur un athlète blessé serait faux.
const estRAS = (r) => r.signaux.length === 0 && !!r.acwr.zone && !r.blessures_en_cours

// Source unique des tuiles du bandeau, de leur définition (aide affichée sous
// le libellé + modale) et du filtre appliqué au clic.
const INDICATEURS = {
  tous: {
    label: 'Athlètes suivis', ton: 'neutre', aide: 'tout le cercle',
    definition: 'tous les athlètes de votre cercle.',
    test: () => true
  },
  ras: {
    label: 'RAS', ton: 'optimale', aide: 'rien à signaler',
    definition: "aucun signal actif et ACWR calculable : l'athlète est dans la norme.",
    test: estRAS
  },
  signaux: {
    label: 'Signaux actifs', ton: 'vigilance', aide: 'à regarder en priorité',
    definition: 'au moins une alerte automatique (ACWR en vigilance ou surcharge, wellness dégradé 3 jours de suite).',
    test: (r) => r.signaux.length > 0
  },
  blessures: {
    label: 'Blessés', ton: 'surcharge', aide: 'blessure en cours',
    definition: "ont déclaré une blessure qu'ils n'ont pas encore marquée guérie. Déclaratif : c'est l'athlète qui saisit, jamais un calcul.",
    test: (r) => r.blessures_en_cours > 0
  },
  optimale: {
    label: 'Zone optimale', ton: 'optimale', aide: 'ACWR 0,8 à 1,3',
    definition: 'charge des 7 derniers jours cohérente avec la moyenne des 28 derniers.',
    test: (r) => r.acwr.zone === 'optimale'
  },
  vigilance: {
    label: 'Vigilance', ton: 'vigilance', aide: 'ACWR 1,3 à 1,5',
    definition: 'montée de charge à surveiller sur la semaine.',
    test: (r) => r.acwr.zone === 'vigilance'
  },
  surcharge: {
    label: 'Surcharge', ton: 'surcharge', aide: 'ACWR > 1,5',
    definition: 'montée de charge trop rapide, risque de blessure accru.',
    test: (r) => r.acwr.zone === 'surcharge'
  },
  sous_charge: {
    label: 'Sous-charge', ton: 'neutre', aide: 'ACWR < 0,8',
    definition: "s'entraîne nettement moins que sur ses 4 dernières semaines.",
    test: (r) => r.acwr.zone === 'sous_charge'
  },
  wellness_jour: {
    label: 'Wellness du jour', ton: 'neutre', aide: "ont répondu aujourd'hui", surTotal: true,
    definition: "ont rempli le questionnaire wellness aujourd'hui.",
    test: (r) => r.wellness_repondu_aujourdhui
  },
  wellness_bon: {
    label: 'Wellness bon', ton: 'optimale', aide: 'Hooper ≤ 10 / 28',
    definition: `dernier relevé au vert (Hooper 10 ou moins) et datant de moins de ${FRAICHEUR_WELLNESS_JOURS} jours.`,
    test: (r) => r.wellness_zone === 'bon' && r.dernier_wellness && joursDepuis(r.dernier_wellness) <= FRAICHEUR_WELLNESS_JOURS
  },
  sommeil_insuffisant: {
    label: 'Sommeil insuffisant', ton: 'vigilance', aide: '< 7 h/nuit sur 7 jours',
    definition: "moyenne sous 7 h par nuit sur les 7 dernières, ou au moins 3 nuits courtes sur la période. C'est le déficit installé qui est associé au risque de blessure, pas la mauvaise nuit isolée.",
    test: (r) => estSommeilInsuffisant(r.sommeil)
  }
}

const GROUPES_INDICATEURS = [
  { titre: "Vue d'ensemble", cles: ['tous', 'ras', 'signaux', 'blessures'] },
  { titre: 'Charge — ACWR', cles: ['optimale', 'vigilance', 'surcharge', 'sous_charge'] },
  { titre: 'Wellness', cles: ['wellness_jour', 'wellness_bon', 'sommeil_insuffisant'] }
]
const CLES_INDICATEURS = GROUPES_INDICATEURS.flatMap(g => g.cles)

export default {
  components: { FicheAthlete, GroupesManagerModal },
  emits: ['modifie', 'ouvrir-programme'],
  props: {
    monCercle: { type: Array, default: () => [] },
    groupes: { type: Array, default: () => [] },
    programmes: { type: Array, default: () => [] },
    actif: { type: Boolean, default: false }
  },
  setup(props, { emit }) {
    const api = useApi()
    const authStore = useAuthStore()
    const estSuperPrepa = computed(() => authStore.role === 'super_prepa')

    const resumes = ref([])
    const loading = ref(false)
    const rechercheNom = ref('')
    const groupeFiltre = ref('tous')
    const organisationFiltre = ref('toutes')
    const indicateurFiltre = ref('tous')
    const aideOuverte = ref(false)

    const modalGroupes = ref(false)
    const athleteFocusGroupes = ref(null)
    const ouvrirGestionGroupes = (athlete = null) => {
      athleteFocusGroupes.value = athlete
      modalGroupes.value = true
    }

    const searchEmail = ref('')
    const athleteTrouve = ref(null)
    const searchError = ref('')

    const groupesDe = (athleteId) => props.groupes.filter(g => g.athletes.find(a => a.id === athleteId))

    const organisationsCercle = computed(() => {
      const map = {}
      props.monCercle.forEach(a => { if (a.organisation) map[a.organisation.id] = a.organisation })
      return Object.values(map).sort((a, b) => a.nom.localeCompare(b.nom))
    })

    // Fusionne l'identité du cercle (nom, email, organisation) avec les
    // résumés monitoring (charge, ACWR, wellness, signaux) : les deux
    // listes couvrent toujours le même ensemble d'athlètes côté API.
    const athletesEnrichis = computed(() =>
      props.monCercle.map(a => ({ ...a, resume: resumes.value.find(r => r.athlete_id === a.id) || null }))
    )

    // On ne garde que l'id sélectionné : l'objet athlète est relu depuis la
    // liste enrichie à chaque rendu, donc toujours à jour après un
    // fetchMonCercle déclenché par onModifie (cf. DashboardPrepa.vue). Enrichi
    // et pas brut, pour que la fiche dispose aussi du résumé monitoring.
    const athleteSelectionneId = ref(null)
    const athleteSelectionne = computed(() => athletesEnrichis.value.find(a => a.id === athleteSelectionneId.value) || null)

    const athletesFiltres = computed(() => {
      const indicateur = INDICATEURS[indicateurFiltre.value]
      return athletesEnrichis.value.filter(a => {
        if (rechercheNom.value && !a.nom.toLowerCase().includes(rechercheNom.value.toLowerCase())) return false
        if (groupeFiltre.value !== 'tous' && !groupesDe(a.id).find(g => g.id === groupeFiltre.value)) return false
        if (organisationFiltre.value === 'independant' && a.organisation_id) return false
        if (organisationFiltre.value !== 'toutes' && organisationFiltre.value !== 'independant' && a.organisation_id !== organisationFiltre.value) return false
        if (indicateurFiltre.value !== 'tous' && !(a.resume && indicateur.test(a.resume))) return false
        return true
      })
    })

    // Vue d'ensemble du cercle entier (indépendante des filtres de la liste,
    // pour garder un instantané stable de tout le groupe).
    const compteurs = computed(() =>
      Object.fromEntries(CLES_INDICATEURS.map(cle => [cle, resumes.value.filter(r => INDICATEURS[cle].test(r)).length]))
    )

    // Une tuile à 0 est désactivée côté template : filtrer dessus n'aurait
    // aucun sens. Recliquer la tuile active revient à tout afficher.
    const filtrerPar = (cle) => { indicateurFiltre.value = indicateurFiltre.value === cle ? 'tous' : cle }

    const fetchResumes = async () => {
      loading.value = true
      resumes.value = await api.get('/monitoring/cercle')
      loading.value = false
    }

    const ouvrirFiche = (athlete) => { athleteSelectionneId.value = athlete.id }

    // Point d'entrée unique pour toute mutation (cercle, groupes,
    // assignation programme) : remonte au parent (monCercle/groupes/
    // programmes) et rafraîchit les résumés monitoring possédés ici.
    const onModifie = async () => {
      emit('modifie')
      await fetchResumes()
    }

    const retirerDuCercle = async (athlete) => {
      await api.del(`/users/mes-athletes/${athlete.id}`)
      await onModifie()
    }

    const rechercherAthlète = async () => {
      searchError.value = ''
      athleteTrouve.value = null
      try {
        const found = await api.get(`/users/recherche?email=${encodeURIComponent(searchEmail.value)}`)
        if (found.detail) { searchError.value = found.detail; return }
        if (props.monCercle.find(a => a.id === found.id)) { searchError.value = 'Déjà dans votre cercle'; return }
        athleteTrouve.value = found
      } catch { searchError.value = 'Athlète introuvable' }
    }

    const ajouterAuCercle = async () => {
      await api.post(`/users/mes-athletes/${athleteTrouve.value.id}`)
      athleteTrouve.value = null
      searchEmail.value = ''
      await onModifie()
    }

    const iconeTendance = (t) => ({ hausse: 'ti-trending-up', baisse: 'ti-trending-down', stable: 'ti-minus' }[t] || 'ti-minus')
    const initiales = (nom) => nom.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    const formatDateRecente = (d) => d ? new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : '—'

    watch(() => props.actif, (actif) => { if (actif && resumes.value.length === 0 && !loading.value) fetchResumes() })
    onMounted(() => { if (props.actif) fetchResumes() })

    return {
      INDICATEURS, GROUPES_INDICATEURS, CLES_INDICATEURS, compteurs, indicateurFiltre, filtrerPar, estRAS,
      resumes, loading, rechercheNom, groupeFiltre, organisationFiltre, organisationsCercle, athletesFiltres,
      estSuperPrepa, athleteSelectionneId, athleteSelectionne, ouvrirFiche, aideOuverte,
      modalGroupes, athleteFocusGroupes, ouvrirGestionGroupes, groupesDe,
      searchEmail, athleteTrouve, searchError, rechercherAthlète, ajouterAuCercle, retirerDuCercle,
      onModifie, iconeTendance, initiales, formatDateRecente, formatHeures
    }
  }
}
</script>

<style scoped>
.athletes-panel { display: flex; flex-direction: column; gap: var(--spacing-lg); padding: var(--spacing-xl) var(--spacing-2xl); overflow-y: auto; flex: 1; }

.athletes-panel-header { display: flex; align-items: center; justify-content: space-between; gap: var(--spacing-md); flex-wrap: wrap; }
.athletes-panel-titre { margin: 0; font-size: var(--font-size-lg); font-weight: 700; }
.header-actions { display: flex; align-items: center; gap: var(--spacing-sm); flex-wrap: wrap; }
.btn-aide {
  display: inline-flex; align-items: center; gap: 6px;
  min-height: 36px; padding: 0 var(--spacing-md);
  border: 1px solid var(--color-border); border-radius: var(--radius-full);
  font-size: var(--font-size-sm); font-weight: 600;
  background: var(--color-bg); color: var(--color-primary-text); cursor: pointer;
}
.btn-aide:hover { background: var(--color-bg-secondary); }

.resume-cercle { display: flex; flex-direction: column; gap: var(--spacing-md); }
.resume-groupe { display: flex; flex-direction: column; gap: 6px; }
.resume-groupe-titre {
  font-size: var(--font-size-xs); font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.4px; color: var(--color-text-muted);
}
.resume-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: var(--spacing-sm); }
.resume-tile {
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px;
  padding: var(--spacing-md) var(--spacing-sm);
  border: 1px solid var(--color-border); border-radius: var(--radius-lg);
  background: var(--color-bg); text-align: center; cursor: pointer;
  font-family: inherit; color: inherit;
}
.resume-tile:hover:not(:disabled) { border-color: var(--color-primary); }
.resume-tile.active { box-shadow: 0 0 0 2px var(--color-primary); border-color: var(--color-primary); }
.resume-tile:disabled { opacity: 0.5; cursor: default; }
.resume-valeur { font-size: var(--font-size-xl); font-weight: 700; }
.resume-total { font-size: var(--font-size-sm); font-weight: 600; color: var(--color-text-muted); }
.resume-label { font-size: var(--font-size-xs); font-weight: 600; color: var(--color-text-secondary); }
.resume-aide { font-size: 10px; color: var(--color-text-muted); line-height: 1.3; }
.resume-tile-optimale { border-color: var(--color-valid-text-strong); background: var(--color-valid-bg); }
.resume-tile-optimale .resume-valeur { color: var(--color-valid-text-strong); }
.resume-tile-vigilance { border-color: var(--color-warning-text-strong); background: var(--color-warning-bg); }
.resume-tile-vigilance .resume-valeur { color: var(--color-warning-text-strong); }
.resume-tile-surcharge { border-color: var(--color-danger-text); background: var(--color-danger-bg); }
.resume-tile-surcharge .resume-valeur { color: var(--color-danger-text); }

.filtre-actif {
  display: flex; align-items: center; gap: var(--spacing-sm); flex-wrap: wrap;
  padding: var(--spacing-sm) var(--spacing-md);
  border: 1px solid var(--color-primary); border-radius: var(--radius-md);
  background: var(--color-primary-light); color: var(--color-primary-text);
  font-size: var(--font-size-sm); font-weight: 600;
}
.filtre-actif span { flex: 1; min-width: 0; }
.btn-effacer-filtre {
  display: inline-flex; align-items: center; gap: 4px;
  min-height: 32px; padding: 0 var(--spacing-md);
  border: 1px solid var(--color-primary); border-radius: var(--radius-full);
  background: var(--color-bg); color: var(--color-primary-text);
  font-size: var(--font-size-xs); font-weight: 600; cursor: pointer;
}

.modal-large { max-width: 640px; }
.aide-indicateurs { list-style: none; margin: var(--spacing-sm) 0 0; padding: 0; display: flex; flex-direction: column; gap: var(--spacing-sm); }
.aide-indicateurs li { display: flex; align-items: center; gap: var(--spacing-sm); font-size: var(--font-size-sm); color: var(--color-text-secondary); }
.aide-indicateurs strong { color: var(--color-text); }
.aide-pastille {
  flex-shrink: 0; min-width: 30px; padding: 2px 6px;
  border: 1px solid var(--color-border); border-radius: var(--radius-md);
  background: var(--color-bg); text-align: center;
  font-size: var(--font-size-xs); font-weight: 700;
}
.aide-pastille.resume-tile-optimale { color: var(--color-valid-text-strong); }
.aide-pastille.resume-tile-vigilance { color: var(--color-warning-text-strong); }
.aide-pastille.resume-tile-surcharge { color: var(--color-danger-text); }
.aide-section h4 { margin: 0 0 4px; font-size: var(--font-size-sm); font-weight: 700; }
.aide-section p { margin: 0 0 var(--spacing-xs); font-size: var(--font-size-sm); color: var(--color-text-secondary); line-height: 1.5; }
.aide-section + .aide-section { margin-top: var(--spacing-md); padding-top: var(--spacing-md); border-top: 1px solid var(--color-border); }
.aide-zones { list-style: none; margin: var(--spacing-xs) 0 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
.aide-zones li { font-size: var(--font-size-sm); color: var(--color-text-secondary); display: flex; align-items: baseline; gap: 8px; }
.aide-dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; align-self: center; }
.aide-dot-optimale { background: var(--color-valid-text-strong); }
.aide-dot-vigilance { background: var(--color-warning-text-strong); }
.aide-dot-surcharge { background: var(--color-danger-text); }
.aide-dot-sous_charge { background: var(--color-text-muted); }

.filtres-row { display: flex; align-items: center; gap: var(--spacing-md); flex-wrap: wrap; }
.input-recherche {
  min-height: var(--tap-min);
  padding: 0 var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--font-size-base);
  background: var(--color-bg);
  min-width: 200px;
  flex: 1;
}
.groupe-filtre-chips { display: flex; gap: 6px; flex-wrap: wrap; }
.chip-filtre {
  display: inline-flex; align-items: center; gap: 6px;
  min-height: 36px; padding: 0 var(--spacing-md);
  border: 1px solid var(--color-border); border-radius: var(--radius-full);
  font-size: var(--font-size-sm); background: var(--color-bg); color: var(--color-text-secondary); cursor: pointer;
}
.chip-filtre.active { background: var(--color-primary-light); border-color: var(--color-primary); color: var(--color-primary-text); font-weight: 600; }
.groupe-dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
.select-org-filtre {
  min-height: 36px; padding: 0 var(--spacing-md);
  border: 1px solid var(--color-border); border-radius: var(--radius-md);
  font-size: var(--font-size-sm); background: var(--color-bg);
}

.athlete-monitoring-list { display: flex; flex-direction: column; gap: var(--spacing-sm); }
.athlete-monitoring-card {
  display: flex; flex-direction: column; gap: var(--spacing-sm);
  padding: var(--spacing-md) var(--spacing-lg);
  border: 1px solid var(--color-border); border-radius: var(--radius-lg);
  background: var(--color-bg);
  cursor: pointer;
}
.athlete-monitoring-card:hover { border-color: var(--color-primary); background: var(--color-bg-secondary); }
.amc-clic {
  display: flex; flex-direction: column; gap: var(--spacing-sm);
  width: 100%;
}
.amc-infos-recentes {
  display: flex; align-items: center; gap: var(--spacing-md);
  font-size: var(--font-size-xs); color: var(--color-text-secondary);
  flex-wrap: wrap; margin-top: 2px;
}
.amc-infos-recentes .ti { margin-right: 2px; }
.amc-infos-recentes strong { color: var(--color-text); font-weight: 600; }
.amc-head { display: flex; align-items: center; gap: var(--spacing-md); }
.mini-av-lg {
  width: var(--avatar-md); height: var(--avatar-md); border-radius: 50%;
  background: var(--color-avatar-athlete-bg); color: var(--color-avatar-athlete-text);
  display: flex; align-items: center; justify-content: center;
  font-size: var(--font-size-xs); font-weight: 600; flex-shrink: 0;
}
.amc-info { flex: 1; min-width: 0; }
.amc-nom { font-size: var(--font-size-sm); font-weight: 600; }
.amc-nom .org-badge { margin-left: 6px; font-weight: 500; }
.amc-meta { display: flex; align-items: center; gap: var(--spacing-sm); font-size: var(--font-size-xs); color: var(--color-text-secondary); flex-wrap: wrap; margin-top: 2px; }
.tendance-icon { font-size: var(--font-size-base); }
.wellness-statut { display: inline-flex; align-items: center; gap: 3px; color: var(--color-text-muted); }
.wellness-statut.ok { color: var(--color-valid-text-strong); }
.groupes-badges { display: flex; gap: 4px; flex-wrap: wrap; margin-top: 4px; }
.groupe-badge { font-size: var(--font-size-xs); font-weight: 600; padding: 2px 8px; border-radius: var(--radius-full); }
.acwr-badge {
  font-size: var(--font-size-sm); font-weight: 700; padding: 4px 10px; border-radius: var(--radius-full); flex-shrink: 0;
}
.acwr-badge.zone-optimale { background: var(--color-valid-bg); color: var(--color-valid-text-strong); }
.acwr-badge.zone-vigilance { background: var(--color-warning-bg); color: var(--color-warning-text-strong); }
.acwr-badge.zone-surcharge { background: var(--color-danger-bg); color: var(--color-danger-text); }
.acwr-badge.zone-sous_charge { background: var(--color-bg-tertiary); color: var(--color-text-secondary); }
.acwr-badge.zone-insuffisant { background: var(--color-bg-tertiary); color: var(--color-text-muted); }
.amc-signaux { display: flex; gap: 6px; flex-wrap: wrap; }
.signal-badge {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: var(--font-size-xs); font-weight: 600;
  padding: 3px 9px; border-radius: var(--radius-full);
  background: var(--color-warning-bg); color: var(--color-warning-text-strong);
}
.signal-badge.signal-ras { background: var(--color-valid-bg); color: var(--color-valid-text-strong); }
.signal-badge.signal-attente { background: var(--color-bg-tertiary); color: var(--color-text-muted); }
.signal-badge.signal-blessure { background: var(--color-danger-bg); color: var(--color-danger-text); }
.hooper-badge {
  margin-left: 4px; padding: 1px 6px; border-radius: var(--radius-full);
  font-size: 10px; font-weight: 700;
  background: var(--color-bg-tertiary); color: var(--color-text-secondary);
}
.hooper-badge.wellness-bon { background: var(--color-valid-bg); color: var(--color-valid-text-strong); }
.hooper-badge.wellness-degrade { background: var(--color-danger-bg); color: var(--color-danger-text); }

.sommeil-badge {
  margin-left: 4px; padding: 1px 6px; border-radius: var(--radius-full);
  font-size: var(--font-size-xs); font-weight: 700;
  background: var(--color-bg-tertiary); color: var(--color-text-secondary);
}
.sommeil-badge.sommeil-modere { background: var(--color-warning-bg); color: var(--color-warning-text); }
.sommeil-badge.sommeil-eleve { background: var(--color-danger-bg); color: var(--color-danger-text); }
.amc-actions { display: flex; justify-content: flex-end; align-items: center; gap: var(--spacing-sm); }
.btn-icon-tiny {
  width: 28px; height: 28px; padding: 0;
  display: inline-flex; align-items: center; justify-content: center;
  border-radius: var(--radius-sm); border: none; cursor: pointer;
  background: transparent; color: var(--color-text-secondary); flex-shrink: 0;
}
.btn-icon-tiny:hover { background: var(--color-bg-tertiary); color: var(--color-text); }

.add-athlete-row { display: flex; gap: var(--spacing-sm); margin-top: var(--spacing-sm); flex-wrap: wrap; }
.add-athlete-row input {
  flex: 1; min-width: 180px; min-height: var(--tap-min);
  padding: 0 var(--spacing-md); border: 1px solid var(--color-border);
  border-radius: var(--radius-md); font-size: var(--font-size-base); background: var(--color-bg);
}
.athlete-row {
  display: flex; align-items: center; gap: var(--spacing-md);
  padding: var(--spacing-md) var(--spacing-lg);
  border: 1px solid var(--color-border); border-radius: var(--radius-lg); background: var(--color-bg);
}
.athlete-row.found { border-color: var(--color-primary); background: var(--color-primary-light); }
.athlete-info { flex: 1; min-width: 0; }
.athlete-nom { font-size: var(--font-size-sm); font-weight: 600; }
.athlete-email { font-size: var(--font-size-xs); color: var(--color-text-secondary); }

@media (max-width: 768px) {
  .athletes-panel { padding: var(--spacing-md) var(--spacing-lg); }
  .resume-grid { grid-template-columns: repeat(auto-fit, minmax(105px, 1fr)); }
}
</style>
