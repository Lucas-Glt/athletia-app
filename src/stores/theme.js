import { defineStore } from 'pinia'

function themeInitiale() {
  const stockee = localStorage.getItem('theme')
  if (stockee === 'dark' || stockee === 'light') return stockee
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export const useThemeStore = defineStore('theme', {
  state: () => ({
    theme: themeInitiale()
  }),

  actions: {
    appliquer() {
      document.documentElement.setAttribute('data-theme', this.theme)
    },

    setTheme(theme) {
      this.theme = theme
      localStorage.setItem('theme', theme)
      this.appliquer()
    },

    toggleTheme() {
      this.setTheme(this.theme === 'dark' ? 'light' : 'dark')
    }
  }
})
