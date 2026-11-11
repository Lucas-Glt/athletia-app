<template>
  <div class="athletes-panel" :class="{ 'avec-fiche': athleteSelectionne }">
    <!-- VUE LISTE -->
    <template v-if="!athleteSelectionne">
      <div class="panel-header">
        <div>
          <h2 class="panel-titre">Mes athlètes</h2>
          <p class="panel-sous-titre" v-if="monCercle.length > 0">
            {{ monCercle.length }} athlète{{ monCercle.length > 1 ? 's' : '' }} suivi{{ monCercle.length > 1 ? 's' : '' }},
            du plus actif au moins actif
          </p>
        </div>
        <div class="header-actions">
          <button class="btn" @click="ouvrirGestionGroupes()"><i class="ti ti-tags"></i> Groupes</button>
          <button class="btn btn-primary" @click="basculerAjout" :aria-expanded="ajoutOuvert">
            <i class="ti" :class="ajoutOuvert ? 'ti-x' : 'ti-user-plus'"></i> {{ ajoutOuvert ? 'Fermer' : 'Ajouter' }}
          </button>
        </div>
      </div>

      <Transition name="deplier">
        <form v-if="ajoutOuvert" class="ajout-athlete" @submit.prevent="rechercherAthlète">
          <label class="ajout-athlete-titre" for="email-athlete">Ajouter un athlète à votre cercle</label>
          <div class="ajout-athlete-ligne">
            <input id="email-athlete" v-model="searchEmail" placeholder="Email de l'athlète" type="email" autocomplete="off" />
            <button class="btn" type="submit" :disabled="!searchEmail">Rechercher</button>
          </div>
          <div v-if="athleteTrouve" class="athlete-trouve">
            <span class="avatar-athlete">
              <img v-if="athleteTrouve.photo_url" class="avatar-photo" :src="urlApi(athleteTrouve.photo_url)" alt="" />
              <template v-else>{{ initiales(athleteTrouve.nom) }}</template>
            </span>
            <div class="athlete-trouve-info">
              <div class="athlete-trouve-nom">{{ athleteTrouve.nom }}</div>
              <div class="athlete-trouve-email">{{ athleteTrouve.email }}</div>
            </div>
            <button class="btn btn-sm btn-primary" type="button" @click="ajouterAuCercle"><i class="ti ti-plus"></i> Ajouter</button>
          </div>
          <div v-if="searchError" class="error">{{ searchError }}</div>
          <p v-if="codeCoach" class="code-coach-aide">
            <i class="ti ti-key"></i>
            Vos athlètes peuvent aussi vous rejoindre eux-mêmes avec votre code coach <b>{{ codeCoach }}</b>
            (à l'inscription ou dans leur profil).
          </p>
        </form>
      </Transition>

      <section class="indicateurs" v-if="!loading && resumes.length > 0">
        <div class="indicateurs-entete">
          <span class="section-title">Vue d'ensemble</span>
          <button type="button" class="lien-aide" @click="aideOuverte = true">
            <i class="ti ti-help-circle"></i> Comment lire ces indicateurs ?
          </button>
        </div>

        <div class="kpi-grid">
          <button
            v-for="cle in GROUPES_INDICATEURS[0].cles"
            :key="cle"
            type="button"
            class="kpi"
            :class="[`ton-${INDICATEURS[cle].ton}`, { active: indicateurFiltre === cle, vide: compteurs[cle] === 0 }]"
            :disabled="cle !== 'tous' && compteurs[cle] === 0"
            @click="filtrerPar(cle)"
          >
            <span class="kpi-label"><span class="ton-dot"></span>{{ INDICATEURS[cle].label }}</span>
            <span class="kpi-valeur">{{ compteurs[cle] }}</span>
            <span class="kpi-aide">{{ INDICATEURS[cle].aide }}</span>
          </button>
        </div>

        <!-- Mobile : le détail est replié pour que la liste arrive vite à l'écran -->
        <button type="button" class="details-toggle" :aria-expanded="detailsOuverts" @click="detailsOuverts = !detailsOuverts">
          <i class="ti ti-chart-bar"></i>
          <span>Charge &amp; wellness</span>
          <i class="ti" :class="detailsOuverts ? 'ti-chevron-up' : 'ti-chevron-down'"></i>
        </button>
        <div class="indicateurs-details" :class="{ ouvert: detailsOuverts }">
          <div class="detail-bloc" v-for="groupe in GROUPES_INDICATEURS.slice(1)" :key="groupe.titre">
            <div class="detail-bloc-titre">{{ groupe.titre }}</div>
            <div v-if="groupe.repartition" class="repartition" aria-hidden="true">
              <span
                v-for="cle in groupe.cles"
                v-show="compteurs[cle] > 0"
                :key="cle"
                class="repartition-seg"
                :class="`ton-${INDICATEURS[cle].ton}`"
                :style="{ flexGrow: compteurs[cle] }"
              ></span>
              <span v-if="sansZoneAcwr > 0" class="repartition-seg" :style="{ flexGrow: sansZoneAcwr }"></span>
            </div>
            <div class="detail-items">
              <button
                v-for="cle in groupe.cles"
                :key="cle"
                type="button"
                class="detail-item"
                :class="[`ton-${INDICATEURS[cle].ton}`, { active: indicateurFiltre === cle }]"
                :disabled="compteurs[cle] === 0"
                @click="filtrerPar(cle)"
              >
                <span class="ton-dot"></span>
                <span class="detail-item-label">{{ INDICATEURS[cle].label }} <small>{{ INDICATEURS[cle].aide }}</small></span>
                <span class="detail-item-valeur">
                  {{ compteurs[cle] }}<small v-if="INDICATEURS[cle].surTotal">/{{ compteurs.tous }}</small>
                </span>
              </button>
            </div>
            <p v-if="groupe.repartition && sansZoneAcwr > 0" class="detail-note">
              {{ sansZoneAcwr }} sans ACWR calculable (moins de 28 jours de données)
            </p>
          </div>
        </div>

        <div class="filtre-actif" v-if="indicateurFiltre !== 'tous'">
          <i class="ti ti-filter"></i>
          <span>{{ INDICATEURS[indicateurFiltre].label }} — {{ INDICATEURS[indicateurFiltre].aide }}</span>
          <button class="btn-effacer-filtre" @click="filtrerPar('tous')"><i class="ti ti-x"></i> Tout afficher</button>
        </div>
      </section>

      <div class="filtres-row">
        <label class="recherche">
          <i class="ti ti-search"></i>
          <input v-model="rechercheNom" type="search" placeholder="Rechercher un athlète" aria-label="Rechercher un athlète" />
        </label>
        <div class="chips" v-if="groupes.length > 0">
          <button class="chip-filtre" :class="{ active: groupeFiltre === 'tous' }" @click="groupeFiltre = 'tous'">Tous</button>
          <button
            v-for="g in groupes"
            :key="g.id"
            class="chip-filtre"
            :class="{ active: groupeFiltre === g.id }"
            @click="groupeFiltre = groupeFiltre === g.id ? 'tous' : g.id"
          >
            <span class="groupe-dot" :style="{ background: g.couleur || 'var(--color-primary)' }"></span>
            {{ g.nom }}
          </button>
        </div>
        <select v-if="estSuperPrepa" v-model="organisationFiltre" class="select-org-filtre">
          <option value="toutes">Toutes organisations</option>
          <option value="independant">Indépendant</option>
          <option v-for="org in organisationsCercle" :key="org.id" :value="org.id">{{ org.nom }}</option>
        </select>
      </div>

      <div v-if="loading" class="empty">Chargement...</div>
      <div v-else-if="monCercle.length === 0" class="empty">
        Aucun athlète dans votre cercle pour l'instant : ajoutez-en un avec le bouton « Ajouter ».
      </div>
      <div v-else-if="athletesFiltres.length === 0" class="empty">Aucun athlète pour ce filtre.</div>

      <template v-else>
        <div class="liste-entete">
          <span class="section-title">{{ athletesFiltres.length }} athlète{{ athletesFiltres.length > 1 ? 's' : '' }}</span>
          <span class="tri-info"><i class="ti ti-sort-descending"></i> Les plus actifs en premier</span>
        </div>

        <div class="athlete-liste">
          <button
            v-for="a in athletesFiltres"
            :key="a.id"
            type="button"
            class="athlete-carte"
            :class="`activite-${niveauActivite(a.resume)}`"
            @click="ouvrirFiche(a)"
          >
            <span class="carte-haut">
              <span class="avatar-athlete">
                <img v-if="a.photo_url" class="avatar-photo" :src="urlApi(a.photo_url)" alt="" />
                <template v-else>{{ initiales(a.nom) }}</template>
                <span class="avatar-pastille" :title="LABELS_NIVEAU_ACTIVITE[niveauActivite(a.resume)]"></span>
              </span>
              <span class="carte-identite">
                <span class="carte-nom">
                  {{ a.nom }}
                  <span class="badge badge-gray" v-if="estSuperPrepa">{{ a.organisation?.nom || 'Indépendant' }}</span>
                </span>
                <span class="carte-activite" v-if="a.resume">
                  <span class="activite-libelle">{{ libelleActivite(a.resume) }}</span>
                  <span class="activite-jours" v-if="a.resume.jours_actifs_28j">
                    · {{ a.resume.jours_actifs_28j }} j actif{{ a.resume.jours_actifs_28j > 1 ? 's' : '' }} sur {{ FENETRE_ACTIVITE }}
                  </span>
                </span>
              </span>
              <span
                class="acwr-badge"
                v-if="a.resume"
                :class="'zone-' + (a.resume.acwr.zone || 'insuffisant')"
                title="ACWR : charge des 7 derniers jours / moyenne des 28"
              >
                <small>ACWR</small>{{ a.resume.acwr.valeur !== null ? a.resume.acwr.valeur.toFixed(2).replace('.', ',') : '—' }}
              </span>
              <i class="ti ti-chevron-right carte-chevron"></i>
            </span>

            <span class="carte-stats" v-if="a.resume">
              <span class="stat">
                <span class="stat-label"><i class="ti ti-run"></i> Séance</span>
                <span class="stat-valeur">{{ formatJourRelatif(a.resume.derniere_seance) }}</span>
              </span>
              <span class="stat">
                <span class="stat-label"><i class="ti ti-activity"></i> Charge 7 j</span>
                <span class="stat-valeur">
                  {{ Math.round(a.resume.charge_semaine) }}
                  <i class="ti tendance" :class="iconeTendance(a.resume.tendance)"></i>
                </span>
              </span>
              <span class="stat">
                <span class="stat-label"><i class="ti ti-mood-check"></i> Wellness</span>
                <span class="stat-valeur">
                  {{ formatJourRelatif(a.resume.dernier_wellness) }}
                  <span v-if="a.resume.hooper_dernier" class="mini-badge" :class="'wellness-' + a.resume.wellness_zone">{{ a.resume.hooper_dernier }}/28</span>
                </span>
              </span>
              <span class="stat">
                <span class="stat-label"><i class="ti ti-zzz"></i> Sommeil 7 j</span>
                <span class="stat-valeur">
                  {{ a.resume.sommeil.moyenne !== null ? formatHeures(a.resume.sommeil.moyenne) : '—' }}
                  <span v-if="a.resume.sommeil.nuits_courtes > 0" class="mini-badge" :class="'sommeil-' + a.resume.sommeil.niveau">
                    {{ a.resume.sommeil.nuits_courtes }} nuit{{ a.resume.sommeil.nuits_courtes > 1 ? 's' : '' }} &lt; 7 h
                  </span>
                </span>
              </span>
              <span class="stat">
                <span class="stat-label"><i class="ti ti-scale"></i> Poids</span>
                <span class="stat-valeur" :title="a.resume.dernier_poids ? `Pesée : ${formatJourRelatif(a.resume.dernier_poids.date)}` : null">
                  {{ a.resume.dernier_poids ? `${a.resume.dernier_poids.poids} kg` : '—' }}
                </span>
              </span>
            </span>

            <span class="carte-bas" v-if="a.resume || groupesDe(a.id).length > 0">
              <span class="signaux" v-if="a.resume">
                <span class="signal signal-blessure" v-if="a.resume.blessures_en_cours > 0">
                  <i class="ti ti-bandage"></i>
                  {{ a.resume.blessures_en_cours }} blessure{{ a.resume.blessures_en_cours > 1 ? 's' : '' }} en cours
                </span>
                <span class="signal" v-for="(s, i) in a.resume.signaux" :key="i">
                  <i class="ti ti-alert-triangle"></i> {{ s }}
                </span>
                <span class="signal signal-ras" v-if="estRAS(a.resume)">
                  <i class="ti ti-circle-check"></i> RAS
                </span>
                <span class="signal signal-attente" v-else-if="a.resume.signaux.length === 0 && !a.resume.acwr.zone">
                  <i class="ti ti-hourglass"></i> ACWR pas encore calculable
                </span>
              </span>
              <span class="groupes-badges" v-if="groupesDe(a.id).length > 0">
                <span
                  class="groupe-badge"
                  v-for="g in groupesDe(a.id)"
                  :key="g.id"
                  :style="{ background: (g.couleur || '#7F77DD') + '22', color: g.couleur || 'var(--color-primary-dark)' }"
                >{{ g.nom }}</span>
              </span>
            </span>
          </button>
        </div>
      </template>
    </template>

    <!-- FICHE ATHLÈTE -->
    <FicheAthlete
      v-else
      :key="athleteSelectionne.id"
      :athlete="athleteSelectionne"
      :programmes="programmes"
      :groupes="groupes"
      :monCercle="monCercle"
      @fermer="athleteSelectionneId = null"
      @modifie="onModifie"
      @ouvrir-programme="$emit('ouvrir-programme', $event)"
    />

    <GroupesManagerModal
      v-if="modalGroupes"
      :groupes="groupes"
      :monCercle="monCercle"
      :athleteFocus="athleteFocusGroupes"
      @fermer="modalGroupes = false"
      @modifie="onModifie"
    />

    <div class="modal-overlay" v-if="aideOuverte" @click.self="aideOuverte = false">
      <div class="modal modal-large">
        <div class="modal-header">
          <h3>Comment lire ces indicateurs ?</h3>
          <button class="modal-close" @click="aideOuverte = false"><i class="ti ti-x"></i></button>
        </div>
        <div class="modal-body">
          <div class="aide-section">
            <h4>Activité &amp; ordre de la liste</h4>
            <p>La liste est classée <strong>du plus actif au moins actif</strong> : nombre de jours, sur les {{ FENETRE_ACTIVITE }} derniers, où l'athlète a fait au moins une action dans l'app (série cochée, séance validée, wellness, pesée ou repas), puis date de sa dernière action. Les athlètes inactifs passent toujours en bas.</p>
            <ul class="aide-zones">
              <li><span class="aide-dot aide-dot-optimale"></span><strong>Régulier</strong> — actif au moins {{ SEUIL_REGULIER }} jours sur {{ FENETRE_ACTIVITE }} (3 par semaine).</li>
              <li><span class="aide-dot aide-dot-vigilance"></span><strong>Irrégulier</strong> — actif ces {{ SEUIL_INACTIF_JOURS }} derniers jours, mais moins souvent.</li>
              <li><span class="aide-dot aide-dot-sous_charge"></span><strong>Inactif</strong> — aucune action depuis au moins {{ SEUIL_INACTIF_JOURS }} jours : à relancer.</li>
            </ul>
          </div>
          <div class="aide-section">
            <h4>Les indicateurs du tableau de bord</h4>
            <p>Chaque indicateur est cliquable : il filtre la liste sur les athlètes qu'il compte.</p>
            <ul class="aide-indicateurs">
              <li v-for="cle in CLES_INDICATEURS" :key="cle">
                <span class="aide-pastille" :class="`ton-${INDICATEURS[cle].ton}`">{{ compteurs[cle] }}</span>
                <span><strong>{{ INDICATEURS[cle].label }}</strong> — {{ INDICATEURS[cle].definition }}</span>
              </li>
            </ul>
          </div>
          <div class="aide-section">
            <h4>Charge de séance (sRPE)</h4>
            <p>Chaque séance validée par l'athlète donne une charge en UA (unités arbitraires) = <strong>ressenti d'effort (RPE, 0 à 10) × durée en minutes</strong>. C'est la brique de base de tous les indicateurs ci-dessous.</p>
          </div>
          <div class="aide-section">
            <h4>ACWR — charge aiguë / charge chronique</h4>
            <p>Compare la charge des <strong>7 derniers jours</strong> (aiguë) à la moyenne des <strong>28 derniers jours</strong> (chronique). Indisponible avant 28 jours d'historique (badge "—").</p>
            <ul class="aide-zones">
              <li><span class="aide-dot aide-dot-sous_charge"></span><strong>&lt; 0,8</strong> — sous-charge : l'athlète s'entraîne nettement moins que d'habitude.</li>
              <li><span class="aide-dot aide-dot-optimale"></span><strong>0,8 à 1,3</strong> — zone optimale.</li>
              <li><span class="aide-dot aide-dot-vigilance"></span><strong>1,3 à 1,5</strong> — vigilance : montée de charge à surveiller.</li>
              <li><span class="aide-dot aide-dot-surcharge"></span><strong>&gt; 1,5</strong> — surcharge : risque de blessure accru, montée trop rapide.</li>
            </ul>
          </div>
          <div class="aide-section">
            <h4>Monotonie &amp; contrainte</h4>
            <p><strong>Monotonie</strong> = régularité de la charge sur la semaine (charge moyenne ÷ écart-type quotidien). Une monotonie élevée signifie un entraînement peu varié d'un jour à l'autre — un facteur de risque même à charge modérée.</p>
            <p><strong>Contrainte</strong> = charge de la semaine × monotonie. Combine volume et manque de variation : c'est ce chiffre qui grimpe le plus vite en cas de programmation trop répétitive.</p>
          </div>
          <div class="aide-section">
            <h4>Wellness — Hooper Index</h4>
            <p>L'athlète note chaque jour 4 critères de 1 à 7 : sommeil, fatigue, courbatures, stress. Le total va de <strong>4 (forme parfaite) à 28 (très dégradé)</strong> — plus bas = mieux. Un signal se déclenche si l'indice se dégrade 3 jours de suite.</p>
          </div>
          <div class="aide-section">
            <h4>Sommeil — durée</h4>
            <p>L'athlète déclare aussi <strong>combien de temps il a dormi</strong>. C'est une donnée à part du Hooper Index (une durée, pas une note sur 7) : la qualité ressentie et la quantité effective sont deux choses différentes.</p>
            <p>La lecture se fait sur une <strong>fenêtre glissante de 7 nuits</strong>, jamais sur la nuit de la veille : dans la littérature, c'est le manque de sommeil <em>installé</em> qui est associé à la blessure. Sous 4 nuits renseignées sur 7, rien n'est affiché.</p>
            <ul class="aide-zones">
              <li><span class="aide-dot aide-dot-optimale"></span><strong>≥ 8 h</strong> — cible. Chez l'adolescent sportif, dormir 8 h ou plus est associé à environ <strong>deux fois moins</strong> de blessures (Milewski 2014 : &lt; 8 h → OR 1,7).</li>
              <li><span class="aide-dot aide-dot-vigilance"></span><strong>7 à 8 h</strong> — plancher adulte. En dessous de 7 h sur au moins deux semaines, le risque de blessure musculo-squelettique est multiplié par ~1,7.</li>
              <li><span class="aide-dot aide-dot-surcharge"></span><strong>&lt; 6 h</strong> — déficit marqué, signal automatique.</li>
            </ul>
            <p>Une moyenne correcte obtenue avec plusieurs nuits courtes rattrapées par des grasses matinées compte aussi comme insuffisante : l'irrégularité pèse, comme la monotonie sur la charge.</p>
          </div>
          <div class="aide-section">
            <h4>Signaux &amp; RAS</h4>
            <p>Les signaux sont générés automatiquement, sans action du prépa : zone de vigilance ou surcharge sur l'ACWR, wellness dégradé 3 jours de suite, sommeil chronique insuffisant, ou <strong>charge en hausse sur sommeil insuffisant</strong>.</p>
            <p>Ce dernier est le plus important : sommeil réduit <em>pendant</em> une montée de charge est le facteur le plus fortement associé à la blessure (OR ≈ 2,25, contre ~1,5 pour chacun pris isolément). Les deux signaux séparés peuvent être verts alors que leur croisement ne l'est pas.</p>
            <p>Un athlète est marqué <strong>RAS</strong> quand il n'a aucun signal, que son ACWR est calculable <em>et</em> qu'il a été actif ces {{ SEUIL_INACTIF_JOURS }} derniers jours. Sans signal mais avec moins de 28 jours de données, il porte le badge <strong>« ACWR pas encore calculable »</strong> : rien ne le signale, mais rien ne prouve non plus que tout va bien.</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch, onMounted } from 'vue'
