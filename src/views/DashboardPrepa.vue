<template>
  <AppLayout :title="vueLabel">
    <template #nav>
      <div class="nav-item" :class="{ active: onglet === 'programmes' }" @click="onglet = 'programmes'">
        <i class="ti ti-layout-grid"></i> Programmes
      </div>
      <div class="nav-item" :class="{ active: onglet === 'athletes' }" @click="onglet = 'athletes'">
        <i class="ti ti-users"></i> Mes athlètes
      </div>
    </template>

    <template #actions>
      <button class="btn btn-primary" @click="vue = 'form'" v-if="onglet === 'programmes' && vue === 'liste'">
        <i class="ti ti-plus"></i> Nouveau programme
      </button>
      <button class="btn" @click="logout"><i class="ti ti-logout"></i> Déconnexion</button>
    </template>

    <AssignerAthleteModal
      v-if="modalAssigner"
      :programme="programmeActif"
      :monCercle="monCercle"
      @fermer="modalAssigner = false"
      @modifie="onModifie"
    />

    <template v-if="onglet === 'programmes'">
      <ProgrammeForm v-if="vue === 'form'" @termine="onTermine" />

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
            @click="selectProgramme(p)"
          >
            <div class="prog-card-top">
              <div class="prog-name">{{ p.nom }}</div>
              <button v-if="editMode" class="btn-icon btn-danger" @click.stop="supprimerProgramme(p)" title="Supprimer">
                <i class="ti ti-trash"></i>
              </button>
            </div>
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

          <div v-if="editMode" class="edit-banner">
            <i class="ti ti-edit"></i>
            <span>Mode édition activé</span>
          </div>

          <div class="detail-top">
            <div class="detail-info" v-if="!editMode">
              <h3>{{ programmeActif.nom }}</h3>
              <p v-if="programmeActif.description">{{ programmeActif.description }}</p>
            </div>
            <div class="detail-edit" v-else>
              <input v-model="editNom" placeholder="Nom du programme" />
              <input v-model="editDesc" placeholder="Description" />
            </div>
            <div class="detail-actions">
              <template v-if="!editMode">
                <button class="btn btn-sm" @click="modalAssigner = true"><i class="ti ti-user-plus"></i> Assigner</button>
                <button class="btn btn-sm btn-primary" @click="startEditMode"><i class="ti ti-edit"></i> Modifier</button>
              </template>
              <template v-else>
                <button class="btn btn-sm btn-primary" @click="sauvegarderEditMode">✓ Sauvegarder</button>
                <button class="btn btn-sm" @click="annulerEditMode">Annuler</button>
              </template>
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
              <label>Nombre de semaines</label>
              <span>{{ semainesDisponibles.length }}</span>
            </div>
          </div>

          <div class="section-title">Athlètes assignés</div>
          <div class="athletes-row">
            <div class="athlete-chip" v-for="a in programmeActif.athletes" :key="a.id">
              <div class="mini-av">{{ initiales(a.nom) }}</div>
              {{ a.nom }}
            </div>
            <button v-if="editMode" class="btn btn-sm btn-dashed" @click="modalAssigner = true">
              <i class="ti ti-plus"></i> Ajouter
            </button>
          </div>

          <div class="tabs">
            <div class="tab" :class="{ active: tabDetail === 'seances' }" @click="tabDetail = 'seances'">
              Séances & exercices
            </div>
            <div class="tab" :class="{ active: tabDetail === 'logs' }" @click="onClickTabLogs">
              Logs athlètes
            </div>
          </div>

          <!-- TAB SÉANCES -->
          <template v-if="tabDetail === 'seances'">
            <!-- Onglets de semaines -->
            <div class="semaines-tabs" v-if="semainesDisponibles.length > 0">
              <div
                v-for="sem in semainesDisponibles"
                :key="sem"
                class="semaine-tab"
                :class="{ active: semaineActive === sem }"
                @click="semaineActive = sem"
              >
                <span>Semaine {{ sem }}</span>
                <button
                  v-if="editMode && semainesDisponibles.length > 1"
                  class="btn-icon-tiny"
                  @click.stop="supprimerSemaine(sem)"
                  title="Supprimer cette semaine"
                >
                  <i class="ti ti-x"></i>
                </button>
              </div>
              <button
                v-if="editMode"
                class="semaine-tab semaine-add"
                @click="dupliquerSemaine"
                title="Dupliquer la semaine active"
              >
                <i class="ti ti-plus"></i> Nouvelle semaine
              </button>
            </div>

            <div v-if="loadingSeances" class="empty">Chargement...</div>

            <div v-for="seance in seancesFiltrees" :key="seance.id" class="seance-block">
              <div class="seance-head">
                <span class="badge badge-purple" v-if="seance.jour">{{ seance.jour }}</span>
                <span style="flex:1">{{ seance.nom }}</span>
                <button v-if="editMode" class="btn btn-sm btn-danger" @click="supprimerSeance(seance)">
                  <i class="ti ti-trash"></i>
                </button>
              </div>
              <div class="seance-body">
                <div class="empty-seance" v-if="!seance.exercices || seance.exercices.length === 0">
                  Aucun exercice
                </div>
                <template v-else>
                  <template v-for="(exo, idx) in seance.exercices" :key="exo.id">
                    <div v-if="exo.groupe && (idx === 0 || seance.exercices[idx-1].groupe !== exo.groupe)" class="superset-label-row">
                      <span class="superset-label">Biset / Superset</span>
                    </div>
                    <div class="exo-block" :class="{ 'superset-indent': exo.groupe }">
                      <div class="exo-header">
                        <div class="exo-num">{{ exo.ordre }}</div>
                        <span class="exo-name" style="flex:1">{{ exo.nom }}</span>
                        <button v-if="editMode" class="btn-icon btn-danger" @click="supprimerExercice(seance, exo)">
                          <i class="ti ti-trash"></i>
                        </button>
                      </div>

                      <div v-if="!editMode" class="serie-chips">
                        <span class="chip" v-for="s in exo.series" :key="s.id">
                          <template v-if="s.nb_reps">{{ s.nb_reps }} reps</template>
                          <template v-if="s.poids_cible"> · {{ s.poids_cible }}</template>
                          <template v-if="s.rm"> · {{ s.rm }}</template>
                          <template v-if="s.tempo"> · {{ s.tempo }}</template>
                          <template v-if="s.temps_repos"> · {{ s.temps_repos }}</template>
                        </span>
                      </div>

                      <div v-else class="series-table">
                        <div class="series-header">
                          <span>#</span>
                          <span>Reps</span>
                          <span>Charge</span>
                          <span>% RM</span>
                          <span>Tempo</span>
                          <span>Repos</span>
                          <span></span>
                        </div>
                        <div v-for="(serie, i) in exo.series" :key="serie.id" class="serie-row-edit">
                          <span class="serie-num">{{ i + 1 }}</span>
                          <input v-model="serie.nb_reps" @change="mettreAJourSerie(serie)" placeholder="–" />
                          <input v-model="serie.poids_cible" @change="mettreAJourSerie(serie)" placeholder="–" />
                          <input v-model="serie.rm" @change="mettreAJourSerie(serie)" placeholder="–" />
                          <input v-model="serie.tempo" @change="mettreAJourSerie(serie)" placeholder="–" />
                          <input v-model="serie.temps_repos" @change="mettreAJourSerie(serie)" placeholder="–" />
                          <button class="btn-icon btn-danger" @click="supprimerSerie(exo, serie)">
                            <i class="ti ti-trash"></i>
                          </button>
                        </div>
                        <button class="btn btn-sm btn-dashed" @click="ajouterSerieRapide(exo)" style="margin-top:4px">
                          <i class="ti ti-plus"></i> Ajouter une série
                        </button>
                      </div>
                    </div>
                  </template>
                </template>

                <div v-if="editMode" class="add-exercice-form">
                  <input v-model.number="seance._nouvelExercice.ordre" type="number" placeholder="Ordre" class="input-sm" />
                  <input v-model="seance._nouvelExercice.nom" placeholder="Nom de l'exercice" class="input-flex" />
                  <input v-model.number="seance._nouvelExercice.groupe" type="number" placeholder="Groupe" class="input-sm" />
                  <button
                    class="btn btn-sm"
                    @click="ajouterExercice(seance)"
                    :disabled="!seance._nouvelExercice.nom || !seance._nouvelExercice.ordre"
                  >
                    + Exercice
                  </button>
                </div>
              </div>
            </div>

            <div v-if="editMode" class="add-seance-form">
              <input v-model="nouvelleSeance.nom" placeholder="Nom de la séance" class="input-flex" />
              <select v-model="nouvelleSeance.jour">
                <option value="">Jour (optionnel)</option>
                <option v-for="j in jours" :key="j" :value="j">{{ j }}</option>
              </select>
              <button class="btn btn-sm" @click="ajouterSeance" :disabled="!nouvelleSeance.nom">+ Séance</button>
            </div>
          </template>

          <!-- TAB LOGS ATHLETES -->
          <template v-if="tabDetail === 'logs'">
            <div v-if="programmeActif.athletes.length === 0" class="empty">
              Aucun athlète assigné à ce programme.
            </div>

            <div v-if="!athleteLogs" class="logs-athletes-list">
              <div
                v-for="a in programmeActif.athletes"
                :key="a.id"
                class="athlete-card"
                @click="voirLogsAthlete(a)"
              >
                <div class="mini-av-lg">{{ initiales(a.nom) }}</div>
                <div class="athlete-info">
                  <div class="athlete-nom">{{ a.nom }}</div>
                  <div class="athlete-email">{{ a.email }}</div>
                </div>
                <i class="ti ti-chevron-right"></i>
              </div>
            </div>

            <div v-else class="logs-detail">
              <div class="logs-header">
                <button class="btn btn-sm" @click="athleteLogs = null" style="align-self:flex-start">
                  <i class="ti ti-arrow-left"></i> Retour
                </button>
                <div class="logs-title">
                  <div class="mini-av-lg">{{ initiales(athleteLogs.nom) }}</div>
                  <div>
                    <div class="athlete-nom">{{ athleteLogs.nom }}</div>
                    <div class="athlete-email">{{ athleteLogs.email }}</div>
                  </div>
                </div>
              </div>

              <div v-if="loadingLogs" class="empty">Chargement...</div>
              <div v-else-if="logsGroupes.length === 0" class="empty">
                Aucun log enregistré pour cet athlète.
              </div>

              <div v-else>
                <div v-for="session in logsGroupes" :key="session.key" class="session-block">
                  <div class="session-head">
                    <span class="badge badge-purple" v-if="session.jour">{{ session.jour }}</span>
                    <span class="session-nom">{{ session.seanceNom }}</span>
                    <span class="session-date">{{ formatDate(session.date) }}</span>
                  </div>

                  <div class="session-body">
                    <div v-for="exo in session.exercices" :key="exo.id" class="exo-bloc">
                      <div class="exo-header">
                        <div class="exo-num">{{ exo.ordre }}</div>
                        <span class="exo-name">{{ exo.nom }}</span>
                      </div>

                      <div class="comparatif-grid">
                        <div class="comparatif-header">
                          <span>#</span>
                          <span>Prescrit</span>
                          <span>Réalisé</span>
                          <span></span>
                        </div>
                        <div
                          v-for="(log, i) in exo.logs"
                          :key="log.id"
                          class="comparatif-row"
                          :class="getStatutClasse(log)"
                        >
                          <span class="serie-num">{{ i + 1 }}</span>
                          <div class="prescrit-cell">
                            <span v-if="log.serie.nb_reps">{{ log.serie.nb_reps }} reps</span>
                            <span v-if="log.serie.poids_cible"> · {{ log.serie.poids_cible }}</span>
                            <span v-if="log.serie.rm"> · {{ log.serie.rm }}</span>
                            <span v-if="log.serie.tempo"> · {{ log.serie.tempo }}</span>
                          </div>
                          <div class="realise-cell">
                            <template v-if="log.fait">
                              <span v-if="log.reps_realisees">{{ log.reps_realisees }} reps</span>
                              <span v-if="log.poids_realise"> · {{ log.poids_realise }}</span>
                              <span v-if="!log.reps_realisees && !log.poids_realise">—</span>
                            </template>
                            <span v-else class="non-fait">non réalisé</span>
                          </div>
                          <span class="statut-icon">
                            <i :class="getStatutIcon(log)"></i>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </template>
        </div>

        <div class="panel-detail empty" v-else>Sélectionnez un programme</div>
      </div>
    </template>

    <div v-if="onglet === 'athletes'" class="athletes-page">
      <div class="section-title" style="margin-bottom:12px">Mon cercle d'athlètes</div>
      <div v-if="monCercle.length === 0" class="empty">Aucun athlète dans votre cercle.</div>
      <div v-for="a in monCercle" :key="a.id" class="athlete-row">
        <div class="mini-av-lg">{{ initiales(a.nom) }}</div>
        <div class="athlete-info">
          <div class="athlete-nom">{{ a.nom }}</div>
          <div class="athlete-email">{{ a.email }}</div>
        </div>
        <button class="btn btn-sm btn-danger" @click="retirerDuCercle(a)">Retirer</button>
      </div>

      <div class="add-athlete-row">
        <input v-model="searchEmail" placeholder="Email de l'athlète" type="email" style="flex:1" />
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
    </div>
  </AppLayout>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue'
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
    const onglet = ref('programmes')
    const tabDetail = ref('seances')
    const editMode = ref(false)
    const editNom = ref('')
    const editDesc = ref('')
    const searchEmail = ref('')
    const athleteTrouve = ref(null)
    const searchError = ref('')
    const athleteLogs = ref(null)
    const logs = ref([])
    const loadingLogs = ref(false)
    const nouvelleSeance = ref({ nom: '', jour: '' })
    const semaineActive = ref(1)
    const router = useRouter()
    const authStore = useAuthStore()
    const api = useApi()

    const jours = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']
    const vueLabel = computed(() => onglet.value === 'athletes' ? 'Mes athlètes' : 'Programmes')

    // Liste triée des numéros de semaines existant
    const semainesDisponibles = computed(() => {
      const set = new Set(seances.value.map(s => s.semaine || 1))
      return Array.from(set).sort((a, b) => a - b)
    })

    // Séances de la semaine active uniquement
    const seancesFiltrees = computed(() => {
      return seances.value
        .filter(s => (s.semaine || 1) === semaineActive.value)
        .sort((a, b) => a.ordre - b.ordre)
    })

    const logsGroupes = computed(() => {
      const sessions = {}
      logs.value.forEach(log => {
        const dateStr = log.date.split('T')[0]
        const key = `${dateStr}__${log.seance.id}`
        if (!sessions[key]) {
          sessions[key] = { key, date: dateStr, seanceNom: log.seance.nom, jour: log.seance.jour, exercices: {} }
        }
        if (!sessions[key].exercices[log.exercice.id]) {
          sessions[key].exercices[log.exercice.id] = { id: log.exercice.id, nom: log.exercice.nom, ordre: log.exercice.ordre, logs: [] }
        }
        sessions[key].exercices[log.exercice.id].logs.push(log)
      })
      return Object.values(sessions)
        .sort((a, b) => b.date.localeCompare(a.date))
        .map(s => ({ ...s, exercices: Object.values(s.exercices).sort((a, b) => a.ordre - b.ordre) }))
    })

    const fetchProgrammes = async () => {
      programmes.value = await api.get('/programmes/')
      if (programmes.value.length > 0 && !programmeActif.value) {
        programmeActif.value = programmes.value[0]
      }
    }

    const fetchSeances = async (programmeId) => {
      loadingSeances.value = true
      const data = await api.get(`/programmes/${programmeId}/seances/`)
      seances.value = data.map(s => ({
        ...s,
        _nouvelExercice: { nom: '', ordre: (s.exercices?.length || 0) + 1, groupe: null }
      }))
      // Recalibre la semaine active si besoin
      const semaines = [...new Set(seances.value.map(s => s.semaine || 1))]
      if (!semaines.includes(semaineActive.value)) {
        semaineActive.value = semaines[0] || 1
      }
      loadingSeances.value = false
    }

    const fetchMonCercle = async () => {
      const me = await api.get('/users/me')
      monCercle.value = me.athletes || []
    }

    const selectProgramme = (p) => {
      if (editMode.value) {
        if (!confirm('Annuler les modifications en cours ?')) return
        editMode.value = false
      }
      programmeActif.value = p
      semaineActive.value = 1
    }

    watch(programmeActif, (p) => {
      if (p) fetchSeances(p.id)
      athleteLogs.value = null
      tabDetail.value = 'seances'
    })

    const startEditMode = () => {
      editNom.value = programmeActif.value.nom
      editDesc.value = programmeActif.value.description || ''
      editMode.value = true
    }

    const sauvegarderEditMode = async () => {
      const data = await api.patch(`/programmes/${programmeActif.value.id}`, {
        nom: editNom.value,
        description: editDesc.value || null
      })
      programmeActif.value = data
      programmes.value = programmes.value.map(p => p.id === data.id ? data : p)
      editMode.value = false
    }

    const annulerEditMode = () => {
      editMode.value = false
      fetchSeances(programmeActif.value.id)
    }

    const ajouterSeance = async () => {
      // Compte les séances existantes dans la semaine active pour l'ordre
      const seancesSemaine = seances.value.filter(s => (s.semaine || 1) === semaineActive.value)
      const data = await api.post(`/programmes/${programmeActif.value.id}/seances/`, {
        nom: nouvelleSeance.value.nom,
        ordre: seancesSemaine.length + 1,
        jour: nouvelleSeance.value.jour || null,
        semaine: semaineActive.value
      })
      seances.value.push({
        ...data,
        exercices: [],
        _nouvelExercice: { nom: '', ordre: 1, groupe: null }
      })
      nouvelleSeance.value = { nom: '', jour: '' }
    }

    const dupliquerSemaine = async () => {
      const nouvellesSeances = await api.post(
        `/programmes/${programmeActif.value.id}/seances/dupliquer-semaine/${semaineActive.value}`
      )
      // Recharge tout pour avoir la structure complète à jour
      await fetchSeances(programmeActif.value.id)
      // Bascule sur la nouvelle semaine
      if (nouvellesSeances.length > 0) {
        semaineActive.value = nouvellesSeances[0].semaine
      }
    }

    const supprimerSemaine = async (numero) => {
      if (!confirm(`Supprimer toute la semaine ${numero} (toutes les séances et exercices) ?`)) return
      await api.del(`/programmes/${programmeActif.value.id}/seances/semaine/${numero}`)
      await fetchSeances(programmeActif.value.id)
    }

    const ajouterExercice = async (seance) => {
      const data = await api.post(`/seances/${seance.id}/exercices/`, {
        nom: seance._nouvelExercice.nom,
        ordre: seance._nouvelExercice.ordre,
        groupe: seance._nouvelExercice.groupe || null
      })
      seance.exercices.push({ ...data, series: [] })
      seance._nouvelExercice = { nom: '', ordre: seance.exercices.length + 1, groupe: null }
    }

    const ajouterSerieRapide = async (exercice) => {
      const data = await api.post(`/exercices/${exercice.id}/series/`, {
        nb_reps: null, poids_cible: null, rm: null, tempo: null, temps_repos: null
      })
      exercice.series.push(data)
    }

    const mettreAJourSerie = async (serie) => {
      await api.patch(`/series/${serie.id}`, {
        nb_reps: serie.nb_reps || null,
        poids_cible: serie.poids_cible || null,
        rm: serie.rm || null,
        tempo: serie.tempo || null,
        temps_repos: serie.temps_repos || null
      })
    }

    const supprimerProgramme = async (p) => {
      if (!confirm(`Supprimer "${p.nom}" ?`)) return
      await api.del(`/programmes/${p.id}`)
      programmes.value = programmes.value.filter(x => x.id !== p.id)
      if (programmeActif.value?.id === p.id) {
        programmeActif.value = programmes.value[0] || null
        editMode.value = false
      }
    }

    const supprimerSeance = async (seance) => {
      if (!confirm(`Supprimer la séance "${seance.nom}" ?`)) return
      await api.del(`/seances/${seance.id}`)
      seances.value = seances.value.filter(s => s.id !== seance.id)
    }

    const supprimerExercice = async (seance, exo) => {
      if (!confirm(`Supprimer l'exercice "${exo.nom}" ?`)) return
      await api.del(`/exercices/${exo.id}`)
      seance.exercices = seance.exercices.filter(e => e.id !== exo.id)
    }

    const supprimerSerie = async (exo, serie) => {
      await api.del(`/series/${serie.id}`)
      exo.series = exo.series.filter(s => s.id !== serie.id)
    }

    const onClickTabLogs = () => { tabDetail.value = 'logs'; athleteLogs.value = null }

    const voirLogsAthlete = async (athlete) => {
      athleteLogs.value = athlete
      loadingLogs.value = true
      logs.value = await api.get(`/logs/programme/${programmeActif.value.id}/athlete/${athlete.id}`)
      loadingLogs.value = false
    }

    const formatDate = (d) => {
      const date = new Date(d)
      return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
    }

    const getStatutClasse = (log) => {
      if (!log.fait) return 'statut-skip'
      if (!log.reps_realisees && !log.poids_realise) return 'statut-warn'
      const prescR = parseFloat(log.serie.nb_reps)
      const realR = parseFloat(log.reps_realisees)
      if (!isNaN(prescR) && !isNaN(realR) && realR < prescR) return 'statut-warn'
      return 'statut-done'
    }

    const getStatutIcon = (log) => {
      if (!log.fait) return 'ti ti-x'
      const classe = getStatutClasse(log)
      if (classe === 'statut-warn') return 'ti ti-alert-triangle'
      return 'ti ti-check'
    }

    const onTermine = () => { vue.value = 'liste'; fetchProgrammes() }

    const onModifie = async () => {
      await fetchProgrammes()
      await fetchMonCercle()
      if (programmeActif.value) {
        programmeActif.value = programmes.value.find(p => p.id === programmeActif.value.id)
      }
    }

    const retirerDuCercle = async (athlete) => {
      await api.del(`/users/mes-athletes/${athlete.id}`)
      monCercle.value = monCercle.value.filter(a => a.id !== athlete.id)
    }

    const rechercherAthlète = async () => {
      searchError.value = ''
      athleteTrouve.value = null
      try {
        const found = await api.get(`/users/recherche?email=${encodeURIComponent(searchEmail.value)}`)
        if (found.detail) { searchError.value = found.detail; return }
        if (monCercle.value.find(a => a.id === found.id)) { searchError.value = 'Déjà dans votre cercle'; return }
        athleteTrouve.value = found
      } catch { searchError.value = 'Athlète introuvable' }
    }

    const ajouterAuCercle = async () => {
      await api.post(`/users/mes-athletes/${athleteTrouve.value.id}`)
      monCercle.value.push(athleteTrouve.value)
      athleteTrouve.value = null
      searchEmail.value = ''
    }

    const logout = () => { authStore.logout(); router.push('/') }
    const initiales = (nom) => nom.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

    onMounted(async () => {
      await fetchProgrammes()
      await fetchMonCercle()
    })

    return {
      programmes, programmeActif, seances, monCercle,
      loadingSeances, modalAssigner, vue, onglet, vueLabel,
      tabDetail, athleteLogs, logs, loadingLogs, logsGroupes,
      editMode, editNom, editDesc,
      nouvelleSeance, jours,
      semaineActive, semainesDisponibles, seancesFiltrees,
      searchEmail, athleteTrouve, searchError,
      selectProgramme, startEditMode, sauvegarderEditMode, annulerEditMode,
      ajouterSeance, ajouterExercice, ajouterSerieRapide, mettreAJourSerie,
      dupliquerSemaine, supprimerSemaine,
      supprimerProgramme, supprimerSeance, supprimerExercice, supprimerSerie,
      onTermine, onModifie, logout, initiales,
      onClickTabLogs, voirLogsAthlete, formatDate,
      getStatutClasse, getStatutIcon,
      retirerDuCercle, rechercherAthlète, ajouterAuCercle
    }
  }
}
</script>

