<template>
  <div class="fiche-athlete" @pointerdown="onSwipeStart" @pointerup="onSwipeEnd" @pointercancel="onSwipeCancel">
    <div class="fiche-topbar">
      <button class="btn btn-sm btn-ghost retour-fiche" @click="$emit('fermer')">
        <i class="ti ti-arrow-left"></i> Athlètes
      </button>
      <div class="fiche-topbar-actions">
        <button class="btn btn-sm" @click="modalGroupes = true"><i class="ti ti-tags"></i> Groupes</button>
        <button class="btn btn-sm btn-ghost btn-retirer" @click="retirerDuCercle"><i class="ti ti-user-minus"></i> Retirer</button>
      </div>
    </div>

    <div class="fiche-header" :class="`activite-${niveauActivite(athlete.resume)}`">
      <span class="fiche-avatar">
        <img v-if="photoUrl" class="avatar-photo" :src="urlApi(photoUrl)" alt="" />
        <template v-else>{{ initiales(athlete.nom) }}</template>
        <span class="avatar-pastille" :title="LABELS_NIVEAU_ACTIVITE[niveauActivite(athlete.resume)]"></span>
      </span>
      <div class="fiche-header-info">
        <h3>
          {{ athlete.nom }}
          <span class="badge badge-gray org-badge" v-if="estSuperPrepa">{{ athlete.organisation?.nom || 'Indépendant' }}</span>
        </h3>
        <div class="athlete-email">{{ athlete.email }}</div>
        <div class="fiche-activite" v-if="athlete.resume">
          <span class="activite-libelle">{{ libelleActivite(athlete.resume) }}</span>
          <span class="activite-jours" v-if="athlete.resume.jours_actifs_28j">
            · {{ athlete.resume.jours_actifs_28j }} j actif{{ athlete.resume.jours_actifs_28j > 1 ? 's' : '' }} sur {{ FENETRE_ACTIVITE }}
          </span>
        </div>
        <div class="groupes-badges" v-if="groupesDe.length > 0">
          <span
            class="groupe-badge"
            v-for="g in groupesDe"
            :key="g.id"
            :style="{ background: (g.couleur || '#7F77DD') + '22', color: g.couleur || 'var(--color-primary-dark)' }"
          >{{ g.nom }}</span>
        </div>
      </div>
      <span
        class="acwr-badge"
        v-if="athlete.resume"
        :class="'zone-' + (athlete.resume.acwr.zone || 'insuffisant')"
        title="ACWR : charge des 7 derniers jours / moyenne des 28"
      >
        <small>ACWR</small>{{ athlete.resume.acwr.valeur !== null ? athlete.resume.acwr.valeur.toFixed(2).replace('.', ',') : '—' }}
      </span>
      <div class="fiche-signaux" v-if="athlete.resume && (athlete.resume.signaux.length > 0 || athlete.resume.blessures_en_cours > 0)">
        <span class="signal signal-blessure" v-if="athlete.resume.blessures_en_cours > 0">
          <i class="ti ti-bandage"></i>
          {{ athlete.resume.blessures_en_cours }} blessure{{ athlete.resume.blessures_en_cours > 1 ? 's' : '' }} en cours
        </span>
        <span class="signal" v-for="(s, i) in athlete.resume.signaux" :key="i">
          <i class="ti ti-alert-triangle"></i> {{ s }}
        </span>
      </div>
    </div>

    <!-- Profil renseigné par l'athlète : âge, sports, objectif, et de quoi le
         joindre. Rien ne s'affiche tant qu'il n'a rien rempli. -->
    <div v-if="profil && lignesProfil.length" class="fiche-profil">
      <span v-for="l in lignesProfil" :key="l.cle" class="fiche-profil-item">
        <i class="ti" :class="l.icone"></i>
        <a v-if="l.lien" :href="l.lien">{{ l.texte }}</a>
        <template v-else>{{ l.texte }}</template>
      </span>
    </div>

    <p v-if="erreurFiche" class="error erreur-fiche" role="alert">
      <i class="ti ti-alert-triangle"></i> {{ erreurFiche }}
      <button type="button" class="erreur-fiche-fermer" aria-label="Fermer" @click="erreurFiche = ''"><i class="ti ti-x"></i></button>
    </p>

    <GroupesManagerModal
      v-if="modalGroupes"
      :groupes="groupes"
      :monCercle="monCercle"
      :athleteFocus="athlete"
      @fermer="modalGroupes = false"
      @modifie="$emit('modifie')"
    />

    <div class="tabs" role="tablist">
      <button
        v-for="o in ONGLETS"
        :key="o.cle"
        :ref="(el) => setTabRef(o.cle, el)"
        type="button"
        role="tab"
        class="tab"
        :class="{ active: sousOnglet === o.cle }"
        :aria-selected="sousOnglet === o.cle"
        @click="allerA(o.cle)"
      >
        <i class="ti" :class="o.icone"></i> {{ o.label }}
        <span class="tab-pastille" v-if="o.cle === 'blessures' && nbBlessuresEnCours > 0">{{ nbBlessuresEnCours }}</span>
      </button>
    </div>

    <!-- APERÇU : monitoring (charge, ACWR, wellness) -->
    <div v-if="sousOnglet === 'apercu'" class="tab-content">
      <div v-if="loadingApercu" class="empty">Chargement...</div>
      <template v-else-if="detail">
        <div class="stat-card">
          <GraphiqueAcwrZones :points="pointsAcwr" :actuel="detail.acwr_actuel" />
        </div>
        <div class="detail-grid">
          <div class="stat-card">
            <CourbeProgression :points="detail.charges_quotidiennes.map(p => ({ date: p.date, valeur: p.valeur }))" label="Charge quotidienne" unite=" UA" axe-x="dates" />
          </div>
          <div class="stat-card">
            <CourbeProgression :points="detail.charges_hebdomadaires.map(p => ({ date: p.date, valeur: p.valeur }))" label="Charge hebdomadaire (glissante)" unite=" UA" axe-x="dates" />
          </div>
        </div>
        <div class="stat-card">
          <GraphiqueDouble :points="pointsAigueChronique" label="Charge aiguë vs chronique" label-a="Aiguë (7j)" label-b="Chronique (28j)" />
        </div>
        <div class="detail-grid">
          <div class="stat-card">
            <CourbeProgression :points="pointsMonotonie" label="Monotonie" unite="" axe-x="dates" :hausse-favorable="false" />
          </div>
          <div class="stat-card">
            <CourbeProgression :points="pointsContrainte" label="Contrainte (strain)" unite=" UA" axe-x="dates" :hausse-favorable="false" />
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-card-titre">Wellness — Hooper Index</div>
          <CourbeProgression :points="pointsHooper" label="Hooper Index (4 à 28, plus bas = mieux)" unite="" axe-x="dates" :hausse-favorable="false" />
          <template v-if="dernierWellness">
            <div class="stat-card-titre stat-card-titre-sm">Dernier relevé — {{ formatDateCourt(dernierWellness.date) }}</div>
            <GraphiqueBarres :barres="barresDernierWellness" unite="/7" />
          </template>
        </div>
        <div class="stat-card">
          <div class="stat-card-titre">
            Sommeil — durée
            <span class="sommeil-badge" :class="'sommeil-' + detail.sommeil.niveau" v-if="detail.sommeil.niveau">
              {{ labelNiveauSommeil(detail.sommeil.niveau) }}
            </span>
          </div>
          <CourbeProgression :points="pointsSommeil" label="Heures par nuit" unite=" h" axe-x="dates" />
          <div class="sommeil-resume" v-if="detail.sommeil.statut === 'ok'">
            <span>Moyenne 7 j : <strong>{{ formatHeures(detail.sommeil.moyenne) }}</strong></span>
            <span>Nuits &lt; 7 h : <strong>{{ detail.sommeil.nuits_courtes }} / {{ detail.sommeil.nuits_renseignees }}</strong></span>
            <span>Dette vs 8 h : <strong>{{ formatHeures(detail.sommeil.dette) }}</strong></span>
          </div>
          <p class="stat-card-note" v-else>
            {{ detail.sommeil.nuits_renseignees }} nuit{{ detail.sommeil.nuits_renseignees > 1 ? 's' : '' }} renseignée{{ detail.sommeil.nuits_renseignees > 1 ? 's' : '' }} sur les 7 dernières :
            pas assez pour une lecture chronique (4 minimum).
          </p>
          <p class="stat-card-note">
            C'est le déficit installé sur plusieurs nuits qui est associé au risque de blessure, pas une mauvaise nuit isolée.
          </p>
        </div>
      </template>
    </div>

    <!-- PROGRAMME : programmes assignés, dépliables jusqu'aux exercices -->
    <div v-if="sousOnglet === 'programme'" class="tab-content">
      <div class="prog-topbar">
        <span class="prog-topbar-titre">{{ programmesAssignes.length }} programme{{ programmesAssignes.length > 1 ? 's' : '' }} assigné{{ programmesAssignes.length > 1 ? 's' : '' }}</span>
        <button class="btn btn-sm btn-primary" @click="modalAjoutProgramme = true"><i class="ti ti-plus"></i> Ajouter</button>
      </div>

      <div v-if="programmesAssignes.length === 0" class="empty">
        Aucun programme assigné à cet athlète. Utilisez « Ajouter » pour lui en attribuer un.
      </div>

      <div v-for="p in programmesAssignes" :key="p.id" class="prog-block">
        <button type="button" class="prog-head" @click="basculerProgramme(p)">
          <span class="type-icone type-icone-programme"><i class="ti ti-layout-grid"></i></span>
          <span class="bloc-info">
            <span class="bloc-titre">
              <span class="prog-nom">{{ p.nom }}</span>
              <span class="badge" :class="p.statut === 'actif' ? 'badge-green' : 'badge-gray'">{{ p.statut }}</span>
            </span>
            <span class="bloc-meta" v-if="seancesParProgramme[p.id]">
              <span>{{ seancesParProgramme[p.id].length }} séance{{ seancesParProgramme[p.id].length > 1 ? 's' : '' }}</span>
              <span class="meta-sep">·</span>
              <span>{{ semainesDuProgramme(p.id).length }} semaine{{ semainesDuProgramme(p.id).length > 1 ? 's' : '' }}</span>
            </span>
          </span>
          <i class="ti prog-chevron" :class="programmesOuverts.has(p.id) ? 'ti-chevron-up' : 'ti-chevron-down'"></i>
        </button>

        <div class="prog-actions">
          <button class="btn btn-sm" @click="$emit('ouvrir-programme', p)"><i class="ti ti-pencil"></i> Voir / éditer</button>
          <button class="btn btn-sm btn-danger" :disabled="enCours.has(p.id)" @click="retirerProgramme(p)">Retirer</button>
        </div>

        <div class="prog-body" v-if="programmesOuverts.has(p.id)">
          <div v-if="loadingSeances.has(p.id) && !seancesParProgramme[p.id]" class="empty">Chargement...</div>
          <div v-else-if="semainesDuProgramme(p.id).length === 0" class="empty">Ce programme ne contient aucune séance.</div>

          <div v-for="semaine in semainesDuProgramme(p.id)" :key="semaine.numero" class="prog-semaine">
            <div class="prog-semaine-titre">Semaine {{ semaine.numero }}</div>

            <div v-for="seance in semaine.seances" :key="seance.id" class="seance-prog-block">
              <button type="button" class="seance-prog-head" @click="basculerSeanceProg(seance.id)">
                <span class="type-icone" :class="`type-icone-${typeSeance(seance.type_seance)}`">
                  <i class="ti" :class="iconeTypeSeance(seance.type_seance)"></i>
                </span>
                <span class="bloc-info">
                  <span class="bloc-titre">
                    <span class="seance-prog-nom">{{ seance.nom }}</span>
                    <span class="exo-count-badge">{{ seance.exercices.length }} exo{{ seance.exercices.length > 1 ? 's' : '' }}</span>
                  </span>
                  <span class="bloc-meta">
                    <span class="type-badge" :class="`type-badge-${typeSeance(seance.type_seance)}`">{{ labelTypeSeance(seance.type_seance) }}</span>
                    <span class="meta-jour" v-if="seance.jour">{{ seance.jour }}</span>
                  </span>
                </span>
                <i class="ti seance-prog-chevron" :class="seancesOuvertes.has(seance.id) ? 'ti-chevron-up' : 'ti-chevron-down'"></i>
              </button>

              <div class="seance-prog-body" v-if="seancesOuvertes.has(seance.id)">
                <div v-if="seance.exercices.length === 0" class="empty">Aucun exercice.</div>
                <div
                  v-for="groupe in grouperExosSession(seance.exercices)"
                  :key="groupe.key"
                  class="exo-groupe-log"
                  :class="{ 'is-superset': groupe.exercices.length > 1 }"
                >
                  <div v-if="groupe.exercices.length > 1" class="superset-banner">
                    <i class="ti ti-link"></i>
                    <span>{{ labelTypeGroupe(typeGroupe(groupe)) }} · {{ groupe.exercices.length }} exercices</span>
                  </div>
                  <div v-for="(exo, eidx) in groupe.exercices" :key="exo.id" class="exo-bloc">
                    <div class="exo-header">
                      <span class="exo-letter" v-if="groupe.exercices.length > 1">{{ letterFor(eidx) }}</span>
                      <div class="exo-num" v-else>{{ exo.ordre }}</div>
                      <span class="exo-name">{{ exo.nom }}</span>
                      <span class="exo-count-badge">{{ exo.series.length }} série{{ exo.series.length > 1 ? 's' : '' }}</span>
                    </div>
                    <div class="series-chips" v-if="exo.series.length > 0">
                      <span class="serie-chip" v-for="(serie, sidx) in exo.series" :key="serie.id">
                        <span class="serie-chip-num">S{{ sidx + 1 }}</span>{{ resumeSerie(serie, seance.type_seance) }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AssignerProgrammeModal
        v-if="modalAjoutProgramme"
        :programmes="programmesDisponibles"
        :enCours="enCours"
        @fermer="modalAjoutProgramme = false"
        @assigner="assignerProgramme"
      />
    </div>

    <!-- HISTORIQUE : séances réalisées (prescrit vs réalisé) et courbes -->
    <div v-if="sousOnglet === 'historique'" class="tab-content">
      <div v-if="programmesAssignes.length === 0" class="empty">Aucun programme assigné à cet athlète.</div>
      <template v-else>
        <div class="histo-filtres">
          <select v-if="programmesAssignes.length > 1" v-model="programmeLogsId" class="select-histo">
            <option v-for="p in programmesAssignes" :key="p.id" :value="p.id">{{ p.nom }}</option>
          </select>
          <select v-if="nomsSeances.length > 1" v-model="seanceFiltre" class="select-histo">
            <option value="toutes">Toutes les séances</option>
            <option v-for="nom in nomsSeances" :key="nom" :value="nom">{{ nom }}</option>
          </select>
        </div>

        <div v-if="loadingLogs" class="empty">Chargement...</div>
        <div v-else-if="logsGroupes.length === 0" class="empty">Aucune séance réalisée par cet athlète sur ce programme.</div>
        <template v-else>
          <div class="histo-resume">
            <div class="histo-stat">
              <span class="histo-stat-valeur">{{ resumeHistorique.nbSessions }}</span>
              <span class="histo-stat-label">séances réalisées</span>
            </div>
            <div class="histo-stat">
              <span class="histo-stat-valeur" :class="classeTaux(resumeHistorique.taux)">{{ resumeHistorique.taux }}%</span>
              <span class="histo-stat-label">séries réalisées ({{ resumeHistorique.faites }}/{{ resumeHistorique.total }})</span>
            </div>
            <div class="histo-stat">
              <span class="histo-stat-valeur histo-stat-periode">{{ resumeHistorique.periode }}</span>
              <span class="histo-stat-label">période couverte</span>
            </div>
          </div>

          <div class="histo-switcher">
            <button class="histo-chip" :class="{ active: vueHistorique === 'seances' }" @click="vueHistorique = 'seances'">
              <i class="ti ti-list-details"></i> Séances
            </button>
            <button class="histo-chip" :class="{ active: vueHistorique === 'courbes' }" @click="vueHistorique = 'courbes'">
              <i class="ti ti-chart-line"></i> Courbes
            </button>
          </div>

          <div v-if="sessionsFiltrees.length === 0" class="empty">Aucune séance réalisée pour ce filtre.</div>

          <!-- VUE COURBES : progression par exercice sur tout l'historique filtré -->
          <template v-else-if="vueHistorique === 'courbes'">
            <div v-if="courbesHistorique.length === 0" class="empty">
              Il faut au moins deux séances réalisées avec le même exercice pour tracer une courbe.
            </div>
            <div class="stat-card" v-for="courbe in courbesHistorique" :key="courbe.nom">
              <CourbeProgression
                :points="courbe.points"
                :label="`${courbe.nom} — ${courbe.label}`"
                :unite="courbe.unite"
                :axe-x="courbe.points.length > 8 ? 'dates' : 'tentatives'"
              />
            </div>
          </template>

          <!-- VUE SÉANCES : une carte repliable par séance réalisée -->
          <template v-else>
            <div v-for="session in sessionsFiltrees" :key="session.key" class="session-block">
              <button type="button" class="session-head" @click="basculerSession(session.key)">
                <span class="type-icone" :class="`type-icone-${typeSeance(session.typeSeance)}`">
                  <i class="ti" :class="iconeTypeSeance(session.typeSeance)"></i>
                </span>
                <span class="bloc-info">
                  <span class="bloc-titre">
                    <span class="session-nom">{{ session.seanceNom }}</span>
                    <span class="taux-badge" :class="classeTaux(session.taux)">{{ session.faites }}/{{ session.total }} séries</span>
                  </span>
                  <span class="bloc-meta">
                    <span class="session-date">{{ formatDateCourte(session.date) }}</span>
                    <span class="type-badge" :class="`type-badge-${typeSeance(session.typeSeance)}`">{{ labelTypeSeance(session.typeSeance) }}</span>
                    <span v-if="session.semaine">Semaine {{ session.semaine }}</span>
                  </span>
                </span>
                <i class="ti session-chevron" :class="sessionsOuvertes.has(session.key) ? 'ti-chevron-up' : 'ti-chevron-down'"></i>
              </button>
              <div class="session-body" v-if="sessionsOuvertes.has(session.key)">
                <div
                  v-for="groupe in grouperExosSession(session.exercices)"
                  :key="groupe.key"
                  class="exo-groupe-log"
                  :class="{ 'is-superset': groupe.exercices.length > 1 }"
                >
                  <div v-if="groupe.exercices.length > 1" class="superset-banner">
                    <i class="ti ti-link"></i>
                    <span>{{ labelTypeGroupe(typeGroupe(groupe)) }} · {{ groupe.exercices.length }} exercices</span>
                  </div>

                  <div v-for="(exo, eidx) in groupe.exercices" :key="exo.id" class="exo-bloc">
                    <div class="exo-header">
                      <span class="exo-letter" v-if="groupe.exercices.length > 1">{{ letterFor(eidx) }}</span>
                      <div class="exo-num" v-else>{{ exo.ordre }}</div>
                      <span class="exo-name">{{ exo.nom }}</span>
                    </div>
                    <div class="comparatif-grid">
                      <div class="comparatif-header">
                        <span>Série</span><span>Prescrit</span><span></span><span>Réalisé</span><span></span><span></span>
                      </div>
                      <template v-for="(log, i) in exo.logs" :key="log.id">
                      <div class="comparatif-row" :class="getStatutClasse(log, session.typeSeance)">
                        <span class="serie-num">{{ i + 1 }}</span>
                        <div class="prescrit-cell">
                          <template v-if="session.typeSeance === 'natation' || session.typeSeance === 'athletisme'">
                            <span v-if="log.serie.metres">{{ log.serie.metres }} m</span>
                            <span v-if="log.serie.intensite"> · {{ log.serie.intensite }}</span>
                          </template>
                          <template v-else-if="session.typeSeance === 'pliometrie'">
                            <span v-if="log.serie.bonds">{{ log.serie.bonds }} bonds</span>
                            <span v-if="log.serie.intensite"> · {{ log.serie.intensite }}</span>
                          </template>
                          <template v-else>
                            <span v-if="log.serie.nb_reps">{{ log.serie.nb_reps }} reps</span>
                            <span v-if="log.serie.poids_cible"> · {{ log.serie.poids_cible }}</span>
                            <span v-if="log.serie.rm"> · {{ log.serie.rm }}</span>
                          </template>
                        </div>
                        <i class="ti ti-arrow-right comparatif-arrow"></i>
                        <div class="realise-cell">
                          <template v-if="log.fait">
                            <template v-if="session.typeSeance === 'natation' || session.typeSeance === 'athletisme'">
                              <span v-if="log.reps_realisees">{{ log.reps_realisees }} m</span>
                              <span v-if="log.poids_realise"> · {{ log.poids_realise }}</span>
                            </template>
                            <template v-else-if="session.typeSeance === 'pliometrie'">
                              <span v-if="log.reps_realisees">{{ log.reps_realisees }} bonds</span>
                              <span v-if="log.poids_realise"> · {{ log.poids_realise }}</span>
                            </template>
                            <template v-else>
                              <span v-if="log.reps_realisees">{{ log.reps_realisees }} reps</span>
                              <span v-if="log.poids_realise"> · {{ log.poids_realise }}</span>
                            </template>
                            <span v-if="!log.reps_realisees && !log.poids_realise">—</span>
                          </template>
                          <span v-else class="non-fait"><i class="ti ti-x"></i> non réalisée</span>
                        </div>
                        <span class="statut-icon"><i :class="getStatutIcon(log, session.typeSeance)"></i></span>
                        <button
                          type="button"
                          class="btn-reaction"
                          :class="{ pose: log.reaction_prepa }"
                          :title="log.reaction_prepa ? 'Changer ta réaction' : 'Réagir à cette série'"
                          :aria-label="log.reaction_prepa ? 'Changer ta réaction' : 'Réagir à cette série'"
                          @click="basculerReaction(log.id)"
                        >
                          <span v-if="log.reaction_prepa">{{ log.reaction_prepa }}</span>
                          <i v-else class="ti ti-mood-plus"></i>
                        </button>
                      </div>
                      <!-- Réaction du prépa : l'athlète la voit dans son historique -->
                      <div v-if="reactionOuverte === log.id" class="reaction-choix" role="group" aria-label="Réagir à cette série">
                        <button
                          v-for="r in REACTIONS_PREPA"
                          :key="r"
                          type="button"
                          class="reaction-option"
                          :class="{ active: log.reaction_prepa === r }"
                          @click="reagir(log, r)"
                        >{{ r }}</button>
                        <span class="reaction-aide">Ton athlète est notifié à sa prochaine ouverture de l'appli</span>
                      </div>
                      </template>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </template>
        </template>
      </template>
    </div>

    <!-- POIDS : calendrier des pesées + courbe, lecture seule -->
    <div v-if="sousOnglet === 'poids'" class="tab-content">
      <div v-if="loadingPoids" class="empty">Chargement...</div>
      <div v-else-if="entriesPoids.length === 0" class="empty">Aucune pesée enregistrée pour cet athlète.</div>
      <template v-else>
        <div class="histo-resume">
          <div class="histo-stat">
            <span class="histo-stat-valeur">{{ resumePoids.dernier }} kg</span>
            <span class="histo-stat-label">dernière pesée — {{ formatDateCourte(resumePoids.dateDernier) }}</span>
          </div>
          <div class="histo-stat">
            <span class="histo-stat-valeur" :class="resumePoids.classeVariation">{{ resumePoids.variation }}</span>
            <span class="histo-stat-label">sur 30 jours</span>
          </div>
          <div class="histo-stat">
            <span class="histo-stat-valeur">{{ resumePoids.nbMois }}</span>
            <span class="histo-stat-label">pesées sur {{ labelMois.toLowerCase() }}</span>
          </div>
        </div>

        <div class="histo-switcher">
          <button class="histo-chip" :class="{ active: vuePoids === 'calendrier' }" @click="vuePoids = 'calendrier'">
            <i class="ti ti-calendar"></i> Calendrier
          </button>
          <button class="histo-chip" :class="{ active: vuePoids === 'courbe' }" @click="vuePoids = 'courbe'">
            <i class="ti ti-chart-line"></i> Courbe
          </button>
        </div>

        <div v-if="vuePoids === 'calendrier'" class="stat-card">
          <div class="poids-calendrier-head">
            <button class="btn btn-sm" @click="moisPrecedent" aria-label="Mois précédent"><i class="ti ti-chevron-left"></i></button>
            <span class="poids-mois-label">{{ labelMois }}</span>
            <button class="btn btn-sm" @click="moisSuivant" aria-label="Mois suivant"><i class="ti ti-chevron-right"></i></button>
          </div>
          <div class="poids-calendrier-grille">
            <span v-for="(j, idx) in ['L', 'M', 'M', 'J', 'V', 'S', 'D']" :key="'lbl' + idx" class="poids-jour-label">{{ j }}</span>
            <div
              v-for="(jour, idx) in joursGrille"
              :key="idx"
              class="poids-jour-case"
              :class="{
                vide: !jour,
                'a-une-valeur': jour && poidsPourDate(jour.date),
                'est-aujourdhui': jour && jour.estAujourdhui
              }"
            >
              <template v-if="jour">
                <span class="poids-jour-num">{{ jour.numero }}</span>
                <span v-if="poidsPourDate(jour.date)" class="poids-jour-val">{{ poidsPourDate(jour.date) }}</span>
              </template>
            </div>
          </div>
          <div class="poids-legende">
            <span><i class="poids-dot"></i> jour pesé</span>
            <span>{{ resumePoids.nbMois }} pesée(s) ce mois-ci</span>
          </div>
        </div>

        <div v-else class="stat-card">
          <CourbeProgression :points="courbePoids" label="Poids" unite="kg" axe-x="dates" />
        </div>
      </template>
    </div>

    <!-- BLESSURES : déclarations de l'athlète, lecture seule. Ni déclarer ni
         clôturer n'appartient au prépa (cf. routes /blessures). -->
    <div v-if="sousOnglet === 'blessures'" class="tab-content">
      <div v-if="loadingBlessures" class="empty">Chargement...</div>
      <div v-else-if="blessures.length === 0" class="empty">Aucune blessure déclarée par cet athlète.</div>
      <template v-else>
        <div class="histo-resume">
          <div class="histo-stat">
            <span class="histo-stat-valeur" :class="{ 'variation-hausse': blessuresEnCours.length > 0 }">{{ blessuresEnCours.length }}</span>
            <span class="histo-stat-label">en cours</span>
          </div>
          <div class="histo-stat">
            <span class="histo-stat-valeur">{{ blessuresGueries.length }}</span>
            <span class="histo-stat-label">guérie(s)</span>
          </div>
        </div>

        <div class="stat-card blessure-carte" v-for="b in blessures" :key="b.id" :class="{ 'est-en-cours': b.en_cours }">
          <div class="blessure-head">
            <div>
              <div class="stat-card-titre">{{ b.zone }}</div>
              <div class="blessure-meta">
                <template v-if="b.en_cours">
                  {{ formatDateBlessure(b.date_blessure) }} · {{ labelAnciennete(b.date_blessure) }}
                </template>
                <template v-else>
                  {{ formatDateBlessure(b.date_blessure) }} → {{ formatDateBlessure(b.date_guerison) }}
                </template>
              </div>
            </div>
            <span class="badge" :class="b.en_cours ? 'badge-danger' : 'badge-green'">
              {{ b.en_cours ? 'En cours' : 'Guérie' }}
            </span>
          </div>

          <p v-if="b.circonstances" class="blessure-circonstances">{{ b.circonstances }}</p>

          <div class="blessure-tags">
            <span class="tag" :class="b.docteur ? 'tag-oui' : 'tag-non'">
              <i class="ti" :class="b.docteur ? 'ti-check' : 'ti-x'"></i> Médecin
            </span>
            <span class="tag" :class="b.kine ? 'tag-oui' : 'tag-non'">
              <i class="ti" :class="b.kine ? 'ti-check' : 'ti-x'"></i> Kiné
            </span>
            <span class="tag" v-if="labelDureeBlessure(b.duree_estimee)">
              <i class="ti ti-hourglass"></i> Arrêt estimé : {{ labelDureeBlessure(b.duree_estimee) }}
            </span>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useApi, urlApi } from '../../services/api'