import { useApi, urlApi } from '../../services/api'
import { useAuthStore } from '../../stores/auth'
import FicheAthlete from './FicheAthlete.vue'
import GroupesManagerModal from './GroupesManagerModal.vue'
import { formatHeures, estSommeilInsuffisant } from '../../data/sommeil'
import {
  FENETRE_ACTIVITE, SEUIL_REGULIER, SEUIL_INACTIF_JOURS, LABELS_NIVEAU_ACTIVITE,
  joursDepuis, formatJourRelatif, estInactif, niveauActivite, libelleActivite, comparerActivite
} from '../../data/activite'

// Au-delà, un relevé wellness ne dit plus rien de l'état actuel de l'athlète :
// on ne le compte plus comme « wellness bon ».
const FRAICHEUR_WELLNESS_JOURS = 3

// « Rien à signaler » : aucun signal ET assez d'historique pour que l'ACWR soit
// calculable — sans ça, l'absence de signal ne prouve rien. Une blessure
// déclarée disqualifie aussi le RAS : elle n'est pas un signal automatique,
// mais afficher « rien à signaler » sur un athlète blessé serait faux. Même
// chose pour un athlète qui a décroché : sans activité depuis une semaine,
// l'absence de signal vient du silence, pas de la forme.
const estRAS = (r) => r.signaux.length === 0 && !!r.acwr.zone && !r.blessures_en_cours && !estInactif(r)

