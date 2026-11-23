<template>
  <div v-defilement-fluide class="seances-panel">
    <div class="panel-header">
      <div>
        <h2 class="panel-titre">Séances</h2>
        <p class="panel-sous-titre">Les dernières séances validées par vos athlètes, la plus récente en haut</p>
      </div>
      <button type="button" class="btn btn-actualiser" :disabled="actualisation" aria-label="Actualiser les séances" @click="actualiser">
        <i class="ti ti-refresh" :class="{ tourne: actualisation }"></i><span class="libelle"> Actualiser</span>
      </button>
    </div>

    <div class="filtres-row">
      <label class="recherche">
        <i class="ti ti-search"></i>
        <input v-model="recherche" type="search" placeholder="Rechercher un athlète" aria-label="Rechercher un athlète" />
      </label>
      <div class="chips" v-if="groupes.length > 0">
        <button type="button" class="chip-filtre" :class="{ active: groupeFiltre === 'tous' }" @click="groupeFiltre = 'tous'">Tous</button>
        <button
          v-for="g in groupes"
          :key="g.id"
          type="button"
          class="chip-filtre"
          :class="{ active: groupeFiltre === g.id }"
          @click="groupeFiltre = groupeFiltre === g.id ? 'tous' : g.id"
        >
          <span class="groupe-dot" :style="{ background: g.couleur || 'var(--color-primary)' }"></span>
          {{ g.nom }}
        </button>
      </div>
    </div>

    <p v-if="monCercle.length === 0" class="vide-cercle">
      Aucun athlète dans votre cercle : leurs séances apparaîtront ici dès qu'ils en valideront.
    </p>
    <ListeSeancesRealisees
      v-else
      ref="liste"
      :athlete-ids="athleteIds"
      afficher-athlete
      :resumes-par-id="resumesParId"
      :vu-jusqua="vuJusqua"
      :actif="actif"
      :texte-vide="athleteIds ? 'Aucune séance pour ce filtre.' : 'Aucune séance validée par vos athlètes pour le moment.'"
      @premiere-page="surPremierePage"
      @ouvrir-athlete="$emit('ouvrir-athlete', $event)"
    />
  </div>
</template>

<script>
import { ref, computed, watch } from 'vue'
import ListeSeancesRealisees from './ListeSeancesRealisees.vue'

// Dernière séance vue par le prépa (date de la plus récente du flux, heure de
// Paris) : celles d'après sont « nouvelles » — pastille sur l'onglet, liseré
// dans la liste.
const CLE_VUES = 'athletia:prepa-seances-vues'
const lireVues = () => {
  try {
    return localStorage.getItem(CLE_VUES)
  } catch {
    return null
  }
}
const ecrireVues = (date) => {
  try {
    localStorage.setItem(CLE_VUES, date)
  } catch {
    // stockage indisponible : la pastille reviendra au prochain lancement
  }
}

// Onglet Séances du prépa : le flux des séances de tout le cercle, filtrable
// par nom ou par groupe.
export default {
  components: { ListeSeancesRealisees },
  props: {
    monCercle: { type: Array, default: () => [] },
    groupes: { type: Array, default: () => [] },
    resumesParId: { type: Object, default: () => ({}) },
    actif: { type: Boolean, default: false }
  },
  emits: ['ouvrir-athlete', 'nouvelles'],
  setup(props, { emit }) {
    const liste = ref(null)
    const recherche = ref('')
    const rechercheAppliquee = ref('')
    const groupeFiltre = ref('tous')

    // La recherche s'applique quand la frappe marque une pause : un appel à
    // l'API par lettre tapée serait inutile.
    let minuteur = null
    watch(recherche, (texte) => {
      clearTimeout(minuteur)
      minuteur = setTimeout(() => { rechercheAppliquee.value = texte.trim().toLowerCase() }, 250)
    })

    // null : pas de filtre (tout le cercle) ; sinon les athlètes retenus
    const athleteIds = computed(() => {
      const texte = rechercheAppliquee.value
      if (!texte && groupeFiltre.value === 'tous') return null
      const groupe = props.groupes.find((g) => g.id === groupeFiltre.value)
      const membres = groupe ? new Set(groupe.athletes.map((a) => a.id)) : null
      return props.monCercle
        .filter((a) => (!texte || a.nom.toLowerCase().includes(texte)) && (!membres || membres.has(a.id)))
        .map((a) => a.id)
    })

    // « Nouveau » pendant la visite : ce qui est arrivé depuis la précédente.
    const vuJusqua = ref(lireVues())
    let plusRecente = null

    const marquerVues = () => {
      if (plusRecente && plusRecente > (lireVues() || '')) ecrireVues(plusRecente)
      emit('nouvelles', 0)
    }

    // Seule la liste complète (sans filtre) compte pour la pastille.
    const surPremierePage = (seances) => {
      if (athleteIds.value !== null || seances.length === 0) return
      plusRecente = seances[0].date
      const vues = lireVues()
      if (!vues) {
        // Première visite : rien n'est « nouveau », la pastille démarre à zéro.
        ecrireVues(plusRecente)
        vuJusqua.value = plusRecente
        return
      }
      if (props.actif) marquerVues()
      else emit('nouvelles', seances.filter((s) => s.date > vues).length)
    }

    watch(() => props.actif, (actif) => {
      if (!actif) return
      vuJusqua.value = lireVues()
      marquerVues()
    })

    const actualisation = ref(false)
    const actualiser = async () => {
      actualisation.value = true
      try {
        await liste.value?.rafraichir()
      } finally {
        actualisation.value = false
      }
    }

    // Retour sur l'appli (autre onglet, téléphone déverrouillé) : de nouvelles
    // séances ont pu arriver, la pastille se met à jour.
    const rafraichirSiAncien = () => liste.value?.rafraichirSiAncien()

    return {
      liste, recherche, groupeFiltre, athleteIds, vuJusqua, surPremierePage,
      actualisation, actualiser, rafraichirSiAncien
    }
  }
}
</script>

