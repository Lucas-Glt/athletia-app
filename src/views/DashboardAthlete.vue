<template>
  <AppLayout title="Mon programme">
    <template #nav>
      <div class="nav-item" :class="{ active: onglet === 'mes-stats' }" @click="onglet = 'mes-stats'">
        <i class="ti ti-home-2"></i> Accueil
      </div>
      <div class="nav-item" :class="{ active: onglet === 'programme' }" @click="onglet = 'programme'">
        <i class="ti ti-barbell"></i> Séances
      </div>
      <div class="nav-item" :class="{ active: onglet === 'performances' }" @click="onglet = 'performances'">
        <i class="ti ti-trophy"></i> Perfs
      </div>
      <div class="nav-item nav-mobile" :class="{ active: ongletsSuivi.includes(onglet) }" @click="menuSuiviOuvert = true">
        <i class="ti ti-activity"></i> Suivi
      </div>
      <!-- Sur ordinateur, la barre du haut a la place : Poids, Diète et
           Blessures y sont directement, sans passer par le menu Suivi. -->
      <div
        v-for="item in ITEMS_SUIVI"
        :key="item.cle"
        class="nav-item nav-ordi"
        :class="{ active: onglet === item.cle }"
        @click="choisirSuivi(item.cle)"
      >
        <i class="ti" :class="item.icone"></i> {{ item.label }}
      </div>
    </template>

    <!-- Une seule bannière à la fois : elles sont toutes fixées en bas
         d'écran et se superposeraient.
         La reprise, elle, est bloquante : tant qu'on n'a pas tranché, la
         saisie en attente et celle qu'on démarrerait s'écraseraient l'une
         l'autre — il faut donc répondre avant de toucher à l'app. -->
    <!-- Rien ne s'ouvre sous le voile « code de votre préparateur » :
         les propositions arrivent une fois l'appli débloquée. -->
    <template v-if="!authStore.sansPrepa">
      <PopupBanniere
        v-if="brouillonPropose"
        bloquant
        icone="ti-player-play"
        titre="Reprendre la séance là où vous l'avez quittée ?"
        :sous-titre="sousTitreBrouillon"
        texte-oui="Reprendre"
        texte-non="Abandonner"
        @oui="reprendreBrouillon"
        @non="abandonnerBrouillon"
      />
      <PopupBanniere
        v-else-if="popupRessenti"
        icone="ti-mood-smile"
        titre="Noter son ressenti de séance ?"
        texte-oui="Oui"
        texte-non="Non merci"
        @oui="repondreRessenti"
        @non="popupRessenti = null"
      />
      <PopupBanniere
        v-else-if="banniereReaction"
        icone="ti-message-heart"
        :emoji="banniereReaction.emoji"
        :titre="banniereReaction.titre"
        :sous-titre="banniereReaction.sousTitre"
        texte-oui="Voir"
        texte-non="OK"
        @oui="voirReaction"
        @non="marquerReactionsVues"
      />
      <PopupBanniere
        v-else-if="banniereMot"
        icone="ti-message-2"
        :titre="banniereMot.titre"
        :sous-titre="banniereMot.sousTitre"
        :texte-oui="banniereMot.peutOuvrir ? 'Voir la séance' : 'OK'"
        :texte-non="banniereMot.peutOuvrir ? 'OK' : 'Plus tard'"
        @oui="banniereMot.peutOuvrir ? voirMot() : marquerMotsVus()"
        @non="banniereMot.peutOuvrir ? marquerMotsVus() : (motsNouveaux = [])"
      />
      <PopupBanniere
        v-else-if="popupWellness"
        icone="ti-heart-rate-monitor"
        titre="Remplir mon wellness du jour ?"
        sous-titre="5 questions, moins de 30 secondes"
        texte-oui="Oui"
        texte-non="Non merci"
        @oui="repondreWellness"
        @non="popupWellness = false"
      />
      <PopupBanniere
        v-else-if="recapPropose"
        icone="ti-confetti"
        titre="Ton récap de la semaine est prêt"
        sous-titre="Séances, XP, régularité : ta semaine en un coup d'œil"
        texte-oui="Voir"
        texte-non="Plus tard"
        @oui="ouvrirRecap"
        @non="marquerRecapVu"
      />
    </template>

    <!-- XP gagnée, confettis, passage de niveau -->
    <CelebrationXp />
    <!-- Réaction du prépa qui arrive : l'emoji surgit puis se pose dans la bannière -->
    <ReactionArrivee
      v-if="arriveeReaction"
      :key="arriveeReaction.id"
      :emojis="arriveeReaction.emojis"
      @fini="arriveeReaction = null"
    />
    <RecapSemaineModal v-if="recapOuvert" @fermer="recapOuvert = false" />

    <!-- Feuille "Suivi" : regroupe Poids / Diète / Blessures, trois usages
         occasionnels qui ne méritent pas chacun leur propre onglet à l'égal
         de Séances. Même habillage que le panneau de saisie de séance —
         l'athlète a déjà appris ce geste-là. -->
    <Transition name="sheet">
      <div class="suivi-overlay" v-if="menuSuiviOuvert" @click.self="menuSuiviOuvert = false">
        <div class="suivi-sheet">
          <div class="suivi-head">
            <span>Suivi</span>
            <button class="btn btn-icon" @click="menuSuiviOuvert = false" aria-label="Fermer">
              <i class="ti ti-x"></i>
            </button>
          </div>
          <button
            v-for="item in ITEMS_SUIVI"
            :key="item.cle"
            class="suivi-item"
            :class="{ active: onglet === item.cle }"
            @click="choisirSuivi(item.cle)"
          >
            <span class="suivi-item-icone" :style="{ background: item.bg, color: item.couleur }">
              <i class="ti" :class="item.icone"></i>
            </span>
            <span class="suivi-item-texte">
              <span class="suivi-item-label">{{ item.label }}</span>
              <span class="suivi-item-desc">{{ item.desc }}</span>
            </span>
            <i class="ti ti-chevron-right suivi-item-chevron"></i>
          </button>
        </div>
      </div>
    </Transition>

    <div
      class="dashboard-root"
      @click.capture="swipeOnglets.filtrerClic"
      @pointerdown="swipeOnglets.start"
      @pointermove="swipeOnglets.move"
      @pointerup="swipeOnglets.end"
      @pointercancel="swipeOnglets.cancel"
    >
      <!-- Réservé à l'onglet Séances : les autres (Accueil, Poids) restent
           utilisables sans programme assigné -->
      <div class="empty-state" v-if="programmes.length === 0 && onglet === 'programme'" v-entree-onglet="sensOnglet">
        <i class="ti ti-calendar-off empty-icon"></i>
        <p>Aucun programme assigné pour le moment.</p>
        <span>Contactez votre préparateur physique.</span>
        <!-- Sans programme, un match ou un footing compte quand même dans la charge -->
        <div class="ajout-libre-sans-programme"><AjoutSeanceLibre /></div>
        <div class="saison-sans-programme" v-if="Object.keys(planificationSaison).length"><PlanificationSaison :semaines="planificationSaison" /></div>
      </div>

      <!-- ONGLET PROGRAMME -->
      <div
        v-if="onglet === 'programme' && programmes.length > 0"
        v-entree-onglet="sensOnglet"
        class="content-body"
        :class="{ 'avec-barre-valider': seanceActive && vueSeance === 'seance' }"
        @click.capture="swipeVueSeance.filtrerClic"
        @pointerdown="swipeVueSeance.start"
        @pointermove="swipeVueSeance.move"
        @pointerup="swipeVueSeance.end"
        @pointercancel="swipeVueSeance.cancel"
      >
        <!-- ÉCRAN 1 : liste des séances (une par créneau, semaine courante) -->
        <template v-if="!seanceActive">
          <div class="screen" v-cascade="programmeActif?.id">
            <!-- Sélecteur de programme, seulement s'il y a un choix à faire :
                 tous les programmes visibles d'un coup, en colonnes de même
                 largeur (les noms sont longs et débordaient d'une seule ligne),
                 plus l'épingle qui décide lequel s'ouvre au lancement. -->
            <div class="prog-bar" v-if="programmes.length > 1" @pointerdown.stop>
              <div class="prog-switcher">
                <button
                  v-for="p in programmesAffiches"
                  :key="p.id"
                  class="prog-chip"
                  :class="{ active: programmeActif?.id === p.id }"
                  @click="selectProgramme(p)"
                >
                  <i class="ti ti-pinned prog-chip-pin" v-if="programmeEpingleId === p.id"></i>
                  {{ p.nom }}
                </button>
              </div>
              <button
                class="btn-epingle-prog"
                :class="{ active: estEpingle }"
                :title="estEpingle ? 'Ne plus ouvrir ce programme en premier' : 'Ouvrir ce programme en premier'"
                :aria-label="estEpingle ? 'Ne plus ouvrir ce programme en premier' : 'Ouvrir ce programme en premier'"
                @click="basculerEpingleProgramme"
              >
                <i class="ti" :class="estEpingle ? 'ti-pinned' : 'ti-pin'"></i>
              </button>
            </div>

            <PlanificationSaison :semaines="planificationSaison" />

            <div class="screen-header" v-if="programmeActif">
              <h2>{{ programmeActif.nom }}</h2>
              <p v-if="programmeActif.description">{{ programmeActif.description }}</p>
            </div>

            <!-- Programme de l'Atelier : la semaine en cours, ses tests -->
            <SemaineProgramme
              v-if="semainesProgramme && !loadingSeances"
              :semaines="semainesProgramme"
              :courante="semaineCourante"
              :tests="testsSemaine"
              :envoi="envoiSuivi"
              @passer="passerSemaine"
              @noter="noterTest"
            />

            <div v-if="loadingSeances" class="empty">Chargement...</div>

            <!-- Semaine type créée : le calendrier du mois remplace la liste.
                 Sans semaine type, l'écran ne change pas — la liste reste la
                 vue par défaut, avec la proposition d'en créer une. -->
            <PlanningCalendrier
              v-else-if="planningActif"
              :creneaux="creneaux"
              :planning="planning"
              :faites="seancesFaites"
              @ouvrir="ouvrirDepuisPlanning"
              @modifier="modalPlanning = true"
            />

            <template v-else>
              <button
                v-for="seance in seancesAffichees"
                :key="seance.id"
                class="seance-card"
                :class="[`seance-card-${seance.type_seance || 'musculation'}`, { 'est-aujourdhui': estAujourdhuiSeance(seance) }]"
                @click="demarrerSeance(seance)"
              >
                <span class="seance-card-icone">
                  <i class="ti" :class="iconeType(seance.type_seance)"></i>
                </span>
                <div class="seance-card-main">
                  <div class="seance-card-titre-ligne">
                    <span class="seance-card-titre">{{ seance.nom }}</span>
                    <span class="badge badge-today" v-if="estAujourdhuiSeance(seance)">Aujourd'hui</span>
                  </div>
                  <div class="seance-card-meta">
                    <span class="type-badge" :class="`type-badge-${seance.type_seance || 'musculation'}`">
                      {{ labelType(seance.type_seance) }}
                    </span>
                    <span class="badge badge-purple" v-if="seance.jour">{{ seance.jour }}</span>
                    <span class="seance-card-count">{{ seance.exercices?.length || 0 }} exercice{{ seance.exercices?.length > 1 ? 's' : '' }}</span>
                  </div>
                </div>
                <i class="ti ti-chevron-right seance-card-chevron"></i>
              </button>

              <button
                v-if="creneaux.length"
                class="btn btn-dashed btn-creer-semaine"
                @click="modalPlanning = true"
              >
                <i class="ti ti-calendar-plus"></i> Créer ma semaine d'entraînement
              </button>
            </template>

            <!-- Une séance faite en plus du programme (match, footing…) -->
            <AjoutSeanceLibre v-if="!loadingSeances" />

            <PlanningHebdoModal
              v-if="modalPlanning"
              :creneaux="creneaux"
              :planning="planning"
              :erreur="erreurPlanning"
              @enregistrer="enregistrerPlanning"
              @supprimer="supprimerPlanning"
              @fermer="fermerModalPlanning"
              @pointerdown.stop
              @pointermove.stop
              @pointerup.stop
            />
          </div>
        </template>

        <!-- ÉCRAN 2 : la feuille de séance — tout est visible, zéro accordéon -->
        <template v-else>
          <div class="seance-topbar">
            <button class="btn btn-icon" @click="seanceActive = null" aria-label="Retour">
              <i class="ti ti-arrow-left"></i>
            </button>
            <div class="seance-topbar-info">
              <div class="seance-topbar-titre">{{ seanceActive.nom }}</div>
              <div class="seance-topbar-meta">
                <span class="type-badge" :class="`type-badge-${seanceActive.type_seance || 'musculation'}`">
                  {{ labelType(seanceActive.type_seance) }}
                </span>
                <span class="badge badge-purple" v-if="seanceActive.jour">{{ seanceActive.jour }}</span>
              </div>
            </div>
          </div>

          <!-- Onglets de la séance : la feuille de saisie, l'historique de ses
               tentatives passées, les courbes de ses exercices -->
          <div class="seance-onglets" @pointerdown.stop>
            <button
              v-for="v in VUES_SEANCE"
              :key="v.cle"
              class="prog-chip"
              :class="{ active: vueSeance === v.cle }"
              @click="ouvrirVueSeance(v.cle)"
            >
              <i class="ti" :class="v.icone"></i> {{ v.label }}
            </button>
          </div>

          <!-- --hauteur-barre-valider : place réservée sous le dernier
               exercice, que la barre de validation vient occuper en fin de
               défilement (cf. useBarreRangee) -->
          <div
            ref="feuilleSeance"
            class="screen feuille"
            :style="{ '--hauteur-barre-valider': barreValider.hauteur + 'px' }"
            v-if="vueSeance === 'seance'"
            v-cascade
          >
            <!-- Une seule vue : une case par exercice, cochée = fait aux
                 valeurs prévues par le prépa. Le crayon (ou le nom) ouvre le
                 panneau de saisie du groupe : photos, N-1, valeurs réelles
                 série par série. Case et panneau lisent et écrivent les mêmes
                 séries (cf. etatExo / basculerExo). -->
            <p class="seance-aide">
              <i class="ti ti-info-circle"></i>
              <span>Coche chaque exercice fait : les valeurs prévues sont enregistrées. Touche <i class="ti ti-pencil"></i> pour noter tes séries en détail.</span>
            </p>
            <div
              v-for="groupe in grouperExercices(seanceActive.exercices)"
              :key="groupe.key"
              class="exo-bloc"
              :class="{ 'is-superset': groupe.exercices.length > 1, 'is-complete': isGroupeComplete(groupe) }"
            >
              <div class="exo-bloc-exos">
                <span v-if="groupe.exercices.length > 1" class="type-groupe-badge">
                  <i class="ti ti-link"></i> {{ labelTypeGroupe(typeGroupe(groupe)) }}
                </span>
                <div v-for="(exo, eidx) in groupe.exercices" :key="exo.id" class="exo-ligne">
                  <!-- Alias de etatExo(exo). Clé stable (le nombre de séries) :
                       la case n'est pas recréée à chaque tap, le focus reste. -->
                  <template v-for="etat in [etatExo(exo)]" :key="etat.total">
                    <button
                      type="button"
                      class="exo-case"
                      :class="{ 'est-fait': etat.complet, 'est-partiel': !etat.complet && etat.faites > 0 }"
                      role="checkbox"
                      :aria-checked="etat.complet ? 'true' : etat.faites > 0 ? 'mixed' : 'false'"
                      :aria-label="`${exo.nom} fait`"
                      :disabled="etat.total === 0"
                      @click="basculerExo(exo, $event)"
                    >
                      <span class="exo-case-boite">
                        <!-- Coche dessinée (et non icône de police) : elle se
                             trace quand on vient de cocher (cf. feterSerie) -->
                        <svg v-if="etat.complet" class="coche" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
                        <template v-else-if="etat.faites > 0">{{ etat.faites }}/{{ etat.total }}</template>
                      </span>
                    </button>
                  </template>
                  <button type="button" class="exo-infos" @click="ouvrirSaisie(groupe)">
                    <span class="exo-ligne-nom">
                      <span class="exo-letter-mini" v-if="groupe.exercices.length > 1">{{ letterFor(eidx) }}</span>
                      {{ exo.nom }}
                      <span v-if="exo.optionnel" class="optionnel-badge">optionnelle</span>
                    </span>
                    <span v-if="exo.series.length === 0" class="exo-ligne-prescrit is-vide">Aucune série définie</span>
                    <span v-else-if="resumeExo(exo).uniforme" class="exo-ligne-prescrit">{{ resumeExo(exo).texte }}</span>
                    <span v-else class="exo-ligne-prescrit">
                      <span v-for="(s, i) in exo.series" :key="s.id">S{{ i + 1 }} {{ valeursSerie(exo, i) || '—' }}</span>
                    </span>
                    <!-- comment le faire : exercices de mobilité du catalogue seulement -->
                    <span v-if="exo.consigne" class="exo-ligne-consigne">{{ exo.consigne }}</span>
                    <template v-for="obj in [objectifExo(exo)]" :key="obj?.id ?? 'sans-objectif'">
                      <span v-if="obj" class="exo-ligne-objectif" :class="{ atteint: obj.atteint_le }">
                        <i class="ti" :class="obj.atteint_le ? 'ti-circle-check' : 'ti-target-arrow'"></i>
                        Objectif {{ texteObjectif(obj) }}{{ obj.atteint_le ? ' atteint' : '' }}
                      </span>
                    </template>
                  </button>
                </div>
                <span v-if="reposSerie(groupe, 0)" class="exo-bloc-repos">
                  <i class="ti ti-clock"></i> repos {{ reposSerie(groupe, 0) }}
                </span>
              </div>
              <button
                type="button"
                class="btn-detailler"
                :aria-label="`Saisir en détail : ${groupe.exercices.map(e => e.nom).join(', ')}`"
                @click="ouvrirSaisie(groupe)"
              >
                <i class="ti ti-pencil"></i>
              </button>
            </div>
          </div>

          <!-- ONGLET HISTORIQUE : une tentative passée de CETTE séance à la
               fois, choisie dans la roulette de dates, avec l'écart coloré de
               chaque série par rapport à la fois précédente. -->
          <div class="screen" v-else-if="vueSeance === 'historique'" v-cascade="tentativeAffichee?.cle">
            <div v-if="!tentativeAffichee" class="empty">
              Cette séance n'a pas encore été enregistrée.
            </div>
            <template v-else>
              <!-- Roulette des dates : la tentative consultée au centre, un
                   aperçu de la précédente et de la suivante de part et d'autre
                   (cliquables), petites flèches, et swipe horizontal. -->
              <div
                class="histo-roulette"
                role="group"
                aria-label="Dates enregistrées pour cette séance"
                @pointerdown="swipeRoulette.start"
                @pointermove="swipeRoulette.move"
                @pointerup="swipeRoulette.end"
                @pointercancel="swipeRoulette.cancel"
              >
                <button
                  class="histo-fleche"
                  :disabled="!tentativeAncienne"
                  @click="histoPlusAncienne"
                  aria-label="Date plus ancienne"
                >
                  <i class="ti ti-chevron-left"></i>
                </button>

                <button
                  v-if="tentativeAncienne"
                  class="histo-date-cote"
                  @click="histoPlusAncienne"
                  :aria-label="`Voir le ${formatDateLongue(tentativeAncienne.date)}`"
                >
                  {{ dateTentative(tentativeAncienne, true) }}
                </button>
                <span v-else class="histo-date-cote is-vide" aria-hidden="true"></span>

                <span class="histo-date-slot">
                  <Transition :name="`roulette-${sensHisto}`">
                    <span
                      class="histo-date-active"
                      :class="{ 'avec-heure': memeJourQuUneAutre(tentativeAffichee) }"
                      :key="tentativeAffichee.cle"
                      aria-current="date"
                    >
                      {{ dateCentrale(tentativeAffichee) }}
                    </span>
                  </Transition>
                </span>

                <button
                  v-if="tentativeRecente"
                  class="histo-date-cote"
                  @click="histoPlusRecente"
                  :aria-label="`Voir le ${formatDateLongue(tentativeRecente.date)}`"
                >
                  {{ dateTentative(tentativeRecente, true) }}
                </button>
                <span v-else class="histo-date-cote is-vide" aria-hidden="true"></span>

                <button
                  class="histo-fleche"
                  :disabled="!tentativeRecente"
                  @click="histoPlusRecente"
                  aria-label="Date plus récente"
                >
                  <i class="ti ti-chevron-right"></i>
                </button>
              </div>

              <div class="histo-ref">
                <span class="histo-pager">{{ histoIndex + 1 }}/{{ tentativesSeance.length }}</span>
                <template v-if="tentativeAncienne">
                  <i class="ti ti-git-compare"></i>
                  Comparé au {{ dateTentative(tentativeAncienne) }}
                </template>
                <template v-else>
                  <i class="ti ti-info-circle"></i>
                  Première fois sur cette séance : rien à comparer.
                </template>
              </div>

              <div v-for="exo in tentativeAffichee.exercices" :key="exo.cle" class="histo-exo">
                <div class="histo-exo-nom">{{ exo.nom }}</div>
                <div
                  v-for="(log, i) in exo.series"
                  :key="log.id"
                  class="histo-serie"
                  :class="{ 'non-fait': !log.fait }"
                >
                  <span class="histo-serie-label">S{{ i + 1 }}</span>
                  <span v-if="!log.fait" class="histo-nf">Non fait</span>
                  <template v-else>
                    <span
                      v-for="v in valeursHistorique(exo.nom, i, log, tentativeAffichee.type)"
                      :key="v.champ"
                      class="histo-val"
                    >
                      {{ v.valeur }}<span v-if="v.unite" class="histo-unite">{{ v.unite }}</span>
                      <span v-if="v.diff" class="histo-diff" :class="v.diff.classe">{{ v.diff.texte }}</span>
                    </span>
                  </template>
                  <span v-if="log.reaction_prepa" class="histo-reaction" title="Réaction de ton prépa">
                    {{ log.reaction_prepa }}<small>prépa</small>
                  </span>
                </div>
              </div>
            </template>
          </div>

          <!-- ONGLET COURBE : un graphe par exercice de la séance, moyenne de
               la charge sur toutes ses séries, un point par séance réalisée -->
          <div class="screen" v-else>
            <div class="info-note">
              <i class="ti ti-info-circle"></i>
              Moyenne de la charge sur toutes les séries de l'exercice, un point par séance réalisée.
            </div>
            <div v-if="courbesSeance.length === 0" class="empty">
              Pas encore assez de données : il faut au moins deux séances enregistrées.
            </div>
            <div v-for="courbe in courbesSeance" :key="courbe.nom" class="progression-exo-bloc">
              <CourbeProgression
                :points="courbe.points"
                :label="courbe.nom"
                :unite="courbe.unite"
                :axe-x="courbe.points.length > 8 ? 'dates' : 'tentatives'"
              />
            </div>
          </div>

          <!-- Panneau de saisie : les cartes série du groupe choisi, en bottom sheet.
               Le v-for sur [groupeSaisie] ne fait qu'aliaser groupeSaisie en `groupe`
               pour que le bloc des cartes série reste identique à l'ancien inline. -->
          <div
            v-if="groupeSaisie"
            class="saisie-overlay"
            @click.self="fermerSaisie"
            @pointerdown.stop
            @pointermove.stop
            @pointerup.stop
            @pointercancel.stop
          >
            <div class="saisie-sheet" v-for="groupe in [groupeSaisie]" :key="groupe.key">
              <div class="saisie-head">
                <span class="exo-num">{{ groupe.ordre }}</span>
                <div class="saisie-titres">
                  <div class="saisie-noms">
                    <span v-for="(exo, eidx) in groupe.exercices" :key="exo.id" class="saisie-nom">
                      <ExerciceImage
                        :src="exo.image_url"
                        :src2="exo.image_url_2"
                        :nom="exo.nom"
                        :consigne="exo.consigne"
                        :size="groupe.exercices.length > 1 ? 'md' : 'lg'"
                      />
                      <span class="exo-letter-mini" v-if="groupe.exercices.length > 1">{{ letterFor(eidx) }}</span>
                      {{ exo.nom }}
                      <button
                        type="button"
                        class="btn-suivi"
                        :class="{ active: exo.suivi }"
                        @click="toggleSuivi(exo)"
                        :aria-label="exo.suivi ? 'Ne plus suivre les performances' : 'Suivre les performances'"
                      >
                        <i class="ti ti-star"></i>
                      </button>
                    </span>
                  </div>
                  <!-- Objectif fixé par le prépa : la charge à aller chercher -->
                  <template v-for="(exo, eidx) in groupe.exercices" :key="'obj' + exo.id">
                    <template v-for="obj in [objectifExo(exo)]" :key="obj?.id ?? 'sans-objectif'">
                      <div v-if="obj" class="saisie-objectif" :class="{ atteint: obj.atteint_le }">
                        <i class="ti" :class="obj.atteint_le ? 'ti-circle-check' : 'ti-target-arrow'"></i>
                        <span>
                          <span class="exo-letter-mini" v-if="groupe.exercices.length > 1">{{ letterFor(eidx) }}</span>
                          Objectif de ton prépa : <strong>{{ texteObjectif(obj) }}</strong>
                          <template v-if="obj.atteint_le"> · atteint</template>
                          <template v-else-if="obj.meilleure_charge"> · ton meilleur : {{ texteCharge(obj.meilleure_charge) }}</template>
                        </span>
                      </div>
                    </template>
                  </template>
                  <div class="saisie-swipe-hint">
                    <span class="swipe-hint-item"><i class="ti ti-chevron-left"></i> Historique</span>
                    <span class="swipe-hint-item">Courbe progression <i class="ti ti-chevron-right"></i></span>
                  </div>
                </div>
                <button class="btn btn-icon" @click="fermerSaisie" aria-label="Fermer">
                  <i class="ti ti-x"></i>
                </button>
              </div>

              <div
                class="saisie-body"
                @pointerdown="swipeSaisie.start"
                @pointermove="swipeSaisie.move"
                @pointerup="swipeSaisie.end"
                @pointercancel="swipeSaisie.cancel"
              >
              <div v-if="saisieVue !== 'saisie'" class="saisie-mode-banner">
                <span v-if="saisieVue === 'historique'">
                  <i class="ti ti-history"></i>
                  {{ dateTentativeGroupe ? formatDateNumerique(dateTentativeGroupe) : 'Historique' }}
                  <span class="saisie-mode-pager" v-if="nbTentativesGroupe > 1">({{ historiqueIndex + 1 }}/{{ nbTentativesGroupe }})</span>
                </span>
                <span v-else><i class="ti ti-chart-line"></i> Courbe de progression</span>
                <button
                  v-if="saisieVue === 'historique' && dateTentativeGroupe"
                  type="button"
                  class="btn-supprimer-seance-historique"
                  @click="supprimerSeanceHistorique"
                  aria-label="Supprimer cette séance de l'historique"
                >
                  <i class="ti ti-trash"></i>
                </button>
                <button class="saisie-mode-retour" @click="retourSaisie">Retour à la saisie</button>
              </div>

              <template v-if="saisieVue === 'progression'">
                <div
                  v-for="(exo, eidx) in groupe.exercices"
                  :key="'prog' + exo.id"
                  class="progression-exo-bloc"
                >
                  <div class="progression-exo-titre" v-if="groupe.exercices.length > 1">
                    <span class="exo-letter-mini">{{ letterFor(eidx) }}</span> {{ exo.nom }}
                  </div>
                  <CourbeProgression
                    v-for="champ in champsGraphique"
                    :key="champ.champ"
                    :points="courbeExo(exo, champ.champ)"
                    :label="champ.label"
                    :unite="champ.unite"
                    :objectif="champ.champ === 'poids_realise' ? objectifExo(exo)?.poids ?? null : null"
                  />
                </div>
              </template>

              <template v-else>
              <!-- Une ligne par série : à gauche le numéro et le repos, puis
                   ce qui est prévu (les mêmes valeurs qu'en grisé dans les
                   cases) et le N-1 ; au milieu les deux cases ; à droite le
                   bouton. Quatre séries tiennent dans l'écran sans défiler. -->
              <div
                v-for="serieIdx in nbSeriesGroupe(groupe)"
                :key="serieIdx"
                class="serie-card"
                :class="{ done: isGroupeDone(groupe, serieIdx - 1), 'est-superset': groupe.exercices.length > 1 }"
              >
                <div class="serie-num">
                  <span class="serie-label">S{{ serieIdx }}</span>
                  <span class="serie-repos" v-if="reposSerie(groupe, serieIdx - 1)">
                    <i class="ti ti-clock"></i>{{ reposSerie(groupe, serieIdx - 1) }}
                  </span>
                </div>

                <div class="serie-corps">
                <!-- template v-for + v-if interne (et non v-if sur le v-for,
                     que Vue 3 évalue en premier) : un exercice rattaché à un
                     superset déjà chiffré n'a pas toutes les séries du groupe.
                     Sans ce garde-fou, l'athlète remplit deux champs pour une
                     série inexistante, jetée à la validation faute d'id de
                     série à qui l'attacher. eidx reste l'index dans le groupe,
                     pour que les lettres A/B ne se décalent pas. -->
                <template v-for="(exo, eidx) in groupe.exercices" :key="exo.id">
                <div class="serie-exo" v-if="exo.series[serieIdx - 1]">
                  <div class="serie-exo-infos">
                  <span class="serie-prevu">
                    <span class="exo-letter-mini" v-if="groupe.exercices.length > 1">{{ letterFor(eidx) }}</span>
                    {{ valeursSerie(exo, serieIdx - 1) || '—' }}
                  </span>

                  <!-- N-1 : dernière performance connue sur cette série, visible
                       dès la saisie sans avoir à swiper vers l'historique. -->
                  <template v-for="n1 in [n1SeriePourExo(exo, serieIdx)]" :key="n1?.id ?? 'vide'">
                    <div
                      class="n1-bloc"
                      v-if="saisieVue === 'saisie' && n1 && (!n1.fait || n1.reps_realisees || n1.poids_realise)"
                    >
                      <span class="n1-tag">N-1</span>
                      <span class="n1-val n1-nf" v-if="!n1.fait">NF</span>
                      <template v-else-if="seanceActive.type_seance === 'musculation' || !seanceActive.type_seance">
                        <span class="n1-val" v-if="n1.reps_realisees">{{ n1.reps_realisees }}<span class="n1-unit" v-if="estNombre(n1.reps_realisees)">reps</span></span>
                        <span class="n1-val" v-if="n1.poids_realise">{{ n1.poids_realise }}<span class="n1-unit" v-if="estNombre(n1.poids_realise)">kg</span></span>
                      </template>
                      <template v-else-if="seanceActive.type_seance === 'natation' || seanceActive.type_seance === 'athletisme'">
                        <span class="n1-val" v-if="n1.reps_realisees">{{ n1.reps_realisees }}<span class="n1-unit" v-if="estNombre(n1.reps_realisees)">m</span></span>
                        <span class="n1-val" v-if="n1.poids_realise">{{ n1.poids_realise }}</span>
                      </template>
                      <template v-else-if="seanceActive.type_seance === 'pliometrie'">
                        <span class="n1-val" v-if="n1.reps_realisees">{{ n1.reps_realisees }}<span class="n1-unit" v-if="estNombre(n1.reps_realisees)">bonds</span></span>
                        <span class="n1-val" v-if="n1.poids_realise">{{ n1.poids_realise }}</span>
                      </template>
                    </div>
                  </template>

                  </div>

                  <!-- Réalisé : 2 champs, clavier numérique quand la donnée l'est.
                       Swipe droit dans le panneau → dernière performance à la place. -->
                  <div class="realise-inputs" v-if="saisieVue === 'saisie'">
                    <template v-if="seanceActive.type_seance === 'musculation' || !seanceActive.type_seance">
                      <div class="log-input-wrap">
                        <input
                          v-model="getLogs(exo.id, serieIdx-1).reps_realisees"
                          :placeholder="exo.series[serieIdx-1]?.nb_reps || 'reps'"
                          :inputmode="inputmodeSaisie(exo.series[serieIdx-1]?.nb_reps)"
                          class="log-input"
                          :class="{ 'log-input-locked': isGroupeDone(groupe, serieIdx - 1) }"
                          :readonly="isGroupeDone(groupe, serieIdx - 1)"
                        />
                        <span
                          v-if="diffVsHistorique(exo, serieIdx, 'reps_realisees')"
                          class="log-input-diff"
                          :class="diffVsHistorique(exo, serieIdx, 'reps_realisees').classe"
                        >{{ diffVsHistorique(exo, serieIdx, 'reps_realisees').texte }}</span>
                      </div>
                      <div class="log-input-wrap">
                        <input
                          v-model="getLogs(exo.id, serieIdx-1).poids_realise"
                          :placeholder="exo.series[serieIdx-1]?.poids_cible || 'charge'"
                          :inputmode="inputmodeSaisie(exo.series[serieIdx-1]?.poids_cible)"
                          class="log-input"
                          :class="{ 'log-input-locked': isGroupeDone(groupe, serieIdx - 1) }"
                          :readonly="isGroupeDone(groupe, serieIdx - 1)"
                        />
                        <span
                          v-if="diffVsHistorique(exo, serieIdx, 'poids_realise')"
                          class="log-input-diff"
                          :class="diffVsHistorique(exo, serieIdx, 'poids_realise').classe"
                        >{{ diffVsHistorique(exo, serieIdx, 'poids_realise').texte }}</span>
                      </div>
                    </template>
                    <template v-else-if="seanceActive.type_seance === 'natation' || seanceActive.type_seance === 'athletisme'">
                      <input
                        v-model="getLogs(exo.id, serieIdx-1).reps_realisees"
                        :placeholder="exo.series[serieIdx-1]?.metres ? `${exo.series[serieIdx-1].metres}m` : 'mètres'"
                        :inputmode="inputmodeSaisie(exo.series[serieIdx-1]?.metres)"
                        class="log-input"
                        :class="{ 'log-input-locked': isGroupeDone(groupe, serieIdx - 1) }"
                        :readonly="isGroupeDone(groupe, serieIdx - 1)"
                      />
                      <input
                        v-model="getLogs(exo.id, serieIdx-1).poids_realise"
                        :placeholder="exo.series[serieIdx-1]?.intensite || 'intensité'"
                        class="log-input"
                        :class="{ 'log-input-locked': isGroupeDone(groupe, serieIdx - 1) }"
                        :readonly="isGroupeDone(groupe, serieIdx - 1)"
                      />
                    </template>
                    <template v-else-if="seanceActive.type_seance === 'pliometrie'">
                      <input
                        v-model="getLogs(exo.id, serieIdx-1).reps_realisees"
                        :placeholder="exo.series[serieIdx-1]?.bonds ? `${exo.series[serieIdx-1].bonds} bonds` : 'bonds'"
                        :inputmode="inputmodeSaisie(exo.series[serieIdx-1]?.bonds)"
                        class="log-input"
                        :class="{ 'log-input-locked': isGroupeDone(groupe, serieIdx - 1) }"
                        :readonly="isGroupeDone(groupe, serieIdx - 1)"
                      />
                      <input
                        v-model="getLogs(exo.id, serieIdx-1).poids_realise"
                        :placeholder="exo.series[serieIdx-1]?.intensite || 'intensité'"
                        class="log-input"
                        :class="{ 'log-input-locked': isGroupeDone(groupe, serieIdx - 1) }"
                        :readonly="isGroupeDone(groupe, serieIdx - 1)"
                      />
                    </template>
                  </div>
                  <div class="historique-inline" v-else>
                    <template v-for="entree in [historiqueSeriePourExo(exo, serieIdx)]" :key="entree?.log?.id ?? 'vide'">
                      <template v-if="entree">
                        <div class="realise-inputs">
                          <input
                            class="log-input"
                            :class="{ 'log-input-locked': !estEnEdition(entree.log), done: entree.log.fait && !estEnEdition(entree.log) }"
                            :readonly="!estEnEdition(entree.log)"
                            v-model="entree.log.reps_realisees"
                          />
                          <input
                            class="log-input"
                            :class="{ 'log-input-locked': !estEnEdition(entree.log), done: entree.log.fait && !estEnEdition(entree.log) }"
                            :readonly="!estEnEdition(entree.log)"
                            v-model="entree.log.poids_realise"
                          />
                        </div>
                      </template>
                      <span v-else class="historique-inline-vide">Pas d'historique</span>
                    </template>
                  </div>
                </div>
                </template>
                </div>

                <button
                  v-if="saisieVue === 'saisie' || historiqueGroupeExiste(groupe, serieIdx)"
                  type="button"
                  class="btn-serie"
                  :class="etatBoutonSerie(groupe, serieIdx).classe"
                  :aria-label="`Série ${serieIdx} : ${etatBoutonSerie(groupe, serieIdx).label}`"
                  :title="etatBoutonSerie(groupe, serieIdx).label"
                  @click="toggleSerie(groupe, serieIdx, $event)"
                >
                  <svg v-if="etatBoutonSerie(groupe, serieIdx).icone === 'ti-check'" class="coche" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
                  <i v-else :class="'ti ' + etatBoutonSerie(groupe, serieIdx).icone"></i>
                </button>
              </div>
              </template>
              </div>

              <div class="saisie-foot">
                <button class="btn btn-primary btn-saisie-ok" @click="fermerSaisie">
                  <i class="ti ti-check"></i> Terminé
                </button>
              </div>
            </div>
          </div>

          <!-- Barre de validation, rangée sous le bas de l'écran pendant qu'on
               remplit la séance : elle sort en fin de défilement, comme le
               dernier bloc de la feuille, ou d'un coup par sa languette
               (cf. useBarreRangee). Absente de l'historique et des courbes,
               qui ne sont que de la consultation. -->
          <div
            ref="barreValiderEl"
            class="valider-bar"
            :class="{
              'suit-defilement': barreValider.defile,
              'est-complete': progressionSeance.total && progressionSeance.done === progressionSeance.total
            }"
            :style="{
              '--sortie': barreValider.sortie,
              '--depasse': barreValider.depasse + 'px',
              '--avancement': (progressionSeance.total ? progressionSeance.done / progressionSeance.total * 100 : 0) + '%',
              '--languette': barreValider.relevee ? 1 : 1 - barreValider.parDefilement
            }"
            v-if="vueSeance === 'seance'"
          >
            <button
              type="button"
              class="valider-languette"
              :class="{
                'est-relevee': barreValider.relevee,
                'est-masquee': !barreValider.relevee && barreValider.parDefilement >= 0.98,
                'est-complete': progressionSeance.total && progressionSeance.done === progressionSeance.total
              }"
              aria-controls="valider-contenu"
              :aria-expanded="barreValider.sortie >= 0.98 ? 'true' : 'false'"
              :aria-label="barreValider.relevee
                ? 'Ranger la barre de validation'
                : `Afficher la barre de validation : ${progressionSeance.done} exercice(s) fait(s) sur ${progressionSeance.total}`"
              @pointerdown.stop="barreValider.languetteBas"
              @pointerup="barreValider.languetteHaut"
              @pointercancel="barreValider.languetteAnnulee"
              @click="barreValider.languetteClic"
            >
              <i class="ti ti-chevron-up"></i>
              <span>{{ progressionSeance.done }}/{{ progressionSeance.total }}</span>
            </button>
            <div id="valider-contenu" class="valider-contenu" :inert="barreValider.sortie === 0 || null">
            <div class="valider-progress">
              <div class="valider-progress-track">
                <div
                  class="valider-progress-fill"
                  :class="{ 'est-complete': progressionSeance.total && progressionSeance.done === progressionSeance.total }"
                  :style="{ width: progressionSeance.total ? (progressionSeance.done / progressionSeance.total * 100) + '%' : '0%' }"
                ></div>
              </div>
              <span class="valider-progress-label">
                {{ progressionSeance.done }}/{{ progressionSeance.total }} exercice{{ progressionSeance.total > 1 ? 's' : '' }}
              </span>
            </div>
            <button class="btn btn-primary btn-valider" @click="validerSeance">
              <i class="ti ti-check"></i> Valider la séance
            </button>
            <p class="valider-erreur" v-if="erreurValidation">
              <i class="ti ti-alert-triangle"></i> {{ erreurValidation }}
            </p>
            </div>
          </div>
        </template>
      </div>

      <!-- ONGLET PERFORMANCES -->
      <div v-if="onglet === 'performances'" v-entree-onglet="sensOnglet" v-cascade class="performances-page">
        <!-- Objectifs fixés par le prépa : où en est l'athlète sur chacun -->
        <section v-if="listeObjectifs.length" class="objectifs-perfs">
          <div class="section-title">Objectifs de ton prépa</div>
          <div v-for="o in listeObjectifs" :key="o.id" class="objectif-perf" :class="{ atteint: o.atteint_le }">
            <div class="objectif-perf-tete">
              <span class="objectif-perf-nom">{{ o.exercice_nom }}</span>
              <span class="objectif-perf-cible">
                <i class="ti" :class="o.atteint_le ? 'ti-circle-check' : 'ti-target-arrow'"></i> {{ texteObjectif(o) }}
              </span>
            </div>
            <div class="objectif-perf-jauge" role="progressbar" :aria-valuenow="avancementObjectif(o)" aria-valuemin="0" aria-valuemax="100" :aria-label="`Avancement vers l'objectif ${o.exercice_nom}`">
              <span :style="{ width: avancementObjectif(o) + '%' }"></span>
            </div>
            <div class="objectif-perf-sous">
              <template v-if="o.atteint_le">Atteint le {{ formatDateCourt(o.atteint_le) }}</template>
              <template v-else-if="o.meilleure_charge">Ton meilleur : {{ texteCharge(o.meilleure_charge) }}<template v-if="o.meilleure_charge < o.poids"> · encore {{ texteCharge(o.poids - o.meilleure_charge) }}</template></template>
              <template v-else>Pas encore de série faite sur cet exercice</template>
            </div>
          </div>
        </section>
        <ProgressionExercice :performances="performances" :objectifs="objectifs" />
        <div class="section-title">Meilleures performances</div>
        <div v-if="performances.length === 0" class="empty">
          Aucun exercice suivi pour l'instant. Touche l'étoile à côté d'un exercice dans le panneau de saisie pour le faire apparaître ici.
        </div>
        <div v-for="perf in performances" :key="perf.exercice_id" class="performance-row">
          <div class="performance-info">
            <span class="performance-exo">
              {{ perf.exercice_nom }}
              <button
                type="button"
                class="btn-suivi"
                :class="{ active: perf.suivi }"
                @click="toggleSuiviPerformance(perf)"
                :aria-label="perf.suivi ? 'Ne plus suivre les performances' : 'Suivre les performances'"
              >
                <i class="ti ti-star"></i>
              </button>
            </span>
            <span class="performance-meta">{{ perf.seance_nom }} · {{ perf.programme_nom }}</span>
            <span v-if="objectifPerf(perf)" class="performance-objectif" :class="{ atteint: objectifPerf(perf).atteint_le }">
              <i class="ti" :class="objectifPerf(perf).atteint_le ? 'ti-circle-check' : 'ti-target-arrow'"></i>
              Objectif {{ texteObjectif(objectifPerf(perf)) }}{{ objectifPerf(perf).atteint_le ? ' atteint' : '' }}
            </span>
          </div>
          <div class="performance-valeur" v-if="perf.meilleure_valeur !== null">
            <div class="performance-valeur-main">
              <span class="performance-val" v-compteur="perf.meilleure_valeur"></span>
              <span class="performance-unite">{{ perf.unite }}</span>
            </div>
            <div class="performance-valeur-sub">
              <span class="performance-reps" v-if="perf.meilleure_repetition">× {{ perf.meilleure_repetition }} reps</span>
              <span class="performance-date">{{ formatDateCourt(perf.date) }}</span>
            </div>
          </div>
          <span class="performance-vide" v-else>Aucune donnée</span>
        </div>
      </div>

      <!-- ONGLET POIDS -->
      <div v-if="onglet === 'poids'" v-entree-onglet="sensOnglet" class="poids-page">
        <div class="info-note">
          <i class="ti ti-info-circle"></i>
          Conseil : pesez-vous le matin, à jeun, pour un suivi fiable.
        </div>

        <div class="poids-calendrier-head">
          <button class="btn btn-icon" @click="moisPrecedent" aria-label="Mois précédent">
            <i class="ti ti-chevron-left"></i>
          </button>
          <span class="poids-mois-label">{{ labelMois }}</span>
          <button class="btn btn-icon" @click="moisSuivant" aria-label="Mois suivant">
            <i class="ti ti-chevron-right"></i>
          </button>
        </div>

        <div class="poids-calendrier-grille">
          <span v-for="(j, idx) in ['L', 'M', 'M', 'J', 'V', 'S', 'D']" :key="'lbl' + idx" class="poids-jour-label">{{ j }}</span>
          <button
            v-for="(jour, idx) in joursGrille"
            :key="idx"
            type="button"
            class="poids-jour-case"
            :class="{
              vide: !jour,
              'a-une-valeur': jour && poidsPourDate(jour.date),
              'est-aujourdhui': jour && jour.estAujourdhui
            }"
            :disabled="!jour || jour.estFutur"
            @click="jour && ouvrirSaisiePoids(jour.date)"
          >
            <template v-if="jour">
              <span class="poids-jour-num">{{ jour.numero }}</span>
              <span v-if="poidsPourDate(jour.date)" class="poids-jour-val">{{ poidsPourDate(jour.date) }}</span>
            </template>
          </button>
        </div>

        <div class="poids-moyenne">
          <span class="poids-moyenne-label">Poids moyen :</span>
          <template v-if="moyennePoidsMois">
            <span class="poids-moyenne-val">
              <span v-compteur="moyennePoidsMois.valeur"></span><span class="poids-moyenne-unite">kg</span>
            </span>
            <span class="poids-moyenne-sub">
              {{ moyennePoidsMois.nb }} pesée{{ moyennePoidsMois.nb > 1 ? 's' : '' }} en {{ labelMois.toLowerCase() }}
            </span>
          </template>
          <span class="poids-moyenne-sub" v-else>aucune pesée ce mois-ci</span>
        </div>

        <!-- Courbe sous le calendrier : la tendance se lit d'un coup d'œil
             sans changer de vue. axe-x="dates" — une pesée par jour dépasse
             vite la dizaine de points, un label « S1…Sn » déborderait. -->
        <CourbeProgression :points="courbePoids" label="Poids" unite="kg" axe-x="dates" />

        <!-- Modale de saisie du poids d'un jour -->
        <div v-if="dateSaisiePoids" class="modal-overlay" @click.self="fermerSaisiePoids">
          <div class="modal">
            <div class="modal-header">
              <h3>{{ formatDateLongue(dateSaisiePoids) }}</h3>
              <button class="modal-close" @click="fermerSaisiePoids" aria-label="Fermer">
                <i class="ti ti-x"></i>
              </button>
            </div>
            <div class="modal-body">
              <div class="field">
                <label>Poids (kg)</label>
                <input
                  v-model="poidsSaisi"
                  inputmode="decimal"
                  placeholder="Ex : 72,4"
                />
              </div>
              <p v-if="aidePoids" class="aide-poids">{{ aidePoids }}</p>
              <p v-if="erreurPoids" class="error">{{ erreurPoids }}</p>
            </div>
            <div class="modal-footer">
              <button v-if="entreeExistante" class="btn btn-danger" @click="supprimerPoids">
                <i class="ti ti-trash"></i> Supprimer
              </button>
              <button class="btn btn-primary" @click="enregistrerPoids" :disabled="!poidsValide">
                <i class="ti ti-check"></i> Enregistrer
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- ONGLET DIÈTE -->
      <DietePanel v-if="onglet === 'diete'" v-entree-onglet="sensOnglet" />

      <!-- ONGLET BLESSURES -->
      <BlessuresPanel v-if="onglet === 'blessures'" v-entree-onglet="sensOnglet" />

      <!-- ONGLET MES STATS -->
      <MesStats
        v-if="onglet === 'mes-stats'"
        v-entree-onglet="sensOnglet"
        :focus-ressenti="focusRessenti"
        :focus-wellness="focusWellness"
        @focus-consomme="onFocusConsomme"
        @ressenti-envoye="popupRessenti = null"
        @wellness-envoye="popupWellness = false"
        @voir-seance="ouvrirDepuisRegularite"
        @voir-poids="onglet = 'poids'"
      />
    </div>
  </AppLayout>
