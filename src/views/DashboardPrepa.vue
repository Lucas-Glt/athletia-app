<template>
  <AppLayout title="Programmes">
    <template #nav>
      <div class="nav-item active"><i class="ti ti-layout-grid"></i> Programmes</div>
      <div class="nav-item"><i class="ti ti-users"></i> Mes athlètes</div>
      <div class="nav-item"><i class="ti ti-calendar"></i> Planning</div>
    </template>

    <template #actions>
      <button class="btn btn-primary" @click="vue = 'form'" v-if="vue === 'liste'">
        <i class="ti ti-plus"></i> Nouveau programme
      </button>
      <button class="btn" @click="logout"><i class="ti ti-logout"></i> Déconnexion</button>
    </template>

    <!-- Modal assignation -->
    <AssignerAthleteModal
      v-if="modalAssigner"
      :programme="programmeActif"
      :monCercle="monCercle"
      @fermer="modalAssigner = false"
      @modifie="onModifie"
    />

    <!-- Formulaire création -->
    <ProgrammeForm v-if="vue === 'form'" @termine="onTermine" />

    <!-- Vue liste + détail -->
    <div v-if="vue === 'liste'" class="content-body">

      <!-- Panel gauche -->
      <div class="panel-list">
        <div class="section-title">Mes programmes</div>
        <div v-if="programmes.length === 0" class="empty">Aucun programme.</div>
        <div
          v-for="p in programmes"
          :key="p.id"
          class="prog-card"
          :class="{ active: programmeActif?.id === p.id }"
          @click="programmeActif = p"
        >
          <div class="prog-name">{{ p.nom }}</div>
          <div class="prog-meta">
            <span class="badge" :class="p.statut === 'actif' ? 'badge-green' : 'badge-gray'">{{ p.statut }}</span>
            <span>{{ p.athletes.length }} athlète{{ p.athletes.length > 1 ? 's' : '' }}</span>
          </div>
        </div>
        <button class="btn btn-dashed" @click="vue = 'form'">
          <i class="ti ti-plus"></i> Nouveau
        </button>
      </div>

      <!-- Panel droit -->
      <div class="panel-detail" v-if="programmeActif">
        <div class="detail-top">
          <div class="detail-info">
            <h3>{{ programmeActif.nom }}</h3>
            <p v-if="programmeActif.description">{{ programmeActif.description }}</p>
          </div>
          <div class="detail-actions">
            <button class="btn btn-sm" @click="modalAssigner = true">
              <i class="ti ti-user-plus"></i> Assigner
            </button>
            <button class="btn btn-sm"><i class="ti ti-edit"></i> Modifier</button>
          </div>
        </div>

        <div class="info-grid">
          <div class="info-cell">
            <label>Statut</label>
            <span class="badge" :class="programmeActif.statut === 'actif' ? 'badge-green' : 'badge-gray'">
              {{ programmeActif.statut }}
            </span>
          </div>
          <div class="info-cell">
            <label>Séances / semaine</label>
            <span>{{ seances.length }}</span>
          </div>
        </div>

        <div class="section-title">Athlètes assignés</div>
        <div class="athletes-row">
          <div class="athlete-chip" v-for="a in programmeActif.athletes" :key="a.id">
            <div class="mini-av">{{ initiales(a.nom) }}</div>
            {{ a.nom }}
          </div>
          <button class="btn btn-sm btn-dashed" @click="modalAssigner = true">
            <i class="ti ti-plus"></i> Ajouter
          </button>
        </div>

        <div class="tabs">
          <div class="tab active">Séances & exercices</div>
          <div class="tab">Logs athlètes</div>
        </div>

        <div v-if="loadingSeances" class="empty">Chargement...</div>

        <div v-for="seance in seances" :key="seance.id" class="seance-block">
          <div class="seance-head">
            <span class="badge badge-purple" v-if="seance.jour">{{ seance.jour }}</span>
            <span>{{ seance.nom }}</span>
            <button class="btn btn-sm" style="margin-left:auto"><i class="ti ti-plus"></i> Exercice</button>
          </div>
          <div class="seance-body">
            <div class="empty-seance" v-if="!seance.exercices || seance.exercices.length === 0">
              Aucun exercice
            </div>
            <template v-else>
              <template v-for="(exo, idx) in seance.exercices" :key="exo.id">
                <div
                  v-if="exo.groupe && (idx === 0 || seance.exercices[idx-1].groupe !== exo.groupe)"
                  class="superset-label-row"
                >
                  <span class="superset-label">Biset / Superset</span>
                </div>
                <div class="exo-row" :class="{ 'superset-indent': exo.groupe }">
                  <div class="exo-num">{{ exo.ordre }}</div>
                  <div class="exo-content">
                    <span class="exo-name">{{ exo.nom }}</span>
                    <div class="serie-chips">
                      <span class="chip" v-for="s in exo.series" :key="s.id">
                        {{ s.nb_reps }} reps
                        <template v-if="s.poids_cible"> · {{ s.poids_cible }}kg</template>
                        <template v-if="s.rm"> · {{ s.rm }}% RM</template>
                        <template v-if="s.tempo"> · {{ s.tempo }}</template>
                        <template v-if="s.temps_repos"> · {{ s.temps_repos }}s</template>
                      </span>
                    </div>
                  </div>
                </div>
              </template>
            </template>
          </div>
        </div>

        <button class="btn btn-dashed" style="width:100%;justify-content:center;margin-top:4px">
          <i class="ti ti-plus"></i> Ajouter une séance
        </button>
      </div>

      <div class="panel-detail empty" v-else>
        Sélectionnez un programme
      </div>
    </div>
  </AppLayout>
