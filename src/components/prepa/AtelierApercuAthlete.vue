<template>
  <div class="telephone">
    <div class="tel-ecran">
      <header class="tel-entete">
        <div class="tel-programme">{{ brouillon.nom || 'Programme sans nom' }}</div>
        <div class="tel-semaine">Semaine {{ detail.numero }} <span>sur {{ brouillon.nbSemaines }}</span></div>
        <div class="tel-sous-titre">{{ sousTitre }}</div>
        <div class="tel-frise" aria-hidden="true">
          <span
            v-for="w in brouillon.nbSemaines"
            :key="w"
            class="frise-pas"
            :class="{ passee: w < detail.numero, courante: w === detail.numero, test: semainesDeTests.has(w) }"
          ><i v-if="semainesDeTests.has(w)" class="ti ti-flag-3"></i></span>
        </div>
      </header>

      <div class="tel-corps">
        <!-- Tests d'entrée en tête de semaine, tests de fin après les séances
             (cf. order en CSS). L'athlète y note lui-même ses résultats :
             les champs sont factices ici, pour montrer où il les saisira. -->
        <div v-if="detail.tests" class="tel-tests" :class="`tel-tests-${detail.tests.moment}`">
          <span class="tel-tests-icone"><i class="ti ti-flag-3"></i></span>
          <div class="tel-tests-info">
            <div class="tel-tests-titre">{{ detail.tests.moment === 'debut' ? "Tests d'entrée" : 'Tests de fin de cycle' }}</div>
            <ul v-if="detail.tests.liste.length" class="tel-tests-liste">
              <li v-for="t in detail.tests.liste" :key="t.cle">
                <span class="tel-test-nom">{{ t.nom }}</span>
                <span class="tel-test-champ"><span class="tel-test-saisie">résultat</span>{{ t.unite }}</span>
              </li>
            </ul>
            <p v-else class="tel-tests-note">Aucun test choisi.</p>
            <p class="tel-tests-note">
              {{ detail.tests.moment === 'debut'
                ? 'Note tes résultats : ils partent chez ton prépa et servent de point de départ.'
                : "Note tes résultats pour les comparer à tes tests d'entrée." }}
            </p>
          </div>
        </div>

        <div v-for="(s, i) in detail.seances" :key="s.cle" class="tel-seance">
          <button type="button" class="tel-seance-tete" @click="basculer(s.cle)">
            <span class="type-icone" :class="`type-icone-${typeSeance(s.type)}`">
              <i class="ti" :class="iconeTypeSeance(s.type)"></i>
            </span>
            <span class="tel-seance-info">
              <span class="tel-seance-num">Séance {{ i + 1 }}</span>
              <span class="tel-seance-nom">{{ s.nom || 'Séance sans nom' }}</span>
              <span class="tel-seance-meta">{{ s.exercices.length }} exercice{{ s.exercices.length > 1 ? 's' : '' }} · {{ libelleJour(s.jour) }}</span>
            </span>
            <i class="ti tel-chevron" :class="ouvertes.has(s.cle) ? 'ti-chevron-up' : 'ti-chevron-down'"></i>
          </button>
          <ul v-if="ouvertes.has(s.cle)" class="tel-exos">
            <li v-for="e in s.exercices" :key="e.cle">
              <span class="tel-exo-nom">{{ e.nom || 'Exercice sans nom' }}</span>
              <span class="tel-exo-prescrit">{{ resumePrescription(e.prescrit) || '—' }}</span>
            </li>
            <li v-if="s.exercices.length === 0" class="tel-exo-vide">Aucun exercice pour l'instant.</li>
          </ul>
        </div>

        <div v-if="!detail.tests && detail.seances.length === 0" class="tel-vide">
          <i class="ti ti-calendar-event"></i>
          Pas de séance prévue cette semaine.
        </div>

        <p class="tel-suite">
          <i class="ti" :class="estDerniere ? 'ti-trophy' : 'ti-lock-open'"></i>
          {{ estDerniere
            ? 'Dernière semaine du programme.'
            : `La semaine ${detail.numero + 1} se débloque quand tu as fait ${nbEtapes > 1 ? `tes ${nbEtapes} séances` : 'ta séance'}.` }}
        </p>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch } from 'vue'
