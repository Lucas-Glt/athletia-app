<template>
  <div class="planif">
    <!-- Où en est l'athlète -->
    <section class="planif-situation">
      <div v-if="situation.actuel || situation.suivant" class="situation-lignes">
        <div v-if="situation.actuel" class="situation-ligne">
          <span class="dev-pastille" :style="pastille(situation.actuel.developpement)">
            <i class="ti" :class="developpement(situation.actuel.developpement).icone"></i>
            {{ developpement(situation.actuel.developpement).label }}
          </span>
          <span class="situation-texte">
            semaine {{ situation.actuel.semaine }} sur {{ situation.actuel.nbSemaines }}
            · jusqu'au {{ formatDimanche(situation.actuel.fin) }}
          </span>
        </div>
        <div v-if="situation.suivant" class="situation-ligne situation-suivant">
          <span class="situation-texte">{{ situation.actuel ? 'Puis' : 'Prochain cycle :' }}</span>
          <span class="dev-pastille dev-pastille-douce" :style="pastille(situation.suivant.developpement, true)">
            <i class="ti" :class="developpement(situation.suivant.developpement).icone"></i>
            {{ developpement(situation.suivant.developpement).label }}
          </span>
          <span class="situation-texte">{{ formatDebutCycle(situation.suivant.debut) }}</span>
        </div>
      </div>
      <p v-else-if="!chargement" class="situation-vide">
        <i class="ti ti-calendar-stats"></i>
        <span>Aucune semaine planifiée. Choisissez une période dans la grille et donnez-lui un développement : vous serez prévenu une semaine avant chaque nouveau cycle.</span>
      </p>
      <button
        type="button"
        class="btn btn-sm btn-copier"
        :disabled="carteVide || autresAthletes.length === 0"
        :title="autresAthletes.length === 0 ? 'Aucun autre athlète dans votre cercle' : ''"
        @click="ouvrirCopie"
      >
        <i class="ti ti-copy"></i> Copier vers…
      </button>
    </section>

    <p v-if="erreurChargement" class="error" role="alert">{{ erreurChargement }}</p>

    <div class="planif-corps">
      <div class="planif-grille">
        <p class="planif-aide"><i class="ti ti-hand-finger"></i> Choisissez une semaine, puis une autre pour sélectionner toute une période.</p>
        <button type="button" class="btn btn-sm btn-ghost btn-mois" @click="decalerDebut(-6)">
          <i class="ti ti-chevron-up"></i> Mois précédents
        </button>
        <PlanificationGrille
          :semaines="carte"
          :premier-mois="premierMois"
          :nb-mois="nbMois"
          :choix="choixOrdonne"
          editable
          @choisir="choisirSemaine"
        />
        <button type="button" class="btn btn-sm btn-ghost btn-mois" @click="nbMois += 6">
          <i class="ti ti-chevron-down"></i> Mois suivants
        </button>
      </div>

      <section class="planif-cycles" v-if="cycles.length">
        <div class="section-title">Cycles</div>
        <PlanificationCycles :cycles="cycles" :en-cours="situation.actuel?.debut" editable @choisir="choisirCycle" />
      </section>
    </div>

    <!-- Période choisie : la palette, collée en bas de l'écran -->
    <section v-if="choixOrdonne" class="planif-panneau" aria-label="Période choisie">
      <div class="panneau-tete">
        <span>
          <strong>{{ nbChoisies }} semaine{{ nbChoisies > 1 ? 's' : '' }}</strong>
          {{ formatPeriode(choixOrdonne.debut, choixOrdonne.fin) }}
        </span>
        <button type="button" class="btn btn-icon btn-sm" aria-label="Annuler la sélection" @click="choix = null">
          <i class="ti ti-x"></i>
        </button>
      </div>
      <p class="panneau-aide" v-if="choix.ancre">Touchez une autre semaine pour étendre la période, ou choisissez son développement :</p>
      <div class="palette">
        <button
          v-for="d in DEVELOPPEMENTS"
          :key="d.cle"
          type="button"
          class="palette-dev"
          :style="{ background: d.couleur, color: d.texte }"
          :disabled="occupe"
          @click="appliquer(d.cle)"
        >
          <i class="ti" :class="d.icone"></i> {{ d.court }}
        </button>
        <button v-if="choixContientPlanifie" type="button" class="palette-dev palette-effacer" :disabled="occupe" @click="appliquer(null)">
          <i class="ti ti-eraser"></i> Effacer
        </button>
      </div>
      <p v-if="erreur" class="error panneau-erreur" role="alert">{{ erreur }}</p>
    </section>

    <!-- Copier toute la planification vers d'autres athlètes du cercle -->
    <div v-if="copie.ouverte" class="modal-overlay" @click.self="copie.ouverte = false">
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="titre-copie">
        <div class="modal-header">
          <h3 id="titre-copie">Copier la planification</h3>
          <button class="modal-close" aria-label="Fermer" @click="copie.ouverte = false"><i class="ti ti-x"></i></button>
        </div>
        <div class="modal-body">
          <p class="copie-explication">
            Les semaines {{ formatPeriode(cycles[0].debut, cycles[cycles.length - 1].fin) }} remplacent celles des athlètes choisis sur cette période.
            Chacun garde ensuite sa propre planification, modifiable à part.
          </p>
          <div class="copie-groupes" v-if="groupesUtiles.length">
            <button
              v-for="g in groupesUtiles"
              :key="g.id"
              type="button"
              class="copie-groupe"
              :class="{ active: groupeComplet(g) }"
              @click="basculerGroupe(g)"
            >
              <span class="groupe-dot" :style="{ background: g.couleur || 'var(--color-primary)' }"></span>
              {{ g.nom }}
            </button>
          </div>
          <div class="copie-liste">
            <label v-for="a in autresAthletes" :key="a.id" class="copie-athlete">
              <input type="checkbox" :checked="copie.cibles.has(a.id)" @change="basculerCible(a.id)" />
              <span>{{ a.nom }}</span>
            </label>
          </div>
          <p v-if="copie.erreur" class="error" role="alert">{{ copie.erreur }}</p>
        </div>
        <div class="modal-footer">
          <button class="btn" @click="copie.ouverte = false">Annuler</button>
          <button class="btn btn-primary" :disabled="copie.cibles.size === 0 || copie.envoi" @click="copier">
            <i class="ti ti-copy"></i>
            Copier{{ copie.cibles.size ? ` vers ${copie.cibles.size} athlète${copie.cibles.size > 1 ? 's' : ''}` : '' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { computed, reactive, ref } from 'vue'
import { useApi } from '../../services/api'
import { useActionUnique } from '../../utils/actionUnique'
import { afficherToast } from '../../composables/useToast'
import { DEVELOPPEMENTS, developpement } from '../../data/developpements'
import PlanificationGrille from '../PlanificationGrille.vue'
import PlanificationCycles from '../PlanificationCycles.vue'
import {
  carteSemaines, cyclesDe, formatDebutCycle, formatDimanche, formatPeriode, nbSemaines, premierDuMois, situationCycle
} from '../../utils/planification'

export default {
  components: { PlanificationGrille, PlanificationCycles },
  emits: ['modifie'],
  props: {
    athlete: { type: Object, required: true },
    monCercle: { type: Array, default: () => [] },
    groupes: { type: Array, default: () => [] }
  },
  setup(props, { emit }) {
    const api = useApi()
    const { occupe, erreur, executer } = useActionUnique()

    const carte = ref({})
    const chargement = ref(true)
    const erreurChargement = ref('')
    const charger = async () => {
      try {
        carte.value = carteSemaines((await api.get(`/planification/athletes/${props.athlete.id}`)).semaines)
      } catch (e) {
        erreurChargement.value = e?.message || "La planification n'a pas pu être chargée."
      } finally {
        chargement.value = false
      }
    }
    charger()

    const cycles = computed(() => cyclesDe(carte.value))
    const situation = computed(() => situationCycle(carte.value))
    const carteVide = computed(() => cycles.value.length === 0)

    // Douze mois à partir du mois dernier : un peu de ce qui vient de se
    // passer, surtout la saison à venir. Extensible des deux côtés.
    const premierMois = ref(premierDuMois(new Date(), -1))
    const nbMois = ref(13)
    const decalerDebut = (n) => {
      premierMois.value = premierDuMois(premierMois.value, n)
      nbMois.value -= n
    }

    // Premier toucher : une semaine (déjà applicable). Deuxième : la période
    // jusqu'à cette semaine. Toucher encore repart d'une nouvelle semaine.
    const choix = ref(null)
    const choixOrdonne = computed(() => {
      if (!choix.value) return null
      const [debut, fin] = [choix.value.debut, choix.value.fin].sort()
      return { debut, fin }
    })
    const nbChoisies = computed(() => choixOrdonne.value ? nbSemaines(choixOrdonne.value.debut, choixOrdonne.value.fin) : 0)
    const choixContientPlanifie = computed(() =>
      !!choixOrdonne.value && Object.keys(carte.value).some(l => choixOrdonne.value.debut <= l && l <= choixOrdonne.value.fin)
    )
    const choisirSemaine = (lundi) => {
      if (choix.value?.ancre && lundi !== choix.value.debut) choix.value = { debut: choix.value.debut, fin: lundi, ancre: false }
      else choix.value = { debut: lundi, fin: lundi, ancre: true }
      erreur.value = ''
    }
    const choisirCycle = (c) => {
      choix.value = { debut: c.debut, fin: c.fin, ancre: false }
      erreur.value = ''
    }

    const appliquer = (cle) => executer(async () => {
      const { debut, fin } = choixOrdonne.value
      const reponse = await api.put(`/planification/athletes/${props.athlete.id}`, { debut, fin, developpement: cle })
      carte.value = carteSemaines(reponse.semaines)
      choix.value = null
      // La liste du prépa affiche le cycle en cours et le prochain
      emit('modifie')
    })

    // --- Copie ---
    const autresAthletes = computed(() => props.monCercle.filter(a => a.id !== props.athlete.id))
    const groupesUtiles = computed(() =>
      props.groupes
        .map(g => ({ ...g, ids: g.athletes.map(a => a.id).filter(id => id !== props.athlete.id) }))
        .filter(g => g.ids.length > 0)
    )
    const copie = reactive({ ouverte: false, cibles: new Set(), envoi: false, erreur: '' })
    const ouvrirCopie = () => {
      Object.assign(copie, { ouverte: true, cibles: new Set(), envoi: false, erreur: '' })
    }
    const basculerCible = (id) => {
      const cibles = new Set(copie.cibles)
      if (cibles.has(id)) cibles.delete(id)
      else cibles.add(id)
      copie.cibles = cibles
    }
    const groupeComplet = (g) => g.ids.every(id => copie.cibles.has(id))
    const basculerGroupe = (g) => {
      const cibles = new Set(copie.cibles)
      const retirer = groupeComplet(g)
      g.ids.forEach(id => (retirer ? cibles.delete(id) : cibles.add(id)))
      copie.cibles = cibles
    }
    const copier = async () => {
      if (copie.envoi) return
      copie.envoi = true
      copie.erreur = ''
      try {
        const { copies } = await api.post(`/planification/athletes/${props.athlete.id}/copier`, { athlete_ids: [...copie.cibles] })
        copie.ouverte = false
        afficherToast(`Planification copiée vers ${copies} athlète${copies > 1 ? 's' : ''}`)
        emit('modifie')
      } catch (e) {
        copie.erreur = e?.message || "La copie n'a pas pu être faite."
      } finally {
        copie.envoi = false
      }
    }

    const pastille = (cle, douce = false) => {
      const d = developpement(cle)
      return douce
        ? { background: `${d.couleur}22`, color: 'var(--color-text)', borderColor: d.couleur }
        : { background: d.couleur, color: d.texte }
    }

    return {
      DEVELOPPEMENTS, developpement, pastille, formatPeriode, formatDebutCycle, formatDimanche,
      carte, chargement, erreurChargement, cycles, situation, carteVide,
      premierMois, nbMois, decalerDebut,
      choix, choixOrdonne, nbChoisies, choixContientPlanifie, choisirSemaine, choisirCycle,
      occupe, erreur, appliquer,
      autresAthletes, groupesUtiles, copie, ouvrirCopie, basculerCible, groupeComplet, basculerGroupe, copier
    }
  }
}
</script>

<style scoped>
.planif { display: flex; flex-direction: column; gap: var(--spacing-lg); }

/* --- Situation --- */
.planif-situation {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--spacing-sm) var(--spacing-md);
  padding: var(--spacing-md) var(--spacing-lg);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}
.situation-lignes { flex: 1; min-width: 220px; display: flex; flex-direction: column; gap: var(--spacing-sm); }
.situation-ligne { display: flex; flex-wrap: wrap; align-items: center; gap: 6px var(--spacing-sm); }
.situation-texte { font-size: var(--font-size-sm); color: var(--color-text-secondary); }
.situation-vide { margin: 0; display: flex; gap: var(--spacing-sm); font-size: var(--font-size-sm); color: var(--color-text-secondary); flex: 1; min-width: 220px; }
.situation-vide i { font-size: 20px; color: var(--color-primary); flex-shrink: 0; }
.btn-copier { margin-left: auto; }
.dev-pastille {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 10px;
  border-radius: var(--radius-full);
  border: 1px solid transparent;
  font-size: var(--font-size-sm);
  font-weight: 700;
}

/* --- Grille + cycles --- */
.planif-corps { display: flex; flex-direction: column; gap: var(--spacing-lg); }
.planif-grille { display: flex; flex-direction: column; gap: var(--spacing-sm); max-width: 560px; }
.planif-aide { margin: 0; font-size: var(--font-size-xs); color: var(--color-text-muted); display: flex; align-items: center; gap: 6px; }
.btn-mois { align-self: center; }

.planif-cycles { display: flex; flex-direction: column; gap: var(--spacing-sm); }

/* --- Palette de la période choisie --- */
.planif-panneau {
  position: sticky;
  bottom: 0;
  z-index: 5;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  padding: var(--spacing-md);
  margin: 0 calc(-1 * var(--spacing-xs));
  background: var(--color-bg);
  border: 1px solid var(--color-primary-lighter);
  border-radius: var(--radius-lg);
  box-shadow: 0 -6px 24px -8px rgba(31, 25, 84, 0.25);
}
.panneau-tete { display: flex; align-items: center; justify-content: space-between; gap: var(--spacing-sm); font-size: var(--font-size-sm); color: var(--color-text-secondary); }
.panneau-tete strong { color: var(--color-text); margin-right: 4px; }
.panneau-aide { margin: 0; font-size: var(--font-size-xs); color: var(--color-text-muted); }
.palette { display: flex; flex-wrap: wrap; gap: 6px; }
.palette-dev {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-height: 36px;
  padding: 0 12px;
  border: none;
  border-radius: var(--radius-full);
  font: inherit;
  font-size: var(--font-size-xs);
  font-weight: 700;
  cursor: pointer;
}
.palette-dev:disabled { opacity: 0.5; cursor: wait; }
.palette-dev:focus-visible { outline: 2px solid var(--color-text); outline-offset: 2px; }
.palette-effacer { background: var(--color-bg-tertiary); color: var(--color-text-secondary); border: 1px dashed var(--color-border-strong); }
.panneau-erreur { margin: 0; }

/* --- Copie --- */
.copie-explication { margin: 0; font-size: var(--font-size-sm); color: var(--color-text-secondary); }
.copie-groupes { display: flex; flex-wrap: wrap; gap: 6px; }
.copie-liste { display: flex; flex-direction: column; }
.copie-groupe {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  background: var(--color-bg);
  font: inherit;
  font-size: var(--font-size-xs);
  font-weight: 600;
  color: var(--color-text-secondary);
  cursor: pointer;
}
.copie-groupe.active { border-color: var(--color-primary); background: var(--color-primary-light); color: var(--color-primary-dark); }
.groupe-dot { width: 8px; height: 8px; border-radius: 50%; }
.copie-athlete {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) 0;
  border-bottom: 1px solid var(--color-border);
  font-size: var(--font-size-sm);
  cursor: pointer;
}
.copie-athlete input { width: 18px; height: 18px; accent-color: var(--color-primary); }

@media (min-width: 1024px) {
  .planif-corps { flex-direction: row; align-items: flex-start; gap: var(--spacing-2xl); }
  .planif-grille { flex: 0 1 560px; }
  .planif-cycles { flex: 1; min-width: 0; position: sticky; top: var(--spacing-lg); }
}
</style>
