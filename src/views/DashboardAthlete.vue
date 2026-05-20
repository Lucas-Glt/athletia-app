<template>
  <AppLayout title="Mon programme">
    <template #nav>
      <div class="nav-item" :class="{ active: onglet === 'programme' }" @click="onglet = 'programme'">
        <i class="ti ti-calendar"></i> Mon programme
      </div>
      <div class="nav-item" :class="{ active: onglet === 'logs' }" @click="onglet = 'logs'">
        <i class="ti ti-chart-bar"></i> Mes logs
      </div>
    </template>

    <template #actions>
      <button class="btn" @click="logout"><i class="ti ti-logout"></i> Déconnexion</button>
    </template>

    <div class="dashboard-root">
      <div class="empty-state" v-if="programmes.length === 0">
        <i class="ti ti-calendar-off" style="font-size:40px;color:#9ca3af"></i>
        <p>Aucun programme assigné pour le moment.</p>
        <span>Contactez votre préparateur physique.</span>
      </div>

      <!-- ONGLET PROGRAMME -->
      <div v-if="onglet === 'programme' && programmes.length > 0" class="content-body">

        <button class="toggle-programmes-btn" @click="panelListVisible = !panelListVisible">
          <i class="ti ti-layout-list"></i>
          {{ panelListVisible ? 'Masquer' : 'Mes programmes' }}
        </button>

        <div class="panel-list" :class="{ 'mobile-visible': panelListVisible }">
          <div class="section-title">Mes programmes</div>
          <div
            v-for="p in programmes"
            :key="p.id"
            class="prog-card"
            :class="{ active: programmeActif?.id === p.id }"
            @click="selectProgramme(p)"
          >
            <div class="prog-name">{{ p.nom }}</div>
            <div class="prog-meta">
              <span class="badge" :class="p.statut === 'actif' ? 'badge-green' : 'badge-gray'">{{ p.statut }}</span>
            </div>
          </div>
        </div>

        <div class="panel-detail" v-if="programmeActif">
          <!-- Vue liste des séances -->
          <template v-if="!seanceActive">
            <div class="detail-header">
              <h3>{{ programmeActif.nom }}</h3>
              <p v-if="programmeActif.description">{{ programmeActif.description }}</p>
            </div>

            <div class="semaines-tabs" v-if="semainesDisponibles.length > 0">
              <div
                v-for="sem in semainesDisponibles"
                :key="sem"
                class="semaine-tab"
                :class="{ active: semaineActive === sem }"
                @click="semaineActive = sem"
              >
                Semaine {{ sem }}
              </div>
            </div>

            <div v-if="loadingSeances" class="empty">Chargement...</div>

            <div
              v-for="seance in seancesFiltrees"
              :key="seance.id"
              class="seance-block clickable"
              :class="`type-${seance.type_seance || 'musculation'}`"
              @click="demarrerSeance(seance)"
            >
              <div class="seance-head">
                <span class="type-badge" :class="`type-badge-${seance.type_seance || 'musculation'}`">
                  {{ labelType(seance.type_seance) }}
                </span>
                <span class="badge badge-purple" v-if="seance.jour">{{ seance.jour }}</span>
                <span style="flex:1">{{ seance.nom }}</span>
                <span class="exo-count">{{ seance.exercices?.length || 0 }} exercices</span>
                <i class="ti ti-chevron-right"></i>
              </div>
            </div>
          </template>

          <!-- Vue séance en cours -->
          <template v-else>
            <div class="detail-header">
              <button class="btn btn-sm" @click="seanceActive = null">
                <i class="ti ti-arrow-left"></i> Retour
              </button>
              <h3 style="margin-top:8px">{{ seanceActive.nom }}</h3>
              <div style="display:flex;gap:6px;margin-top:4px">
                <span class="type-badge" :class="`type-badge-${seanceActive.type_seance || 'musculation'}`">
                  {{ labelType(seanceActive.type_seance) }}
                </span>
                <span class="badge badge-purple" v-if="seanceActive.jour">{{ seanceActive.jour }}</span>
                <span class="badge badge-gray">Semaine {{ seanceActive.semaine || 1 }}</span>
              </div>
            </div>

            <!-- Groupes d'exercices -->
            <div
              v-for="groupe in grouperExercices(seanceActive.exercices)"
              :key="groupe.key"
              class="exo-group"
              :class="{ 'is-superset': groupe.exercices.length > 1 }"
            >
              <!-- En-tête accordéon groupe -->
              <div class="exo-group-head" @click="toggleGroupe(groupe.key)">
                <div class="exo-group-noms">
                  <div v-if="groupe.exercices.length > 1" class="superset-banner">
                    <i class="ti ti-link"></i>
                    <span>Superset · {{ groupe.exercices.length }} exercices</span>
                  </div>
                  <div class="exo-noms-list">
                    <span v-for="(exo, eidx) in groupe.exercices" :key="exo.id" class="exo-nom-inline">
                      <span class="exo-letter" v-if="groupe.exercices.length > 1">{{ letterFor(eidx) }}</span>
                      <span class="exo-num" v-else>{{ exo.ordre }}</span>
                      {{ exo.nom }}
                    </span>
                  </div>
                </div>
                <div class="exo-group-meta">
                  <span class="series-count-badge">{{ groupe.exercices[0].series.length }} séries</span>
                  <i class="ti" :class="isGroupeOuvert(groupe.key) ? 'ti-chevron-up' : 'ti-chevron-down'"></i>
                </div>
              </div>

              <!-- Contenu accordéon -->
              <div v-if="isGroupeOuvert(groupe.key)" class="exo-group-body">
                <div v-if="groupe.exercices[0].series.length === 0" class="empty-series">
                  Aucune série définie.
                </div>

                <!-- Séries en colonnes -->
                <div class="series-cols">
                  <div
                    v-for="serieIdx in groupe.exercices[0].series.length"
                    :key="serieIdx"
                    class="serie-col"
                    :class="{ done: isGroupeDone(groupe, serieIdx - 1) }"
                  >
                    <div class="serie-col-label">Série {{ serieIdx }}</div>

                    <!-- Données de chaque exo du groupe -->
                    <div v-for="(exo, eidx) in groupe.exercices" :key="exo.id" class="serie-col-exo">
                      <span class="exo-letter-mini" v-if="groupe.exercices.length > 1">{{ letterFor(eidx) }}</span>

                      <!-- Prescrit -->
                      <div class="prescrit-bloc">
                        <template v-if="seanceActive.type_seance === 'musculation' || !seanceActive.type_seance">
                          <span class="prescrit-item" v-if="exo.series[serieIdx-1]?.nb_reps">
                            <span class="prescrit-label">Reps</span>
                            <span class="prescrit-val">{{ exo.series[serieIdx-1].nb_reps }}</span>
                          </span>
                          <span class="prescrit-item" v-if="exo.series[serieIdx-1]?.poids_cible">
                            <span class="prescrit-label">Charge</span>
                            <span class="prescrit-val">{{ exo.series[serieIdx-1].poids_cible }}</span>
                          </span>
                          <span class="prescrit-item" v-if="exo.series[serieIdx-1]?.rm">
                            <span class="prescrit-label">%RM</span>
                            <span class="prescrit-val">{{ exo.series[serieIdx-1].rm }}</span>
                          </span>
                          <span class="prescrit-item" v-if="exo.series[serieIdx-1]?.tempo">
                            <span class="prescrit-label">Tempo</span>
                            <span class="prescrit-val">{{ exo.series[serieIdx-1].tempo }}</span>
                          </span>
                          <span class="prescrit-item prescrit-repos" v-if="groupe.exercices.length === 1 && exo.series[serieIdx-1]?.temps_repos">
                            <span class="prescrit-label">Repos</span>
                            <span class="prescrit-val">{{ exo.series[serieIdx-1].temps_repos }}</span>
                          </span>
                        </template>
                        <template v-else-if="seanceActive.type_seance === 'natation' || seanceActive.type_seance === 'athletisme'">
                          <span class="prescrit-item" v-if="exo.series[serieIdx-1]?.metres">
                            <span class="prescrit-label">Mètres</span>
                            <span class="prescrit-val">{{ exo.series[serieIdx-1].metres }}</span>
                          </span>
                          <span class="prescrit-item" v-if="exo.series[serieIdx-1]?.intensite">
                            <span class="prescrit-label">Intensité</span>
                            <span class="prescrit-val">{{ exo.series[serieIdx-1].intensite }}</span>
                          </span>
                          <span class="prescrit-item prescrit-repos" v-if="groupe.exercices.length === 1 && exo.series[serieIdx-1]?.temps_repos">
                            <span class="prescrit-label">Repos</span>
                            <span class="prescrit-val">{{ exo.series[serieIdx-1].temps_repos }}</span>
                          </span>
                        </template>
                        <template v-else-if="seanceActive.type_seance === 'pliometrie'">
                          <span class="prescrit-item" v-if="exo.series[serieIdx-1]?.bonds">
                            <span class="prescrit-label">Bonds</span>
                            <span class="prescrit-val">{{ exo.series[serieIdx-1].bonds }}</span>
                          </span>
                          <span class="prescrit-item" v-if="exo.series[serieIdx-1]?.intensite">
                            <span class="prescrit-label">Intensité</span>
                            <span class="prescrit-val">{{ exo.series[serieIdx-1].intensite }}</span>
                          </span>
                          <span class="prescrit-item prescrit-repos" v-if="groupe.exercices.length === 1 && exo.series[serieIdx-1]?.temps_repos">
                            <span class="prescrit-label">Repos</span>
                            <span class="prescrit-val">{{ exo.series[serieIdx-1].temps_repos }}</span>
                          </span>
                        </template>
                      </div>

                      <!-- Inputs réalisé -->
                      <div class="realise-inputs">
                        <template v-if="seanceActive.type_seance === 'musculation' || !seanceActive.type_seance">
                          <input v-model="getLogs(exo.id, serieIdx-1).reps_realisees" :placeholder="exo.series[serieIdx-1]?.nb_reps || 'reps'" class="mini-input" />
                          <input v-model="getLogs(exo.id, serieIdx-1).poids_realise" :placeholder="exo.series[serieIdx-1]?.poids_cible || 'charge'" class="mini-input" />
                        </template>
                        <template v-else-if="seanceActive.type_seance === 'natation' || seanceActive.type_seance === 'athletisme'">
                          <input v-model="getLogs(exo.id, serieIdx-1).reps_realisees" :placeholder="exo.series[serieIdx-1]?.metres ? `${exo.series[serieIdx-1].metres}m` : 'mètres'" class="mini-input" />
                          <input v-model="getLogs(exo.id, serieIdx-1).poids_realise" :placeholder="exo.series[serieIdx-1]?.intensite || 'intensité'" class="mini-input" />
                        </template>
                        <template v-else-if="seanceActive.type_seance === 'pliometrie'">
                          <input v-model="getLogs(exo.id, serieIdx-1).reps_realisees" :placeholder="exo.series[serieIdx-1]?.bonds ? `${exo.series[serieIdx-1].bonds} bonds` : 'bonds'" class="mini-input" />
                          <input v-model="getLogs(exo.id, serieIdx-1).poids_realise" :placeholder="exo.series[serieIdx-1]?.intensite || 'intensité'" class="mini-input" />
                        </template>
                      </div>
                    </div>

                    <!-- Repos superset -->
                    <div v-if="groupe.exercices.length > 1 && groupe.exercices[0].series[serieIdx-1]?.temps_repos" class="repos-superset-col">
                      <span class="prescrit-label">Repos</span>
                      <span class="prescrit-val">{{ groupe.exercices[0].series[serieIdx-1].temps_repos }}</span>
                    </div>

                    <!-- Bouton valider -->
                    <button
                      class="btn-serie"
                      :class="isGroupeDone(groupe, serieIdx - 1) ? 'btn-done' : 'btn-todo'"
                      @click="toggleGroupeDone(groupe, serieIdx - 1)"
                    >
                      <i :class="isGroupeDone(groupe, serieIdx - 1) ? 'ti ti-check' : 'ti ti-circle'"></i>
                      {{ isGroupeDone(groupe, serieIdx - 1) ? 'Fait' : 'Valider' }}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <button class="btn btn-primary btn-large" @click="validerSeance">
              <i class="ti ti-check"></i> Valider la séance
            </button>
          </template>
        </div>
      </div>

      <!-- ONGLET LOGS -->
      <div v-if="onglet === 'logs'" class="logs-page">
        <div class="section-title">Historique de mes séances</div>
        <div v-if="historique.length === 0" class="empty">Aucune séance enregistrée pour le moment.</div>
        <div v-for="(group, date) in historiqueGroupe" :key="date" class="historique-day">
          <div class="historique-date">{{ formatDate(date) }}</div>
          <div v-for="log in group" :key="log.id" class="historique-row">
            <span class="chip" v-if="log.reps_realisees">{{ log.reps_realisees }}</span>
            <span class="chip" v-if="log.poids_realise">{{ log.poids_realise }}</span>
            <span class="chip" :class="log.fait ? 'chip-done' : 'chip-skip'">
              {{ log.fait ? '✓ fait' : 'non réalisé' }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </AppLayout>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useApi } from '../services/api'
