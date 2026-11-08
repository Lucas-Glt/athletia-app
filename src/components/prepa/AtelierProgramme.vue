<template>
  <!-- Le swipe d'onglets du dashboard est coupé ici : la grille de la vue
       d'ensemble défile horizontalement sur mobile. -->
  <div class="atelier" @pointerdown.stop @pointerup.stop @pointercancel.stop>
    <div class="atelier-entete">
      <div>
        <h2 class="atelier-titre">Atelier de programme <span class="badge-beta">bêta</span></h2>
        <p class="atelier-sous-titre">
          Prototype pour essayer une nouvelle façon de construire un programme. Rien n'est enregistré sur le
          serveur ni envoyé aux athlètes : le brouillon reste sur cet appareil.
        </p>
      </div>
      <div class="atelier-actions">
        <button class="btn" @click="chargerExemple"><i class="ti ti-sparkles"></i> Exemple</button>
        <button class="btn btn-ghost" @click="repartirDeZero"><i class="ti ti-refresh"></i> Page blanche</button>
      </div>
    </div>

    <div v-if="exempleCharge" class="bandeau-exemple">
      <i class="ti ti-sparkles"></i>
      <span>
        Un exemple est chargé pour voir le principe : 6 semaines, tests en S1 et S6, séances qui progressent
        seules, travail de vitesse qui change en S4. Modifie-le librement.
      </span>
      <button type="button" class="btn-fermer" @click="exempleCharge = false" aria-label="Masquer"><i class="ti ti-x"></i></button>
    </div>

    <nav class="etapes">
      <button
        v-for="(e, i) in ETAPES"
        :key="e.cle"
        type="button"
        class="etape-onglet"
        :class="{ active: etape === e.cle }"
        @click="etape = e.cle"
      >
        <span class="etape-num">{{ i + 1 }}</span>
        <span class="etape-label">{{ e.label }}</span>
      </button>
    </nav>

    <!-- 1. CADRE : durée, début, tests -->
    <section v-if="etape === 'cadre'" class="etape-contenu">
      <div class="bloc">
        <div class="field">
          <label for="atelier-nom">Nom du programme</label>
          <input id="atelier-nom" v-model="b.nom" placeholder="ex : Cycle force & vitesse" />
        </div>
        <div class="cadre-ligne">
          <div class="field">
            <label>Durée</label>
            <div class="compteur">
              <button type="button" class="btn btn-icon" :disabled="b.nbSemaines <= 1" @click="changerNbSemaines(-1)" aria-label="Une semaine de moins">
                <i class="ti ti-minus"></i>
              </button>
              <span class="compteur-valeur"><strong>{{ b.nbSemaines }}</strong> semaine{{ b.nbSemaines > 1 ? 's' : '' }}</span>
              <button type="button" class="btn btn-icon" :disabled="b.nbSemaines >= NB_SEMAINES_MAX" @click="changerNbSemaines(1)" aria-label="Une semaine de plus">
                <i class="ti ti-plus"></i>
              </button>
            </div>
          </div>
          <div class="field">
            <label for="atelier-debut">Début</label>
            <input id="atelier-debut" type="date" v-model="b.dateDebut" />
          </div>
        </div>
      </div>

      <div class="bloc">
        <h3 class="bloc-titre"><i class="ti ti-flag-3"></i> Tests</h3>
        <label class="interrupteur">
          <input type="checkbox" v-model="b.testsDebut" />
          <span><strong>En début de programme</strong> : la semaine 1 sert de point de départ.</span>
        </label>
        <label class="interrupteur">
          <input type="checkbox" v-model="b.testsFin" />
          <span><strong>En fin de programme</strong> : la dernière semaine mesure la progression.</span>
        </label>
        <template v-if="b.testsDebut || b.testsFin">
          <div class="field field-court">
            <label for="atelier-jour-tests">Jour des tests</label>
            <select id="atelier-jour-tests" v-model="b.jourTests">
              <option v-for="j in JOURS" :key="j" :value="j">{{ j }}</option>
            </select>
          </div>
          <div class="field">
            <label>Tests à passer</label>
            <div class="chips">
              <button
                v-for="t in testsCatalogue"
                :key="t.id"
                type="button"
                class="chip"
                :class="{ active: estTestChoisi(t.type_test) }"
                @click="basculerTest(t)"
              >
                <i class="ti" :class="estTestChoisi(t.type_test) ? 'ti-check' : 'ti-plus'"></i>
                {{ t.type_test }} <small v-if="t.unite">{{ t.unite }}</small>
              </button>
              <span v-for="t in testsLibres" :key="t.cle" class="chip active">
                {{ t.nom }} <small v-if="t.unite">{{ t.unite }}</small>
                <button type="button" class="chip-retirer" @click="retirerTest(t.cle)" :aria-label="`Retirer ${t.nom}`"><i class="ti ti-x"></i></button>
              </span>
            </div>
            <p class="aide">
              {{ testsCatalogue.length ? 'Tes tests de l\'onglet « Tests » sont proposés ci-dessus.' : 'Tes tests de l\'onglet « Tests » apparaîtront ici.' }}
              Tu peux aussi en saisir un autre :
            </p>
            <form class="test-libre" @submit.prevent="ajouterTestLibre">
              <input v-model="nouveauTest.nom" placeholder="ex : VMA" aria-label="Nom du test" />
              <input v-model="nouveauTest.unite" placeholder="Unité" class="input-unite" aria-label="Unité" />
              <button class="btn" type="submit" :disabled="!nouveauTest.nom.trim()">Ajouter</button>
            </form>
          </div>
        </template>
      </div>

      <div class="bloc">
        <h3 class="bloc-titre"><i class="ti ti-calendar-week"></i> Frise du programme</h3>
        <div class="frise">
          <div v-for="s in semaines" :key="s.numero" class="frise-semaine" :class="{ test: s.tests }">
            <span class="frise-num">S{{ s.numero }}</span>
            <span class="frise-date">{{ formatCourt(s.debut) }}</span>
            <span class="frise-contenu">
              <template v-if="s.tests"><i class="ti ti-flag-3"></i> Tests{{ s.seances.length ? ` + ${s.seances.length}` : '' }}</template>
              <template v-else>{{ s.seances.length }} séance{{ s.seances.length > 1 ? 's' : '' }}</template>
            </span>
          </div>
        </div>
      </div>

      <div class="etape-pied">
        <span></span>
        <button class="btn btn-primary" @click="etape = 'seances'">Les séances <i class="ti ti-arrow-right"></i></button>
      </div>
    </section>

    <!-- 2. SÉANCES : modèle + semaines + progression -->
    <section v-if="etape === 'seances'" class="etape-contenu">
      <div class="seances-disposition">
        <aside class="seances-liste">
          <button
            v-for="s in b.seances"
            :key="s.cle"
            type="button"
            class="seance-item"
            :class="{ active: s.cle === seanceCle }"
            @click="seanceCle = s.cle"
          >
            <span class="type-icone" :class="`type-icone-${typeSeance(s.type)}`"><i class="ti" :class="iconeTypeSeance(s.type)"></i></span>
            <span class="seance-item-info">
              <span class="seance-item-nom">{{ s.nom || 'Séance sans nom' }}</span>
              <span class="seance-item-meta"><span class="capitale">{{ s.jour }}</span> · {{ libelleSemaines(semainesSeance(s)) }}</span>
            </span>
          </button>
          <button class="btn btn-dashed" @click="ajouterSeance"><i class="ti ti-plus"></i> Ajouter une séance</button>
        </aside>

        <div v-if="seanceSel" class="bloc seance-editeur">
          <div class="field">
            <label for="atelier-seance-nom">Nom de la séance</label>
            <input id="atelier-seance-nom" v-model="seanceSel.nom" placeholder="ex : Force bas du corps" />
          </div>

          <div class="field">
            <label>Type</label>
            <div class="segments">
              <button
                v-for="t in CLES_TYPES_SEANCE"
                :key="t"
                type="button"
                class="segment"
                :class="{ active: seanceSel.type === t }"
                @click="seanceSel.type = t"
              >
                <i class="ti" :class="iconeTypeSeance(t)"></i> {{ labelTypeSeance(t) }}
              </button>
            </div>
          </div>

          <div class="field">
            <label>Jour</label>
            <div class="jours">
              <button
                v-for="j in JOURS"
                :key="j"
                type="button"
                class="jour"
                :class="{ active: seanceSel.jour === j }"
                :title="j"
                @click="seanceSel.jour = j"
              >{{ j.slice(0, 3) }}</button>
            </div>
          </div>

          <div class="field">
            <label>Semaines</label>
            <div class="chips">
              <button type="button" class="chip" :class="{ active: seanceSel.toutesSemaines }" @click="seanceSel.toutesSemaines = true">
                <i class="ti ti-repeat"></i> Toutes{{ semainesTestSet.size ? ' (hors tests)' : '' }}
              </button>
              <button
                v-for="w in b.nbSemaines"
                :key="w"
                type="button"
                class="semaine-chip"
                :class="{ active: semainesSeance(seanceSel).includes(w), test: semainesTestSet.has(w) }"
                :title="semainesTestSet.has(w) ? 'Semaine de tests' : null"
                @click="basculerSemaine(seanceSel, w)"
              ><i v-if="semainesTestSet.has(w)" class="ti ti-flag-3"></i>S{{ w }}</button>
            </div>
            <p class="aide">
              Une séance qui revient chaque semaine progresse toute seule. Pour un contenu différent selon la
              période, crée une variante et choisis ses semaines.
            </p>
          </div>

          <div class="exercices">
            <span class="section-title">Exercices</span>
            <div v-for="(e, i) in seanceSel.exercices" :key="e.cle" class="exercice">
              <div class="exercice-ligne">
                <span class="exercice-num">{{ i + 1 }}</span>
                <ExerciceAutocomplete v-model="e.nom" placeholder="Nom de l'exercice" @select="item => { e.catalogueId = item?.id ?? null }" />
                <div class="exercice-outils">
                  <button type="button" class="btn-outil" :disabled="i === 0" @click="deplacerExercice(seanceSel, i, -1)" aria-label="Monter"><i class="ti ti-arrow-up"></i></button>
                  <button type="button" class="btn-outil" :disabled="i === seanceSel.exercices.length - 1" @click="deplacerExercice(seanceSel, i, 1)" aria-label="Descendre"><i class="ti ti-arrow-down"></i></button>
                  <button type="button" class="btn-outil danger" @click="seanceSel.exercices.splice(i, 1)" aria-label="Supprimer l'exercice"><i class="ti ti-trash"></i></button>
                </div>
              </div>
              <div class="prescription">
                <label class="mini mini-court"><span>Séries</span><input v-model.number="e.series" type="number" min="1" inputmode="numeric" /></label>
                <span class="prescription-sep">×</span>
                <label class="mini"><span>{{ champs.volume }}</span><input v-model="e.volume" :placeholder="champs.exVolume" /></label>
                <span class="prescription-sep">@</span>
                <label class="mini"><span>{{ champs.intensite }}</span><input v-model="e.intensite" :placeholder="champs.exIntensite" /></label>
                <label class="mini"><span>Repos</span><input v-model="e.repos" placeholder="2 min" /></label>
              </div>
              <div class="progression">
                <i class="ti ti-trending-up"></i>
                <span class="progression-label">Progression</span>
                <select :value="e.progression" @change="changerProgression(e, $event.target.value)" aria-label="Progression">
                  <option v-for="p in PROGRESSIONS" :key="p" :value="p">
                    {{ p === 'aucune' ? 'Aucune' : `+ ${labelProgression(p, seanceSel.type).toLowerCase()}` }}
                  </option>
                </select>
                <template v-if="e.progression !== 'aucune'">
                  <input v-model="e.pas" class="input-pas" inputmode="decimal" aria-label="Pas de progression" />
                  <span>par semaine</span>
                </template>
                <span v-if="apercuProgression(seanceSel, e)" class="progression-apercu">{{ apercuProgression(seanceSel, e) }}</span>
              </div>
            </div>
            <button class="btn btn-dashed" @click="ajouterExercice(seanceSel)"><i class="ti ti-plus"></i> Ajouter un exercice</button>
          </div>

          <div class="editeur-pied">
            <button class="btn" @click="dupliquerSeance(seanceSel)"><i class="ti ti-copy"></i> Créer une variante</button>
            <button class="btn btn-ghost btn-supprimer" @click="supprimerSeance(seanceSel)"><i class="ti ti-trash"></i> Supprimer la séance</button>
          </div>
        </div>
        <div v-else class="bloc empty">Ajoute une première séance pour commencer.</div>
      </div>

      <div class="etape-pied">
        <button class="btn btn-ghost" @click="etape = 'cadre'"><i class="ti ti-arrow-left"></i> Cadre</button>
        <button class="btn btn-primary" @click="etape = 'ensemble'">Vue d'ensemble <i class="ti ti-arrow-right"></i></button>
      </div>
    </section>

    <!-- 3. VUE D'ENSEMBLE : semaines × jours -->
    <section v-if="etape === 'ensemble'" class="etape-contenu">
      <div class="bloc">
        <div class="grille-defile">
          <div class="grille">
            <div class="grille-coin"></div>
            <div v-for="j in JOURS" :key="j" class="grille-jour">{{ j.slice(0, 3) }}</div>
            <template v-for="s in semaines" :key="s.numero">
              <div class="grille-semaine" :class="{ test: s.tests }">
                <strong>S{{ s.numero }}</strong>
                <small>{{ formatCourt(s.debut) }}</small>
              </div>
              <div v-for="j in JOURS" :key="j" class="grille-case" :class="{ 'case-test': s.tests }">
                <span v-if="s.tests && s.tests.jour === j" class="puce puce-test"><i class="ti ti-flag-3"></i><span>Tests</span></span>
                <button
                  v-for="se in seancesDuJour(s, j)"
                  :key="se.cle"
                  type="button"
                  class="puce"
                  :class="`puce-${typeSeance(se.type)}`"
                  :title="se.nom"
                  @click="ouvrirSeance(se.cle)"
                ><i class="ti" :class="iconeTypeSeance(se.type)"></i><span>{{ se.nom || 'Séance' }}</span></button>
              </div>
            </template>
          </div>
        </div>
        <p class="aide">Clique sur une séance pour la modifier.</p>
      </div>

      <div class="bloc">
        <h3 class="bloc-titre"><i class="ti ti-list-check"></i> Vérifications</h3>
        <ul v-if="points.length" class="points">
          <li v-for="(p, i) in points" :key="i"><i class="ti ti-alert-triangle"></i> {{ p }}</li>
        </ul>
        <p v-else class="points-ok"><i class="ti ti-circle-check"></i> Structure complète : chaque semaine a son contenu.</p>
      </div>

      <div class="etape-pied">
        <button class="btn btn-ghost" @click="etape = 'seances'"><i class="ti ti-arrow-left"></i> Séances</button>
        <button class="btn btn-primary" @click="etape = 'athlete'">Aperçu athlète <i class="ti ti-arrow-right"></i></button>
      </div>
    </section>

    <!-- 4. APERÇU ATHLÈTE -->
    <section v-if="etape === 'athlete'" class="etape-contenu">
      <div class="apercu-disposition">
        <div class="bloc apercu-controles">
          <h3 class="bloc-titre"><i class="ti ti-device-mobile"></i> Ce que voit l'athlète</h3>
          <p class="aide-texte">
            Chaque semaine, l'athlète ne voit que les séances de sa semaine, avec les charges déjà calculées par la
            progression. Les semaines de tests sont mises en avant.
          </p>
          <div class="semaine-nav">
            <button class="btn btn-icon" :disabled="semaineApercu <= 1" @click="semaineApercu--" aria-label="Semaine précédente"><i class="ti ti-chevron-left"></i></button>
            <span class="semaine-nav-label">Semaine {{ semaineApercu }} <small>sur {{ b.nbSemaines }}</small></span>
            <button class="btn btn-icon" :disabled="semaineApercu >= b.nbSemaines" @click="semaineApercu++" aria-label="Semaine suivante"><i class="ti ti-chevron-right"></i></button>
          </div>
          <div class="chips">
            <button
              v-for="w in b.nbSemaines"
              :key="w"
              type="button"
              class="semaine-chip"
              :class="{ active: w === semaineApercu, test: semainesTestSet.has(w) }"
              @click="semaineApercu = w"
            ><i v-if="semainesTestSet.has(w)" class="ti ti-flag-3"></i>S{{ w }}</button>
          </div>
          <p class="aide" v-if="semaineDuJourCourante >= 1 && semaineDuJourCourante <= b.nbSemaines">
            Aujourd'hui, l'athlète serait en semaine {{ semaineDuJourCourante }}.
          </p>
          <p class="aide" v-else-if="semaineDuJourCourante === 0">
            Le programme n'a pas commencé : l'athlète verra la semaine 1 à partir du {{ formatLong(lundiDebut) }}.
          </p>
          <div class="suite">
            <i class="ti ti-bulb"></i>
            <span>
              Si cette façon de construire te convient, l'étape suivante sera d'enregistrer le programme, de l'assigner à
              des athlètes et d'adapter leur appli pour qu'elle suive les semaines.
            </span>
          </div>
        </div>
        <AtelierApercuAthlete :brouillon="b" :semaine="semaineApercu" />
      </div>

      <div class="etape-pied">
        <button class="btn btn-ghost" @click="etape = 'ensemble'"><i class="ti ti-arrow-left"></i> Vue d'ensemble</button>
        <span></span>
      </div>
    </section>
  </div>
