<template>
  <div class="diete">
    <div class="sous-onglets">
      <button type="button" :class="{ actif: vue === 'journee' }" @click="vue = 'journee'">
        <i class="ti ti-tools-kitchen-2"></i> Journée
      </button>
      <button type="button" :class="{ actif: vue === 'objectif' }" @click="vue = 'objectif'">
        <i class="ti ti-target"></i> Objectif
      </button>
    </div>

    <template v-if="vue === 'journee'">
    <!-- Journée courante : la diète se saisit au fil de la journée, mais on
         doit pouvoir rattraper la veille le lendemain matin. -->
    <div class="diete-jour">
      <button class="btn btn-icon" @click="changerJour(-1)" aria-label="Jour précédent">
        <i class="ti ti-chevron-left"></i>
      </button>
      <div class="diete-jour-label">
        <span class="diete-jour-titre">{{ labelJour }}</span>
        <button v-if="!estAujourdhui" type="button" class="diete-jour-retour" @click="allerAujourdhui">
          Revenir à aujourd'hui
        </button>
      </div>
      <button class="btn btn-icon" @click="changerJour(1)" :disabled="estAujourdhui" aria-label="Jour suivant">
        <i class="ti ti-chevron-right"></i>
      </button>
    </div>

    <div class="diete-total">
      <div class="diete-total-kcal">
        {{ fr(totalJour.kcal) }}<span v-if="bilan" class="diete-total-cible">/ {{ fr(bilan.kcal_cible) }}</span
        ><span class="diete-total-unite">kcal</span>
      </div>

      <!-- Sans objectif défini, le total reste une information brute : c'est
           la cible qui lui donne un sens, pas l'inverse. -->
      <template v-if="bilan">
        <div class="jauge">
          <div class="jauge-barre" :class="{ depasse: reste.depasse }" :style="{ width: reste.pct + '%' }"></div>
        </div>
        <div class="diete-reste" :class="{ depasse: reste.depasse }">{{ reste.texte }}</div>
      </template>

      <div class="diete-macros">
        <span class="diete-macro">
          <b>{{ fr(totalJour.proteines) }}</b><template v-if="bilan">/{{ fr(bilan.proteines_cible_g) }}</template> g prot.
        </span>
        <span class="diete-macro"><b>{{ fr(totalJour.glucides) }}</b> g gluc.</span>
        <span class="diete-macro"><b>{{ fr(totalJour.lipides) }}</b> g lip.</span>
      </div>
    </div>

    <p v-if="erreurListe" class="error">{{ erreurListe }}</p>

    <div v-if="chargement" class="empty">Chargement...</div>

    <template v-else>
      <article v-for="r in repas" :key="r.id" class="repas-carte">
        <header class="repas-head">
          <h3 class="repas-nom">{{ r.nom }}</h3>
          <span class="repas-kcal">{{ fr(r.total_kcal) }} kcal</span>
          <button class="repas-action" @click="ouvrirRenommage(r)" aria-label="Renommer le repas">
            <i class="ti ti-pencil"></i>
          </button>
          <button class="repas-action" @click="supprimerRepas(r)" aria-label="Supprimer le repas">
            <i class="ti ti-trash"></i>
          </button>
        </header>

        <ul v-if="r.lignes.length" class="ligne-liste">
          <li v-for="l in r.lignes" :key="l.id" class="ligne">
            <button type="button" class="ligne-corps" @click="ouvrirEditionQuantite(r, l)">
              <span class="ligne-nom">{{ l.nom }}</span>
              <span class="ligne-meta">{{ fr(l.grammes) }} g · {{ fr(l.kcal_100g) }} kcal/100 g</span>
            </button>
            <span class="ligne-kcal">{{ fr(l.kcal) }}</span>
            <button class="ligne-suppr" @click="supprimerLigne(l)" aria-label="Retirer cet aliment">
              <i class="ti ti-x"></i>
            </button>
          </li>
        </ul>

        <button class="btn btn-sm btn-dashed repas-ajout" @click="ouvrirRecherche(r)">
          <i class="ti ti-plus"></i> Ajouter un aliment
        </button>
      </article>

      <button class="btn btn-primary btn-nouveau-repas" @click="ouvrirNouveauRepas">
        <i class="ti ti-plus"></i> Ajouter un repas
      </button>

      <div v-if="repas.length === 0" class="empty-state">
        <i class="ti ti-salad empty-icon"></i>
        <p>Aucun repas enregistré ce jour.</p>
        <span>Ajoutez un repas, puis les aliments que vous avez mangés.</span>
      </div>
    </template>
    </template>

    <!-- VUE OBJECTIF -->
    <template v-else>
      <div v-if="chargementBilan" class="empty">Chargement...</div>

      <div v-else-if="!bilan" class="empty-state">
        <i class="ti ti-target empty-icon"></i>
        <p>Aucun objectif défini.</p>
        <span>Renseignez vos mesures pour obtenir votre cible calorique quotidienne.</span>
        <button class="btn btn-primary objectif-cta" @click="ouvrirObjectif">
          <i class="ti ti-plus"></i> Définir mon objectif
        </button>
      </div>

      <template v-else>
        <div class="cible-carte">
          <span class="cible-badge">{{ LABELS_OBJECTIF[bilan.objectif] }}</span>
          <div class="cible-kcal">{{ fr(bilan.kcal_cible) }}<span class="cible-unite">kcal / jour</span></div>
          <div class="cible-sub">
            {{ fr(bilan.proteines_cible_g) }} g de protéines visées
            <template v-if="bilan.objectif !== 'maintien'">
              · {{ fr(bilan.rythme_effectif_kg_semaine) }} kg/semaine
            </template>
          </div>
        </div>

        <!-- Un garde-fou qui mord change la cible demandée : le dire, sinon
             l'athlète croit à une erreur de calcul. -->
        <div v-if="bilan.plafonnee" class="alerte">
          <i class="ti ti-alert-triangle"></i>
          <span>{{ bilan.motif_plafond }}</span>
        </div>

        <div class="detail-calcul">
          <h4 class="detail-titre">D'où vient ce chiffre</h4>
          <div class="detail-ligne">
            <span>Métabolisme de base</span>
            <b>{{ fr(bilan.metabolisme_base) }} kcal</b>
          </div>
          <div class="detail-ligne">
            <span>× activité ({{ LABELS_ACTIVITE_COURT[bilan.niveau_activite] }})</span>
            <b>{{ fr(bilan.depense_totale) }} kcal</b>
          </div>
          <div class="detail-ligne" v-if="bilan.ajustement_kcal !== 0">
            <span>{{ bilan.ajustement_kcal < 0 ? 'Déficit' : 'Surplus' }}</span>
            <b>{{ bilan.ajustement_kcal > 0 ? '+' : '' }}{{ fr(bilan.ajustement_kcal) }} kcal</b>
          </div>
          <p class="detail-note">
            {{ bilan.methode_mb === 'katch'
              ? 'Formule de Katch-McArdle (masse grasse renseignée).'
              : 'Formule de Mifflin-St Jeor.' }}
            {{ bilan.age }} ans, {{ fr(bilan.taille_cm) }} cm, {{ fr(bilan.poids_actuel_kg) }} kg.
          </p>
        </div>

        <div class="progression" v-if="bilan.poids_cible_kg">
          <div class="progression-bornes">
            <span><b>{{ fr(bilan.poids_depart_kg) }}</b> kg<br /><span class="progression-lbl">départ</span></span>
            <span class="progression-actuel"><b>{{ fr(bilan.poids_actuel_kg) }}</b> kg<br /><span class="progression-lbl">aujourd'hui</span></span>
            <span><b>{{ fr(bilan.poids_cible_kg) }}</b> kg<br /><span class="progression-lbl">visé</span></span>
          </div>
          <div class="jauge">
            <div class="jauge-barre" :style="{ width: (bilan.progression.pct || 0) + '%' }"></div>
          </div>
          <div class="progression-sub">
            {{ bilan.progression.pct }} % du chemin ·
            <template v-if="bilan.date_cible_estimee">
              objectif atteint vers le {{ formatDateLongue(bilan.date_cible_estimee) }}
            </template>
            <template v-else>objectif atteint</template>
          </div>
        </div>

        <CourbeObjectif
          :reel="bilan.courbe.reel"
          :cible="bilan.courbe.cible"
          :objectif="bilan.objectif"
        />

        <div class="objectif-actions">
          <button class="btn btn-sm" @click="ouvrirObjectif">
            <i class="ti ti-pencil"></i> Modifier
          </button>
          <button class="btn btn-sm btn-danger" @click="supprimerObjectif">
            <i class="ti ti-trash"></i> Supprimer
          </button>
        </div>
      </template>

      <p v-if="erreurListe" class="error">{{ erreurListe }}</p>
    </template>

    <!-- Création / renommage d'un repas : même modale, form.id décide. -->
    <div v-if="modaleRepas" class="modal-overlay" @click.self="fermerModaleRepas">
      <div class="modal">
        <div class="modal-header">
          <h3>{{ formRepas.id ? 'Renommer le repas' : 'Nouveau repas' }}</h3>
          <button class="modal-close" @click="fermerModaleRepas" aria-label="Fermer">
            <i class="ti ti-x"></i>
          </button>
        </div>
        <div class="modal-body">
          <div class="suggestions">
            <button
              v-for="s in REPAS_COURANTS"
              :key="s"
              type="button"
              class="suggestion"
              :class="{ actif: formRepas.nom === s }"
              @click="formRepas.nom = s"
            >{{ s }}</button>
          </div>
          <div class="field">
            <label for="repas-nom">Nom du repas</label>
            <input id="repas-nom" v-model="formRepas.nom" maxlength="60" placeholder="Ex : Collation" />
          </div>
          <p v-if="erreurModale" class="error">{{ erreurModale }}</p>
        </div>
        <div class="modal-footer">
          <button class="btn" @click="fermerModaleRepas">Annuler</button>
          <button class="btn btn-primary" :disabled="!formRepas.nom.trim() || envoiEnCours" @click="enregistrerRepas">
            <i class="ti ti-check"></i> {{ formRepas.id ? 'Enregistrer' : 'Créer' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Objectif : toutes les mesures qui entrent dans le calcul de la cible. -->
    <div v-if="modaleObjectif" class="modal-overlay" @click.self="fermerObjectif">
      <div class="modal modal-objectif">
        <div class="modal-header">
          <h3>Mon objectif</h3>
          <button class="modal-close" @click="fermerObjectif" aria-label="Fermer">
            <i class="ti ti-x"></i>
          </button>
        </div>

        <div class="modal-body">
          <div class="field">
            <label>Je veux…</label>
            <div class="choix-cartes">
              <button
                v-for="o in OBJECTIFS"
                :key="o.valeur"
                type="button"
                class="choix-carte"
                :class="{ actif: formObjectif.objectif === o.valeur }"
                @click="choisirObjectif(o.valeur)"
              >
                <i class="ti" :class="o.icone"></i>
                <span>{{ o.label }}</span>
              </button>
            </div>
          </div>

          <div class="field">
            <label>Sexe</label>
            <div class="ouinon">
              <button type="button" class="ouinon-btn" :class="{ actif: formObjectif.sexe === 'homme' }" @click="formObjectif.sexe = 'homme'">Homme</button>
              <button type="button" class="ouinon-btn" :class="{ actif: formObjectif.sexe === 'femme' }" @click="formObjectif.sexe = 'femme'">Femme</button>
            </div>
            <span class="aide">Les formules de métabolisme diffèrent selon le sexe.</span>
          </div>

          <div class="deux-colonnes">
            <div class="field">
              <label for="obj-naissance">Date de naissance</label>
              <input id="obj-naissance" v-model="formObjectif.date_naissance" type="date" :max="aujourdhuiISO" />
            </div>
            <div class="field">
              <label for="obj-taille">Taille (cm)</label>
              <input id="obj-taille" v-model="formObjectif.taille_cm" inputmode="numeric" placeholder="Ex : 180" />
            </div>
          </div>

          <div class="deux-colonnes">
            <div class="field">
              <label for="obj-poids">Poids actuel (kg)</label>
              <input id="obj-poids" v-model="formObjectif.poids_actuel_kg" inputmode="decimal" placeholder="Ex : 82" />
            </div>
            <div class="field" v-if="formObjectif.objectif !== 'maintien'">
              <label for="obj-cible">Poids visé (kg)</label>
              <input id="obj-cible" v-model="formObjectif.poids_cible_kg" inputmode="decimal" placeholder="Ex : 76" />
            </div>
          </div>

          <div class="field">
            <label for="obj-activite">Niveau d'activité</label>
            <select id="obj-activite" v-model="formObjectif.niveau_activite">
              <option v-for="n in NIVEAUX_ACTIVITE" :key="n.valeur" :value="n.valeur">{{ n.label }}</option>
            </select>
          </div>

          <div class="field" v-if="formObjectif.objectif !== 'maintien'">
            <label>Rythme visé</label>
            <div class="suggestions">
              <button
                v-for="r in rythmesProposes"
                :key="r.valeur"
                type="button"
                class="suggestion"
                :class="{ actif: Number(formObjectif.rythme_kg_semaine) === r.valeur }"
                @click="formObjectif.rythme_kg_semaine = r.valeur"
              >{{ r.label }}</button>
            </div>
            <span class="aide">Au-delà, le corps puise dans le muscle plutôt que dans la graisse.</span>
          </div>

          <div class="field">
            <label for="obj-mg">Masse grasse (%) — facultatif</label>
            <input id="obj-mg" v-model="formObjectif.masse_grasse_pct" inputmode="decimal" placeholder="Laissez vide si inconnu" />
            <span class="aide">Si vous la connaissez, le calcul bascule sur une formule plus précise pour un sportif.</span>
          </div>

          <p v-if="erreurModale" class="error">{{ erreurModale }}</p>
        </div>

        <div class="modal-footer">
          <button class="btn" @click="fermerObjectif">Annuler</button>
          <button class="btn btn-primary" :disabled="!objectifValide || envoiEnCours" @click="enregistrerObjectif">
            <i class="ti ti-check"></i> Calculer ma cible
          </button>
        </div>
      </div>
    </div>

    <!-- Ajout d'un aliment : recherche, puis quantité. Deux étapes dans la
         même modale — l'athlète doit voir le nom et les kcal/100 g de ce
         qu'il a choisi pendant qu'il saisit ses grammes. -->
    <div v-if="modaleAliment" class="modal-overlay" @click.self="fermerModaleAliment">
      <div class="modal modal-aliment">
        <div class="modal-header">
          <button v-if="etape !== 'recherche' && !ligneEditee" class="modal-retour" @click="retourRecherche" aria-label="Retour">
            <i class="ti ti-arrow-left"></i>
          </button>
          <h3>{{ titreModaleAliment }}</h3>
          <button class="modal-close" @click="fermerModaleAliment" aria-label="Fermer">
            <i class="ti ti-x"></i>
          </button>
        </div>

        <div class="modal-body">
          <!-- ÉTAPE 1 : recherche -->
          <template v-if="etape === 'recherche'">
            <div class="recherche-champ">
              <i class="ti ti-search"></i>
              <input
                ref="champRecherche"
                v-model="requete"
                placeholder="Riz, poulet, banane..."
                autocomplete="off"
                @input="planifierRecherche"
              />
              <button v-if="requete" type="button" class="recherche-vider" @click="viderRecherche" aria-label="Effacer">
                <i class="ti ti-x"></i>
              </button>
            </div>

            <ul v-if="resultats.length" class="resultats">
              <li v-for="a in resultats" :key="a.id">
                <button type="button" class="resultat" @click="choisirAliment(a)">
                  <span class="resultat-texte">
                    <span class="resultat-nom">{{ a.nom }}</span>
                    <span class="resultat-groupe" v-if="a.groupe">{{ a.groupe }}</span>
                  </span>
                  <span class="resultat-kcal">
                    <b>{{ a.kcal_100g }}</b>
                    <span>kcal/100 g</span>
                  </span>
                </button>
              </li>
            </ul>

            <p v-else-if="recherchEnCours" class="empty">Recherche...</p>
            <p v-else-if="requete.trim().length >= 2" class="empty">Aucun aliment trouvé.</p>
            <p v-else class="empty">Tapez au moins 2 lettres.</p>

            <!-- Ciqual ne référence ni les compléments ni les produits de
                 marque : sans cette porte de sortie, une whey ou une barre
                 protéinée serait impossible à saisir. -->
            <button type="button" class="btn btn-sm btn-dashed manuel-lien" @click="ouvrirSaisieManuelle">
              <i class="ti ti-edit"></i> Saisir un aliment manuellement
            </button>
          </template>

          <!-- ÉTAPE 1 bis : aliment hors catalogue -->
          <template v-else-if="etape === 'manuel'">
            <div class="field">
              <label for="manuel-nom">Nom de l'aliment</label>
              <input id="manuel-nom" v-model="formManuel.nom" maxlength="120" placeholder="Ex : Whey isolate vanille" />
            </div>
            <div class="field">
              <label for="manuel-kcal">Calories pour 100 g</label>
              <input id="manuel-kcal" v-model="formManuel.kcal_100g" inputmode="decimal" placeholder="Ex : 380" />
            </div>
            <div class="manuel-macros">
              <div class="field">
                <label for="manuel-prot">Prot. /100 g</label>
                <input id="manuel-prot" v-model="formManuel.proteines_100g" inputmode="decimal" placeholder="—" />
              </div>
              <div class="field">
                <label for="manuel-gluc">Gluc. /100 g</label>
                <input id="manuel-gluc" v-model="formManuel.glucides_100g" inputmode="decimal" placeholder="—" />
              </div>
              <div class="field">
                <label for="manuel-lip">Lip. /100 g</label>
                <input id="manuel-lip" v-model="formManuel.lipides_100g" inputmode="decimal" placeholder="—" />
              </div>
            </div>
            <p class="aide">Recopiez les valeurs de l'étiquette. Les macros sont facultatives.</p>
          </template>

          <!-- ÉTAPE 2 : quantité -->
          <template v-else>
            <div class="choisi">
              <span class="choisi-nom">{{ alimentChoisi.nom }}</span>
              <span class="choisi-kcal">{{ alimentChoisi.kcal_100g }} kcal / 100 g</span>
            </div>

            <div class="field">
              <label for="qte">Quantité mangée (g)</label>
              <input
                id="qte"
                ref="champQuantite"
                v-model="grammes"
                inputmode="decimal"
                placeholder="Ex : 150"
              />
            </div>

            <div class="raccourcis">
              <button v-for="g in RACCOURCIS_G" :key="g" type="button" class="raccourci" @click="grammes = String(g)">
                {{ g }} g
              </button>
            </div>

            <div class="apercu" :class="{ vide: !apercu }">
              <div class="apercu-kcal">
                {{ apercu ? apercu.kcal : '—' }}<span class="apercu-unite">kcal</span>
              </div>
              <div class="apercu-macros" v-if="apercu">
                <span><b>{{ apercu.proteines ?? '—' }}</b> g prot.</span>
                <span><b>{{ apercu.glucides ?? '—' }}</b> g gluc.</span>
                <span><b>{{ apercu.lipides ?? '—' }}</b> g lip.</span>
              </div>
            </div>
          </template>

          <p v-if="erreurModale" class="error">{{ erreurModale }}</p>
        </div>

        <div class="modal-footer" v-if="etape !== 'recherche'">
          <button v-if="etape === 'manuel'" class="btn" @click="retourRecherche">Retour</button>
          <button v-else class="btn" @click="fermerModaleAliment">Annuler</button>
          <button
            v-if="etape === 'manuel'"
            class="btn btn-primary"
            :disabled="!formManuelValide"
            @click="validerSaisieManuelle"
          >
            <i class="ti ti-arrow-right"></i> Continuer
          </button>
          <button v-else class="btn btn-primary" :disabled="!apercu || envoiEnCours" @click="enregistrerLigne">
            <i class="ti ti-check"></i> {{ ligneEditee ? 'Enregistrer' : 'Ajouter' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { useApi } from '../../services/api'
import CourbeObjectif from './CourbeObjectif.vue'

const REPAS_COURANTS = ['Petit-déjeuner', 'Déjeuner', 'Dîner', 'Collation']
const RACCOURCIS_G = [50, 100, 150, 200]

const OBJECTIFS = [
  { valeur: 'perte', label: 'Perdre du poids', icone: 'ti-trending-down' },
  { valeur: 'maintien', label: 'Maintenir', icone: 'ti-equal' },
  { valeur: 'prise', label: 'Prendre du poids', icone: 'ti-trending-up' }
]
const LABELS_OBJECTIF = { perte: 'Perte de poids', maintien: 'Maintien', prise: 'Prise de masse' }

// Libellés décrivant une semaine type : « modéré » ne veut rien dire seul,
// « 3 à 5 séances » se répond sans hésiter.
const NIVEAUX_ACTIVITE = [
  { valeur: 'sedentaire', label: 'Sédentaire — travail assis, pas de sport' },
  { valeur: 'leger', label: 'Léger — 1 à 3 séances par semaine' },
  { valeur: 'modere', label: 'Modéré — 3 à 5 séances par semaine' },
  { valeur: 'intense', label: 'Intense — 6 à 7 séances par semaine' },
  { valeur: 'tres_intense', label: 'Très intense — 2 séances/jour ou métier physique' }
]
const LABELS_ACTIVITE_COURT = {
  sedentaire: 'sédentaire', leger: 'léger', modere: 'modéré',
  intense: 'intense', tres_intense: 'très intense'
}

// Un surplus se tient plus bas qu'un déficit : au-delà de 0,5 kg/semaine la
// prise part largement en gras, alors qu'un déficit de 1 kg reste jouable.
const RYTHMES_PERTE = [
  { valeur: 0.25, label: '0,25 kg/sem — doux' },
  { valeur: 0.5, label: '0,5 kg/sem — recommandé' },
  { valeur: 0.75, label: '0,75 kg/sem' },
  { valeur: 1, label: '1 kg/sem — agressif' }
]
const RYTHMES_PRISE = [
  { valeur: 0.25, label: '0,25 kg/sem — recommandé' },
  { valeur: 0.5, label: '0,5 kg/sem' }
]

const pad2 = (n) => String(n).padStart(2, '0')
const dateISOLocale = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`

// Les champs numériques acceptent la virgule : sur mobile le clavier
// décimal français la propose par défaut.
const nombreOuNull = (valeur) => {
  const n = parseFloat(String(valeur ?? '').replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

const formManuelVide = () => ({
  nom: '',
  kcal_100g: '',
  proteines_100g: '',
  glucides_100g: '',
  lipides_100g: ''
})

const formObjectifVide = () => ({
  objectif: 'perte',
  sexe: 'homme',
  date_naissance: '',
  taille_cm: '',
  poids_actuel_kg: '',
  poids_cible_kg: '',
  niveau_activite: 'modere',
  rythme_kg_semaine: 0.5,
  masse_grasse_pct: ''
})

export default {
  components: { CourbeObjectif },
  setup() {
    const api = useApi()

    const vue = ref('journee')
    const bilan = ref(null)
    const chargementBilan = ref(true)
    const modaleObjectif = ref(false)
    const formObjectif = ref(formObjectifVide())

    const jour = ref(dateISOLocale(new Date()))
    const repas = ref([])
    const chargement = ref(true)
    const envoiEnCours = ref(false)
    const erreurListe = ref('')
    const erreurModale = ref('')

    const modaleRepas = ref(false)
    const formRepas = ref({ id: null, nom: '' })

    const modaleAliment = ref(false)
    const etape = ref('recherche')
    const repasCible = ref(null)
    const ligneEditee = ref(null)
    const requete = ref('')
    const resultats = ref([])
    const recherchEnCours = ref(false)
    const alimentChoisi = ref(null)
    const grammes = ref('')
    const formManuel = ref(formManuelVide())
    const champRecherche = ref(null)
    const champQuantite = ref(null)
    let timerRecherche = null

    const estAujourdhui = computed(() => jour.value === dateISOLocale(new Date()))

    const labelJour = computed(() => {
      if (estAujourdhui.value) return "Aujourd'hui"
      const [a, m, j] = jour.value.split('-').map(Number)
      return new Date(a, m - 1, j).toLocaleDateString('fr-FR', {
        weekday: 'long', day: 'numeric', month: 'long'
      })
    })

    const totalJour = computed(() => repas.value.reduce((acc, r) => ({
      kcal: Math.round(acc.kcal + r.total_kcal),
      proteines: Math.round(acc.proteines + r.total_proteines),
      glucides: Math.round(acc.glucides + r.total_glucides),
      lipides: Math.round(acc.lipides + r.total_lipides)
    }), { kcal: 0, proteines: 0, glucides: 0, lipides: 0 }))

    // Pré-remplissage du champ de quantité : 150 et non 150.0, mais 12,5
    // reste 12,5 si l'athlète l'a saisi ainsi. Usage interne — l'affichage
    // passe par fr().
    const formatNombre = (n) => (Number.isInteger(n) ? n : Math.round(n * 10) / 10)

    // Conventions françaises pour tout nombre affiché : virgule décimale et
    // espace des milliers (« 2 531 kcal », « 79,6 kg »).
    const fr = (n) => Number(n).toLocaleString('fr-FR', { maximumFractionDigits: 1 })

    const aujourdhuiISO = dateISOLocale(new Date())
    const formatDateLongue = (iso) =>
      new Date(`${iso}T00:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

    /* --- Objectif --- */

    const reste = computed(() => {
      if (!bilan.value) return null
      const ecart = bilan.value.kcal_cible - totalJour.value.kcal
      return {
        pct: Math.min(100, Math.round((totalJour.value.kcal / bilan.value.kcal_cible) * 100)),
        depasse: ecart < 0,
        texte: ecart >= 0
          ? `Il reste ${fr(ecart)} kcal`
          : `Dépassement de ${fr(Math.abs(ecart))} kcal`
      }
    })

    const rythmesProposes = computed(() =>
      formObjectif.value.objectif === 'prise' ? RYTHMES_PRISE : RYTHMES_PERTE
    )

    const objectifValide = computed(() => {
      const f = formObjectif.value
      const taille = nombreOuNull(f.taille_cm)
      const poids = nombreOuNull(f.poids_actuel_kg)
      if (!f.date_naissance || taille === null || poids === null) return false
      if (f.objectif === 'maintien') return true
      return nombreOuNull(f.poids_cible_kg) !== null && Number(f.rythme_kg_semaine) > 0
    })

    const chargerBilan = async () => {
      chargementBilan.value = true
      try {
        bilan.value = await api.get('/diete/objectif')
      } catch (e) {
        erreurListe.value = e.message || "Erreur de chargement de l'objectif"
      } finally {
        chargementBilan.value = false
      }
    }

    const ouvrirObjectif = () => {
      // Repartir des valeurs enregistrées plutôt que d'un formulaire vide :
      // corriger son niveau d'activité ne doit pas obliger à tout ressaisir.
      formObjectif.value = bilan.value
        ? {
            objectif: bilan.value.objectif,
            sexe: bilan.value.sexe,
            date_naissance: bilan.value.date_naissance,
            taille_cm: String(bilan.value.taille_cm),
            poids_actuel_kg: String(bilan.value.poids_actuel_kg),
            poids_cible_kg: bilan.value.poids_cible_kg === null ? '' : String(bilan.value.poids_cible_kg),
            niveau_activite: bilan.value.niveau_activite,
            rythme_kg_semaine: bilan.value.rythme_kg_semaine || 0.5,
            masse_grasse_pct: bilan.value.masse_grasse_pct === null ? '' : String(bilan.value.masse_grasse_pct)
          }
        : formObjectifVide()
      erreurModale.value = ''
      modaleObjectif.value = true
    }

    const fermerObjectif = () => {
      modaleObjectif.value = false
      erreurModale.value = ''
    }

    // Changer d'objectif remet un rythme cohérent : 1 kg/semaine reste
    // sélectionné en passant à la prise de masse, où il n'est plus proposé.
    const choisirObjectif = (valeur) => {
      formObjectif.value.objectif = valeur
      if (valeur === 'prise') formObjectif.value.rythme_kg_semaine = 0.25
      else if (valeur === 'perte') formObjectif.value.rythme_kg_semaine = 0.5
    }

    const enregistrerObjectif = async () => {
      if (!objectifValide.value || envoiEnCours.value) return
      envoiEnCours.value = true
      erreurModale.value = ''
      const f = formObjectif.value
      const corps = {
        sexe: f.sexe,
        date_naissance: f.date_naissance,
        taille_cm: nombreOuNull(f.taille_cm),
        poids_actuel_kg: nombreOuNull(f.poids_actuel_kg),
        niveau_activite: f.niveau_activite,
        objectif: f.objectif,
        poids_cible_kg: f.objectif === 'maintien' ? null : nombreOuNull(f.poids_cible_kg),
        rythme_kg_semaine: f.objectif === 'maintien' ? 0 : Number(f.rythme_kg_semaine),
        masse_grasse_pct: nombreOuNull(f.masse_grasse_pct)
      }
      try {
        bilan.value = await api.put('/diete/objectif', corps)
        modaleObjectif.value = false
      } catch (e) {
        erreurModale.value = e.message || "Erreur lors de l'enregistrement"
      } finally {
        envoiEnCours.value = false
      }
    }

    const supprimerObjectif = async () => {
      if (!confirm('Supprimer votre objectif et sa cible calorique ?')) return
      erreurListe.value = ''
      try {
        await api.del('/diete/objectif')
        bilan.value = null
      } catch (e) {
        erreurListe.value = e.message || 'Erreur lors de la suppression'
      }
    }

    const charger = async () => {
      chargement.value = true
      erreurListe.value = ''
      try {
        repas.value = await api.get(`/diete/jour?date=${jour.value}`)
      } catch (e) {
        erreurListe.value = e.message || 'Erreur de chargement'
      } finally {
        chargement.value = false
      }
    }

    const changerJour = (sens) => {
      const [a, m, j] = jour.value.split('-').map(Number)
      const d = new Date(a, m - 1, j + sens)
      if (d > new Date()) return
      jour.value = dateISOLocale(d)
      charger()
    }

    const allerAujourdhui = () => {
      jour.value = dateISOLocale(new Date())
      charger()
    }

    /* --- Repas --- */

    const ouvrirNouveauRepas = () => {
      formRepas.value = { id: null, nom: '' }
      erreurModale.value = ''
      modaleRepas.value = true
    }

    const ouvrirRenommage = (r) => {
      formRepas.value = { id: r.id, nom: r.nom }
      erreurModale.value = ''
      modaleRepas.value = true
    }

    const fermerModaleRepas = () => {
      modaleRepas.value = false
      erreurModale.value = ''
    }

    const enregistrerRepas = async () => {
      const nom = formRepas.value.nom.trim()
      if (!nom || envoiEnCours.value) return
      envoiEnCours.value = true
      erreurModale.value = ''
      try {
        if (formRepas.value.id) await api.patch(`/diete/repas/${formRepas.value.id}`, { nom })
        else await api.post('/diete/repas', { date: jour.value, nom })
        modaleRepas.value = false
        await charger()
      } catch (e) {
        erreurModale.value = e.message || "Erreur lors de l'enregistrement"
      } finally {
        envoiEnCours.value = false
      }
    }

    const supprimerRepas = async (r) => {
      const suffixe = r.lignes.length ? ` et ses ${r.lignes.length} aliment${r.lignes.length > 1 ? 's' : ''}` : ''
      if (!confirm(`Supprimer « ${r.nom} »${suffixe} ?`)) return
      erreurListe.value = ''
      try {
        await api.del(`/diete/repas/${r.id}`)
        await charger()
      } catch (e) {
        erreurListe.value = e.message || 'Erreur lors de la suppression'
      }
    }

    /* --- Aliments --- */

    const ouvrirRecherche = async (r) => {
      repasCible.value = r
      ligneEditee.value = null
      alimentChoisi.value = null
      grammes.value = ''
      requete.value = ''
      resultats.value = []
      formManuel.value = formManuelVide()
      erreurModale.value = ''
      etape.value = 'recherche'
      modaleAliment.value = true
      await nextTick()
      champRecherche.value?.focus()
    }

    const ouvrirEditionQuantite = async (r, ligne) => {
      repasCible.value = r
      ligneEditee.value = ligne
      alimentChoisi.value = {
        id: ligne.aliment_id,
        nom: ligne.nom,
        kcal_100g: ligne.kcal_100g,
        // La ligne ne renvoie que les valeurs déjà pondérées : on remonte
        // aux valeurs pour 100 g pour que l'aperçu suive la nouvelle quantité.
        proteines_100g: ligne.proteines === null ? null : (ligne.proteines * 100) / ligne.grammes,
        glucides_100g: ligne.glucides === null ? null : (ligne.glucides * 100) / ligne.grammes,
        lipides_100g: ligne.lipides === null ? null : (ligne.lipides * 100) / ligne.grammes
      }
      grammes.value = String(formatNombre(ligne.grammes))
      erreurModale.value = ''
      etape.value = 'quantite'
      modaleAliment.value = true
      await nextTick()
      champQuantite.value?.select()
    }

    const fermerModaleAliment = () => {
      clearTimeout(timerRecherche)
      modaleAliment.value = false
      erreurModale.value = ''
    }

    const retourRecherche = async () => {
      alimentChoisi.value = null
      erreurModale.value = ''
      etape.value = 'recherche'
      await nextTick()
      champRecherche.value?.focus()
    }

    const rechercher = async () => {
      const q = requete.value.trim()
      if (q.length < 2) {
        resultats.value = []
        recherchEnCours.value = false
        return
      }
      recherchEnCours.value = true
      try {
        resultats.value = await api.get(`/diete/aliments?q=${encodeURIComponent(q)}`)
      } catch {
        resultats.value = []
      } finally {
        recherchEnCours.value = false
      }
    }

    const planifierRecherche = () => {
      clearTimeout(timerRecherche)
      if (requete.value.trim().length < 2) {
        resultats.value = []
        return
      }
      recherchEnCours.value = true
      timerRecherche = setTimeout(rechercher, 250)
    }

    const viderRecherche = () => {
      clearTimeout(timerRecherche)
      requete.value = ''
      resultats.value = []
      recherchEnCours.value = false
      champRecherche.value?.focus()
    }

    const choisirAliment = async (a) => {
      alimentChoisi.value = a
      grammes.value = ''
      erreurModale.value = ''
      etape.value = 'quantite'
      await nextTick()
      champQuantite.value?.focus()
    }

    const ouvrirSaisieManuelle = () => {
      formManuel.value = { ...formManuelVide(), nom: requete.value.trim() }
      erreurModale.value = ''
      etape.value = 'manuel'
    }

    const formManuelValide = computed(() => {
      const kcal = nombreOuNull(formManuel.value.kcal_100g)
      return !!formManuel.value.nom.trim() && kcal !== null && kcal >= 0 && kcal <= 1000
    })

    const validerSaisieManuelle = async () => {
      if (!formManuelValide.value) return
      alimentChoisi.value = {
        id: null,
        nom: formManuel.value.nom.trim(),
        kcal_100g: nombreOuNull(formManuel.value.kcal_100g),
        proteines_100g: nombreOuNull(formManuel.value.proteines_100g),
        glucides_100g: nombreOuNull(formManuel.value.glucides_100g),
        lipides_100g: nombreOuNull(formManuel.value.lipides_100g)
      }
      grammes.value = ''
      etape.value = 'quantite'
      await nextTick()
      champQuantite.value?.focus()
    }

    // Le total se recalcule à chaque frappe dans le champ des grammes :
    // l'athlète voit ce que pèse sa portion avant de valider.
    const apercu = computed(() => {
      const g = nombreOuNull(grammes.value)
      if (!alimentChoisi.value || g === null || g <= 0 || g > 5000) return null
      const facteur = g / 100
      const pondere = (v) => (v === null || v === undefined ? null : Math.round(v * facteur * 10) / 10)
      return {
        grammes: g,
        kcal: Math.round(alimentChoisi.value.kcal_100g * facteur),
        proteines: pondere(alimentChoisi.value.proteines_100g),
        glucides: pondere(alimentChoisi.value.glucides_100g),
        lipides: pondere(alimentChoisi.value.lipides_100g)
      }
    })

    const enregistrerLigne = async () => {
      if (!apercu.value || envoiEnCours.value) return
      envoiEnCours.value = true
      erreurModale.value = ''
      try {
        if (ligneEditee.value) {
          await api.patch(`/diete/lignes/${ligneEditee.value.id}`, { grammes: apercu.value.grammes })
        } else {
          const corps = { grammes: apercu.value.grammes }
          if (alimentChoisi.value.id) {
            corps.aliment_id = alimentChoisi.value.id
          } else {
            Object.assign(corps, {
              nom: alimentChoisi.value.nom,
              kcal_100g: alimentChoisi.value.kcal_100g,
              proteines_100g: alimentChoisi.value.proteines_100g,
              glucides_100g: alimentChoisi.value.glucides_100g,
              lipides_100g: alimentChoisi.value.lipides_100g
            })
          }
          await api.post(`/diete/repas/${repasCible.value.id}/lignes`, corps)
        }
        modaleAliment.value = false
        await charger()
      } catch (e) {
        erreurModale.value = e.message || "Erreur lors de l'enregistrement"
      } finally {
        envoiEnCours.value = false
      }
    }

    const supprimerLigne = async (ligne) => {
      erreurListe.value = ''
      try {
        await api.del(`/diete/lignes/${ligne.id}`)
        await charger()
      } catch (e) {
        erreurListe.value = e.message || 'Erreur lors de la suppression'
      }
    }

    const titreModaleAliment = computed(() => {
      if (ligneEditee.value) return 'Modifier la quantité'
      if (etape.value === 'manuel') return 'Aliment hors catalogue'
      if (etape.value === 'quantite') return 'Quelle quantité ?'
      return 'Ajouter un aliment'
    })

    // La cible est chargée dès le montage, pas à l'ouverture de l'onglet
    // Objectif : c'est la vue Journée qui s'en sert pour situer le total.
    onMounted(() => Promise.all([charger(), chargerBilan()]))
    onBeforeUnmount(() => clearTimeout(timerRecherche))

    return {
      REPAS_COURANTS, RACCOURCIS_G, OBJECTIFS, LABELS_OBJECTIF,
      NIVEAUX_ACTIVITE, LABELS_ACTIVITE_COURT,
      vue, bilan, chargementBilan, reste, aujourdhuiISO, formatDateLongue,
      modaleObjectif, formObjectif, objectifValide, rythmesProposes,
      ouvrirObjectif, fermerObjectif, choisirObjectif, enregistrerObjectif, supprimerObjectif,
      jour, repas, chargement, envoiEnCours, erreurListe, erreurModale,
      estAujourdhui, labelJour, totalJour, fr,
      changerJour, allerAujourdhui,
      modaleRepas, formRepas, ouvrirNouveauRepas, ouvrirRenommage, fermerModaleRepas,
      enregistrerRepas, supprimerRepas,
      modaleAliment, etape, ligneEditee, titreModaleAliment,
      requete, resultats, recherchEnCours, champRecherche, champQuantite,
      alimentChoisi, grammes, apercu, formManuel, formManuelValide,
      ouvrirRecherche, ouvrirEditionQuantite, fermerModaleAliment, retourRecherche,
      planifierRecherche, viderRecherche, choisirAliment,
      ouvrirSaisieManuelle, validerSaisieManuelle,
      enregistrerLigne, supprimerLigne
    }
  }
}
</script>

<style scoped>
.diete {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: var(--spacing-lg);
  padding: var(--spacing-lg) var(--spacing-xl);
  overflow-y: auto;
  min-height: 0;
  touch-action: pan-y;
}

/* --- Sous-onglets Journée / Objectif --- */
.sous-onglets {
  display: flex;
  gap: 2px;
  background: var(--color-bg-secondary);
  border-radius: var(--radius-md);
  padding: 3px;
}
.sous-onglets button {
  flex: 1;
  min-height: 38px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: none;
  border-radius: var(--radius-sm);
  background: none;
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text-secondary);
  cursor: pointer;
}
.sous-onglets button.actif {
  background: var(--color-bg);
  color: var(--color-primary-dark);
  box-shadow: var(--shadow-sm);
}

/* --- Bandeau du jour --- */
.diete-jour { display: flex; align-items: center; gap: var(--spacing-md); }
.diete-jour-label { flex: 1; text-align: center; }
.diete-jour-titre {
  display: block;
  font-size: var(--font-size-lg);
  font-weight: 700;
}
/* toLocaleDateString rend « mercredi 5 août » : seule l'initiale se capitalise,
   text-transform: capitalize donnerait « Mercredi 5 Août ». */
.diete-jour-titre::first-letter { text-transform: uppercase; }
.diete-jour-retour {
  border: none;
  background: none;
  padding: 0;
  font-size: var(--font-size-xs);
  color: var(--color-primary);
  cursor: pointer;
}

/* --- Total de la journée --- */
.diete-total {
  background: var(--color-primary-light);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
  text-align: center;
}
.diete-total-kcal {
  font-size: 34px;
  font-weight: 800;
  line-height: 1;
  color: var(--color-primary-text);
  font-variant-numeric: tabular-nums;
}
.diete-total-unite { font-size: var(--font-size-base); font-weight: 600; margin-left: 6px; }
.diete-total-cible { font-size: var(--font-size-lg); font-weight: 600; opacity: 0.65; margin-left: 6px; }
.diete-reste { margin-top: 6px; font-size: var(--font-size-xs); font-weight: 600; color: var(--color-primary-text); }
.diete-reste.depasse { color: var(--color-warning-text-strong); }
.diete-macros {
  display: flex;
  justify-content: center;
  gap: var(--spacing-lg);
  margin-top: var(--spacing-sm);
  font-size: var(--font-size-xs);
  color: var(--color-primary-text);
}
.diete-macro b { font-size: var(--font-size-sm); }

/* --- Carte repas --- */
.repas-carte {
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}
.repas-head { display: flex; align-items: center; gap: var(--spacing-sm); }
.repas-nom { flex: 1; margin: 0; font-size: var(--font-size-base); font-weight: 700; }
.repas-kcal {
  font-size: var(--font-size-sm);
  font-weight: 700;
  color: var(--color-primary);
  font-variant-numeric: tabular-nums;
}
.repas-action {
  border: none;
  background: none;
  padding: 4px;
  font-size: var(--font-size-base);
  color: var(--color-text-muted);
  cursor: pointer;
}
.repas-action:hover { color: var(--color-text-body); }

/* --- Lignes d'aliment --- */
.ligne-liste { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
.ligne {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  border-top: 1px solid var(--color-border);
  padding: 6px 0;
}
.ligne-corps {
  flex: 1;
  min-width: 0;
  min-height: var(--tap-min);
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 2px;
  border: none;
  background: none;
  padding: 0;
  text-align: left;
  cursor: pointer;
}
.ligne-nom {
  font-size: var(--font-size-sm);
  color: var(--color-text-body);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ligne-meta { font-size: var(--font-size-xs); color: var(--color-text-muted); }
.ligne-kcal {
  font-size: var(--font-size-sm);
  font-weight: 700;
  color: var(--color-text);
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
}
.ligne-suppr {
  border: none;
  background: none;
  padding: 4px;
  color: var(--color-text-muted);
  cursor: pointer;
  flex-shrink: 0;
}
.ligne-suppr:hover { color: var(--color-danger-text); }

.repas-ajout { align-self: flex-start; margin-top: var(--spacing-xs); }
.btn-nouveau-repas { align-self: flex-start; }

/* --- Modale : recherche --- */
.modal-aliment { display: flex; flex-direction: column; }
.modal-retour {
  border: none;
  background: none;
  padding: 4px;
  font-size: var(--font-size-lg);
  color: var(--color-text-secondary);
  cursor: pointer;
}

.recherche-champ {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 0 var(--spacing-md);
  background: var(--color-bg);
}
.recherche-champ:focus-within { border-color: var(--color-primary); }
.recherche-champ i { color: var(--color-text-muted); flex-shrink: 0; }
.recherche-champ input {
  flex: 1;
  min-width: 0;
  min-height: var(--input-h);
  border: none;
  outline: none;
  background: none;
  /* 16px minimum : en dessous, iOS zoome au focus du champ. */
  font-size: var(--font-size-base);
  color: var(--color-text-body);
}
.recherche-vider { border: none; background: none; padding: 4px; color: var(--color-text-muted); cursor: pointer; }

.resultats {
  list-style: none;
  margin: 0;
  padding: 0;
  max-height: 46vh;
  overflow-y: auto;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}
.resultats li + li { border-top: 1px solid var(--color-border); }
.resultat {
  width: 100%;
  min-height: var(--tap-min);
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-sm) var(--spacing-md);
  border: none;
  background: none;
  text-align: left;
  cursor: pointer;
}
.resultat:hover { background: var(--color-bg-secondary); }
.resultat-texte { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.resultat-nom { font-size: var(--font-size-sm); color: var(--color-text-body); }
.resultat-groupe {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.resultat-kcal {
  flex-shrink: 0;
  text-align: right;
  color: var(--color-primary);
  font-variant-numeric: tabular-nums;
}
.resultat-kcal b { display: block; font-size: var(--font-size-base); }
.resultat-kcal span { font-size: 10px; color: var(--color-text-muted); }

.manuel-lien { align-self: flex-start; }
.aide { margin: 0; font-size: var(--font-size-xs); color: var(--color-text-muted); }
.manuel-macros { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--spacing-sm); }

/* --- Modale : quantité --- */
.choisi {
  display: flex;
  flex-direction: column;
  gap: 2px;
  background: var(--color-bg-secondary);
  border-radius: var(--radius-md);
  padding: var(--spacing-md);
}
.choisi-nom { font-size: var(--font-size-base); font-weight: 700; }
.choisi-kcal { font-size: var(--font-size-sm); color: var(--color-text-secondary); }

.raccourcis { display: flex; gap: var(--spacing-sm); flex-wrap: wrap; }
.raccourci {
  flex: 1;
  min-width: 60px;
  min-height: 36px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  background: var(--color-bg);
  font-size: var(--font-size-sm);
  color: var(--color-text-body);
  cursor: pointer;
}
.raccourci:hover { border-color: var(--color-primary); color: var(--color-primary); }

.apercu {
  background: var(--color-primary-light);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
  text-align: center;
}
.apercu.vide { background: var(--color-bg-secondary); }
.apercu-kcal {
  font-size: 32px;
  font-weight: 800;
  line-height: 1;
  color: var(--color-primary-text);
  font-variant-numeric: tabular-nums;
}
.apercu.vide .apercu-kcal { color: var(--color-text-muted); }
.apercu-unite { font-size: var(--font-size-base); font-weight: 600; margin-left: 6px; }
.apercu-macros {
  display: flex;
  justify-content: center;
  gap: var(--spacing-lg);
  margin-top: var(--spacing-sm);
  font-size: var(--font-size-xs);
  color: var(--color-primary-text);
}

/* --- Jauge partagée : total du jour vs cible, et avancement vers le poids visé --- */
.jauge {
  height: 8px;
  border-radius: var(--radius-full);
  background: var(--color-bg-tertiary);
  overflow: hidden;
  margin-top: var(--spacing-sm);
}
.jauge-barre {
  height: 100%;
  border-radius: var(--radius-full);
  background: var(--color-primary);
  transition: width 0.25s;
}
.jauge-barre.depasse { background: var(--color-warning-icon); }

/* --- Vue Objectif --- */
.objectif-cta { margin-top: var(--spacing-md); }

.cible-carte {
  background: var(--color-primary-light);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
  text-align: center;
  color: var(--color-primary-text);
}
.cible-badge {
  display: inline-block;
  font-size: var(--font-size-xs);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  opacity: 0.75;
}
.cible-kcal {
  font-size: 34px;
  font-weight: 800;
  line-height: 1.1;
  font-variant-numeric: tabular-nums;
}
.cible-unite { font-size: var(--font-size-base); font-weight: 600; margin-left: 6px; }
.cible-sub { font-size: var(--font-size-xs); margin-top: 2px; }

.alerte {
  display: flex;
  gap: var(--spacing-sm);
  background: var(--color-warning-bg-soft);
  border: 1px solid var(--color-warning-border);
  border-radius: var(--radius-md);
  padding: var(--spacing-md);
  font-size: var(--font-size-xs);
  color: var(--color-warning-text-strong);
}
.alerte i { color: var(--color-warning-icon); flex-shrink: 0; font-size: var(--font-size-base); }

.detail-calcul {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.detail-titre {
  margin: 0 0 2px;
  font-size: var(--font-size-xs);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  color: var(--color-text-secondary);
}
.detail-ligne {
  display: flex;
  justify-content: space-between;
  gap: var(--spacing-md);
  font-size: var(--font-size-sm);
  color: var(--color-text-body);
}
.detail-ligne b { font-variant-numeric: tabular-nums; flex-shrink: 0; }
.detail-note { margin: 4px 0 0; font-size: var(--font-size-xs); color: var(--color-text-muted); }

.progression { display: flex; flex-direction: column; gap: 2px; }
.progression-bornes {
  display: flex;
  justify-content: space-between;
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  text-align: center;
}
.progression-bornes > span:first-child { text-align: left; }
.progression-bornes > span:last-child { text-align: right; }
.progression-bornes b { font-size: var(--font-size-base); color: var(--color-text); }
.progression-actuel b { color: var(--color-primary); }
.progression-lbl { font-size: 10px; color: var(--color-text-muted); }
.progression-sub { font-size: var(--font-size-xs); color: var(--color-text-muted); margin-top: 4px; }

.objectif-actions { display: flex; gap: var(--spacing-sm); }

/* --- Formulaire d'objectif --- */
.modal-objectif .modal-body { gap: var(--spacing-lg); }
.deux-colonnes { display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-md); }
.choix-cartes { display: flex; gap: var(--spacing-sm); }
.choix-carte {
  flex: 1;
  min-height: 64px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: var(--spacing-sm) 4px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg);
  font-size: 11px;
  font-weight: 600;
  line-height: 1.15;
  text-align: center;
  color: var(--color-text-body);
  cursor: pointer;
}
.choix-carte i { font-size: 20px; color: var(--color-text-muted); }
.choix-carte.actif {
  border-color: var(--color-primary);
  background: var(--color-primary-light);
  color: var(--color-primary-text);
}
.choix-carte.actif i { color: var(--color-primary); }

.ouinon { display: flex; gap: var(--spacing-sm); }
.ouinon-btn {
  flex: 1;
  min-height: var(--tap-min);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg);
  font-size: var(--font-size-base);
  font-weight: 600;
  color: var(--color-text-body);
  cursor: pointer;
}
.ouinon-btn.actif { background: var(--color-primary); border-color: var(--color-primary); color: var(--color-on-primary); }

/* --- Suggestions de nom de repas --- */
.suggestions { display: flex; flex-wrap: wrap; gap: var(--spacing-sm); }
.suggestion {
  min-height: 36px;
  padding: 0 var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  background: var(--color-bg);
  font-size: var(--font-size-sm);
  color: var(--color-text-body);
  cursor: pointer;
}
.suggestion.actif {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: var(--color-on-primary);
}

.empty { color: var(--color-text-muted); font-size: var(--font-size-sm); margin: 0; }
.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: var(--color-text-secondary);
  gap: var(--spacing-xs);
}
.empty-state p { margin: 0; font-weight: 600; }
.empty-state span { font-size: var(--font-size-sm); color: var(--color-text-muted); }
.empty-icon { font-size: 40px; color: var(--color-border); }
</style>
