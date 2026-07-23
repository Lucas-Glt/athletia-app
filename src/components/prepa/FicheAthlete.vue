<template>
  <div class="fiche-athlete" @pointerdown="onSwipeStart" @pointerup="onSwipeEnd" @pointercancel="onSwipeEnd">
    <div class="fiche-topbar">
      <button class="btn btn-sm retour-fiche" @click="$emit('fermer')">
        <i class="ti ti-arrow-left"></i> Retour
      </button>
      <div class="fiche-topbar-actions">
        <button class="btn btn-sm" @click="modalGroupes = true"><i class="ti ti-tags"></i> Groupes</button>
        <button class="btn btn-sm btn-danger" @click="retirerDuCercle"><i class="ti ti-user-minus"></i> Retirer</button>
      </div>
    </div>

    <div class="fiche-header">
      <div class="mini-av-lg">{{ initiales(athlete.nom) }}</div>
      <div class="fiche-header-info">
        <h3>
          {{ athlete.nom }}
          <span class="badge badge-gray org-badge" v-if="estSuperPrepa">{{ athlete.organisation?.nom || 'Indépendant' }}</span>
        </h3>
        <div class="athlete-email">{{ athlete.email }}</div>
        <div class="groupes-badges" v-if="groupesDe.length > 0">
          <span
            class="groupe-badge"
            v-for="g in groupesDe"
            :key="g.id"
            :style="{ background: (g.couleur || '#7F77DD') + '22', color: g.couleur || 'var(--color-primary-dark)' }"
          >{{ g.nom }}</span>
        </div>
      </div>
    </div>

    <GroupesManagerModal
      v-if="modalGroupes"
      :groupes="groupes"
      :monCercle="monCercle"
      :athleteFocus="athlete"
      @fermer="modalGroupes = false"
      @modifie="$emit('modifie')"
    />

    <div class="tabs">
      <div class="tab" :class="{ active: sousOnglet === 'apercu' }" @click="allerA('apercu')">Aperçu</div>
      <div class="tab" :class="{ active: sousOnglet === 'programme' }" @click="allerA('programme')">Programme</div>
      <div class="tab" :class="{ active: sousOnglet === 'seances' }" @click="allerA('seances')">Séances</div>
      <div class="tab" :class="{ active: sousOnglet === 'poids' }" @click="allerA('poids')">Poids</div>
    </div>

    <!-- APERÇU : monitoring (charge, ACWR, wellness) -->
    <div v-if="sousOnglet === 'apercu'" class="tab-content">
      <div v-if="loadingApercu" class="empty">Chargement...</div>
      <template v-else-if="detail">
        <div class="stat-card">
          <GraphiqueAcwrZones :points="pointsAcwr" :actuel="detail.acwr_actuel" />
        </div>
        <div class="detail-grid">
          <div class="stat-card">
            <CourbeProgression :points="detail.charges_quotidiennes.map(p => ({ date: p.date, valeur: p.valeur }))" label="Charge quotidienne" unite=" UA" axe-x="dates" />
          </div>
          <div class="stat-card">
            <CourbeProgression :points="detail.charges_hebdomadaires.map(p => ({ date: p.date, valeur: p.valeur }))" label="Charge hebdomadaire (glissante)" unite=" UA" axe-x="dates" />
          </div>
        </div>
        <div class="stat-card">
          <GraphiqueDouble :points="pointsAigueChronique" label="Charge aiguë vs chronique" label-a="Aiguë (7j)" label-b="Chronique (28j)" />
        </div>
        <div class="detail-grid">
          <div class="stat-card">
            <CourbeProgression :points="pointsMonotonie" label="Monotonie" unite="" axe-x="dates" />
          </div>
          <div class="stat-card">
            <CourbeProgression :points="pointsContrainte" label="Contrainte (strain)" unite=" UA" axe-x="dates" />
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-card-titre">Wellness — Hooper Index</div>
          <CourbeProgression :points="pointsHooper" label="Hooper Index (4 à 28, plus bas = mieux)" unite="" axe-x="dates" />
          <template v-if="dernierWellness">
            <div class="stat-card-titre stat-card-titre-sm">Dernier relevé — {{ formatDateCourt(dernierWellness.date) }}</div>
            <GraphiqueBarres :barres="barresDernierWellness" unite="/7" />
          </template>
        </div>
      </template>
    </div>

    <!-- PROGRAMME : assignation -->
    <div v-if="sousOnglet === 'programme'" class="tab-content">
      <div v-if="programmes.length === 0" class="empty">Aucun programme créé pour l'instant.</div>
      <div class="programme-assign-list" v-else>
        <div class="programme-assign-row" v-for="p in programmes" :key="p.id">
          <div class="programme-assign-info">
            <span class="programme-assign-nom">{{ p.nom }}</span>
            <span class="badge" :class="p.statut === 'actif' ? 'badge-green' : 'badge-gray'">{{ p.statut }}</span>
          </div>
          <div class="programme-assign-actions">
            <template v-if="estAssigne(p)">
              <button class="btn btn-sm" @click="$emit('ouvrir-programme', p)">Voir / éditer</button>
              <button class="btn btn-sm btn-danger" :disabled="enCours.has(p.id)" @click="retirerProgramme(p)">Retirer</button>
            </template>
            <button v-else class="btn btn-sm btn-primary" :disabled="enCours.has(p.id)" @click="assignerProgramme(p)">Assigner</button>
          </div>
        </div>
      </div>
    </div>

    <!-- SÉANCES : logs prescrit vs réalisé -->
    <div v-if="sousOnglet === 'seances'" class="tab-content">
      <div v-if="programmesAssignes.length === 0" class="empty">Aucun programme assigné à cet athlète.</div>
      <template v-else>
        <select v-if="programmesAssignes.length > 1" v-model="programmeLogsId" class="select-programme-logs">
          <option v-for="p in programmesAssignes" :key="p.id" :value="p.id">{{ p.nom }}</option>
        </select>
        <div v-if="loadingLogs" class="empty">Chargement...</div>
        <div v-else-if="logsGroupes.length === 0" class="empty">Aucun log enregistré pour cet athlète.</div>
        <div v-else>
          <div v-for="session in logsGroupes" :key="session.key" class="session-block">
            <div class="session-head">
              <span class="badge badge-purple" v-if="session.jour">{{ session.jour }}</span>
              <span class="session-nom">{{ session.seanceNom }}</span>
              <span class="session-date">{{ formatDate(session.date) }}</span>
            </div>
            <div class="session-body">
              <div
                v-for="groupe in grouperExosSession(session.exercices)"
                :key="groupe.key"
                class="exo-groupe-log"
                :class="{ 'is-superset': groupe.exercices.length > 1 }"
              >
                <div v-if="groupe.exercices.length > 1" class="superset-banner">
                  <i class="ti ti-link"></i>
                  <span>Superset/Biset · {{ groupe.exercices.length }} exercices</span>
                </div>

                <div v-for="(exo, eidx) in groupe.exercices" :key="exo.id" class="exo-bloc">
                  <div class="exo-header">
                    <span class="exo-letter" v-if="groupe.exercices.length > 1">{{ letterFor(eidx) }}</span>
                    <div class="exo-num" v-else>{{ exo.ordre }}</div>
                    <span class="exo-name">{{ exo.nom }}</span>
                  </div>
                  <div class="comparatif-grid">
                    <div class="comparatif-header">
                      <span>Série</span><span>Prescrit</span><span></span><span>Réalisé</span><span></span>
                    </div>
                    <div v-for="(log, i) in exo.logs" :key="log.id" class="comparatif-row" :class="getStatutClasse(log, session.typeSeance)">
                      <span class="serie-num">{{ i + 1 }}</span>
                      <div class="prescrit-cell">
                        <template v-if="session.typeSeance === 'natation' || session.typeSeance === 'athletisme'">
                          <span v-if="log.serie.metres">{{ log.serie.metres }} m</span>
                          <span v-if="log.serie.intensite"> · {{ log.serie.intensite }}</span>
                        </template>
                        <template v-else-if="session.typeSeance === 'pliometrie'">
                          <span v-if="log.serie.bonds">{{ log.serie.bonds }} bonds</span>
                          <span v-if="log.serie.intensite"> · {{ log.serie.intensite }}</span>
                        </template>
                        <template v-else>
                          <span v-if="log.serie.nb_reps">{{ log.serie.nb_reps }} reps</span>
                          <span v-if="log.serie.poids_cible"> · {{ log.serie.poids_cible }}</span>
                          <span v-if="log.serie.rm"> · {{ log.serie.rm }}</span>
                        </template>
                      </div>
                      <i class="ti ti-arrow-right comparatif-arrow"></i>
                      <div class="realise-cell">
                        <template v-if="log.fait">
                          <template v-if="session.typeSeance === 'natation' || session.typeSeance === 'athletisme'">
                            <span v-if="log.reps_realisees">{{ log.reps_realisees }} m</span>
                            <span v-if="log.poids_realise"> · {{ log.poids_realise }}</span>
                          </template>
                          <template v-else-if="session.typeSeance === 'pliometrie'">
                            <span v-if="log.reps_realisees">{{ log.reps_realisees }} bonds</span>
                            <span v-if="log.poids_realise"> · {{ log.poids_realise }}</span>
                          </template>
                          <template v-else>
                            <span v-if="log.reps_realisees">{{ log.reps_realisees }} reps</span>
                            <span v-if="log.poids_realise"> · {{ log.poids_realise }}</span>
                          </template>
                          <span v-if="!log.reps_realisees && !log.poids_realise">—</span>
                        </template>
                        <span v-else class="non-fait"><i class="ti ti-x"></i> non réalisée</span>
                      </div>
                      <span class="statut-icon"><i :class="getStatutIcon(log, session.typeSeance)"></i></span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>

    <!-- POIDS : lecture seule -->
    <div v-if="sousOnglet === 'poids'" class="tab-content">
      <div v-if="loadingPoids" class="empty">Chargement...</div>
      <div v-else-if="courbePoids.length === 0" class="empty">Aucune pesée enregistrée pour cet athlète.</div>
      <div v-else class="stat-card">
        <CourbeProgression :points="courbePoids" label="Poids" unite="kg" axe-x="dates" />
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue'
import { useApi } from '../../services/api'
import { useAuthStore } from '../../stores/auth'
import CourbeProgression from '../athlete/CourbeProgression.vue'
import GraphiqueDouble from '../monitoring/GraphiqueDouble.vue'
import GraphiqueAcwrZones from '../monitoring/GraphiqueAcwrZones.vue'
import GraphiqueBarres from '../monitoring/GraphiqueBarres.vue'
import GroupesManagerModal from './GroupesManagerModal.vue'

