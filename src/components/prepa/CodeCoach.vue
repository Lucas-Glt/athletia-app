<template>
  <!-- Code coach du préparateur : l'athlète le saisit (inscription, ou
       fenêtre qui voile son appli tant qu'il n'a pas de préparateur) et
       rejoint son cercle. Un nouveau code remplace l'ancien à tout moment. -->
  <div class="code-coach">
    <div class="code-ligne">
      <span class="code-valeur" :class="{ renouvele }" aria-live="polite">{{ code || '······' }}</span>
      <div class="code-actions">
        <button type="button" class="btn btn-sm" :disabled="!code" @click="copier">
          <i class="ti ti-copy"></i> Copier
        </button>
        <button v-if="partageDisponible" type="button" class="btn btn-sm" :disabled="!code" @click="partager">
          <i class="ti ti-share"></i> Partager
        </button>
        <button
          v-if="!confirmation"
          type="button"
          class="btn btn-sm btn-ghost"
          :disabled="!code || envoi"
          @click="confirmation = true"
        >
          <i class="ti ti-refresh"></i> Nouveau code
        </button>
      </div>
    </div>

    <div v-if="confirmation" class="code-confirmation" role="group" aria-label="Changer de code">
      <span>L'ancien code ne marchera plus. Les athlètes déjà suivis restent dans votre cercle.</span>
      <div class="code-confirmation-actions">
        <button type="button" class="btn btn-sm" :disabled="envoi" @click="confirmation = false">Annuler</button>
        <button type="button" class="btn btn-sm btn-primary" :disabled="envoi" @click="regenerer">
          {{ envoi ? 'Génération…' : 'Générer un nouveau code' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref } from 'vue'
import { useApi } from '../../services/api'
import { afficherToast } from '../../composables/useToast'

export default {
  props: {
    code: { type: String, default: '' }
  },
  emits: ['update:code'],
  setup(props, { emit }) {
    const api = useApi()
    const confirmation = ref(false)
    const envoi = ref(false)
    const renouvele = ref(false)
    const partageDisponible = typeof navigator !== 'undefined' && typeof navigator.share === 'function'

    const copier = async () => {
      try {
        await navigator.clipboard.writeText(props.code)
        afficherToast('Code copié', 'succes')
      } catch {
        afficherToast(`Copie impossible : votre code est ${props.code}`, 'erreur')
      }
    }

    const partager = async () => {
      try {
        await navigator.share({
          title: 'Athletia',
          text: `Rejoins-moi sur Athletia avec mon code coach : ${props.code}`,
          url: window.location.origin
        })
      } catch {
        // partage annulé : rien à signaler
      }
    }

    const regenerer = async () => {
      envoi.value = true
      try {
        const profil = await api.post('/users/me/code-coach/regenerer')
        emit('update:code', profil.code_coach)
        confirmation.value = false
        renouvele.value = false
        requestAnimationFrame(() => { renouvele.value = true })
        afficherToast('Nouveau code créé : donnez celui-ci à vos prochains athlètes', 'succes')
      } catch (e) {
        afficherToast(e.message || 'Impossible de changer de code', 'erreur')
      } finally {
        envoi.value = false
      }
    }

    return { confirmation, envoi, renouvele, partageDisponible, copier, partager, regenerer }
  }
}
</script>

<style scoped>
.code-coach { display: flex; flex-direction: column; gap: var(--spacing-sm); }
.code-ligne { display: flex; align-items: center; gap: var(--spacing-md); flex-wrap: wrap; }
.code-valeur {
  font-size: var(--font-size-xl);
  font-weight: 800;
  letter-spacing: 4px;
  color: var(--color-primary-text);
  font-variant-numeric: tabular-nums;
  padding: 4px var(--spacing-md);
  border: 1.5px dashed var(--color-primary-lighter);
  border-radius: var(--radius-md);
  background: var(--color-primary-light);
  user-select: all;
}
.code-valeur.renouvele { animation: renouvele 0.5s cubic-bezier(0.2, 0.9, 0.3, 1.4); }
.code-actions { display: flex; gap: var(--spacing-xs); flex-wrap: wrap; }
.code-confirmation {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius-md);
  background: var(--color-bg-secondary);
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
}
.code-confirmation-actions { display: flex; gap: var(--spacing-xs); justify-content: flex-end; flex-wrap: wrap; }

@keyframes renouvele {
  0% { transform: scale(0.85); opacity: 0.3; }
  60% { transform: scale(1.06); }
  100% { transform: scale(1); opacity: 1; }
}
@media (prefers-reduced-motion: reduce) {
  .code-valeur.renouvele { animation: none; }
}
</style>