</template>

<script>
import { ref, computed, watch, onMounted } from 'vue'
import { useApi } from '../../services/api'
import ExerciceAutocomplete from './ExerciceAutocomplete.vue'
import AtelierApercuAthlete from './AtelierApercuAthlete.vue'
import { CLES_TYPES_SEANCE, typeSeance, labelTypeSeance, iconeTypeSeance } from '../../data/typesSeance'
import {
  JOURS, NB_SEMAINES_MAX, PROGRESSIONS, champsType, labelProgression, nouvelleCle,
  lundiSemaine, semaineDuJour, semainesTest, semainesDeSeance, libelleSemaines,
  prescriptionSemaine, toutesLesSemaines, pointsAttention,
  nouvelExercice, nouvelleSeance, nouveauBrouillon, exempleBrouillon
} from '../../utils/programmeAtelier'

const ETAPES = [
  { cle: 'cadre', label: 'Cadre' },
  { cle: 'seances', label: 'Séances' },
  { cle: 'ensemble', label: "Vue d'ensemble" },
  { cle: 'athlete', label: 'Aperçu athlète' }
]

// Brouillon gardé sur l'appareil uniquement (prototype). Un stockage
// indisponible (navigation privée) ne doit pas empêcher d'essayer l'atelier.
const CLE_STOCKAGE = 'athletia.atelier.brouillon'
const lireBrouillon = () => {
  try {
    const brouillon = JSON.parse(localStorage.getItem(CLE_STOCKAGE))
    return brouillon?.version === 1 ? brouillon : null
  } catch {
    return null
  }
}
const ecrireBrouillon = (brouillon) => {
  try {
    localStorage.setItem(CLE_STOCKAGE, JSON.stringify(brouillon))
  } catch {
    // stockage indisponible : le brouillon vivra le temps de la page
  }
}