import { useAuthStore } from '../../stores/auth'
import CourbeProgression from '../athlete/CourbeProgression.vue'
import GraphiqueDouble from '../monitoring/GraphiqueDouble.vue'
import GraphiqueAcwrZones from '../monitoring/GraphiqueAcwrZones.vue'
import GraphiqueBarres from '../monitoring/GraphiqueBarres.vue'
import GroupesManagerModal from './GroupesManagerModal.vue'
import AssignerProgrammeModal from './AssignerProgrammeModal.vue'
import { typeGroupe, labelTypeGroupe } from '../../data/typesGroupe'
import { labelDureeBlessure, formatDateBlessure, labelAnciennete } from '../../data/blessures'
import { formatHeures, labelNiveauSommeil } from '../../data/sommeil'
import { FENETRE_ACTIVITE, LABELS_NIVEAU_ACTIVITE, niveauActivite, libelleActivite } from '../../data/activite'
import { typeSeance, labelTypeSeance, iconeTypeSeance } from '../../data/typesSeance'
import { parseValeurSerie } from '../../utils/valeurSerie'

// Distance horizontale minimale pour valider un swipe. Volontairement haute :
// un doigt qui ripe sur un simple appui ne doit jamais changer d'onglet.
const SEUIL_SWIPE = 80

