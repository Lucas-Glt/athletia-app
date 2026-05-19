<template>
  <div class="app">
    <header class="app-header">
      <div class="brand">
        <div class="brand-icon">A</div>
        <div class="brand-text">
          <h1>Athletia</h1>
          <span>{{ roleLabel }}</span>
        </div>
      </div>

      <nav class="header-nav">
        <slot name="nav" />
      </nav>

      <div class="header-right">
        <slot name="actions" />
        <div class="avatar">{{ initiales }}</div>
      </div>
    </header>

    <div class="main-content">
      <slot />
    </div>
  </div>
</template>

<script>
import { ref, computed } from 'vue'
import { useAuthStore } from '../stores/auth'

export default {
  props: {
    title: { type: String, required: true }
  },
  setup() {
    const authStore = useAuthStore()

    const roleLabel = computed(() => {
      const labels = { prepa: 'Préparateur physique', athlete: 'Athlète', admin: 'Administrateur' }
      return labels[authStore.role] || ''
    })

    const userName = computed(() => authStore.user?.nom || '')
    const initiales = computed(() => {
      const nom = authStore.user?.nom || ''
      return nom.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    })

    return { roleLabel, userName, initiales }
  }
}
</script>

<style scoped>
* { box-sizing: border-box; }

.app {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
  background: #F8F7FF;
  font-family: 'Inter', system-ui, sans-serif;
}

.app-header {
  height: 56px;
  padding: 0 24px;
  border-bottom: 1px solid #EEEDF8;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
  background: white;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
  z-index: 20;
  gap: 24px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.brand-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: linear-gradient(135deg, #7F77DD, #534AB7);
  color: white;
  font-size: 16px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

.brand-text h1 {
  font-size: 15px;
  font-weight: 700;
  color: #111;
  letter-spacing: -0.3px;
  margin: 0;
  line-height: 1.2;
}

.brand-text span {
  font-size: 10px;
  color: #9ca3af;
}

/* Nav dans le header */
.header-nav {
  display: flex;
  align-items: center;
  gap: 4px;
  flex: 1;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, #CECBF6, #AFA9EC);
  color: #3C3489;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  flex-shrink: 0;
}

.main-content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-height: 0;
}
</style>