export default {
  components: { ExerciceAutocomplete, AtelierApercuAthlete },
  setup() {
    const api = useApi()

    // Première visite : un exemple complet plutôt qu'une page blanche, pour
    // voir le principe avant de construire le sien.
    const sauvegarde = lireBrouillon()
    const b = ref(sauvegarde || exempleBrouillon())
    const exempleCharge = ref(!sauvegarde)
    watch(b, ecrireBrouillon, { deep: true })

    const etape = ref('cadre')

    // --- Cadre ---
    const changerNbSemaines = (delta) => {
      b.value.nbSemaines = Math.min(NB_SEMAINES_MAX, Math.max(1, b.value.nbSemaines + delta))
    }

    const testsCatalogue = ref([])
    onMounted(async () => {
      try {
        testsCatalogue.value = await api.get('/tests/')
      } catch {
        testsCatalogue.value = []
      }
    })
    const estTestChoisi = (nom) => b.value.tests.some(t => t.nom === nom)
    const basculerTest = (t) => {
      if (estTestChoisi(t.type_test)) b.value.tests = b.value.tests.filter(x => x.nom !== t.type_test)
      else b.value.tests.push({ cle: nouvelleCle(), nom: t.type_test, unite: t.unite })
    }
    // Choisis dans le brouillon mais absents de l'onglet Tests (saisis ici,
    // ou exemple) : affichés à part, avec une croix pour les retirer.
    const testsLibres = computed(() => b.value.tests.filter(t => !testsCatalogue.value.some(c => c.type_test === t.nom)))
    const retirerTest = (cle) => { b.value.tests = b.value.tests.filter(t => t.cle !== cle) }
    const nouveauTest = ref({ nom: '', unite: '' })
    const ajouterTestLibre = () => {
      const nom = nouveauTest.value.nom.trim()
      if (!nom || estTestChoisi(nom)) return
      b.value.tests.push({ cle: nouvelleCle(), nom, unite: nouveauTest.value.unite.trim() })
      nouveauTest.value = { nom: '', unite: '' }
    }

    const semaines = computed(() => toutesLesSemaines(b.value))
    const semainesTestSet = computed(() => semainesTest(b.value))

    // --- Séances ---
    const seanceCle = ref(b.value.seances[0]?.cle || null)
    const seanceSel = computed(() => b.value.seances.find(s => s.cle === seanceCle.value) || null)
    const champs = computed(() => champsType(seanceSel.value?.type))
    const semainesSeance = (s) => semainesDeSeance(b.value, s)

    const ajouterSeance = () => {
      const s = nouvelleSeance(b.value)
      b.value.seances.push(s)
      seanceCle.value = s.cle
      etape.value = 'seances'
    }

    // Variante : même contenu, à placer sur d'autres semaines. C'est le
    // moyen d'avoir des séances différentes selon la période.
    const dupliquerSeance = (s) => {
      const copie = JSON.parse(JSON.stringify(s))
      copie.cle = nouvelleCle()
      copie.nom = `${s.nom} (variante)`
      copie.exercices.forEach(e => { e.cle = nouvelleCle() })
      b.value.seances.splice(b.value.seances.indexOf(s) + 1, 0, copie)
      seanceCle.value = copie.cle
    }

    const supprimerSeance = (s) => {
      if (!confirm(`Supprimer la séance « ${s.nom || 'sans nom'} » ?`)) return
      const idx = b.value.seances.indexOf(s)
      b.value.seances.splice(idx, 1)
      seanceCle.value = (b.value.seances[idx] || b.value.seances[idx - 1])?.cle || null
    }

    // Cocher une semaine fait passer en choix manuel, en partant des
    // semaines actuelles : rien ne disparaît sous les yeux du prépa.
    const basculerSemaine = (s, w) => {
      const actuelles = semainesDeSeance(b.value, s)
      s.toutesSemaines = false
      s.semaines = actuelles.includes(w) ? actuelles.filter(x => x !== w) : [...actuelles, w].sort((x, y) => x - y)
    }

    const ajouterExercice = (s) => { s.exercices.push(nouvelExercice(s.type)) }
    const deplacerExercice = (s, i, sens) => {
      const j = i + sens
      if (j < 0 || j >= s.exercices.length) return
      const [exo] = s.exercices.splice(i, 1)
      s.exercices.splice(j, 0, exo)
    }
    const changerProgression = (e, valeur) => {
      e.progression = valeur
      if (valeur === 'aucune') e.pas = 0
      else if (!Number(String(e.pas).replace(',', '.'))) e.pas = valeur === 'intensite' ? '2,5' : '1'
    }

    // « S2 : 75 % → S5 : 82,5 % », sur les semaines où la séance a lieu.
    const apercuProgression = (s, e) => {
      const sem = semainesSeance(s)
      if (e.progression === 'aucune' || sem.length < 2) return ''
      const valeur = (rang) => {
        const v = prescriptionSemaine(e, rang)[e.progression]
        return e.progression === 'series' ? `${v} séries` : v
      }
      const debut = valeur(0)
      const fin = valeur(sem.length - 1)
      return debut === fin || !debut ? '' : `S${sem[0]} : ${debut} → S${sem[sem.length - 1]} : ${fin}`
    }

    // --- Vue d'ensemble ---
    const seancesDuJour = (semaine, jour) => semaine.seances.filter(s => s.jour === jour)
    const ouvrirSeance = (cle) => {
      seanceCle.value = cle
      etape.value = 'seances'
    }
    const points = computed(() => pointsAttention(b.value))

    // --- Aperçu athlète ---
    const semaineDuJourCourante = computed(() => semaineDuJour(b.value))
    const borner = (w) => Math.min(Math.max(1, w), b.value.nbSemaines)
    const semaineApercu = ref(borner(semaineDuJourCourante.value))
    watch(() => b.value.nbSemaines, () => { semaineApercu.value = borner(semaineApercu.value) })
    const lundiDebut = computed(() => lundiSemaine(b.value, 1))

    // --- Exemple / page blanche ---
    const brouillonEntame = () => b.value.seances.length > 0 || b.value.nom.trim() !== ''
    const chargerExemple = () => {
      if (brouillonEntame() && !confirm("Remplacer ton brouillon par l'exemple ?")) return
      b.value = exempleBrouillon()
      seanceCle.value = b.value.seances[0].cle
      exempleCharge.value = true
      etape.value = 'cadre'
    }
    const repartirDeZero = () => {
      if (brouillonEntame() && !confirm("Effacer le brouillon et repartir d'une page blanche ?")) return
      b.value = nouveauBrouillon()
      seanceCle.value = null
      exempleCharge.value = false
      etape.value = 'cadre'
    }

    const formatCourt = (d) => d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
    const formatLong = (d) => d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

    return {
      ETAPES, JOURS, NB_SEMAINES_MAX, PROGRESSIONS, CLES_TYPES_SEANCE,
      b, exempleCharge, etape,
      changerNbSemaines, testsCatalogue, estTestChoisi, basculerTest, testsLibres, retirerTest,
      nouveauTest, ajouterTestLibre, semaines, semainesTestSet,
      seanceCle, seanceSel, champs, semainesSeance, ajouterSeance, dupliquerSeance, supprimerSeance,
      basculerSemaine, ajouterExercice, deplacerExercice, changerProgression, apercuProgression,
      seancesDuJour, ouvrirSeance, points,
      semaineDuJourCourante, semaineApercu, lundiDebut,
      chargerExemple, repartirDeZero,
      formatCourt, formatLong, libelleSemaines, labelProgression,
      typeSeance, labelTypeSeance, iconeTypeSeance
    }
  }
}
</script>