// Dimension « charge » de l'effort selon le type de séance : c'est celle qu'on
// trace en courbe (même convention que le tableau de bord athlète).
const CHAMP_CHARGE = {
  musculation: { champ: 'poids_realise', label: 'charge moyenne par série', unite: 'kg' },
  natation: { champ: 'reps_realisees', label: 'distance moyenne par série', unite: 'm' },
  athletisme: { champ: 'reps_realisees', label: 'distance moyenne par série', unite: 'm' },
  pliometrie: { champ: 'reps_realisees', label: 'bonds moyens par série', unite: '' }
}
const champCharge = (type) => CHAMP_CHARGE[type] || CHAMP_CHARGE.musculation

// Ordre des onglets = ordre du swipe gauche/droite.
const ONGLETS = [
  { cle: 'apercu', label: 'Aperçu', icone: 'ti-chart-line' },
  { cle: 'programme', label: 'Programme', icone: 'ti-layout-grid' },
  { cle: 'historique', label: 'Historique', icone: 'ti-history' },
  { cle: 'poids', label: 'Poids', icone: 'ti-scale' },
  { cle: 'blessures', label: 'Blessures', icone: 'ti-bandage' }
]
const ONGLETS_FICHE = ONGLETS.map(o => o.cle)

// Réactions du prépa sur une série (liste fermée, identique à
// REACTIONS_PREPA côté API : app/schemas/log_serie.py).
const REACTIONS_PREPA = ['👏', '🔥', '💪', '🚀', '💯', '👀']