// Source unique des tuiles du bandeau, de leur définition (aide affichée sous
// le libellé + modale) et du filtre appliqué au clic.
const INDICATEURS = {
  tous: {
    label: 'Athlètes suivis', ton: 'neutre', aide: 'tout le cercle',
    definition: 'tous les athlètes de votre cercle.',
    test: () => true
  },
  ras: {
    label: 'RAS', ton: 'optimale', aide: 'rien à signaler',
    definition: `aucun signal actif, ACWR calculable et actif ces ${SEUIL_INACTIF_JOURS} derniers jours : l'athlète est dans la norme.`,
    test: estRAS
  },
  signaux: {
    label: 'Signaux actifs', ton: 'vigilance', aide: 'à regarder en priorité',
    definition: 'au moins une alerte automatique (ACWR en vigilance ou surcharge, wellness dégradé 3 jours de suite).',
    test: (r) => r.signaux.length > 0
  },
  blessures: {
    label: 'Blessés', ton: 'surcharge', aide: 'blessure en cours',
    definition: "ont déclaré une blessure qu'ils n'ont pas encore marquée guérie. Déclaratif : c'est l'athlète qui saisit, jamais un calcul.",
    test: (r) => r.blessures_en_cours > 0
  },
  inactifs: {
    label: 'Inactifs', ton: 'neutre', aide: `rien depuis ${SEUIL_INACTIF_JOURS} j`,
    definition: `aucune action dans l'app (séance, wellness, pesée, repas) depuis au moins ${SEUIL_INACTIF_JOURS} jours : à relancer.`,
    test: estInactif
  },
  optimale: {
    label: 'Zone optimale', ton: 'optimale', aide: 'ACWR 0,8 à 1,3',
    definition: 'charge des 7 derniers jours cohérente avec la moyenne des 28 derniers.',
    test: (r) => r.acwr.zone === 'optimale'
  },
  vigilance: {
    label: 'Vigilance', ton: 'vigilance', aide: 'ACWR 1,3 à 1,5',
    definition: 'montée de charge à surveiller sur la semaine.',
    test: (r) => r.acwr.zone === 'vigilance'
  },
  surcharge: {
    label: 'Surcharge', ton: 'surcharge', aide: 'ACWR > 1,5',
    definition: 'montée de charge trop rapide, risque de blessure accru.',
    test: (r) => r.acwr.zone === 'surcharge'
  },
  sous_charge: {
    label: 'Sous-charge', ton: 'neutre', aide: 'ACWR < 0,8',
    definition: "s'entraîne nettement moins que sur ses 4 dernières semaines.",
    test: (r) => r.acwr.zone === 'sous_charge'
  },
  wellness_jour: {
    label: 'Wellness du jour', ton: 'neutre', aide: "ont répondu aujourd'hui", surTotal: true,
    definition: "ont rempli le questionnaire wellness aujourd'hui.",
    test: (r) => r.wellness_repondu_aujourdhui
  },
  wellness_bon: {
    label: 'Wellness bon', ton: 'optimale', aide: 'Hooper ≤ 10 / 28',
    definition: `dernier relevé au vert (Hooper 10 ou moins) et datant de moins de ${FRAICHEUR_WELLNESS_JOURS} jours.`,
    test: (r) => r.wellness_zone === 'bon' && r.dernier_wellness && joursDepuis(r.dernier_wellness) <= FRAICHEUR_WELLNESS_JOURS
  },
  sommeil_insuffisant: {
    label: 'Sommeil insuffisant', ton: 'vigilance', aide: '< 7 h/nuit sur 7 jours',
    definition: "moyenne sous 7 h par nuit sur les 7 dernières, ou au moins 3 nuits courtes sur la période. C'est le déficit installé qui est associé au risque de blessure, pas la mauvaise nuit isolée.",
    test: (r) => estSommeilInsuffisant(r.sommeil)
  }
}

