<template>
  <div class="modal-overlay" @click.self="$emit('fermer')">
    <div class="modal">
      <div class="modal-header">
        <h3>Assigner un athlète</h3>
        <button class="modal-close" @click="$emit('fermer')"><i class="ti ti-x"></i></button>
      </div>

      <div class="modal-body">
        <!-- Athlètes déjà assignés -->
        <div class="bloc">
          <div class="section-title">Déjà assignés</div>
          <div class="athletes-list" v-if="athletesAssignes.length > 0">
            <div class="athlete-row" v-for="a in athletesAssignes" :key="a.id">
              <div class="mini-av">{{ initiales(a.nom) }}</div>
              <div class="athlete-txt">
                <span class="athlete-nom">{{ a.nom }}</span>
                <span class="athlete-email">{{ a.email }}</span>
              </div>
              <button class="btn btn-sm btn-danger" @click="retirer(a)">Retirer</button>
            </div>
          </div>
          <div class="empty-inline" v-else>Aucun athlète assigné</div>
        </div>

        <!-- Athlètes du cercle non assignés -->
        <div class="bloc">
          <div class="section-title">Mon cercle</div>
          <div class="groupe-filtre-chips" v-if="groupes.length > 0">
            <button class="chip-filtre" :class="{ active: filtreGroupeId === 'tous' }" @click="filtreGroupeId = 'tous'">Tous</button>
            <button
              v-for="g in groupes"
              :key="g.id"
              class="chip-filtre"
              :class="{ active: filtreGroupeId === g.id }"
              @click="filtreGroupeId = filtreGroupeId === g.id ? 'tous' : g.id"
            >
              <span class="groupe-dot" :style="{ background: g.couleur || 'var(--color-primary)' }"></span>
              {{ g.nom }}
            </button>
          </div>
          <div class="athletes-list" v-if="athletesDisponibles.length > 0">
            <div class="athlete-row" v-for="a in athletesDisponibles" :key="a.id">
              <div class="mini-av">{{ initiales(a.nom) }}</div>
              <div class="athlete-txt">
                <span class="athlete-nom">{{ a.nom }}</span>
                <span class="athlete-email">{{ a.email }}</span>
              </div>
              <button class="btn btn-sm btn-primary" @click="assigner(a)">Assigner</button>
            </div>
          </div>
          <div class="empty-inline" v-else>Tous vos athlètes sont déjà assignés</div>
        </div>

        <!-- Assigner à un groupe entier -->
        <div class="bloc" v-if="groupes.length > 0">
          <div class="section-title">Assigner à un groupe entier</div>
          <div class="groupe-assign-row">
            <select v-model="groupeAssignId" class="select-groupe">
              <option :value="null" disabled>Choisir un groupe</option>
              <option v-for="g in groupes" :key="g.id" :value="g.id">{{ g.nom }} ({{ g.athletes.length }})</option>
            </select>
          </div>
          <div class="recap-groupe" v-if="groupeAssignChoisi">
            <p v-if="groupeAssignChoisi.athletes.length === 0" class="empty-inline">Ce groupe ne contient aucun athlète.</p>
            <template v-else>
              <p>Assigner <strong>{{ programme.nom }}</strong> aux {{ groupeAssignChoisi.athletes.length }} athlète{{ groupeAssignChoisi.athletes.length > 1 ? 's' : '' }} du groupe <strong>{{ groupeAssignChoisi.nom }}</strong> ?</p>
              <ul class="recap-liste">
                <li v-for="a in groupeAssignChoisi.athletes" :key="a.id">{{ a.nom }}</li>
              </ul>
              <button class="btn btn-sm btn-primary" @click="assignerGroupe">Confirmer l'assignation</button>
            </template>
          </div>
        </div>

        <!-- Ajouter un nouvel athlète au cercle -->
        <div class="bloc">
          <div class="section-title">Ajouter au cercle</div>
          <div class="search-row">
            <input v-model="searchEmail" placeholder="Email de l'athlète" type="email" />
            <button class="btn" @click="rechercherAthlète" :disabled="!searchEmail">Rechercher</button>
          </div>
          <div v-if="athleteTrouve" class="athlete-row found">
            <div class="mini-av">{{ initiales(athleteTrouve.nom) }}</div>
            <div class="athlete-txt">
              <span class="athlete-nom">{{ athleteTrouve.nom }}</span>
              <span class="athlete-email">{{ athleteTrouve.email }}</span>
            </div>
            <button class="btn btn-sm btn-primary" @click="ajouterAuCercle">+ Cercle</button>
          </div>
          <div v-if="searchError" class="error">{{ searchError }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed } from 'vue'
import { useApi } from '../../services/api'

