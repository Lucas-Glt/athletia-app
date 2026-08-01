<template>
  <!-- Deux présentations pour le même contenu : bannière discrète en bas
       d'écran (l'app reste utilisable), ou carte centrée sur voile plein
       écran quand la question doit être tranchée avant toute autre action. -->
  <div
    class="popup-wrap"
    :class="bloquant ? 'is-bloquant' : 'is-banniere'"
    :role="bloquant ? 'dialog' : undefined"
    :aria-modal="bloquant ? 'true' : undefined"
  >
    <div class="popup-carte">
      <div class="popup-contenu">
        <i class="ti popup-icone" :class="icone"></i>
        <div>
          <div class="popup-titre">{{ titre }}</div>
          <div class="popup-sub" v-if="sousTitre">{{ sousTitre }}</div>
        </div>
      </div>
      <div class="popup-actions">
        <button class="btn btn-primary btn-sm" @click="$emit('oui')">{{ texteOui }}</button>
        <button class="btn btn-sm" @click="$emit('non')">{{ texteNon }}</button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  emits: ['oui', 'non'],
  props: {
    icone: { type: String, default: 'ti-message-circle' },
    titre: { type: String, required: true },
    sousTitre: { type: String, default: '' },
    texteOui: { type: String, default: 'Oui' },
    texteNon: { type: String, default: 'Non merci' },
    // Voile plein écran : aucune interaction avec l'app tant qu'on n'a pas
    // répondu (pas de fermeture au clic à côté ni à l'échap).
    bloquant: { type: Boolean, default: false }
  }
}
</script>

<style scoped>
.popup-wrap { position: fixed; z-index: 150; }
.popup-contenu { display: flex; align-items: center; gap: var(--spacing-md); }
.popup-icone { font-size: 24px; color: var(--color-primary); flex-shrink: 0; }
.popup-titre { font-size: var(--font-size-sm); font-weight: 600; color: var(--color-text); }
.popup-sub { font-size: var(--font-size-xs); color: var(--color-text-secondary); margin-top: 2px; }
.popup-actions { display: flex; gap: var(--spacing-sm); flex-shrink: 0; }

/* --- Bannière --- */
.popup-wrap.is-banniere { bottom: 0; left: 0; right: 0; }
.is-banniere .popup-carte {
  background: var(--color-bg);
  border-top: 1px solid var(--color-primary-light);
  box-shadow: var(--shadow-banner);
  padding: var(--spacing-md) var(--spacing-lg);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-md);
  flex-wrap: wrap;
}

/* --- Bloquant --- */
/* Au-dessus des modales (z-index 200) : la question doit passer devant
   tout ce qui pourrait être ouvert à l'écran. */
.popup-wrap.is-bloquant {
  inset: 0;
  z-index: 210;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-lg);
}
.is-bloquant .popup-carte {
  background: var(--color-bg);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-modal);
  padding: var(--spacing-xl);
  width: 100%;
  max-width: 380px;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
  text-align: center;
}
.is-bloquant .popup-contenu { flex-direction: column; gap: var(--spacing-sm); }
.is-bloquant .popup-icone { font-size: 40px; }
.is-bloquant .popup-titre { font-size: var(--font-size-base); }
.is-bloquant .popup-sub { font-size: var(--font-size-sm); }
.is-bloquant .popup-actions { flex-direction: column; }
.is-bloquant .popup-actions .btn { width: 100%; justify-content: center; }

@media (max-width: 768px) {
  .popup-wrap.is-banniere { bottom: calc(var(--bottom-nav-h) + env(safe-area-inset-bottom)); }
}
</style>
