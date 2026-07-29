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
        <i class="ti ti-trophy"></i> Performances
      </div>
      <div class="nav-item" :class="{ active: onglet === 'poids' }" @click="onglet = 'poids'">
        <i class="ti ti-scale"></i> Poids
      </div>
    </template>

    <!-- Une seule bannière à la fois : elles sont toutes fixées en bas
         d'écran et se superposeraient -->
    <PopupBanniere
      v-if="brouillonPropose"
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
      @non="popupRessenti = false"
    />
    <PopupBanniere
      v-else-if="popupWellness"
      icone="ti-heart-rate-monitor"
      titre="Remplir mon wellness du jour ?"
      sous-titre="4 questions, moins de 20 secondes"
      texte-oui="Oui"
      texte-non="Non merci"
      @oui="repondreWellness"
      @non="popupWellness = false"
    />

    <div class="dashboard-root" @pointerdown="onTabSwipeStart" @pointerup="onTabSwipeEnd" @pointercancel="onTabSwipeCancel">
      <!-- Réservé à l'onglet Séances : les autres (Accueil, Poids) restent
           utilisables sans programme assigné -->
      <div class="empty-state" v-if="programmes.length === 0 && onglet === 'programme'">
        <i class="ti ti-calendar-off empty-icon"></i>
        <p>Aucun programme assigné pour le moment.</p>
        <span>Contactez votre préparateur physique.</span>
      </div>

      <!-- ONGLET PROGRAMME -->
      <div v-if="onglet === 'programme' && programmes.length > 0" class="content-body">
        <!-- ÉCRAN 1 : liste des séances (une par créneau, semaine courante) -->
        <template v-if="!seanceActive">
          <div class="screen">
            <!-- Sélecteur de programme : seulement s'il y a un choix à faire -->
            <div class="prog-switcher" v-if="programmes.length > 1" @pointerdown.stop>
              <button
                v-for="p in programmes"
                :key="p.id"
                class="prog-chip"
                :class="{ active: programmeActif?.id === p.id }"
                @click="selectProgramme(p)"
              >
                {{ p.nom }}
              </button>
            </div>

            <div class="screen-header" v-if="programmeActif">
              <h2>{{ programmeActif.nom }}</h2>
              <p v-if="programmeActif.description">{{ programmeActif.description }}</p>
            </div>

            <!-- Sous-vues du programme : les séances à faire, l'historique de
                 tout ce qui a été saisi, les courbes par exercice -->
            <div class="prog-switcher" @pointerdown.stop>
              <button
                v-for="v in VUES_PROGRAMME"
                :key="v.cle"
                class="prog-chip"
                :class="{ active: vueProgramme === v.cle }"
                @click="ouvrirVueProgramme(v.cle)"
              >
                <i class="ti" :class="v.icone"></i> {{ v.label }}
              </button>
            </div>

            <div v-if="loadingSeances" class="empty">Chargement...</div>

            <!-- SOUS-VUE SÉANCES -->
            <template v-else-if="vueProgramme === 'seances'">
              <button
                v-for="seance in seancesAffichees"
                :key="seance.id"
                class="seance-card"
                @click="demarrerSeance(seance)"
              >
                <div class="seance-card-main">
                  <div class="seance-card-titre">{{ seance.nom }}</div>
                  <div class="seance-card-meta">
                    <span class="type-badge" :class="`type-badge-${seance.type_seance || 'musculation'}`">
                      {{ labelType(seance.type_seance) }}
                    </span>
                    <span class="badge badge-purple" v-if="seance.jour">{{ seance.jour }}</span>
                    <span class="seance-card-count">{{ seance.exercices?.length || 0 }} exercices</span>
                  </div>
                </div>
                <i class="ti ti-chevron-right seance-card-chevron"></i>
              </button>
            </template>

            <!-- SOUS-VUE HISTORIQUE : une séance passée à la fois, flèches pour
                 remonter dans le temps, écarts colorés vs la fois précédente -->
            <template v-else-if="vueProgramme === 'historique'">
              <div v-if="!tentativeAffichee" class="empty">
                Aucune séance enregistrée pour l'instant.
              </div>
              <template v-else>
                <div class="histo-nav">
                  <button
                    class="btn btn-icon"
                    :disabled="!tentativeAncienne"
                    @click="histoPlusAncienne"
                    aria-label="Séance plus ancienne"
                  >
                    <i class="ti ti-chevron-left"></i>
                  </button>
                  <div class="histo-nav-info">
                    <div class="histo-nav-titre">{{ tentativeAffichee.creneau }}</div>
                    <div class="histo-nav-meta">
                      <span class="type-badge" :class="`type-badge-${tentativeAffichee.type}`">
                        {{ labelType(tentativeAffichee.type) }}
                      </span>
                      <span class="histo-nav-pager">{{ histoIndex + 1 }}/{{ tentativesProgramme.length }}</span>
                    </div>
                  </div>
                  <button
                    class="btn btn-icon"
                    :disabled="!tentativeRecente"
                    @click="histoPlusRecente"
                    aria-label="Séance plus récente"
                  >
                    <i class="ti ti-chevron-right"></i>
                  </button>
                </div>

                <!-- Roulette des dates : la séance consultée au centre, un
                     aperçu de la précédente et de la suivante de part et
                     d'autre (cliquables pour y aller directement), petites
                     flèches, et swipe horizontal pour dérouler. -->
                <div
                  class="histo-roulette"
                  role="group"
                  aria-label="Dates des séances enregistrées"
                  @pointerdown.stop="onHistoSwipeStart"
                  @pointerup="onHistoSwipeEnd"
                  @pointercancel="onHistoSwipeCancel"
                >
                  <button
                    class="histo-fleche"
                    :disabled="!tentativeAncienne"
                    @click="histoPlusAncienne"
                    aria-label="Séance plus ancienne"
                  >
                    <i class="ti ti-chevron-left"></i>
                  </button>

                  <button
                    v-if="tentativeAncienne"
                    class="histo-date-cote"
                    @click="histoPlusAncienne"
                    :aria-label="`Voir la séance du ${formatDateLongue(tentativeAncienne.date)}`"
                  >
                    {{ formatDateCourt(tentativeAncienne.date) }}
                  </button>
                  <span v-else class="histo-date-cote is-vide" aria-hidden="true"></span>

                  <span class="histo-date-slot">
                    <Transition :name="`roulette-${sensHisto}`">
                      <span
                        class="histo-date-active"
                        :key="tentativeAffichee.cle"
                        aria-current="date"
                      >
                        {{ formatDateNumerique(tentativeAffichee.date) }}
                      </span>
                    </Transition>
                  </span>

                  <button
                    v-if="tentativeRecente"
                    class="histo-date-cote"
                    @click="histoPlusRecente"
                    :aria-label="`Voir la séance du ${formatDateLongue(tentativeRecente.date)}`"
                  >
                    {{ formatDateCourt(tentativeRecente.date) }}
                  </button>
                  <span v-else class="histo-date-cote is-vide" aria-hidden="true"></span>

                  <button
                    class="histo-fleche"
                    :disabled="!tentativeRecente"
                    @click="histoPlusRecente"
                    aria-label="Séance plus récente"
                  >
                    <i class="ti ti-chevron-right"></i>
                  </button>
                </div>

                <div class="histo-ref">
                  <template v-if="tentativePrecedente">
                    <i class="ti ti-git-compare"></i>
                    Comparé au {{ formatDateNumerique(tentativePrecedente.date) }}
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
                  </div>
                </div>
              </template>
            </template>

            <!-- SOUS-VUE COURBES : une courbe par exercice, moyenne des charges
                 de toutes ses séries, un point par séance réalisée -->
            <template v-else>
              <div class="info-note">
                <i class="ti ti-info-circle"></i>
                Moyenne de la charge sur toutes les séries de l'exercice, un point par séance réalisée.
              </div>
              <div v-if="courbesProgramme.length === 0" class="empty">
                Pas encore assez de données : il faut au moins deux séances enregistrées.
              </div>
              <div v-for="courbe in courbesProgramme" :key="courbe.nom" class="progression-exo-bloc">
                <CourbeProgression
                  :points="courbe.points"
                  :label="courbe.nom"
                  :unite="courbe.unite"
                  :axe-x="courbe.points.length > 8 ? 'dates' : 'tentatives'"
                />
              </div>
            </template>
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

          <div class="screen feuille">
            <div
              v-for="groupe in grouperExercices(seanceActive.exercices)"
              :key="groupe.key"
              class="exo-item"
            >
              <span class="exo-num">{{ groupe.ordre }}</span>
              <div
                class="exo-group"
                :class="{ 'is-superset': groupe.exercices.length > 1, 'is-complete': isGroupeComplete(groupe) }"
                @click="ouvrirSaisie(groupe)"
              >
                <div class="exo-group-head">
                  <div class="exo-noms-list">
                    <span
                      v-for="(exo, eidx) in groupe.exercices"
                      :key="exo.id"
                      class="exo-nom-inline"
                      :class="{ 'is-optionnel': exo.optionnel }"
                    >
                      <ExerciceImage :src="exo.image_url" :src2="exo.image_url_2" :nom="exo.nom" size="md" />
                      <span class="exo-letter" v-if="groupe.exercices.length > 1">{{ letterFor(eidx) }}</span>
                      {{ exo.nom }}
                      <span v-if="exo.optionnel" class="optionnel-badge">optionnelle</span>
                    </span>
                  </div>
                  <i v-if="isGroupeComplete(groupe)" class="ti ti-circle-check-filled groupe-check"></i>
                </div>

                <div v-if="groupe.exercices[0].series.length === 0" class="empty-series">
                  Aucune série définie.
                </div>

                <!-- Résumé compact : tout le prescrit lisible, la saisie s'ouvre à la demande -->
                <template v-else>
                  <div class="resume-exo" v-for="(exo, eidx) in groupe.exercices" :key="'r' + exo.id">
                    <span class="exo-letter-mini" v-if="groupe.exercices.length > 1">{{ letterFor(eidx) }}</span>
                    <span v-if="resumeExo(exo).uniforme" class="resume-texte">{{ resumeExo(exo).texte }}</span>
                    <div v-else class="resume-series-list">
                      <div v-for="(s, i) in exo.series" :key="s.id" class="resume-ligne">
                        <span class="resume-s">S{{ i + 1 }}</span>
                        <span>{{ valeursSerie(exo, i) || '—' }}</span>
                      </div>
                    </div>
                  </div>

                  <div class="exo-group-foot">
                    <span class="serie-repos" v-if="groupe.exercices[0].series[0]?.temps_repos">
                      <i class="ti ti-clock"></i> {{ groupe.exercices[0].series[0].temps_repos }}
                    </span>
                    <div class="series-dots">
                      <span
                        v-for="i in groupe.exercices[0].series.length"
                        :key="i"
                        class="serie-dot"
                        :class="{ done: isGroupeDone(groupe, i - 1) }"
                      ></span>
                    </div>
                    <button
                      class="btn btn-sm btn-saisir"
                      :class="{ 'btn-primary': !isGroupeComplete(groupe) }"
                      @click="ouvrirSaisie(groupe)"
                    >
                      <i class="ti ti-pencil"></i>
                      Saisir
                    </button>
                  </div>
                </template>
              </div>
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
                @pointerdown="onSaisieSwipeStart"
                @pointerup="onSaisieSwipeEnd"
                @pointercancel="onSaisieSwipeCancel"
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
                  />
                </div>
              </template>

              <template v-else>
              <div
                v-for="serieIdx in groupe.exercices[0].series.length"
                :key="serieIdx"
                class="serie-card"
                :class="{ done: isGroupeDone(groupe, serieIdx - 1) }"
              >
                <div class="serie-head">
                  <span class="serie-label">Série {{ serieIdx }}</span>
                  <span
                    class="serie-repos"
                    v-if="groupe.exercices[0].series[serieIdx - 1]?.temps_repos"
                  >
                    <i class="ti ti-clock"></i> {{ groupe.exercices[0].series[serieIdx - 1].temps_repos }}
                  </span>
                </div>

                <div
                  v-for="(exo, eidx) in groupe.exercices"
                  :key="exo.id"
                  class="serie-exo"
                >
                  <div class="serie-exo-head" v-if="groupe.exercices.length > 1">
                    <span class="exo-letter-mini">{{ letterFor(eidx) }}</span>
                    <span class="serie-exo-nom">{{ exo.nom }}</span>
                  </div>

                  <!-- Prescrit : gros, lisible à 1 m -->
                  <div class="prescrit-bloc">
                    <template v-if="seanceActive.type_seance === 'musculation' || !seanceActive.type_seance">
                      <span class="prescrit-item" v-if="exo.series[serieIdx-1]?.nb_reps">
                        <span class="prescrit-val">{{ exo.series[serieIdx-1].nb_reps }}</span>
                        <span class="prescrit-label">reps</span>
                      </span>
                      <span class="prescrit-item" v-if="exo.series[serieIdx-1]?.poids_cible">
                        <span class="prescrit-val">{{ exo.series[serieIdx-1].poids_cible }}</span>
                        <span class="prescrit-label">charge</span>
                      </span>
                      <span class="prescrit-item" v-if="exo.series[serieIdx-1]?.rm">
                        <span class="prescrit-val">{{ exo.series[serieIdx-1].rm }}</span>
                        <span class="prescrit-label">%RM</span>
                      </span>
                      <span class="prescrit-item" v-if="exo.series[serieIdx-1]?.tempo">
                        <span class="prescrit-val">{{ exo.series[serieIdx-1].tempo }}</span>
                        <span class="prescrit-label">tempo</span>
                      </span>
                    </template>
                    <template v-else-if="seanceActive.type_seance === 'natation' || seanceActive.type_seance === 'athletisme'">
                      <span class="prescrit-item" v-if="exo.series[serieIdx-1]?.metres">
                        <span class="prescrit-val">{{ exo.series[serieIdx-1].metres }}</span>
                        <span class="prescrit-label">mètres</span>
                      </span>
                      <span class="prescrit-item" v-if="exo.series[serieIdx-1]?.intensite">
                        <span class="prescrit-val">{{ exo.series[serieIdx-1].intensite }}</span>
                        <span class="prescrit-label">intensité</span>
                      </span>
                    </template>
                    <template v-else-if="seanceActive.type_seance === 'pliometrie'">
                      <span class="prescrit-item" v-if="exo.series[serieIdx-1]?.bonds">
                        <span class="prescrit-val">{{ exo.series[serieIdx-1].bonds }}</span>
                        <span class="prescrit-label">bonds</span>
                      </span>
                      <span class="prescrit-item" v-if="exo.series[serieIdx-1]?.intensite">
                        <span class="prescrit-val">{{ exo.series[serieIdx-1].intensite }}</span>
                        <span class="prescrit-label">intensité</span>
                      </span>
                    </template>
                  </div>

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
                        <span class="n1-val" v-if="n1.reps_realisees">{{ n1.reps_realisees }}<span class="n1-unit">reps</span></span>
                        <span class="n1-val" v-if="n1.poids_realise">{{ n1.poids_realise }}<span class="n1-unit">kg</span></span>
                      </template>
                      <template v-else-if="seanceActive.type_seance === 'natation' || seanceActive.type_seance === 'athletisme'">
                        <span class="n1-val" v-if="n1.reps_realisees">{{ n1.reps_realisees }}<span class="n1-unit">m</span></span>
                        <span class="n1-val" v-if="n1.poids_realise">{{ n1.poids_realise }}</span>
                      </template>
                      <template v-else-if="seanceActive.type_seance === 'pliometrie'">
                        <span class="n1-val" v-if="n1.reps_realisees">{{ n1.reps_realisees }}<span class="n1-unit">bonds</span></span>
                        <span class="n1-val" v-if="n1.poids_realise">{{ n1.poids_realise }}</span>
                      </template>
                    </div>
                  </template>

                  <!-- Réalisé : 2 champs, clavier numérique quand la donnée l'est.
                       Swipe droit dans le panneau → dernière performance à la place. -->
                  <div class="realise-inputs" v-if="saisieVue === 'saisie'">
                    <template v-if="seanceActive.type_seance === 'musculation' || !seanceActive.type_seance">
                      <div class="log-input-wrap">
                        <input
                          v-model="getLogs(exo.id, serieIdx-1).reps_realisees"
                          :placeholder="exo.series[serieIdx-1]?.nb_reps || 'reps'"
                          inputmode="decimal"
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
                          inputmode="decimal"
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
                        inputmode="decimal"
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
                        inputmode="decimal"
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
                        <div class="historique-inline-head">
                          <span class="historique-inline-date">
                            <i class="ti ti-lock" v-if="!estEnEdition(entree.log)"></i>
                            {{ formatDateCourt(entree.date) }}
                          </span>
                          <span
                            class="historique-inline-etat"
                            :class="{ 'etat-non-fait': !entree.log.fait }"
                            v-if="!estEnEdition(entree.log)"
                          >
                            {{ entree.log.fait ? 'Fait' : 'Non fait' }}
                          </span>
                        </div>
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
                      <span v-else class="historique-inline-vide">Pas d'historique pour cet exercice</span>
                    </template>
                  </div>
                </div>

                <div class="serie-actions" v-if="saisieVue === 'saisie' || historiqueGroupeExiste(groupe, serieIdx)">
                  <button
                    class="btn-serie"
                    :class="etatBoutonSerie(groupe, serieIdx).classe"
                    @click="toggleSerie(groupe, serieIdx)"
                  >
                    <i :class="'ti ' + etatBoutonSerie(groupe, serieIdx).icone"></i>
                    {{ etatBoutonSerie(groupe, serieIdx).label }}
                  </button>
                </div>
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

          <!-- Barre de validation collante : toujours visible, la séance reste
               modifiable même après validation (juste un rappel de progression) -->
          <div class="valider-bar">
            <div class="valider-progress">
              <div class="valider-progress-track">
                <div
                  class="valider-progress-fill"
                  :style="{ width: progressionSeance.total ? (progressionSeance.done / progressionSeance.total * 100) + '%' : '0%' }"
                ></div>
              </div>
              <span class="valider-progress-label">
                {{ progressionSeance.done }}/{{ progressionSeance.total }} séries
              </span>
            </div>
            <button class="btn btn-primary btn-valider" @click="validerSeance">
              <i class="ti ti-check"></i> Valider la séance
            </button>
          </div>
        </template>
      </div>

      <!-- ONGLET PERFORMANCES -->
      <div v-if="onglet === 'performances'" class="performances-page">
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
          </div>
          <div class="performance-valeur" v-if="perf.meilleure_valeur !== null">
            <div class="performance-valeur-main">
              <span class="performance-val">{{ perf.meilleure_valeur }}</span>
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
      <div v-if="onglet === 'poids'" class="poids-page">
        <div class="info-note">
          <i class="ti ti-info-circle"></i>
          Conseil : pesez-vous le matin, à jeun, pour un suivi fiable.
        </div>

        <div class="prog-switcher">
          <button
            class="prog-chip"
            :class="{ active: sousOngletPoids === 'calendrier' }"
            @click="sousOngletPoids = 'calendrier'"
          >
            <i class="ti ti-calendar"></i> Calendrier
          </button>
          <button
            class="prog-chip"
            :class="{ active: sousOngletPoids === 'courbe' }"
            @click="sousOngletPoids = 'courbe'"
          >
            <i class="ti ti-chart-line"></i> Courbe
          </button>
        </div>

        <template v-if="sousOngletPoids === 'calendrier'">
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
        </template>

        <template v-else>
          <!-- axe-x="dates" : une pesée par jour dépasse vite la dizaine de
               points, un label « S1…Sn » par point déborderait de l'écran -->
          <CourbeProgression :points="courbePoids" label="Poids" unite="kg" axe-x="dates" />
        </template>

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

      <!-- ONGLET MES STATS -->
      <MesStats
        v-if="onglet === 'mes-stats'"
        :focus-ressenti="focusRessenti"
        :focus-wellness="focusWellness"
        @focus-consomme="onFocusConsomme"
      />
    </div>
  </AppLayout>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue'