// Le premier groupe s'affiche en tuiles, les suivants en blocs compacts ; la
// charge ajoute une barre de répartition du cercle entre les zones d'ACWR.
const GROUPES_INDICATEURS = [
  { titre: "Vue d'ensemble", cles: ['tous', 'ras', 'signaux', 'blessures', 'inactifs'] },
  { titre: 'Charge — ACWR', cles: ['optimale', 'vigilance', 'surcharge', 'sous_charge'], repartition: true },
  { titre: 'Wellness', cles: ['wellness_jour', 'wellness_bon', 'sommeil_insuffisant'] }
]
const CLES_INDICATEURS = GROUPES_INDICATEURS.flatMap(g => g.cles)
const CLES_ZONES_ACWR = GROUPES_INDICATEURS[1].cles

export default {
  components: { FicheAthlete, GroupesManagerModal },
  emits: ['modifie', 'ouvrir-programme'],
  props: {
    monCercle: { type: Array, default: () => [] },
    groupes: { type: Array, default: () => [] },
    programmes: { type: Array, default: () => [] },
    actif: { type: Boolean, default: false }
  },
  setup(props, { emit }) {
    const api = useApi()
    const authStore = useAuthStore()
    const estSuperPrepa = computed(() => authStore.role === 'super_prepa')

    const resumes = ref([])
    const loading = ref(false)
    const rechercheNom = ref('')
    const groupeFiltre = ref('tous')
    const organisationFiltre = ref('toutes')
    const indicateurFiltre = ref('tous')
    const aideOuverte = ref(false)
    const detailsOuverts = ref(false)

    const modalGroupes = ref(false)
    const athleteFocusGroupes = ref(null)
    const ouvrirGestionGroupes = (athlete = null) => {
      athleteFocusGroupes.value = athlete
      modalGroupes.value = true
    }

    const ajoutOuvert = ref(false)
    const searchEmail = ref('')
    const athleteTrouve = ref(null)
    const searchError = ref('')
    // Code coach du préparateur, rappelé dans le formulaire d'ajout : les
    // athlètes peuvent rejoindre son cercle eux-mêmes.
    const codeCoach = ref('')
    const basculerAjout = async () => {
      ajoutOuvert.value = !ajoutOuvert.value
      searchEmail.value = ''
      athleteTrouve.value = null
      searchError.value = ''
      if (ajoutOuvert.value && !codeCoach.value) {
        try {
          codeCoach.value = (await api.get('/users/me/profil')).code_coach || ''
        } catch {
          // sans code affiché, l'ajout par email reste possible
        }
      }
    }

    const groupesDe = (athleteId) => props.groupes.filter(g => g.athletes.find(a => a.id === athleteId))

    const organisationsCercle = computed(() => {
      const map = {}
      props.monCercle.forEach(a => { if (a.organisation) map[a.organisation.id] = a.organisation })
      return Object.values(map).sort((a, b) => a.nom.localeCompare(b.nom))
    })

    // Fusionne l'identité du cercle (nom, email, organisation) avec les
    // résumés monitoring (charge, ACWR, wellness, signaux, activité) : les
    // deux listes couvrent toujours le même ensemble d'athlètes côté API.
    const athletesEnrichis = computed(() =>
      props.monCercle.map(a => ({ ...a, resume: resumes.value.find(r => r.athlete_id === a.id) || null }))
    )

    // On ne garde que l'id sélectionné : l'objet athlète est relu depuis la
    // liste enrichie à chaque rendu, donc toujours à jour après un
    // fetchMonCercle déclenché par onModifie (cf. DashboardPrepa.vue). Enrichi
    // et pas brut, pour que la fiche dispose aussi du résumé monitoring.
    const athleteSelectionneId = ref(null)
    const athleteSelectionne = computed(() => athletesEnrichis.value.find(a => a.id === athleteSelectionneId.value) || null)

    // Toujours classée par activité, quel que soit le filtre : les athlètes
    // qui utilisent l'app en haut, ceux qui ne s'y connectent presque jamais en bas.
    const athletesFiltres = computed(() => {
      const indicateur = INDICATEURS[indicateurFiltre.value]
      return athletesEnrichis.value.filter(a => {
        if (rechercheNom.value && !a.nom.toLowerCase().includes(rechercheNom.value.toLowerCase())) return false
        if (groupeFiltre.value !== 'tous' && !groupesDe(a.id).find(g => g.id === groupeFiltre.value)) return false
        if (organisationFiltre.value === 'independant' && a.organisation_id) return false
        if (organisationFiltre.value !== 'toutes' && organisationFiltre.value !== 'independant' && a.organisation_id !== organisationFiltre.value) return false
        if (indicateurFiltre.value !== 'tous' && !(a.resume && indicateur.test(a.resume))) return false
        return true
      }).sort(comparerActivite)
    })

    // Vue d'ensemble du cercle entier (indépendante des filtres de la liste,
    // pour garder un instantané stable de tout le groupe).
    const compteurs = computed(() =>
      Object.fromEntries(CLES_INDICATEURS.map(cle => [cle, resumes.value.filter(r => INDICATEURS[cle].test(r)).length]))
    )
    // Reste de la barre de répartition : athlètes sans zone d'ACWR (moins de
    // 28 jours de données), pour que la barre représente bien tout le cercle.
    const sansZoneAcwr = computed(() =>
      compteurs.value.tous - CLES_ZONES_ACWR.reduce((total, cle) => total + compteurs.value[cle], 0)
    )

    // Une tuile à 0 est désactivée côté template : filtrer dessus n'aurait
    // aucun sens. Recliquer la tuile active revient à tout afficher.
    const filtrerPar = (cle) => { indicateurFiltre.value = indicateurFiltre.value === cle ? 'tous' : cle }

    const fetchResumes = async () => {
      loading.value = true
      resumes.value = await api.get('/monitoring/cercle')
      loading.value = false
    }

    const ouvrirFiche = (athlete) => { athleteSelectionneId.value = athlete.id }

    // Point d'entrée unique pour toute mutation (cercle, groupes,
    // assignation programme) : remonte au parent (monCercle/groupes/
    // programmes) et rafraîchit les résumés monitoring possédés ici.
    const onModifie = async () => {
      emit('modifie')
      await fetchResumes()
    }

    const rechercherAthlète = async () => {
      searchError.value = ''
      athleteTrouve.value = null
      try {
        const found = await api.get(`/users/recherche?email=${encodeURIComponent(searchEmail.value.trim())}`)
        if (found.detail) { searchError.value = found.detail; return }
        if (props.monCercle.find(a => a.id === found.id)) { searchError.value = 'Déjà dans votre cercle'; return }
        athleteTrouve.value = found
      } catch (e) { searchError.value = e.message || 'Athlète introuvable' }
    }

    const ajouterAuCercle = async () => {
      searchError.value = ''
      try {
        await api.post(`/users/mes-athletes/${athleteTrouve.value.id}`)
      } catch (e) {
        searchError.value = e.message || "Impossible d'ajouter cet athlète"
        return
      }
      basculerAjout()
      await onModifie()
    }

    const iconeTendance = (t) => ({ hausse: 'ti-trending-up', baisse: 'ti-trending-down', stable: 'ti-minus' }[t] || 'ti-minus')
    const initiales = (nom) => nom.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

    watch(() => props.actif, (actif) => { if (actif && resumes.value.length === 0 && !loading.value) fetchResumes() })
    onMounted(() => { if (props.actif) fetchResumes() })

    return {
      urlApi, codeCoach,
      INDICATEURS, GROUPES_INDICATEURS, CLES_INDICATEURS, compteurs, sansZoneAcwr, indicateurFiltre, filtrerPar, estRAS, detailsOuverts,
      FENETRE_ACTIVITE, SEUIL_REGULIER, SEUIL_INACTIF_JOURS, LABELS_NIVEAU_ACTIVITE,
      niveauActivite, libelleActivite, formatJourRelatif,
      resumes, loading, rechercheNom, groupeFiltre, organisationFiltre, organisationsCercle, athletesFiltres,
      estSuperPrepa, athleteSelectionneId, athleteSelectionne, ouvrirFiche, aideOuverte,
      modalGroupes, athleteFocusGroupes, ouvrirGestionGroupes, groupesDe,
      ajoutOuvert, basculerAjout, searchEmail, athleteTrouve, searchError, rechercherAthlète, ajouterAuCercle,
      onModifie, iconeTendance, initiales, formatHeures
    }
  }
}
</script>