<style scoped>
/* Colonne centrée sur grand écran, sans déplacer la barre de défilement. */
.atelier {
  display: flex; flex-direction: column; gap: var(--spacing-lg);
  padding: var(--spacing-xl) max(var(--spacing-2xl), calc((100% - 1080px) / 2));
  overflow-y: auto; flex: 1; min-height: 0;
}

/* --- En-tête --- */
.atelier-entete { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--spacing-md); flex-wrap: wrap; }
.atelier-titre { margin: 0; display: flex; align-items: center; gap: var(--spacing-sm); font-size: var(--font-size-xl); font-weight: 700; letter-spacing: -0.3px; }
.badge-beta {
  padding: 2px 8px; border-radius: var(--radius-full);
  background: var(--color-primary-light); color: var(--color-primary-text);
  font-size: var(--font-size-xs); font-weight: 700; letter-spacing: 0.3px; text-transform: uppercase;
}
.atelier-sous-titre { margin: 4px 0 0; max-width: 640px; font-size: var(--font-size-sm); color: var(--color-text-secondary); line-height: 1.5; }
.atelier-actions { display: flex; gap: var(--spacing-sm); flex-wrap: wrap; }

.bandeau-exemple {
  display: flex; align-items: flex-start; gap: var(--spacing-sm);
  padding: var(--spacing-md); border-radius: var(--radius-lg);
  background: var(--color-primary-light); color: var(--color-primary-text);
  font-size: var(--font-size-sm); line-height: 1.5;
}
.bandeau-exemple > i { font-size: var(--font-size-lg); margin-top: 1px; }
.bandeau-exemple span { flex: 1; }
.btn-fermer {
  flex-shrink: 0; width: 32px; height: 32px; border: none; border-radius: var(--radius-md);
  background: transparent; color: inherit; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
}
.btn-fermer:hover { background: var(--color-bg); }

