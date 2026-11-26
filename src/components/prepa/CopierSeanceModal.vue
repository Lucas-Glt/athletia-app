<template>
  <div class="modal-overlay" @click.self="$emit('fermer')">
    <div class="modal modal-large" role="dialog" aria-labelledby="copier-titre">
      <div class="modal-header">
        <h3 id="copier-titre">Copier « {{ seance.nom }} »</h3>
        <button class="modal-close" aria-label="Fermer" @click="$emit('fermer')"><i class="ti ti-x"></i></button>
      </div>

      <!-- Copie faite : on peut aller la voir, ou copier ailleurs -->
      <div v-if="copiee" class="modal-body copie-faite">
        <i class="ti ti-circle-check copie-icone"></i>
        <p>
          Séance copiée dans <strong>{{ copiee.programme.nom }}</strong>, semaine {{ copiee.seance.semaine }}.
          <span class="copie-note">C'est une copie indépendante : la modifier ne touche pas l'originale.</span>
        </p>
        <div class="copie-actions">
          <button class="btn btn-sm" @click="recommencer"><i class="ti ti-copy"></i> Copier ailleurs</button>
          <button v-if="copiee.programme.id !== programmeCourantId" class="btn btn-sm btn-primary" @click="$emit('ouvrir', copiee.programme)">
            Ouvrir ce programme <i class="ti ti-arrow-right"></i>
          </button>
          <button v-else class="btn btn-sm btn-primary" @click="$emit('fermer')">Terminé</button>
        </div>
      </div>

      <div v-else class="modal-body">
        <p class="copie-intro">
          {{ nbExercices }} exercice{{ nbExercices > 1 ? 's' : '' }} et leurs séries, dans le programme de ton choix.
        </p>

        <input
          v-if="programmes.length > 5"
          v-model="recherche"
          class="input-recherche"
          placeholder="Rechercher un programme"
        />
        <div v-if="programmesFiltres.length === 0" class="empty">Aucun programme pour cette recherche.</div>

        <div class="prog-liste" role="radiogroup" aria-label="Programme de destination">
          <label
            v-for="p in programmesFiltres"
            :key="p.id"
            class="prog-choix"
            :class="{ choisi: cibleId === p.id }"
          >
            <input type="radio" name="programme-cible" :value="p.id" v-model="cibleId" />
            <span class="prog-choix-nom">{{ p.nom }}</span>
            <span v-if="p.id === programmeCourantId" class="badge badge-purple">ce programme</span>
            <span v-else-if="p.par_semaines" class="badge badge-gray" title="Créé dans l'Atelier">semaine par semaine</span>
          </label>
        </div>

        <div v-if="cibleId" class="semaine-choix">
          <label for="copier-semaine">Semaine</label>
          <div v-if="chargementSemaines" class="semaine-chargement">Chargement…</div>
          <select v-else id="copier-semaine" v-model.number="semaine">
            <option v-for="s in semainesCible" :key="s.numero" :value="s.numero">
              Semaine {{ s.numero }} · {{ s.nb }} séance{{ s.nb > 1 ? 's' : '' }}
            </option>
            <option :value="nouvelleSemaine">
              {{ semainesCible.length ? `Nouvelle semaine (${nouvelleSemaine})` : 'Semaine 1 (programme vide)' }}
            </option>
          </select>
        </div>

        <p v-if="erreur" class="copie-erreur" role="alert">{{ erreur }}</p>

        <div class="copie-actions">
          <button class="btn btn-sm" @click="$emit('fermer')">Annuler</button>
          <button class="btn btn-sm btn-primary" :disabled="occupe || !cibleId || chargementSemaines" @click="copier">
            <i class="ti ti-copy"></i> Copier
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch } from 'vue'
import { useApi } from '../../services/api'
import { useActionUnique } from '../../utils/actionUnique'

