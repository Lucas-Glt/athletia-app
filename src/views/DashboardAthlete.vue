<template>
  <AppLayout title="Mon programme">
    <template #nav>
      <div class="nav-item active"><i class="ti ti-calendar"></i> Mon programme</div>
      <div class="nav-item"><i class="ti ti-chart-bar"></i> Mes logs</div>
    </template>

    <template #actions>
      <button class="btn" @click="logout"><i class="ti ti-logout"></i> Déconnexion</button>
    </template>

    <div class="content-body">

      <!-- Pas de programme -->
      <div class="empty-state" v-if="programmes.length === 0">
        <i class="ti ti-calendar-off" style="font-size:40px;color:#9ca3af"></i>
        <p>Aucun programme assigné pour le moment.</p>
        <span>Contactez votre préparateur physique.</span>
      </div>

      <!-- Panel gauche : liste programmes -->
      <div class="panel-list" v-if="programmes.length > 0">
        <div class="section-title">Mes programmes</div>
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
          </div>
        </div>
      </div>

      <!-- Panel droit : séances -->
      <div class="panel-detail" v-if="programmeActif">
        <div class="detail-header">
          <h3>{{ programmeActif.nom }}</h3>
          <p v-if="programmeActif.description">{{ programmeActif.description }}</p>
        </div>

        <div v-if="loadingSeances" class="empty">Chargement...</div>

        <div v-for="seance in seances" :key="seance.id" class="seance-block">
          <div class="seance-head">
            <span class="badge badge-purple" v-if="seance.jour">{{ seance.jour }}</span>
            <span>{{ seance.nom }}</span>
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
                    <div class="series-list">
                      <div class="serie-row" v-for="(s, i) in exo.series" :key="s.id">
                        <span class="serie-num">Série {{ i + 1 }}</span>
                        <span class="chip">{{ s.nb_reps }} reps</span>
                        <span class="chip" v-if="s.poids_cible">{{ s.poids_cible }} kg</span>
                        <span class="chip" v-if="s.rm">{{ s.rm }}% RM</span>
                        <span class="chip" v-if="s.tempo">{{ s.tempo }}</span>
                        <span class="chip" v-if="s.temps_repos">{{ s.temps_repos }}s repos</span>
                      </div>
                    </div>
                  </div>
                </div>
              </template>
            </template>
          </div>
        </div>
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

export default {
  components: { AppLayout },
  setup() {
    const programmes = ref([])
    const programmeActif = ref(null)
    const seances = ref([])
    const loadingSeances = ref(false)
    const router = useRouter()
    const authStore = useAuthStore()
    const api = useApi()

    const fetchProgrammes = async () => {
      programmes.value = await api.get('/programmes/')
      if (programmes.value.length > 0) programmeActif.value = programmes.value[0]
    }

    const fetchSeances = async (programmeId) => {
      loadingSeances.value = true
      seances.value = await api.get(`/programmes/${programmeId}/seances/`)
      loadingSeances.value = false
    }

    watch(programmeActif, (p) => { if (p) fetchSeances(p.id) })

    const logout = () => {
      authStore.logout()
      router.push('/')
    }

    onMounted(fetchProgrammes)

    return { programmes, programmeActif, seances, loadingSeances, logout }
  }
}
</script>

<style scoped>
* { box-sizing: border-box; }
.content-body { display: flex; flex: 1; overflow: hidden; }
.btn { display: inline-flex; align-items: center; gap: 6px; padding: 7px 14px; border-radius: 6px; border: 1px solid #e5e7eb; font-size: 13px; cursor: pointer; background: transparent; color: #374151; }
.btn:hover { background: #f9fafb; }
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
.badge { display: inline-flex; font-size: 11px; padding: 2px 8px; border-radius: 20px; }
.badge-green { background: #EAF3DE; color: #3B6D11; }
.badge-purple { background: #EEEDFE; color: #3C3489; }
.badge-gray { background: #f3f4f6; color: #6b7280; border: 1px solid #e5e7eb; }
.detail-header h3 { font-size: 16px; font-weight: 500; margin-bottom: 3px; }
.detail-header p { font-size: 13px; color: #6b7280; }
.seance-block { border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; }
.seance-head { padding: 10px 14px; background: #f9fafb; display: flex; align-items: center; gap: 8px; border-bottom: 1px solid #e5e7eb; font-size: 13px; font-weight: 500; }
.seance-body { padding: 10px 14px; display: flex; flex-direction: column; gap: 4px; }
.exo-row { display: flex; align-items: flex-start; gap: 8px; padding: 8px 0; border-bottom: 1px solid #f3f4f6; }
.exo-row:last-child { border-bottom: none; }
.exo-num { width: 20px; height: 20px; border-radius: 4px; background: #EEEDFE; color: #534AB7; font-size: 11px; font-weight: 500; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 2px; }
.exo-content { flex: 1; }
.exo-name { font-size: 13px; font-weight: 500; display: block; margin-bottom: 6px; }
.series-list { display: flex; flex-direction: column; gap: 4px; }
.serie-row { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.serie-num { font-size: 11px; color: #6b7280; width: 50px; flex-shrink: 0; }
.chip { font-size: 11px; background: #f3f4f6; border: 1px solid #e5e7eb; border-radius: 4px; padding: 2px 6px; color: #6b7280; }
.superset-label-row { display: flex; align-items: center; gap: 6px; margin: 4px 0 2px; }
.superset-label { font-size: 10px; color: #534AB7; background: #EEEDFE; padding: 1px 6px; border-radius: 10px; font-weight: 500; }
.superset-indent { padding-left: 12px; border-left: 2px solid #AFA9EC; margin-left: 10px; }
.empty { color: #9ca3af; text-align: center; padding: 20px; font-size: 13px; }
.empty-seance { color: #9ca3af; font-size: 12px; padding: 8px 0; }
</style>