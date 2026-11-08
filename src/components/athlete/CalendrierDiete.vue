<template>
  <div class="calendrier-diete">
    <div class="cal-entete">
      <button type="button" class="btn btn-icon btn-sm" @click="changerMois(-1)" aria-label="Mois précédent">
        <i class="ti ti-chevron-left"></i>
      </button>
      <span class="cal-mois">{{ libelleMois }}</span>
      <button type="button" class="btn btn-icon btn-sm" :disabled="estMoisCourant" @click="changerMois(1)" aria-label="Mois suivant">
        <i class="ti ti-chevron-right"></i>
      </button>
    </div>

    <div class="cal-grille">
      <span v-for="(j, i) in JOURS_COURTS" :key="'l' + i" class="cal-jour-label">{{ j }}</span>
      <template v-for="(c, i) in cases" :key="i">
        <span v-if="!c" class="cal-case hors-mois"></span>
        <button
          v-else
          type="button"
          class="cal-case"
          :class="[`statut-${c.suivi?.statut || 'vide'}`, { aujourdhui: c.estAujourdhui, ouvert: ouvert === c.date }]"
          :style="{ '--i': i }"
          :disabled="!c.suivi"
          :aria-label="c.suivi ? `${c.numero} : ${LABELS[c.suivi.statut] || 'sans cible'}` : `${c.numero}`"
          @click="ouvert = ouvert === c.date ? null : c.date"
        >
          <span class="cal-num">{{ c.numero }}</span>
          <i v-if="c.suivi?.statut === 'reussi'" class="ti ti-check cal-coche"></i>
        </button>
      </template>
    </div>

    <div class="cal-detail" v-if="detail">
      <span class="cal-detail-date">{{ formatJour(detail.date) }}</span>
      <span class="cal-detail-kcal">
        {{ fr(detail.kcal) }} kcal<template v-if="detail.kcal_cible"> sur {{ fr(detail.kcal_cible) }} demandées</template>
      </span>
      <span v-if="detail.statut" class="cal-statut" :class="`statut-${detail.statut}`">{{ LABELS[detail.statut] }}</span>
    </div>

    <div class="cal-legende" v-if="donnees && compte.total > 0">
      <span v-for="s in STATUTS" :key="s" class="cal-legende-item">
        <span class="cal-puce" :class="`statut-${s}`"></span>{{ LABELS[s] }} <strong>{{ compte[s] }}</strong>
      </span>
    </div>
    <p class="cal-note" v-if="donnees && !donnees.cible && compte.total === 0">
      Fixe ton objectif dans Suivi › Diète : chaque jour où tu atteins ta cible passe au vert.
    </p>
    <p class="cal-note" v-else>
      Vert : la cible du jour atteinte à 10 % près · orange : à 20 % · rouge : plus loin.
      Chaque jour est jugé sur la cible demandée ce jour-là, et le reste.
    </p>
  </div>
</template>

<script>
import { ref, computed, watch } from 'vue'
import { useApi } from '../../services/api'

const JOURS_COURTS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
const STATUTS = ['reussi', 'proche', 'loin']
const LABELS = { reussi: 'Réussi', proche: 'Presque', loin: 'Loin' }