/* --- Étapes --- */
.etapes { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: var(--spacing-xs); padding: 4px; border-radius: var(--radius-lg); background: var(--color-bg-tertiary); }
.etape-onglet {
  display: flex; align-items: center; justify-content: center; gap: var(--spacing-sm);
  min-height: var(--tap-min); padding: 0 var(--spacing-sm);
  border: none; border-radius: var(--radius-md); background: transparent;
  font-family: inherit; font-size: var(--font-size-sm); font-weight: 600; color: var(--color-text-secondary);
  cursor: pointer; transition: background var(--transition-fast), color var(--transition-fast), box-shadow var(--transition-fast);
}
.etape-onglet:hover { color: var(--color-text-body); }
.etape-onglet.active { background: var(--color-bg); color: var(--color-primary-dark); box-shadow: var(--shadow-sm); }
.etape-num {
  width: 22px; height: 22px; border-radius: 50%; flex-shrink: 0;
  display: inline-flex; align-items: center; justify-content: center;
  background: var(--color-border); color: var(--color-text-secondary); font-size: var(--font-size-xs);
}
.etape-onglet.active .etape-num { background: var(--gradient-primary); color: var(--color-on-primary); }

.etape-contenu { display: flex; flex-direction: column; gap: var(--spacing-md); }
.etape-pied { display: flex; justify-content: space-between; gap: var(--spacing-sm); padding-top: var(--spacing-xs); }