<style scoped>
/* Colonne centrée sur grand écran, sans déplacer la barre de défilement. */
.seances-panel {
  display: flex; flex-direction: column; gap: var(--spacing-lg);
  padding: var(--spacing-xl) max(var(--spacing-2xl), calc((100% - 1080px) / 2)) var(--spacing-3xl);
  overflow-y: auto; flex: 1; min-height: 0;
}
.panel-header { display: flex; align-items: flex-end; justify-content: space-between; gap: var(--spacing-md); flex-wrap: wrap; }
.panel-titre { margin: 0; font-size: var(--font-size-xl); font-weight: 700; letter-spacing: -0.3px; }
.panel-sous-titre { margin: 2px 0 0; font-size: var(--font-size-sm); color: var(--color-text-secondary); }
.vide-cercle { margin: 0; padding: var(--spacing-2xl); text-align: center; font-size: var(--font-size-sm); color: var(--color-text-muted); }

.filtres-row { display: flex; align-items: center; gap: var(--spacing-sm) var(--spacing-md); flex-wrap: wrap; }
.recherche { position: relative; flex: 1; min-width: 200px; display: flex; align-items: center; }
.recherche i { position: absolute; left: 14px; font-size: var(--font-size-lg); color: var(--color-text-muted); pointer-events: none; }
.recherche input {
  width: 100%; min-height: var(--tap-min);
  padding: 0 var(--spacing-lg) 0 42px;
  border: 1px solid var(--color-border); border-radius: var(--radius-full);
  font-size: var(--font-size-base); background: var(--color-bg);
  appearance: none;
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
}
.recherche input:focus { outline: none; border-color: var(--color-primary); box-shadow: var(--shadow-focus); }
.chips { display: flex; gap: 6px; flex-wrap: wrap; }
.chip-filtre {
  display: inline-flex; align-items: center; gap: 6px;
  min-height: 36px; padding: 0 var(--spacing-md);
  border: 1px solid var(--color-border); border-radius: var(--radius-full);
  font-family: inherit; font-size: var(--font-size-sm);
  background: var(--color-bg); color: var(--color-text-secondary); cursor: pointer;
  transition: background var(--transition-fast), border-color var(--transition-fast), color var(--transition-fast);
}
.chip-filtre:hover { border-color: var(--color-border-strong); }
.chip-filtre.active { background: var(--color-primary-light); border-color: var(--color-primary); color: var(--color-primary-text); font-weight: 600; }
.groupe-dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
.tourne { animation: tourner 0.9s linear infinite; }
@keyframes tourner { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .tourne { animation: none; } }

@media (max-width: 768px) {
  .seances-panel { padding: var(--spacing-md) var(--spacing-lg) var(--spacing-2xl); }
  .panel-header { flex-wrap: nowrap; align-items: flex-start; }
  .btn-actualiser { width: var(--tap-min); padding: 0; flex-shrink: 0; }
  .btn-actualiser .libelle { display: none; }
}
</style>