</template>

<script>
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { useApi } from '../services/api'
// utilisé uniquement pour cloisonner le brouillon de saisie par athlète
// (téléphone partagé, changement de compte)
import { useAuthStore } from '../stores/auth'
import AppLayout from '../components/AppLayout.vue'
import CourbeProgression from '../components/athlete/CourbeProgression.vue'
import MesStats from '../components/athlete/MesStats.vue'
import AjoutSeanceLibre from '../components/athlete/AjoutSeanceLibre.vue'
import SemaineProgramme from '../components/athlete/SemaineProgramme.vue'
import PlanificationSaison from '../components/athlete/PlanificationSaison.vue'
import { carteSemaines } from '../utils/planification'
import ProgressionExercice from '../components/athlete/ProgressionExercice.vue'
import CelebrationXp from '../components/athlete/CelebrationXp.vue'
import RecapSemaineModal from '../components/athlete/RecapSemaineModal.vue'
import { useProgressionStore } from '../stores/progression'
import BlessuresPanel from '../components/athlete/BlessuresPanel.vue'
import DietePanel from '../components/athlete/DietePanel.vue'
import PopupBanniere from '../components/athlete/PopupBanniere.vue'
import ReactionArrivee from '../components/athlete/ReactionArrivee.vue'
import { feterSerie, origineDe } from '../animations/mouvement'
import { prechargerConfettis } from '../animations/confettis'
import PlanningCalendrier from '../components/athlete/PlanningCalendrier.vue'
import PlanningHebdoModal from '../components/athlete/PlanningHebdoModal.vue'
import ExerciceImage from '../components/ExerciceImage.vue'
import { typeGroupe, labelTypeGroupe } from '../data/typesGroupe'
import { cleOccurrence, jourDeLaDate } from '../data/joursSemaine'
import { parseValeurSerie, inputmodeSaisie } from '../utils/valeurSerie'
import { formatJourRelatif } from '../data/activite'
import { texteRecord } from '../data/seancesRealisees'
import { objectifDe, objectifsParCle, texteCharge, texteObjectif } from '../data/objectifs'
import { afficherToast } from '../composables/useToast'
import { useBarreRangee } from '../composables/useBarreRangee'