<style scoped>
* { box-sizing: border-box; }
.content-body { display: flex; flex: 1; overflow: hidden; min-height: 0; min-width: 0; }
.btn { display: inline-flex; align-items: center; gap: 6px; padding: 7px 14px; border-radius: 6px; border: 1px solid #e5e7eb; font-size: 13px; cursor: pointer; background: transparent; color: #374151; }
.btn:hover { background: #f9fafb; }
.btn-primary { background: #7F77DD; color: #EEEDFE; border-color: #534AB7; }
.btn-primary:hover { background: #534AB7; }
.btn-sm { padding: 5px 10px; font-size: 12px; }
.btn-dashed { border-style: dashed; font-size: 12px; }
.btn-icon { width: 26px; height: 26px; padding: 0; display: inline-flex; align-items: center; justify-content: center; border-radius: 6px; border: none; cursor: pointer; flex-shrink: 0; background: transparent; }
.btn-icon-tiny { width: 18px; height: 18px; padding: 0; display: inline-flex; align-items: center; justify-content: center; border-radius: 4px; border: none; cursor: pointer; background: transparent; color: inherit; opacity: 0.6; }
.btn-icon-tiny:hover { opacity: 1; }
.btn-danger { background: #fee2e2; color: #dc2626; border: 1px solid #fca5a5 !important; }
.btn-danger:hover { background: #fecaca; }
.nav-item { display: flex; align-items: center; gap: 10px; padding: 8px 16px; font-size: 13px; cursor: pointer; color: #6b7280; }
.nav-item:hover { background: white; color: #111; }
.nav-item.active { background: white; color: #111; font-weight: 500; border-right: 2px solid #7F77DD; }
.panel-list { width: 240px; border-right: 1px solid #e5e7eb; overflow-y: auto; padding: 12px; flex-shrink: 0; display: flex; flex-direction: column; gap: 8px; }
.panel-detail { flex: 1; overflow-y: auto; padding: 16px 20px; display: flex; flex-direction: column; gap: 12px; min-height: 0; }
.panel-detail.empty { align-items: center; justify-content: center; color: #9ca3af; }
.section-title { font-size: 11px; font-weight: 500; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; }
.edit-banner { display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: #EEEDFE; color: #3C3489; border-radius: 6px; font-size: 12px; font-weight: 500; flex-shrink: 0; }
.prog-card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px 12px; cursor: pointer; }
.prog-card:hover { border-color: #d1d5db; background: #f9fafb; }
.prog-card.active { border-color: #7F77DD; background: #EEEDFE; }
.prog-card.active .prog-name { color: #3C3489; }
.prog-card-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px; }
.prog-name { font-size: 13px; font-weight: 500; }
.prog-meta { display: flex; gap: 6px; align-items: center; font-size: 11px; color: #6b7280; }
.badge { display: inline-flex; align-items: center; font-size: 11px; padding: 2px 8px; border-radius: 20px; }
.badge-green { background: #EAF3DE; color: #3B6D11; }
.badge-purple { background: #EEEDFE; color: #3C3489; }
.badge-gray { background: #f3f4f6; color: #6b7280; border: 1px solid #e5e7eb; }
.detail-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; flex-shrink: 0; }
.detail-info h3 { font-size: 16px; font-weight: 500; margin-bottom: 3px; }
.detail-info p { font-size: 13px; color: #6b7280; }
.detail-edit { display: flex; flex-direction: column; gap: 6px; flex: 1; }
.detail-edit input { padding: 6px 10px; border: 1px solid #e5e7eb; border-radius: 6px; font-size: 13px; }
.detail-actions { display: flex; gap: 6px; flex-shrink: 0; }
.info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; flex-shrink: 0; }
.info-cell { background: #f9fafb; border-radius: 6px; padding: 8px 12px; }
.info-cell label { font-size: 11px; color: #6b7280; display: block; margin-bottom: 2px; }
.info-cell span { font-size: 13px; font-weight: 500; }
.athletes-row { display: flex; gap: 6px; flex-wrap: wrap; flex-shrink: 0; }
.athlete-chip { display: flex; align-items: center; gap: 5px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 20px; padding: 3px 10px; font-size: 12px; }
.mini-av { width: 18px; height: 18px; border-radius: 50%; background: #C0DD97; display: flex; align-items: center; justify-content: center; font-size: 9px; font-weight: 500; color: #27500A; }
.tabs { display: flex; border-bottom: 1px solid #e5e7eb; flex-shrink: 0; }
.tab { padding: 8px 14px; font-size: 13px; cursor: pointer; color: #6b7280; border-bottom: 2px solid transparent; margin-bottom: -1px; }
.tab.active { color: #534AB7; border-bottom-color: #7F77DD; font-weight: 500; }
.semaines-tabs { display: flex; gap: 4px; flex-wrap: wrap; padding: 8px 0; flex-shrink: 0; align-items: center; }
.semaine-tab { display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border: 1px solid #e5e7eb; border-radius: 6px; font-size: 12px; cursor: pointer; background: white; color: #6b7280; }
.semaine-tab:hover { border-color: #7F77DD; }
.semaine-tab.active { background: #EEEDFE; border-color: #7F77DD; color: #3C3489; font-weight: 500; }
.semaine-tab.semaine-add { background: transparent; border-style: dashed; color: #534AB7; }
.semaine-tab.semaine-add:hover { background: #f9fafb; }
.seance-block { border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; flex-shrink: 0; }
.seance-head { padding: 10px 14px; background: #f9fafb; display: flex; align-items: center; gap: 8px; border-bottom: 1px solid #e5e7eb; font-size: 13px; font-weight: 500; }
.seance-body { padding: 10px 14px; display: flex; flex-direction: column; gap: 10px; }
.exo-block { display: flex; flex-direction: column; gap: 6px; padding: 8px 0; border-bottom: 1px solid #f3f4f6; }
.exo-block:last-child { border-bottom: none; }
.exo-header { display: flex; align-items: center; gap: 8px; }
.exo-num { width: 20px; height: 20px; border-radius: 4px; background: #EEEDFE; color: #534AB7; font-size: 11px; font-weight: 500; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.exo-name { font-size: 13px; font-weight: 500; }
.serie-chips { display: flex; gap: 4px; flex-wrap: wrap; margin-top: 2px; padding-left: 28px; }
.chip { font-size: 11px; background: #f3f4f6; border: 1px solid #e5e7eb; border-radius: 4px; padding: 2px 6px; color: #6b7280; }
.series-table { display: flex; flex-direction: column; gap: 4px; padding-left: 28px; }
.series-header { display: grid; grid-template-columns: 24px repeat(5, 1fr) 28px; gap: 6px; font-size: 11px; color: #6b7280; font-weight: 500; padding: 0 2px; }
.serie-row-edit { display: grid; grid-template-columns: 24px repeat(5, 1fr) 28px; gap: 6px; align-items: center; }
.serie-row-edit input { padding: 5px 8px; font-size: 12px; border: 1px solid #e5e7eb; border-radius: 6px; width: 100%; }
.serie-row-edit input:focus { outline: none; border-color: #7F77DD; }
.serie-num { font-size: 12px; color: #9ca3af; text-align: center; }
.add-exercice-form { display: flex; gap: 8px; align-items: center; padding-top: 8px; border-top: 1px dashed #e5e7eb; margin-top: 6px; }
.add-seance-form { display: flex; gap: 8px; align-items: center; padding: 12px 16px; background: #f9fafb; border: 1px dashed #e5e7eb; border-radius: 8px; flex-shrink: 0; }
.input-sm { width: 70px; flex-shrink: 0; padding: 6px 10px; border: 1px solid #e5e7eb; border-radius: 6px; font-size: 13px; }
.input-flex { flex: 1; min-width: 0; padding: 6px 10px; border: 1px solid #e5e7eb; border-radius: 6px; font-size: 13px; }
.add-seance-form select { padding: 6px 10px; border: 1px solid #e5e7eb; border-radius: 6px; font-size: 13px; }
.superset-label-row { display: flex; align-items: center; gap: 6px; margin: 4px 0 2px; }
.superset-label { font-size: 10px; color: #534AB7; background: #EEEDFE; padding: 1px 6px; border-radius: 10px; font-weight: 500; }
.superset-indent { padding-left: 12px; border-left: 2px solid #AFA9EC; margin-left: 10px; }
.empty { color: #9ca3af; text-align: center; padding: 20px; font-size: 13px; }
.empty-seance { color: #9ca3af; font-size: 12px; padding: 8px 0; }
.athletes-page { flex: 1; padding: 20px 24px; display: flex; flex-direction: column; gap: 8px; overflow-y: auto; }
.athlete-row { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border: 1px solid #e5e7eb; border-radius: 8px; background: #f9fafb; }
.athlete-row.found { border-color: #7F77DD; background: #EEEDFE; }
.mini-av-lg { width: 32px; height: 32px; border-radius: 50%; background: #C0DD97; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600; color: #27500A; flex-shrink: 0; }
.athlete-info { flex: 1; }
.athlete-nom { font-size: 13px; font-weight: 500; }
.athlete-email { font-size: 11px; color: #6b7280; }
.add-athlete-row { display: flex; gap: 8px; margin-top: 8px; }
.add-athlete-row input { padding: 7px 10px; border: 1px solid #e5e7eb; border-radius: 6px; font-size: 13px; }
.error { font-size: 12px; color: #dc2626; }
.logs-athletes-list { display: flex; flex-direction: column; gap: 8px; }
.athlete-card { display: flex; align-items: center; gap: 12px; padding: 12px; border: 1px solid #e5e7eb; border-radius: 8px; cursor: pointer; background: white; }
.athlete-card:hover { border-color: #7F77DD; background: #f9fafb; }
.logs-detail { display: flex; flex-direction: column; gap: 12px; }
.logs-header { display: flex; flex-direction: column; gap: 12px; }
.logs-title { display: flex; align-items: center; gap: 12px; }
.session-block { border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; flex-shrink: 0; }
.session-head { padding: 10px 14px; background: #f9fafb; display: flex; align-items: center; gap: 8px; border-bottom: 1px solid #e5e7eb; font-size: 13px; font-weight: 500; }
.session-nom { flex: 1; }
.session-date { font-size: 11px; color: #6b7280; text-transform: capitalize; }
.session-body { padding: 12px 14px; display: flex; flex-direction: column; gap: 14px; }
.exo-bloc { display: flex; flex-direction: column; gap: 6px; }
.comparatif-grid { display: flex; flex-direction: column; gap: 2px; }
.comparatif-header { display: grid; grid-template-columns: 32px 1.4fr 1.4fr 24px; gap: 8px; font-size: 11px; color: #6b7280; font-weight: 500; padding: 0 4px 4px; }
.comparatif-row { display: grid; grid-template-columns: 32px 1.4fr 1.4fr 24px; gap: 8px; align-items: center; padding: 6px 4px; border-radius: 6px; font-size: 12px; }
.comparatif-row.statut-done { background: #f0fdf4; }
.comparatif-row.statut-done .statut-icon { color: #16a34a; }
.comparatif-row.statut-warn { background: #fffbeb; }
.comparatif-row.statut-warn .statut-icon { color: #d97706; }
.comparatif-row.statut-skip { background: #fef2f2; opacity: 0.8; }
.comparatif-row.statut-skip .statut-icon { color: #dc2626; }
.prescrit-cell { color: #6b7280; }
.realise-cell { font-weight: 500; }
.non-fait { color: #dc2626; font-style: italic; }
.statut-icon { display: flex; justify-content: center; }
</style>