<style scoped>
/* Colonne centrée sur grand écran, sans déplacer la barre de défilement. */
.athletes-panel {
  display: flex; flex-direction: column; gap: var(--spacing-lg);
  padding: var(--spacing-xl) max(var(--spacing-2xl), calc((100% - 1080px) / 2));
  overflow-y: auto; flex: 1; min-height: 0;
}
/* La fiche gère elle-même son défilement et ses marges. */
.athletes-panel.avec-fiche { padding: 0; overflow: hidden; }

/* --- En-tête --- */
.panel-header { display: flex; align-items: flex-end; justify-content: space-between; gap: var(--spacing-md); flex-wrap: wrap; }
.panel-titre { margin: 0; font-size: var(--font-size-xl); font-weight: 700; letter-spacing: -0.3px; }
.panel-sous-titre { margin: 2px 0 0; font-size: var(--font-size-sm); color: var(--color-text-secondary); }
.header-actions { display: flex; align-items: center; gap: var(--spacing-sm); flex-wrap: wrap; }

/* --- Ajout d'un athlète --- */
.ajout-athlete {
  display: flex; flex-direction: column; gap: var(--spacing-md);
  padding: var(--spacing-lg);
  background: var(--color-bg); border: 1px solid var(--color-border); border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
}
.ajout-athlete-titre { font-size: var(--font-size-sm); font-weight: 600; }
.ajout-athlete-ligne { display: flex; gap: var(--spacing-sm); flex-wrap: wrap; }
.ajout-athlete-ligne input {
  flex: 1; min-width: 200px; min-height: var(--tap-min);
  padding: 0 var(--spacing-md); border: 1px solid var(--color-border);
  border-radius: var(--radius-md); font-size: var(--font-size-base); background: var(--color-bg);
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
}
.ajout-athlete-ligne input:focus { outline: none; border-color: var(--color-primary); box-shadow: var(--shadow-focus); }
.athlete-trouve {
  display: flex; align-items: center; gap: var(--spacing-md);
  padding: var(--spacing-md); border-radius: var(--radius-md);
  background: var(--color-primary-light);
}
.athlete-trouve-info { flex: 1; min-width: 0; }
.athlete-trouve-nom { font-size: var(--font-size-sm); font-weight: 600; }
.athlete-trouve-email { font-size: var(--font-size-xs); color: var(--color-text-secondary); overflow-wrap: anywhere; }