import { useApi } from '../services/api'
// utilisé uniquement pour cloisonner le brouillon de saisie par athlète
// (téléphone partagé, changement de compte)
import { useAuthStore } from '../stores/auth'
import AppLayout from '../components/AppLayout.vue'
import CourbeProgression from '../components/athlete/CourbeProgression.vue'
import MesStats from '../components/athlete/MesStats.vue'
import PopupBanniere from '../components/athlete/PopupBanniere.vue'
import ExerciceImage from '../components/ExerciceImage.vue'

// Distance horizontale minimale pour valider un swipe. Volontairement haute :
// un doigt qui ripe sur un simple appui ne doit jamais changer d'écran.
const SEUIL_SWIPE = 80

// Identifiant d'une tentative de séance. crypto.randomUUID n'existe pas avant
// iOS 15.4 ni hors contexte sécurisé : sans repli, démarrer une séance levait
// une exception et l'écran ne s'ouvrait pas du tout.
const nouvelIdSession = () =>
  crypto.randomUUID?.() ?? `s-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`

// Sous-vues de l'écran programme (onglet Séances)
const VUES_PROGRAMME = [
  { cle: 'seances', label: 'Séances', icone: 'ti-barbell' },
  { cle: 'historique', label: 'Historique', icone: 'ti-history' },
  { cle: 'courbes', label: 'Courbes', icone: 'ti-chart-line' }
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
// Au-delà, une séance interrompue n'a plus de sens à reprendre : le brouillon
// est ignoré puis effacé plutôt que de proposer une reprise vieille d'une semaine.
const DUREE_BROUILLON_MS = 48 * 60 * 60 * 1000

export default {
  components: { AppLayout, CourbeProgression, MesStats, PopupBanniere, ExerciceImage },
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
    const historique = ref([])
    const loadingSeances = ref(false)
    const onglet = ref('mes-stats')
    const popupRessenti = ref(false)
    const popupWellness = ref(false)
    const focusRessenti = ref(false)
    const focusWellness = ref(false)

    const repondreRessenti = () => {
      popupRessenti.value = false
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

    const getLogs = (exoId, serieIdx) => {
      if (!logs.value[exoId]) logs.value[exoId] = {}
      if (!logs.value[exoId][serieIdx]) {
        logs.value[exoId][serieIdx] = { reps_realisees: '', poids_realise: '', fait: false }
      }
      return logs.value[exoId][serieIdx]
    }

    const isGroupeDone = (groupe, serieIdx) => {
      return groupe.exercices.every(exo => getLogs(exo.id, serieIdx).fait)
    }

    const toggleGroupeDone = (groupe, serieIdx) => {
      const isDone = isGroupeDone(groupe, serieIdx)
      const devientFait = !isDone
      groupe.exercices.forEach(exo => {
        const log = getLogs(exo.id, serieIdx)
        // Rien saisi à la validation : on retient la valeur demandée par le
        // prépa (le placeholder grisé) plutôt qu'un champ vide.
        if (devientFait) {
          if (!log.reps_realisees) log.reps_realisees = valeurParDefaut(exo, serieIdx, 'reps_realisees')
          if (!log.poids_realise) log.poids_realise = valeurParDefaut(exo, serieIdx, 'poids_realise')
        }
        log.fait = devientFait
      })

      // Pas de sauvegarde ici : la saisie reste locale (verte, en attente)
      // tant que l'athlète n'a pas cliqué sur « Valider la séance » — sinon
      // des séries isolées se retrouvaient poussées dans l'historique avant
      // que la séance entière soit terminée.

      // Après validation, vérifie si toutes les séries du groupe sont complètes
      if (!isDone) {
        const nbSeries = groupe.exercices[0].series.length
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

    // Toutes les tentatives passées d'un exercice, la plus récente en premier :
    // [[logs de la tentative n-1], [logs de la tentative n-2], ...]
    const tentativesExo = (exo) => {
      const parTentative = {}
      historique.value
        .filter(l => l.exo_nom === exo.nom)
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
    // Détection au relâché uniquement (pas de suivi live) pour ne jamais
    // interférer avec le scroll vertical ou les clics sur inputs/boutons.
    const saisieSwipeState = { startX: 0, startY: 0, pointerId: null }
    const onSaisieSwipeStart = (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return
      if (!e.isPrimary) return
      saisieSwipeState.startX = e.clientX
      saisieSwipeState.startY = e.clientY
      saisieSwipeState.pointerId = e.pointerId
    }
    // cf. onTabSwipeCancel : un pointercancel iOS ne doit jamais être lu
    // comme une fin de geste
    const onSaisieSwipeCancel = () => { saisieSwipeState.pointerId = null }
    const onSaisieSwipeEnd = (e) => {
      if (saisieSwipeState.pointerId !== e.pointerId) return
      saisieSwipeState.pointerId = null
      const dx = e.clientX - saisieSwipeState.startX
      const dy = e.clientY - saisieSwipeState.startY
      if (Math.abs(dy) > Math.abs(dx) + 10) return
      if (dx >= SEUIL_SWIPE) {
        if (saisieVue.value === 'progression') saisieVue.value = 'saisie'
        else if (saisieVue.value === 'saisie') { saisieVue.value = 'historique'; historiqueIndex.value = 0 }
        else if (historiqueIndex.value < nbTentativesGroupe.value - 1) historiqueIndex.value += 1
      } else if (dx <= -SEUIL_SWIPE) {
        if (saisieVue.value === 'historique') {
          if (historiqueIndex.value > 0) historiqueIndex.value -= 1
          else saisieVue.value = 'saisie'
        } else if (saisieVue.value === 'saisie') saisieVue.value = 'progression'
      }
    }

    // Log d'une tentative correspondant à une série précise de l'exercice.
    // Match par serie.id (stable) plutôt que par position dans le tableau :
    // l'API trie par date décroissante, donc la dernière série saisie arrive
    // en tête et un appariement positionnel mélangerait les séries entre elles.
    const logTentativePourSerie = (tentative, exo, serieIdx) => {
      const serieId = exo.series[serieIdx - 1]?.id
      return tentative.find(l => l.serie.id === serieId) || tentative[0]
    }

    // Performance à la tentative n-(historiqueIndex+1) pour cet exercice
    // (hors séries de la séance en cours).
    const historiqueSeriePourExo = (exo, serieIdx) => {
      const tentative = tentativesExo(exo)[historiqueIndex.value]
      if (!tentative) return null
      return { date: tentative[0].date.split('T')[0], log: logTentativePourSerie(tentative, exo, serieIdx) }
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
    const formatDateNumerique = (d) => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })

    // Écart chiffré entre deux valeurs réalisées, prêt à afficher : vert si en
    // hausse, rouge si en baisse. Non numérique (intensité en texte) = pas de
    // comparaison possible.
    const ecartValeurs = (actuel, precedent) => {
      const a = parseNombre(actuel)
      const b = parseNombre(precedent)
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
      if (!tentative) return null
      return ecartValeurs(
        getLogs(exo.id, serieIdx - 1)[champ],
        logTentativePourSerie(tentative, exo, serieIdx)[champ]
      )
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
        const valeur = parseNombre(l[champ])
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

    // Courbe de progression d'un exercice, tout l'historique confondu.
    const courbeExo = (exo, champ) =>
      moyennesParTentative(historique.value.filter(l => l.exo_nom === exo.nom), champ)

    // --- Sous-vues du programme : historique complet et courbes par exercice ---
    const vueProgramme = ref('seances')
    // Profondeur dans l'historique : 0 = la séance la plus récente.
    const histoIndex = ref(0)

    const ouvrirVueProgramme = (cle) => {
      vueProgramme.value = cle
      if (cle === 'seances') return
      // L'historique est préchargé au choix du programme mais peut avoir vieilli
      // (séance validée depuis) : on le rafraîchit à l'ouverture.
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
      historique.value.forEach(l => {
        const creneau = l.seance?.nom || ''
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

    const tentativeAffichee = computed(() => tentativesProgramme.value[histoIndex.value] || null)

    // Voisins immédiats dans la roulette de dates. La liste est triée du plus
    // récent au plus ancien : remonter dans le temps, c'est avancer d'un index.
    const tentativeAncienne = computed(() => tentativesProgramme.value[histoIndex.value + 1] || null)
    const tentativeRecente = computed(() =>
      histoIndex.value > 0 ? tentativesProgramme.value[histoIndex.value - 1] : null
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

    // Swipe sur la roulette : vers la droite on remonte dans le temps, comme
    // si on faisait défiler les dates de gauche à droite. Détection au relâché
    // seulement, pour ne pas gêner le scroll vertical (cf. onSaisieSwipeEnd).
    const histoSwipeState = { startX: 0, startY: 0, pointerId: null }
    const onHistoSwipeStart = (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return
      if (!e.isPrimary) return
      histoSwipeState.startX = e.clientX
      histoSwipeState.startY = e.clientY
      histoSwipeState.pointerId = e.pointerId
    }
    const onHistoSwipeCancel = () => { histoSwipeState.pointerId = null }
    const onHistoSwipeEnd = (e) => {
      if (histoSwipeState.pointerId !== e.pointerId) return
      histoSwipeState.pointerId = null
      const dx = e.clientX - histoSwipeState.startX
      const dy = e.clientY - histoSwipeState.startY
      if (Math.abs(dy) > Math.abs(dx) + 10) return
      if (dx >= SEUIL_SWIPE) histoPlusAncienne()
      else if (dx <= -SEUIL_SWIPE) histoPlusRecente()
    }

    // Référence de comparaison : la fois précédente sur le même créneau (n-1),
    // pas simplement la séance d'avant qui serait souvent un autre entraînement.
    const tentativePrecedente = computed(() => {
      const courante = tentativeAffichee.value
      if (!courante) return null
      const liste = tentativesProgramme.value
      for (let i = histoIndex.value + 1; i < liste.length; i++) {
        if (liste[i].creneau === courante.creneau) return liste[i]
      }
      return null
    })

    // Valeurs réalisées d'une série de l'historique, avec l'écart coloré par
    // rapport à la même série de la fois précédente (vert = mieux, rouge = moins).
    const valeursHistorique = (exoNom, serieIdx, log, type) => {
      const precedent = tentativePrecedente.value?.exercices
        .find(e => e.nom === exoNom)?.series[serieIdx]
      return champsRealises(type)
        .filter(c => log[c.champ])
        .map(c => ({
          champ: c.champ,
          valeur: log[c.champ],
          unite: c.unite,
          diff: precedent?.fait ? ecartValeurs(log[c.champ], precedent[c.champ]) : null
        }))
    }

    // Une courbe par exercice du programme : moyenne de la charge sur toutes ses
    // séries, un point par séance réalisée. Regroupé par nom d'exercice pour
    // qu'un même exercice présent dans plusieurs séances (ou dupliqué d'une
    // semaine à l'autre) ne donne qu'une seule courbe.
    const courbesProgramme = computed(() => {
      const parNom = {}
      historique.value.forEach(l => {
        if (!l.exo_nom) return
        if (!parNom[l.exo_nom]) {
          parNom[l.exo_nom] = {
            nom: l.exo_nom,
            type: typeParSeance.value[l.seance?.id] || 'musculation',
            logs: []
          }
        }
        parNom[l.exo_nom].logs.push(l)
      })
      return Object.values(parNom)
        .map(e => {
          const conf = champCharge(e.type)
          return { nom: e.nom, unite: conf.unite, points: moyennesParTentative(e.logs, conf.champ) }
        })
        .filter(c => c.points.length >= 2)
        .sort((a, b) => a.nom.localeCompare(b.nom))
    })

    // Valeurs prescrites d'une série en une ligne compacte, selon le type de séance
    const valeursSerie = (exo, idx) => {
      const s = exo.series[idx]
      if (!s) return ''
      const t = seanceActive.value?.type_seance || 'musculation'
      const parts = []
      if (t === 'musculation') {
        if (s.nb_reps) parts.push(`${s.nb_reps} reps`)
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

    const sauvegarderSerie = async (groupe, serieIdx) => {
      try {
        for (const exo of groupe.exercices) {
          const serie = exo.series[serieIdx]
          if (!serie) continue
          const log = getLogs(exo.id, serieIdx)
          await api.post(`/series/${serie.id}/logs/`, {
            reps_realisees: log.reps_realisees || null,
            poids_realise: log.poids_realise || null,
            fait: log.fait,
            session_id: sessionSaisieId.value
          })
        }
      } catch (e) {
        // Pas bloquant : la validation finale re-synchronise tout
        console.error('Erreur sauvegarde série:', e)
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
        : { classe: 'btn-todo', icone: 'ti-circle', label: 'Valider la série' }
    }

    const toggleSerie = (groupe, serieIdx) => {
      if (saisieVue.value === 'historique') { toggleGroupeHistoriqueEdition(groupe, serieIdx); return }
      toggleGroupeDone(groupe, serieIdx - 1)
    }

    // Seule suppression possible dans l'historique : la séance entière (tous
    // ses exercices/groupes, pas seulement celui ouvert dans le panneau),
    // pour la tentative actuellement consultée.
    const supprimerSeanceHistorique = async () => {
      const cle = cleTentativeGroupe.value
      if (!cle || !seanceActive.value) return
      if (!confirm('Supprimer cette séance de l\'historique ?')) return

      const idsSeries = new Set(
        (seanceActive.value.exercices || []).flatMap(e => e.series).map(s => s.id)
      )
      const logsASupprimer = historique.value.filter(
        l => idsSeries.has(l.serie.id) && cleTentative(l) === cle
      )
      for (const log of logsASupprimer) {
        await supprimerLog(log.serie.id, log.id)
        historiqueEnEdition.value.delete(log.id)
      }

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
    const seancesAffichees = computed(() => {
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

    const fetchProgrammes = async () => {
      try {
        programmes.value = await api.get('/programmes/')
      } catch (e) {
        console.error('Erreur chargement programmes:', e)
        return
      }
      if (programmes.value.length > 0) await selectProgramme(programmes.value[0])
      // une fois les séances chargées : la reprise a besoin de les retrouver
      proposerReprise()
    }

    const selectProgramme = async (p) => {
      programmeActif.value = p
      seanceActive.value = null
      // l'historique affiché appartenait à l'autre programme
      histoIndex.value = 0
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

    const demarrerSeance = (seance) => {
      seanceActive.value = seance

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
      fetchHistorique()
    }

    const validerSeance = async () => {
      // Valider la séance pousse l'état RÉEL de chaque série dans
      // l'historique — les séries déjà validées une par une gardent leurs
      // valeurs réelles (défauts déjà appliqués par toggleGroupeDone), les
      // séries jamais validées sont enregistrées explicitement "non fait"
      // (aucun remplissage automatique) : le bouton fige ce qui a été fait,
      // il ne complète pas ce qui ne l'a pas été.
      const groupes = grouperExercices(seanceActive.value.exercices)
      for (const groupe of groupes) {
        const nbSeries = groupe.exercices[0].series.length
        for (let i = 0; i < nbSeries; i++) {
          await sauvegarderSerie(groupe, i)
        }
      }

      // Trace la complétion tout de suite (méthode de Foster, monitoring) —
      // sans rpe/durée : la séance se valide quand même, le ressenti reste
      // saisissable après coup (cf. MesStats.vue), jamais bloquant ici.
      try {
        await api.post(`/seances/${seanceActive.value.id}/charge`, { session_id: sessionSaisieId.value })
      } catch (e) {
        console.error('Erreur enregistrement complétion séance:', e)
      }

      seancesCompletees.value.add(seanceActive.value.id)
      seanceEnCoursId.value = null
      logs.value = {}
      // la saisie est partie au serveur : le brouillon n'a plus lieu d'être
      effacerBrouillon()
      debutSaisie.value = null
      seanceActive.value = null
      popupRessenti.value = true
      // seancesAffichees recalcule alors automatiquement : ce créneau montrera
      // la semaine suivante programmée par le prépa (ou reboucle sur la
      // dernière si la programmation s'arrête là).
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
    const sousOngletPoids = ref('calendrier')
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

    const poidsPourDate = (date) => poidsParDate.value[date]?.poids ?? null

    const entreeExistante = computed(() => dateSaisiePoids.value ? poidsParDate.value[dateSaisiePoids.value] : null)

    const parseNombre = (v) => parseFloat(String(v).replace(',', '.'))

    const poidsValide = computed(() => {
      const v = parseNombre(poidsSaisi.value)
      return !isNaN(v) && v > 0
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
      poidsSaisi.value = poidsParDate.value[date]?.poids ?? ''
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
    watch(seanceActive, (s) => { if (!s) fermerSaisie() })

    // Swipe horizontal entre onglets (Séances <-> Performances <-> Poids), sur
    // tout le contenu du dashboard. Le panneau de saisie a son propre swipe
    // interne qui stoppe la propagation, donc les deux ne se marchent pas dessus.
    const ONGLETS = ['mes-stats', 'programme', 'performances', 'poids']
    const tabSwipeState = { startX: 0, startY: 0, pointerId: null }
    const onTabSwipeStart = (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return
      // un second doigt (pinch, paume posée sur l'écran) ne doit pas redéfinir
      // l'origine du geste en cours : son relâché produirait un dx énorme
      if (!e.isPrimary) return
      tabSwipeState.startX = e.clientX
      tabSwipeState.startY = e.clientY
      tabSwipeState.pointerId = e.pointerId
    }
    const onTabSwipeEnd = (e) => {
      if (tabSwipeState.pointerId !== e.pointerId) return
      tabSwipeState.pointerId = null
      const dx = e.clientX - tabSwipeState.startX
      const dy = e.clientY - tabSwipeState.startY
      if (Math.abs(dy) > Math.abs(dx) + 10) return
      const idx = ONGLETS.indexOf(onglet.value)
      if (dx <= -SEUIL_SWIPE && idx < ONGLETS.length - 1) onglet.value = ONGLETS[idx + 1]
      else if (dx >= SEUIL_SWIPE && idx > 0) onglet.value = ONGLETS[idx - 1]
    }
    // iOS annule le pointeur dès que le navigateur prend la main (début de
    // scroll, appui long, zoom) et dispatche pointercancel sans coordonnées
    // utilisables. L'évaluer comme une fin de geste transformait un simple
    // appui en swipe : depuis (0, 0), dx vaut -startX, soit largement plus que
    // le seuil pour un appui au centre de l'écran. Un pointeur annulé n'est
    // jamais un geste : on abandonne, sans rien interpréter.
    const onTabSwipeCancel = () => { tabSwipeState.pointerId = null }

    onMounted(fetchProgrammes)

    const isGroupeComplete = (groupe) => {
      const nbSeries = groupe.exercices[0].series.length
      if (nbSeries === 0) return false
      for (let i = 0; i < nbSeries; i++) {
        if (!isGroupeDone(groupe, i)) return false
      }
      return true
    }

    // Progression de la séance en cours (présentation uniquement) :
    // alimente la barre collante « x/y séries — Valider la séance »
    const progressionSeance = computed(() => {
      if (!seanceActive.value) return { done: 0, total: 0 }
      let done = 0
      let total = 0
      grouperExercices(seanceActive.value.exercices).forEach(groupe => {
        const nb = groupe.exercices[0].series.length
        total += nb
        for (let i = 0; i < nb; i++) {
          if (isGroupeDone(groupe, i)) done++
        }
      })
      return { done, total }
    })

    return {
      programmes, programmeActif, seances, seanceActive, logs, historique,
      loadingSeances, onglet,
      seancesAffichees,
      labelType, letterFor, grouperExercices,
      getLogs, isGroupeDone,
      estEnEdition,
      etatBoutonSerie, toggleSerie, historiqueGroupeExiste, supprimerSeanceHistorique,
      selectProgramme, demarrerSeance, validerSeance,
      isGroupeComplete,
      progressionSeance,
      groupeSaisie, ouvrirSaisie, fermerSaisie, valeursSerie, resumeExo,
      saisieVue, historiqueIndex, nbTentativesGroupe, retourSaisie,
      onSaisieSwipeStart, onSaisieSwipeEnd, onSaisieSwipeCancel,
      onTabSwipeStart, onTabSwipeEnd, onTabSwipeCancel,
      historiqueSeriePourExo, n1SeriePourExo, formatDateCourt, formatDateNumerique, diffVsHistorique,
      champsGraphique, courbeExo,
      VUES_PROGRAMME, vueProgramme, ouvrirVueProgramme,
      tentativesProgramme, tentativeAffichee, tentativePrecedente,
      histoIndex, histoPlusAncienne, histoPlusRecente, valeursHistorique, courbesProgramme,
      tentativeAncienne, tentativeRecente, sensHisto,
      onHistoSwipeStart, onHistoSwipeEnd, onHistoSwipeCancel,
      performances, toggleSuivi, toggleSuiviPerformance, dateTentativeGroupe,
      sousOngletPoids, dateSaisiePoids, poidsSaisi, erreurPoids, poidsPourDate, entreeExistante, poidsValide,
      labelMois, joursGrille, courbePoids, moisPrecedent, moisSuivant, formatDateLongue,
      ouvrirSaisiePoids, fermerSaisiePoids, enregistrerPoids, supprimerPoids,
      popupRessenti, popupWellness, focusRessenti, focusWellness,
      repondreRessenti, repondreWellness, onFocusConsomme,
      brouillonPropose, sousTitreBrouillon, reprendreBrouillon, abandonnerBrouillon
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
.prog-switcher { display: flex; gap: var(--spacing-sm); overflow-x: auto; flex-shrink: 0; padding-bottom: 2px; }
.prog-chip {
  min-height: var(--tap-min);
  padding: 0 var(--spacing-lg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  background: var(--color-bg);
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
}
.prog-chip.active {
  background: var(--color-primary-light);
  border-color: var(--color-primary);
  color: var(--color-primary-text);
  font-weight: 600;
}

/* --- Cartes séance --- */
.seance-card {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-lg);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  cursor: pointer;
  text-align: left;
  flex-shrink: 0;
  width: 100%;
  transition: border-color 0.1s;
}
.seance-card:hover { border-color: var(--color-primary); }
.seance-card-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6px; }
.seance-card-titre { font-size: var(--font-size-base); font-weight: 600; color: var(--color-text); }
.seance-card-meta { display: flex; align-items: center; gap: var(--spacing-sm); flex-wrap: wrap; }
.seance-card-count { font-size: var(--font-size-xs); color: var(--color-text-secondary); }
.seance-card-chevron { color: var(--color-text-muted); font-size: var(--font-size-lg); flex-shrink: 0; }

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

/* --- Sous-vue Historique du programme --- */
.histo-nav {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  flex-shrink: 0;
}
.histo-nav-info { flex: 1; min-width: 0; text-align: center; }
.histo-nav-titre {
  font-size: var(--font-size-base);
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.histo-nav-meta {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 3px;
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
}
.histo-nav-pager { color: var(--color-text-muted); }

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

/* --- Feuille de séance --- */
.feuille { gap: var(--spacing-lg); padding-bottom: var(--spacing-lg); }

.exo-group {
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  flex-shrink: 0;
  cursor: pointer;
}
.exo-group.is-superset { border-color: var(--color-superset-border); border-left: 4px solid var(--color-primary); }
.exo-group.is-complete { border-color: var(--color-valid-border); background: var(--color-valid-bg-soft); }

.exo-item { display: flex; align-items: center; gap: var(--spacing-sm); }
.exo-item .exo-group { flex: 1; min-width: 0; }

.exo-group-head { display: flex; align-items: flex-start; gap: var(--spacing-md); }
.exo-group-head .exo-noms-list { flex: 1; }
.groupe-check { color: var(--color-valid-text); font-size: 24px; flex-shrink: 0; }

.exo-noms-list { display: flex; flex-direction: column; gap: var(--spacing-sm); }
.exo-nom-inline {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text);
}
.exo-nom-inline.is-optionnel { color: var(--color-text-secondary); }
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

.exo-num, .exo-letter {
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
}
.exo-num { border-radius: var(--radius-full); }
.exo-letter { border-radius: var(--radius-sm); background: var(--color-primary); color: var(--color-on-primary); }

/* --- Cartes série --- */
.serie-card {
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--spacing-md);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}
.serie-card.done { background: var(--color-valid-bg-soft); border-color: var(--color-valid-border); }

.serie-head { display: flex; align-items: center; justify-content: space-between; gap: var(--spacing-sm); }
.serie-label { font-size: var(--font-size-sm); font-weight: 700; color: var(--color-superset-text); }
.serie-repos {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-primary-text);
  background: var(--color-primary-light);
  padding: 3px 10px;
  border-radius: var(--radius-full);
}

.serie-exo { display: flex; flex-direction: column; gap: var(--spacing-sm); }
.serie-exo + .serie-exo { padding-top: var(--spacing-sm); border-top: 1px dashed var(--color-border); }
.serie-exo-head { display: flex; align-items: center; gap: var(--spacing-sm); }
.serie-exo-nom { font-size: var(--font-size-sm); font-weight: 600; color: var(--color-text-body); }
.exo-letter-mini {
  font-size: var(--font-size-xs);
  font-weight: 700;
  color: var(--color-on-primary);
  background: var(--color-primary);
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  flex-shrink: 0;
}

/* Prescrit : valeurs en gros, labels discrets */
.prescrit-bloc { display: flex; flex-wrap: wrap; gap: var(--spacing-lg); align-items: baseline; }
.prescrit-item { display: inline-flex; align-items: baseline; gap: 5px; }
.prescrit-val { font-size: var(--font-size-xs); font-weight: 700; color: var(--color-text); line-height: 1.1; }
.prescrit-label {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

/* N-1 : dernière performance connue, discrète sous le prescrit */
.n1-bloc { display: flex; flex-wrap: wrap; align-items: baseline; gap: 6px; }
.n1-tag {
  font-size: 10px;
  font-weight: 700;
  color: var(--color-text-muted);
  background: var(--color-bg-tertiary);
  padding: 1px 6px;
  border-radius: var(--radius-sm);
  letter-spacing: 0.3px;
}
.n1-val { font-size: var(--font-size-xs); font-weight: 600; color: var(--color-text-muted); }
.n1-unit { font-size: 10px; font-weight: 500; margin-left: 2px; }
.n1-val.n1-nf { color: var(--color-danger-text); }

/* Réalisé */
.realise-inputs { display: flex; gap: var(--spacing-sm); }
.historique-inline { display: flex; flex-direction: column; gap: 6px; }
.historique-inline-date {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: var(--font-size-xs);
  font-weight: 600;
  color: var(--color-text-secondary);
  flex-shrink: 0;
  text-transform: capitalize;
}
.historique-inline-vide { font-size: var(--font-size-xs); color: var(--color-text-muted); font-style: italic; }
.historique-inline-head { display: flex; align-items: center; justify-content: space-between; gap: var(--spacing-sm); }
.historique-inline-etat {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: var(--font-size-xs);
  font-weight: 600;
  padding: 3px 10px;
  border-radius: var(--radius-full);
  border: 1px solid var(--color-valid-border);
  background: var(--color-valid-bg);
  color: var(--color-valid-text-strong);
}
.historique-inline-etat.etat-non-fait {
  background: var(--color-bg-tertiary);
  border-color: var(--color-border);
  color: var(--color-text-secondary);
}
.log-input-wrap { position: relative; flex: 1; min-width: 0; }
.log-input {
  height: 32px;
  padding: 0 var(--spacing-sm);
  font-size: var(--font-size-xs);
  font-weight: 600;
  width: 100%;
  min-width: 0;
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-md);
  background: var(--color-bg);
  text-align: center;
}
.log-input:focus { outline: none; border-color: var(--color-primary); }
.log-input-diff {
  position: absolute;
  top: -8px;
  right: -6px;
  font-size: 10px;
  font-weight: 700;
  padding: 1px 5px;
  border-radius: var(--radius-full, 999px);
  line-height: 1.4;
  pointer-events: none;
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
.log-input-locked:focus { border-color: var(--color-border); }
.log-input-locked.done {
  background: var(--color-valid-bg-soft);
  color: var(--color-valid-text-strong);
  border-color: var(--color-valid-border);
}

/* Bouton valider série */
.btn-serie {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 32px;
  padding: 0 var(--spacing-md);
  border-radius: var(--radius-md);
  cursor: pointer;
  font-size: var(--font-size-xs);
  font-weight: 600;
  border: 1px solid var(--color-border-strong);
  background: var(--color-bg);
  color: var(--color-text-body);
  width: 100%;
}
.btn-todo:hover { color: var(--color-primary-dark); border-color: var(--color-primary); }
.btn-done { background: var(--color-primary); color: var(--color-on-primary); border-color: var(--color-primary-dark); }
.btn-done:hover { background: var(--color-primary-dark); }

.serie-actions { display: flex; gap: var(--spacing-sm); }
.serie-actions .btn-serie { flex: 1; }

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

.empty-series { font-size: var(--font-size-sm); color: var(--color-text-muted); font-style: italic; }

/* --- Vue d'ensemble compacte --- */
.resume-exo { display: flex; align-items: baseline; gap: var(--spacing-sm); }
.resume-texte {
  font-size: var(--font-size-xs);
  font-weight: 500;
  color: var(--color-text-body);
  font-variant-numeric: tabular-nums;
}
.resume-series-list { display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 0; }
.resume-ligne {
  display: flex;
  gap: var(--spacing-sm);
  font-size: var(--font-size-xs);
  color: var(--color-text-body);
  align-items: baseline;
}
.resume-s { font-size: var(--font-size-xs); font-weight: 700; color: var(--color-superset-text); min-width: 24px; }

.exo-group-foot {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding-top: var(--spacing-sm);
  border-top: 1px solid var(--color-border);
}
.series-dots { display: flex; gap: 5px; flex: 1; flex-wrap: wrap; align-items: center; }
.serie-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--color-bg-tertiary);
  border: 1px solid var(--color-border-strong);
}
.serie-dot.done { background: var(--color-valid-text); border-color: var(--color-valid-text); }
.btn-saisir {
  flex-shrink: 0;
  min-height: 30px;
  height: 30px;
  padding: 0 var(--spacing-sm);
  font-size: var(--font-size-xs);
}

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
  .saisie-sheet { border-radius: var(--radius-xl); max-height: 85vh; }
}

/* --- Barre de validation collante --- */
.valider-bar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: var(--spacing-lg);
  padding: var(--spacing-md) var(--spacing-lg);
  background: var(--color-bg);
  border-top: 1px solid var(--color-border);
}
.valider-progress { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
.valider-progress-track {
  height: 6px;
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-full);
  overflow: hidden;
}
.valider-progress-fill {
  height: 100%;
  background: var(--color-primary);
  border-radius: var(--radius-full);
  transition: width 0.2s;
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
.performance-valeur { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; flex-shrink: 0; }
.performance-valeur-main { display: flex; align-items: baseline; gap: 4px; }
.performance-valeur-sub { display: flex; align-items: center; gap: 6px; }
.performance-val { font-size: var(--font-size-lg); font-weight: 700; color: var(--color-primary-text); }
.performance-unite { font-size: var(--font-size-xs); color: var(--color-text-secondary); }
.performance-reps { font-size: var(--font-size-xs); color: var(--color-text-muted); }
.performance-date { font-size: var(--font-size-xs); color: var(--color-text-muted); }
.performance-vide { font-size: var(--font-size-xs); color: var(--color-text-muted); font-style: italic; flex-shrink: 0; }

/* --- Desktop : plus d'air, la feuille reste une colonne --- */
@media (min-width: 769px) {
  .screen, .performances-page { padding: var(--spacing-2xl); }
  .valider-bar { padding: var(--spacing-md) var(--spacing-2xl); }
  .valider-bar, .seance-topbar { padding-left: max(var(--spacing-2xl), calc((100% - 720px) / 2)); padding-right: max(var(--spacing-2xl), calc((100% - 720px) / 2)); }
  .realise-inputs { max-width: 360px; }
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
</style>
