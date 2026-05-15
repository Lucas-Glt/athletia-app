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

    <!-- Pas de programme -->
    <div class="empty-state" v-if="programmes.length === 0">
      <i class="ti ti-calendar-off" style="font-size:40px;color:#9ca3af"></i>
      <p>Aucun programme assigné pour le moment.</p>
      <span>Contactez votre préparateur physique.</span>
    </div>

    <!-- ONGLET PROGRAMME -->
    <div v-if="onglet === 'programme' && programmes.length > 0" class="content-body">

      <!-- Panel gauche : liste programmes -->
      <div class="panel-list">
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

      <!-- Panel droit -->
      <div class="panel-detail" v-if="programmeActif">

        <!-- Vue séances -->
        <template v-if="!seanceActive">
          <div class="detail-header">
            <h3>{{ programmeActif.nom }}</h3>
            <p v-if="programmeActif.description">{{ programmeActif.description }}</p>
          </div>

          <div v-if="loadingSeances" class="empty">Chargement...</div>

          <div v-for="seance in seances" :key="seance.id" class="seance-block clickable" @click="demarrerSeance(seance)">
            <div class="seance-head">
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
            <button class="btn btn-sm" @click="seanceActive = null"><i class="ti ti-arrow-left"></i> Retour</button>
            <h3 style="margin-top:8px">{{ seanceActive.nom }}</h3>
            <span class="badge badge-purple" v-if="seanceActive.jour">{{ seanceActive.jour }}</span>
          </div>

          <div v-for="(exo, idx) in seanceActive.exercices" :key="exo.id" class="exo-block">
            <div v-if="exo.groupe && (idx === 0 || seanceActive.exercices[idx-1].groupe !== exo.groupe)" class="superset-label-row">
              <span class="superset-label">Biset / Superset</span>
            </div>
            <div class="exo-header" :class="{ 'superset-indent': exo.groupe }">
              <div class="exo-num">{{ exo.ordre }}</div>
              <span class="exo-name">{{ exo.nom }}</span>
            </div>

            <div class="series-grid">
              <div class="series-grid-header">
                <span>#</span>
                <span>Prescrit</span>
                <span>Reps réalisées</span>
                <span>Poids réalisé</span>
                <span></span>
              </div>
              <div v-for="(s, i) in exo.series" :key="s.id" class="serie-row" :class="{ done: logs[s.id]?.fait }">
                <span class="serie-num">{{ i + 1 }}</span>
                <div class="prescrit">
                  <span v-if="s.nb_reps">{{ s.nb_reps }} reps</span>
                  <span v-if="s.poids_cible"> · {{ s.poids_cible }}</span>
                  <span v-if="s.rm"> · {{ s.rm }}</span>
                  <span v-if="s.tempo"> · {{ s.tempo }}</span>
                  <span v-if="s.temps_repos"> · {{ s.temps_repos }}</span>
                </div>
                <input
                  v-model="logs[s.id].reps_realisees"
                  :placeholder="s.nb_reps || '–'"
                />
                <input
                  v-model="logs[s.id].poids_realise"
                  :placeholder="s.poids_cible || '–'"
                />
                <button
                  class="btn-icon"
                  :class="logs[s.id].fait ? 'btn-done' : 'btn-todo'"
                  @click="toggleFait(s)"
                >
                  <i :class="logs[s.id].fait ? 'ti ti-check' : 'ti ti-circle'"></i>
                </button>
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
          <span class="chip" v-if="log.reps_realisees">{{ log.reps_realisees }} reps</span>
          <span class="chip" v-if="log.poids_realise">{{ log.poids_realise }}</span>
          <span class="chip" :class="log.fait ? 'chip-done' : 'chip-skip'">
            {{ log.fait ? '✓ fait' : 'non réalisé' }}
          </span>
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
    const router = useRouter()
    const authStore = useAuthStore()
    const api = useApi()

    const fetchProgrammes = async () => {
      programmes.value = await api.get('/programmes/')
      if (programmes.value.length > 0) selectProgramme(programmes.value[0])
    }

    const selectProgramme = async (p) => {
      programmeActif.value = p
      seanceActive.value = null
      loadingSeances.value = true
      seances.value = await api.get(`/programmes/${p.id}/seances/`)
      loadingSeances.value = false
    }

    const demarrerSeance = (seance) => {
      seanceActive.value = seance
      // Initialise un log vide par série
      logs.value = {}
      seance.exercices.forEach(exo => {
        exo.series.forEach(s => {
          logs.value[s.id] = { reps_realisees: '', poids_realise: '', fait: false }
        })
      })
    }

    const toggleFait = (serie) => {
      logs.value[serie.id].fait = !logs.value[serie.id].fait
    }

    const validerSeance = async () => {
      // Envoie un log par série
      for (const exo of seanceActive.value.exercices) {
        for (const s of exo.series) {
          const log = logs.value[s.id]
          await api.post(`/series/${s.id}/logs/`, {
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
      // Récupère les logs de toutes les séries du programme actif
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

    const formatDate = (d) => {
      const date = new Date(d)
      return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
    }

    const logout = () => { authStore.logout(); router.push('/') }

    onMounted(fetchProgrammes)

    return {
      programmes, programmeActif, seances, seanceActive, logs, historique,
      loadingSeances, onglet, historiqueGroupe,
      selectProgramme, demarrerSeance, toggleFait, validerSeance,
      formatDate, logout
    }
  }
}
</script>

<style scoped>
* { box-sizing: border-box; }
.content-body { display: flex; flex: 1; overflow: hidden; }
.btn { display: inline-flex; align-items: center; gap: 6px; padding: 7px 14px; border-radius: 6px; border: 1px solid #e5e7eb; font-size: 13px; cursor: pointer; background: transparent; color: #374151; }
.btn:hover { background: #f9fafb; }
.btn-primary { background: #7F77DD; color: #EEEDFE; border-color: #534AB7; }
.btn-primary:hover { background: #534AB7; }
.btn-sm { padding: 5px 10px; font-size: 12px; }
.btn-large { padding: 10px 20px; font-size: 14px; width: 100%; justify-content: center; }
.btn-icon { width: 32px; height: 32px; padding: 0; display: inline-flex; align-items: center; justify-content: center; border-radius: 6px; cursor: pointer; flex-shrink: 0; border: 1px solid #e5e7eb; background: white; }
.btn-todo { color: #9ca3af; }
.btn-todo:hover { color: #534AB7; border-color: #7F77DD; }
.btn-done { background: #7F77DD; color: white; border-color: #534AB7; }
.btn-done:hover { background: #534AB7; }
.nav-item { display: flex; align-items: center; gap: 10px; padding: 8px 16px; font-size: 13px; cursor: pointer; color: #6b7280; }
.nav-item:hover { background: white; color: #111; }
.nav-item.active { background: white; color: #111; font-weight: 500; border-right: 2px solid #7F77DD; }
.empty-state { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; color: #6b7280; }
.empty-state p { font-size: 15px; font-weight: 500; }
.empty-state span { font-size: 13px; color: #9ca3af; }
.panel-list { width: 240px; border-right: 1px solid #e5e7eb; overflow-y: auto; padding: 12px; flex-shrink: 0; display: flex; flex-direction: column; gap: 8px; }
.panel-detail { flex: 1; overflow-y: auto; padding: 16px 20px; display: flex; flex-direction: column; gap: 12px; }
.section-title { font-size: 11px; font-weight: 500; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; }
.prog-card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px 12px; cursor: pointer; }
.prog-card:hover { border-color: #d1d5db; background: #f9fafb; }
.prog-card.active { border-color: #7F77DD; background: #EEEDFE; }
.prog-card.active .prog-name { color: #3C3489; }
.prog-name { font-size: 13px; font-weight: 500; margin-bottom: 4px; }
.prog-meta { display: flex; gap: 6px; align-items: center; font-size: 11px; }
.badge { display: inline-flex; align-items: center; font-size: 11px; padding: 2px 8px; border-radius: 20px; }
.badge-green { background: #EAF3DE; color: #3B6D11; }
.badge-purple { background: #EEEDFE; color: #3C3489; }
.badge-gray { background: #f3f4f6; color: #6b7280; border: 1px solid #e5e7eb; }
.detail-header h3 { font-size: 16px; font-weight: 500; margin-bottom: 3px; }
.detail-header p { font-size: 13px; color: #6b7280; }
.seance-block { border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; }
.seance-block.clickable { cursor: pointer; }
.seance-block.clickable:hover { border-color: #7F77DD; }
.seance-head { padding: 14px; background: #f9fafb; display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 500; }
.exo-count { font-size: 11px; color: #6b7280; font-weight: 400; }
.exo-block { border: 1px solid #e5e7eb; border-radius: 8px; padding: 14px; display: flex; flex-direction: column; gap: 10px; }
.exo-header { display: flex; align-items: center; gap: 8px; }
.exo-num { width: 22px; height: 22px; border-radius: 4px; background: #EEEDFE; color: #534AB7; font-size: 12px; font-weight: 500; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.exo-name { font-size: 14px; font-weight: 500; }
.series-grid { display: flex; flex-direction: column; gap: 4px; }
.series-grid-header { display: grid; grid-template-columns: 32px 1.5fr 1fr 1fr 40px; gap: 8px; font-size: 11px; color: #6b7280; font-weight: 500; padding: 0 4px; }
.serie-row { display: grid; grid-template-columns: 32px 1.5fr 1fr 1fr 40px; gap: 8px; align-items: center; padding: 4px; border-radius: 6px; }
.serie-row.done { background: #f0fdf4; }
.serie-num { font-size: 12px; color: #9ca3af; text-align: center; }
.prescrit { font-size: 12px; color: #6b7280; }
.serie-row input { padding: 6px 10px; border: 1px solid #e5e7eb; border-radius: 6px; font-size: 12px; width: 100%; }
.serie-row input:focus { outline: none; border-color: #7F77DD; }
.superset-label-row { margin-bottom: 4px; }
.superset-label { font-size: 10px; color: #534AB7; background: #EEEDFE; padding: 1px 6px; border-radius: 10px; font-weight: 500; }
.superset-indent { padding-left: 12px; border-left: 2px solid #AFA9EC; margin-left: 10px; }
.empty { color: #9ca3af; text-align: center; padding: 20px; font-size: 13px; }
.logs-page { flex: 1; padding: 20px 24px; display: flex; flex-direction: column; gap: 12px; overflow-y: auto; }
.historique-day { display: flex; flex-direction: column; gap: 6px; }
.historique-date { font-size: 12px; font-weight: 500; color: #534AB7; text-transform: capitalize; }
.historique-row { display: flex; gap: 6px; padding: 8px 12px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; }
.chip { font-size: 11px; background: white; border: 1px solid #e5e7eb; border-radius: 4px; padding: 2px 6px; color: #6b7280; }
.chip-done { background: #dcfce7; color: #16a34a; border-color: #86efac; }
.chip-skip { background: #f3f4f6; color: #9ca3af; }
</style>