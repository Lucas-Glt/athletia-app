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

      <div class="resume-cercle-grid" v-if="!loading && resumes.length > 0">
        <div class="resume-tile">
          <div class="resume-valeur">{{ resumeCercle.total }}</div>
          <div class="resume-label">Athlètes suivis</div>
        </div>
        <div class="resume-tile resume-tile-optimale">
          <div class="resume-valeur">{{ resumeCercle.zones.optimale }}</div>
          <div class="resume-label">Zone optimale</div>
        </div>
        <div class="resume-tile resume-tile-vigilance">
          <div class="resume-valeur">{{ resumeCercle.zones.vigilance }}</div>
          <div class="resume-label">Vigilance</div>
        </div>
        <div class="resume-tile resume-tile-surcharge">
          <div class="resume-valeur">{{ resumeCercle.zones.surcharge }}</div>
          <div class="resume-label">Surcharge</div>
        </div>
        <div class="resume-tile" :class="{ 'resume-tile-vigilance': resumeCercle.signalants > 0 }">
          <div class="resume-valeur">{{ resumeCercle.signalants }}</div>
          <div class="resume-label">Signaux actifs</div>
        </div>
        <div class="resume-tile">
          <div class="resume-valeur">{{ resumeCercle.wellnessRepondu }}/{{ resumeCercle.total }}</div>
          <div class="resume-label">Wellness aujourd'hui</div>
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
        <div class="athlete-monitoring-card" v-for="a in athletesFiltres" :key="a.id">
          <button class="amc-clic" @click="ouvrirFiche(a)">
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
            <div class="amc-signaux" v-if="a.resume && a.resume.signaux.length > 0">
              <span class="signal-badge" v-for="(s, i) in a.resume.signaux" :key="i">
                <i class="ti ti-alert-triangle"></i> {{ s }}
              </span>
            </div>
          </button>
          <div class="amc-actions">
            <button class="btn-icon-tiny" title="Voir/modifier ses groupes" @click="ouvrirGestionGroupes(a)"><i class="ti ti-tags"></i></button>
            <button class="btn btn-sm btn-danger" @click="retirerDuCercle(a)">Retirer</button>
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
            <h4>Signaux</h4>
            <p>Générés automatiquement, sans action du prépa : zone de vigilance ou surcharge sur l'ACWR, ou wellness dégradé 3 jours de suite. Un athlète sans signal n'a pas forcément 0 problème — surtout si son ACWR est encore indisponible (moins de 28 jours de données).</p>
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
    const aideOuverte = ref(false)

    // On ne garde que l'id sélectionné : l'objet athlète est relu depuis
    // monCercle à chaque rendu, donc toujours à jour après un fetchMonCercle
    // déclenché par onModifie (cf. DashboardPrepa.vue).
    const athleteSelectionneId = ref(null)
    const athleteSelectionne = computed(() => props.monCercle.find(a => a.id === athleteSelectionneId.value) || null)

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

    const athletesFiltres = computed(() => {
      return athletesEnrichis.value.filter(a => {
        if (rechercheNom.value && !a.nom.toLowerCase().includes(rechercheNom.value.toLowerCase())) return false
        if (groupeFiltre.value !== 'tous' && !groupesDe(a.id).find(g => g.id === groupeFiltre.value)) return false
        if (organisationFiltre.value === 'independant' && a.organisation_id) return false
        if (organisationFiltre.value !== 'toutes' && organisationFiltre.value !== 'independant' && a.organisation_id !== organisationFiltre.value) return false
        return true
      })
    })

    // Vue d'ensemble du cercle entier (indépendante des filtres de la liste,
    // pour garder un instantané stable de tout le groupe).
    const resumeCercle = computed(() => {
      const zones = { optimale: 0, vigilance: 0, surcharge: 0, sous_charge: 0 }
      let signalants = 0
      let wellnessRepondu = 0
      resumes.value.forEach(r => {
        if (r.acwr.zone && zones[r.acwr.zone] !== undefined) zones[r.acwr.zone]++
        if (r.signaux.length > 0) signalants++
        if (r.wellness_repondu_aujourdhui) wellnessRepondu++
      })
      return { total: resumes.value.length, zones, signalants, wellnessRepondu }
    })

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

    watch(() => props.actif, (actif) => { if (actif && resumes.value.length === 0 && !loading.value) fetchResumes() })
    onMounted(() => { if (props.actif) fetchResumes() })

    return {
      resumes, loading, rechercheNom, groupeFiltre, organisationFiltre, organisationsCercle, athletesFiltres,
      estSuperPrepa, athleteSelectionneId, athleteSelectionne, ouvrirFiche, aideOuverte, resumeCercle,
      modalGroupes, athleteFocusGroupes, ouvrirGestionGroupes, groupesDe,
      searchEmail, athleteTrouve, searchError, rechercherAthlète, ajouterAuCercle, retirerDuCercle,
      onModifie, iconeTendance, initiales
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

.resume-cercle-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)); gap: var(--spacing-sm); }
.resume-tile {
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px;
  padding: var(--spacing-md) var(--spacing-sm);
  border: 1px solid var(--color-border); border-radius: var(--radius-lg);
  background: var(--color-bg); text-align: center;
}
.resume-valeur { font-size: var(--font-size-xl); font-weight: 700; }
.resume-label { font-size: var(--font-size-xs); color: var(--color-text-secondary); }
.resume-tile-optimale { border-color: var(--color-valid-text-strong); background: var(--color-valid-bg); }
.resume-tile-optimale .resume-valeur { color: var(--color-valid-text-strong); }
.resume-tile-vigilance { border-color: var(--color-warning-text-strong); background: var(--color-warning-bg); }
.resume-tile-vigilance .resume-valeur { color: var(--color-warning-text-strong); }
.resume-tile-surcharge { border-color: var(--color-danger-text); background: var(--color-danger-bg); }
.resume-tile-surcharge .resume-valeur { color: var(--color-danger-text); }

.modal-large { max-width: 640px; }
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
}
.athlete-monitoring-card:hover { border-color: var(--color-primary); background: var(--color-bg-secondary); }
.amc-clic {
  display: flex; flex-direction: column; gap: var(--spacing-sm);
  background: none; border: none; padding: 0; margin: 0;
  text-align: left; cursor: pointer; width: 100%; font-family: inherit;
}
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
  .resume-cercle-grid { grid-template-columns: repeat(auto-fit, minmax(90px, 1fr)); }
}
</style>
