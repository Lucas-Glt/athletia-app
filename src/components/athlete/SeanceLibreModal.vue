<template>
  <div class="modal-overlay" @click.self="$emit('fermer')">
    <div class="modal modal-libre" role="dialog" aria-modal="true" aria-labelledby="titre-seance-libre">
      <div class="modal-header">
        <h3 id="titre-seance-libre">Séance hors programme</h3>
        <button class="modal-close" aria-label="Fermer" @click="$emit('fermer')"><i class="ti ti-x"></i></button>
      </div>

      <form class="modal-body libre-corps" @submit.prevent="enregistrer">
        <p class="libre-intro">
          Une séance faite en plus de ton programme ? Déclare-la : ton prépa connaîtra ta vraie charge d'entraînement.
        </p>

        <fieldset class="libre-champ">
          <legend>Type de séance</legend>
          <div class="types">
            <button
              v-for="t in TYPES"
              :key="t.valeur"
              type="button"
              class="type-choix"
              :class="[`type-${t.valeur}`, { active: form.type_seance === t.valeur }]"
              :aria-pressed="form.type_seance === t.valeur"
              @click="form.type_seance = t.valeur"
            >
              <i class="ti" :class="t.icone"></i>
              {{ t.label }}
            </button>
          </div>
        </fieldset>

        <label class="libre-champ" for="nom-seance-libre">
          <span class="libre-label">Ce que tu as fait <small>facultatif</small></span>
          <input
            id="nom-seance-libre"
            v-model="form.nom"
            type="text"
            maxlength="60"
            autocomplete="off"
            :placeholder="placeholderNom"
          />
        </label>

        <fieldset class="libre-champ">
          <legend>Quand ?</legend>
          <div class="jours">
            <button
              v-for="j in JOURS"
              :key="j.valeur"
              type="button"
              class="jour-choix"
              :class="{ active: form.jour === j.valeur }"
              :aria-pressed="form.jour === j.valeur"
              @click="form.jour = j.valeur"
            >{{ j.label }}</button>
          </div>
        </fieldset>

        <fieldset class="libre-champ">
          <legend>Comment l'as-tu trouvée ?</legend>
          <div class="rpe-picker">
            <button
              v-for="n in 11"
              :key="n - 1"
              type="button"
              class="rpe-btn"
              :class="{ active: form.rpe === n - 1 }"
              :aria-pressed="form.rpe === n - 1"
              @click="form.rpe = n - 1"
            >{{ n - 1 }}</button>
          </div>
          <p class="rpe-label" v-if="form.rpe !== null">{{ labelRpe(form.rpe) }}</p>
        </fieldset>

        <label class="libre-champ duree" for="duree-seance-libre">
          <span class="libre-label">Durée</span>
          <span class="duree-ligne">
            <input
              id="duree-seance-libre"
              v-model.number="form.duree_minutes"
              type="number"
              inputmode="numeric"
              min="1"
              :max="DUREE_MAX"
              placeholder="ex : 45"
            />
            <span>min</span>
            <span class="duree-heures" v-if="form.duree_minutes >= 60">soit {{ dureeEnHeures(form.duree_minutes) }}</span>
          </span>
        </label>

        <p class="libre-note">
          <i class="ti ti-sparkles"></i>
          +100 XP, une fois par jour : ton programme reste la priorité.
        </p>
        <p v-if="erreur" class="error" role="alert">{{ erreur }}</p>
      </form>

      <div class="modal-footer">
        <button type="button" class="btn" @click="$emit('fermer')">Annuler</button>
        <button type="button" class="btn btn-primary" :disabled="!complet || envoi" @click="enregistrer">
          <i class="ti" :class="envoi ? 'ti-loader-2' : 'ti-check'"></i> Enregistrer
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed } from 'vue'
import { useApi } from '../../services/api'
import { DUREE_MAX, DUREE_A_CONFIRMER, labelRpe, dureeEnHeures } from '../../data/ressenti'

// Les types proposés : ceux de l'API (TYPES_SEANCE_LIBRE, app/schemas/monitoring.py).
const TYPES = [
  { valeur: 'musculation', label: 'Musculation', icone: 'ti-barbell', exemple: 'Séance perso, circuit…' },
  { valeur: 'athletisme', label: 'Athlétisme', icone: 'ti-run', exemple: 'Footing, fractionné, match…' },
  { valeur: 'natation', label: 'Natation', icone: 'ti-swimming', exemple: 'Nage libre, 2 km…' }
]
// Le ressenti se donne à chaud : le jour même ou le lendemain.
const JOURS = [
  { valeur: 'aujourdhui', label: "Aujourd'hui" },
  { valeur: 'hier', label: 'Hier' }
]

