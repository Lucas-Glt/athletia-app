<template>
  <div class="modal-overlay" @click.self="$emit('fermer')">
    <div class="modal" :class="{ 'modal-large': !athleteFocus }">
      <div class="modal-header">
        <h3 v-if="athleteFocus">Groupes de {{ athleteFocus.nom }}</h3>
        <h3 v-else>Mes groupes</h3>
        <button class="modal-close" @click="$emit('fermer')"><i class="ti ti-x"></i></button>
      </div>

      <!-- MODE FICHE ATHLÈTE : voir/cocher ses groupes -->
      <div class="modal-body" v-if="athleteFocus">
        <div v-if="groupes.length === 0" class="empty-inline">Aucun groupe créé pour l'instant.</div>
        <div class="groupes-check-list">
          <label class="groupe-check-row" v-for="g in groupes" :key="g.id">
            <input type="checkbox" :checked="estMembre(g, athleteFocus)" @change="toggleMembre(g, athleteFocus)" />
            <span class="groupe-dot" :style="{ background: g.couleur || 'var(--color-primary)' }"></span>
            <span class="groupe-nom">{{ g.nom }}</span>
          </label>
        </div>
      </div>

      <!-- MODE GESTION DES GROUPES -->
      <div class="modal-body gestion-body" v-else>
        <div class="bloc groupes-colonne">
          <div class="section-title">Mes groupes</div>
          <div v-if="groupes.length === 0" class="empty-inline">Aucun groupe pour l'instant.</div>
          <div class="groupes-list">
            <div
              class="groupe-item"
              v-for="g in groupes"
              :key="g.id"
              :class="{ active: groupeActifId === g.id }"
              @click="ouvrirGroupe(g)"
            >
              <span class="groupe-dot" :style="{ background: g.couleur || 'var(--color-primary)' }"></span>
              <span class="groupe-nom">{{ g.nom }}</span>
              <span class="groupe-count">{{ g.athletes.length }}</span>
              <button class="btn-icon-tiny" @click.stop="commencerRenommage(g)"><i class="ti ti-edit"></i></button>
              <button class="btn-icon-tiny btn-icon-danger" @click.stop="supprimerGroupe(g)"><i class="ti ti-trash"></i></button>
            </div>
          </div>

          <div class="nouveau-groupe-form">
            <input v-model="nouveauNom" placeholder="Nom du groupe" class="input-flex" @keyup.enter="creerGroupe" />
            <div class="couleurs-row">
              <button
                v-for="c in palette"
                :key="c"
                class="couleur-swatch"
                :class="{ active: nouvelleCouleur === c }"
                :style="{ background: c }"
                @click="nouvelleCouleur = c"
              ></button>
            </div>
            <button class="btn btn-sm btn-primary" @click="creerGroupe" :disabled="!nouveauNom.trim()">
              <i class="ti ti-plus"></i> Créer
            </button>
          </div>
        </div>

        <div class="bloc membres-colonne" v-if="groupeActif">
          <div class="section-title">Membres · {{ groupeActif.nom }}</div>
          <div v-if="groupeActif.athletes.length === 0" class="empty-inline">Aucun athlète dans ce groupe.</div>
          <div class="athletes-list">
            <div class="athlete-row" v-for="a in groupeActif.athletes" :key="a.id">
              <div class="mini-av">{{ initiales(a.nom) }}</div>
              <div class="athlete-txt">
                <span class="athlete-nom">{{ a.nom }}</span>
                <span class="athlete-email">{{ a.email }}</span>
              </div>
              <button class="btn btn-sm btn-danger" @click="retirer(a)">Retirer</button>
            </div>
          </div>

          <div class="section-title">Ajouter des athlètes</div>
          <div v-if="disponibles.length === 0" class="empty-inline">Tout votre cercle est déjà dans ce groupe.</div>
          <div class="athletes-list" v-else>
            <label class="athlete-row selectable" v-for="a in disponibles" :key="a.id">
              <input type="checkbox" v-model="selection" :value="a.id" />
              <div class="mini-av">{{ initiales(a.nom) }}</div>
              <div class="athlete-txt">
                <span class="athlete-nom">{{ a.nom }}</span>
                <span class="athlete-email">{{ a.email }}</span>
              </div>
            </label>
          </div>
          <button
            v-if="disponibles.length > 0"
            class="btn btn-sm btn-primary btn-ajouter-selection"
            :disabled="selection.length === 0"
            @click="ajouterSelection"
          >
            <i class="ti ti-plus"></i> Ajouter la sélection ({{ selection.length }})
          </button>
        </div>
        <div class="bloc membres-colonne membres-vide" v-else>
          Sélectionnez un groupe pour gérer ses membres
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch } from 'vue'
import { useApi } from '../../services/api'

const PALETTE = ['#7F77DD', '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#EC4899']