/* --- Blocs --- */
.bloc {
  display: flex; flex-direction: column; gap: var(--spacing-md);
  padding: var(--spacing-lg);
  background: var(--color-bg); border: 1px solid var(--color-border); border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
}
.bloc-titre { margin: 0; display: flex; align-items: center; gap: var(--spacing-sm); font-size: var(--font-size-base); font-weight: 700; }
.bloc-titre .ti { color: var(--color-primary-dark); }
.aide { margin: 0; font-size: var(--font-size-xs); color: var(--color-text-muted); line-height: 1.5; }
.aide-texte { margin: 0; font-size: var(--font-size-sm); color: var(--color-text-secondary); line-height: 1.5; }
.capitale { text-transform: capitalize; }

.cadre-ligne { display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-md); }
.field-court { max-width: 220px; }
.field select { text-transform: capitalize; }
.compteur { display: flex; align-items: center; gap: var(--spacing-sm); }
.compteur-valeur { min-width: 110px; text-align: center; font-size: var(--font-size-base); }

.interrupteur {
  display: flex; align-items: flex-start; gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md); border-radius: var(--radius-md);
  background: var(--color-bg-secondary); cursor: pointer;
  font-size: var(--font-size-sm); color: var(--color-text-secondary); line-height: 1.5;
}
.interrupteur strong { color: var(--color-text); }
.interrupteur input { width: 18px; height: 18px; margin-top: 2px; accent-color: var(--color-primary); flex-shrink: 0; }

/* --- Puces de sélection --- */
.chips { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }
.chip, .semaine-chip {
  display: inline-flex; align-items: center; gap: 6px;
  min-height: 36px; padding: 0 var(--spacing-md);
  border: 1px solid var(--color-border); border-radius: var(--radius-full);
  background: var(--color-bg); color: var(--color-text-secondary);
  font-family: inherit; font-size: var(--font-size-sm); font-weight: 500; cursor: pointer;
  transition: background var(--transition-fast), border-color var(--transition-fast), color var(--transition-fast);
}
.chip small { color: var(--color-text-muted); font-weight: 400; }
.chip:hover, .semaine-chip:hover { border-color: var(--color-border-strong); }
.chip.active, .semaine-chip.active { background: var(--color-primary-light); border-color: var(--color-primary); color: var(--color-primary-text); font-weight: 600; }
.semaine-chip { min-width: 52px; justify-content: center; padding: 0 var(--spacing-sm); gap: 3px; }
.semaine-chip.test:not(.active) { border-style: dashed; }
.semaine-chip .ti-flag-3 { font-size: 12px; color: var(--color-warning-icon); }
.chip-retirer {
  display: inline-flex; align-items: center; justify-content: center;
  width: 20px; height: 20px; margin-right: -6px; border: none; border-radius: 50%;
  background: transparent; color: inherit; cursor: pointer;
}
.chip-retirer:hover { background: var(--color-bg); }

