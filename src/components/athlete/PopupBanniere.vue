<template>
  <div class="popup-banniere">
    <div class="popup-banniere-content">
      <i class="ti popup-banniere-icon" :class="icone"></i>
      <div>
        <div class="popup-banniere-titre">{{ titre }}</div>
        <div class="popup-banniere-sub" v-if="sousTitre">{{ sousTitre }}</div>
      </div>
    </div>
    <div class="popup-banniere-actions">
      <button class="btn btn-primary btn-sm" @click="$emit('oui')">{{ texteOui }}</button>
      <button class="btn btn-sm" @click="$emit('non')">{{ texteNon }}</button>
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
    texteNon: { type: String, default: 'Non merci' }
  }
}
</script>

<style scoped>
.popup-banniere {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 150;
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
.popup-banniere-content { display: flex; align-items: center; gap: var(--spacing-md); }
.popup-banniere-icon { font-size: 24px; color: var(--color-primary); flex-shrink: 0; }
.popup-banniere-titre { font-size: var(--font-size-sm); font-weight: 600; color: var(--color-text); }
.popup-banniere-sub { font-size: var(--font-size-xs); color: var(--color-text-secondary); margin-top: 2px; }
.popup-banniere-actions { display: flex; gap: var(--spacing-sm); flex-shrink: 0; }

@media (max-width: 768px) {
  .popup-banniere { bottom: calc(var(--bottom-nav-h) + env(safe-area-inset-bottom)); }
}
</style>