export default {
  emits: ['fermer', 'copiee', 'ouvrir'],
  props: {
    seance: { type: Object, required: true },
    // les programmes du prépa (GET /programmes/ ne renvoie que les siens)
    programmes: { type: Array, default: () => [] },
    programmeCourantId: { type: Number, default: null }
  },
  setup(props, { emit }) {
    const api = useApi()
    const { occupe, erreur, executer } = useActionUnique()
    const recherche = ref('')
    const cibleId = ref(null)
    const seancesCible = ref([])
    const chargementSemaines = ref(false)
    const semaine = ref(1)
    const copiee = ref(null)

    const nbExercices = computed(() => props.seance.exercices?.length || 0)

    // le programme ouvert en premier : dupliquer dans le même programme est
    // le cas le plus courant (variante d'une séance)
    const programmesFiltres = computed(() => {
      const q = recherche.value.trim().toLowerCase()
      return [...props.programmes]
        .filter(p => p.nom.toLowerCase().includes(q))
        .sort((a, b) => (b.id === props.programmeCourantId) - (a.id === props.programmeCourantId))
    })

    const semainesCible = computed(() => {
      const compte = {}
      seancesCible.value.forEach(s => { compte[s.semaine || 1] = (compte[s.semaine || 1] || 0) + 1 })
      return Object.keys(compte).map(Number).sort((a, b) => a - b).map(n => ({ numero: n, nb: compte[n] }))
    })
    const nouvelleSemaine = computed(() => Math.max(0, ...semainesCible.value.map(s => s.numero)) + 1)

    // Semaine proposée : celle de la séance si elle existe dans la cible
    // (même structure de programme), sinon la dernière.
    watch(cibleId, async (id) => {
      if (!id) return
      chargementSemaines.value = true
      erreur.value = ''
      try {
        seancesCible.value = await api.get(`/programmes/${id}/seances/`)
        const numeros = semainesCible.value.map(s => s.numero)
        const origine = props.seance.semaine || 1
        semaine.value = numeros.includes(origine) ? origine : (numeros[numeros.length - 1] || 1)
      } catch (e) {
        erreur.value = e.message || 'Impossible de lire ce programme'
      } finally {
        chargementSemaines.value = false
      }
    })

    const copier = () => executer(async () => {
      const programme = props.programmes.find(p => p.id === cibleId.value)
      const resultat = await api.post(`/seances/${props.seance.id}/copier`, {
        programme_id: cibleId.value,
        semaine: semaine.value
      })
      copiee.value = { programme, seance: resultat }
      emit('copiee', { programme, seance: resultat })
    })

    const recommencer = () => {
      copiee.value = null
      cibleId.value = null
      seancesCible.value = []
    }

    return {
      recherche, cibleId, chargementSemaines, semaine, copiee, nbExercices,
      programmesFiltres, semainesCible, nouvelleSemaine, copier, recommencer, occupe, erreur
    }
  }
}
</script>

<style scoped>
.modal-large { max-width: 520px; }
.modal-body { display: flex; flex-direction: column; gap: var(--spacing-sm); }
.copie-intro { margin: 0; font-size: var(--font-size-sm); color: var(--color-text-secondary); }
.input-recherche {
  min-height: var(--tap-min);
  padding: 0 var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--font-size-base);
  background: var(--color-bg);
}
.prog-liste { display: flex; flex-direction: column; gap: var(--spacing-xs); max-height: 46vh; overflow-y: auto; }
.prog-choix {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  min-height: var(--tap-min);
  padding: var(--spacing-xs) var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg-secondary);
  cursor: pointer;
}
.prog-choix.choisi { border-color: var(--color-primary); background: var(--color-primary-light); }
.prog-choix input { accent-color: var(--color-primary); }
.prog-choix-nom { flex: 1; min-width: 0; font-size: var(--font-size-sm); font-weight: 600; }
.semaine-choix { display: flex; align-items: center; gap: var(--spacing-sm); }
.semaine-choix label { font-size: var(--font-size-sm); font-weight: 600; }
.semaine-choix select {
  flex: 1;
  min-height: var(--tap-min);
  padding: 0 var(--spacing-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg);
}
.semaine-chargement { font-size: var(--font-size-sm); color: var(--color-text-muted); }
.copie-erreur { margin: 0; font-size: var(--font-size-sm); color: var(--color-danger, #b91c1c); }
.copie-actions { display: flex; justify-content: flex-end; gap: var(--spacing-sm); flex-wrap: wrap; margin-top: var(--spacing-xs); }
.copie-faite { align-items: center; text-align: center; }
.copie-faite p { margin: 0; }
.copie-icone { font-size: 40px; color: var(--color-valid-text, #16a34a); }
.copie-note { display: block; margin-top: var(--spacing-xs); font-size: var(--font-size-xs); color: var(--color-text-muted); }
.copie-faite .copie-actions { justify-content: center; }
</style>