.test-libre { display: flex; gap: var(--spacing-sm); flex-wrap: wrap; }
.test-libre input, .seance-editeur input:not([type='checkbox']), .prescription input, .progression select, .progression input {
  min-height: var(--tap-min); padding: 0 var(--spacing-md);
  border: 1px solid var(--color-border); border-radius: var(--radius-md);
  font-size: var(--font-size-base); background: var(--color-bg);
}
.test-libre input { flex: 1; min-width: 140px; }
.test-libre .input-unite { flex: 0 1 110px; min-width: 80px; }
input:focus, select:focus { outline: none; border-color: var(--color-primary); box-shadow: var(--shadow-focus); }

/* --- Frise --- */
.frise { display: grid; grid-template-columns: repeat(auto-fill, minmax(96px, 1fr)); gap: var(--spacing-sm); }
.frise-semaine {
  display: flex; flex-direction: column; gap: 2px;
  padding: var(--spacing-sm) var(--spacing-md); border-radius: var(--radius-md);
  background: var(--color-bg-secondary); border: 1px solid var(--color-border);
}
.frise-semaine.test { background: var(--color-warning-bg-soft); border-color: var(--color-warning-border); }
.frise-num { font-size: var(--font-size-base); font-weight: 700; }
.frise-date { font-size: var(--font-size-xs); color: var(--color-text-muted); }
.frise-contenu { display: inline-flex; align-items: center; gap: 4px; font-size: var(--font-size-xs); font-weight: 600; color: var(--color-text-secondary); }
.frise-semaine.test .frise-contenu { color: var(--color-warning-text-strong); }

/* --- Séances --- */
.seances-disposition { display: grid; grid-template-columns: 260px minmax(0, 1fr); gap: var(--spacing-md); align-items: start; }
.seances-liste { display: flex; flex-direction: column; gap: var(--spacing-sm); }
.seance-item {
  display: flex; align-items: center; gap: var(--spacing-md); width: 100%;
  padding: var(--spacing-sm) var(--spacing-md);
  border: 1px solid var(--color-border); border-radius: var(--radius-lg); background: var(--color-bg);
  font-family: inherit; color: inherit; text-align: left; cursor: pointer;
  transition: border-color var(--transition-fast), background var(--transition-fast), box-shadow var(--transition-fast);
}
.seance-item:hover { border-color: var(--color-border-strong); background: var(--color-bg-hover); }
.seance-item.active { border-color: var(--color-primary); background: var(--color-primary-light); box-shadow: inset 3px 0 0 var(--color-primary); }
.seance-item-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.seance-item-nom { font-size: var(--font-size-sm); font-weight: 600; overflow-wrap: anywhere; }
.seance-item-meta { font-size: var(--font-size-xs); color: var(--color-text-secondary); }

.segments { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 6px; }
.segment {
  display: flex; align-items: center; justify-content: center; gap: 6px;
  min-height: var(--tap-min); padding: 0 var(--spacing-sm);
  border: 1px solid var(--color-border); border-radius: var(--radius-md); background: var(--color-bg);
  font-family: inherit; font-size: var(--font-size-sm); font-weight: 500; color: var(--color-text-secondary); cursor: pointer;
}
.segment.active { border-color: var(--color-primary); background: var(--color-primary-light); color: var(--color-primary-text); font-weight: 600; }
.jours { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 6px; }
.jour {
  min-height: var(--tap-min); border: 1px solid var(--color-border); border-radius: var(--radius-md); background: var(--color-bg);
  font-family: inherit; font-size: var(--font-size-sm); font-weight: 600; color: var(--color-text-secondary);
  text-transform: capitalize; cursor: pointer;
}
.jour.active { border-color: var(--color-primary); background: var(--gradient-primary); color: var(--color-on-primary); }

.exercices { display: flex; flex-direction: column; gap: var(--spacing-sm); padding-top: var(--spacing-sm); border-top: 1px solid var(--color-border); }
.exercice {
  display: flex; flex-direction: column; gap: var(--spacing-sm);
  padding: var(--spacing-md); border-radius: var(--radius-lg);
  background: var(--color-bg-secondary); border: 1px solid var(--color-border);
}
.exercice-ligne { display: flex; align-items: center; gap: var(--spacing-sm); }
.exercice-ligne :deep(.exo-autocomplete) { flex: 1; min-width: 0; }
.exercice-num {
  width: 26px; height: 26px; border-radius: 50%; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  background: var(--color-primary-light); color: var(--color-primary-text); font-size: var(--font-size-xs); font-weight: 700;
}
.exercice-outils { display: flex; gap: 2px; flex-shrink: 0; }
.btn-outil {
  width: 36px; height: 36px; border: none; border-radius: var(--radius-md); background: transparent;
  color: var(--color-text-secondary); cursor: pointer; display: flex; align-items: center; justify-content: center;
}
.btn-outil:hover:not(:disabled) { background: var(--color-bg-tertiary); color: var(--color-text); }
.btn-outil:disabled { opacity: 0.3; cursor: default; }
.btn-outil.danger:hover { background: var(--color-danger-bg); color: var(--color-danger-text); }

.prescription { display: flex; align-items: flex-end; gap: var(--spacing-sm); flex-wrap: wrap; padding-left: 34px; }
.mini { display: flex; flex-direction: column; gap: 2px; flex: 1 1 96px; min-width: 80px; }
.mini-court { flex: 0 1 76px; min-width: 64px; }
.mini > span { font-size: var(--font-size-xs); font-weight: 600; color: var(--color-text-muted); }
.prescription input { width: 100%; padding: 0 var(--spacing-sm); }
.prescription-sep { padding-bottom: 12px; color: var(--color-text-muted); font-weight: 700; }