import AppLayout from '../components/AppLayout.vue'

export default {
  components: { AppLayout },
  setup() {
    const programmes = ref([])
    const programmeActif = ref(null)
    const seances = ref([])
    const seanceActive = ref(null)
    const logs = ref({})
    const historique = ref([])
    const loadingSeances = ref(false)
    const onglet = ref('programme')
    const semaineActive = ref(1)
    const groupesOuverts = ref({})
    const router = useRouter()
    const authStore = useAuthStore()
    const api = useApi()

    const labelType = (t) => {
      const map = { musculation: 'Musculation', natation: 'Natation', athletisme: 'Athlétisme', pliometrie: 'Pliométrie' }
      return map[t] || 'Musculation'
    }

    const letterFor = (idx) => String.fromCharCode(65 + idx)

    const grouperExercices = (exercices) => {
      if (!exercices || exercices.length === 0) return []
      const groupes = []
      const map = {}
      const sorted = [...exercices].sort((a, b) => a.ordre - b.ordre)
      sorted.forEach(exo => {
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

    const toggleGroupe = (key) => {
      groupesOuverts.value[key] = !groupesOuverts.value[key]
    }

    const isGroupeOuvert = (key) => !!groupesOuverts.value[key]

    const getLogs = (exoId, serieIdx) => {
      if (!logs.value[exoId]) logs.value[exoId] = {}
      if (!logs.value[exoId][serieIdx]) {
        logs.value[exoId][serieIdx] = { reps_realisees: '', poids_realise: '', fait: false }
      }
      return logs.value[exoId][serieIdx]
    }

    const isGroupeDone = (groupe, serieIdx) => {
      return groupe.exercices.every(exo => getLogs(exo.id, serieIdx).fait)
    }

    const toggleGroupeDone = (groupe, serieIdx) => {
      const isDone = isGroupeDone(groupe, serieIdx)
      groupe.exercices.forEach(exo => {
        getLogs(exo.id, serieIdx).fait = !isDone
      })
    }

    const semainesDisponibles = computed(() => {
      const set = new Set(seances.value.map(s => s.semaine || 1))
      return Array.from(set).sort((a, b) => a - b)
    })

    const jourOrdre = { lundi: 1, mardi: 2, mercredi: 3, jeudi: 4, vendredi: 5, samedi: 6, dimanche: 7 }

    const seancesFiltrees = computed(() => {
      return seances.value
        .filter(s => (s.semaine || 1) === semaineActive.value)
        .sort((a, b) => {
          const jourA = jourOrdre[a.jour] || 8
          const jourB = jourOrdre[b.jour] || 8
          if (jourA !== jourB) return jourA - jourB
          return a.ordre - b.ordre
        })
    })

    const fetchProgrammes = async () => {
      programmes.value = await api.get('/programmes/')
      if (programmes.value.length > 0) selectProgramme(programmes.value[0])
    }

    const selectProgramme = async (p) => {
      programmeActif.value = p
      seanceActive.value = null
      loadingSeances.value = true
      seances.value = await api.get(`/programmes/${p.id}/seances/`)
      const semaines = [...new Set(seances.value.map(s => s.semaine || 1))]
      semaineActive.value = semaines[0] || 1
      loadingSeances.value = false
    }

    const demarrerSeance = (seance) => {
      seanceActive.value = seance
      logs.value = {}
      groupesOuverts.value = {}
      // Ouvre tous les groupes par défaut
      grouperExercices(seance.exercices).forEach(g => {
        groupesOuverts.value[g.key] = true
      })
    }

    const validerSeance = async () => {
      for (const exo of seanceActive.value.exercices) {
        for (let i = 0; i < exo.series.length; i++) {
          const serie = exo.series[i]
          const log = getLogs(exo.id, i)
          await api.post(`/series/${serie.id}/logs/`, {
            reps_realisees: log.reps_realisees || null,
            poids_realise: log.poids_realise || null,
            fait: log.fait
          })
        }
      }
      seanceActive.value = null
      alert('Séance enregistrée !')
    }

    const fetchHistorique = async () => {
      historique.value = []
      if (!programmeActif.value) return
      const allLogs = []
      for (const seance of seances.value) {
        for (const exo of seance.exercices || []) {
          for (const s of exo.series || []) {
            const logsSerie = await api.get(`/series/${s.id}/logs/`)
            allLogs.push(...logsSerie.map(l => ({ ...l, exo_nom: exo.nom })))
          }
        }
      }
      historique.value = allLogs
    }

    const historiqueGroupe = computed(() => {
      const groups = {}
      historique.value.forEach(log => {
        const date = log.date.split('T')[0]
        if (!groups[date]) groups[date] = []
        groups[date].push(log)
      })
      return groups
    })

    watch(onglet, (v) => { if (v === 'logs') fetchHistorique() })

    const formatDate = (d) => new Date(d).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
    const logout = () => { authStore.logout(); router.push('/') }
    const panelListVisible = ref(false)

    onMounted(fetchProgrammes)

    return {
      programmes, programmeActif, seances, seanceActive, logs, historique,
      loadingSeances, onglet, historiqueGroupe,
      semaineActive, semainesDisponibles, seancesFiltrees,
      groupesOuverts, toggleGroupe, isGroupeOuvert,
      labelType, letterFor, grouperExercices,
      getLogs, isGroupeDone, toggleGroupeDone,
      selectProgramme, demarrerSeance, validerSeance,
      formatDate, logout, panelListVisible
    }
  }
}
</script>

<style scoped>
* { box-sizing: border-box; }
.dashboard-root { display: flex; flex: 1; overflow: hidden; min-height: 0; }
.content-body { display: flex; flex: 1; overflow: hidden; min-height: 0; min-width: 0; }
.btn { display: inline-flex; align-items: center; gap: 6px; padding: 7px 14px; border-radius: 6px; border: 1px solid #e5e7eb; font-size: 13px; cursor: pointer; background: transparent; color: #374151; }
.btn:hover { background: #f9fafb; }
.btn-primary { background: #7F77DD; color: #EEEDFE; border-color: #534AB7; }
.btn-primary:hover { background: #534AB7; }
.btn-sm { padding: 5px 10px; font-size: 12px; }
.btn-large { padding: 10px 20px; font-size: 14px; width: 100%; justify-content: center; margin-top: 8px; }
.nav-item { display: flex; align-items: center; gap: 6px; padding: 6px 12px; font-size: 13px; cursor: pointer; color: #6b7280; border-radius: 6px; font-weight: 500; border: none; background: transparent; }
.nav-item:hover { background: #F8F7FF; color: #374151; }
.nav-item.active { background: #EEEDFE; color: #534AB7; }
.empty-state { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; color: #6b7280; }
.panel-list { width: 220px; border-right: 1px solid #e5e7eb; overflow-y: auto; padding: 12px; flex-shrink: 0; display: flex; flex-direction: column; gap: 8px; }
.panel-detail { flex: 1; overflow-y: auto; padding: 16px 20px; display: flex; flex-direction: column; gap: 12px; min-height: 0; }
.section-title { font-size: 12px; font-weight: 500; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; }
.prog-card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px 12px; cursor: pointer; }
.prog-card:hover { border-color: #d1d5db; background: #f9fafb; }
.prog-card.active { border-color: #7F77DD; background: #EEEDFE; }
.prog-card.active .prog-name { color: #3C3489; }
.prog-name { font-size: 14px; font-weight: 500; margin-bottom: 4px; }
.prog-meta { display: flex; gap: 6px; align-items: center; font-size: 11px; }
.badge { display: inline-flex; font-size: 11px; padding: 2px 8px; border-radius: 20px; }
.badge-green { background: #EAF3DE; color: #3B6D11; }
.badge-purple { background: #EEEDFE; color: #3C3489; }
.badge-gray { background: #f3f4f6; color: #6b7280; border: 1px solid #e5e7eb; }
.detail-header h3 { font-size: 17px; font-weight: 600; margin-bottom: 3px; }
.detail-header p { font-size: 13px; color: #6b7280; }
.semaines-tabs { display: flex; gap: 4px; flex-wrap: wrap; }
.semaine-tab { display: inline-flex; align-items: center; padding: 6px 12px; border: 1px solid #e5e7eb; border-radius: 6px; font-size: 13px; cursor: pointer; background: white; color: #6b7280; }
.semaine-tab:hover { border-color: #7F77DD; }
.semaine-tab.active { background: #EEEDFE; border-color: #7F77DD; color: #3C3489; font-weight: 500; }
.seance-block { border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; flex-shrink: 0; border-left-width: 4px; }
.seance-block.type-musculation { border-left-color: #FCA5A5; }
.seance-block.type-natation { border-left-color: #93C5FD; }
.seance-block.type-athletisme { border-left-color: #86EFAC; }
.seance-block.type-pliometrie { border-left-color: #FDBA74; }
.seance-block.clickable { cursor: pointer; }
.seance-block.clickable:hover { border-color: #7F77DD; }
.type-badge { display: inline-flex; align-items: center; font-size: 11px; font-weight: 500; padding: 2px 8px; border-radius: 20px; }
.type-badge-musculation { background: #FEE2E2; color: #B91C1C; }
.type-badge-natation { background: #DBEAFE; color: #1E40AF; }
.type-badge-athletisme { background: #DCFCE7; color: #166534; }
.type-badge-pliometrie { background: #FED7AA; color: #9A3412; }
.seance-head { padding: 14px 16px; background: #f9fafb; display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 500; }
.exo-count { font-size: 12px; color: #6b7280; font-weight: 400; }

/* Groupes */
.exo-group { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; overflow: hidden; flex-shrink: 0; }
.exo-group.is-superset { background: #F5F4FD; border: 1px solid #AFA9EC; border-left: 3px solid #7F77DD; }

/* En-tête accordéon groupe */
.exo-group-head { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; cursor: pointer; user-select: none; gap: 12px; }
.exo-group-head:hover { background: rgba(0,0,0,0.02); }
.exo-group-noms { display: flex; flex-direction: column; gap: 4px; flex: 1; }
.superset-banner { display: flex; align-items: center; gap: 6px; font-size: 11px; color: #534AB7; font-weight: 500; margin-bottom: 2px; }
.exo-noms-list { display: flex; flex-direction: column; gap: 3px; }
.exo-nom-inline { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 500; color: #111827; }
.exo-group-meta { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
.series-count-badge { font-size: 12px; color: #534AB7; font-weight: 600; background: #EEEDFE; padding: 2px 10px; border-radius: 20px; }
.exo-num, .exo-letter { width: 22px; height: 22px; border-radius: 4px; background: #EEEDFE; color: #534AB7; font-size: 11px; font-weight: 600; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.exo-letter { background: #7F77DD; color: white; }

/* Corps accordéon */
.exo-group-body { border-top: 1px solid #e5e7eb; padding: 12px 16px; background: white; }

/* Séries en colonnes */
.series-cols { display: flex; flex-wrap: wrap; gap: 10px; }
.serie-col { display: flex; flex-direction: column; gap: 8px; padding: 12px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; min-width: 140px; flex: 1; max-width: 200px; }
.serie-col.done { background: #f0fdf4; border-color: #86efac; }
.serie-col-label { font-size: 12px; font-weight: 700; color: #534AB7; text-align: center; padding: 4px 0; border-bottom: 1px solid #e5e7eb; margin-bottom: 4px; }
.serie-col-exo { display: flex; flex-direction: column; gap: 4px; }
.exo-letter-mini { font-size: 10px; font-weight: 700; color: white; background: #7F77DD; padding: 2px 6px; border-radius: 4px; align-self: flex-start; }

/* Prescrit */
.prescrit-bloc { display: flex; flex-wrap: wrap; gap: 8px; }
.prescrit-item { display: flex; flex-direction: column; align-items: flex-start; gap: 1px; }
.prescrit-label { font-size: 10px; color: #9ca3af; font-weight: 500; text-transform: uppercase; letter-spacing: 0.3px; }
.prescrit-val { font-size: 14px; font-weight: 700; color: #111827; }
.prescrit-repos .prescrit-label { color: #AFA9EC; }
.prescrit-repos .prescrit-val { color: #534AB7; font-size: 13px; }

/* Repos superset colonne */
.repos-superset-col { display: flex; align-items: center; gap: 6px; padding: 4px 0; border-top: 1px dashed #e5e7eb; }

/* Inputs */
.realise-inputs { display: flex; gap: 4px; flex-wrap: wrap; }
.mini-input { padding: 6px 8px; font-size: 13px; width: 100%; border: 1px solid #e5e7eb; border-radius: 6px; }
.mini-input:focus { outline: none; border-color: #7F77DD; }

/* Bouton valider */
.btn-serie { display: inline-flex; align-items: center; justify-content: center; gap: 5px; padding: 7px 10px; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 500; border: 1px solid #e5e7eb; background: white; color: #6b7280; width: 100%; margin-top: 4px; }
.btn-todo:hover { color: #534AB7; border-color: #7F77DD; }
.btn-done { background: #7F77DD; color: white; border-color: #534AB7; }
.btn-done:hover { background: #534AB7; }

.empty-series { font-size: 13px; color: #9ca3af; font-style: italic; }
.empty { color: #9ca3af; text-align: center; padding: 20px; font-size: 13px; }
.logs-page { flex: 1; padding: 20px 24px; display: flex; flex-direction: column; gap: 12px; overflow-y: auto; }
.historique-day { display: flex; flex-direction: column; gap: 6px; }
.historique-date { font-size: 13px; font-weight: 500; color: #534AB7; text-transform: capitalize; }
.historique-row { display: flex; gap: 6px; padding: 8px 12px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; }
.chip { font-size: 11px; background: white; border: 1px solid #e5e7eb; border-radius: 4px; padding: 2px 6px; color: #6b7280; }
.chip-done { background: #dcfce7; color: #16a34a; border-color: #86efac; }
.chip-skip { background: #f3f4f6; color: #9ca3af; }

@media (max-width: 768px) {
  .content-body { flex-direction: column; position: relative; }

  .panel-list {
    display: none;
    width: 100%;
    border-right: none;
    border-bottom: 1px solid #e5e7eb;
    padding: 8px 12px;
    flex-direction: row;
    flex-wrap: nowrap;
    overflow-x: auto;
    gap: 6px;
    flex-shrink: 0;
  }

  .panel-list.mobile-visible {
    display: flex;
  }

  .panel-list .section-title { display: none; }

  .prog-card {
    flex-shrink: 0;
    min-width: 130px;
  }

  .panel-detail { padding: 10px 12px; }

  .toggle-programmes-btn {
    display: flex;
  }
}

.toggle-programmes-btn {
  display: none;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  font-size: 13px;
  background: #EEEDFE;
  color: #534AB7;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  margin: 10px 12px 0;
  font-weight: 500;
}
</style>