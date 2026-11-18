<template>
  <Transition name="toast">
    <div
      v-if="toast"
      :key="toast.id"
      class="toast"
      :class="toast.type"
      :role="toast.type === 'erreur' ? 'alert' : 'status'"
    >
      <i class="ti" :class="toast.type === 'erreur' ? 'ti-alert-triangle' : 'ti-circle-check'"></i>
      <span>{{ toast.texte }}</span>
      <button type="button" class="toast-fermer" aria-label="Fermer" @click="fermerToast">
        <i class="ti ti-x"></i>
      </button>
    </div>
  </Transition>
</template>

<script>
import { useToast } from '../composables/useToast'

export default {
  setup() {
    const { toast, fermerToast } = useToast()
    return { toast, fermerToast }
  }
}
</script>

<style scoped>
.toast {
  position: fixed;
  top: calc(env(safe-area-inset-top) + var(--spacing-md));
  left: 50%;
  transform: translateX(-50%);
  z-index: 600; /* au-dessus des modales (200) et de l'accord (500) */
  width: min(480px, calc(100% - 2 * var(--spacing-md)));
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-xs) var(--spacing-xs) var(--spacing-xs) var(--spacing-md);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-valid-border);
  background: var(--color-valid-bg-soft);
  color: var(--color-valid-text-strong);
  font-size: var(--font-size-sm);
  box-shadow: 0 8px 24px -8px rgba(0, 0, 0, 0.3);
}
.toast.erreur {
  border-color: var(--color-danger-border);
  background: var(--color-danger-bg-soft);
  color: var(--color-danger-text);
}
.toast > .ti { font-size: 1.2em; flex-shrink: 0; }
.toast span { flex: 1; overflow-wrap: anywhere; }
.toast-fermer {
  flex-shrink: 0;
  width: var(--tap-min);
  height: var(--tap-min);
  border: none;
  background: transparent;
  color: inherit;
  cursor: pointer;
}
.toast-enter-active, .toast-leave-active { transition: opacity 0.2s ease, transform 0.2s ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translate(-50%, -12px); }
@media (prefers-reduced-motion: reduce) {
  .toast-enter-active, .toast-leave-active { transition: opacity 0.2s ease; }
  .toast-enter-from, .toast-leave-to { transform: translateX(-50%); }
}
</style>