// Distance horizontale minimale pour valider un swipe. Volontairement haute :
// un doigt qui ripe sur un simple appui ne doit jamais changer d'écran.
const SEUIL_SWIPE = 80

// Identifiant d'une tentative de séance. crypto.randomUUID n'existe pas avant
// iOS 15.4 ni hors contexte sécurisé : sans repli, démarrer une séance levait
// une exception et l'écran ne s'ouvrait pas du tout.
const nouvelIdSession = () =>
  crypto.randomUUID?.() ?? `s-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`

// Swipe horizontal réutilisable : appelle onSwipe(+1) vers la gauche (page
// suivante) et onSwipe(-1) vers la droite. La décision se prend au relâché, sans
// suivi en direct, pour ne jamais interférer avec le scroll vertical ni les
// clics sur les champs et boutons.
//
// `actif` désactive complètement le geste (le pointeur n'est même pas capté),
// `stopper` empêche le geste de remonter à un swipe de plus haut niveau.
const creerSwipeHorizontal = (onSwipe, { actif = () => true, stopper = false } = {}) => {
  const etat = { startX: 0, startY: 0, dx: 0, dy: 0, pointerId: null }
  // Horodatage du dernier swipe abouti, pour neutraliser le clic qui suit (cf.
  // filtrerClic).
  let dernierSwipe = 0

  const appliquer = (dx, dy) => {
    if (Math.abs(dy) > Math.abs(dx) + 10) return
    if (dx > -SEUIL_SWIPE && dx < SEUIL_SWIPE) return
    dernierSwipe = Date.now()
    onSwipe(dx <= -SEUIL_SWIPE ? 1 : -1)
  }

  return {
    // À poser en capture sur le conteneur : un glissement se termine aussi par
    // un clic sur l'élément survolé (carte d'exercice, carte de séance), qui
    // déclencherait son action en plus du changement de vue. On l'avale.
    filtrerClic(e) {
      if (Date.now() - dernierSwipe > 400) return
      e.stopPropagation()
      e.preventDefault()
    },
    start(e) {
      if (!actif()) return
      if (e.pointerType === 'mouse' && e.button !== 0) return
      // un second doigt (pinch, paume posée sur l'écran) ne doit pas redéfinir
      // l'origine du geste en cours : son relâché produirait un dx énorme
      if (!e.isPrimary) return
      if (stopper) e.stopPropagation()
      etat.startX = e.clientX
      etat.startY = e.clientY
      etat.dx = 0
      etat.dy = 0
      etat.pointerId = e.pointerId
    },
    move(e) {
      if (etat.pointerId !== e.pointerId) return
      etat.dx = e.clientX - etat.startX
      etat.dy = e.clientY - etat.startY
    },
    end(e) {
      if (etat.pointerId !== e.pointerId) return
      etat.pointerId = null
      appliquer(e.clientX - etat.startX, e.clientY - etat.startY)
    },
    // Le navigateur annule le pointeur dès qu'il prend la main sur le geste
    // (début de scroll, appui long, zoom) et dispatche pointercancel sans
    // coordonnées utilisables — iOS envoie (0, 0), ce qui transformait un
    // simple appui en swipe. On rejoue donc le dernier déplacement observé,
    // lui fiable : le geste aboutit quand il était déjà franc, et un appui
    // (dx nul) ne déclenche rien.
    cancel(e) {
      if (etat.pointerId !== e.pointerId) return
      etat.pointerId = null
      appliquer(etat.dx, etat.dy)
    }
  }
}

// Onglets disponibles dans une séance ouverte
const VUES_SEANCE = [
  { cle: 'seance', label: 'Séance', icone: 'ti-barbell' },
  { cle: 'historique', label: 'Historique', icone: 'ti-history' },
  { cle: 'courbe', label: 'Courbe', icone: 'ti-chart-line' }
]

// Dimension « charge » de l'effort selon le type de séance : c'est celle qu'on
// trace en courbe (le poids en musculation, la distance en natation/athlé, les
// bonds en pliométrie).
const CHAMP_CHARGE = {
  musculation: { champ: 'poids_realise', label: 'Charge', unite: 'kg' },
  natation: { champ: 'reps_realisees', label: 'Distance', unite: 'm' },
  athletisme: { champ: 'reps_realisees', label: 'Distance', unite: 'm' },
  pliometrie: { champ: 'reps_realisees', label: 'Bonds', unite: '' }
}
const champCharge = (type) => CHAMP_CHARGE[type] || CHAMP_CHARGE.musculation

// Les deux champs réalisés saisis par l'athlète, avec leur unité d'affichage.
// Le second (intensité) n'est pas numérique hors musculation : pas d'unité.
const CHAMPS_REALISES = {
  musculation: [{ champ: 'reps_realisees', unite: 'reps' }, { champ: 'poids_realise', unite: 'kg' }],
  natation: [{ champ: 'reps_realisees', unite: 'm' }, { champ: 'poids_realise', unite: '' }],
  athletisme: [{ champ: 'reps_realisees', unite: 'm' }, { champ: 'poids_realise', unite: '' }],
  pliometrie: [{ champ: 'reps_realisees', unite: 'bonds' }, { champ: 'poids_realise', unite: '' }]
}
const champsRealises = (type) => CHAMPS_REALISES[type] || CHAMPS_REALISES.musculation

// Brouillon de séance : ce qui est tapé pendant une séance ne part au serveur
// qu'au moment de « Valider la séance ». Fermer l'app avant — ou une mise à
// jour du service worker — faisait tout perdre. On garde donc la saisie en
// cours en local et on propose de la reprendre au lancement suivant.
const CLE_BROUILLON = 'athletia:seance-en-cours'
// Programme épinglé par l'athlète : celui qui s'ouvre au lancement.
const CLE_EPINGLE = 'athletia:programme-epingle'
// Récap de la semaine déjà vu : lundi (ISO) de la semaine où il l'a été.
const CLE_RECAP_VU = 'athletia:recap-vu'
// Au-delà, une séance interrompue n'a plus de sens à reprendre : le brouillon
// est ignoré puis effacé plutôt que de proposer une reprise vieille d'une semaine.
const DUREE_BROUILLON_MS = 48 * 60 * 60 * 1000