.deplier-enter-active, .deplier-leave-active { transition: opacity var(--transition-base), transform var(--transition-base); }
.deplier-enter-from, .deplier-leave-to { opacity: 0; transform: translateY(-6px); }

/* --- Indicateurs --- */
.indicateurs { display: flex; flex-direction: column; gap: var(--spacing-sm); }
.indicateurs-entete { display: flex; align-items: center; justify-content: space-between; gap: var(--spacing-sm); flex-wrap: wrap; }
.lien-aide {
  display: inline-flex; align-items: center; gap: 4px;
  min-height: 32px; padding: 0; border: none; background: none;
  font-family: inherit; font-size: var(--font-size-sm); font-weight: 500;
  color: var(--color-primary-dark); cursor: pointer;
}
.lien-aide:hover { text-decoration: underline; }

.ton-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; background: var(--color-text-muted); }
.ton-optimale .ton-dot { background: var(--color-valid-text); }
.ton-vigilance .ton-dot { background: var(--color-warning-icon); }
.ton-surcharge .ton-dot { background: var(--color-danger-text); }

.kpi-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: var(--spacing-sm); }
.kpi {
  display: flex; flex-direction: column; align-items: flex-start; gap: 2px;
  padding: var(--spacing-md) var(--spacing-lg);
  background: var(--color-bg); border: 1px solid var(--color-border); border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
  font-family: inherit; color: inherit; text-align: left; cursor: pointer;
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast), transform var(--transition-fast);
}
.kpi:hover:not(:disabled) { border-color: var(--color-primary); box-shadow: var(--shadow-card-hover); }
.kpi:active:not(:disabled) { transform: scale(0.98); }
.kpi.active { border-color: var(--color-primary); box-shadow: 0 0 0 2px var(--color-primary); }
.kpi:disabled { cursor: default; box-shadow: none; background: var(--color-bg-secondary); }
.kpi-label { display: inline-flex; align-items: center; gap: 6px; font-size: var(--font-size-xs); font-weight: 600; color: var(--color-text-secondary); }
.kpi-valeur { font-size: var(--font-size-2xl); font-weight: 700; line-height: 1.15; letter-spacing: -0.5px; font-variant-numeric: tabular-nums; }
.kpi-aide { font-size: var(--font-size-xs); color: var(--color-text-muted); }
.kpi.vide .kpi-valeur { color: var(--color-text-muted); }
.kpi.ton-optimale:not(.vide) .kpi-valeur { color: var(--color-valid-text-strong); }
.kpi.ton-vigilance:not(.vide) .kpi-valeur { color: var(--color-warning-text-strong); }
.kpi.ton-surcharge:not(.vide) .kpi-valeur { color: var(--color-danger-text); }

