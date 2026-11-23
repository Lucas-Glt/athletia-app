<template>
  <div class="mot">
    <template v-if="seance.mot_prepa && !edition">
      <p class="mot-actuel"><i class="ti ti-message-2"></i><span>« {{ seance.mot_prepa }} »</span></p>
      <p class="mot-meta">
        <span :class="{ lu: seance.mot_prepa_vu }">
          <i class="ti" :class="seance.mot_prepa_vu ? 'ti-checks' : 'ti-clock'"></i>
          {{ seance.mot_prepa_vu ? `Lu par ${prenom}` : 'Pas encore lu' }}
        </span>
        <template v-if="seance.peut_ecrire_mot">
          <button type="button" class="lien" @click="modifier">Modifier</button>
          <button type="button" class="lien" :disabled="envoi" @click="enregistrer('')">Retirer</button>
        </template>
      </p>
    </template>

    <form v-else-if="seance.peut_ecrire_mot" class="mot-form" @submit.prevent="enregistrer(texte)">
      <label :for="`mot-${seance.id}`" class="mot-label"><i class="ti ti-message-2"></i> Un mot pour {{ prenom }}</label>
      <textarea
        :id="`mot-${seance.id}`"
        v-model="texte"
        rows="2"
        :maxlength="MAX"
        placeholder="Bravo pour la régularité, pense à bien t'étirer…"
      ></textarea>
      <div class="mot-actions">
        <span class="mot-compteur">{{ texte.length }}/{{ MAX }} · {{ prenom }} le verra à sa prochaine ouverture de l'appli</span>
        <button v-if="edition" type="button" class="btn btn-sm" @click="edition = false">Annuler</button>
        <button type="submit" class="btn btn-sm btn-primary" :disabled="!texte.trim() || envoi">
          <i class="ti ti-send"></i> Envoyer
        </button>
      </div>
    </form>
  </div>
</template>

<script>
import { ref, computed } from 'vue'
import { useApi } from '../../services/api'
import { afficherToast } from '../../composables/useToast'

const MAX = 200

// Le mot du prépa sur une séance réalisée : écrit, modifié ou retiré ici ;
// l'athlète le reçoit en bannière à l'ouverture de l'appli.
export default {
  props: {
    // Une ligne de GET /monitoring/seances
    seance: { type: Object, required: true }
  },
  emits: ['maj'],
  setup(props, { emit }) {
    const api = useApi()
    const texte = ref('')
    const edition = ref(false)
    const envoi = ref(false)
    const prenom = computed(() => (props.seance.athlete_nom || 'ton athlète').split(' ')[0])

    const modifier = () => {
      texte.value = props.seance.mot_prepa || ''
      edition.value = true
    }
    const enregistrer = async (valeur) => {
      if (envoi.value) return
      envoi.value = true
      try {
        const ligne = await api.put(`/monitoring/seances/${props.seance.id}/mot`, { texte: valeur.trim() || null })
        emit('maj', ligne)
        edition.value = false
        texte.value = ''
        afficherToast(valeur.trim() ? `Mot envoyé à ${prenom.value}` : 'Mot retiré')
      } catch (e) {
        afficherToast(e.message || "Le mot n'a pas pu être enregistré", 'erreur')
      } finally {
        envoi.value = false
      }
    }
    return { MAX, texte, edition, envoi, prenom, modifier, enregistrer }
  }
}
</script>

<style scoped>
.mot { display: flex; flex-direction: column; gap: 6px; padding-top: var(--spacing-md); border-top: 1px dashed var(--color-border); }
.mot-actuel { display: flex; gap: 8px; margin: 0; font-size: var(--font-size-sm); color: var(--color-text); }
.mot-actuel .ti { flex-shrink: 0; margin-top: 2px; color: var(--color-primary-dark); }
.mot-meta { display: flex; align-items: center; gap: var(--spacing-md); flex-wrap: wrap; margin: 0; padding-left: 24px; font-size: var(--font-size-xs); color: var(--color-text-muted); }
.mot-meta span { display: inline-flex; align-items: center; gap: 4px; }
.mot-meta .lu { color: var(--color-valid-text-strong); font-weight: 600; }
.mot-form { display: flex; flex-direction: column; gap: 6px; }
.mot-label { display: inline-flex; align-items: center; gap: 6px; font-size: var(--font-size-sm); font-weight: 600; color: var(--color-text); }
.mot-label .ti { color: var(--color-primary-dark); }
.mot-form textarea {
  width: 100%; resize: vertical; min-height: 60px;
  padding: var(--spacing-sm) var(--spacing-md);
  border: 1px solid var(--color-border); border-radius: var(--radius-md);
  background: var(--color-bg); font-family: inherit; font-size: var(--font-size-base); line-height: 1.4;
}
.mot-form textarea:focus { outline: none; border-color: var(--color-primary); box-shadow: var(--shadow-focus); }
.mot-actions { display: flex; align-items: center; justify-content: flex-end; gap: var(--spacing-sm); flex-wrap: wrap; }
.mot-compteur { flex: 1; min-width: 160px; font-size: var(--font-size-xs); color: var(--color-text-muted); }
</style>