const pad2 = (n) => String(n).padStart(2, '0')

export default {
  components: { CourbeProgression, GraphiqueDouble, GraphiqueAcwrZones, GraphiqueBarres, GroupesManagerModal, AssignerProgrammeModal },
  emits: ['fermer', 'modifie', 'ouvrir-programme'],
  props: {
    athlete: { type: Object, required: true },
    programmes: { type: Array, default: () => [] },
    groupes: { type: Array, default: () => [] },
    monCercle: { type: Array, default: () => [] }
  },
  setup(props, { emit }) {
    const api = useApi()
    const authStore = useAuthStore()
    const estSuperPrepa = computed(() => authStore.role === 'super_prepa')

    const sousOnglet = ref('apercu')
    const modalGroupes = ref(false)

    const groupesDe = computed(() => props.groupes.filter(g => g.athletes.find(a => a.id === props.athlete.id)))
    const initiales = (nom) => nom.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

    // --- Réaction à une série de l'historique ---
    const reactionOuverte = ref(null)
    const basculerReaction = (logId) => { reactionOuverte.value = reactionOuverte.value === logId ? null : logId }
    // Retoucher la réaction déjà posée la retire.
    const reagir = async (log, reaction) => {
      const nouvelle = log.reaction_prepa === reaction ? null : reaction
      try {
        const maj = await api.patch(`/logs/${log.id}/reaction`, { reaction: nouvelle })
        log.reaction_prepa = maj.reaction_prepa
      } catch (e) {
        console.error('Erreur réaction série:', e)
      }
      reactionOuverte.value = null
    }

    const erreurFiche = ref('')
    const retirerDuCercle = async () => {
      if (!confirm(`Retirer ${props.athlete.nom} de votre cercle ?`)) return
      erreurFiche.value = ''
      try {
        await api.del(`/users/mes-athletes/${props.athlete.id}`)
      } catch (e) {
        erreurFiche.value = e.message || 'Impossible de retirer cet athlète'
        return
      }
      emit('modifie')
      emit('fermer')
    }

    // --- Aperçu (monitoring) : identique à l'ancien MonitoringPanel.vue ---
    const detail = ref(null)
    const loadingApercu = ref(false)
    const fetchApercu = async () => {
      loadingApercu.value = true
      try {
        detail.value = await api.get(`/monitoring/athlete/${props.athlete.id}`)
      } catch (e) {
        // sans ça, « Chargement… » restait affiché indéfiniment
        erreurFiche.value = e.message || "Impossible de charger l'aperçu"
      } finally {
        loadingApercu.value = false
      }
    }

    const pointsAcwr = computed(() => detail.value ? detail.value.aigue_chronique.map(p => ({ date: p.date, acwr: p.acwr })) : [])
    const pointsAigueChronique = computed(() => detail.value ? detail.value.aigue_chronique.map(p => ({ date: p.date, valeurA: p.aigue, valeurB: p.chronique })) : [])
    const pointsMonotonie = computed(() => detail.value ? detail.value.monotonie_contrainte.filter(p => p.monotonie !== null).map(p => ({ date: p.date, valeur: p.monotonie })) : [])
    const pointsContrainte = computed(() => detail.value ? detail.value.monotonie_contrainte.filter(p => p.contrainte !== null).map(p => ({ date: p.date, valeur: p.contrainte })) : [])
    const pointsHooper = computed(() => detail.value ? detail.value.wellness.map(p => ({ date: p.date, valeur: p.hooper_index })) : [])
    const dernierWellness = computed(() => detail.value?.wellness.length ? detail.value.wellness[detail.value.wellness.length - 1] : null)
    const barresDernierWellness = computed(() => {
      if (!dernierWellness.value) return []
      const w = dernierWellness.value
      return [
        { cle: 'sommeil', nom: 'Sommeil', valeur: w.sommeil },
        { cle: 'fatigue', nom: 'Fatigue', valeur: w.fatigue },
        { cle: 'courbatures', nom: 'Courbatures', valeur: w.courbatures },
        { cle: 'stress', nom: 'Stress', valeur: w.stress }
      ]
    })
    const pointsSommeil = computed(() =>
      detail.value
        ? detail.value.wellness.filter(p => p.heures_sommeil !== null).map(p => ({ date: p.date, valeur: p.heures_sommeil }))
        : []
    )
    const formatDateCourt = (d) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })

    // --- Programme : contenu des programmes assignés, assigner/retirer ---
    const enCours = ref(new Set())
    const modalAjoutProgramme = ref(false)
    const programmesOuverts = ref(new Set())
    const seancesOuvertes = ref(new Set())
    const seancesParProgramme = ref({})
    const loadingSeances = ref(new Set())

    const estAssigne = (p) => p.athletes.some(a => a.id === props.athlete.id)
    const programmesDisponibles = computed(() => props.programmes.filter(p => !estAssigne(p)))

    const assignerProgramme = async (p) => {
      enCours.value.add(p.id)
      erreurFiche.value = ''
      try {
        await api.post(`/programmes/${p.id}/assigner/${props.athlete.id}`)
        emit('modifie')
      } catch (e) {
        erreurFiche.value = e.message || "Impossible d'assigner ce programme"
      } finally {
        enCours.value.delete(p.id)
      }
    }
    // Un clic suffisait à retirer le programme à l'athlète : il le perd
    // aussitôt de son téléphone.
    const retirerProgramme = async (p) => {
      if (!confirm(`Retirer « ${p.nom} » à ${props.athlete.nom} ? Il ne le verra plus ; son historique est conservé.`)) return
      enCours.value.add(p.id)
      erreurFiche.value = ''
      try {
        await api.del(`/programmes/${p.id}/retirer/${props.athlete.id}`)
        emit('modifie')
      } catch (e) {
        erreurFiche.value = e.message || 'Impossible de retirer ce programme'
      } finally {
        enCours.value.delete(p.id)
        programmesOuverts.value.delete(p.id)
        delete seancesParProgramme.value[p.id]
      }
    }

    // Le contenu d'un programme n'est chargé qu'au dépliage, puis rechargé à
    // chaque réouverture : le prépa peut l'avoir édité entre-temps. L'ancienne
    // version reste affichée pendant le rechargement pour éviter le clignotement.
    const chargerSeances = async (programmeId) => {
      loadingSeances.value.add(programmeId)
      try {
        seancesParProgramme.value[programmeId] = await api.get(`/programmes/${programmeId}/seances/`)
      } finally {
        loadingSeances.value.delete(programmeId)
      }
    }

    const basculerProgramme = (p) => {
      if (programmesOuverts.value.has(p.id)) {
        programmesOuverts.value.delete(p.id)
        return
      }
      programmesOuverts.value.add(p.id)
      chargerSeances(p.id)
    }

    const basculerSeanceProg = (seanceId) => {
      if (seancesOuvertes.value.has(seanceId)) seancesOuvertes.value.delete(seanceId)
      else seancesOuvertes.value.add(seanceId)
    }

    const semainesDuProgramme = (programmeId) => {
      const parSemaine = {}
      ;(seancesParProgramme.value[programmeId] || []).forEach(s => {
        const numero = s.semaine || 1
        if (!parSemaine[numero]) parSemaine[numero] = []
        parSemaine[numero].push(s)
      })
      return Object.keys(parSemaine)
        .map(Number)
        .sort((a, b) => a - b)
        .map(numero => ({ numero, seances: [...parSemaine[numero]].sort((a, b) => a.ordre - b.ordre) }))
    }

    // Prescription d'une série en une ligne, selon le type de séance.
    const resumeSerie = (serie, typeSeance) => {
      const parts = []
      if (typeSeance === 'natation' || typeSeance === 'athletisme') {
        if (serie.metres) parts.push(`${serie.metres} m`)
        if (serie.intensite) parts.push(serie.intensite)
      } else if (typeSeance === 'pliometrie') {
        if (serie.bonds) parts.push(`${serie.bonds} bonds`)
        if (serie.intensite) parts.push(serie.intensite)
      } else {
        if (serie.nb_reps) parts.push(`${serie.nb_reps} reps`)
        if (serie.poids_cible) parts.push(serie.poids_cible)
        if (serie.rm) parts.push(serie.rm)
        if (serie.tempo) parts.push(serie.tempo)
      }
      if (serie.temps_repos) parts.push(`repos ${serie.temps_repos}`)
      return parts.length > 0 ? parts.join(' · ') : '—'
    }

    // --- Historique : séances réalisées (prescrit vs réalisé) et courbes ---
    const programmesAssignes = computed(() => props.programmes.filter(p => estAssigne(p)))
    const programmeLogsId = ref(null)
    const logs = ref([])
    const loadingLogs = ref(false)
    const vueHistorique = ref('seances')
    const seanceFiltre = ref('toutes')
    const sessionsOuvertes = ref(new Set())

    // Séries prévues par séance (ids), pour le bilan « x/y séries » d'une
    // séance de l'historique : compter les seules séries enregistrées
    // affichait « 1/1 » en vert pour une séance arrêtée après 1 série sur 6.
    const seriesPrevuesParSeance = ref({})
    const fetchLogs = async () => {
      if (!programmeLogsId.value) { logs.value = []; return }
      const programmeId = programmeLogsId.value
      loadingLogs.value = true
      try {
        const [donnees, seances] = await Promise.all([
          api.get(`/logs/programme/${programmeId}/athlete/${props.athlete.id}`),
          api.get(`/programmes/${programmeId}/seances/`)
        ])
        // un autre programme a pu être choisi pendant le chargement
        if (programmeLogsId.value !== programmeId) return
        logs.value = donnees
        seriesPrevuesParSeance.value = Object.fromEntries(seances.map(seance => [
          seance.id,
          (seance.exercices || []).flatMap(e => (e.series || []).map(sr => sr.id))
        ]))
      } catch (e) {
        erreurFiche.value = e.message || "Impossible de charger l'historique"
      } finally {
        loadingLogs.value = false
      }
    }

    const ouvrirHistorique = () => {
      sousOnglet.value = 'historique'
      if (!programmeLogsId.value && programmesAssignes.value.length > 0) {
        programmeLogsId.value = programmesAssignes.value[0].id
      }
    }
    watch(programmeLogsId, () => { seanceFiltre.value = 'toutes'; fetchLogs() })

    // L'API renvoie les logs triés par date décroissante (dernière tentative
    // en tête) — un ordre qui reflète QUAND chaque série a été loguée, pas SA
    // position prescrite. Comme la série non réalisée d'une séance est
    // souvent celle envoyée en dernier (donc la plus récente), elle remontait
    // en position 1 au lieu de sa vraie place : on retrie chaque exercice par
    // l'id de la série prescrite (attribué dans l'ordre de création, donc
    // dans l'ordre du programme) pour retrouver l'ordre réel 1, 2, 3...
    const logsGroupes = computed(() => {
      const sessions = {}
      logs.value.forEach(log => {
        const dateStr = log.date.split('T')[0]
        // session_id = une validation de séance : deux tentatives d'une même
        // séance le même jour restent deux entrées distinctes dans l'historique.
        const key = log.session_id || `${dateStr}__${log.seance.id}`
        if (!sessions[key]) {
          sessions[key] = {
            key, date: dateStr, seanceId: log.seance.id, seanceNom: log.seance.nom, jour: log.seance.jour,
            semaine: log.seance.semaine, typeSeance: log.seance.type_seance, exercices: {}
          }
        }
        if (!sessions[key].exercices[log.exercice.id]) {
          sessions[key].exercices[log.exercice.id] = { id: log.exercice.id, nom: log.exercice.nom, ordre: log.exercice.ordre, groupe: log.exercice.groupe, type_groupe: log.exercice.type_groupe, logs: [] }
        }
        sessions[key].exercices[log.exercice.id].logs.push(log)
      })
      return Object.values(sessions)
        .sort((a, b) => b.date.localeCompare(a.date))
        .map(s => {
          const exercices = Object.values(s.exercices)
            .sort((a, b) => a.ordre - b.ordre)
            .map(e => ({ ...e, logs: [...e.logs].sort((a, b) => a.serie.id - b.serie.id) }))
          // Prévues = séries actuelles de la séance, plus celles enregistrées
          // qui n'en font plus partie (retirées depuis par le prépa).
          const enregistrees = exercices.flatMap(e => e.logs.map(l => l.serie.id))
          const total = new Set([...(seriesPrevuesParSeance.value[s.seanceId] || []), ...enregistrees]).size
          const faites = exercices.reduce((n, e) => n + e.logs.filter(l => l.fait).length, 0)
          return { ...s, exercices, total, faites, taux: total ? Math.round((faites / total) * 100) : 0 }
        })
    })

    const nomsSeances = computed(() => [...new Set(logsGroupes.value.map(s => s.seanceNom))].sort((a, b) => a.localeCompare(b)))

    const sessionsFiltrees = computed(() =>
      seanceFiltre.value === 'toutes'
        ? logsGroupes.value
        : logsGroupes.value.filter(s => s.seanceNom === seanceFiltre.value)
    )

    const resumeHistorique = computed(() => {
      const sessions = sessionsFiltrees.value
      const total = sessions.reduce((n, s) => n + s.total, 0)
      const faites = sessions.reduce((n, s) => n + s.faites, 0)
      const dates = sessions.map(s => s.date)
      const periode = dates.length === 0
        ? '—'
        : dates.length === 1
          ? formatDateCourte(dates[0])
          : `${formatDateCourte(dates[dates.length - 1])} → ${formatDateCourte(dates[0])}`
      return {
        nbSessions: sessions.length,
        total,
        faites,
        taux: total ? Math.round((faites / total) * 100) : 0,
        periode
      }
    })

    // Une courbe par exercice de l'historique filtré : un point par séance
    // réalisée, moyenne du champ « charge » sur ses séries.
    const courbesHistorique = computed(() => {
      const parExo = {}
      sessionsFiltrees.value.forEach(session => {
        const conf = champCharge(session.typeSeance)
        session.exercices.forEach(exo => {
          const valeurs = exo.logs.map(l => parseValeurSerie(l[conf.champ])).filter(v => !isNaN(v))
          if (valeurs.length === 0) return
          if (!parExo[exo.nom]) parExo[exo.nom] = { nom: exo.nom, label: conf.label, unite: conf.unite, points: [] }
          const moyenne = valeurs.reduce((a, b) => a + b, 0) / valeurs.length
          parExo[exo.nom].points.push({ date: session.date, valeur: Math.round(moyenne * 100) / 100 })
        })
      })
      return Object.values(parExo)
        .map(c => ({ ...c, points: [...c.points].reverse() })) // sessions triées du plus récent au plus ancien
        .filter(c => c.points.length >= 2)
        .sort((a, b) => a.nom.localeCompare(b.nom))
    })

    const basculerSession = (key) => {
      if (sessionsOuvertes.value.has(key)) sessionsOuvertes.value.delete(key)
      else sessionsOuvertes.value.add(key)
    }

    // À chaque (re)chargement de l'historique, seule la séance la plus récente
    // est dépliée : le prépa voit d'abord la dernière séance en détail.
    watch(logsGroupes, (sessions) => {
      sessionsOuvertes.value = new Set(sessions.length > 0 ? [sessions[0].key] : [])
    })

    const classeTaux = (taux) => (taux >= 90 ? 'taux-done' : taux >= 60 ? 'taux-warn' : 'taux-skip')

    // Regroupe les exercices d'une session en supersets/bisets (même logique
    // que grouperExercices côté édition de programme) pour un affichage plus
    // lisible quand plusieurs exercices sont enchaînés.
    const grouperExosSession = (exercices) => {
      const groupes = []
      const map = {}
      exercices.forEach(exo => {
        if (exo.groupe) {
          if (!map[exo.groupe]) {
            map[exo.groupe] = { key: `g${exo.groupe}`, exercices: [] }
            groupes.push(map[exo.groupe])
          }
          map[exo.groupe].exercices.push(exo)
        } else {
          groupes.push({ key: `e${exo.id}`, exercices: [exo] })
        }
      })
      return groupes
    }

    const letterFor = (idx) => String.fromCharCode(65 + idx)

    const formatDate = (d) => new Date(d).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
    const formatDateCourte = (d) => new Date(d).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })

    const getStatutClasse = (log, typeSeance) => {
      if (!log.fait) return 'statut-skip'
      if (!log.reps_realisees && !log.poids_realise) return 'statut-warn'
      const prescrit = typeSeance === 'natation' || typeSeance === 'athletisme'
        ? log.serie.metres
        : typeSeance === 'pliometrie'
          ? log.serie.bonds
          : log.serie.nb_reps
      const prescR = parseValeurSerie(prescrit)
      const realR = parseValeurSerie(log.reps_realisees)
      if (!isNaN(prescR) && !isNaN(realR) && realR < prescR) return 'statut-warn'
      return 'statut-done'
    }

    const getStatutIcon = (log, typeSeance) => {
      if (!log.fait) return 'ti ti-x'
      return getStatutClasse(log, typeSeance) === 'statut-warn' ? 'ti ti-alert-triangle' : 'ti ti-check'
    }

    // --- Poids : calendrier des pesées + courbe, lecture seule ---
    const entriesPoids = ref([])
    const loadingPoids = ref(false)
    const poidsCharge = ref(false)
    const vuePoids = ref('calendrier')
    const moisAffiche = ref(new Date(new Date().getFullYear(), new Date().getMonth(), 1))

    const fetchPoids = async () => {
      loadingPoids.value = true
      try {
        entriesPoids.value = await api.get(`/poids/athlete/${props.athlete.id}`)
      } finally {
        loadingPoids.value = false
        poidsCharge.value = true
      }
    }
    const courbePoids = computed(() =>
      [...entriesPoids.value]
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .map(e => ({ date: e.date, valeur: e.poids }))
    )
    const ouvrirPoids = () => {
      sousOnglet.value = 'poids'
      if (!poidsCharge.value) fetchPoids()
    }

    const poidsParDate = computed(() => {
      const map = {}
      entriesPoids.value.forEach(e => { map[e.date] = e })
      return map
    })
    const poidsPourDate = (date) => poidsParDate.value[date]?.poids ?? null

    const labelMois = computed(() => {
      const texte = moisAffiche.value.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
      return texte.charAt(0).toUpperCase() + texte.slice(1)
    })

    // Grille lundi -> dimanche, complétée par des cases vides pour aligner le
    // premier jour du mois et compléter la dernière semaine (même grille que
    // celle où l'athlète saisit ses pesées, en lecture seule).
    const joursGrille = computed(() => {
      const annee = moisAffiche.value.getFullYear()
      const mois = moisAffiche.value.getMonth()
      const nbJours = new Date(annee, mois + 1, 0).getDate()
      const decalage = (new Date(annee, mois, 1).getDay() + 6) % 7 // 0 = lundi
      const aujourdhui = new Date()
      const todayISO = `${aujourdhui.getFullYear()}-${pad2(aujourdhui.getMonth() + 1)}-${pad2(aujourdhui.getDate())}`

      const jours = []
      for (let i = 0; i < decalage; i++) jours.push(null)
      for (let n = 1; n <= nbJours; n++) {
        const iso = `${annee}-${pad2(mois + 1)}-${pad2(n)}`
        jours.push({ date: iso, numero: n, estAujourdhui: iso === todayISO })
      }
      while (jours.length % 7 !== 0) jours.push(null)
      return jours
    })

    const moisPrecedent = () => {
      moisAffiche.value = new Date(moisAffiche.value.getFullYear(), moisAffiche.value.getMonth() - 1, 1)
    }
    const moisSuivant = () => {
      moisAffiche.value = new Date(moisAffiche.value.getFullYear(), moisAffiche.value.getMonth() + 1, 1)
    }

    const resumePoids = computed(() => {
      const points = courbePoids.value
      const dernier = points[points.length - 1]
      // Repère le plus ancien relevé encore dans la fenêtre de 30 jours pour
      // mesurer la variation sur le mois écoulé.
      const limite = new Date()
      limite.setDate(limite.getDate() - 30)
      const reference = points.find(p => new Date(p.date) >= limite)
      const ecart = reference && dernier ? Math.round((dernier.valeur - reference.valeur) * 10) / 10 : null
      const prefixeMois = `${moisAffiche.value.getFullYear()}-${pad2(moisAffiche.value.getMonth() + 1)}`
      return {
        dernier: dernier ? dernier.valeur : '—',
        dateDernier: dernier ? dernier.date : null,
        variation: ecart === null || ecart === 0 ? '=' : `${ecart > 0 ? '+' : ''}${ecart} kg`,
        classeVariation: ecart === null || ecart === 0 ? '' : ecart > 0 ? 'variation-hausse' : 'variation-baisse',
        nbMois: entriesPoids.value.filter(e => e.date.startsWith(prefixeMois)).length
      }
    })

    // --- Blessures (lecture seule) ---
    const blessures = ref([])
    const loadingBlessures = ref(false)
    const blessuresChargees = ref(false)

    const blessuresEnCours = computed(() => blessures.value.filter(b => b.en_cours))
    const blessuresGueries = computed(() => blessures.value.filter(b => !b.en_cours))

    // Avant l'ouverture de l'onglet, le compteur de la pastille vient du résumé
    // monitoring déjà chargé pour la liste ; ensuite, des blessures elles-mêmes
    // (l'athlète a pu en clôturer une depuis le dernier /monitoring/cercle).
    const nbBlessuresEnCours = computed(() =>
      blessuresChargees.value
        ? blessuresEnCours.value.length
        : (props.athlete.resume?.blessures_en_cours || 0)
    )

    const fetchBlessures = async () => {
      loadingBlessures.value = true
      try {
        blessures.value = await api.get(`/blessures/athlete/${props.athlete.id}`)
      } finally {
        loadingBlessures.value = false
        blessuresChargees.value = true
      }
    }
    const ouvrirBlessures = () => {
      sousOnglet.value = 'blessures'
      if (!blessuresChargees.value) fetchBlessures()
    }

    // --- Navigation par onglet (clic ou swipe) ---
    // Recentre l'onglet actif dans la barre (qui peut déborder sur mobile) :
    // au swipe comme au clic, l'onglet qui devient actif se replace bien en
    // vue, quitte à faire sortir son opposé de l'autre côté.
    const tabRefs = {}
    const setTabRef = (tab, el) => { if (el) tabRefs[tab] = el }
    const centrerOnglet = async (tab) => {
      await nextTick()
      tabRefs[tab]?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
    }

    const allerA = (tab) => {
      if (tab === 'historique') ouvrirHistorique()
      else if (tab === 'poids') ouvrirPoids()
      else if (tab === 'blessures') ouvrirBlessures()
      else sousOnglet.value = tab
      centrerOnglet(tab)
    }

    // Swipe gauche/droite pour changer d'onglet, même logique que le swipe
    // de tabs du dashboard athlète (détection au relâché uniquement, pour
    // ne jamais interférer avec le scroll vertical ou les clics).
    const swipeState = { startX: 0, startY: 0, pointerId: null }
    // Coupe la propagation : la fiche a la priorité sur le swipe de tabs du
    // dashboard prépa (Athlètes/Programmes/Tests) quand elle est ouverte.
    const onSwipeStart = (e) => {
      e.stopPropagation()
      if (e.pointerType === 'mouse' && e.button !== 0) return
      // un second doigt ne doit pas redéfinir l'origine du geste en cours
      if (!e.isPrimary) return
      swipeState.startX = e.clientX
      swipeState.startY = e.clientY
      swipeState.pointerId = e.pointerId
    }
    // iOS annule le pointeur dès que le navigateur prend la main (début de
    // scroll, appui long, zoom) et dispatche pointercancel sans coordonnées
    // utilisables : depuis (0, 0), dx vaut -startX, soit un changement
    // d'onglet déclenché par un simple appui.
    const onSwipeCancel = (e) => {
      e.stopPropagation()
      swipeState.pointerId = null
    }
    const onSwipeEnd = (e) => {
      e.stopPropagation()
      if (swipeState.pointerId !== e.pointerId) return
      swipeState.pointerId = null
      const dx = e.clientX - swipeState.startX
      const dy = e.clientY - swipeState.startY
      if (Math.abs(dy) > Math.abs(dx) + 10) return
      const idx = ONGLETS_FICHE.indexOf(sousOnglet.value)
      if (dx <= -SEUIL_SWIPE && idx < ONGLETS_FICHE.length - 1) allerA(ONGLETS_FICHE[idx + 1])
      else if (dx >= SEUIL_SWIPE && idx > 0) allerA(ONGLETS_FICHE[idx - 1])
    }

    // Profil de l'athlète (photo, âge, sports, objectif, contact).
    const profil = ref(null)
    const photoUrl = computed(() => profil.value?.photo_url || props.athlete.photo_url || null)
    const ageDe = (iso) => {
      const naissance = new Date(`${iso}T00:00:00`)
      const auj = new Date()
      let age = auj.getFullYear() - naissance.getFullYear()
      if (auj < new Date(auj.getFullYear(), naissance.getMonth(), naissance.getDate())) age -= 1
      return age
    }
    const lignesProfil = computed(() => {
      const p = profil.value
      if (!p) return []
      const lignes = []
      const identite = [p.sexe === 'homme' ? 'Homme' : p.sexe === 'femme' ? 'Femme' : null, p.date_naissance ? `${ageDe(p.date_naissance)} ans` : null].filter(Boolean)
      if (identite.length) lignes.push({ cle: 'identite', icone: 'ti-user', texte: identite.join(' · ') })
      if (p.sports) lignes.push({ cle: 'sports', icone: 'ti-ball-football', texte: p.sports })
      if (p.objectif_sportif) lignes.push({ cle: 'objectif', icone: 'ti-target-arrow', texte: p.objectif_sportif })
      if (p.telephone) lignes.push({ cle: 'tel', icone: 'ti-phone', texte: p.telephone, lien: `tel:${p.telephone.replace(/[^0-9+]/g, '')}` })
      return lignes
    })
    const fetchProfil = async () => {
      try {
        profil.value = await api.get(`/users/${props.athlete.id}/profil`)
      } catch (e) {
        console.error('Erreur profil athlète:', e)
      }
    }

    onMounted(() => { fetchApercu(); fetchProfil() })

    return {
      estSuperPrepa, sousOnglet, modalGroupes, groupesDe, initiales, retirerDuCercle, ONGLETS, erreurFiche,
      profil, photoUrl, lignesProfil, urlApi,
      REACTIONS_PREPA, reactionOuverte, basculerReaction, reagir,
      FENETRE_ACTIVITE, LABELS_NIVEAU_ACTIVITE, niveauActivite, libelleActivite,
      typeSeance, labelTypeSeance, iconeTypeSeance,
      detail, loadingApercu, pointsAcwr, pointsAigueChronique, pointsMonotonie, pointsContrainte,
      pointsHooper, dernierWellness, barresDernierWellness, formatDateCourt,
      pointsSommeil, formatHeures, labelNiveauSommeil,
      enCours, estAssigne, assignerProgramme, retirerProgramme,
      modalAjoutProgramme, programmesDisponibles, programmesOuverts, seancesOuvertes,
      seancesParProgramme, loadingSeances, basculerProgramme, basculerSeanceProg,
      semainesDuProgramme, resumeSerie,
      programmesAssignes, programmeLogsId, loadingLogs, logsGroupes, ouvrirHistorique,
      vueHistorique, seanceFiltre, nomsSeances, sessionsFiltrees, resumeHistorique, courbesHistorique,
      sessionsOuvertes, basculerSession, classeTaux,
      grouperExosSession, letterFor, typeGroupe, labelTypeGroupe,
      formatDate, formatDateCourte, getStatutClasse, getStatutIcon,
      loadingPoids, entriesPoids, courbePoids, ouvrirPoids,
      vuePoids, labelMois, joursGrille, poidsPourDate, moisPrecedent, moisSuivant, resumePoids,
      blessures, loadingBlessures, blessuresEnCours, blessuresGueries, nbBlessuresEnCours,
      labelDureeBlessure, formatDateBlessure, labelAnciennete,
      allerA, onSwipeStart, onSwipeEnd, onSwipeCancel, setTabRef
    }
  }
}
</script>