</template>

<script>
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useApi } from '../services/api'
import AppLayout from '../components/AppLayout.vue'
import ProgrammeForm from '../components/prepa/ProgrammeForm.vue'
import AssignerAthleteModal from '../components/prepa/AssignerAthleteModal.vue'

export default {
  components: { AppLayout, ProgrammeForm, AssignerAthleteModal },
  setup() {
    const programmes = ref([])
    const programmeActif = ref(null)
    const seances = ref([])
    const monCercle = ref([])
    const loadingSeances = ref(false)
    const modalAssigner = ref(false)
    const vue = ref('liste')
    const router = useRouter()
    const authStore = useAuthStore()
    const api = useApi()

    const fetchProgrammes = async () => {
      programmes.value = await api.get('/programmes/')
      if (programmes.value.length > 0 && !programmeActif.value) {
        programmeActif.value = programmes.value[0]
      }
    }

    const fetchSeances = async (programmeId) => {
      loadingSeances.value = true
      seances.value = await api.get(`/programmes/${programmeId}/seances/`)
      loadingSeances.value = false
    }

    const fetchMonCercle = async () => {
      const me = await api.get('/users/me')
      monCercle.value = me.athletes || []
    }

    watch(programmeActif, (p) => { if (p) fetchSeances(p.id) })

    const onTermine = () => {
      vue.value = 'liste'
      fetchProgrammes()
    }

    // Après une modif dans le modal : recharge programmes + cercle
    const onModifie = async () => {
      await fetchProgrammes()
      await fetchMonCercle()
      // Met à jour programmeActif avec les données fraîches
      if (programmeActif.value) {
        programmeActif.value = programmes.value.find(p => p.id === programmeActif.value.id)
      }
    }

    const logout = () => {
      authStore.logout()
      router.push('/')
    }

    const initiales = (nom) => nom.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

    onMounted(async () => {
      await fetchProgrammes()
      await fetchMonCercle()
    })

    return {
      programmes, programmeActif, seances, monCercle,
      loadingSeances, modalAssigner, vue,
      onTermine, onModifie, logout, initiales
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
.btn-dashed { border-style: dashed; font-size: 12px; }
.nav-item { display: flex; align-items: center; gap: 10px; padding: 8px 16px; font-size: 13px; cursor: pointer; color: #6b7280; }
.nav-item:hover { background: white; color: #111; }
.nav-item.active { background: white; color: #111; font-weight: 500; border-right: 2px solid #7F77DD; }
.panel-list { width: 240px; border-right: 1px solid #e5e7eb; overflow-y: auto; padding: 12px; flex-shrink: 0; display: flex; flex-direction: column; gap: 8px; }
.panel-detail { flex: 1; overflow-y: auto; padding: 16px 20px; display: flex; flex-direction: column; gap: 12px; }
.panel-detail.empty { align-items: center; justify-content: center; color: #9ca3af; }
.section-title { font-size: 11px; font-weight: 500; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; }
.prog-card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px 12px; cursor: pointer; }
.prog-card:hover { border-color: #d1d5db; background: #f9fafb; }
.prog-card.active { border-color: #7F77DD; background: #EEEDFE; }
.prog-card.active .prog-name { color: #3C3489; }
.prog-name { font-size: 13px; font-weight: 500; margin-bottom: 4px; }
.prog-meta { display: flex; gap: 6px; align-items: center; font-size: 11px; color: #6b7280; }
.badge { display: inline-flex; align-items: center; font-size: 11px; padding: 2px 8px; border-radius: 20px; }
.badge-green { background: #EAF3DE; color: #3B6D11; }
.badge-purple { background: #EEEDFE; color: #3C3489; }
.badge-gray { background: #f3f4f6; color: #6b7280; border: 1px solid #e5e7eb; }
.detail-top { display: flex; justify-content: space-between; align-items: flex-start; }
.detail-info h3 { font-size: 16px; font-weight: 500; margin-bottom: 3px; }
.detail-info p { font-size: 13px; color: #6b7280; }
.detail-actions { display: flex; gap: 6px; }
.info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.info-cell { background: #f9fafb; border-radius: 6px; padding: 8px 12px; }
.info-cell label { font-size: 11px; color: #6b7280; display: block; margin-bottom: 2px; }
.info-cell span { font-size: 13px; font-weight: 500; }
.athletes-row { display: flex; gap: 6px; flex-wrap: wrap; }
.athlete-chip { display: flex; align-items: center; gap: 5px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 20px; padding: 3px 10px; font-size: 12px; }
.mini-av { width: 18px; height: 18px; border-radius: 50%; background: #C0DD97; display: flex; align-items: center; justify-content: center; font-size: 9px; font-weight: 500; color: #27500A; }
.tabs { display: flex; border-bottom: 1px solid #e5e7eb; }
.tab { padding: 8px 14px; font-size: 13px; cursor: pointer; color: #6b7280; border-bottom: 2px solid transparent; margin-bottom: -1px; }
.tab.active { color: #534AB7; border-bottom-color: #7F77DD; font-weight: 500; }
.seance-block { border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; }
.seance-head { padding: 10px 14px; background: #f9fafb; display: flex; align-items: center; gap: 8px; border-bottom: 1px solid #e5e7eb; font-size: 13px; font-weight: 500; }
.seance-body { padding: 10px 14px; }
.exo-row { display: flex; align-items: flex-start; gap: 8px; padding: 6px 0; border-bottom: 1px solid #f3f4f6; }
.exo-row:last-child { border-bottom: none; }
.exo-num { width: 20px; height: 20px; border-radius: 4px; background: #EEEDFE; color: #534AB7; font-size: 11px; font-weight: 500; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 1px; }
.exo-content { flex: 1; }
.exo-name { font-size: 13px; font-weight: 500; }
.serie-chips { display: flex; gap: 4px; flex-wrap: wrap; margin-top: 4px; }
.chip { font-size: 11px; background: #f3f4f6; border: 1px solid #e5e7eb; border-radius: 4px; padding: 2px 6px; color: #6b7280; }
.superset-label-row { display: flex; align-items: center; gap: 6px; margin: 4px 0 2px; }
.superset-label { font-size: 10px; color: #534AB7; background: #EEEDFE; padding: 1px 6px; border-radius: 10px; font-weight: 500; }
.superset-indent { padding-left: 12px; border-left: 2px solid #AFA9EC; margin-left: 10px; }
.empty { color: #9ca3af; text-align: center; padding: 20px; font-size: 13px; }
.empty-seance { color: #9ca3af; font-size: 12px; padding: 8px 0; }
</style>