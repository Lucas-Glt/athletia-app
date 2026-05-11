import { createRouter, createWebHistory } from 'vue-router'
import LoginView from '../views/LoginView.vue'

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
    }
  ]
})

export default router