<style scoped>
/* Colonne centrée sur grand écran, sans déplacer la barre de défilement. */
.fiche-athlete {
  display: flex; flex-direction: column; gap: var(--spacing-lg);
  padding: var(--spacing-xl) max(var(--spacing-2xl), calc((100% - 1080px) / 2));
  overflow-y: auto; flex: 1; min-height: 0; touch-action: pan-y;
}

.fiche-topbar { display: flex; align-items: center; justify-content: space-between; gap: var(--spacing-md); flex-wrap: wrap; }
.retour-fiche { flex-shrink: 0; margin-left: calc(-1 * var(--spacing-md)); }
.fiche-topbar-actions { display: flex; gap: var(--spacing-sm); flex-shrink: 0; flex-wrap: wrap; }
.btn-retirer { color: var(--color-danger-text); }
.erreur-fiche { display: flex; align-items: center; gap: 6px; margin: 0; }
.erreur-fiche-fermer {
  margin-left: auto;
  border: none;
  background: transparent;
  color: inherit;
  cursor: pointer;
  min-width: 32px;
  min-height: 32px;
}
.btn-retirer:hover:not(:disabled) { background: var(--color-danger-bg-soft); color: var(--color-danger-text); }

.fiche-header {
  display: flex; align-items: center; gap: var(--spacing-lg); flex-wrap: wrap;
  padding: var(--spacing-lg) var(--spacing-xl);
  background: var(--color-bg); border: 1px solid var(--color-border); border-radius: var(--radius-xl);
  box-shadow: var(--shadow-card);
}
.fiche-avatar {
  position: relative; flex-shrink: 0;
  width: 56px; height: 56px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  background: var(--color-avatar-athlete-bg); color: var(--color-avatar-athlete-text);
  font-size: var(--font-size-lg); font-weight: 700;
}
.activite-inactif .fiche-avatar { background: var(--color-bg-tertiary); color: var(--color-text-muted); }
.fiche-profil {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-sm) var(--spacing-lg);
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius-md);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  font-size: var(--font-size-sm);
  color: var(--color-text-body);
}
.fiche-profil-item { display: inline-flex; align-items: center; gap: 6px; }
.fiche-profil-item .ti { color: var(--color-text-muted); }
.fiche-profil-item a { color: var(--color-primary-text); }
.avatar-pastille {
  position: absolute; right: 0; bottom: 0;
  width: 15px; height: 15px; border-radius: 50%;
  border: 2px solid var(--color-bg); background: var(--color-border-strong);
}
.activite-regulier .avatar-pastille, .activite-actif .avatar-pastille { background: var(--color-valid-text); }
.activite-irregulier .avatar-pastille { background: var(--color-warning-icon); }
.fiche-header-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.fiche-header-info h3 { margin: 0; font-size: var(--font-size-xl); font-weight: 700; letter-spacing: -0.3px; }
.fiche-header-info h3 .org-badge { margin-left: 6px; font-weight: 500; vertical-align: middle; }
.athlete-email { font-size: var(--font-size-xs); color: var(--color-text-secondary); overflow-wrap: anywhere; }
/* Les deux morceaux passent à la ligne en bloc, jamais au milieu. */
.fiche-activite { display: flex; flex-wrap: wrap; column-gap: 4px; font-size: var(--font-size-xs); color: var(--color-text-secondary); margin-top: 2px; }
.activite-libelle, .activite-jours { white-space: nowrap; }
.activite-libelle { font-weight: 600; color: var(--color-text-muted); }
.activite-regulier .activite-libelle { color: var(--color-valid-text-strong); }
.activite-irregulier .activite-libelle { color: var(--color-warning-text-strong); }
.groupes-badges { display: flex; gap: 4px; flex-wrap: wrap; margin-top: 4px; }
.groupe-badge { font-size: var(--font-size-xs); font-weight: 600; padding: 2px 8px; border-radius: var(--radius-full); }
.acwr-badge {
  display: inline-flex; align-items: baseline; gap: 4px; flex-shrink: 0; align-self: flex-start;
  padding: 4px 10px; border-radius: var(--radius-full);
  font-size: var(--font-size-sm); font-weight: 700; font-variant-numeric: tabular-nums;
}
.acwr-badge small { font-size: 10px; font-weight: 600; letter-spacing: 0.3px; opacity: 0.75; }
.acwr-badge.zone-optimale { background: var(--color-valid-bg); color: var(--color-valid-text-strong); }
.acwr-badge.zone-vigilance { background: var(--color-warning-bg); color: var(--color-warning-text-strong); }
.acwr-badge.zone-surcharge { background: var(--color-danger-bg); color: var(--color-danger-text); }
.acwr-badge.zone-sous_charge { background: var(--color-bg-tertiary); color: var(--color-text-secondary); }
.acwr-badge.zone-insuffisant { background: var(--color-bg-tertiary); color: var(--color-text-muted); }
.fiche-signaux {
  flex-basis: 100%; display: flex; gap: 6px; flex-wrap: wrap;
  padding-top: var(--spacing-md); border-top: 1px solid var(--color-border);
}
.signal {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 3px 9px; border-radius: var(--radius-full);
  font-size: var(--font-size-xs); font-weight: 600;
  background: var(--color-warning-bg); color: var(--color-warning-text-strong);
}
.signal.signal-blessure { background: var(--color-danger-bg); color: var(--color-danger-text); }

