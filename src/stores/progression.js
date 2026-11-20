import { defineStore } from 'pinia'
import { useApi } from '../services/api'

// Durée d'affichage d'un « +500 XP » avant qu'il ne s'efface : le temps que
// le nombre défile et que la jauge se remplisse.
const DUREE_GAIN_MS = 3400

// Avancement dans le niveau, en % (jauge pleine au niveau max)
export const pourcentageNiveau = (p) => {
  if (!p) return 0
  if (!p.xp_niveau_suivant) return 100
  return Math.min(100, (p.xp_dans_niveau / p.xp_niveau_suivant) * 100)
}

// Progression ludique de l'athlète (XP, niveau, badges, série), calculée par
// l'API à partir de ce qu'il fait (cf. app/progression_calc.py). Après chaque
// action qui rapporte — séance, wellness, ressenti, pesée, repas —,
// actualiser() relit la progression et annonce l'XP gagnée : le barème ne vit
// qu'à un seul endroit, côté serveur.
export const useProgressionStore = defineStore('progression', {
  state: () => ({
    progression: null,
    // « +500 XP · Séance validée » en cours d'affichage, avec de quoi animer
    // la jauge de l'ancien au nouvel avancement
    gains: [],
    // Passage de niveau à fêter, null sinon
    niveauAtteint: null,
    // Incrémenté pour déclencher une gerbe de confettis…
    fete: 0,
    // …partie de ce point de l'écran (fractions, cf. origineDe), ou du bas
    origineFete: null
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
      if (gain > 0) this.annoncer(gain, motif, avant, apres)
      if (apres.niveau > avant.niveau) {
        const debloques = apres.badges.filter(b => b.debloque)
        const nouveauTitre = apres.titre !== avant.titre
        this.niveauAtteint = {
          niveau: apres.niveau,
          niveauAvant: avant.niveau,
          titre: apres.titre,
          nouveauTitre,
          phrase: apres.phrase || '',
          icone: debloques.pop()?.icone || 'ti-star'
        }
      }
    },

    annoncer(xp, motif, avant, apres) {
      const id = `${Date.now()}-${Math.random()}`
      this.gains.push({
        id,
        xp,
        motif,
        jauge: avant && apres
          ? {
              de: pourcentageNiveau(avant),
              a: pourcentageNiveau(apres),
              niveau: apres.niveau,
              montee: apres.niveau > avant.niveau
            }
          : null
      })
      setTimeout(() => { this.gains = this.gains.filter(g => g.id !== id) }, DUREE_GAIN_MS)
    },

    feter(origine = null) {
      this.origineFete = origine
      this.fete++
    },

    fermerNiveau() {
      this.niveauAtteint = null
    }
  }
})