export default {
  components: { CourbeProgression, GraphiqueDouble, GraphiqueAcwrZones, GraphiqueBarres, GroupesManagerModal },
  emits: ['fermer', 'modifie', 'ouvrir-programme'],
  props: {
    athlete: { type: Object, required: true },
    programmes: { type: Array, default: () => [] },
    groupes: { type: Array, default: () => [] },
    monCercle: { type: Array, default: () => [] }
  },
  setup(props, { emit }) {
    const api = useApi()
    const authStore = useAuthStore()
    const estSuperPrepa = computed(() => authStore.role === 'super_prepa')

    const sousOnglet = ref('apercu')
    const modalGroupes = ref(false)

    const groupesDe = computed(() => props.groupes.filter(g => g.athletes.find(a => a.id === props.athlete.id)))
    const initiales = (nom) => nom.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

    const retirerDuCercle = async () => {
      await api.del(`/users/mes-athletes/${props.athlete.id}`)
      emit('modifie')
      emit('fermer')
    }

    // --- Aperçu (monitoring) : identique à l'ancien MonitoringPanel.vue ---
    const detail = ref(null)
    const loadingApercu = ref(false)
    const fetchApercu = async () => {
      loadingApercu.value = true
      detail.value = await api.get(`/monitoring/athlete/${props.athlete.id}`)
      loadingApercu.value = false
    }

    const pointsAcwr = computed(() => detail.value ? detail.value.aigue_chronique.map(p => ({ date: p.date, acwr: p.acwr })) : [])
    const pointsAigueChronique = computed(() => detail.value ? detail.value.aigue_chronique.map(p => ({ date: p.date, valeurA: p.aigue, valeurB: p.chronique })) : [])
    const pointsMonotonie = computed(() => detail.value ? detail.value.monotonie_contrainte.filter(p => p.monotonie !== null).map(p => ({ date: p.date, valeur: p.monotonie })) : [])
    const pointsContrainte = computed(() => detail.value ? detail.value.monotonie_contrainte.filter(p => p.contrainte !== null).map(p => ({ date: p.date, valeur: p.contrainte })) : [])
    const pointsHooper = computed(() => detail.value ? detail.value.wellness.map(p => ({ date: p.date, valeur: p.hooper_index })) : [])
    const dernierWellness = computed(() => detail.value?.wellness.length ? detail.value.wellness[detail.value.wellness.length - 1] : null)
    const barresDernierWellness = computed(() => {
      if (!dernierWellness.value) return []
      const w = dernierWellness.value
      return [
        { cle: 'sommeil', nom: 'Sommeil', valeur: w.sommeil },
        { cle: 'fatigue', nom: 'Fatigue', valeur: w.fatigue },
        { cle: 'courbatures', nom: 'Courbatures', valeur: w.courbatures },
        { cle: 'stress', nom: 'Stress', valeur: w.stress }
      ]
    })
    const formatDateCourt = (d) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })

    // --- Programme : assigner/retirer cet athlète ---
    const enCours = ref(new Set())
    const estAssigne = (p) => p.athletes.some(a => a.id === props.athlete.id)
    const assignerProgramme = async (p) => {
      enCours.value.add(p.id)
      try {
        await api.post(`/programmes/${p.id}/assigner/${props.athlete.id}`)
        emit('modifie')
      } finally {
        enCours.value.delete(p.id)
      }
    }
    const retirerProgramme = async (p) => {
      enCours.value.add(p.id)
      try {
        await api.del(`/programmes/${p.id}/retirer/${props.athlete.id}`)
        emit('modifie')
      } finally {
        enCours.value.delete(p.id)
      }
    }

    // --- Séances : logs prescrit vs réalisé (repris de l'ex-onglet "Logs athlètes") ---
    const programmesAssignes = computed(() => props.programmes.filter(p => estAssigne(p)))
    const programmeLogsId = ref(null)
    const logs = ref([])
    const loadingLogs = ref(false)

    const fetchLogs = async () => {
      if (!programmeLogsId.value) { logs.value = []; return }
      loadingLogs.value = true
      logs.value = await api.get(`/logs/programme/${programmeLogsId.value}/athlete/${props.athlete.id}`)
      loadingLogs.value = false
    }

    const ouvrirSeances = () => {
      sousOnglet.value = 'seances'
      if (!programmeLogsId.value && programmesAssignes.value.length > 0) {
        programmeLogsId.value = programmesAssignes.value[0].id
      }
    }
    watch(programmeLogsId, fetchLogs)

    // L'API renvoie les logs triés par date décroissante (dernière tentative
    // en tête) — un ordre qui reflète QUAND chaque série a été loguée, pas SA
    // position prescrite. Comme la série non réalisée d'une séance est
    // souvent celle envoyée en dernier (donc la plus récente), elle remontait
    // en position 1 au lieu de sa vraie place : on retrie chaque exercice par
    // l'id de la série prescrite (attribué dans l'ordre de création, donc
    // dans l'ordre du programme) pour retrouver l'ordre réel 1, 2, 3...
    const logsGroupes = computed(() => {
      const sessions = {}
      logs.value.forEach(log => {
        const dateStr = log.date.split('T')[0]
        const key = `${dateStr}__${log.seance.id}`
        if (!sessions[key]) sessions[key] = { key, date: dateStr, seanceNom: log.seance.nom, jour: log.seance.jour, typeSeance: log.seance.type_seance, exercices: {} }
        if (!sessions[key].exercices[log.exercice.id]) {
          sessions[key].exercices[log.exercice.id] = { id: log.exercice.id, nom: log.exercice.nom, ordre: log.exercice.ordre, groupe: log.exercice.groupe, logs: [] }
        }
        sessions[key].exercices[log.exercice.id].logs.push(log)
      })
      return Object.values(sessions)
        .sort((a, b) => b.date.localeCompare(a.date))
        .map(s => ({
          ...s,
          exercices: Object.values(s.exercices)
            .sort((a, b) => a.ordre - b.ordre)
            .map(e => ({ ...e, logs: [...e.logs].sort((a, b) => a.serie.id - b.serie.id) }))
        }))
    })

    // Regroupe les exercices d'une session en supersets/bisets (même logique
    // que grouperExercices côté édition de programme) pour un affichage plus
    // lisible quand plusieurs exercices sont enchaînés.
    const grouperExosSession = (exercices) => {
      const groupes = []
      const map = {}
      exercices.forEach(exo => {
        if (exo.groupe) {
          if (!map[exo.groupe]) {
            map[exo.groupe] = { key: `g${exo.groupe}`, exercices: [] }
            groupes.push(map[exo.groupe])
          }
          map[exo.groupe].exercices.push(exo)
        } else {
          groupes.push({ key: `e${exo.id}`, exercices: [exo] })
        }
      })
      return groupes
    }

    const letterFor = (idx) => String.fromCharCode(65 + idx)

    const formatDate = (d) => new Date(d).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

    const getStatutClasse = (log, typeSeance) => {
      if (!log.fait) return 'statut-skip'
      if (!log.reps_realisees && !log.poids_realise) return 'statut-warn'
      const prescrit = typeSeance === 'natation' || typeSeance === 'athletisme'
        ? log.serie.metres
        : typeSeance === 'pliometrie'
          ? log.serie.bonds
          : log.serie.nb_reps
      const prescR = parseFloat(prescrit)
      const realR = parseFloat(log.reps_realisees)
      if (!isNaN(prescR) && !isNaN(realR) && realR < prescR) return 'statut-warn'
      return 'statut-done'
    }

    const getStatutIcon = (log, typeSeance) => {
      if (!log.fait) return 'ti ti-x'
      return getStatutClasse(log, typeSeance) === 'statut-warn' ? 'ti ti-alert-triangle' : 'ti ti-check'
    }

    // --- Poids : lecture seule ---
    const entriesPoids = ref([])
    const loadingPoids = ref(false)
    const poidsCharge = ref(false)
    const fetchPoids = async () => {
      loadingPoids.value = true
      try {
        entriesPoids.value = await api.get(`/poids/athlete/${props.athlete.id}`)
      } finally {
        loadingPoids.value = false
        poidsCharge.value = true
      }
    }
    const courbePoids = computed(() =>
      [...entriesPoids.value]
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .map(e => ({ date: e.date, valeur: e.poids }))
    )
    const ouvrirPoids = () => {
      sousOnglet.value = 'poids'
      if (!poidsCharge.value) fetchPoids()
    }

    // --- Navigation par onglet (clic ou swipe) ---
    const ONGLETS_FICHE = ['apercu', 'programme', 'seances', 'poids']
    const allerA = (tab) => {
      if (tab === 'seances') ouvrirSeances()
      else if (tab === 'poids') ouvrirPoids()
      else sousOnglet.value = tab
    }

    // Swipe gauche/droite pour changer d'onglet, même logique que le swipe
    // de tabs du dashboard athlète (détection au relâché uniquement, pour
    // ne jamais interférer avec le scroll vertical ou les clics).
    const swipeState = { startX: 0, startY: 0, active: false }
    const onSwipeStart = (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return
      swipeState.startX = e.clientX
      swipeState.startY = e.clientY
      swipeState.active = true
    }
    const onSwipeEnd = (e) => {
      if (!swipeState.active) return
      swipeState.active = false
      const dx = e.clientX - swipeState.startX
      const dy = e.clientY - swipeState.startY
      if (Math.abs(dy) > Math.abs(dx) + 10) return
      const idx = ONGLETS_FICHE.indexOf(sousOnglet.value)
      if (dx <= -60 && idx < ONGLETS_FICHE.length - 1) allerA(ONGLETS_FICHE[idx + 1])
      else if (dx >= 60 && idx > 0) allerA(ONGLETS_FICHE[idx - 1])
    }

    onMounted(fetchApercu)

    return {
      estSuperPrepa, sousOnglet, modalGroupes, groupesDe, initiales, retirerDuCercle,
      detail, loadingApercu, pointsAcwr, pointsAigueChronique, pointsMonotonie, pointsContrainte,
      pointsHooper, dernierWellness, barresDernierWellness, formatDateCourt,
      enCours, estAssigne, assignerProgramme, retirerProgramme,
      programmesAssignes, programmeLogsId, loadingLogs, logsGroupes, ouvrirSeances,
      grouperExosSession, letterFor,
      formatDate, getStatutClasse, getStatutIcon,
      loadingPoids, courbePoids, ouvrirPoids,
      allerA, onSwipeStart, onSwipeEnd
    }
  }
}
</script>

