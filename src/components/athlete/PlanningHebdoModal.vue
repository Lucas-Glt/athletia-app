<template>
  <!-- Création/édition de la semaine type : un bloc par jour, auquel on ajoute
       les séances du programme. Une même séance peut revenir plusieurs jours.
       Tout se joue ici — il n'y a pas de glisser-déposer dans le calendrier,
       peu praticable sur un téléphone en salle. -->
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
          Ajoutez à chaque jour les séances que vous y ferez. Une même séance
          peut revenir plusieurs jours.
        </p>

        <div v-for="jour in JOURS_SEMAINE" :key="jour.cle" class="jour-bloc">
          <div class="jour-tete">
            <span class="jour-nom">{{ jour.label }}</span>
            <select
              class="jour-ajout"
              :aria-label="`Ajouter une séance le ${jour.label.toLowerCase()}`"
              :disabled="disponibles(jour.cle).length === 0"
              @change="ajouter(jour.cle, $event)"
            >
              <option value="" selected>+ Séance</option>
              <option v-for="seance in disponibles(jour.cle)" :key="seance.id" :value="seance.nom">
                {{ seance.nom }}
              </option>
            </select>
          </div>
          <div class="jour-seances">
            <button
              v-for="nom in choix[jour.cle]"
              :key="nom"
              type="button"
              class="jour-seance"
              :class="classeType(nom)"
              :aria-label="`Retirer ${nom} du ${jour.label.toLowerCase()}`"
              @click="retirer(jour.cle, nom)"
            >
              <span class="jour-seance-nom">{{ nom }}</span>
              <i class="ti ti-x"></i>
            </button>
            <span v-if="choix[jour.cle].length === 0" class="jour-repos">Repos</span>
          </div>
        </div>

        <p v-if="sansJour.length" class="planning-note">
          Sans jour : {{ sansJour.join(', ') }}. Elles resteront accessibles sous
          le calendrier.
        </p>
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
import { ref, computed } from 'vue'
import { JOURS_SEMAINE } from '../../data/joursSemaine'

const TYPES = ['musculation', 'natation', 'athletisme', 'pliometrie']

export default {
  emits: ['enregistrer', 'supprimer', 'fermer'],
  props: {
    creneaux: { type: Array, required: true },
    planning: { type: Array, required: true },
    erreur: { type: String, default: '' }
  },
  setup(props, { emit }) {
    // Dans un jour, les séances suivent l'ordre du programme, comme dans le
    // calendrier.
    const rang = computed(() => Object.fromEntries(props.creneaux.map((s, i) => [s.nom, i])))
    const trier = (noms) => noms.sort((a, b) => rang.value[a] - rang.value[b])

    // La modale est montée à l'ouverture (v-if côté parent) : l'état de départ
    // se lit une fois ici, les modifications restent locales jusqu'au clic sur
    // Enregistrer. Une entrée dont la séance n'existe plus (programme remanié
    // par le prépa) est écartée — l'API la refuserait.
    const choix = ref(Object.fromEntries(JOURS_SEMAINE.map(j => [
      j.cle,
      trier(props.planning
        .filter(e => e.jour === j.cle && Object.hasOwn(rang.value, e.creneau))
        .map(e => e.creneau))
    ])))

    const disponibles = (jour) => props.creneaux.filter(s => !choix.value[jour].includes(s.nom))

    const ajouter = (jour, event) => {
      const nom = event.target.value
      // Le select sert de bouton : il revient sur « + Séance » après chaque ajout.
      event.target.value = ''
      if (!nom || choix.value[jour].includes(nom)) return
      choix.value[jour] = trier([...choix.value[jour], nom])
    }

    const retirer = (jour, nom) => {
      choix.value[jour] = choix.value[jour].filter(n => n !== nom)
    }

    const sansJour = computed(() =>
      props.creneaux
        .filter(s => !JOURS_SEMAINE.some(j => choix.value[j.cle].includes(s.nom)))
        .map(s => s.nom)
    )

    const typeParNom = computed(() => Object.fromEntries(props.creneaux.map(s => [s.nom, s.type_seance])))
    const classeType = (nom) => `est-${TYPES.includes(typeParNom.value[nom]) ? typeParNom.value[nom] : 'musculation'}`

    const enregistrer = () => {
      emit('enregistrer', JOURS_SEMAINE.flatMap(j =>
        choix.value[j.cle].map(creneau => ({ creneau, jour: j.cle }))
      ))
    }

    return { JOURS_SEMAINE, choix, disponibles, ajouter, retirer, sansJour, classeType, enregistrer }
  }
}
</script>

<style scoped>
.planning-note { margin: 0; font-size: var(--font-size-sm); color: var(--color-text-secondary); }

.jour-bloc {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  padding-bottom: var(--spacing-md);
  border-bottom: 1px solid var(--color-border);
}
.jour-bloc:last-of-type { border-bottom: none; padding-bottom: 0; }

.jour-tete { display: flex; align-items: center; justify-content: space-between; gap: var(--spacing-sm); }
.jour-nom { font-size: var(--font-size-base); font-weight: 600; color: var(--color-text); }

.jour-ajout {
  /* Largeur fixe : sinon chaque select prend celle de sa plus longue option,
     différente d'un jour à l'autre. */
  width: 55%;
  min-height: var(--tap-min);
  padding: 0 var(--spacing-md);
  border: 1px dashed var(--color-border-strong);
  border-radius: var(--radius-md);
  background: var(--color-bg);
  color: var(--color-primary-text);
  font-size: var(--font-size-sm);
  font-weight: 600;
  cursor: pointer;
}
.jour-ajout:focus { outline: none; border-color: var(--color-primary); box-shadow: var(--shadow-focus); }
.jour-ajout:disabled { opacity: 0.5; cursor: default; }

.jour-seances { display: flex; flex-wrap: wrap; gap: var(--spacing-sm); }

/* Même repère de type que les puces du calendrier : barre de couleur à gauche. */
.est-musculation { --type-couleur: var(--color-type-musculation-border); }
.est-natation { --type-couleur: var(--color-type-natation-border); }
.est-athletisme { --type-couleur: var(--color-type-athletisme-border); }
.est-pliometrie { --type-couleur: var(--color-type-pliometrie-border); }

.jour-seance {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  max-width: 100%;
  min-height: 36px;
  padding: 0 var(--spacing-sm) 0 var(--spacing-md);
  border: 1px solid var(--color-border);
  border-left: 4px solid var(--type-couleur, var(--color-primary));
  border-radius: var(--radius-md);
  background: var(--color-primary-light);
  color: var(--color-primary-text);
  font-size: var(--font-size-sm);
  font-weight: 600;
  cursor: pointer;
}
.jour-seance:hover { background: var(--color-primary-lighter); }
.jour-seance-nom { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.jour-seance .ti { flex-shrink: 0; opacity: 0.7; }

.jour-repos { font-size: var(--font-size-sm); color: var(--color-text-muted); }
</style>
