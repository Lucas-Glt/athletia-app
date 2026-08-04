<template>
  <!-- Création/édition de la semaine type : une séance du programme par ligne,
       à poser sur un jour. Tout se joue ici — il n'y a pas de glisser-déposer
       dans le calendrier, peu praticable sur un téléphone en salle. -->
  <div class="modal-overlay" @click.self="$emit('fermer')">
    <div class="modal">
      <div class="modal-header">
        <h3>Ma semaine d'entraînement</h3>
        <button class="modal-close" @click="$emit('fermer')" aria-label="Fermer">
          <i class="ti ti-x"></i>
        </button>
      </div>
      <div class="modal-body">
        <p class="planning-note">
          Placez chaque séance de votre programme dans un jour. Celles laissées
          sans jour resteront accessibles sous le calendrier.
        </p>
        <div class="field" v-for="seance in creneaux" :key="seance.id">
          <label :for="`jour-${seance.id}`">{{ seance.nom }}</label>
          <select :id="`jour-${seance.id}`" v-model="choix[seance.nom]">
            <option value="">Aucun jour</option>
            <option v-for="jour in JOURS_SEMAINE" :key="jour.cle" :value="jour.cle">{{ jour.label }}</option>
          </select>
        </div>
        <p v-if="erreur" class="error">{{ erreur }}</p>
      </div>
      <div class="modal-footer">
        <button v-if="planning.length" class="btn btn-danger" @click="$emit('supprimer')">
          <i class="ti ti-trash"></i> Supprimer
        </button>
        <button class="btn btn-primary" @click="enregistrer">
          <i class="ti ti-check"></i> Enregistrer
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref } from 'vue'
import { JOURS_SEMAINE } from '../../data/joursSemaine'

export default {
  emits: ['enregistrer', 'supprimer', 'fermer'],
  props: {
    creneaux: { type: Array, required: true },
    planning: { type: Array, required: true },
    erreur: { type: String, default: '' }
  },
  setup(props, { emit }) {
    // La modale est montée à l'ouverture (v-if côté parent) : l'état de départ
    // se lit une fois ici, les modifications restent locales jusqu'au clic sur
    // Enregistrer.
    const choix = ref(Object.fromEntries(
      props.creneaux.map(s => [s.nom, props.planning.find(e => e.creneau === s.nom)?.jour || ''])
    ))

    const enregistrer = () => {
      emit('enregistrer', Object.entries(choix.value)
        .filter(([, jour]) => jour)
        .map(([creneau, jour]) => ({ creneau, jour })))
    }

    return { JOURS_SEMAINE, choix, enregistrer }
  }
}
</script>

<style scoped>
.planning-note { margin: 0; font-size: var(--font-size-sm); color: var(--color-text-secondary); }
</style>