<style scoped>
.fiche-athlete { display: flex; flex-direction: column; gap: var(--spacing-lg); padding: var(--spacing-xl) var(--spacing-2xl); overflow-y: auto; flex: 1; touch-action: pan-y; }

.fiche-topbar { display: flex; align-items: center; justify-content: space-between; gap: var(--spacing-md); flex-wrap: wrap; }
.retour-fiche { flex-shrink: 0; }
.fiche-topbar-actions { display: flex; gap: var(--spacing-sm); flex-shrink: 0; flex-wrap: wrap; }

.fiche-header { display: flex; align-items: center; gap: var(--spacing-md); flex-wrap: wrap; }
.fiche-header-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.fiche-header-info h3 { margin: 0; font-size: var(--font-size-xl); font-weight: 700; }
.fiche-header-info h3 .org-badge { margin-left: 6px; font-weight: 500; vertical-align: middle; }
.mini-av-lg {
  width: var(--avatar-md);
  height: var(--avatar-md);
  border-radius: 50%;
  background: var(--color-avatar-athlete-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--font-size-xs);
  font-weight: 600;
  color: var(--color-avatar-athlete-text);
  flex-shrink: 0;
}
.athlete-email { font-size: var(--font-size-xs); color: var(--color-text-secondary); }
.groupes-badges { display: flex; gap: 4px; flex-wrap: wrap; margin-top: 2px; }
.groupe-badge { font-size: var(--font-size-xs); font-weight: 600; padding: 2px 8px; border-radius: var(--radius-full); }