export default {
  components: {
    AppLayout, CourbeProgression, MesStats, AjoutSeanceLibre, SemaineProgramme, ProgressionExercice, CelebrationXp, RecapSemaineModal, BlessuresPanel, DietePanel, PopupBanniere,
    PlanningCalendrier, PlanningHebdoModal, ExerciceImage, ReactionArrivee, PlanificationSaison
  },
  setup() {
    const programmes = ref([])
    const programmeActif = ref(null)
    const seances = ref([])
    const seanceActive = ref(null)
    const sessionSaisieId = ref(null)
    // Id de la séance dont la saisie locale (logs.value) est en cours mais pas
    // encore validée — permet de la reprendre telle quelle en repassant par la
    // liste et en rouvrant la même séance, sans perdre ce qui a été rempli.
    const seanceEnCoursId = ref(null)
    const logs = ref({})
    // Séries restées au bord de la route à la dernière validation : tant que
    // ce message est là, la séance n'est ni marquée faite ni son brouillon effacé.
    const erreurValidation = ref('')
    const historique = ref([])
    const loadingSeances = ref(false)
    const onglet = ref('mes-stats')

    // --- Feuille "Suivi" (Poids / Diète / Blessures regroupés) ---
    const menuSuiviOuvert = ref(false)
    const ongletsSuivi = ['poids', 'diete', 'blessures']
    const ITEMS_SUIVI = [
      { cle: 'poids', label: 'Poids', desc: 'Pesées et courbe', icone: 'ti-scale', bg: 'var(--color-primary-light)', couleur: 'var(--color-primary-dark)' },
      { cle: 'diete', label: 'Diète', desc: 'Repas et objectifs', icone: 'ti-salad', bg: 'var(--color-valid-bg)', couleur: 'var(--color-valid-text-strong)' },
      { cle: 'blessures', label: 'Blessures', desc: 'Déclarer un bobo', icone: 'ti-bandage', bg: 'var(--color-danger-bg)', couleur: 'var(--color-danger-text)' }
    ]
    const choisirSuivi = (cle) => { onglet.value = cle; menuSuiviOuvert.value = false }
    // Tentative (session_id) dont la bannière propose le ressenti, null si
    // aucune : la bannière doit tomber si cette tentative disparaît de
    // l'historique, sinon elle propose un questionnaire sans séance derrière.
    const popupRessenti = ref(null)
    const popupWellness = ref(false)
    const focusRessenti = ref(false)
    const focusWellness = ref(false)

    const repondreRessenti = () => {
      popupRessenti.value = null
      onglet.value = 'mes-stats'
      focusRessenti.value = true
    }
    const repondreWellness = () => {
      popupWellness.value = false
      onglet.value = 'mes-stats'
      focusWellness.value = true
    }
    const onFocusConsomme = (quoi) => {
      if (quoi === 'ressenti') focusRessenti.value = false
      if (quoi === 'wellness') focusWellness.value = false
    }
    const api = useApi()
    const authStore = useAuthStore()

    // --- Brouillon de saisie (local, jamais envoyé au serveur) ---
    // Proposition de reprise affichée au lancement, null sinon.
    const brouillonPropose = ref(null)

    const effacerBrouillon = () => {
      try {
        localStorage.removeItem(CLE_BROUILLON)
      } catch (e) {
        console.error('Erreur effacement brouillon:', e)
      }
    }

    const lireBrouillon = () => {
      try {
        const brut = localStorage.getItem(CLE_BROUILLON)
        if (!brut) return null
        const brouillon = JSON.parse(brut)
        // brouillon d'un autre compte (téléphone partagé) ou trop ancien
        if (brouillon?.userId !== (authStore.user?.id ?? null)) return null
        if (!brouillon.horodatage || Date.now() - brouillon.horodatage > DUREE_BROUILLON_MS) {
          effacerBrouillon()
          return null
        }
        return brouillon
      } catch {
        effacerBrouillon()
        return null
      }
    }

    // getLogs() crée une entrée vide au simple affichage d'une série : sans ce
    // filtre, ouvrir une séance suffirait à créer un brouillon et à proposer
    // de « reprendre » une saisie où rien n'a été tapé.
    const saisieNonVide = (parExercice) =>
      Object.values(parExercice || {}).some(series =>
        Object.values(series || {}).some(l => l.fait || l.reps_realisees || l.poids_realise)
      )

    // Début de la saisie en cours : conservé d'une sauvegarde à l'autre pour
    // que la bannière annonce l'heure de début réelle, pas celle de la
    // dernière frappe ni celle de la reprise.
    const debutSaisie = ref(null)

    const enregistrerBrouillon = () => {
      if (!seanceActive.value || !programmeActif.value) return
      if (!saisieNonVide(logs.value)) return
      if (!debutSaisie.value) debutSaisie.value = Date.now()
      try {
        localStorage.setItem(CLE_BROUILLON, JSON.stringify({
          userId: authStore.user?.id ?? null,
          programmeId: programmeActif.value.id,
          seanceId: seanceActive.value.id,
          seanceNom: seanceActive.value.nom,
          sessionSaisieId: sessionSaisieId.value,
          logs: logs.value,
          horodatage: debutSaisie.value
        }))
      } catch (e) {
        // quota dépassé ou stockage refusé (navigation privée) : la saisie
        // continue normalement, elle ne sera juste pas rattrapable
        console.error('Erreur sauvegarde brouillon:', e)
      }
    }

    const labelType = (t) => {
      const map = { musculation: 'Musculation', natation: 'Natation', athletisme: 'Athlétisme', pliometrie: 'Pliométrie' }
      return map[t] || 'Musculation'
    }

    const iconeType = (t) => {
      const map = { musculation: 'ti-barbell', natation: 'ti-swimming', athletisme: 'ti-run', pliometrie: 'ti-bolt' }
      return map[t] || 'ti-barbell'
    }

    // Repère la séance du jour sur l'écran liste : l'athlète n'a pas à
    // comparer "lundi" dans sa tête avec la date d'aujourd'hui.
    const estAujourdhuiSeance = (seance) => seance.jour === jourDeLaDate(new Date())

    const letterFor = (idx) => String.fromCharCode(65 + idx)

    const grouperExercices = (exercices) => {
      if (!exercices || exercices.length === 0) return []
      const groupes = []
      const map = {}
      const sorted = [...exercices].sort((a, b) => a.ordre - b.ordre)
      sorted.forEach(exo => {
        if (exo.groupe) {
          if (!map[exo.groupe]) {
            map[exo.groupe] = { key: `g${exo.groupe}`, ordre: groupes.length + 1, exercices: [] }
            groupes.push(map[exo.groupe])
          }
          map[exo.groupe].exercices.push(exo)
        } else {
          groupes.push({ key: `e${exo.id}`, ordre: groupes.length + 1, exercices: [exo] })
        }
      })
      return groupes
    }

    // Les exercices d'un même groupe n'ont pas forcément le même nombre de
    // séries : ajouterAuSuperset (ProgrammeForm) rattache un exercice neuf,
    // sans séries, à un groupe déjà chiffré. Le groupe se cadre donc sur
    // l'exercice qui en a le plus, jamais sur le premier — sinon les séries
    // au-delà disparaissent, ou pire : l'athlète saisit des lignes qui
    // n'existent pas en base et qui partent à la poubelle à la validation.
    const nbSeriesGroupe = (groupe) => Math.max(0, ...groupe.exercices.map(e => e.series.length))

    // Les seuls exercices à afficher, cocher et enregistrer pour cet index.
    const exosDeLaSerie = (groupe, serieIdx) => groupe.exercices.filter(e => e.series[serieIdx])

    // Le repos affiché : celui du premier exercice qui a réellement cette série.
    const reposSerie = (groupe, serieIdx) => exosDeLaSerie(groupe, serieIdx)[0]?.series[serieIdx]?.temps_repos

    const getLogs = (exoId, serieIdx) => {
      if (!logs.value[exoId]) logs.value[exoId] = {}
      if (!logs.value[exoId][serieIdx]) {
        logs.value[exoId][serieIdx] = { reps_realisees: '', poids_realise: '', fait: false }
      }
      return logs.value[exoId][serieIdx]
    }

    const isGroupeDone = (groupe, serieIdx) => {
      const exos = exosDeLaSerie(groupe, serieIdx)
      return exos.length > 0 && exos.every(exo => getLogs(exo.id, serieIdx).fait)
    }

    // Clés (groupe+série) dont la sauvegarde est en cours. Un double-tap
    // pendant qu'une requête part encore enverrait fait:true puis fait:false
    // en quasi-simultané : si le serveur les traite dans le désordre, l'état
    // enregistré reste l'inverse de ce que montre l'écran jusqu'à la
    // prochaine « Valider la séance ». On ignore donc le second tap tant que
    // le premier n'est pas arrivé.
    const seriesEnEnvoi = new Set()

    const toggleGroupeDone = async (groupe, serieIdx) => {
      const cle = `${groupe.key}-${serieIdx}`
      if (seriesEnEnvoi.has(cle)) return
      seriesEnEnvoi.add(cle)
      try {
        const isDone = isGroupeDone(groupe, serieIdx)
        exosDeLaSerie(groupe, serieIdx).forEach(exo => marquerSerie(exo, serieIdx, !isDone))

        // Sauvegarde immédiate : une série cochée part tout de suite au
        // serveur, sans attendre « Valider la séance ». Avant, tout restait
        // local jusqu'à ce bouton final — un athlète qui s'arrêtait en route
        // (connexion coupée, séance écourtée) perdait alors tout ce qu'il
        // avait déjà validé. L'upsert par session_id (cf. route /series/.../logs)
        // rend cet appel idempotent : « Valider la séance » peut sans risque
        // renvoyer la même série plus tard. Échec silencieux ici (pas de
        // blocage de la saisie en cours) : le brouillon local et le renvoi
        // global de validerSeance restent le filet de sécurité en cas de
        // coupure réseau.
        await sauvegarderSerie(groupe, serieIdx)

        // Après validation, vérifie si toutes les séries du groupe sont complètes
        if (!isDone) {
          const nbSeries = nbSeriesGroupe(groupe)
          const toutesValidees = Array.from({ length: nbSeries }, (_, i) => i)
            .every(i => isGroupeDone(groupe, i))

          // Groupe terminé : referme le panneau de saisie, retour à la vue
          // d'ensemble. La clé est revérifiée à l'échéance : ouvrir un autre
          // exercice pendant ces 400 ms refermait sinon ce nouveau panneau.
          if (toutesValidees && groupeSaisie.value?.key === groupe.key) {
            setTimeout(() => {
              if (groupeSaisie.value?.key === groupe.key) fermerSaisie()
            }, 400)
          }
        }
      } finally {
        seriesEnEnvoi.delete(cle)
      }
    }

    // --- Panneau de saisie par groupe (présentation uniquement) ---
    const groupeSaisie = ref(null)
    // 'saisie' (centre) | 'historique' (swipe droit, tentatives passées) | 'progression' (swipe gauche, courbe)
    const saisieVue = ref('saisie')
    // Profondeur dans l'historique en mode 'historique' : 0 = n-1 (la plus récente
    // tentative passée), 1 = n-2, etc. Chaque nouveau swipe droit y creuse plus loin.
    const historiqueIndex = ref(0)
    const ouvrirSaisie = (groupe) => { groupeSaisie.value = groupe; saisieVue.value = 'saisie'; historiqueIndex.value = 0 }
    const fermerSaisie = () => { groupeSaisie.value = null; saisieVue.value = 'saisie'; historiqueIndex.value = 0 }
    const retourSaisie = () => { saisieVue.value = 'saisie'; historiqueIndex.value = 0 }

    // Regroupe les logs d'un exercice par tentative : le session_id (généré par
    // demarrerSeance) distingue deux resaisies le même jour ; à défaut (logs
    // antérieurs à cette fonctionnalité), on retombe sur le jour calendaire.
    const cleTentative = (l) => l.session_id || l.date.split('T')[0]

    // Créneau d'un log : le nom de sa séance. Un programme multi-semaines
    // duplique le même créneau à chaque semaine (séances d'ids différents),
    // c'est bien la même séance du point de vue de l'athlète.
    const creneauLog = (l) => l.seance?.nom || ''

    // Logs d'un exercice pour le créneau ouvert uniquement : un même exercice
    // peut figurer dans plusieurs séances du programme (« Squat » en Push et en
    // Full body). Sans ce filtre, ouvrir la seconde séance affichait
    // l'historique et les courbes réalisés dans la première — un passé qui
    // n'appartient pas à cette séance, et dont les séries ne s'apparient même
    // pas (ids différents, cf. logTentativePourSerie). Les semaines dupliquées
    // du même créneau, elles, restent regroupées : c'est la progression.
    // Depuis la sauvegarde immédiate des séries cochées (cf. toggleGroupeDone),
    // la tentative en cours existe déjà côté serveur avant d'être terminée.
    // Tant que sa feuille reste ouverte, on la masque des comparaisons N-1 et
    // de l'onglet historique : sinon l'athlète se verrait comparé à lui-même
    // quelques secondes plus tôt, dans la même séance. Une fois la feuille
    // fermée (validée ou abandonnée), elle redevient un historique normal.
    const historiqueSansSessionEnCours = computed(() => {
      if (!seanceActive.value) return historique.value
      return historique.value.filter(l => l.session_id !== sessionSaisieId.value)
    })

    const logsCreneauPourExo = (nom) => {
      const creneau = seanceActive.value?.nom
      if (!creneau) return []
      return historiqueSansSessionEnCours.value.filter(l => l.exo_nom === nom && creneauLog(l) === creneau)
    }

    // Toutes les tentatives passées d'un exercice, la plus récente en premier :
    // [[logs de la tentative n-1], [logs de la tentative n-2], ...]
    const tentativesExo = (exo) => {
      const parTentative = {}
      logsCreneauPourExo(exo.nom)
        .forEach(l => {
          const cle = cleTentative(l)
          if (!parTentative[cle]) parTentative[cle] = []
          parTentative[cle].push(l)
        })
      return Object.values(parTentative)
        .sort((a, b) => new Date(b[0].date) - new Date(a[0].date))
    }

    // Le plus grand nombre de tentatives passées parmi les exercices du groupe
    // ouvert, pour borner la pagination du swipe droit.
    const nbTentativesGroupe = computed(() => {
      if (!groupeSaisie.value) return 0
      return Math.max(0, ...groupeSaisie.value.exercices.map(exo => tentativesExo(exo).length))
    })

    // Date de la tentative affichée en mode historique (bannière du panneau) :
    // on prend le premier exercice du groupe qui a bien une tentative à cette
    // profondeur (un biset peut avoir des historiques de longueurs différentes).
    const dateTentativeGroupe = computed(() => {
      if (!groupeSaisie.value) return null
      for (const exo of groupeSaisie.value.exercices) {
        const tentative = tentativesExo(exo)[historiqueIndex.value]
        if (tentative) return tentative[0].date.split('T')[0]
      }
      return null
    })

    // Clé (session_id, ou date à défaut) de la tentative affichée en vue
    // historique : sert à retrouver tous les logs de cette séance-là, tous
    // exercices confondus (pas seulement ceux du groupe ouvert), pour la
    // suppression au niveau de la séance entière.
    const cleTentativeGroupe = computed(() => {
      if (!groupeSaisie.value) return null
      for (const exo of groupeSaisie.value.exercices) {
        const tentative = tentativesExo(exo)[historiqueIndex.value]
        if (tentative) return cleTentative(tentative[0])
      }
      return null
    })

    // Swipe droit/gauche dans le panneau de saisie : bascule entre la saisie
    // (centre), les tentatives passées (droite, paginable) et la courbe de
    // progression complète de l'exercice/superset (gauche).
    const swipeSaisie = creerSwipeHorizontal((sens) => {
      if (sens < 0) {
        if (saisieVue.value === 'progression') saisieVue.value = 'saisie'
        else if (saisieVue.value === 'saisie') { saisieVue.value = 'historique'; historiqueIndex.value = 0 }
        else if (historiqueIndex.value < nbTentativesGroupe.value - 1) historiqueIndex.value += 1
      } else {
        if (saisieVue.value === 'historique') {
          if (historiqueIndex.value > 0) historiqueIndex.value -= 1
          else saisieVue.value = 'saisie'
        } else if (saisieVue.value === 'saisie') saisieVue.value = 'progression'
      }
    })

    // Log d'une tentative correspondant à une série précise de l'exercice.
    // Par serie.id d'abord (même semaine) ; sinon par rang de la série dans
    // son exercice : d'une semaine à l'autre d'un programme multi-semaines,
    // les séries sont dupliquées (ids différents) et l'ancien repli sur le
    // premier log de la tentative affichait le même N-1 sur toutes les
    // séries. Rien d'appariable : pas de N-1, plutôt que celui d'une autre série.
    const logTentativePourSerie = (tentative, exo, serieIdx) => {
      const serieId = exo.series[serieIdx - 1]?.id
      return tentative.find(l => l.serie.id === serieId)
        || tentative.find(l => indexSerieParId.value[l.serie.id] === serieIdx - 1)
        || null
    }

    // Performance à la tentative n-(historiqueIndex+1) pour cet exercice
    // (hors séries de la séance en cours).
    const historiqueSeriePourExo = (exo, serieIdx) => {
      const tentative = tentativesExo(exo)[historiqueIndex.value]
      if (!tentative) return null
      const log = logTentativePourSerie(tentative, exo, serieIdx)
      return log ? { date: tentative[0].date.split('T')[0], log } : null
    }

    // Dernière performance connue (n-1, toujours la plus récente, indépendante
    // de la pagination historique) pour cette série — affichée en clair à côté
    // du prescrit pendant la saisie, sans avoir à swiper vers l'historique.
    const n1SeriePourExo = (exo, serieIdx) => {
      const tentative = tentativesExo(exo)[0]
      if (!tentative) return null
      return logTentativePourSerie(tentative, exo, serieIdx)
    }

    const formatDateCourt = (d) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
    // Une valeur réalisée peut porter déjà son unité (« 70 kg », recopiée du
    // prescrit) : l'unité n'est ajoutée qu'à un nombre nu, sinon « 70 kg kg ».
    const estNombre = (v) => /^[\s\d.,+-]+$/.test(String(v ?? ''))
    const formatDateNumerique = (d) => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })

    // Écart chiffré entre deux valeurs réalisées, prêt à afficher : vert si en
    // hausse, rouge si en baisse. Non numérique (intensité en texte) = pas de
    // comparaison possible.
    const ecartValeurs = (actuel, precedent) => {
      const a = parseValeurSerie(actuel)
      const b = parseValeurSerie(precedent)
      if (isNaN(a) || isNaN(b)) return null
      const ecart = Math.round((a - b) * 100) / 100
      if (ecart === 0) return { texte: '=', classe: 'diff-neutre' }
      return { texte: (ecart > 0 ? '+' : '') + ecart, classe: ecart > 0 ? 'diff-positif' : 'diff-negatif' }
    }

    // Écart entre la saisie en cours et la dernière performance connue (n-1
    // toujours, indépendant de la pagination historique), pour un retour
    // immédiat sur la progression.
    const diffVsHistorique = (exo, serieIdx, champ) => {
      const tentative = tentativesExo(exo)[0]
      const precedent = tentative && logTentativePourSerie(tentative, exo, serieIdx)
      if (!precedent) return null
      return ecartValeurs(getLogs(exo.id, serieIdx - 1)[champ], precedent[champ])
    }

    // Un seul champ tracé selon le type de séance : la dimension "charge" de
    // l'effort (poids en musculation, distance en natation/athlé, bonds en pliométrie).
    const champsGraphique = computed(() => [champCharge(seanceActive.value?.type_seance)])

    // Série chronologique d'un champ réalisé, une valeur par tentative (moyenne
    // des séries de cette tentative), du plus ancien au plus récent. Une
    // tentative = une (re)saisie de la séance, donc deux tentatives le même
    // jour donnent bien 2 points distincts.
    const moyennesParTentative = (logs, champ) => {
      const parTentative = {}
      logs.forEach(l => {
        const valeur = parseValeurSerie(l[champ])
        if (isNaN(valeur)) return
        const cle = cleTentative(l)
        if (!parTentative[cle]) parTentative[cle] = { date: l.date.split('T')[0], total: 0, n: 0 }
        parTentative[cle].total += valeur
        parTentative[cle].n += 1
      })
      return Object.values(parTentative)
        .map(t => ({ date: t.date, valeur: Math.round((t.total / t.n) * 100) / 100 }))
        .sort((a, b) => new Date(a.date) - new Date(b.date))
    }

    // Courbe de progression d'un exercice au fil des semaines de ce créneau.
    const courbeExo = (exo, champ) =>
      moyennesParTentative(logsCreneauPourExo(exo.nom), champ)

    // --- Onglets d'une séance : sa feuille de saisie, son historique, ses courbes ---
    const vueSeance = ref('seance')
    // Profondeur dans l'historique de la séance : 0 = la date la plus récente.
    const histoIndex = ref(0)

    const ouvrirVueSeance = (cle) => {
      vueSeance.value = cle
      if (cle === 'seance') return
      // L'historique est préchargé à l'ouverture de la séance mais peut avoir
      // vieilli (séance validée depuis) : on le rafraîchit.
      histoIndex.value = 0
      fetchHistorique()
    }

    // Les logs ne portent pas le type de séance (cf. LogSerieDetail côté API) :
    // on le retrouve via les séances du programme, déjà chargées.
    const typeParSeance = computed(() => {
      const map = {}
      seances.value.forEach(s => { map[s.id] = s.type_seance || 'musculation' })
      return map
    })

    // Position d'une série dans son exercice, pour numéroter (« S1 ») les logs
    // de l'historique et apparier une série avec la même série de la fois
    // précédente. Les identifiants ne suffisent pas : d'une semaine à l'autre,
    // un même créneau est une séance dupliquée, donc des séries d'ids différents.
    const indexSerieParId = computed(() => {
      const map = {}
      seances.value.forEach(s =>
        (s.exercices || []).forEach(exo =>
          (exo.series || []).forEach((serie, i) => { map[serie.id] = i })
        )
      )
      return map
    })
    const ordreSerie = (log) => indexSerieParId.value[log.serie.id] ?? log.serie.id

    // Toutes les séances enregistrées du programme, la plus récente en premier.
    // Une entrée = une tentative (une saisie validée) d'un créneau, avec ses
    // exercices et leurs séries dans l'ordre du programme. Le créneau est
    // identifié par le nom de la séance, pas son id : un programme
    // multi-semaines duplique la séance à chaque semaine, et c'est bien la même
    // séance du point de vue de l'athlète.
    const tentativesProgramme = computed(() => {
      const parTentative = {}
      historiqueSansSessionEnCours.value.forEach(l => {
        const creneau = creneauLog(l)
        const cle = `${creneau}||${cleTentative(l)}`
        if (!parTentative[cle]) {
          parTentative[cle] = {
            cle,
            creneau,
            type: typeParSeance.value[l.seance?.id] || 'musculation',
            date: l.date,
            parExo: {}
          }
        }
        const tentative = parTentative[cle]
        // date de la tentative = celle de sa première série saisie
        if (new Date(l.date) < new Date(tentative.date)) tentative.date = l.date
        if (!tentative.parExo[l.exercice.id]) {
          tentative.parExo[l.exercice.id] = {
            cle: l.exercice.id,
            nom: l.exo_nom,
            ordre: l.exercice.ordre ?? 0,
            series: []
          }
        }
        tentative.parExo[l.exercice.id].series.push(l)
      })
      return Object.values(parTentative)
        .map(t => ({
          cle: t.cle,
          creneau: t.creneau,
          type: t.type,
          date: t.date,
          exercices: Object.values(t.parExo)
            .sort((a, b) => a.ordre - b.ordre)
            .map(e => ({ ...e, series: [...e.series].sort((a, b) => ordreSerie(a) - ordreSerie(b)) }))
        }))
        .sort((a, b) => new Date(b.date) - new Date(a.date))
    })

    // Les tentatives de la séance ouverte uniquement : la roulette fait défiler
    // les dates de CETTE séance, pas les autres entraînements du programme.
    const tentativesSeance = computed(() => {
      const creneau = seanceActive.value?.nom
      if (!creneau) return []
      return tentativesProgramme.value.filter(t => t.creneau === creneau)
    })

    const tentativeAffichee = computed(() => tentativesSeance.value[histoIndex.value] || null)

    // Date d'une tentative dans la roulette, avec l'heure quand une autre
    // tentative tombe le même jour : sinon trois séances du 8 novembre
    // s'affichaient toutes « 08/11/26 », impossibles à distinguer.
    const heureDe = (d) => new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    const memeJourQuUneAutre = (t) =>
      tentativesSeance.value.some(x => x !== t && x.date.split('T')[0] === t.date.split('T')[0])
    const dateTentative = (t, court = false) => {
      const base = court ? formatDateCourt(t.date) : formatDateNumerique(t.date)
      return memeJourQuUneAutre(t) ? `${base} · ${heureDe(t.date)}` : base
    }
    // Fenêtre centrale de la roulette, étroite : jour/mois et heure, sans l'année.
    const dateCentrale = (t) => memeJourQuUneAutre(t)
      ? `${new Date(t.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })} ${heureDe(t.date)}`
      : formatDateNumerique(t.date)

    // Voisins immédiats dans la roulette de dates. La liste est triée du plus
    // récent au plus ancien : remonter dans le temps, c'est avancer d'un index.
    const tentativeAncienne = computed(() => tentativesSeance.value[histoIndex.value + 1] || null)
    const tentativeRecente = computed(() =>
      histoIndex.value > 0 ? tentativesSeance.value[histoIndex.value - 1] : null
    )

    // Sens du dernier déplacement : la date centrale glisse dans cette
    // direction (cf. transitions .roulette-*).
    const sensHisto = ref('ancien')
    const histoPlusAncienne = () => {
      if (!tentativeAncienne.value) return
      sensHisto.value = 'ancien'
      histoIndex.value += 1
    }
    const histoPlusRecente = () => {
      if (!tentativeRecente.value) return
      sensHisto.value = 'recent'
      histoIndex.value -= 1
    }

    // Swipe sur la roulette : vers la droite on remonte dans le temps, comme si
    // on faisait défiler la bande des dates de gauche à droite. Le geste ne
    // remonte pas aux onglets de la séance, qui ont le leur.
    const swipeRoulette = creerSwipeHorizontal(
      (sens) => { if (sens < 0) histoPlusAncienne(); else histoPlusRecente() },
      { stopper: true }
    )

    // Valeurs réalisées d'une série de l'historique, avec l'écart coloré par
    // rapport à la même série de la fois précédente — soit la date juste à
    // gauche dans la roulette (vert = mieux, rouge = moins bien).
    const valeursHistorique = (exoNom, serieIdx, log, type) => {
      const precedent = tentativeAncienne.value?.exercices
        .find(e => e.nom === exoNom)?.series[serieIdx]
      return champsRealises(type)
        .filter(c => log[c.champ])
        .map(c => ({
          champ: c.champ,
          valeur: log[c.champ],
          unite: estNombre(log[c.champ]) ? c.unite : '',
          diff: precedent?.fait ? ecartValeurs(log[c.champ], precedent[c.champ]) : null
        }))
    }

    // Une courbe par exercice de la séance ouverte, dans l'ordre du programme :
    // moyenne de la charge sur toutes ses séries, un point par séance réalisée.
    // Les points viennent de l'historique de ce créneau (même exercice dupliqué
    // d'une semaine à l'autre = une seule courbe continue), pas des autres
    // séances où l'exercice figure aussi.
    const courbesSeance = computed(() => {
      if (!seanceActive.value) return []
      const conf = champCharge(seanceActive.value.type_seance)
      const noms = [...new Set(
        [...(seanceActive.value.exercices || [])]
          .sort((a, b) => a.ordre - b.ordre)
          .map(e => e.nom)
      )]
      return noms
        .map(nom => ({
          nom,
          unite: conf.unite,
          points: moyennesParTentative(logsCreneauPourExo(nom), conf.champ)
        }))
        .filter(c => c.points.length >= 2)
    })

    // Valeurs prescrites d'une série en une ligne compacte, selon le type de séance
    const valeursSerie = (exo, idx) => {
      const s = exo.series[idx]
      if (!s) return ''
      const t = seanceActive.value?.type_seance || 'musculation'
      const parts = []
      if (t === 'musculation') {
        // « 8 » ou « 3+3 » sont des reps ; « 45 s » ou « 1 min » se lisent tels quels
        if (s.nb_reps) parts.push(/^[\d\s+,.-]+$/.test(s.nb_reps) ? `${s.nb_reps} reps` : s.nb_reps)
        if (s.poids_cible) parts.push(s.poids_cible)
        if (s.rm) parts.push(s.rm)
        if (s.tempo) parts.push(`tempo ${s.tempo}`)
      } else if (t === 'natation' || t === 'athletisme') {
        if (s.metres) parts.push(`${s.metres}m`)
        if (s.intensite) parts.push(s.intensite)
      } else if (t === 'pliometrie') {
        if (s.bonds) parts.push(`${s.bonds} bonds`)
        if (s.intensite) parts.push(s.intensite)
      }
      return parts.join(' · ')
    }

    // « 4 × 8 reps · 80kg » si toutes les séries sont identiques, sinon détail ligne par ligne
    const resumeExo = (exo) => {
      const n = exo.series.length
      if (n === 0) return { uniforme: true, texte: 'Aucune série' }
      const premiere = valeursSerie(exo, 0)
      const uniforme = exo.series.every((_, i) => valeursSerie(exo, i) === premiere)
      return uniforme ? { uniforme: true, texte: `${n} × ${premiere || '—'}` } : { uniforme: false }
    }

    // Renvoie le nombre de séries qui ne sont pas parties : le try enveloppait
    // toute la boucle, un échec sur l'exercice A sautait aussi le B. Et rien
    // ne « re-synchronise tout » plus tard — validerSeance est le seul appelant,
    // c'est donc ici que la saisie se perd si personne ne compte les échecs.
    const sauvegarderSerie = async (groupe, serieIdx) => {
      let echecs = 0
      for (const exo of exosDeLaSerie(groupe, serieIdx)) {
        echecs += await sauvegarderLog(exo, serieIdx)
      }
      return echecs
    }

    // Envoie l'état d'une série d'un exercice : 1 si elle n'est pas partie, 0 sinon.
    const sauvegarderLog = async (exo, serieIdx) => {
      const log = getLogs(exo.id, serieIdx)
      try {
        await api.post(`/series/${exo.series[serieIdx].id}/logs/`, {
          reps_realisees: log.reps_realisees || null,
          poids_realise: log.poids_realise || null,
          fait: log.fait,
          session_id: sessionSaisieId.value
        })
        return 0
      } catch (e) {
        console.error('Erreur sauvegarde série:', e)
        return 1
      }
    }

    // Valeur par défaut d'un champ réalisé quand l'athlète valide sans
    // rien saisir : la valeur prescrite par le prépa (celle affichée en
    // placeholder grisé dans le champ), selon le type de séance.
    const valeurParDefaut = (exo, serieIdx, champ) => {
      const s = exo.series[serieIdx]
      if (!s) return ''
      const t = seanceActive.value?.type_seance || 'musculation'
      if (champ === 'reps_realisees') {
        if (t === 'natation' || t === 'athletisme') return s.metres || ''
        if (t === 'pliometrie') return s.bonds || ''
        return s.nb_reps || ''
      }
      if (t === 'natation' || t === 'athletisme' || t === 'pliometrie') return s.intensite || ''
      return s.poids_cible || ''
    }

    // Marque une série faite ou non. Rien saisi au moment de la marquer
    // faite : on retient la valeur demandée par le prépa (le placeholder
    // grisé) plutôt qu'un champ vide.
    const marquerSerie = (exo, serieIdx, fait) => {
      const log = getLogs(exo.id, serieIdx)
      if (fait) {
        if (!log.reps_realisees) log.reps_realisees = valeurParDefaut(exo, serieIdx, 'reps_realisees')
        if (!log.poids_realise) log.poids_realise = valeurParDefaut(exo, serieIdx, 'poids_realise')
      }
      log.fait = fait
    }

    const supprimerLog = async (serieId, logId) => {
      try {
        await api.del(`/series/${serieId}/logs/${logId}`)
      } catch (e) {
        console.error('Erreur suppression log:', e)
      }
    }

    // --- Édition d'un résultat déjà dans l'historique (vue historique du
    // panneau de saisie, tentatives passées) : le verrouillage se pilote au
    // niveau de la série entière (tous les exercices du groupe), jamais par
    // exercice isolé — cf. toggleGroupeHistoriqueEdition plus bas. ---
    const historiqueEnEdition = ref(new Set())
    const estEnEdition = (log) => historiqueEnEdition.value.has(log.id)
    const ouvrirEditionHistorique = (log) => { historiqueEnEdition.value.add(log.id) }

    const validerEditionHistorique = async (entree, exo, serieIdx) => {
      const log = entree.log
      if (!log.reps_realisees) log.reps_realisees = valeurParDefaut(exo, serieIdx - 1, 'reps_realisees')
      if (!log.poids_realise) log.poids_realise = valeurParDefaut(exo, serieIdx - 1, 'poids_realise')
      log.fait = true
      try {
        await api.post(`/series/${log.serie.id}/logs/`, {
          reps_realisees: log.reps_realisees || null,
          poids_realise: log.poids_realise || null,
          fait: true,
          session_id: log.session_id
        })
      } catch (e) {
        console.error('Erreur modification historique:', e)
      }
      historiqueEnEdition.value.delete(log.id)
    }

    // Un seul bouton par série (cf. gabarit) pilote le verrouillage de tous
    // les exercices du groupe pour cette série, en saisie comme en historique.
    const isGroupeHistoriqueEnEdition = (groupe, serieIdx) => {
      return groupe.exercices.some(exo => {
        const entree = historiqueSeriePourExo(exo, serieIdx)
        return entree && estEnEdition(entree.log)
      })
    }

    const historiqueGroupeFait = (groupe, serieIdx) => {
      return groupe.exercices.every(exo => {
        const entree = historiqueSeriePourExo(exo, serieIdx)
        return entree ? entree.log.fait : true
      })
    }

    const historiqueGroupeExiste = (groupe, serieIdx) => {
      return groupe.exercices.some(exo => historiqueSeriePourExo(exo, serieIdx))
    }

    const toggleGroupeHistoriqueEdition = async (groupe, serieIdx) => {
      const enEdition = isGroupeHistoriqueEnEdition(groupe, serieIdx)
      for (const exo of groupe.exercices) {
        const entree = historiqueSeriePourExo(exo, serieIdx)
        if (!entree) continue
        if (enEdition) await validerEditionHistorique(entree, exo, serieIdx)
        else ouvrirEditionHistorique(entree.log)
      }
      if (enEdition) {
        await chargerLogsExistants(programmeActif.value.id)
        await fetchHistorique()
      }
    }

    // État affiché du bouton unique de la série : verrouillé/déverrouillé,
    // selon qu'on consulte la saisie du jour ou une tentative passée.
    const etatBoutonSerie = (groupe, serieIdx) => {
      if (saisieVue.value === 'historique') {
        if (isGroupeHistoriqueEnEdition(groupe, serieIdx)) {
          return { classe: 'btn-todo', icone: 'ti-check', label: 'Valider' }
        }
        return historiqueGroupeFait(groupe, serieIdx)
          ? { classe: 'btn-done', icone: 'ti-check', label: 'Fait' }
          : { classe: 'btn-todo', icone: 'ti-pencil', label: 'Non fait' }
      }
      return isGroupeDone(groupe, serieIdx - 1)
        ? { classe: 'btn-done', icone: 'ti-check', label: 'Fait' }
        : { classe: 'btn-todo', icone: 'ti-check', label: 'Valider la série' }
    }

    const toggleSerie = (groupe, serieIdx, evt) => {
      if (saisieVue.value === 'historique') { toggleGroupeHistoriqueEdition(groupe, serieIdx); return }
      const etaitFaite = isGroupeDone(groupe, serieIdx - 1)
      // L'état « fait » change avant le premier await de toggleGroupeDone :
      // il se relit juste après l'appel.
      toggleGroupeDone(groupe, serieIdx - 1)
      const bouton = evt?.currentTarget
      if (bouton && !etaitFaite && isGroupeDone(groupe, serieIdx - 1)) nextTick(() => feterSerie(bouton))
    }

    // Seule suppression possible dans l'historique : la séance entière (tous
    // ses exercices/groupes, pas seulement celui ouvert dans le panneau),
    // pour la tentative actuellement consultée.
    const supprimerSeanceHistorique = async () => {
      const cle = cleTentativeGroupe.value
      if (!cle || !seanceActive.value) return
      if (!confirm('Supprimer cette séance de l\'historique ?')) return

      // Tous les logs de cette tentative sur ce créneau. Pas seulement ceux
      // des séries de la séance ouverte : une tentative d'une semaine
      // précédente (programme multi-semaines) porte sur des séries dupliquées,
      // d'ids différents — rien n'était supprimé, sans un mot.
      const logsASupprimer = historique.value.filter(
        l => creneauLog(l) === seanceActive.value.nom && cleTentative(l) === cle
      )
      for (const log of logsASupprimer) {
        await supprimerLog(log.serie.id, log.id)
        historiqueEnEdition.value.delete(log.id)
      }
      const seancesDeLaTentative = new Set(logsASupprimer.map(l => l.seance?.id).filter(Boolean))
      if (seancesDeLaTentative.size === 0) seancesDeLaTentative.add(seanceActive.value.id)

      // La ligne de charge de la tentative ne suit pas les logs : sans ça la
      // séance restait comptée dans « Mes stats » et l'ACWR, et son
      // questionnaire de ressenti continuait d'être proposé — un fantôme
      // sans séance derrière. Sans effet si la tentative est antérieure au
      // monitoring (pas de ligne de charge).
      for (const seanceId of seancesDeLaTentative) {
        try {
          await api.del(`/seances/${seanceId}/charge?session_id=${encodeURIComponent(cle)}`)
        } catch (e) {
          console.error('Erreur suppression charge séance:', e)
        }
      }

      // La bannière proposait peut-être le ressenti de cette tentative-là.
      if (popupRessenti.value === cle) popupRessenti.value = null

      // La saisie du jour en mémoire peut correspondre à la tentative
      // supprimée (même session_id) : on la vide pour rester cohérent.
      if (cle === sessionSaisieId.value) {
        seanceActive.value.exercices.forEach(exo => { logs.value[exo.id] = {} })
      }

      await chargerLogsExistants(programmeActif.value.id)
      await fetchHistorique()

      if (nbTentativesGroupe.value === 0) retourSaisie()
      else if (historiqueIndex.value >= nbTentativesGroupe.value) {
        historiqueIndex.value = Math.max(0, nbTentativesGroupe.value - 1)
      }
    }

    const seancesCompletees = ref(new Set())

    const chargerLogsExistants = async (programmeId) => {
      try {
        const logs = await api.get(`/logs/programme/${programmeId}/moi`)
        const completees = new Set()

        // Détermine quelles séances sont validées dans l'historique. Une
        // séance l'est si UNE MÊME tentative (session_id, ou jour à défaut) a
        // une entrée pour toutes ses séries — qu'elles soient faites ou non :
        // "Valider la séance" enregistre explicitement l'état réel de chaque
        // série (fait ou non fait), donc la séance devient validée dès que ce
        // bouton est pressé, sans forcer les séries non faites à "fait".
        // Agréger le dernier état connu de chaque série indépendamment
        // (ancien code) mélangeait des séries faites lors de tentatives
        // différentes et jamais terminées ensemble, ce qui marquait à tort la
        // séance comme validée (ex. après un changement de programme ou une
        // fermeture de l'appli en cours de saisie) : on raisonne maintenant
        // par tentative.
        if (seances.value.length > 0) {
          const logsParTentative = {}
          logs.forEach(log => {
            const cle = log.session_id || log.date.split('T')[0]
            if (!logsParTentative[cle]) logsParTentative[cle] = []
            logsParTentative[cle].push(log)
          })

          seances.value.forEach(seance => {
            const idsSeries = new Set((seance.exercices?.flatMap(e => e.series) || []).map(s => s.id))
            if (idsSeries.size === 0) return
            const complete = Object.values(logsParTentative).some(tentative => {
              const couvertesDansTentative = new Set(
                tentative.filter(l => idsSeries.has(l.serie.id)).map(l => l.serie.id)
              )
              return couvertesDansTentative.size === idsSeries.size
            })
            if (complete) completees.add(seance.id)
          })
        }

        seancesCompletees.value = completees
      } catch (e) {
        console.error('Erreur chargement logs:', e)
      }
    }

    const jourOrdre = { lundi: 1, mardi: 2, mercredi: 3, jeudi: 4, vendredi: 5, samedi: 6, dimanche: 7 }

    // Un programme multi-semaines duplique un même créneau (nom + jour +
    // ordre identiques, cf. POST /seances/dupliquer-semaine côté prépa) une
    // fois par semaine, avec une progression différente à chaque fois.
    // L'athlète ne choisit jamais la semaine : pour chaque créneau, on ne
    // montre que sa version courante — la première semaine pas encore
    // validée, ou la dernière si tout est fait (la séance boucle alors sur
    // cette dernière semaine indéfiniment, comme une programmation sans
    // progression).
    // --- Programme de l'Atelier : une semaine à la fois, au rythme de
    // l'athlète. La semaine en cours est la première ni faite (séances
    // validées et tests notés) ni passée. Les programmes classiques gardent
    // l'affichage par créneau ci-dessous.
    const suiviSemaines = ref(null)
    const envoiSuivi = ref(false)
    const chargerSuiviSemaines = async (p) => {
      suiviSemaines.value = null
      if (!p?.par_semaines) return
      try {
        suiviSemaines.value = await api.get(`/programmes/${p.id}/suivi-semaines`)
      } catch (e) {
        // sans suivi, les séances restent affichées semaine 1 par semaine 1
        console.error('Erreur chargement suivi des semaines:', e)
        suiviSemaines.value = { semaines_passees: [], tests: [] }
      }
    }
    const semainesProgramme = computed(() => {
      if (!programmeActif.value?.par_semaines || !suiviSemaines.value) return null
      const { semaines_passees: passees, tests } = suiviSemaines.value
      const numeros = [...new Set([...seances.value.map(s => s.semaine || 1), ...tests.map(t => t.semaine)])].sort((a, b) => a - b)
      return numeros.map(numero => {
        const testsSemaine = tests.filter(t => t.semaine === numero)
        return {
          numero,
          faite: seances.value.filter(s => (s.semaine || 1) === numero).every(s => seancesCompletees.value.has(s.id))
            && testsSemaine.every(t => t.resultat),
          passee: passees.includes(numero),
          test: testsSemaine.length > 0
        }
      })
    })
    const semaineCourante = computed(() =>
      semainesProgramme.value?.find(s => !s.faite && !s.passee)?.numero ?? null
    )
    // Programme fini : ses séances de la dernière semaine restent ouvertes.
    const semaineAffichee = computed(() => {
      const semaines = semainesProgramme.value
      if (!semaines?.length) return 1
      return semaineCourante.value ?? semaines[semaines.length - 1].numero
    })
    const testsSemaine = computed(() =>
      semaineCourante.value === null ? [] : (suiviSemaines.value?.tests || []).filter(t => t.semaine === semaineCourante.value)
    )
    // Semaine bouclée en validant sa dernière séance (ou son dernier test) :
    // on le dit, la suivante s'affiche d'elle-même.
    watch(semaineCourante, (nouvelle, ancienne) => {
      if (ancienne === null || ancienne === undefined || envoiSuivi.value) return
      if (nouvelle !== null && nouvelle <= ancienne) return
      const faite = semainesProgramme.value?.find(s => s.numero === ancienne)?.faite
      if (!faite) return
      afficherToast(nouvelle === null
        ? '🏆 Programme terminé : bravo !'
        : `💪 Semaine ${ancienne} terminée : place à la semaine ${nouvelle}`, 'succes', 7000)
    })
    const passerSemaine = async (semaine) => {
      const p = programmeActif.value
      if (!p || envoiSuivi.value) return
      envoiSuivi.value = true
      try {
        suiviSemaines.value = await api.post(`/programmes/${p.id}/semaines/${semaine}/passer`)
      } catch (e) {
        afficherToast(e.message || 'Impossible de passer la semaine', 'erreur')
      } finally {
        envoiSuivi.value = false
      }
    }
    const noterTest = async (id, valeur, apres) => {
      const p = programmeActif.value
      if (!p || envoiSuivi.value) return
      envoiSuivi.value = true
      try {
        suiviSemaines.value = await api.put(`/programmes/${p.id}/tests/${id}/resultat`, { valeur })
        apres?.()
        afficherToast('Résultat noté : ton prépa le voit', 'succes')
      } catch (e) {
        afficherToast(e.message || "Impossible d'enregistrer ce résultat", 'erreur')
      } finally {
        envoiSuivi.value = false
      }
    }

    const seancesAffichees = computed(() => {
      if (programmeActif.value?.par_semaines) {
        return seances.value
          .filter(s => (s.semaine || 1) === semaineAffichee.value)
          .sort((a, b) => a.ordre - b.ordre)
      }
      const creneaux = {}
      seances.value.forEach(s => {
        const cle = `${s.nom}||${s.jour}||${s.ordre}`
        if (!creneaux[cle]) creneaux[cle] = []
        creneaux[cle].push(s)
      })
      return Object.values(creneaux)
        .map(versions => {
          const triees = [...versions].sort((a, b) => (a.semaine || 1) - (b.semaine || 1))
          return triees.find(s => !seancesCompletees.value.has(s.id)) || triees[triees.length - 1]
        })
        .sort((a, b) => {
          const jourA = jourOrdre[a.jour] || 8
          const jourB = jourOrdre[b.jour] || 8
          if (jourA !== jourB) return jourA - jourB
          return a.ordre - b.ordre
        })
    })

    // --- Semaine type de l'athlète ---
    // Il compose lui-même chaque jour avec les séances de son programme (une
    // même séance peut revenir plusieurs jours). Tant qu'aucune n'est placée,
    // l'écran garde la liste de séances classique.
    const planning = ref([])
    const modalPlanning = ref(false)
    const erreurPlanning = ref('')

    // Une carte par créneau : deux séances de même nom sont un seul créneau
    // pour l'historique (cf. tentativesProgramme) comme pour la semaine type.
    const creneaux = computed(() => {
      const vus = new Set()
      return seancesAffichees.value.filter(s => {
        if (vus.has(s.nom)) return false
        vus.add(s.nom)
        return true
      })
    })

    // Une semaine type dont plus aucune séance n'existe (programme remanié par
    // le prépa) ne doit pas afficher un calendrier vide : on retombe alors sur
    // la liste, qui propose d'en recréer une.
    const planningActif = computed(() =>
      planning.value.some(e => creneaux.value.some(s => s.nom === e.creneau))
    )

    // Séances validées, indexées par créneau ET par semaine, de la plus
    // ancienne à la plus récente : le calendrier les répartit sur les jours où
    // la séance est prévue cette semaine-là, même faites un autre jour
    // (rattachement hebdomadaire).
    const seancesFaites = computed(() => {
      const map = {}
      tentativesProgramme.value.forEach(t => {
        const cle = cleOccurrence(t.creneau, new Date(t.date))
        if (!map[cle]) map[cle] = []
        map[cle].push(t.date)
      })
      Object.values(map).forEach(dates => dates.sort((a, b) => new Date(a) - new Date(b)))
      return map
    })

    const chargerPlanning = async () => {
      planning.value = []
      if (!programmeActif.value) return
      try {
        planning.value = await api.get(`/planning/programme/${programmeActif.value.id}/moi`)
      } catch (e) {
        console.error('Erreur chargement semaine type:', e)
      }
    }

    const fermerModalPlanning = () => {
      modalPlanning.value = false
      erreurPlanning.value = ''
    }

    const enregistrerPlanning = async (entrees) => {
      erreurPlanning.value = ''
      try {
        planning.value = await api.put(`/planning/programme/${programmeActif.value.id}/moi`, { entrees })
        fermerModalPlanning()
      } catch (e) {
        erreurPlanning.value = e.message || "Erreur lors de l'enregistrement"
      }
    }

    const supprimerPlanning = async () => {
      if (!confirm('Supprimer ma semaine d\'entraînement ? Les séances reviendront en simple liste.')) return
      erreurPlanning.value = ''
      try {
        await api.del(`/planning/programme/${programmeActif.value.id}/moi`)
        planning.value = []
        fermerModalPlanning()
      } catch (e) {
        erreurPlanning.value = e.message || 'Erreur lors de la suppression'
      }
    }

    // Depuis le calendrier : une séance déjà faite s'ouvre sur ses données
    // enregistrées, positionnées sur la date de cette occurrence-là (on vient
    // les consulter) ; les autres sur la feuille de saisie.
    const ouvrirDepuisPlanning = async ({ seance, dateFait }) => {
      if (!(await demarrerSeance(seance))) return
      if (!dateFait) return
      vueSeance.value = 'historique'
      const jour = dateFait.split('T')[0]
      const index = tentativesSeance.value.findIndex(t => t.date.split('T')[0] === jour)
      if (index >= 0) histoIndex.value = index
    }

    // Depuis la grille de régularité de l'accueil : basculer sur l'onglet
    // Séances et ouvrir les résultats de la séance faite ce jour-là. La séance
    // peut appartenir à un autre programme que celui affiché (l'accueil couvre
    // tous les programmes de l'athlète) : on l'active d'abord.
    const ouvrirDepuisRegularite = async ({ seanceId, programmeId, date }) => {
      const programme = programmes.value.find(p => p.id === programmeId)
      if (!programme) return
      if (programmeActif.value?.id !== programme.id) await selectProgramme(programme)
      const seance = seances.value.find(s => s.id === seanceId)
      // programme désassigné ou séance retirée depuis : on reste sur l'accueil
      // plutôt que d'ouvrir un onglet Séances qui ne montrerait pas la séance
      if (!seance) return
      onglet.value = 'programme'
      await ouvrirDepuisPlanning({ seance, dateFait: date })
    }

    // --- Programme épinglé (local, jamais envoyé au serveur) ---
    // Simple préférence d'affichage propre à cet appareil : quel programme
    // s'ouvre au lancement, et lequel ouvre la liste. Rien à synchroniser.
    const lireEpingleProgramme = () => {
      try {
        const brut = JSON.parse(localStorage.getItem(CLE_EPINGLE) || 'null')
        // téléphone partagé : l'épingle d'un autre compte n'est pas la sienne
        if (!brut || brut.userId !== (authStore.user?.id ?? null)) return null
        return brut.programmeId ?? null
      } catch {
        return null
      }
    }

    const programmeEpingleId = ref(lireEpingleProgramme())
    const estEpingle = computed(() =>
      !!programmeActif.value && programmeEpingleId.value === programmeActif.value.id
    )

    // L'épinglé passe en tête de la bande, le reste garde l'ordre de l'API.
    const programmesAffiches = computed(() => {
      const id = programmeEpingleId.value
      if (!id) return programmes.value
      const rang = (p) => (p.id === id ? 0 : 1)
      return [...programmes.value].sort((a, b) => rang(a) - rang(b))
    })

    const basculerEpingleProgramme = () => {
      if (!programmeActif.value) return
      programmeEpingleId.value = estEpingle.value ? null : programmeActif.value.id
      try {
        localStorage.setItem(CLE_EPINGLE, JSON.stringify({
          userId: authStore.user?.id ?? null,
          programmeId: programmeEpingleId.value
        }))
      } catch (e) {
        // stockage refusé (navigation privée) : l'épingle ne tiendra que la session
        console.error('Erreur sauvegarde épingle:', e)
      }
    }

    const fetchProgrammes = async () => {
      try {
        programmes.value = await api.get('/programmes/')
      } catch (e) {
        console.error('Erreur chargement programmes:', e)
        return
      }
      // Le programme épinglé s'ouvre en premier ; à défaut, le premier de la
      // liste (l'épingle peut viser un programme désassigné entre-temps).
      if (programmes.value.length > 0) {
        await selectProgramme(
          programmes.value.find(p => p.id === programmeEpingleId.value) || programmes.value[0]
        )
      }
      // une fois les séances chargées : la reprise a besoin de les retrouver
      proposerReprise()
    }

    const selectProgramme = async (p) => {
      // Le suivi d'un autre programme ne doit pas se mêler à ses séances
      suiviSemaines.value = null
      programmeActif.value = p
      seanceActive.value = null
      loadingSeances.value = true
      try {
        seances.value = await api.get(`/programmes/${p.id}/seances/`)
      } catch (e) {
        // Sans ce filet, une coupure réseau laissait « Chargement... » à
        // l'écran indéfiniment, l'athlète n'ayant aucun moyen de réessayer.
        console.error('Erreur chargement séances:', e)
        seances.value = []
        return
      } finally {
        loadingSeances.value = false
      }

      // Charge les logs existants après les séances
      await chargerLogsExistants(p.id)
      // Programme de l'Atelier : semaines passées et tests notés
      await chargerSuiviSemaines(p)
      // Semaine type : propre à chaque programme, rechargée à chaque bascule
      await chargerPlanning()
      // Précharge l'historique complet : nécessaire dès l'écran de saisie
      // pour la comparaison au swipe, pas seulement l'onglet Historique
      fetchHistorique()
    }

    // Reprise proposée au lancement : la séance est rouverte telle qu'elle
    // était, avec le même identifiant de tentative — l'historique verra donc
    // une seule séance, pas deux moitiés.
    const reprendreBrouillon = async () => {
      const brouillon = brouillonPropose.value
      brouillonPropose.value = null
      if (!brouillon) return

      if (programmeActif.value?.id !== brouillon.programmeId) {
        const programme = programmes.value.find(p => p.id === brouillon.programmeId)
        if (!programme) { effacerBrouillon(); return }
        await selectProgramme(programme)
      }

      // séance supprimée ou remaniée par le prépa entre-temps : rien à reprendre
      const seance = seances.value.find(s => s.id === brouillon.seanceId)
      if (!seance) { effacerBrouillon(); return }

      // posé avant demarrerSeance, qui repartirait d'une saisie vierge s'il
      // voyait une séance différente de celle en cours
      seanceEnCoursId.value = seance.id
      sessionSaisieId.value = brouillon.sessionSaisieId
      debutSaisie.value = brouillon.horodatage
      logs.value = brouillon.logs || {}
      onglet.value = 'programme'
      demarrerSeance(seance)
    }

    const abandonnerBrouillon = () => {
      brouillonPropose.value = null
      effacerBrouillon()
      logs.value = {}
      seanceEnCoursId.value = null
      sessionSaisieId.value = null
      debutSaisie.value = null
    }

    // « Push Lundi · commencée hier à 18:32 »
    const sousTitreBrouillon = computed(() => {
      const brouillon = brouillonPropose.value
      if (!brouillon) return ''
      const debut = new Date(brouillon.horodatage)
      const hier = new Date()
      hier.setDate(hier.getDate() - 1)
      let jour = formatDateCourt(debut)
      if (debut.toDateString() === new Date().toDateString()) jour = "aujourd'hui"
      else if (debut.toDateString() === hier.toDateString()) jour = 'hier'
      const heure = debut.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
      return `${brouillon.seanceNom} · commencée ${jour} à ${heure}`
    })

    const proposerReprise = () => {
      const brouillon = lireBrouillon()
      if (brouillon) brouillonPropose.value = brouillon
    }

    // Valeurs tapées mais pas encore validées (une série validée, elle, est
    // déjà enregistrée sur le serveur).
    const saisieNonEnregistree = () =>
      Object.values(logs.value || {}).some(series =>
        Object.values(series || {}).some(l => !l.fait && (l.reps_realisees || l.poids_realise))
      )

    // Renvoie false si l'athlète préfère garder sa saisie en cours.
    const demarrerSeance = async (seance) => {
      // Ouvrir une autre séance repart d'une saisie vierge : ce qui avait été
      // tapé sur la précédente sans être validé disparaissait sans prévenir.
      if (seanceEnCoursId.value && seanceEnCoursId.value !== seance.id && saisieNonEnregistree()) {
        const enCours = seances.value.find(s => s.id === seanceEnCoursId.value)
        const nom = enCours ? `« ${enCours.nom} »` : 'la séance précédente'
        if (!confirm(`Des valeurs saisies sur ${nom} n'ont pas été validées. Les abandonner pour ouvrir « ${seance.nom} » ? (Les séries validées restent enregistrées.)`)) return false
        effacerBrouillon()
      }
      seanceActive.value = seance
      vueSeance.value = 'seance'
      histoIndex.value = 0
      erreurValidation.value = ''

      // Ressaisie de la séance déjà en cours (retour à la liste puis
      // réouverture sans avoir validé) : on reprend logs.value tel quel,
      // rien n'a encore été poussé au backend. Sinon (nouvelle séance, ou
      // même séance rejouée après une validation précédente), saisie vierge
      // avec un nouvel identifiant de tentative — la dernière performance
      // validée reste consultable via le swipe, pas pré-remplie ici.
      if (seanceEnCoursId.value !== seance.id) {
        sessionSaisieId.value = nouvelIdSession()
        logs.value = {}
        seanceEnCoursId.value = seance.id
        debutSaisie.value = null
      }

      // Recharge l'historique à chaque (re)démarrage : sinon il reste figé
      // sur l'état du chargement de la page et n'inclut pas les performances
      // validées lors d'une saisie précédente pendant la même session.
      // Attendu : l'ouverture depuis le calendrier a besoin des tentatives
      // rechargées pour se positionner sur la bonne date.
      await fetchHistorique()
      return true
    }

    const validerSeance = async () => {
      // Valider la séance pousse l'état RÉEL de chaque série dans
      // l'historique — les séries déjà validées une par une gardent leurs
      // valeurs réelles (défauts déjà appliqués par toggleGroupeDone), les
      // séries jamais validées sont enregistrées explicitement "non fait"
      // (aucun remplissage automatique) : le bouton fige ce qui a été fait,
      // il ne complète pas ce qui ne l'a pas été.
      const groupes = grouperExercices(seanceActive.value.exercices)
      // Les confettis partiront du bouton touché (pris maintenant : la feuille
      // et sa barre de validation se referment avant la fête)
      const origineFete = origineDe(document.querySelector('.btn-valider'))
      // Une séance sans aucune série faite n'est pas une séance faite : elle
      // était pourtant comptée (XP, régularité, semaine suivante débloquée),
      // au premier appui distrait sur le bouton.
      const uneSerieFaite = groupes.some(groupe =>
        Array.from({ length: nbSeriesGroupe(groupe) }, (_, i) => i)
          .some(i => exosDeLaSerie(groupe, i).some(exo => getLogs(exo.id, i).fait))
      )
      if (!uneSerieFaite) {
        erreurValidation.value = 'Coche au moins un exercice fait avant de valider la séance.'
        return
      }
      let echecs = 0
      for (const groupe of groupes) {
        const nbSeries = nbSeriesGroupe(groupe)
        for (let i = 0; i < nbSeries; i++) {
          echecs += await sauvegarderSerie(groupe, i)
        }
      }

      // Tant que tout n'est pas parti, on ne détruit rien : le brouillon est
      // la seule copie restante de la saisie (salle en sous-sol, 4G qui
      // saute). Sans ça la séance était marquée faite et le brouillon effacé
      // juste après, sans un mot à l'athlète.
      if (echecs) {
        erreurValidation.value = `${echecs} série(s) n'ont pas pu être enregistrées. Vérifiez votre connexion et revalidez : votre saisie est conservée.`
        return
      }
      erreurValidation.value = ''

      // Trace la complétion tout de suite (méthode de Foster, monitoring) —
      // sans rpe/durée : la séance se valide quand même, le ressenti reste
      // saisissable après coup (cf. MesStats.vue), jamais bloquant ici.
      let chargeEnregistree = true
      let records = []
      try {
        const reponse = await api.post(`/seances/${seanceActive.value.id}/charge`, { session_id: sessionSaisieId.value })
        records = reponse?.records || []
      } catch (e) {
        chargeEnregistree = false
        console.error('Erreur enregistrement complétion séance:', e)
      }

      seancesCompletees.value.add(seanceActive.value.id)
      seanceEnCoursId.value = null
      logs.value = {}
      // la saisie est partie au serveur : le brouillon n'a plus lieu d'être
      effacerBrouillon()
      debutSaisie.value = null
      seanceActive.value = null
      // Séance faite : confettis et XP gagnée
      progression.feter(origineFete)
      progression.actualiser('Séance validée')
      // Objectif(s) du prépa atteint(s) et record(s) battu(s) pendant la
      // séance (calculés par l'API), dans un même message.
      const objectifsAvant = objectifs.value
      await chargerObjectifs()
      const atteints = Object.values(objectifs.value).filter(o => o.atteint_le && !objectifsAvant[o.exercice_cle]?.atteint_le)
      const annonces = []
      if (atteints.length) {
        annonces.push(`🎯 ${atteints.length > 1 ? 'Objectifs atteints' : 'Objectif atteint'} : ${atteints.map(o => `${o.exercice_nom} ${texteObjectif(o)}`).join(' · ')}`)
      }
      if (records.length) {
        const liste = records.map(r => `${r.exercice} ${texteRecord(r)}`).join(' · ')
        annonces.push(`🏆 ${records.length > 1 ? 'Nouveaux records' : 'Nouveau record'} : ${liste}`)
      }
      if (annonces.length) afficherToast(annonces.join(' — '), 'succes', 9000)
      // Le calendrier de la semaine type colore les séances faites à partir de
      // l'historique : sans ce rafraîchissement, celle qu'on vient de valider
      // y resterait « à faire » jusqu'au prochain chargement de l'écran.
      await fetchHistorique()
      // Sans ligne de charge il n'y a rien à compléter côté serveur :
      // proposer le questionnaire mènerait à un accueil vide.
      if (chargeEnregistree) popupRessenti.value = sessionSaisieId.value
      // seancesAffichees recalcule alors automatiquement : ce créneau montrera
      // la semaine suivante programmée par le prépa (ou reboucle sur la
      // dernière si la programmation s'arrête là).
    }

    // --- Progression ludique (XP, niveau) et récap de la semaine ---
    const progression = useProgressionStore()
    const recapPropose = ref(false)
    const recapOuvert = ref(false)
    const lundiCourantIso = () => {
      const d = new Date()
      d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    }
    // Proposé à partir du lundi, jusqu'à ce qu'il soit vu ou écarté : un
    // athlète qui n'ouvre l'appli que le mardi l'a quand même. Pas à un
    // athlète qui n'a encore rien fait (récap vide).
    const verifierRecap = () => {
      try {
        recapPropose.value = (progression.progression?.xp_total || 0) > 0 && localStorage.getItem(CLE_RECAP_VU) !== lundiCourantIso()
      } catch {
        recapPropose.value = false
      }
    }
    const marquerRecapVu = () => {
      recapPropose.value = false
      try {
        localStorage.setItem(CLE_RECAP_VU, lundiCourantIso())
      } catch {
        // stockage indisponible : la bannière reviendra au prochain lancement
      }
    }
    const ouvrirRecap = () => {
      marquerRecapVu()
      recapOuvert.value = true
    }
    onMounted(async () => {
      await progression.charger()
      verifierRecap()
    })

    // --- Réactions du prépa : notification dans l'appli ---
    // Vérifiées à l'ouverture, puis à chaque retour dans l'appli (PWA restée
    // ouverte en arrière-plan), au plus une fois par minute.
    const reactionsNouvelles = ref([])
    let derniereVerifReactions = 0
    const chargerReactions = async () => {
      derniereVerifReactions = Date.now()
      try {
        reactionsNouvelles.value = await api.get('/logs/reactions/nouvelles')
      } catch {
        // API pas encore à jour ou hors ligne : pas de bannière, rien à signaler
      }
      chargerMots()
    }

    // --- Mot du prépa sur une séance : même rythme que les réactions ---
    const motsNouveaux = ref([])
    const chargerMots = async () => {
      try {
        motsNouveaux.value = await api.get('/mes-stats/mots/nouveaux')
      } catch {
        // API pas encore à jour ou hors ligne : pas de bannière
      }
    }
    const banniereMot = computed(() => {
      const liste = motsNouveaux.value
      if (!liste.length) return null
      const dernier = liste[0]
      const autres = liste.length > 1 ? ` (+${liste.length - 1})` : ''
      return {
        titre: `Ton prépa t'a laissé un mot${autres}`,
        sousTitre: `« ${dernier.texte} » — ${dernier.seance_nom}, ${formatJourRelatif(dernier.date)}`,
        peutOuvrir: !!dernier.seance_id && !!dernier.programme_id
      }
    })
    // Seuls les mots montrés passent en vus (cf. POST /mes-stats/mots/vus)
    const marquerMotsVus = async () => {
      const ids = motsNouveaux.value.map(m => m.id)
      motsNouveaux.value = []
      if (!ids.length) return
      try {
        await api.post('/mes-stats/mots/vus', { ids })
      } catch (e) {
        console.error('Erreur mots vus:', e)
      }
    }
    const voirMot = async () => {
      const dernier = motsNouveaux.value[0]
      await marquerMotsVus()
      if (dernier) await ouvrirDepuisRegularite({ seanceId: dernier.seance_id, programmeId: dernier.programme_id, date: dernier.date })
    }
    const surRetourDansLAppli = () => {
      if (document.visibilityState === 'visible' && Date.now() - derniereVerifReactions > 60000) chargerReactions()
    }
    onMounted(() => {
      chargerReactions()
      document.addEventListener('visibilitychange', surRetourDansLAppli)
    })
    onBeforeUnmount(() => document.removeEventListener('visibilitychange', surRetourDansLAppli))

    const banniereReaction = computed(() => {
      const liste = reactionsNouvelles.value
      if (!liste.length) return null
      const derniere = liste[0]
      const ou = `${derniere.exercice} · ${derniere.seance}`
      if (liste.length === 1) {
        return { titre: `Ton prépa a réagi ${derniere.reaction} à ta série`, sousTitre: `${ou}, ${formatJourRelatif(derniere.date)}`, emoji: derniere.reaction }
      }
      const emojis = [...new Set(liste.map(r => r.reaction))].slice(0, 3).join(' ')
      return { titre: `Ton prépa a réagi à ${liste.length} de tes séries ${emojis}`, sousTitre: `Dernière : ${ou}`, emoji: derniere.reaction }
    })
    // L'emoji surgit quand la bannière apparaît vraiment : les bannières
    // passent une à une (reprise de séance et ressenti d'abord).
    const arriveeReaction = ref(null)
    const reactionVisible = computed(() => !brouillonPropose.value && !popupRessenti.value && !!banniereReaction.value)
    watch(reactionVisible, (visible) => {
      if (!visible) return
      const emojis = [...new Set(reactionsNouvelles.value.map(r => r.reaction))].slice(0, 3)
      nextTick(() => { arriveeReaction.value = { id: Date.now(), emojis } })
    })
    // Seules les réactions montrées passent en vues (cf. POST /logs/reactions/vues)
    const marquerReactionsVues = async () => {
      const ids = reactionsNouvelles.value.map(r => r.id)
      reactionsNouvelles.value = []
      if (!ids.length) return
      try {
        await api.post('/logs/reactions/vues', { ids })
      } catch (e) {
        console.error('Erreur réactions vues:', e)
      }
    }
    // Ouvre la séance de la réaction la plus récente, sur la date de la série
    const voirReaction = async () => {
      const derniere = reactionsNouvelles.value[0]
      await marquerReactionsVues()
      if (derniere) {
        await ouvrirDepuisRegularite({ seanceId: derniere.seance_id, programmeId: derniere.programme_id, date: derniere.date })
      }
    }

    // --- Case d'un exercice dans la feuille de séance ---
    // Pas d'état à elle : elle lit et écrit les séries de l'exercice, comme
    // le panneau de saisie. Les deux restent donc d'accord, et le brouillon
    // retient les coches sans rien de plus. Tout part décoché : une séance
    // pré-cochée s'enregistrait entière au premier appui distrait sur
    // « Valider la séance ».
    // Lecture seule (pas getLogs) : l'affichage ne doit rien créer.
    const etatExo = (exo) => {
      const total = exo.series.length
      const faites = exo.series.filter((_, i) => logs.value[exo.id]?.[i]?.fait).length
      return { total, faites, complet: total > 0 && faites === total }
    }

    // Vide ou en partie saisi → tout fait (aux valeurs prévues pour les
    // séries pas encore validées, les valeurs déjà tapées sont gardées) ;
    // complet → tout « non fait ». Envoyé tout de suite, comme une série
    // validée dans le panneau. Un second tap pendant l'envoi est ignoré
    // (cf. seriesEnEnvoi).
    const exosEnEnvoi = new Set()
    const basculerExo = async (exo, evt) => {
      if (exo.series.length === 0 || exosEnEnvoi.has(exo.id)) return
      exosEnEnvoi.add(exo.id)
      const caseExo = evt?.currentTarget
      try {
        const fait = !etatExo(exo).complet
        exo.series.forEach((_, i) => marquerSerie(exo, i, fait))
        // Exercice tout juste coché : la coche se trace, la case rebondit
        if (fait && caseExo) nextTick(() => feterSerie(caseExo))
        await Promise.all(exo.series.map((_, i) => sauvegarderLog(exo, i)))
      } finally {
        exosEnEnvoi.delete(exo.id)
      }
    }

    const fetchHistorique = async () => {
      historique.value = []
      if (!programmeActif.value) return
      // Un seul appel : l'endpoint renvoie les logs enrichis (série, exercice,
      // séance) — l'ancien code faisait une requête PAR série du programme
      const logs = await api.get(`/logs/programme/${programmeActif.value.id}/moi`)
      historique.value = logs.map(l => ({ ...l, exo_nom: l.exercice?.nom || '' }))
    }

    const performances = ref([])
    const fetchPerformances = async () => {
      // suivi vaut toujours true à la réception : l'endpoint ne renvoie que
      // les exercices suivis. Le champ est ensuite basculé localement par
      // l'étoile de l'onglet, sans re-fetch (la ligne ne disparaît qu'au
      // prochain chargement de l'onglet, cf. toggleSuiviPerformance).
      const data = await api.get('/performances/moi')
      performances.value = data.map(p => ({ ...p, suivi: true }))
    }

    // Optimiste : le panneau de saisie reste réactif immédiatement, on
    // resynchronise avec le serveur en tâche de fond.
    const toggleSuivi = async (exo) => {
      const suivi = !exo.suivi
      exo.suivi = suivi
      try {
        await api.patch(`/exercices/${exo.id}/suivi`, { suivi })
      } catch {
        exo.suivi = !suivi
      }
    }

    // Désélection depuis l'onglet Performances : ne retire pas la ligne
    // immédiatement, seulement l'étoile — la ligne disparaît en quittant et
    // revenant sur l'onglet (prochain fetchPerformances).
    const toggleSuiviPerformance = async (perf) => {
      const suivi = !perf.suivi
      perf.suivi = suivi
      try {
        await api.patch(`/exercices/${perf.exercice_id}/suivi`, { suivi })
      } catch {
        perf.suivi = !suivi
      }
    }

    // --- Suivi de poids ---
    const entriesPoids = ref([]) // [{ id, date: 'YYYY-MM-DD', poids }]
    const moisAffiche = ref(new Date(new Date().getFullYear(), new Date().getMonth(), 1))
    const dateSaisiePoids = ref(null)
    const poidsSaisi = ref('')
    const erreurPoids = ref('')

    const pad2 = (n) => String(n).padStart(2, '0')
    const formatDateISO = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
    const aujourdhuiISO = () => formatDateISO(new Date())

    const poidsParDate = computed(() => {
      const map = {}
      entriesPoids.value.forEach(e => { map[e.date] = e })
      return map
    })

    const poidsPourDate = (date) => {
      const poids = poidsParDate.value[date]?.poids
      return poids === undefined || poids === null ? null : poids.toLocaleString('fr-FR')
    }

    const entreeExistante = computed(() => dateSaisiePoids.value ? poidsParDate.value[dateSaisiePoids.value] : null)

    const parseNombre = (v) => parseFloat(String(v).replace(',', '.'))

    // Mêmes bornes que l'API (schemas/poids.py) : 724 pour 72,4 faussait la
    // courbe, la moyenne du mois et la cible calorique de la diète.
    const POIDS_MIN = 20
    const POIDS_MAX = 300
    const poidsValide = computed(() => {
      const v = parseNombre(poidsSaisi.value)
      return !isNaN(v) && v >= POIDS_MIN && v <= POIDS_MAX
    })
    const aidePoids = computed(() => {
      if (!String(poidsSaisi.value).trim() || poidsValide.value) return ''
      return `Entre ${POIDS_MIN} et ${POIDS_MAX} kg (ex : 72,4)`
    })

    const labelMois = computed(() => {
      const texte = moisAffiche.value.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
      return texte.charAt(0).toUpperCase() + texte.slice(1)
    })

    // Grille lundi -> dimanche, complétée par des cases vides pour aligner
    // le premier jour du mois et compléter la dernière semaine.
    const joursGrille = computed(() => {
      const annee = moisAffiche.value.getFullYear()
      const mois = moisAffiche.value.getMonth()
      const premierJour = new Date(annee, mois, 1)
      const nbJours = new Date(annee, mois + 1, 0).getDate()
      const decalage = (premierJour.getDay() + 6) % 7 // 0 = lundi
      const today = aujourdhuiISO()

      const jours = []
      for (let i = 0; i < decalage; i++) jours.push(null)
      for (let n = 1; n <= nbJours; n++) {
        const iso = `${annee}-${pad2(mois + 1)}-${pad2(n)}`
        jours.push({
          date: iso,
          numero: n,
          estAujourdhui: iso === today,
          estFutur: iso > today
        })
      }
      while (jours.length % 7 !== 0) jours.push(null)
      return jours
    })

    const courbePoids = computed(() =>
      [...entriesPoids.value]
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .map(e => ({ date: e.date, valeur: e.poids }))
    )

    // Moyenne des pesées du mois affiché : une pesée isolée varie de jour en
    // jour (repas, hydratation), la moyenne mensuelle est ce qui se compare
    // d'un mois à l'autre. Suit donc les flèches du calendrier.
    const moyennePoidsMois = computed(() => {
      const prefixe = `${moisAffiche.value.getFullYear()}-${pad2(moisAffiche.value.getMonth() + 1)}-`
      const valeurs = entriesPoids.value
        .filter(e => String(e.date).startsWith(prefixe))
        .map(e => e.poids)
      if (valeurs.length === 0) return null
      const moyenne = valeurs.reduce((somme, v) => somme + v, 0) / valeurs.length
      return {
        valeur: moyenne.toLocaleString('fr-FR', { maximumFractionDigits: 1 }),
        nb: valeurs.length
      }
    })

    const moisPrecedent = () => {
      moisAffiche.value = new Date(moisAffiche.value.getFullYear(), moisAffiche.value.getMonth() - 1, 1)
    }
    const moisSuivant = () => {
      moisAffiche.value = new Date(moisAffiche.value.getFullYear(), moisAffiche.value.getMonth() + 1, 1)
    }

    const formatDateLongue = (iso) =>
      new Date(iso).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

    const ouvrirSaisiePoids = (date) => {
      dateSaisiePoids.value = date
      const existant = poidsParDate.value[date]?.poids
      poidsSaisi.value = existant === undefined || existant === null ? '' : existant.toLocaleString('fr-FR')
      erreurPoids.value = ''
    }
    const fermerSaisiePoids = () => {
      dateSaisiePoids.value = null
      poidsSaisi.value = ''
      erreurPoids.value = ''
    }

    const chargerPoids = async () => {
      try {
        entriesPoids.value = await api.get('/poids/moi')
      } catch (e) {
        console.error('Erreur chargement poids:', e)
      }
    }

    const enregistrerPoids = async () => {
      if (!poidsValide.value) return
      const date = dateSaisiePoids.value
      const valeur = parseNombre(poidsSaisi.value)
      try {
        const entree = await api.post('/poids/', { date, poids: valeur })
        entriesPoids.value = [...entriesPoids.value.filter(e => e.date !== date), entree]
        fermerSaisiePoids()
        progression.actualiser('Pesée')

        if (date === aujourdhuiISO()) {
          const wellnessJour = await api.get('/wellness/aujourdhui')
          if (!wellnessJour) popupWellness.value = true
        }
      } catch (e) {
        erreurPoids.value = e.message || "Erreur lors de l'enregistrement"
      }
    }

    const supprimerPoids = async () => {
      const entree = entreeExistante.value
      if (!entree) return
      if (!confirm('Supprimer cette pesée ?')) return
      try {
        await api.del(`/poids/${entree.id}`)
        entriesPoids.value = entriesPoids.value.filter(e => e.id !== entree.id)
        fermerSaisiePoids()
      } catch (e) {
        erreurPoids.value = e.message || 'Erreur lors de la suppression'
      }
    }

    // Sauvegarde à chaque frappe : c'est la seule copie de la saisie tant que
    // la séance n'est pas validée.
    watch(logs, enregistrerBrouillon, { deep: true })

    watch(onglet, (v) => {
      if (v === 'performances') fetchPerformances()
      if (v === 'poids') chargerPoids()
    })
    watch(seanceActive, (s) => {
      if (!s) fermerSaisie()
      // Séance ouverte : la fête de fin de séance est probable, ses confettis
      // se téléchargent pendant l'effort plutôt qu'au moment de valider.
      else prechargerConfettis()
    })

    // Swipe horizontal entre onglets (Accueil <-> Séances <-> Performances <->
    // Poids <-> Diète <-> Blessures), sur tout le contenu du dashboard. Le
    // panneau de saisie, la roulette de dates et les onglets d'une séance ont
    // leur propre swipe et stoppent la propagation, donc aucun ne marche sur
    // les pieds de l'autre.
    const ONGLETS = ['mes-stats', 'programme', 'performances', 'poids', 'diete', 'blessures']
    // Sens d'arrivée du nouvel onglet (cf. v-entree-onglet) : depuis la droite
    // quand on avance dans cet ordre, depuis la gauche sinon. Mis à jour avant
    // le rendu (flush 'sync') pour que le panneau monté le lise déjà.
    const sensOnglet = ref(0)
    watch(onglet, (nouveau, ancien) => {
      sensOnglet.value = Math.sign(ONGLETS.indexOf(nouveau) - ONGLETS.indexOf(ancien)) || 1
    }, { flush: 'sync' })
    const swipeOnglets = creerSwipeHorizontal((sens) => {
      const cible = ONGLETS[ONGLETS.indexOf(onglet.value) + sens]
      if (cible) onglet.value = cible
    })

    // Swipe entre les onglets d'une séance ouverte (Séance / Historique /
    // Courbe). Inactif sur la liste des séances, où le geste doit continuer de
    // changer d'onglet du dashboard.
    const swipeVueSeance = creerSwipeHorizontal(
      (sens) => {
        const cible = VUES_SEANCE[VUES_SEANCE.findIndex(v => v.cle === vueSeance.value) + sens]
        if (cible) ouvrirVueSeance(cible.cle)
      },
      { actif: () => !!seanceActive.value, stopper: true }
    )

    onMounted(fetchProgrammes)

    // Planification annuelle faite par le prépa (onglet Séances)
    const planificationSaison = ref({})
    onMounted(async () => {
      try {
        planificationSaison.value = carteSemaines((await api.get('/planification/moi')).semaines)
      } catch {
        // sans elle, l'onglet Séances reste celui d'avant
      }
    })

    // Objectifs de charge fixés par le prépa (musculation) : dans la séance,
    // la saisie, les courbes et l'onglet Perfs.
    const objectifs = ref({})
    const chargerObjectifs = async () => {
      try {
        objectifs.value = objectifsParCle(await api.get('/objectifs/moi'))
      } catch {
        // rien à montrer : la séance reste la même
      }
    }
    onMounted(chargerObjectifs)
    const objectifExo = (exo) => {
      const type = seanceActive.value?.type_seance
      return type && type !== 'musculation' ? null : objectifDe(objectifs.value, exo.nom)
    }
    const objectifPerf = (perf) => (perf.type_seance === 'musculation' ? objectifDe(objectifs.value, perf.exercice_nom) : null)
    const listeObjectifs = computed(() => Object.values(objectifs.value))
    // Jauge : meilleure charge rapportée à l'objectif
    const avancementObjectif = (o) => (o.atteint_le ? 100 : Math.min(100, Math.round(((o.meilleure_charge || 0) / o.poids) * 100)))

    const isGroupeComplete = (groupe) => {
      const nbSeries = nbSeriesGroupe(groupe)
      if (nbSeries === 0) return false
      for (let i = 0; i < nbSeries; i++) {
        if (!isGroupeDone(groupe, i)) return false
      }
      return true
    }

    // Progression de la séance en cours (présentation uniquement) :
    // alimente la barre collante « x/y exercices — Valider la séance ». Un
    // exercice sans série ne se coche pas : il n'est pas compté.
    const progressionSeance = computed(() => {
      const exos = (seanceActive.value?.exercices || []).filter(e => e.series.length > 0)
      return { done: exos.filter(e => etatExo(e).complet).length, total: exos.length }
    })

    // Barre « Valider la séance » rangée sous le bas de l'écran (cf.
    // useBarreRangee). Rangée à chaque séance ou onglet ouvert ; ressortie
    // quand la validation échoue, pour que le message soit lu.
    const feuilleSeance = ref(null)
    const barreValiderEl = ref(null)
    // 4 px restent visibles : le liseré d'avancement en haut de la barre
    const barreValider = useBarreRangee(feuilleSeance, barreValiderEl, { depasse: 4 })
    watch([() => seanceActive.value?.id, vueSeance], () => { barreValider.relevee = false })
    watch(erreurValidation, (e) => { if (e) barreValider.relevee = true })

    return {
      authStore, semainesProgramme, semaineCourante, testsSemaine, envoiSuivi, passerSemaine, noterTest,
      programmes, programmeActif, seances, seanceActive, logs, historique,
      loadingSeances, onglet,
      menuSuiviOuvert, ongletsSuivi, ITEMS_SUIVI, choisirSuivi,
      seancesAffichees,
      labelType, iconeType, estAujourdhuiSeance, letterFor, grouperExercices,
      nbSeriesGroupe, exosDeLaSerie, reposSerie,
      getLogs, isGroupeDone, erreurValidation, planificationSaison,
      objectifs, objectifExo, objectifPerf, listeObjectifs, avancementObjectif, texteObjectif, texteCharge,
      feuilleSeance, barreValiderEl, barreValider,
      estEnEdition,
      etatBoutonSerie, toggleSerie, historiqueGroupeExiste, supprimerSeanceHistorique,
      selectProgramme, demarrerSeance, validerSeance,
      etatExo, basculerExo,
      recapPropose, recapOuvert, ouvrirRecap, marquerRecapVu,
      banniereReaction, voirReaction, marquerReactionsVues, arriveeReaction, sensOnglet,
      motsNouveaux, banniereMot, marquerMotsVus, voirMot,
      programmesAffiches, programmeEpingleId, estEpingle, basculerEpingleProgramme,
      isGroupeComplete,
      progressionSeance,
      groupeSaisie, ouvrirSaisie, fermerSaisie, valeursSerie, resumeExo,
      typeGroupe, labelTypeGroupe,
      saisieVue, historiqueIndex, nbTentativesGroupe, retourSaisie,
      swipeOnglets, swipeVueSeance, swipeSaisie, swipeRoulette,
      historiqueSeriePourExo, n1SeriePourExo, formatDateCourt, formatDateNumerique, diffVsHistorique, inputmodeSaisie,
      champsGraphique, courbeExo,
      VUES_SEANCE, vueSeance, ouvrirVueSeance,
      tentativesSeance, tentativeAffichee, tentativeAncienne, tentativeRecente,
      histoIndex, histoPlusAncienne, histoPlusRecente, sensHisto, valeursHistorique, courbesSeance,
      performances, toggleSuivi, toggleSuiviPerformance, dateTentativeGroupe,
      dateSaisiePoids, poidsSaisi, erreurPoids, poidsPourDate, entreeExistante, poidsValide, aidePoids,
      estNombre, dateTentative, dateCentrale, memeJourQuUneAutre,
      labelMois, joursGrille, courbePoids, moyennePoidsMois, moisPrecedent, moisSuivant, formatDateLongue,
      ouvrirSaisiePoids, fermerSaisiePoids, enregistrerPoids, supprimerPoids,
      popupRessenti, popupWellness, focusRessenti, focusWellness,
      repondreRessenti, repondreWellness, onFocusConsomme,
      brouillonPropose, sousTitreBrouillon, reprendreBrouillon, abandonnerBrouillon,
      planning, planningActif, creneaux, seancesFaites, modalPlanning, erreurPlanning,
      enregistrerPlanning, supprimerPlanning, fermerModalPlanning, ouvrirDepuisPlanning,
      ouvrirDepuisRegularite
    }
  }
}
</script>