.indicateurs-details { display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-sm); }
.details-toggle {
  display: none; align-items: center; gap: var(--spacing-sm);
  width: 100%; min-height: var(--tap-min); padding: 0 var(--spacing-md);
  border: 1px solid var(--color-border); border-radius: var(--radius-lg); background: var(--color-bg);
  font-family: inherit; font-size: var(--font-size-sm); font-weight: 600; color: var(--color-text-body);
  cursor: pointer;
}
.details-toggle span { flex: 1; text-align: left; }
.details-toggle .ti { font-size: var(--font-size-base); color: var(--color-text-secondary); }
.detail-bloc {
  display: flex; flex-direction: column; gap: var(--spacing-sm);
  padding: var(--spacing-md) var(--spacing-lg);
  background: var(--color-bg); border: 1px solid var(--color-border); border-radius: var(--radius-lg);
}
.detail-bloc-titre { font-size: var(--font-size-xs); font-weight: 700; text-transform: uppercase; letter-spacing: 0.4px; color: var(--color-text-muted); }
.repartition { display: flex; gap: 2px; height: 8px; border-radius: var(--radius-full); overflow: hidden; background: var(--color-bg-tertiary); }
.repartition-seg { min-width: 6px; background: var(--color-bg-tertiary); }
.repartition-seg.ton-optimale { background: var(--color-valid-text); }
.repartition-seg.ton-vigilance { background: var(--color-warning-icon); }
.repartition-seg.ton-surcharge { background: var(--color-danger-text); }
.repartition-seg.ton-neutre { background: var(--color-text-muted); }
.detail-items { display: flex; flex-direction: column; margin: 0 calc(-1 * var(--spacing-sm)); }
.detail-item {
  display: flex; align-items: center; gap: var(--spacing-sm);
  min-height: var(--tap-min); padding: 0 var(--spacing-sm);
  border: none; border-radius: var(--radius-md); background: transparent;
  font-family: inherit; color: inherit; text-align: left; cursor: pointer;
  transition: background var(--transition-fast);
}
.detail-item:hover:not(:disabled) { background: var(--color-bg-secondary); }
.detail-item.active { background: var(--color-primary-light); }
.detail-item:disabled { cursor: default; opacity: 0.55; }
.detail-item-label { flex: 1; min-width: 0; font-size: var(--font-size-sm); font-weight: 500; }
.detail-item-label small { font-size: var(--font-size-xs); font-weight: 400; color: var(--color-text-muted); }
.detail-item-valeur { font-size: var(--font-size-base); font-weight: 700; font-variant-numeric: tabular-nums; }
.detail-item-valeur small { font-size: var(--font-size-xs); font-weight: 600; color: var(--color-text-muted); }
.detail-note { margin: 0; font-size: var(--font-size-xs); color: var(--color-text-muted); }

.filtre-actif {
  display: flex; align-items: center; gap: var(--spacing-sm); flex-wrap: wrap;
  padding: var(--spacing-sm) var(--spacing-md);
  border: 1px solid var(--color-primary); border-radius: var(--radius-md);
  background: var(--color-primary-light); color: var(--color-primary-text);
  font-size: var(--font-size-sm); font-weight: 600;
}
.filtre-actif span { flex: 1; min-width: 0; }
.btn-effacer-filtre {
  display: inline-flex; align-items: center; gap: 4px;
  min-height: 32px; padding: 0 var(--spacing-md);
  border: 1px solid var(--color-primary); border-radius: var(--radius-full);
  background: var(--color-bg); color: var(--color-primary-text);
  font-size: var(--font-size-xs); font-weight: 600; cursor: pointer;
}

/* --- Filtres --- */
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
.select-org-filtre {
  min-height: 36px; padding: 0 var(--spacing-md);
  border: 1px solid var(--color-border); border-radius: var(--radius-md);
  font-size: var(--font-size-sm); background: var(--color-bg);
}

/* --- Liste --- */
.liste-entete { display: flex; align-items: center; justify-content: space-between; gap: var(--spacing-sm); flex-wrap: wrap; margin-bottom: calc(-1 * var(--spacing-sm)); }
.tri-info { display: inline-flex; align-items: center; gap: 4px; font-size: var(--font-size-xs); color: var(--color-text-muted); }
.athlete-liste { display: flex; flex-direction: column; gap: var(--spacing-sm); }

.athlete-carte {
  display: flex; flex-direction: column; gap: var(--spacing-md);
  width: 100%; padding: var(--spacing-lg);
  background: var(--color-bg); border: 1px solid var(--color-border); border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
  font-family: inherit; font-size: var(--font-size-sm); color: inherit; text-align: left; cursor: pointer;
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast), transform var(--transition-fast);
}
.athlete-carte:hover { border-color: var(--color-primary); box-shadow: var(--shadow-card-hover); }
.athlete-carte:active { transform: scale(0.995); }
.athlete-carte:focus-visible { outline: none; border-color: var(--color-primary); box-shadow: var(--shadow-focus); }
/* Inactif : la carte recule visuellement, sans baisser le contraste du texte. */
.athlete-carte.activite-inactif { background: var(--color-bg-secondary); box-shadow: none; }
.athlete-carte.activite-inactif:hover { box-shadow: var(--shadow-card); }

.carte-haut { display: flex; align-items: center; gap: var(--spacing-md); }
.code-coach-aide { margin: 0; font-size: var(--font-size-xs); color: var(--color-text-secondary); display: flex; gap: 6px; align-items: baseline; flex-wrap: wrap; }
.code-coach-aide b { color: var(--color-primary-text); letter-spacing: 1px; }
.avatar-athlete {
  position: relative; flex-shrink: 0;
  width: 44px; height: 44px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  background: var(--color-avatar-athlete-bg); color: var(--color-avatar-athlete-text);
  font-size: var(--font-size-sm); font-weight: 700;
}
.activite-inactif .avatar-athlete { background: var(--color-bg-tertiary); color: var(--color-text-muted); }
.avatar-pastille {
  position: absolute; right: -1px; bottom: -1px;
  width: 14px; height: 14px; border-radius: 50%;
  border: 2px solid var(--color-bg); background: var(--color-border-strong);
}
.activite-inactif .avatar-pastille { border-color: var(--color-bg-secondary); }
.activite-regulier .avatar-pastille, .activite-actif .avatar-pastille { background: var(--color-valid-text); }
.activite-irregulier .avatar-pastille { background: var(--color-warning-icon); }

