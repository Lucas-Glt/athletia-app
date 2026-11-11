import { createRouter, createWebHistory } from 'vue-router'
import LoginView from '../views/LoginView.vue'
import { useAuthStore } from '../stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'login',
      component: LoginView
    },
    {
      path: '/athlete',
      name: 'athlete',
      component: () => import('../views/DashboardAthlete.vue')
    },
    {
      path: '/prepa',
      name: 'prepa',
      component: () => import('../views/DashboardPrepa.vue')
    },
    {
      path: '/admin',
      name: 'admin',
      component: () => import('../views/DashboardAdmin.vue')
    },
    {
      path: '/super-admin',
      name: 'super-admin',
      component: () => import('../views/DashboardSuperAdmin.vue')
    }
  ]
})

// Chaque tableau de bord n'est ouvert qu'au rôle qui va avec : un athlète
// qui ouvrait /prepa (favori, lien partagé) restait bloqué sur un écran
// prépa vide, en « Chargement… ». Sans session, retour à la connexion.
const ROUTE_PAR_ROLE = {
  athlete: 'athlete',
  prepa: 'prepa',
  super_prepa: 'prepa',
  admin: 'admin',
  super_admin: 'super-admin'
}

router.beforeEach((to) => {
  if (to.name === 'login') return true
  const auth = useAuthStore()
  const routeDuRole = auth.isAuthenticated ? ROUTE_PAR_ROLE[auth.role] : null
  if (!routeDuRole) return { name: 'login' }
  if (to.name !== routeDuRole) return { name: routeDuRole }
  return true
})

export default router