<style scoped>
.dashboard-root { display: flex; flex: 1; flex-direction: column; overflow: hidden; min-height: 0; touch-action: pan-y; }
.content-body { display: flex; flex: 1; flex-direction: column; overflow: hidden; min-height: 0; min-width: 0; }

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm);
  color: var(--color-text-secondary);
  text-align: center;
  padding: var(--spacing-xl);
  touch-action: pan-y;
}
.empty-icon { font-size: 40px; color: var(--color-text-muted); }

/* --- Écrans (colonne centrée, mobile-first) --- */
.screen {
  flex: 1;
  overflow-y: auto;
  padding: var(--spacing-lg);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  width: 100%;
  max-width: 720px;
  margin: 0 auto;
  touch-action: pan-y;
  min-height: 0;
}

.screen-header h2 { font-size: var(--font-size-xl); font-weight: 700; margin: 0 0 4px; }
.screen-header p { font-size: var(--font-size-sm); color: var(--color-text-secondary); margin: 0; }

/* --- Sélecteur de programme (seulement si > 1) --- */
/* L'épingle est posée à côté de la grille, jamais dedans : elle ne doit pas se
   confondre avec un programme. */
.prog-bar { display: flex; align-items: flex-start; gap: var(--spacing-sm); flex-shrink: 0; }
/* auto-fill + 1fr : autant de colonnes que la largeur en permet, toutes de même
   largeur, et les puces d'une même ligne prennent la même hauteur — un nom long
   passe sur deux lignes sans désaligner ses voisines. */