import { typeSeance, iconeTypeSeance } from '../../data/typesSeance'
import { detailSemaine, semainesTest, resumePrescription, libelleJour } from '../../utils/programmeAtelier'

export default {
  props: {
    brouillon: { type: Object, required: true },
    semaine: { type: Number, default: 1 }
  },
  setup(props) {
    const numero = computed(() => Math.min(Math.max(1, props.semaine), props.brouillon.nbSemaines))
    const detail = computed(() => detailSemaine(props.brouillon, numero.value))
    const semainesDeTests = computed(() => semainesTest(props.brouillon))
    const estDerniere = computed(() => numero.value >= props.brouillon.nbSemaines)

    // Ce que l'athlète doit faire pour finir sa semaine : ses séances, plus
    // la séance de tests quand il y en a une.
    const nbEtapes = computed(() => detail.value.seances.length + (detail.value.tests ? 1 : 0))
    const sousTitre = computed(() => {
      const n = detail.value.seances.length
      const tests = detail.value.tests ? (n ? ' + tes tests' : 'Ta séance de tests') : ''
      if (!n) return tests || 'Semaine de repos'
      return `${n} séance${n > 1 ? 's' : ''}${tests}, à ton rythme`
    })

    // Première séance dépliée d'office : l'athlète voit tout de suite à quoi
    // ressemble une séance, sans chercher où cliquer.
    const ouvertes = ref(new Set())
    watch(() => detail.value.seances[0]?.cle, (cle) => { ouvertes.value = new Set(cle ? [cle] : []) }, { immediate: true })
    const basculer = (cle) => {
      const s = new Set(ouvertes.value)
      if (s.has(cle)) s.delete(cle)
      else s.add(cle)
      ouvertes.value = s
    }

    return {
      detail, semainesDeTests, estDerniere, nbEtapes, sousTitre, ouvertes, basculer,
      typeSeance, iconeTypeSeance, resumePrescription, libelleJour
    }
  }
}
</script>

<style scoped>
/* Cadre de téléphone : rappelle que c'est l'écran de l'athlète, pas celui du prépa. */
.telephone {
  width: 100%;
  max-width: 380px;
  margin: 0 auto;
  padding: 10px;
  border-radius: 36px;
  /* Même cadre sombre dans les deux thèmes : c'est un objet, pas une surface. */
  background: #1b1934;
  box-shadow: var(--shadow-modal);
}
.tel-ecran {
  border-radius: 28px;
  overflow: hidden;
  background: var(--color-bg-app);
  min-height: 560px;
  display: flex;
  flex-direction: column;
}

