<template>
  <div class="app">
    <header class="app-header">
      <div class="brand">
        <h1>Athletia</h1>
        <span>{{ roleLabel }}</span>
      </div>
      <div class="header-right">
        <div class="avatar">{{ initiales }}</div>
      </div>
    </header>

    <div class="app-body">
      <div class="overlay" :class="{ show: sidebarOpen }" @click="sidebarOpen = false"></div>

      <nav class="sidebar" :class="{ open: sidebarOpen }">
        <slot name="nav" />
        <div class="sidebar-bottom">{{ userName }}</div>
      </nav>

      <div class="main">
        <div class="topbar">
          <button class="btn-icon" @click="sidebarOpen = !sidebarOpen">
            <i class="ti ti-menu-2"></i>
          </button>
          <h2>{{ title }}</h2>
          <slot name="actions" />
        </div>
        <div class="main-content">
          <slot />
        </div>
      </div>
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
    const sidebarOpen = ref(false)
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

    return { sidebarOpen, roleLabel, userName, initiales }
  }
}
</script>

<style scoped>
* { box-sizing: border-box; }
.app { display: flex; flex-direction: column; height: 100vh; background: var(--bg); }
.app-header {
  padding: 14px 20px;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
  background: white;
}
.brand h1 { font-size: 18px; font-weight: 600; letter-spacing: -0.4px; color: #111; }
.brand span { font-size: 12px; color: #6b7280; }
.avatar {
  width: 32px; height: 32px; border-radius: 50%;
  background: #CECBF6; color: #3C3489;
  display: flex; align-items: center; justify-content: center;
  font-size: 11px; font-weight: 600;
}
.app-body { display: flex; flex: 1; overflow: hidden; position: relative; }
.overlay {
  display: none; position: absolute; inset: 0;
  background: rgba(0,0,0,0.2); z-index: 9;
}
.overlay.show { display: block; }
.sidebar {
  position: absolute; left: 0; top: 0; bottom: 0; width: 220px;
  border-right: 1px solid #e5e7eb; background: #f9fafb;
  display: flex; flex-direction: column; padding: 12px 0;
  z-index: 10; transform: translateX(-100%);
  transition: transform 0.2s ease;
}
.sidebar.open { transform: translateX(0); }
.sidebar-bottom {
  margin-top: auto; padding: 12px 16px;
  border-top: 1px solid #e5e7eb;
  font-size: 12px; color: #6b7280;
}
.main { flex: 1; display: flex; flex-direction: column; min-width: 0; }
.topbar {
  padding: 10px 16px; border-bottom: 1px solid #e5e7eb;
  display: flex; align-items: center; gap: 10px; flex-shrink: 0;
}
.topbar h2 { font-size: 14px; font-weight: 500; flex: 1; }
.btn-icon {
  width: 32px; height: 32px; padding: 0;
  display: inline-flex; align-items: center; justify-content: center;
  border-radius: 6px; border: 1px solid #e5e7eb;
  cursor: pointer; background: transparent; color: #374151;
  flex-shrink: 0;
}
.btn-icon:hover { background: #f3f4f6; }
.main-content { flex: 1; overflow: hidden; display: flex; }
</style>