.prog-switcher {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: var(--spacing-sm);
  flex: 1;
  min-width: 0;
}
.prog-chip {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  min-height: var(--tap-min);
  padding: var(--spacing-sm) var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  background: var(--color-bg);
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  font-weight: 500;
  line-height: 1.3;
  text-align: center;
  /* un nom d'un seul mot très long ne doit pas dépasser de sa colonne */
  overflow-wrap: break-word;
  cursor: pointer;
}
.prog-chip.active {
  background: var(--color-primary-light);
  border-color: var(--color-primary);
  color: var(--color-primary-text);
  font-weight: 600;
}
.prog-chip-pin { font-size: var(--font-size-sm); color: var(--color-primary); }

.btn-epingle-prog {
  width: var(--tap-min);
  height: var(--tap-min);
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  background: var(--color-bg);
  color: var(--color-text-muted);
  font-size: var(--font-size-lg);
  cursor: pointer;
}
.btn-epingle-prog.active {
  background: var(--color-primary-light);
  border-color: var(--color-primary);
  color: var(--color-primary-text);
}

/* --- Cartes séance --- */
.seance-card {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-lg);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-left: 3px solid var(--color-border);
  border-radius: var(--radius-lg);
  cursor: pointer;
  text-align: left;
  flex-shrink: 0;
  width: 100%;
  box-shadow: var(--shadow-card);
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast), transform var(--transition-fast);
}
.seance-card:hover { border-color: var(--color-primary); box-shadow: var(--shadow-card-hover); }
.seance-card:active { transform: scale(0.99); }
.seance-card.est-aujourdhui { border-left-color: var(--color-primary); box-shadow: var(--shadow-card-hover); }
.seance-card-musculation { border-left-color: var(--color-type-musculation-border); }
.seance-card-natation { border-left-color: var(--color-type-natation-border); }
.seance-card-athletisme { border-left-color: var(--color-type-athletisme-border); }
.seance-card-pliometrie { border-left-color: var(--color-type-pliometrie-border); }
.seance-card.est-aujourdhui.seance-card-musculation,
.seance-card.est-aujourdhui.seance-card-natation,
.seance-card.est-aujourdhui.seance-card-athletisme,
.seance-card.est-aujourdhui.seance-card-pliometrie { border-left-color: var(--color-primary); }
.seance-card-icone {
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  background: var(--color-bg-app);
  color: var(--color-text-secondary);
}
.seance-card.est-aujourdhui .seance-card-icone { background: var(--color-primary-light); color: var(--color-primary-dark); }
.seance-card-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6px; }
.seance-card-titre-ligne { display: flex; align-items: center; gap: var(--spacing-sm); flex-wrap: wrap; }
.seance-card-titre { font-size: var(--font-size-base); font-weight: 600; color: var(--color-text); }
.badge-today { background: var(--color-primary); color: var(--color-on-primary); font-weight: 600; }
.seance-card-meta { display: flex; align-items: center; gap: var(--spacing-sm); flex-wrap: wrap; }
.seance-card-count { font-size: var(--font-size-xs); color: var(--color-text-secondary); }
.seance-card-chevron { color: var(--color-text-muted); font-size: var(--font-size-lg); flex-shrink: 0; }