// Déclaration d'une séance faite en plus du programme, avec son questionnaire
// de charge (RPE × durée) : elle compte dans la charge suivie par le prépa.
export default {
  emits: ['fermer', 'ajoutee'],
  setup(props, { emit }) {
    const api = useApi()
    const form = ref({ type_seance: null, nom: '', jour: 'aujourdhui', rpe: null, duree_minutes: '' })
    const envoi = ref(false)
    const erreur = ref('')

    const complet = computed(() =>
      !!form.value.type_seance && form.value.rpe !== null && Number(form.value.duree_minutes) > 0
    )
    const placeholderNom = computed(() =>
      TYPES.find((t) => t.valeur === form.value.type_seance)?.exemple || 'Footing, match, nage libre…'
    )

    const enregistrer = async () => {
      if (!complet.value || envoi.value) return
      const duree = Math.round(Number(form.value.duree_minutes))
      if (duree < 1 || duree > DUREE_MAX) {
        erreur.value = `Durée invalide : entre 1 et ${DUREE_MAX} minutes (${DUREE_MAX / 60} h)`
        return
      }
      if (duree > DUREE_A_CONFIRMER && !confirm(`Séance de ${duree} min, soit ${dureeEnHeures(duree)} : c'est bien ça ?`)) return
      erreur.value = ''
      envoi.value = true
      try {
        const seance = await api.post('/seances-libres/', { ...form.value, nom: form.value.nom.trim() || null, duree_minutes: duree })
        emit('ajoutee', seance)
      } catch (e) {
        erreur.value = e.message || "La séance n'a pas pu être enregistrée"
      } finally {
        envoi.value = false
      }
    }

    return { TYPES, JOURS, DUREE_MAX, form, envoi, erreur, complet, placeholderNom, enregistrer, labelRpe, dureeEnHeures }
  }
}
</script>

<style scoped>
.modal-libre { max-width: 480px; }
.libre-corps { display: flex; flex-direction: column; gap: var(--spacing-lg); }
.libre-intro { margin: 0; font-size: var(--font-size-sm); color: var(--color-text-secondary); }
.libre-champ { display: flex; flex-direction: column; gap: var(--spacing-sm); margin: 0; padding: 0; border: none; min-width: 0; }
.libre-champ legend, .libre-label { padding: 0; margin-bottom: var(--spacing-sm); font-size: var(--font-size-sm); font-weight: 600; color: var(--color-text); }
.libre-label { margin-bottom: 0; }
.libre-label small { font-weight: 400; color: var(--color-text-muted); }
.libre-champ input[type='text'], .duree-ligne input {
  min-height: var(--tap-min);
  padding: 0 var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--font-size-base);
  background: var(--color-bg);
}
.libre-champ input:focus { outline: none; border-color: var(--color-primary); box-shadow: var(--shadow-focus); }

.types { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--spacing-sm); }
.type-choix {
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px;
  min-height: 72px; padding: var(--spacing-sm);
  border: 1px solid var(--color-border); border-radius: var(--radius-lg);
  background: var(--color-bg); color: var(--color-text-body);
  font-family: inherit; font-size: var(--font-size-sm); font-weight: 600; cursor: pointer;
  transition: border-color var(--transition-fast), background var(--transition-fast), transform var(--transition-fast);
}
.type-choix .ti { font-size: 24px; }
.type-choix:active { transform: scale(0.96); }
.type-musculation .ti { color: var(--color-type-musculation-text); }
.type-athletisme .ti { color: var(--color-type-athletisme-text); }
.type-natation .ti { color: var(--color-type-natation-text); }
.type-choix.active { border-width: 2px; }
.type-musculation.active { border-color: var(--color-type-musculation-text); background: var(--color-type-musculation-bg); color: var(--color-type-musculation-text); }
.type-athletisme.active { border-color: var(--color-type-athletisme-text); background: var(--color-type-athletisme-bg); color: var(--color-type-athletisme-text); }
.type-natation.active { border-color: var(--color-type-natation-text); background: var(--color-type-natation-bg); color: var(--color-type-natation-text); }

.jours { display: flex; gap: var(--spacing-sm); }
.jour-choix {
  min-height: 40px; padding: 0 var(--spacing-lg);
  border: 1px solid var(--color-border); border-radius: var(--radius-full);
  background: var(--color-bg); color: var(--color-text-secondary);
  font-family: inherit; font-size: var(--font-size-sm); font-weight: 600; cursor: pointer;
}
.jour-choix.active { background: var(--color-primary-light); border-color: var(--color-primary); color: var(--color-primary-text); }

.rpe-picker { display: flex; flex-wrap: wrap; gap: 6px; }
.rpe-btn {
  width: 40px; height: 40px;
  border-radius: var(--radius-md); border: 1px solid var(--color-border);
  background: var(--color-bg); font-family: inherit; font-weight: 700; cursor: pointer;
  transition: background var(--transition-fast), border-color var(--transition-fast), transform var(--transition-fast);
}
.rpe-btn:active { transform: scale(0.92); }
.rpe-btn.active { background: var(--gradient-primary-hover); border-color: var(--color-primary-dark); color: var(--color-on-primary); }
.rpe-label { margin: 0; font-size: var(--font-size-sm); font-weight: 600; color: var(--color-primary-text); }

.duree-ligne { display: flex; align-items: center; gap: var(--spacing-sm); flex-wrap: wrap; font-size: var(--font-size-sm); color: var(--color-text-secondary); }
.duree-ligne input { width: 96px; }
.duree-heures { font-size: var(--font-size-xs); }

.libre-note {
  display: flex; align-items: center; gap: 6px; margin: 0;
  font-size: var(--font-size-xs); color: var(--color-text-muted);
}
.libre-note .ti { color: var(--color-accent); }
@media (prefers-reduced-motion: reduce) {
  .type-choix:active, .rpe-btn:active { transform: none; }
}
</style>