.tabs { display: flex; border-bottom: 1px solid var(--color-border); flex-shrink: 0; overflow-x: auto; }
.tab {
  padding: var(--spacing-md) var(--spacing-lg);
  min-height: var(--tap-min);
  display: flex;
  align-items: center;
  font-size: var(--font-size-sm);
  font-weight: 500;
  cursor: pointer;
  color: var(--color-text-secondary);
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  user-select: none;
  white-space: nowrap;
}
.tab.active { color: var(--color-primary-dark); border-bottom-color: var(--color-primary); font-weight: 600; }
.tab-content { display: flex; flex-direction: column; gap: var(--spacing-md); }

.stat-card {
  background: var(--color-bg); border: 1px solid var(--color-border); border-radius: var(--radius-lg);
  padding: var(--spacing-lg); display: flex; flex-direction: column; gap: var(--spacing-sm);
}
.stat-card-titre { font-size: var(--font-size-sm); font-weight: 700; }
.stat-card-titre-sm { font-size: var(--font-size-xs); color: var(--color-text-secondary); font-weight: 600; margin-top: var(--spacing-xs); }
.detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-lg); }

.programme-assign-list { display: flex; flex-direction: column; gap: 6px; }
.programme-assign-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-md);
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  flex-wrap: wrap;
}
.programme-assign-info { display: flex; align-items: center; gap: var(--spacing-sm); }
.programme-assign-nom { font-size: var(--font-size-sm); font-weight: 600; }
.programme-assign-actions { display: flex; gap: var(--spacing-sm); }

