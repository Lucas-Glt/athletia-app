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
</style>