const pad2 = (n) => String(n).padStart(2, '0')
const isoLocal = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`

// Calendrier mensuel de la réussite calorique (cf. GET /diete/calendrier).
// Un jour est jugé contre la cible que l'appli affichait CE jour-là, figée
// côté serveur : un jour vert le reste, même si la cible bouge ensuite.
export default {
  setup() {
    const api = useApi()
    const aujourdhui = new Date()
    const mois = ref(new Date(aujourdhui.getFullYear(), aujourdhui.getMonth(), 1))
    const donnees = ref(null)
    const ouvert = ref(null)

    const cleMois = computed(() => `${mois.value.getFullYear()}-${pad2(mois.value.getMonth() + 1)}`)
    const estMoisCourant = computed(() =>
      mois.value.getFullYear() === aujourdhui.getFullYear() && mois.value.getMonth() === aujourdhui.getMonth()
    )
    const libelleMois = computed(() => {
      const texte = mois.value.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
      return texte.charAt(0).toUpperCase() + texte.slice(1)
    })

    const charger = async () => {
      ouvert.value = null
      try {
        donnees.value = await api.get(`/diete/calendrier?mois=${cleMois.value}`)
      } catch (e) {
        console.error('Erreur chargement calendrier diète:', e)
        donnees.value = { mois: cleMois.value, cible: null, jours: [] }
      }
    }
    watch(cleMois, charger, { immediate: true })

    const changerMois = (sens) => {
      mois.value = new Date(mois.value.getFullYear(), mois.value.getMonth() + sens, 1)
    }

    // Cases du mois, lundi en premier ; null = case vide avant le 1er.
    const cases = computed(() => {
      const parJour = Object.fromEntries((donnees.value?.jours || []).map(j => [j.date, j]))
      const premier = mois.value
      const nbJours = new Date(premier.getFullYear(), premier.getMonth() + 1, 0).getDate()
      const decalage = (premier.getDay() + 6) % 7
      const auj = isoLocal(aujourdhui)
      const liste = Array.from({ length: decalage }, () => null)
      for (let n = 1; n <= nbJours; n++) {
        const date = isoLocal(new Date(premier.getFullYear(), premier.getMonth(), n))
        liste.push({ date, numero: n, estAujourdhui: date === auj, suivi: parJour[date] || null })
      }
      return liste
    })

    const detail = computed(() => (donnees.value?.jours || []).find(j => j.date === ouvert.value) || null)
    const compte = computed(() => {
      const c = { reussi: 0, proche: 0, loin: 0, total: 0 }
      ;(donnees.value?.jours || []).forEach(j => { if (j.statut) { c[j.statut]++; c.total++ } })
      return c
    })

    const formatJour = (iso) => {
      const [a, m, j] = iso.split('-').map(Number)
      return new Date(a, m - 1, j).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
    }
    const fr = (n) => Number(n).toLocaleString('fr-FR')

    return {
      JOURS_COURTS, STATUTS, LABELS, donnees, ouvert, cases, detail, compte,
      libelleMois, estMoisCourant, changerMois, formatJour, fr
    }
  }
}
</script>

<style scoped>
.calendrier-diete { display: flex; flex-direction: column; gap: var(--spacing-sm); }
.cal-entete { display: flex; align-items: center; justify-content: space-between; gap: var(--spacing-sm); }
.cal-mois { font-size: var(--font-size-base); font-weight: 700; }

.cal-grille { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 4px; }
.cal-jour-label { text-align: center; font-size: var(--font-size-xs); font-weight: 700; color: var(--color-text-muted); padding-bottom: 2px; }
.cal-case {
  position: relative;
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg);
  font-family: inherit;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: transform var(--transition-fast), box-shadow var(--transition-fast);
}
.cal-case:disabled { cursor: default; }
.cal-case.hors-mois { border: none; background: transparent; }
.cal-case.aujourdhui { box-shadow: 0 0 0 2px var(--color-primary); }
.cal-case.ouvert { transform: scale(1.08); box-shadow: var(--shadow-card-hover); z-index: 1; }
.cal-num { font-size: var(--font-size-sm); font-weight: 600; }
.cal-coche { position: absolute; top: 2px; right: 3px; font-size: 11px; }

.statut-reussi { background: var(--color-valid-bg); border-color: var(--color-valid-border-strong); color: var(--color-valid-text-strong); }
.statut-proche { background: var(--color-warning-bg); border-color: var(--color-warning-border); color: var(--color-warning-text-strong); }
.statut-loin { background: var(--color-danger-bg); border-color: var(--color-danger-border); color: var(--color-danger-text); }
.statut-vide { color: var(--color-text-muted); }
/* Les jours réussis arrivent les uns après les autres : « boum, c'est vert » */
.cal-case.statut-reussi { animation: vert 0.45s var(--ease-standard) both; animation-delay: calc(var(--i) * 18ms); }
@keyframes vert {
  0% { transform: scale(0.6); opacity: 0; }
  70% { transform: scale(1.12); opacity: 1; }
  100% { transform: scale(1); }
}

.cal-detail {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  flex-wrap: wrap;
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius-md);
  background: var(--color-bg-secondary);
  font-size: var(--font-size-sm);
}
.cal-detail-date { font-weight: 700; }
.cal-detail-date::first-letter { text-transform: uppercase; }
.cal-detail-kcal { color: var(--color-text-secondary); }
.cal-statut { margin-left: auto; padding: 2px 8px; border-radius: var(--radius-full); font-size: var(--font-size-xs); font-weight: 700; border: none; }

.cal-legende { display: flex; flex-wrap: wrap; gap: 4px var(--spacing-md); font-size: var(--font-size-xs); color: var(--color-text-secondary); }
.cal-legende-item { display: inline-flex; align-items: center; gap: 5px; }
.cal-legende-item strong { color: var(--color-text); }
.cal-puce { width: 10px; height: 10px; border-radius: 3px; border: 1px solid; }
.cal-note { margin: 0; font-size: var(--font-size-xs); color: var(--color-text-muted); }

@media (prefers-reduced-motion: reduce) {
  .cal-case.statut-reussi { animation: none; }
}
</style>
