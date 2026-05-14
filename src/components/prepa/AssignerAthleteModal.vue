<template>
  <div class="modal-overlay" @click.self="$emit('fermer')">
    <div class="modal">
      <div class="modal-header">
        <h3>Assigner un athlète</h3>
        <button class="btn-close" @click="$emit('fermer')"><i class="ti ti-x"></i></button>
      </div>

      <div class="modal-body">
        <!-- Athlètes déjà assignés -->
        <div class="section-title">Déjà assignés</div>
        <div class="athletes-list" v-if="athletesAssignes.length > 0">
          <div class="athlete-row" v-for="a in athletesAssignes" :key="a.id">
            <div class="mini-av athlete">{{ initiales(a.nom) }}</div>
            <span class="athlete-nom">{{ a.nom }}</span>
            <span class="athlete-email">{{ a.email }}</span>
            <button class="btn btn-sm btn-danger" @click="retirer(a)">Retirer</button>
          </div>
        </div>
        <div class="empty" v-else>Aucun athlète assigné</div>

        <!-- Athlètes du cercle non assignés -->
        <div class="section-title" style="margin-top: 16px">Mon cercle</div>
        <div class="athletes-list" v-if="athletesDisponibles.length > 0">
          <div class="athlete-row" v-for="a in athletesDisponibles" :key="a.id">
            <div class="mini-av athlete">{{ initiales(a.nom) }}</div>
            <span class="athlete-nom">{{ a.nom }}</span>
            <span class="athlete-email">{{ a.email }}</span>
            <button class="btn btn-sm btn-primary" @click="assigner(a)">Assigner</button>
          </div>
        </div>
        <div class="empty" v-else>Tous vos athlètes sont déjà assignés</div>

        <!-- Ajouter un nouvel athlète au cercle -->
        <div class="section-title" style="margin-top: 16px">Ajouter au cercle</div>
        <div class="search-row">
          <input v-model="searchEmail" placeholder="Email de l'athlète" type="email" />
          <button class="btn btn-sm" @click="rechercherAthlète" :disabled="!searchEmail">Rechercher</button>
        </div>
        <div v-if="athleteTrouve" class="athlete-row found">
          <div class="mini-av athlete">{{ initiales(athleteTrouve.nom) }}</div>
          <span class="athlete-nom">{{ athleteTrouve.nom }}</span>
          <span class="athlete-email">{{ athleteTrouve.email }}</span>
          <button class="btn btn-sm btn-primary" @click="ajouterAuCercle">+ Cercle</button>
        </div>
        <div v-if="searchError" class="error">{{ searchError }}</div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { useApi } from '../../services/api'

export default {
  emits: ['fermer', 'modifie'],
  props: {
    programme: { type: Object, required: true },
    monCercle: { type: Array, default: () => [] }
  },
  setup(props, { emit }) {
    const api = useApi()
    const searchEmail = ref('')
    const athleteTrouve = ref(null)
    const searchError = ref('')

    const athletesAssignes = ref([...props.programme.athletes])

    const athletesDisponibles = computed(() =>
      props.monCercle.filter(a => !athletesAssignes.value.find(x => x.id === a.id))
    )

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
      initiales, assigner, retirer, rechercherAthlète, ajouterAuCercle
    }
  }
}
</script>

<style scoped>
.modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.4);
  display: flex; align-items: center; justify-content: center; z-index: 100;
}
.modal {
  background: var(--color-bg, white); border-radius: 10px;
  width: 480px; max-height: 80vh; display: flex; flex-direction: column;
  box-shadow: 0 10px 30px rgba(0,0,0,0.15);
}
.modal-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 20px; border-bottom: 1px solid var(--color-border, #e5e7eb);
}
.modal-header h3 { font-size: 15px; font-weight: 500; }
.btn-close { background: none; border: none; cursor: pointer; font-size: 16px; color: var(--color-text-secondary, #6b7280); }
.modal-body { padding: 16px 20px; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; }
.section-title { font-size: 11px; font-weight: 500; color: var(--color-text-secondary, #6b7280); text-transform: uppercase; letter-spacing: 0.5px; }
.athletes-list { display: flex; flex-direction: column; gap: 6px; }
.athlete-row { display: flex; align-items: center; gap: 8px; padding: 8px; background: var(--color-bg-secondary, #f9fafb); border-radius: 6px; border: 1px solid var(--color-border, #e5e7eb); }
.athlete-row.found { border-color: #7F77DD; background: #EEEDFE; }
.mini-av { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 600; flex-shrink: 0; }
.mini-av.athlete { background: var(--color-avatar-athlete-bg, #C0DD97); color: var(--color-avatar-athlete-text, #27500A); }
.athlete-nom { font-size: 13px; font-weight: 500; flex: 1; }
.athlete-email { font-size: 11px; color: var(--color-text-secondary, #6b7280); }
.search-row { display: flex; gap: 8px; }
.search-row input { flex: 1; padding: 7px 12px; border: 1px solid var(--color-border, #e5e7eb); border-radius: 6px; font-size: 13px; }
.btn { display: inline-flex; align-items: center; gap: 4px; padding: 7px 14px; border-radius: 6px; border: 1px solid var(--color-border, #e5e7eb); font-size: 13px; cursor: pointer; background: transparent; color: #374151; }
.btn-sm { padding: 5px 10px; font-size: 12px; }
.btn-primary { background: #7F77DD; color: #EEEDFE; border-color: #534AB7; }
.btn-primary:hover { background: #534AB7; }
.btn-danger { background: #fee2e2; color: #dc2626; border-color: #fca5a5; }
.btn-danger:hover { background: #fecaca; }
.empty { font-size: 12px; color: var(--color-text-muted, #9ca3af); padding: 8px 0; }
.error { font-size: 12px; color: #dc2626; }
</style>