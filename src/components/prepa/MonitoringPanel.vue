<template>
  <div class="monitoring-panel">
    <!-- VUE LISTE -->
    <template v-if="!athleteDetail">
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
      <div v-else-if="resumesFiltres.length === 0" class="empty">Aucun athlète pour ce filtre.</div>

      <div class="athlete-monitoring-list">
        <button class="athlete-monitoring-card" v-for="r in resumesFiltres" :key="r.athlete_id" @click="ouvrirDetail(r.athlete_id)">
          <div class="amc-head">
            <div class="mini-av-lg">{{ initiales(r.nom) }}</div>
            <div class="amc-info">
              <div class="amc-nom">
                {{ r.nom }}
                <span class="badge badge-gray org-badge" v-if="estSuperPrepa">{{ r.organisation?.nom || 'Indépendant' }}</span>
              </div>
              <div class="amc-meta">
                <span>Charge semaine : <strong>{{ Math.round(r.charge_semaine) }}</strong></span>
                <i class="ti tendance-icon" :class="iconeTendance(r.tendance)"></i>
                <span class="wellness-statut" :class="{ ok: r.wellness_repondu_aujourdhui }">
                  <i class="ti" :class="r.wellness_repondu_aujourdhui ? 'ti-circle-check' : 'ti-circle-dashed'"></i>
                  wellness
                </span>
              </div>
            </div>
            <span class="acwr-badge" :class="'zone-' + (r.acwr.zone || 'insuffisant')">
              {{ r.acwr.valeur !== null ? r.acwr.valeur.toFixed(2) : '—' }}
            </span>
          </div>
          <div class="amc-signaux" v-if="r.signaux.length > 0">
            <span class="signal-badge" v-for="(s, i) in r.signaux" :key="i">
              <i class="ti ti-alert-triangle"></i> {{ s }}
            </span>
          </div>
        </button>
      </div>
    </template>

    <!-- VUE DÉTAIL -->
    <template v-else>
      <button class="btn btn-sm retour-detail" @click="athleteDetail = null">
        <i class="ti ti-arrow-left"></i> Retour
      </button>

      <div v-if="loadingDetail" class="empty">Chargement...</div>

      <template v-else-if="detail">
        <div class="detail-header">
          <div class="mini-av-lg">{{ initiales(detail.nom) }}</div>
          <h3>{{ detail.nom }}</h3>
        </div>

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
    </template>
  </div>
</template>

<script>
import { ref, computed, watch, onMounted } from 'vue'
import { useApi } from '../../services/api'
import { useAuthStore } from '../../stores/auth'
import CourbeProgression from '../athlete/CourbeProgression.vue'
import GraphiqueDouble from '../monitoring/GraphiqueDouble.vue'
import GraphiqueAcwrZones from '../monitoring/GraphiqueAcwrZones.vue'
import GraphiqueBarres from '../monitoring/GraphiqueBarres.vue'

export default {
  components: { CourbeProgression, GraphiqueDouble, GraphiqueAcwrZones, GraphiqueBarres },
  props: {
    monCercle: { type: Array, default: () => [] },
    groupes: { type: Array, default: () => [] },
    actif: { type: Boolean, default: false }
  },
  setup(props) {
    const api = useApi()
    const authStore = useAuthStore()
    const estSuperPrepa = computed(() => authStore.role === 'super_prepa')

    const resumes = ref([])
    const loading = ref(false)
    const rechercheNom = ref('')
    const groupeFiltre = ref('tous')
    const organisationFiltre = ref('toutes')

    const athleteDetail = ref(null)
    const detail = ref(null)
    const loadingDetail = ref(false)

    const groupesDe = (athleteId) => props.groupes.filter(g => g.athletes.find(a => a.id === athleteId))

    const organisationsCercle = computed(() => {
      const map = {}
      props.monCercle.forEach(a => { if (a.organisation) map[a.organisation.id] = a.organisation })
      return Object.values(map).sort((a, b) => a.nom.localeCompare(b.nom))
    })

    const resumesFiltres = computed(() => {
      return resumes.value.filter(r => {
        if (rechercheNom.value && !r.nom.toLowerCase().includes(rechercheNom.value.toLowerCase())) return false
        if (groupeFiltre.value !== 'tous' && !groupesDe(r.athlete_id).find(g => g.id === groupeFiltre.value)) return false
        const athlete = props.monCercle.find(a => a.id === r.athlete_id)
        if (organisationFiltre.value === 'independant' && athlete?.organisation_id) return false
        if (organisationFiltre.value !== 'toutes' && organisationFiltre.value !== 'independant' && athlete?.organisation_id !== organisationFiltre.value) return false
        return true
      })
    })

    const fetchResumes = async () => {
      loading.value = true
      resumes.value = await api.get('/monitoring/cercle')
      loading.value = false
    }

    const ouvrirDetail = async (athleteId) => {
      athleteDetail.value = athleteId
      loadingDetail.value = true
      detail.value = await api.get(`/monitoring/athlete/${athleteId}`)
      loadingDetail.value = false
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

    const iconeTendance = (t) => ({ hausse: 'ti-trending-up', baisse: 'ti-trending-down', stable: 'ti-minus' }[t] || 'ti-minus')
    const initiales = (nom) => nom.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    const formatDateCourt = (d) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })

    watch(() => props.actif, (actif) => { if (actif && resumes.value.length === 0 && !loading.value) fetchResumes() })
    onMounted(() => { if (props.actif) fetchResumes() })

    return {
      resumes, loading, rechercheNom, groupeFiltre, organisationFiltre, organisationsCercle, resumesFiltres,
      estSuperPrepa, athleteDetail, detail, loadingDetail, ouvrirDetail,
      pointsAcwr, pointsAigueChronique, pointsMonotonie, pointsContrainte, pointsHooper,
      dernierWellness, barresDernierWellness,
      iconeTendance, initiales, formatDateCourt
    }
  }
}
</script>

<style scoped>
.monitoring-panel { display: flex; flex-direction: column; gap: var(--spacing-lg); padding: var(--spacing-xl) var(--spacing-2xl); overflow-y: auto; flex: 1; }

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
  background: var(--color-bg); cursor: pointer; text-align: left; width: 100%;
  font-family: inherit;
}
.athlete-monitoring-card:hover { border-color: var(--color-primary); background: var(--color-bg-secondary); }
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

.retour-detail { align-self: flex-start; }
.detail-header { display: flex; align-items: center; gap: var(--spacing-md); }
.detail-header h3 { margin: 0; font-size: var(--font-size-xl); font-weight: 700; }
.detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-lg); }
.stat-card {
  background: var(--color-bg); border: 1px solid var(--color-border); border-radius: var(--radius-lg);
  padding: var(--spacing-lg); display: flex; flex-direction: column; gap: var(--spacing-sm);
}
.stat-card-titre { font-size: var(--font-size-sm); font-weight: 700; }
.stat-card-titre-sm { font-size: var(--font-size-xs); color: var(--color-text-secondary); font-weight: 600; margin-top: var(--spacing-xs); }

@media (max-width: 768px) {
  .monitoring-panel { padding: var(--spacing-md) var(--spacing-lg); }
  .detail-grid { grid-template-columns: 1fr; }
}
</style>