.tabs { display: flex; gap: 4px; border-bottom: 1px solid var(--color-border); flex-shrink: 0; overflow-x: auto; scroll-behavior: smooth; scrollbar-width: none; }
.tabs::-webkit-scrollbar { display: none; }
.tab {
  display: flex; align-items: center; justify-content: center; gap: 6px;
  flex: 1 0 auto; min-height: var(--tap-min);
  padding: var(--spacing-md) var(--spacing-lg);
  margin-bottom: -1px;
  border: none; border-bottom: 2px solid transparent; background: none;
  font-family: inherit; font-size: var(--font-size-sm); font-weight: 500;
  color: var(--color-text-secondary); cursor: pointer;
  user-select: none; white-space: nowrap; text-align: center;
  transition: color var(--transition-fast), border-color var(--transition-fast);
}
.tab i { font-size: var(--font-size-base); }
.tab:hover { color: var(--color-text-body); }
.tab.active { color: var(--color-primary-dark); border-bottom-color: var(--color-primary); font-weight: 600; }
.tab-pastille {
  margin-left: 6px; padding: 1px 6px; border-radius: var(--radius-full);
  font-size: 10px; font-weight: 700;
  background: var(--color-danger-bg); color: var(--color-danger-text);
}
.tab-content { display: flex; flex-direction: column; gap: var(--spacing-md); }