.carte-identite { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.carte-nom { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; font-size: var(--font-size-base); font-weight: 600; color: var(--color-text); }
/* Les deux morceaux passent à la ligne en bloc, jamais au milieu. */
.carte-activite { display: flex; flex-wrap: wrap; column-gap: 4px; font-size: var(--font-size-xs); color: var(--color-text-secondary); }
.activite-libelle, .activite-jours { white-space: nowrap; }
.activite-regulier .activite-libelle { color: var(--color-valid-text-strong); font-weight: 600; }
.activite-irregulier .activite-libelle { color: var(--color-warning-text-strong); font-weight: 600; }
.activite-inactif .activite-libelle { color: var(--color-text-muted); font-weight: 600; }
.carte-chevron { flex-shrink: 0; font-size: var(--font-size-lg); color: var(--color-text-muted); transition: transform var(--transition-fast); }
.athlete-carte:hover .carte-chevron { transform: translateX(2px); color: var(--color-primary); }

.acwr-badge {
  display: inline-flex; align-items: baseline; gap: 4px; flex-shrink: 0;
  padding: 4px 10px; border-radius: var(--radius-full);
  font-size: var(--font-size-sm); font-weight: 700; font-variant-numeric: tabular-nums;
}
.acwr-badge small { font-size: 10px; font-weight: 600; letter-spacing: 0.3px; opacity: 0.75; }
.acwr-badge.zone-optimale { background: var(--color-valid-bg); color: var(--color-valid-text-strong); }
.acwr-badge.zone-vigilance { background: var(--color-warning-bg); color: var(--color-warning-text-strong); }
.acwr-badge.zone-surcharge { background: var(--color-danger-bg); color: var(--color-danger-text); }
.acwr-badge.zone-sous_charge { background: var(--color-bg-tertiary); color: var(--color-text-secondary); }
.acwr-badge.zone-insuffisant { background: var(--color-bg-tertiary); color: var(--color-text-muted); }

.carte-stats {
  display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: var(--spacing-sm);
  padding-top: var(--spacing-md); border-top: 1px solid var(--color-border);
}
.stat { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.stat-label { display: inline-flex; align-items: center; gap: 4px; font-size: var(--font-size-xs); color: var(--color-text-muted); white-space: nowrap; }
.stat-valeur { display: flex; align-items: center; flex-wrap: wrap; gap: 4px; font-size: var(--font-size-sm); font-weight: 600; color: var(--color-text); }
.tendance { font-size: var(--font-size-base); color: var(--color-text-secondary); }
.mini-badge {
  padding: 1px 6px; border-radius: var(--radius-full);
  font-size: 10px; font-weight: 700; white-space: nowrap;
  background: var(--color-bg-tertiary); color: var(--color-text-secondary);
}
.mini-badge.wellness-bon { background: var(--color-valid-bg); color: var(--color-valid-text-strong); }
.mini-badge.wellness-degrade { background: var(--color-danger-bg); color: var(--color-danger-text); }
.mini-badge.sommeil-modere { background: var(--color-warning-bg); color: var(--color-warning-text); }
.mini-badge.sommeil-eleve { background: var(--color-danger-bg); color: var(--color-danger-text); }

.carte-bas { display: flex; align-items: center; justify-content: space-between; gap: var(--spacing-sm); flex-wrap: wrap; }
.signaux { display: flex; gap: 6px; flex-wrap: wrap; }
.signal {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 3px 9px; border-radius: var(--radius-full);
  font-size: var(--font-size-xs); font-weight: 600;
  background: var(--color-warning-bg); color: var(--color-warning-text-strong);
}
.signal.signal-ras { background: var(--color-valid-bg); color: var(--color-valid-text-strong); }
.signal.signal-attente { background: var(--color-bg-tertiary); color: var(--color-text-muted); }
.signal.signal-blessure { background: var(--color-danger-bg); color: var(--color-danger-text); }
.groupes-badges { display: flex; gap: 4px; flex-wrap: wrap; }
.groupe-badge { font-size: var(--font-size-xs); font-weight: 600; padding: 2px 8px; border-radius: var(--radius-full); }

/* --- Aide --- */
.modal-large { max-width: 640px; }
.aide-indicateurs { list-style: none; margin: var(--spacing-sm) 0 0; padding: 0; display: flex; flex-direction: column; gap: var(--spacing-sm); }
.aide-indicateurs li { display: flex; align-items: center; gap: var(--spacing-sm); font-size: var(--font-size-sm); color: var(--color-text-secondary); }
.aide-indicateurs strong { color: var(--color-text); }
.aide-pastille {
  flex-shrink: 0; min-width: 30px; padding: 2px 6px;
  border: 1px solid var(--color-border); border-radius: var(--radius-md);
  background: var(--color-bg); text-align: center;
  font-size: var(--font-size-xs); font-weight: 700;
}
.aide-pastille.ton-optimale { color: var(--color-valid-text-strong); }
.aide-pastille.ton-vigilance { color: var(--color-warning-text-strong); }
.aide-pastille.ton-surcharge { color: var(--color-danger-text); }
.aide-section h4 { margin: 0 0 4px; font-size: var(--font-size-sm); font-weight: 700; }
.aide-section p { margin: 0 0 var(--spacing-xs); font-size: var(--font-size-sm); color: var(--color-text-secondary); line-height: 1.5; }
.aide-section + .aide-section { margin-top: var(--spacing-md); padding-top: var(--spacing-md); border-top: 1px solid var(--color-border); }
.aide-zones { list-style: none; margin: var(--spacing-xs) 0 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
.aide-zones li { font-size: var(--font-size-sm); color: var(--color-text-secondary); display: flex; align-items: baseline; gap: 8px; }
.aide-dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; align-self: center; }
.aide-dot-optimale { background: var(--color-valid-text-strong); }
.aide-dot-vigilance { background: var(--color-warning-text-strong); }
.aide-dot-surcharge { background: var(--color-danger-text); }
.aide-dot-sous_charge { background: var(--color-text-muted); }

@media (max-width: 768px) {
  .athletes-panel { padding: var(--spacing-md) var(--spacing-lg); }
  .athletes-panel.avec-fiche { padding: 0; }
  .kpi-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .kpi { padding: var(--spacing-sm) var(--spacing-md); }
  .kpi-valeur { font-size: var(--font-size-xl); }
  .kpi-aide { display: none; }
  .indicateurs-details { grid-template-columns: 1fr; }
  .details-toggle { display: flex; }
  .indicateurs-details:not(.ouvert) { display: none; }
  .athlete-carte { padding: var(--spacing-md); }
  .carte-stats { grid-template-columns: repeat(3, minmax(0, 1fr)); row-gap: var(--spacing-md); }
}
</style>