export default {
  emits: ['fermer', 'modifie'],
  props: {
    programme: { type: Object, required: true },
    monCercle: { type: Array, default: () => [] },
    groupes: { type: Array, default: () => [] }
  },
  setup(props, { emit }) {
    const api = useApi()
    const searchEmail = ref('')
    const athleteTrouve = ref(null)
    const searchError = ref('')
    const filtreGroupeId = ref('tous')
    const groupeAssignId = ref(null)

    const athletesAssignes = ref([...props.programme.athletes])

    const athletesDisponibles = computed(() =>
      props.monCercle.filter(a => {
        if (athletesAssignes.value.find(x => x.id === a.id)) return false
        if (filtreGroupeId.value === 'tous') return true
        const groupe = props.groupes.find(g => g.id === filtreGroupeId.value)
        return !!groupe?.athletes.find(x => x.id === a.id)
      })
    )

    const groupeAssignChoisi = computed(() => props.groupes.find(g => g.id === groupeAssignId.value) || null)

    const assignerGroupe = async () => {
      if (!groupeAssignChoisi.value) return
      const data = await api.post(`/programmes/${props.programme.id}/assigner-groupe/${groupeAssignChoisi.value.id}`)
      athletesAssignes.value = data.athletes
      groupeAssignId.value = null
      emit('modifie')
    }

    const initiales = (nom) => nom.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

    const assigner = async (athlete) => {
      await api.post(`/programmes/${props.programme.id}/assigner/${athlete.id}`)
      athletesAssignes.value.push(athlete)
      emit('modifie')
    }

    const retirer = async (athlete) => {
      await api.del(`/programmes/${props.programme.id}/retirer/${athlete.id}`)
      athletesAssignes.value = athletesAssignes.value.filter(a => a.id !== athlete.id)
      emit('modifie')
    }

    const rechercherAthlète = async () => {
      searchError.value = ''
      athleteTrouve.value = null
      try {
        const found = await api.get(`/users/recherche?email=${encodeURIComponent(searchEmail.value)}`)
        if (found.detail) { searchError.value = found.detail; return }
        if (props.monCercle.find(a => a.id === found.id)) { searchError.value = 'Déjà dans votre cercle'; return }
        athleteTrouve.value = found
      } catch {
        searchError.value = 'Athlète introuvable'
      }
    }

    const ajouterAuCercle = async () => {
      await api.post(`/users/mes-athletes/${athleteTrouve.value.id}`)
      emit('modifie')
      athleteTrouve.value = null
      searchEmail.value = ''
    }

    return {
      searchEmail, athleteTrouve, searchError,
      athletesAssignes, athletesDisponibles,
      filtreGroupeId, groupeAssignId, groupeAssignChoisi, assignerGroupe,
      initiales, assigner, retirer, rechercherAthlète, ajouterAuCercle
    }
  }
}
</script>

<style scoped>
.bloc { display: flex; flex-direction: column; gap: var(--spacing-sm); }
.athletes-list { display: flex; flex-direction: column; gap: 6px; }
.athlete-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-bg-secondary);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
}
.athlete-row.found { border-color: var(--color-primary); background: var(--color-primary-light); }
.mini-av {
  width: var(--avatar-md);
  height: var(--avatar-md);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--font-size-xs);
  font-weight: 600;
  flex-shrink: 0;
  background: var(--color-avatar-athlete-bg);
  color: var(--color-avatar-athlete-text);
}
.athlete-txt { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.athlete-nom { font-size: var(--font-size-sm); font-weight: 600; }
.athlete-email {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.search-row { display: flex; gap: var(--spacing-sm); }
.search-row input {
  flex: 1;
  min-width: 0;
  min-height: var(--tap-min);
  padding: 0 var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--font-size-base);
  background: var(--color-bg);
}
.search-row input:focus { outline: none; border-color: var(--color-primary); }
.empty-inline { font-size: var(--font-size-sm); color: var(--color-text-muted); padding: var(--spacing-sm) 0; }

.groupe-filtre-chips { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: var(--spacing-xs); }
.chip-filtre {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 32px;
  padding: 0 var(--spacing-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  background: var(--color-bg);
  color: var(--color-text-secondary);
  cursor: pointer;
}
.chip-filtre:hover { border-color: var(--color-primary); }
.chip-filtre.active { background: var(--color-primary-light); border-color: var(--color-primary); color: var(--color-primary-text); font-weight: 600; }
.groupe-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }

.groupe-assign-row { display: flex; }
.select-groupe {
  flex: 1;
  min-height: var(--tap-min);
  padding: 0 var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--font-size-base);
  background: var(--color-bg);
}
.recap-groupe {
  padding: var(--spacing-md);
  background: var(--color-primary-light);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}
.recap-groupe p { margin: 0; color: var(--color-primary-text); }
.recap-liste { margin: 0; padding-left: var(--spacing-lg); max-height: 120px; overflow-y: auto; }
.recap-liste li { font-size: var(--font-size-sm); }
</style>