.tel-entete {
  padding: var(--spacing-xl) var(--spacing-lg) var(--spacing-lg);
  background: var(--gradient-primary);
  color: var(--color-on-primary);
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.tel-programme { font-size: var(--font-size-xs); font-weight: 600; opacity: 0.85; text-transform: uppercase; letter-spacing: 0.4px; }
.tel-semaine { font-size: var(--font-size-xl); font-weight: 700; letter-spacing: -0.3px; }
.tel-semaine span { font-size: var(--font-size-base); font-weight: 500; opacity: 0.85; }
.tel-sous-titre { font-size: var(--font-size-sm); opacity: 0.85; }
/* Marge haute pour loger les drapeaux des semaines de tests au-dessus de la frise. */
.tel-frise { display: flex; gap: 4px; margin-top: 26px; }
.frise-pas {
  flex: 1;
  height: 8px;
  border-radius: var(--radius-full);
  background: rgba(255, 255, 255, 0.28);
  position: relative;
  display: flex;
  justify-content: center;
}
.frise-pas.passee { background: rgba(255, 255, 255, 0.7); }
.frise-pas.courante { background: #fff; }
.frise-pas i { position: absolute; top: -18px; font-size: 13px; }

.tel-corps { flex: 1; padding: var(--spacing-md); display: flex; flex-direction: column; gap: var(--spacing-sm); }

.tel-tests {
  display: flex;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  border-radius: var(--radius-lg);
  background: var(--color-warning-bg-soft);
  border: 1px solid var(--color-warning-border);
}
/* Tests de fin : après les séances de la semaine */
.tel-tests-fin { order: 1; }
.tel-tests-icone {
  flex-shrink: 0;
  width: 36px; height: 36px; border-radius: var(--radius-md);
  display: flex; align-items: center; justify-content: center;
  background: var(--color-warning-bg); color: var(--color-warning-text-strong);
  font-size: 18px;
}
.tel-tests-info { flex: 1; min-width: 0; }
.tel-tests-titre { font-size: var(--font-size-base); font-weight: 700; color: var(--color-text); }
.tel-tests-liste { list-style: none; margin: var(--spacing-sm) 0 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
.tel-tests-liste li { display: flex; align-items: center; justify-content: space-between; gap: var(--spacing-sm); font-size: var(--font-size-sm); color: var(--color-text-body); }
.tel-test-nom { font-weight: 600; }
.tel-test-champ { display: inline-flex; align-items: center; gap: 4px; font-size: var(--font-size-xs); color: var(--color-text-muted); }
.tel-test-saisie {
  min-width: 72px; padding: 4px 8px; border-radius: var(--radius-sm);
  border: 1px dashed var(--color-warning-border); background: var(--color-bg);
  color: var(--color-text-muted); font-size: var(--font-size-xs); text-align: center;
}
.tel-tests-note { margin: var(--spacing-sm) 0 0; font-size: var(--font-size-xs); color: var(--color-warning-text-strong); }

.tel-seance {
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
  overflow: hidden;
}
.tel-seance-tete {
  width: 100%;
  display: flex; align-items: center; gap: var(--spacing-md);
  padding: var(--spacing-md);
  border: none; background: none; font-family: inherit; color: inherit; text-align: left; cursor: pointer;
}
.tel-seance-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.tel-seance-num { font-size: 11px; font-weight: 700; letter-spacing: 0.4px; text-transform: uppercase; color: var(--color-text-muted); }
.tel-seance-nom { font-size: var(--font-size-base); font-weight: 600; color: var(--color-text); }
.tel-seance-meta { font-size: var(--font-size-xs); color: var(--color-text-secondary); }
.tel-chevron { color: var(--color-text-muted); flex-shrink: 0; }
.tel-exos {
  list-style: none; margin: 0; padding: 0 var(--spacing-md) var(--spacing-md);
  display: flex; flex-direction: column; gap: 6px;
}
.tel-exos li {
  display: flex; flex-direction: column; gap: 1px;
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius-md);
  background: var(--color-bg-app);
}
.tel-exo-nom { font-size: var(--font-size-sm); font-weight: 600; color: var(--color-text); }
.tel-exo-prescrit { font-size: var(--font-size-sm); color: var(--color-primary-dark); font-weight: 500; }
.tel-exo-vide { color: var(--color-text-muted); font-size: var(--font-size-sm); }

.tel-vide {
  margin: auto;
  display: flex; flex-direction: column; align-items: center; gap: var(--spacing-sm);
  padding: var(--spacing-2xl);
  color: var(--color-text-muted); font-size: var(--font-size-sm); text-align: center;
}
.tel-vide i { font-size: 28px; }

.tel-suite {
  order: 2;
  margin: auto 0 0;
  display: flex; align-items: center; gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  font-size: var(--font-size-xs); color: var(--color-text-secondary);
}
.tel-suite .ti { font-size: var(--font-size-base); color: var(--color-primary); }
</style>
