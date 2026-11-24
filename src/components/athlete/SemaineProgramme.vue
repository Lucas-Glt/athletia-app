<template>
  <!-- Programme créé dans l'Atelier : l'athlète voit sa semaine en cours. La
       suivante s'ouvre quand tout est fait (séances validées, tests notés),
       ou quand il choisit de la passer. -->
  <section class="semaine-programme" :class="{ termine: courante === null }">
    <div class="semaine-entete">
      <div v-if="courante !== null" class="semaine-titre">
        Semaine {{ courante }} <small>sur {{ derniere }}</small>
      </div>
      <div v-else class="semaine-titre"><i class="ti ti-trophy"></i> Programme terminé</div>
      <ol class="semaine-pastilles" aria-label="Semaines du programme">
        <li
          v-for="s in semaines"
          :key="s.numero"
          class="pastille"
          :class="{ faite: s.faite, passee: s.passee && !s.faite, courante: s.numero === courante, test: s.test }"
          :title="titrePastille(s)"
        >
          <i v-if="s.faite" class="ti ti-check" aria-hidden="true"></i>
          <i v-else-if="s.passee" class="ti ti-player-skip-forward" aria-hidden="true"></i>
          <template v-else>{{ s.numero }}</template>
          <span class="sr-only">{{ titrePastille(s) }}</span>
        </li>
      </ol>
    </div>

    <p v-if="courante === null" class="semaine-texte">
      Bravo, tu as fait tout le programme ! Tes séances de la dernière semaine restent disponibles ci-dessous.
    </p>

    <!-- Tests de la semaine : l'athlète note ses résultats -->
    <div v-if="tests.length" class="semaine-tests">
      <div class="tests-titre"><i class="ti ti-flag-3"></i> Tests de la semaine</div>
      <p class="semaine-texte">Passe ces tests quand tu veux cette semaine et note tes résultats : ton prépa les voit aussitôt.</p>
      <form v-for="t in tests" :key="t.id" class="test-ligne" @submit.prevent="enregistrer(t)">
        <label :for="`test-${t.id}`" class="test-nom">
          {{ t.nom }}
          <span v-if="t.resultat && !enEdition[t.id]" class="test-fait"><i class="ti ti-circle-check"></i> noté</span>
        </label>
        <div v-if="t.resultat && !enEdition[t.id]" class="test-valeur">
          <strong>{{ formatValeur(t.resultat.valeur) }}</strong> {{ t.unite }}
          <button type="button" class="btn btn-sm btn-ghost" @click="modifier(t)">Modifier</button>
        </div>
        <div v-else class="test-saisie">
          <input
            :id="`test-${t.id}`"
            v-model="saisies[t.id]"
            inputmode="decimal"
            autocomplete="off"
            placeholder="0"
            :aria-label="`Résultat ${t.nom}${t.unite ? ` en ${t.unite}` : ''}`"
          />
          <span class="test-unite">{{ t.unite }}</span>
          <button class="btn btn-sm btn-primary" type="submit" :disabled="!saisies[t.id] || envoi">Noter</button>
        </div>
      </form>
    </div>

    <!-- Passer la semaine : séance ratée, blessure… -->
    <template v-if="courante !== null">
      <button v-if="!confirmation" type="button" class="btn btn-sm btn-ghost semaine-passer" @click="confirmation = true">
        <i class="ti ti-player-skip-forward"></i>
        {{ courante === derniere ? 'Terminer le programme' : 'Passer à la semaine suivante' }}
      </button>
      <div v-else class="semaine-confirmation" role="group" aria-label="Passer la semaine">
        <span>
          Ce qui n'est pas fait en semaine {{ courante }} le restera.
          {{ courante === derniere ? 'Terminer le programme maintenant ?' : `Passer à la semaine ${suivante} ?` }}
        </span>
        <div class="semaine-confirmation-actions">
          <button type="button" class="btn btn-sm" :disabled="envoi" @click="confirmation = false">Annuler</button>
          <button type="button" class="btn btn-sm btn-primary" :disabled="envoi" @click="passer">
            {{ courante === derniere ? 'Terminer' : 'Passer' }}
          </button>
        </div>
      </div>
    </template>
  </section>
</template>

<script>
import { computed, reactive, ref, watch } from 'vue'