.select-programme-logs {
  align-self: flex-start;
  min-height: var(--tap-min);
  padding: 0 var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--font-size-base);
  background: var(--color-bg);
}

.session-block { border: 1px solid var(--color-border); border-radius: var(--radius-lg); overflow: hidden; flex-shrink: 0; background: var(--color-bg); }
.session-head {
  padding: var(--spacing-md) var(--spacing-lg);
  background: var(--color-bg-secondary);
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  border-bottom: 1px solid var(--color-border);
  font-size: var(--font-size-sm);
  font-weight: 500;
  flex-wrap: wrap;
}
.session-nom { flex: 1; font-weight: 600; }
.session-date { font-size: var(--font-size-xs); color: var(--color-text-secondary); text-transform: capitalize; }
.session-body { padding: var(--spacing-md) var(--spacing-lg); display: flex; flex-direction: column; gap: var(--spacing-lg); }

.exo-groupe-log { display: flex; flex-direction: column; gap: var(--spacing-md); }
.exo-groupe-log.is-superset {
  padding: var(--spacing-md);
  background: var(--color-superset-bg);
  border: 1px solid var(--color-superset-border);
  border-left: 4px solid var(--color-primary);
  border-radius: var(--radius-lg);
}
.exo-groupe-log.is-superset .exo-bloc + .exo-bloc { padding-top: var(--spacing-md); border-top: 1px dashed var(--color-superset-border); }