.blessure-carte.est-en-cours { border-left: 3px solid var(--color-danger-text); }
.blessure-head { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--spacing-md); }
.blessure-meta { font-size: var(--font-size-xs); color: var(--color-text-muted); margin-top: 2px; }
.blessure-circonstances { margin: 0; font-size: var(--font-size-sm); color: var(--color-text-body); white-space: pre-wrap; }
.badge-danger { background: var(--color-danger-bg); color: var(--color-danger-text); }
.blessure-tags { display: flex; flex-wrap: wrap; gap: 6px; }
.blessure-tags .tag {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: var(--font-size-xs); font-weight: 600;
  padding: 3px 8px; border-radius: var(--radius-full);
  background: var(--color-bg-secondary); color: var(--color-text-secondary);
}
.blessure-tags .tag-oui { background: var(--color-valid-bg); color: var(--color-valid-text-strong); }
.blessure-tags .tag-non { color: var(--color-text-muted); }

.stat-card {
  background: var(--color-bg); border: 1px solid var(--color-border); border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
  padding: var(--spacing-lg); display: flex; flex-direction: column; gap: var(--spacing-sm);
}
.stat-card-titre { font-size: var(--font-size-sm); font-weight: 700; display: flex; align-items: center; gap: var(--spacing-sm); flex-wrap: wrap; }
.stat-card-titre-sm { font-size: var(--font-size-xs); color: var(--color-text-secondary); font-weight: 600; margin-top: var(--spacing-xs); }
.stat-card-note { font-size: var(--font-size-xs); color: var(--color-text-muted); margin: 0; }
.detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-lg); }

.sommeil-resume { display: flex; flex-wrap: wrap; gap: var(--spacing-sm) var(--spacing-lg); font-size: var(--font-size-sm); color: var(--color-text-secondary); }
.sommeil-badge {
  padding: 2px 8px; border-radius: var(--radius-full);
  font-size: var(--font-size-xs); font-weight: 700;
  background: var(--color-bg-tertiary); color: var(--color-text-secondary);
}
.sommeil-badge.sommeil-faible { background: var(--color-valid-bg); color: var(--color-valid-text-strong); }
.sommeil-badge.sommeil-modere { background: var(--color-warning-bg); color: var(--color-warning-text); }
.sommeil-badge.sommeil-eleve { background: var(--color-danger-bg); color: var(--color-danger-text); }

.prog-topbar { display: flex; align-items: center; justify-content: space-between; gap: var(--spacing-md); flex-wrap: wrap; }
.prog-topbar-titre { font-size: var(--font-size-sm); font-weight: 600; color: var(--color-text-secondary); }

.prog-block { border: 1px solid var(--color-border); border-radius: var(--radius-lg); background: var(--color-bg); overflow: hidden; box-shadow: var(--shadow-card); }
.prog-head {
  width: 100%;
  display: flex; align-items: center; gap: var(--spacing-md);
  padding: var(--spacing-md) var(--spacing-lg);
  background: var(--color-bg);
  border: none; font-family: inherit; color: inherit; text-align: left; cursor: pointer;
  font-size: var(--font-size-sm);
  transition: background var(--transition-fast);
}
.prog-head:hover { background: var(--color-bg-hover); }
.prog-chevron { color: var(--color-text-secondary); flex-shrink: 0; }
.prog-nom { font-weight: 700; font-size: var(--font-size-base); overflow-wrap: anywhere; }
.prog-actions {
  display: flex; justify-content: flex-end; gap: var(--spacing-sm); flex-wrap: wrap;
  padding: var(--spacing-sm) var(--spacing-lg);
}
.prog-body {
  padding: var(--spacing-md) var(--spacing-lg);
  display: flex; flex-direction: column; gap: var(--spacing-lg);
  border-top: 1px solid var(--color-border);
}
.prog-semaine { display: flex; flex-direction: column; gap: 6px; }
.prog-semaine-titre {
  font-size: var(--font-size-xs); font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.4px; color: var(--color-text-muted);
}

.seance-prog-block { border: 1px solid var(--color-border); border-radius: var(--radius-md); overflow: hidden; }
.seance-prog-head {
  width: 100%;
  display: flex; align-items: center; gap: var(--spacing-md);
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-bg);
  border: none; font-family: inherit; color: inherit; text-align: left; cursor: pointer;
  font-size: var(--font-size-sm);
  transition: background var(--transition-fast);
}
.seance-prog-head:hover { background: var(--color-bg-hover); }
.seance-prog-chevron { color: var(--color-text-secondary); flex-shrink: 0; }
.seance-prog-nom { font-weight: 600; overflow-wrap: anywhere; }
.exo-count-badge {
  font-size: var(--font-size-xs); font-weight: 600; white-space: nowrap; flex-shrink: 0;
  padding: 2px 8px; border-radius: var(--radius-full);
  background: var(--color-bg-tertiary); color: var(--color-text-secondary);
}
.seance-prog-body { padding: var(--spacing-md); display: flex; flex-direction: column; gap: var(--spacing-md); }
.seance-prog-body .exo-groupe-log + .exo-groupe-log:not(.is-superset) {
  padding-top: var(--spacing-md);
  border-top: 1px solid var(--color-border);
}

.series-chips { display: flex; flex-wrap: wrap; gap: 4px; padding-left: 34px; }
.serie-chip {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: var(--font-size-xs); color: var(--color-text-secondary);
  padding: 3px 9px; border-radius: var(--radius-full);
  background: var(--color-bg-secondary); border: 1px solid var(--color-border);
}
.serie-chip-num { font-weight: 700; color: var(--color-text-muted); }

.histo-filtres { display: flex; gap: var(--spacing-sm); flex-wrap: wrap; }
.select-histo {
  min-height: var(--tap-min);
  padding: 0 var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--font-size-base);
  background: var(--color-bg);
  flex: 1;
  min-width: 160px;
}