/* Proposition de semaine type, sous la liste : discrète tant que l'athlète
   n'en a pas créé, elle disparaît ensuite au profit du calendrier. */
.ajout-libre-sans-programme, .saison-sans-programme { width: 100%; max-width: 420px; margin-top: var(--spacing-lg); text-align: left; }
.btn-creer-semaine {
  width: 100%;
  margin-top: var(--spacing-sm);
  color: var(--color-primary-dark);
  border-color: var(--color-primary-lighter);
  flex-shrink: 0;
}

/* Encart d'information (conseil de pesée, mode de calcul d'une courbe...) */
.info-note {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  font-size: var(--font-size-sm);
  font-weight: 500;
  color: var(--color-primary-text);
  background: var(--color-primary-light);
  padding: var(--spacing-md);
  border-radius: var(--radius-md);
  flex-shrink: 0;
}
.info-note .ti { font-size: var(--font-size-lg); flex-shrink: 0; }

/* --- Onglet Historique d'une séance --- */
.histo-pager {
  font-size: 10px;
  font-weight: 700;
  color: var(--color-text-muted);
  background: var(--color-bg-tertiary);
  padding: 1px 7px;
  border-radius: var(--radius-full);
  flex-shrink: 0;
}

/* Roulette des dates : dates voisines estompées, date consultée au centre */
.histo-roulette {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 4px;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  overflow: hidden;
  flex-shrink: 0;
  touch-action: pan-y;
  user-select: none;
}
.histo-fleche {
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: var(--radius-full);
  background: none;
  color: var(--color-text-secondary);
  cursor: pointer;
  font-size: var(--font-size-base);
}
.histo-fleche:hover:not(:disabled) { color: var(--color-primary); }
.histo-fleche:disabled { opacity: 0.25; cursor: default; }
.histo-date-cote {
  flex: 1;
  min-width: 0;
  height: 28px;
  padding: 0 2px;
  border: none;
  background: none;
  color: var(--color-text-muted);
  font-size: var(--font-size-xs);
  font-weight: 500;
  cursor: pointer;
  opacity: 0.55;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: opacity 0.15s;
}
.histo-date-cote:hover { opacity: 1; color: var(--color-primary-text); }
.histo-date-cote.is-vide { cursor: default; pointer-events: none; }
/* Fenêtre de la roulette : la date sortante et l'entrante défilent dedans,
   clippées, sans jamais déborder sur les dates voisines */
.histo-date-slot {
  position: relative;
  width: 104px;
  height: 28px;
  flex-shrink: 0;
  overflow: hidden;
  border-radius: var(--radius-full);
}
.histo-date-active.avec-heure { font-size: var(--font-size-xs); }
.histo-date-active {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-full);
  background: var(--color-primary-light);
  color: var(--color-primary-text);
  font-size: var(--font-size-sm);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
/* La date sortante et la date entrante glissent dans le sens du déplacement */
.roulette-ancien-enter-active,
.roulette-ancien-leave-active,
.roulette-recent-enter-active,
.roulette-recent-leave-active {
  transition: opacity 0.16s ease, transform 0.16s ease;
}
.roulette-ancien-enter-from { opacity: 0; transform: translateX(-100%); }
.roulette-ancien-leave-to { opacity: 0; transform: translateX(100%); }
.roulette-recent-enter-from { opacity: 0; transform: translateX(100%); }
.roulette-recent-leave-to { opacity: 0; transform: translateX(-100%); }

.histo-ref {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  flex-shrink: 0;
}
.histo-exo {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: var(--spacing-md);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  flex-shrink: 0;
}
.histo-exo-nom { font-size: var(--font-size-sm); font-weight: 600; color: var(--color-text); }
.histo-serie {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  flex-wrap: wrap;
  padding-top: 4px;
  border-top: 1px dashed var(--color-border);
}
.histo-serie.non-fait { opacity: 0.6; }
.histo-serie-label {
  font-size: var(--font-size-xs);
  font-weight: 700;
  color: var(--color-superset-text);
  min-width: 24px;
}
.histo-val {
  display: inline-flex;
  align-items: baseline;
  gap: 3px;
  font-size: var(--font-size-sm);
  font-weight: 700;
  color: var(--color-text-body);
  font-variant-numeric: tabular-nums;
}
.histo-unite { font-size: var(--font-size-xs); font-weight: 500; color: var(--color-text-secondary); }
.histo-nf { font-size: var(--font-size-xs); font-weight: 600; color: var(--color-danger-text); }
.histo-diff {
  font-size: 10px;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: var(--radius-full);
  margin-left: 2px;
}
.histo-diff.diff-positif { background: var(--color-valid-bg); color: var(--color-valid-text-strong); }
.histo-diff.diff-negatif { background: var(--color-danger-bg); color: var(--color-danger-text); }
.histo-diff.diff-neutre { background: var(--color-bg-tertiary); color: var(--color-text-muted); }

/* --- Barre haute de séance --- */
.seance-topbar {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-sm) var(--spacing-lg);
  background: var(--color-bg);
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}
.seance-topbar-info { flex: 1; min-width: 0; }
.seance-topbar-titre {
  font-size: var(--font-size-base);
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.seance-topbar-meta { display: flex; gap: 6px; margin-top: 2px; flex-wrap: wrap; }

/* --- Onglets d'une séance (feuille / historique / courbe) --- */
.seance-onglets {
  display: flex;
  gap: var(--spacing-sm);
  padding: 6px var(--spacing-lg);
  background: var(--color-bg);
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}
.seance-onglets .prog-chip {
  flex: 1;
  min-height: 38px;
  padding: 0 var(--spacing-sm);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
}

/* --- Feuille de séance --- */
.feuille { gap: var(--spacing-lg); padding-bottom: var(--spacing-lg); }
/* Place de la barre de validation sous le dernier exercice. Pseudo-élément
   et non bloc vide : v-cascade fait entrer les enfants par une translation,
   qui allongerait un instant la zone à défiler et fausserait la mesure. */
.feuille::after { content: ''; flex-shrink: 0; height: var(--hauteur-barre-valider, 0px); }

/* --- Feuille de séance : une case par exercice, le détail à la demande --- */
.seance-aide {
  margin: 0;
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-sm);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  line-height: 1.5;
}
.seance-aide > .ti { flex-shrink: 0; font-size: var(--font-size-lg); color: var(--color-primary); }
.seance-aide span .ti { color: var(--color-primary-text); }

.exo-bloc {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-sm) var(--spacing-sm) var(--spacing-xs);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
  flex-shrink: 0;
  transition: border-color var(--transition-fast), background var(--transition-fast);
}
.exo-bloc.is-superset { border-color: var(--color-superset-border); border-left: 4px solid var(--color-primary); }
.exo-bloc.is-complete { border-color: var(--color-valid-border); background: var(--color-valid-bg-soft); }
.exo-bloc-exos { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.exo-bloc .type-groupe-badge { padding: 2px 0 0 var(--spacing-sm); }

.exo-ligne { display: flex; align-items: center; }
.exo-ligne + .exo-ligne { border-top: 1px dashed var(--color-border); }

/* Cible de 44 px pour le pouce, case visible de 28 px */
.exo-case {
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: none;
  background: none;
  font-family: inherit;
  cursor: pointer;
}
.exo-case:disabled { cursor: default; opacity: 0.4; }
.exo-case-boite {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid var(--color-border-strong);
  border-radius: var(--radius-md);
  background: var(--color-bg);
  font-size: 10px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--color-valid-text);
  transition: background var(--transition-fast), border-color var(--transition-fast);
}
.exo-case.est-partiel .exo-case-boite { border-color: var(--color-valid-text); background: var(--color-valid-bg-soft); }
.exo-case.est-fait .exo-case-boite {
  border-color: var(--color-valid-text);
  background: var(--color-valid-text);
  color: var(--color-on-primary);
  font-size: 18px;
}
/* Coche dessinée (case d'exercice, bouton de série) : taille de la police
   du bouton qui la porte */