export default {
  emits: ['fermer', 'modifie'],
  props: {
    groupes: { type: Array, default: () => [] },
    monCercle: { type: Array, default: () => [] },
    athleteFocus: { type: Object, default: null }
  },
  setup(props, { emit }) {
    const api = useApi()
    const groupeActifId = ref(null)
    const nouveauNom = ref('')
    const nouvelleCouleur = ref(PALETTE[0])
    const selection = ref([])

    const groupeActif = computed(() => props.groupes.find(g => g.id === groupeActifId.value) || null)

    const disponibles = computed(() => {
      if (!groupeActif.value) return []
      return props.monCercle.filter(a => !groupeActif.value.athletes.find(x => x.id === a.id))
    })

    watch(() => props.groupes, (nouveaux) => {
      if (groupeActifId.value && !nouveaux.find(g => g.id === groupeActifId.value)) {
        groupeActifId.value = null
      }
    })

    const initiales = (nom) => nom.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

    const ouvrirGroupe = (g) => {
      groupeActifId.value = g.id
      selection.value = []
    }

    const creerGroupe = async () => {
      if (!nouveauNom.value.trim()) return
      await api.post('/groupes/', { nom: nouveauNom.value.trim(), couleur: nouvelleCouleur.value })
      nouveauNom.value = ''
      emit('modifie')
    }

    const commencerRenommage = async (g) => {
      const nom = prompt('Renommer le groupe', g.nom)
      if (nom === null || !nom.trim()) return
      await api.patch(`/groupes/${g.id}`, { nom: nom.trim(), couleur: g.couleur })
      emit('modifie')
    }

    const supprimerGroupe = async (g) => {
      if (!confirm(`Supprimer le groupe "${g.nom}" ? Les athlètes et leurs programmes ne sont pas affectés.`)) return
      await api.del(`/groupes/${g.id}`)
      emit('modifie')
    }

    const retirer = async (athlete) => {
      await api.del(`/groupes/${groupeActifId.value}/athletes/${athlete.id}`)
      emit('modifie')
    }

    const ajouterSelection = async () => {
      const ids = [...selection.value]
      for (const id of ids) {
        await api.post(`/groupes/${groupeActifId.value}/athletes/${id}`)
      }
      selection.value = []
      emit('modifie')
    }

    const estMembre = (groupe, athlete) => !!groupe.athletes.find(a => a.id === athlete.id)

    const toggleMembre = async (groupe, athlete) => {
      if (estMembre(groupe, athlete)) {
        await api.del(`/groupes/${groupe.id}/athletes/${athlete.id}`)
      } else {
        await api.post(`/groupes/${groupe.id}/athletes/${athlete.id}`)
      }
      emit('modifie')
    }

    return {
      palette: PALETTE,
      groupeActifId, groupeActif, disponibles,
      nouveauNom, nouvelleCouleur, selection,
      initiales, ouvrirGroupe, creerGroupe, commencerRenommage, supprimerGroupe,
      retirer, ajouterSelection, estMembre, toggleMembre
    }
  }
}
</script>

<style scoped>
.modal-large { max-width: 720px; }
.gestion-body { display: flex; gap: var(--spacing-lg); flex-wrap: wrap; }
.bloc { display: flex; flex-direction: column; gap: var(--spacing-sm); }
.groupes-colonne { flex: 1; min-width: 220px; }
.membres-colonne { flex: 1.4; min-width: 260px; }
.membres-vide { align-items: center; justify-content: center; color: var(--color-text-muted); font-size: var(--font-size-sm); padding: var(--spacing-xl) 0; }

.groupes-list { display: flex; flex-direction: column; gap: 6px; }
.groupe-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
}
.groupe-item:hover { border-color: var(--color-primary); }
.groupe-item.active { border-color: var(--color-primary); background: var(--color-primary-light); }
.groupe-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
.groupe-nom { flex: 1; font-size: var(--font-size-sm); font-weight: 600; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.groupe-count {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  background: var(--color-bg-tertiary);
  padding: 2px 8px;
  border-radius: var(--radius-full);
  flex-shrink: 0;
}
.btn-icon-tiny {
  width: 28px;
  height: 28px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  border: none;
  cursor: pointer;
  background: transparent;
  color: var(--color-text-secondary);
  flex-shrink: 0;
}
.btn-icon-tiny:hover { background: var(--color-bg-tertiary); color: var(--color-text); }
.btn-icon-danger:hover { color: var(--color-danger-text); background: var(--color-danger-bg-soft); }

.nouveau-groupe-form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  padding: var(--spacing-md);
  border: 1px dashed var(--color-border-strong);
  border-radius: var(--radius-md);
}
.couleurs-row { display: flex; gap: 8px; }
.couleur-swatch {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  padding: 0;
}
.couleur-swatch.active { border-color: var(--color-text); }

.groupes-check-list { display: flex; flex-direction: column; gap: 6px; }
.groupe-check-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  min-height: var(--tap-min);
  padding: 0 var(--spacing-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
}
.groupe-check-row input { width: 18px; height: 18px; }

.athletes-list { display: flex; flex-direction: column; gap: 6px; max-height: 240px; overflow-y: auto; }
.athlete-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-bg-secondary);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
}
.athlete-row.selectable { cursor: pointer; }
.athlete-row.selectable input { width: 18px; height: 18px; flex-shrink: 0; }
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
.btn-ajouter-selection { align-self: flex-start; }
.empty-inline { font-size: var(--font-size-sm); color: var(--color-text-muted); padding: var(--spacing-sm) 0; }
.input-flex {
  min-height: var(--tap-min);
  padding: 0 var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--font-size-base);
  background: var(--color-bg);
}
.input-flex:focus { outline: none; border-color: var(--color-primary); }

@media (max-width: 600px) {
  .gestion-body { flex-direction: column; }
}
</style>