.histo-resume { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: var(--spacing-sm); }
.histo-stat {
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px;
  padding: var(--spacing-md) var(--spacing-sm);
  border: 1px solid var(--color-border); border-radius: var(--radius-lg);
  background: var(--color-bg); text-align: center;
}
.histo-stat-valeur { font-size: var(--font-size-xl); font-weight: 700; }
.histo-stat-valeur.histo-stat-periode { font-size: var(--font-size-sm); }
.histo-stat-valeur.taux-done { color: var(--color-valid-text-strong); }
.histo-stat-valeur.taux-warn { color: var(--color-warning-text-strong); }
.histo-stat-valeur.taux-skip { color: var(--color-danger-text); }
.histo-stat-valeur.variation-hausse { color: var(--color-warning-text-strong); }
.histo-stat-valeur.variation-baisse { color: var(--color-valid-text-strong); }
.histo-stat-label { font-size: var(--font-size-xs); color: var(--color-text-secondary); line-height: 1.3; }

.histo-switcher { display: flex; gap: var(--spacing-sm); flex-wrap: wrap; }
.histo-chip {
  display: inline-flex; align-items: center; gap: 6px;
  min-height: 36px; padding: 0 var(--spacing-lg);
  border: 1px solid var(--color-border); border-radius: var(--radius-full);
  background: var(--color-bg); color: var(--color-text-secondary);
  font-size: var(--font-size-sm); font-weight: 500; cursor: pointer;
}
.histo-chip.active { background: var(--color-primary-light); border-color: var(--color-primary); color: var(--color-primary-text); font-weight: 600; }

/* En-tête repliable commun (programme, séance, séance réalisée) : un titre qui
   peut s'allonger et une ligne de méta qui s'enroule dessous, pour qu'aucun
   badge ne vienne écraser le nom sur un écran étroit. */
.bloc-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
.bloc-titre { display: flex; align-items: center; justify-content: space-between; gap: var(--spacing-sm); }
.bloc-meta {
  display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
  font-size: var(--font-size-xs); color: var(--color-text-secondary);
}
.meta-sep { color: var(--color-text-muted); }
.meta-jour { text-transform: capitalize; }

.session-block { border: 1px solid var(--color-border); border-radius: var(--radius-lg); overflow: hidden; flex-shrink: 0; background: var(--color-bg); box-shadow: var(--shadow-card); }
.session-head {
  width: 100%;
  padding: var(--spacing-md) var(--spacing-lg);
  background: var(--color-bg);
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  font-size: var(--font-size-sm);
  border: none;
  font-family: inherit;
  color: inherit;
  text-align: left;
  cursor: pointer;
  transition: background var(--transition-fast);
}
.session-head:hover { background: var(--color-bg-hover); }
.session-body { border-top: 1px solid var(--color-border); }
.session-nom { font-weight: 600; overflow-wrap: anywhere; }
.session-date::first-letter { text-transform: uppercase; }
.session-chevron { color: var(--color-text-secondary); flex-shrink: 0; }
.taux-badge {
  font-size: var(--font-size-xs); font-weight: 700; white-space: nowrap; flex-shrink: 0;
  padding: 3px 9px; border-radius: var(--radius-full);
  background: var(--color-bg-tertiary); color: var(--color-text-secondary);
}
.taux-badge.taux-done { background: var(--color-valid-bg); color: var(--color-valid-text-strong); }
.taux-badge.taux-warn { background: var(--color-warning-bg); color: var(--color-warning-text-strong); }
.taux-badge.taux-skip { background: var(--color-danger-bg); color: var(--color-danger-text); }

.poids-calendrier-head { display: flex; align-items: center; justify-content: space-between; gap: var(--spacing-sm); }
.poids-mois-label { font-size: var(--font-size-base); font-weight: 700; text-transform: capitalize; }
.poids-calendrier-grille { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; }
.poids-jour-label { text-align: center; font-size: var(--font-size-xs); font-weight: 600; color: var(--color-text-muted); padding-bottom: 4px; }
.poids-jour-case {
  aspect-ratio: 1;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px;
  border: 1px solid var(--color-border); border-radius: var(--radius-md);
  background: var(--color-bg); font-size: var(--font-size-xs); padding: 2px;
}
.poids-jour-case.vide { visibility: hidden; border: none; }
.poids-jour-case.est-aujourdhui { border-color: var(--color-primary); border-width: 2px; }
.poids-jour-case.a-une-valeur { background: var(--color-valid-bg-soft); border-color: var(--color-valid-border); }
.poids-jour-num { font-weight: 600; }
.poids-jour-val { font-size: 10px; font-weight: 700; color: var(--color-valid-text-strong); }
.poids-legende {
  display: flex; align-items: center; gap: var(--spacing-md); flex-wrap: wrap;
  font-size: var(--font-size-xs); color: var(--color-text-muted);
}
.poids-legende span { display: inline-flex; align-items: center; gap: 4px; }
.poids-dot {
  width: 9px; height: 9px; border-radius: 3px;
  background: var(--color-valid-bg-soft); border: 1px solid var(--color-valid-border);
}
.session-body { padding: var(--spacing-md) var(--spacing-lg); display: flex; flex-direction: column; gap: var(--spacing-lg); }

.exo-groupe-log { display: flex; flex-direction: column; gap: var(--spacing-md); }
.superset-banner { display: flex; align-items: center; gap: 6px; font-size: var(--font-size-xs); color: var(--color-superset-text); font-weight: 600; }
.exo-groupe-log.is-superset {
  padding: var(--spacing-md);
  background: var(--color-superset-bg);
  border: 1px solid var(--color-superset-border);
  border-left: 4px solid var(--color-primary);
  border-radius: var(--radius-lg);
}
.exo-groupe-log.is-superset .exo-bloc + .exo-bloc { padding-top: var(--spacing-md); border-top: 1px dashed var(--color-superset-border); }

.exo-bloc { display: flex; flex-direction: column; gap: var(--spacing-sm); }
.exo-header { display: flex; align-items: center; gap: var(--spacing-sm); }
.exo-num, .exo-letter {
  width: 26px;
  height: 26px;
  border-radius: var(--radius-sm);
  background: var(--color-primary-light);
  color: var(--color-superset-text);
  font-size: var(--font-size-xs);
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.exo-letter { background: var(--color-primary); color: var(--color-on-primary); }
.exo-name { font-size: var(--font-size-base); font-weight: 600; flex: 1; min-width: 0; overflow-wrap: anywhere; }

.comparatif-grid { display: flex; flex-direction: column; gap: 4px; }
.comparatif-header {
  display: grid;
  grid-template-columns: 40px 1.3fr 20px 1.3fr 24px 40px;
  gap: var(--spacing-sm);
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  padding: 0 var(--spacing-sm) 4px;
}
.comparatif-row {
  display: grid;
  grid-template-columns: 40px 1.3fr 20px 1.3fr 24px 40px;
  gap: var(--spacing-sm);
  align-items: center;
  padding: var(--spacing-sm);
  border-radius: var(--radius-md);
  font-size: var(--font-size-base);
}
.comparatif-row.statut-done { background: var(--color-valid-bg-soft); }
.comparatif-row.statut-done .statut-icon { color: var(--color-valid-text); }
.comparatif-row.statut-warn { background: var(--color-warning-bg-soft); }
.comparatif-row.statut-warn .statut-icon { color: var(--color-warning-icon); }
.comparatif-row.statut-skip { background: var(--color-danger-bg-soft); }
.comparatif-row.statut-skip .statut-icon { color: var(--color-danger-text); }
.prescrit-cell { color: var(--color-text-secondary); font-size: var(--font-size-sm); }
.comparatif-arrow { font-size: var(--font-size-sm); color: var(--color-text-muted); justify-self: center; }
.realise-cell { font-weight: 600; }
.non-fait { display: inline-flex; align-items: center; gap: 4px; color: var(--color-danger-text); font-weight: 500; font-style: normal; }
.statut-icon { display: flex; justify-content: center; }
.btn-reaction {
  width: 36px;
  height: 36px;
  border: 1px dashed var(--color-border-strong);
  border-radius: 50%;
  background: transparent;
  color: var(--color-text-muted);
  font-size: var(--font-size-lg);
  line-height: 1;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: transform var(--transition-fast), background var(--transition-fast);
}
.btn-reaction:hover { background: var(--color-bg); color: var(--color-primary-dark); }
.btn-reaction.pose { border-style: solid; border-color: var(--color-primary); background: var(--color-primary-light); }
.reaction-choix {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 6px;
  padding: 4px var(--spacing-sm) var(--spacing-sm);
  animation: reaction-arrivee 0.25s var(--ease-standard);
}
@keyframes reaction-arrivee { from { opacity: 0; transform: translateY(-4px); } }
.reaction-option {
  width: 40px;
  height: 40px;
  border: 1px solid var(--color-border);
  border-radius: 50%;
  background: var(--color-bg);
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
  transition: transform var(--transition-fast);
}
.reaction-option:hover { transform: scale(1.15); }
.reaction-option.active { border-color: var(--color-primary); background: var(--color-primary-light); }
.reaction-aide { flex-basis: 100%; text-align: right; font-size: var(--font-size-xs); color: var(--color-text-muted); }
@media (prefers-reduced-motion: reduce) {
  .reaction-choix { animation: none; }
  .reaction-option:hover { transform: none; }
}
.serie-num {
  font-size: var(--font-size-xs);
  font-weight: 700;
  color: var(--color-text-secondary);
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-sm);
  text-align: center;
  padding: 4px 0;
}

@media (max-width: 768px) {
  .fiche-athlete { padding: var(--spacing-md) var(--spacing-lg); }
  .fiche-header { padding: var(--spacing-md); gap: var(--spacing-md); }
  .fiche-avatar { width: 48px; height: 48px; font-size: var(--font-size-base); }
  .tab { padding: var(--spacing-sm) var(--spacing-md); }
  .detail-grid { grid-template-columns: 1fr; }
  .comparatif-header, .comparatif-row { grid-template-columns: 30px 1fr 16px 1fr 20px 36px; gap: 6px; }
  .prescrit-cell, .non-fait { font-size: var(--font-size-xs); }
  /* L'écran est trop étroit pour aligner les séries sous le nom de l'exercice */
  .series-chips { padding-left: 0; }
  .prog-head, .prog-body, .prog-actions { padding-left: var(--spacing-md); padding-right: var(--spacing-md); }
  .session-head { padding: var(--spacing-md); }
}
</style>