.progression { display: flex; align-items: center; gap: var(--spacing-sm); flex-wrap: wrap; padding-left: 34px; font-size: var(--font-size-sm); color: var(--color-text-secondary); }
.progression > .ti { color: var(--color-valid-text); font-size: var(--font-size-lg); }
.progression-label { font-weight: 600; }
.progression select { min-height: 36px; padding: 0 var(--spacing-sm); font-size: var(--font-size-sm); }
.progression .input-pas { width: 72px; min-height: 36px; padding: 0 var(--spacing-sm); font-size: var(--font-size-sm); }
.progression-apercu {
  padding: 3px 10px; border-radius: var(--radius-full);
  background: var(--color-valid-bg); color: var(--color-valid-text-strong);
  font-size: var(--font-size-xs); font-weight: 700;
}

.editeur-pied { display: flex; justify-content: space-between; gap: var(--spacing-sm); flex-wrap: wrap; padding-top: var(--spacing-sm); border-top: 1px solid var(--color-border); }
.btn-supprimer { color: var(--color-danger-text); }
.btn-supprimer:hover:not(:disabled) { background: var(--color-danger-bg-soft); color: var(--color-danger-text); }

/* --- Vue d'ensemble --- */
.grille-defile { overflow-x: auto; margin: 0 calc(-1 * var(--spacing-lg)); padding: 0 var(--spacing-lg); }
.grille { display: grid; grid-template-columns: 72px repeat(7, minmax(96px, 1fr)); gap: 4px; min-width: 760px; }
.grille-jour { padding: 4px; text-align: center; font-size: var(--font-size-xs); font-weight: 700; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.4px; }
.grille-semaine {
  display: flex; flex-direction: column; justify-content: center; gap: 1px;
  padding: var(--spacing-sm); border-radius: var(--radius-md); background: var(--color-bg-secondary);
}
.grille-semaine strong { font-size: var(--font-size-sm); }
.grille-semaine small { font-size: 11px; color: var(--color-text-muted); }
.grille-semaine.test { background: var(--color-warning-bg-soft); }
.grille-case {
  min-height: 56px; padding: 4px; border-radius: var(--radius-md);
  border: 1px dashed var(--color-border); display: flex; flex-direction: column; gap: 4px;
}
.grille-case.case-test { background: var(--color-warning-bg-soft); border-color: transparent; }
.puce {
  display: flex; align-items: center; gap: 4px; width: 100%;
  min-height: 30px; padding: 2px 8px; border: none; border-radius: var(--radius-sm);
  font-family: inherit; font-size: var(--font-size-xs); font-weight: 600; text-align: left; cursor: pointer;
  background: var(--color-bg-tertiary); color: var(--color-text-body);
  transition: transform var(--transition-fast), box-shadow var(--transition-fast);
}
/* Nom sur deux lignes au plus : « Force bas du corps » reste lisible en entier. */
.puce span {
  display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical;
  overflow: hidden; line-height: 1.25;
}
button.puce:hover { box-shadow: var(--shadow-sm); transform: translateY(-1px); }
.puce-musculation { background: var(--color-type-musculation-bg); color: var(--color-type-musculation-text); }
.puce-natation { background: var(--color-type-natation-bg); color: var(--color-type-natation-text); }
.puce-athletisme { background: var(--color-type-athletisme-bg); color: var(--color-type-athletisme-text); }
.puce-pliometrie { background: var(--color-type-pliometrie-bg); color: var(--color-type-pliometrie-text); }
.puce-test { background: var(--color-warning-bg); color: var(--color-warning-text-strong); cursor: default; }

.points { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
.points li { display: flex; align-items: flex-start; gap: var(--spacing-sm); font-size: var(--font-size-sm); color: var(--color-warning-text-strong); }
.points-ok { margin: 0; display: flex; align-items: center; gap: var(--spacing-sm); font-size: var(--font-size-sm); font-weight: 600; color: var(--color-valid-text-strong); }

/* --- Aperçu athlète --- */
.apercu-disposition { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 400px); gap: var(--spacing-lg); align-items: start; }
.semaine-nav { display: flex; align-items: center; gap: var(--spacing-sm); }
.semaine-nav-label { flex: 1; text-align: center; font-size: var(--font-size-lg); font-weight: 700; }
.semaine-nav-label small { font-size: var(--font-size-sm); font-weight: 500; color: var(--color-text-muted); }
.suite {
  display: flex; align-items: flex-start; gap: var(--spacing-sm);
  padding: var(--spacing-md); border-radius: var(--radius-md);
  background: var(--color-bg-secondary); font-size: var(--font-size-sm); color: var(--color-text-secondary); line-height: 1.5;
}
.suite .ti { color: var(--color-warning-icon); font-size: var(--font-size-lg); }

@media (max-width: 768px) {
  .atelier { padding: var(--spacing-md) var(--spacing-lg); }
  .etapes { grid-template-columns: repeat(4, minmax(0, 1fr)); }
  .etape-onglet { flex-direction: column; gap: 2px; padding: 4px 2px; font-size: 11px; line-height: 1.15; text-align: center; }
  .cadre-ligne { grid-template-columns: 1fr; }
  .seances-disposition { grid-template-columns: 1fr; }
  .segments { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .jour { font-size: var(--font-size-xs); }
  .prescription, .progression { padding-left: 0; }
  /* Les champs passent à la ligne : un « × » ou un « @ » resterait seul en bout de ligne. */
  .prescription-sep { display: none; }
  .apercu-disposition { grid-template-columns: 1fr; }
}
</style>