.exo-bloc { display: flex; flex-direction: column; gap: var(--spacing-sm); }
.exo-header { display: flex; align-items: center; gap: var(--spacing-sm); }
.exo-num, .exo-letter {
  width: 26px;
  height: 26px;
  border-radius: var(--radius-sm);
  background: var(--color-primary-light);
  color: var(--color-superset-text);
  font-size: var(--font-size-xs);
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.exo-letter { background: var(--color-primary); color: var(--color-on-primary); }
.exo-name { font-size: var(--font-size-base); font-weight: 600; flex: 1; }

.comparatif-grid { display: flex; flex-direction: column; gap: 4px; }
.comparatif-header {
  display: grid;
  grid-template-columns: 40px 1.3fr 20px 1.3fr 24px;
  gap: var(--spacing-sm);
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  padding: 0 var(--spacing-sm) 4px;
}
.comparatif-row {
  display: grid;
  grid-template-columns: 40px 1.3fr 20px 1.3fr 24px;
  gap: var(--spacing-sm);
  align-items: center;
  padding: var(--spacing-sm);
  border-radius: var(--radius-md);
  font-size: var(--font-size-base);
}
.comparatif-row.statut-done { background: var(--color-valid-bg-soft); }
.comparatif-row.statut-done .statut-icon { color: var(--color-valid-text); }
.comparatif-row.statut-warn { background: var(--color-warning-bg-soft); }
.comparatif-row.statut-warn .statut-icon { color: var(--color-warning-icon); }
.comparatif-row.statut-skip { background: var(--color-danger-bg-soft); }
.comparatif-row.statut-skip .statut-icon { color: var(--color-danger-text); }
.prescrit-cell { color: var(--color-text-secondary); font-size: var(--font-size-sm); }
.comparatif-arrow { font-size: var(--font-size-sm); color: var(--color-text-muted); justify-self: center; }
.realise-cell { font-weight: 600; }
.non-fait { display: inline-flex; align-items: center; gap: 4px; color: var(--color-danger-text); font-weight: 500; font-style: normal; }
.statut-icon { display: flex; justify-content: center; }
.serie-num {
  font-size: var(--font-size-xs);
  font-weight: 700;
  color: var(--color-text-secondary);
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-sm);
  text-align: center;
  padding: 4px 0;
}

@media (max-width: 768px) {
  .fiche-athlete { padding: var(--spacing-md) var(--spacing-lg); }
  .detail-grid { grid-template-columns: 1fr; }
  .comparatif-header, .comparatif-row { grid-template-columns: 30px 1fr 16px 1fr 20px; gap: 6px; }
  .prescrit-cell, .non-fait { font-size: var(--font-size-xs); }
}
</style>
