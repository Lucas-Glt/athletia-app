import { defineStore } from 'pinia'
import { useApi } from '../services/api'

// Durée d'affichage d'un « +500 XP » avant qu'il ne s'efface.
const DUREE_GAIN_MS = 2600

// Progression ludique de l'athlète (XP, niveau, badges, série), calculée par
// l'API à partir de ce qu'il fait (cf. app/progression_calc.py). Après chaque
// action qui rapporte — séance, wellness, ressenti, pesée, repas —,
// actualiser() relit la progression et annonce l'XP gagnée : le barème ne vit
// qu'à un seul endroit, côté serveur.
export const useProgressionStore = defineStore('progression', {
  state: () => ({
    progression: null,
    // « +500 XP · Séance validée » en cours d'affichage
    gains: [],
    // Passage de niveau à fêter, null sinon
    niveauAtteint: null,
    // Incrémenté pour déclencher une pluie de confettis
    fete: 0
  }),

  actions: {
    async charger() {
      try {
        this.progression = await useApi().get('/progression/moi')
      } catch (e) {
        console.error('Erreur chargement progression:', e)
      }
    },

    async actualiser(motif) {
      const avant = this.progression
      await this.charger()
      const apres = this.progression
      // Sans point de départ, rien à comparer : on ne célèbre pas à l'aveugle.
      if (!avant || !apres) return
      const gain = apres.xp_total - avant.xp_total
      if (gain > 0) this.annoncer(gain, motif)
      if (apres.niveau > avant.niveau) {
        this.niveauAtteint = {
          niveau: apres.niveau,
          titre: apres.titre,
          nouveauTitre: apres.titre !== avant.titre,
          icone: apres.badges.filter(b => b.debloque).pop()?.icone || 'ti-star'
        }
        this.feter()
      }
    },

    annoncer(xp, motif) {
      const id = `${Date.now()}-${Math.random()}`
      this.gains.push({ id, xp, motif })
      setTimeout(() => { this.gains = this.gains.filter(g => g.id !== id) }, DUREE_GAIN_MS)
    },

    feter() {
      this.fete++
    },

    fermerNiveau() {
      this.niveauAtteint = null
    }
  }
})