export default {
  props: {
    // [{ numero, faite, passee, test }] dans l'ordre
    semaines: { type: Array, required: true },
    // Semaine en cours, null quand tout est fait ou passé
    courante: { type: Number, default: null },
    // Tests de la semaine en cours : [{ id, nom, unite, resultat }]
    tests: { type: Array, default: () => [] },
    envoi: { type: Boolean, default: false }
  },
  emits: ['passer', 'noter'],
  setup(props, { emit }) {
    const confirmation = ref(false)
    const saisies = reactive({})
    const enEdition = reactive({})
    const derniere = computed(() => props.semaines[props.semaines.length - 1]?.numero || 1)
    const suivante = computed(() => props.semaines.find(s => s.numero > props.courante && !s.faite && !s.passee)?.numero ?? props.courante + 1)

    // Nouvelle semaine : la confirmation et les saisies repartent de zéro.
    watch(() => props.courante, () => { confirmation.value = false })

    const titrePastille = (s) => {
      const etat = s.faite ? 'faite' : s.passee ? 'passée' : s.numero === props.courante ? 'en cours' : 'à venir'
      return `Semaine ${s.numero}${s.test ? ' (tests)' : ''} : ${etat}`
    }
    const formatValeur = (v) => Number(v).toLocaleString('fr-FR', { maximumFractionDigits: 2 })

    const enregistrer = (t) => {
      const valeur = parseFloat(String(saisies[t.id] ?? '').replace(',', '.'))
      if (!Number.isFinite(valeur)) return
      emit('noter', t.id, valeur, () => {
        saisies[t.id] = ''
        enEdition[t.id] = false
      })
    }
    const modifier = (t) => {
      saisies[t.id] = String(t.resultat.valeur).replace('.', ',')
      enEdition[t.id] = true
    }
    const passer = () => emit('passer', props.courante)

    return { confirmation, saisies, enEdition, derniere, suivante, titrePastille, formatValeur, enregistrer, modifier, passer }
  }
}
</script>

<style scoped>
.semaine-programme {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  padding: var(--spacing-md);
  margin-bottom: var(--spacing-md);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  background: var(--color-bg);
  box-shadow: var(--shadow-card);
}
.semaine-programme.termine { border-color: var(--color-primary-lighter); }
.semaine-entete { display: flex; align-items: center; justify-content: space-between; gap: var(--spacing-md); flex-wrap: wrap; }
.semaine-titre { display: flex; align-items: baseline; gap: 6px; font-size: var(--font-size-lg); font-weight: 700; color: var(--color-text); }
.semaine-titre small { font-size: var(--font-size-sm); font-weight: 500; color: var(--color-text-secondary); }
.semaine-titre .ti { color: var(--color-warning-icon); align-self: center; }

.semaine-pastilles { display: flex; flex-wrap: wrap; gap: 4px; margin: 0; padding: 0; list-style: none; }
.pastille {
  width: 26px;
  height: 26px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  font-size: 11px;
  font-weight: 700;
  color: var(--color-text-secondary);
  background: var(--color-bg-secondary);
  border: 1.5px solid var(--color-border);
}
.pastille.test { border-style: dashed; }
.pastille.faite { background: var(--color-valid-bg); border-color: var(--color-valid-bg-strong); color: var(--color-valid-text-strong); }
.pastille.passee { color: var(--color-text-muted); }
.pastille.courante { background: var(--color-primary); border-color: var(--color-primary); color: var(--color-on-primary); }

.semaine-texte { margin: 0; font-size: var(--font-size-sm); color: var(--color-text-secondary); line-height: 1.45; }

.semaine-tests {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  padding: var(--spacing-md);
  border-radius: var(--radius-md);
  background: var(--color-primary-light);
}
.tests-titre { display: flex; align-items: center; gap: 6px; font-weight: 700; color: var(--color-primary-text); }
.test-ligne { display: flex; align-items: center; justify-content: space-between; gap: var(--spacing-sm); flex-wrap: wrap; }
.test-nom { font-size: var(--font-size-sm); font-weight: 600; color: var(--color-text); display: flex; align-items: center; gap: 6px; }
.test-fait { font-size: var(--font-size-xs); font-weight: 600; color: var(--color-valid-text-strong); display: inline-flex; align-items: center; gap: 2px; }
.test-valeur { display: flex; align-items: center; gap: 6px; font-size: var(--font-size-sm); color: var(--color-text-body); }
.test-saisie { display: flex; align-items: center; gap: 6px; }
.test-saisie input {
  width: 96px;
  min-height: 40px;
  padding: 0 var(--spacing-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg);
  font-size: var(--font-size-base);
  text-align: right;
}
.test-unite { font-size: var(--font-size-sm); color: var(--color-text-secondary); min-width: 20px; }

.semaine-passer { align-self: flex-start; }
.semaine-confirmation {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius-md);
  background: var(--color-bg-secondary);
  font-size: var(--font-size-sm);
  color: var(--color-text-body);
}
.semaine-confirmation-actions { display: flex; gap: var(--spacing-xs); justify-content: flex-end; }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
</style>