.coche {
  width: 1em;
  height: 1em;
  fill: none;
  stroke: currentColor;
  stroke-width: 2.6;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.exo-infos {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: var(--spacing-sm) 0;
  border: none;
  background: none;
  font-family: inherit;
  text-align: left;
  cursor: pointer;
}
/* Du texte en ligne, pas un flex : un nom long passait à la ligne en
   laissant la lettre A/B (et le badge optionnelle) seule sur la sienne. */
.exo-ligne-nom {
  font-size: var(--font-size-base);
  font-weight: 600;
  line-height: 1.35;
  color: var(--color-text);
}
.exo-ligne-nom .exo-letter-mini { display: inline-block; margin-right: 6px; vertical-align: 1px; }
.exo-ligne-nom .optionnel-badge { display: inline-block; margin-left: 6px; vertical-align: 2px; }
.exo-ligne-prescrit {
  display: flex;
  flex-wrap: wrap;
  gap: 2px 10px;
  font-size: var(--font-size-sm);
  font-weight: 500;
  color: var(--color-primary-dark);
  font-variant-numeric: tabular-nums;
}
.exo-ligne-prescrit.is-vide { color: var(--color-text-muted); font-style: italic; }
.exo-ligne-consigne {
  font-size: var(--font-size-xs);
  line-height: 1.45;
  color: var(--color-text-secondary);
}
/* Objectif de charge fixé par le prépa (cf. data/objectifs.js) */
.exo-ligne-objectif, .performance-objectif {
  display: inline-flex; align-items: center; gap: 4px; align-self: flex-start;
  margin-top: 2px; padding: 1px 8px; border-radius: var(--radius-full);
  background: var(--color-warning-bg); color: var(--color-warning-text-strong);
  font-size: var(--font-size-xs); font-weight: 700;
}
.exo-ligne-objectif.atteint, .performance-objectif.atteint { background: var(--color-valid-bg); color: var(--color-valid-text-strong); }
.saisie-objectif {
  display: flex; align-items: center; gap: 6px; margin-top: 4px;
  padding: 4px 10px; border-radius: var(--radius-md);
  background: var(--color-warning-bg-soft); border: 1px solid var(--color-warning-border);
  font-size: var(--font-size-xs); color: var(--color-text-secondary);
}
.saisie-objectif strong { color: var(--color-warning-text-strong); }
.saisie-objectif > .ti { font-size: 16px; color: var(--color-warning-icon); flex-shrink: 0; }
.saisie-objectif.atteint { background: var(--color-valid-bg-soft); border-color: var(--color-valid-border); }
.saisie-objectif.atteint > .ti, .saisie-objectif.atteint strong { color: var(--color-valid-text-strong); }
.exo-bloc-repos {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 0 0 var(--spacing-xs) 44px;
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
}

/* Le crayon : ouvre le panneau de saisie détaillée du groupe */
.btn-detailler {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: var(--radius-full);
  background: var(--color-primary-light);
  color: var(--color-primary-text);
  font-size: 18px;
  cursor: pointer;
  transition: background var(--transition-fast);
}
.btn-detailler:hover { background: var(--color-primary-lighter); }

.optionnel-badge {
  font-size: var(--font-size-xs);
  font-weight: 500;
  color: var(--color-text-secondary);
  background: var(--color-bg-tertiary);
  padding: 2px 8px;
  border-radius: var(--radius-full);
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.exo-num {
  width: 26px;
  height: 26px;
  background: var(--color-primary-light);
  color: var(--color-superset-text);
  font-size: var(--font-size-sm);
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border-radius: var(--radius-full);
  box-shadow: 0 0 0 3px var(--color-bg-app);
}

/* --- Cartes série --- */
/* --- Cartes série : une ligne par série ---
   Numéro + repos | prévu + N-1 | deux cases | bouton rond. Le prévu reste
   lisible sans être géant : les cases le répètent en grisé, et quatre séries
   doivent tenir dans l'écran sans défiler. */
.serie-card {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-sm) var(--spacing-sm) var(--spacing-md);
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  transition: background var(--transition-base), border-color var(--transition-base);
}
.serie-card.done { background: var(--color-valid-bg-soft); border-color: var(--color-valid-border); }
/* Série tout juste validée : une onde verte part de la carte (cf. feterSerie) */
.serie-card.vient-detre-faite,
.exo-bloc.vient-detre-faite { animation: serie-faite 0.75s ease-out; }
@keyframes serie-faite {
  0% { box-shadow: 0 0 0 0 rgba(74, 222, 128, 0.55); }
  100% { box-shadow: 0 0 0 14px rgba(74, 222, 128, 0); }
}
@media (prefers-reduced-motion: reduce) {
  .serie-card.vient-detre-faite,
  .exo-bloc.vient-detre-faite { animation: none; }
}

.serie-num { width: 40px; flex-shrink: 0; display: flex; flex-direction: column; gap: 2px; }
.serie-label { font-size: var(--font-size-base); font-weight: 800; color: var(--color-superset-text); line-height: 1.1; }
.serie-repos {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  font-size: 11px;
  font-weight: 600;
  color: var(--color-text-muted);
  white-space: nowrap;
}

/* Superset : le numéro et le repos passent sur une ligne d'en-tête. En
   colonne à gauche, ils laissaient si peu de place au prévu (avec la lettre
   A/B en plus) que « 10 reps · 16 » se cassait en deux lignes. */
.serie-card.est-superset { flex-wrap: wrap; row-gap: 4px; }
.serie-card.est-superset .serie-num { width: 100%; flex-direction: row; align-items: baseline; gap: var(--spacing-sm); }

.serie-corps { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6px; }
.serie-exo { display: flex; align-items: center; gap: var(--spacing-sm); }
.serie-exo + .serie-exo { padding-top: 6px; border-top: 1px dashed var(--color-border); }
.serie-exo-infos { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
/* Du texte en ligne : en flex, la lettre A/B d'un superset partait seule sur
   sa ligne dès que le prévu ne tenait pas à côté. */
.serie-prevu {
  font-size: var(--font-size-sm);
  font-weight: 700;
  color: var(--color-text);
  line-height: 1.3;
  font-variant-numeric: tabular-nums;
}
.serie-prevu .exo-letter-mini { display: inline-block; margin-right: 6px; vertical-align: 1px; }
.n1-bloc { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px; }

.realise-inputs { display: flex; gap: 6px; flex-shrink: 0; }
.realise-inputs > .log-input-wrap, .realise-inputs > .log-input { flex: 0 0 64px; width: 64px; }
/* iPhone SE / mini (375 px) : « 12 reps · 20 » se cassait en deux lignes.
   Cases et colonne du numéro un peu plus étroites sur ces écrans. */
@media (max-width: 380px) {
  .realise-inputs > .log-input-wrap, .realise-inputs > .log-input { flex-basis: 56px; width: 56px; }
  .serie-num { width: 34px; }
}
/* Graisse moyenne : en gras, les chiffres faisaient grossiers. 14 px sur
   ordinateur ; sur écran tactile, base.css remonte tous les champs à 16 px
   (en dessous, l'iPhone zoome sur le champ au toucher). */
.log-input {
  height: 44px;
  padding: 0 4px;
  font-size: var(--font-size-sm);
  font-weight: 500;
  color: var(--color-text-body);
  width: 100%;
  min-width: 0;
  border: 1.5px solid var(--color-border-strong);
  border-radius: var(--radius-md);
  background: var(--color-bg);
  text-align: center;
  font-variant-numeric: tabular-nums;
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast), background var(--transition-fast);
}

/* Le prévu en grisé clair : il ne doit pas se confondre avec une valeur
   tapée (c'est pourtant lui qui part si on valide sans rien saisir). */
/* Exemple plus petit que la saisie : 12 px même sur téléphone. Le zoom de
   l'iPhone ne dépend que de la police du champ (16 px), pas de celle-ci. */
.log-input::placeholder { color: var(--color-text-muted); font-size: var(--font-size-xs); font-weight: 400; opacity: 1; }

/* Bouton rond : coche grise à valider, verte une fois faite */
.btn-serie {
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border-radius: var(--radius-full);
  border: 1.5px solid var(--color-border-strong);
  background: var(--color-bg);
  color: var(--color-text-muted);
  font-size: 20px;
  cursor: pointer;
  transition: background var(--transition-fast), border-color var(--transition-fast), color var(--transition-fast), transform var(--transition-fast);
}
.btn-serie:active { transform: scale(0.92); }

/* --- Réaction du prépa sur une série, dans l'historique --- */
.histo-reaction {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  margin-left: auto;
  padding: 2px 8px;
  border-radius: var(--radius-full);
  background: var(--color-primary-light);
  font-size: var(--font-size-sm);
}
.histo-reaction small { font-size: 10px; font-weight: 700; color: var(--color-primary-text); text-transform: uppercase; letter-spacing: 0.3px; }



.exo-letter-mini {
  font-size: var(--font-size-xs);
  font-weight: 700;
  color: var(--color-on-primary);
  background: var(--color-primary);
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  flex-shrink: 0;
}


.n1-tag {
  font-size: 10px;
  font-weight: 700;
  color: var(--color-text-muted);
  letter-spacing: 0.3px;
}
.n1-val { font-size: var(--font-size-xs); font-weight: 600; color: var(--color-text-secondary); }
.n1-unit { font-size: 10px; font-weight: 500; margin-left: 2px; }
.n1-val.n1-nf { color: var(--color-danger-text); }

.historique-inline { display: flex; flex-direction: column; gap: 6px; }
.historique-inline-vide { font-size: var(--font-size-xs); color: var(--color-text-muted); font-style: italic; }
.log-input-wrap { position: relative; flex: 1; min-width: 0; }
.log-input:focus { outline: none; border-color: var(--color-primary); box-shadow: var(--shadow-focus); }
.log-input-diff {
  position: absolute;
  top: -9px;
  right: -6px;
  font-size: var(--font-size-xs);
  font-weight: 700;
  padding: 1px 6px;
  border-radius: var(--radius-full, 999px);
  line-height: 1.4;
  pointer-events: none;
  box-shadow: 0 1px 4px rgba(31, 25, 84, 0.15);
}
.log-input-diff.diff-positif { background: var(--color-valid-bg); color: var(--color-valid-text-strong); }
.log-input-diff.diff-negatif { background: var(--color-danger-bg); color: var(--color-danger-text); }
.log-input-diff.diff-neutre { background: var(--color-bg-tertiary); color: var(--color-text-muted); }
.log-input-locked {
  background: var(--color-bg-tertiary);
  color: var(--color-text-secondary);
  cursor: not-allowed;
  border-color: var(--color-border);
}
.log-input-locked:focus { border-color: var(--color-border); box-shadow: none; }
.log-input-locked.done {
  background: var(--color-valid-bg-soft);
  color: var(--color-valid-text-strong);
  border-color: var(--color-valid-border);
}

.btn-todo:hover { color: var(--color-primary-dark); border-color: var(--color-primary); }
.btn-done { background: var(--color-valid-text); color: #fff; border-color: var(--color-valid-text); }
.btn-done:hover { background: var(--color-valid-text-strong); border-color: var(--color-valid-text-strong); }


/* Suppression de la séance d'historique entière, à côté de sa date */
.btn-supprimer-seance-historique {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  background: transparent;
  color: inherit;
  cursor: pointer;
}
.btn-supprimer-seance-historique:hover { background: var(--color-danger-bg); color: var(--color-danger-text); }

.type-groupe-badge {
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: var(--font-size-xs);
  font-weight: 600;
  color: var(--color-superset-text);
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

/* --- Feuille "Suivi" --- */
.suivi-overlay {
  position: fixed;
  inset: 0;
  background: rgba(23, 21, 58, 0.45);
  z-index: 150;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}
.suivi-sheet {
  background: var(--color-bg);
  width: 100%;
  max-width: 480px;
  border-radius: var(--radius-xl) var(--radius-xl) 0 0;
  box-shadow: var(--shadow-modal);
  padding: var(--spacing-md) var(--spacing-lg) calc(var(--spacing-xl) + env(safe-area-inset-bottom));
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}
/* Ordinateur (fenêtre redimensionnée, le menu ne s'ouvre plus que là) :
   fenêtre centrée plutôt qu'un volet collé en bas et coupé par l'écran. */
@media (min-width: 769px) {
  .suivi-overlay { align-items: center; }
  .suivi-sheet { border-radius: var(--radius-xl); padding-bottom: var(--spacing-xl); }
}
.suivi-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: var(--font-size-lg);
  font-weight: 700;
  padding: var(--spacing-sm) var(--spacing-sm) var(--spacing-md);
}
.suivi-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  width: 100%;
  min-height: 64px;
  padding: var(--spacing-sm) var(--spacing-sm);
  background: none;
  border: none;
  border-radius: var(--radius-lg);
  cursor: pointer;
  text-align: left;
  transition: background var(--transition-fast);
}
.suivi-item:hover,
.suivi-item:active { background: var(--color-bg-app); }
.suivi-item.active .suivi-item-label { color: var(--color-primary-dark); }
.suivi-item-icone {
  flex-shrink: 0;
  width: 42px;
  height: 42px;
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}
.suivi-item-texte { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.suivi-item-label { font-size: var(--font-size-base); font-weight: 600; color: var(--color-text); }
.suivi-item-desc { font-size: var(--font-size-xs); color: var(--color-text-secondary); }
.suivi-item-chevron { color: var(--color-text-muted); flex-shrink: 0; }

.sheet-enter-active .suivi-sheet,
.sheet-leave-active .suivi-sheet { transition: transform var(--transition-base); }
.sheet-enter-active,
.sheet-leave-active { transition: background var(--transition-base); }
.sheet-enter-from,
.sheet-leave-to { background: rgba(23, 21, 58, 0); }
.sheet-enter-from .suivi-sheet,
.sheet-leave-to .suivi-sheet { transform: translateY(100%); }

/* --- Panneau de saisie (bottom sheet) --- */
.saisie-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  z-index: 150;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}
.saisie-sheet {
  background: var(--color-bg);
  width: 100%;
  max-width: 720px;
  max-height: 88dvh;
  border-radius: var(--radius-xl) var(--radius-xl) 0 0;
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow-modal);
}
.saisie-head {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-lg);
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}
.saisie-titres { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
.saisie-noms { display: flex; flex-direction: column; gap: 4px; }
.saisie-nom { display: flex; align-items: center; gap: var(--spacing-sm); font-size: var(--font-size-sm); font-weight: 700; }
.saisie-swipe-hint {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-sm);
  margin-top: 14px;
  font-size: 11px;
  line-height: 1;
  color: var(--color-text-muted);
}
.swipe-hint-item { display: inline-flex; align-items: center; gap: 3px; line-height: 1; }
.swipe-hint-item .ti { font-size: 13px; line-height: 1; }
.saisie-body {
  flex: 1;
  overflow-y: auto;
  padding: var(--spacing-lg);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  touch-action: pan-y;
}
.saisie-mode-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-primary-light);
  color: var(--color-primary-text);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  font-weight: 600;
}
.saisie-mode-pager { font-weight: 400; opacity: 0.8; margin-left: 4px; }
.saisie-mode-retour {
  background: none;
  border: none;
  color: inherit;
  text-decoration: underline;
  font-size: var(--font-size-xs);
  font-weight: 600;
  cursor: pointer;
  flex-shrink: 0;
}
.saisie-foot {
  padding: var(--spacing-md) var(--spacing-lg) calc(var(--spacing-md) + env(safe-area-inset-bottom));
  border-top: 1px solid var(--color-border);
  flex-shrink: 0;
}
.progression-exo-bloc {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  padding-bottom: var(--spacing-md);
  border-bottom: 1px solid var(--color-border);
}
.progression-exo-bloc:last-child { border-bottom: none; padding-bottom: 0; }
.progression-exo-titre {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: var(--font-size-sm);
  font-weight: 700;
  color: var(--color-text);
}
.btn-saisie-ok { width: 100%; min-height: var(--input-h); }

@media (min-width: 769px) {
  .saisie-overlay { align-items: center; padding: var(--spacing-2xl); }
  /* 560 px : les deux champs de saisie remplissent la carte au lieu d'en
     occuper la moitié gauche */
  .saisie-sheet { border-radius: var(--radius-xl); max-height: 85vh; max-width: 560px; }
}

/* --- Barre de validation collante --- */
/* --- Barre de validation, rangée sous le bas de l'écran ---
   Posée sur le bas de la feuille et décalée de (1 - --sortie) × (sa hauteur
   - --depasse) : le contenu de l'onglet coupe le reste, la barre semble
   glisser sous la barre d'onglets en laissant dépasser son liseré
   (cf. useBarreRangee). */
.content-body.avec-barre-valider { position: relative; }
.valider-bar {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 5;
  padding: var(--spacing-md) var(--spacing-lg);
  background: var(--color-bg);
  background: color-mix(in srgb, var(--color-bg) 94%, transparent);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-top: 1px solid var(--color-border);
  box-shadow: 0 -4px 16px -4px rgba(31, 25, 84, 0.08);
  transform: translateY(calc((1 - var(--sortie, 1)) * (100% - var(--depasse, 0px))));
  transition: transform 0.35s cubic-bezier(0.22, 1, 0.36, 1);
}
/* Liseré d'avancement sur toute la largeur, par-dessus le trait du haut :
   c'est lui qui dépasse quand la barre est rangée. */
.valider-bar::before {
  content: '';
  position: absolute;
  top: -1px;
  left: 0;
  right: 0;
  height: var(--depasse, 4px);
  --teinte-lisere: var(--color-primary);
  background: linear-gradient(to right,
    var(--teinte-lisere) var(--avancement, 0%),
    color-mix(in srgb, var(--teinte-lisere) 28%, transparent) var(--avancement, 0%));
  transition: background var(--transition-base);
}
.valider-bar.est-complete::before { --teinte-lisere: var(--color-valid-text); }
/* En défilement, elle suit le contenu au pixel près */
.valider-bar.suit-defilement { transition: none; }
.valider-contenu {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--spacing-lg);
}
/* Languette : posée sur le liseré, aux couleurs de l'app (verte quand tout
   est coché), elle s'efface quand la barre sort d'elle-même en fin de
   défilement. */
.valider-languette {
  position: absolute;
  bottom: calc(100% + 1px);
  left: var(--spacing-lg);
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 32px;
  min-width: 64px;
  justify-content: center;
  padding: 0 var(--spacing-md);
  border: none;
  border-radius: var(--radius-md) var(--radius-md) 0 0;
  background: var(--gradient-primary);
  box-shadow: 0 -2px 10px -2px rgba(83, 74, 183, 0.45);
  color: var(--color-on-primary);
  font: inherit;
  font-size: var(--font-size-xs);
  font-weight: 700;
  cursor: pointer;
  touch-action: none;
  -webkit-tap-highlight-color: transparent;
  opacity: var(--languette, 1);
  transition: opacity var(--transition-base), background var(--transition-base);
}
.valider-languette i { font-size: 16px; transition: transform 0.35s cubic-bezier(0.22, 1, 0.36, 1); }
.valider-languette.est-relevee i { transform: rotate(180deg); }
.valider-languette.est-masquee { pointer-events: none; }
/* Tout est coché : la languette invite à valider */
.valider-languette.est-complete { background: var(--color-valid-text); box-shadow: 0 -2px 10px -2px rgba(22, 163, 74, 0.45); }
.valider-languette:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }
@media (prefers-reduced-motion: reduce) {
  .valider-bar, .valider-languette i { transition: none; }
}
/* Pleine largeur sous la barre : le message doit être lu avant de réessayer,
   pas comprimé entre la progression et le bouton. */
.valider-erreur {
  flex-basis: 100%;
  margin: 0;
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  font-size: var(--font-size-xs);
  color: var(--color-danger-text);
}
.valider-progress { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6px; }
.valider-progress-track {
  height: 8px;
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-full);
  overflow: hidden;
}
.valider-progress-fill {
  height: 100%;
  background: var(--gradient-primary-hover);
  border-radius: var(--radius-full);
  /* Courbe qui dépasse légèrement puis revient : la barre « rebondit » à
     chaque série validée */
  transition: width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1), background var(--transition-base), box-shadow var(--transition-base);
}
.valider-progress-fill.est-complete { background: var(--color-valid-text); box-shadow: 0 0 10px rgba(74, 222, 128, 0.6); }
@media (prefers-reduced-motion: reduce) {
  .valider-progress-fill { transition: none; }
}
.valider-progress-label { font-size: var(--font-size-xs); font-weight: 600; color: var(--color-text-secondary); }
.btn-valider { flex-shrink: 0; min-height: var(--input-h); }

/* --- Suivi d'un exercice (étoile dans le panneau de saisie) --- */
.btn-suivi {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  padding: 2px;
  margin-left: 2px;
  line-height: 1;
  color: var(--color-text-muted);
  cursor: pointer;
}
.btn-suivi .ti { font-size: 16px; line-height: 1; }
.btn-suivi.active { color: var(--color-warning-icon); }

/* --- Performances --- */
/* La courbe de progression (si un exercice est suivi) précède la liste */
.performances-page > .section-title { margin-top: var(--spacing-sm); }
.performances-page {
  flex: 1;
  padding: var(--spacing-lg);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  overflow-y: auto;
  width: 100%;
  max-width: 720px;
  margin: 0 auto;
  touch-action: pan-y;
}
.performance-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}
.performance-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.performance-exo { font-size: var(--font-size-sm); font-weight: 600; color: var(--color-text-body); }
.performance-meta { font-size: var(--font-size-xs); color: var(--color-text-muted); }
.objectifs-perfs { display: flex; flex-direction: column; gap: var(--spacing-sm); }
.objectif-perf {
  display: flex; flex-direction: column; gap: 6px;
  padding: var(--spacing-md); background: var(--color-bg);
  border: 1px solid var(--color-border); border-radius: var(--radius-lg);
}
.objectif-perf-tete { display: flex; align-items: center; justify-content: space-between; gap: var(--spacing-sm); }
.objectif-perf-nom { font-size: var(--font-size-sm); font-weight: 700; min-width: 0; overflow-wrap: anywhere; }
.objectif-perf-cible {
  display: inline-flex; align-items: center; gap: 4px; flex-shrink: 0;
  padding: 1px 8px; border-radius: var(--radius-full);
  background: var(--color-warning-bg); color: var(--color-warning-text-strong);
  font-size: var(--font-size-xs); font-weight: 700;
}
.objectif-perf.atteint .objectif-perf-cible { background: var(--color-valid-bg); color: var(--color-valid-text-strong); }
.objectif-perf-jauge { height: 8px; border-radius: var(--radius-full); background: var(--color-bg-tertiary); overflow: hidden; }
.objectif-perf-jauge span { display: block; height: 100%; border-radius: inherit; background: var(--color-warning-icon); transition: width 0.6s var(--ease-standard); }
.objectif-perf.atteint .objectif-perf-jauge span { background: var(--color-valid-text); }
.objectif-perf-sous { font-size: var(--font-size-xs); color: var(--color-text-secondary); }
@media (prefers-reduced-motion: reduce) {
  .objectif-perf-jauge span { transition: none; }
}
.performance-valeur { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; flex-shrink: 0; }
.performance-valeur-main { display: flex; align-items: baseline; gap: 4px; }
.performance-valeur-sub { display: flex; align-items: center; gap: 6px; }
.performance-val { font-size: var(--font-size-lg); font-weight: 700; color: var(--color-primary-text); }
.performance-unite { font-size: var(--font-size-xs); color: var(--color-text-secondary); }
.performance-reps { font-size: var(--font-size-xs); color: var(--color-text-muted); }
.performance-date { font-size: var(--font-size-xs); color: var(--color-text-muted); }
.performance-vide { font-size: var(--font-size-xs); color: var(--color-text-muted); font-style: italic; flex-shrink: 0; }

/* --- Ordinateur : la même colonne de 720 px pour tous les onglets, centrée
   par le padding (et non un max-width) pour que la barre de défilement reste
   au bord de la fenêtre au lieu de flotter au milieu de l'écran. --- */
@media (min-width: 769px) {
  .screen, .performances-page {
    max-width: none;
    padding: var(--spacing-2xl) max(var(--spacing-2xl), calc((100% - 720px) / 2));
  }
  .valider-bar { padding: var(--spacing-md) var(--spacing-2xl); }
  .valider-bar, .seance-topbar, .seance-onglets { padding-left: max(var(--spacing-2xl), calc((100% - 720px) / 2)); padding-right: max(var(--spacing-2xl), calc((100% - 720px) / 2)); }
  .valider-languette { left: max(var(--spacing-2xl), calc((100% - 720px) / 2)); }
  .nav-item.nav-mobile { display: none; }
}
@media (max-width: 768px) {
  .nav-item.nav-ordi { display: none; }
}

/* --- Suivi de poids --- */
.poids-page {
  flex: 1;
  padding: var(--spacing-lg);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
  overflow-y: auto;
  width: 100%;
  max-width: 720px;
  margin: 0 auto;
  touch-action: pan-y;
}
.poids-calendrier-head { display: flex; align-items: center; justify-content: space-between; }
.poids-mois-label { font-size: var(--font-size-base); font-weight: 700; text-transform: capitalize; }

.aide-poids { margin: 0; font-size: var(--font-size-xs); color: var(--color-warning-text-strong); }
.poids-moyenne {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
  padding: var(--spacing-md) var(--spacing-lg);
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}
.poids-moyenne-label { font-size: var(--font-size-sm); font-weight: 600; color: var(--color-text-body); }
.poids-moyenne-val {
  font-size: var(--font-size-lg);
  font-weight: 700;
  color: var(--color-primary-dark);
  font-variant-numeric: tabular-nums;
}
.poids-moyenne-unite { font-size: var(--font-size-xs); font-weight: 600; margin-left: 2px; }
.poids-moyenne-sub { font-size: var(--font-size-xs); color: var(--color-text-secondary); }

.poids-calendrier-grille { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; }
.poids-jour-label {
  text-align: center;
  font-size: var(--font-size-xs);
  font-weight: 600;
  color: var(--color-text-muted);
  padding-bottom: 4px;
}
.poids-jour-case {
  aspect-ratio: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg);
  cursor: pointer;
  font-size: var(--font-size-xs);
  color: var(--color-text-body);
  padding: 2px;
}
.poids-jour-case.vide { visibility: hidden; cursor: default; border: none; }
.poids-jour-case.est-aujourdhui { border-color: var(--color-primary); border-width: 2px; }
.poids-jour-case.a-une-valeur { background: var(--color-valid-bg-soft); border-color: var(--color-valid-border); }
.poids-jour-case:disabled { opacity: 0.35; cursor: not-allowed; }
.poids-jour-num { font-weight: 600; }
.poids-jour-val { font-size: 10px; font-weight: 700; color: var(--color-valid-text-strong); }

/* Ordinateur : colonne commune aux onglets, et des cases de calendrier
   moins hautes — carrées, elles faisaient 95 px et repoussaient la moyenne
   et la courbe sous le bas de l'écran. */
@media (min-width: 769px) {
  .poids-page {
    max-width: none;
    padding: var(--spacing-2xl) max(var(--spacing-2xl), calc((100% - 720px) / 2));
  }
  .poids-jour-case { aspect-ratio: auto; height: 56px; }
}
</style>
