<template>
  <div v-defilement-fluide class="fiche-athlete" @pointerdown="onSwipeStart" @pointerup="onSwipeEnd" @pointercancel="onSwipeCancel">
    <div class="fiche-topbar">
      <button class="btn btn-sm btn-ghost retour-fiche" @click="$emit('fermer')">
        <i class="ti ti-arrow-left"></i> Retour
      </button>
      <div class="fiche-topbar-actions">
        <button class="btn btn-sm" @click="modalGroupes = true"><i class="ti ti-tags"></i> Groupes</button>
        <button class="btn btn-sm btn-ghost btn-retirer" @click="retirerDuCercle"><i class="ti ti-user-minus"></i> Retirer</button>
      </div>
    </div>

    <header class="fiche-header" :class="`activite-${niveauActivite(athlete.resume)}`">
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
        <div v-if="progression" class="fiche-titre">
          <TitreAthlete :progression="progression" taille="md" />
          <span v-if="progression.xp_niveau_suivant" class="fiche-xp" :title="`${fr(progression.xp_total)} XP au total`">
            <span class="jauge" role="progressbar" :aria-valuenow="progression.xp_dans_niveau" aria-valuemin="0" :aria-valuemax="progression.xp_niveau_suivant" aria-label="XP vers le niveau suivant">
              <span class="jauge-remplie" :style="{ width: `${pourcentageNiveau}%` }"></span>
            </span>
            <span class="fiche-xp-texte">{{ fr(progression.xp_dans_niveau) }} / {{ fr(progression.xp_niveau_suivant) }} XP</span>
          </span>
        </div>
        <div class="fiche-activite" v-if="athlete.resume">
          <span class="activite-libelle">{{ libelleActivite(athlete.resume) }}</span>
          <span class="activite-jours" v-if="athlete.resume.jours_actifs_28j">
            · {{ athlete.resume.jours_actifs_28j }} j actif{{ athlete.resume.jours_actifs_28j > 1 ? 's' : '' }} sur {{ FENETRE_ACTIVITE }}
          </span>
        </div>
        <!-- Profil renseigné par l'athlète : âge, sports, objectif, de quoi
             le joindre. Rien ne s'affiche tant qu'il n'a rien rempli. -->
        <div class="fiche-profil">
          <span v-for="l in lignesProfil" :key="l.cle" class="fiche-profil-item">
            <i class="ti" :class="l.icone"></i>
            <a v-if="l.lien" :href="l.lien">{{ l.texte }}</a>
            <template v-else>{{ l.texte }}</template>
          </span>
          <span class="fiche-profil-item fiche-email"><i class="ti ti-mail"></i>{{ athlete.email }}</span>
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
      <div class="fiche-signaux" v-if="athlete.resume && (athlete.resume.signaux.length > 0 || athlete.resume.blessures_en_cours > 0)">
        <button type="button" class="signal signal-blessure" v-if="athlete.resume.blessures_en_cours > 0" @click="allerA('blessures')">
          <i class="ti ti-bandage"></i>
          {{ athlete.resume.blessures_en_cours }} blessure{{ athlete.resume.blessures_en_cours > 1 ? 's' : '' }} en cours
        </button>
        <span v-for="s in signauxDe(athlete.resume)" :key="s.cle" class="signal" :class="`signal-${s.ton}`">
          <i class="ti" :class="s.icone"></i> {{ s.texte }}
        </span>
      </div>
    </header>

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

    <nav class="tabs" role="tablist" aria-label="Fiche de l'athlète">
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
    </nav>

    <!-- APERÇU : l'essentiel en un coup d'œil, puis les courbes de charge et de wellness -->
    <div v-if="sousOnglet === 'apercu'" class="tab-content">
      <section class="en-bref" aria-label="En bref">
        <button type="button" class="tuile tuile-large" @click="allerA('seances')">
          <span class="tuile-label"><i class="ti ti-history"></i> Dernière séance</span>
          <template v-if="derniereSeance">
            <span class="tuile-valeur tuile-texte">{{ derniereSeance.seance_nom }}<small v-if="derniereSeance.hors_programme"> hors programme</small></span>
            <span class="tuile-sous">
              {{ formatJourRelatif(derniereSeance.date) }} à {{ heureDe(derniereSeance.date) }}
              <span v-if="derniereSeance.total" class="mini-badge" :class="classeTaux(tauxSeance(derniereSeance))">{{ derniereSeance.faites }}/{{ derniereSeance.total }} séries</span>
              <span v-if="texteRessenti(derniereSeance)" class="mini-badge mini-badge-ressenti">{{ texteRessenti(derniereSeance) }}</span>
            </span>
          </template>
          <span v-else class="tuile-valeur tuile-vide">Aucune séance</span>
          <i class="ti ti-chevron-right tuile-chevron" aria-hidden="true"></i>
        </button>

        <div class="tuile" v-if="athlete.resume">
          <span class="tuile-label"><i class="ti ti-activity"></i> Charge 7 jours</span>
          <span class="tuile-valeur">
            {{ Math.round(athlete.resume.charge_semaine) }}<small> UA</small>
            <i class="ti tendance" :class="iconeTendance(athlete.resume.tendance)"></i>
          </span>
          <span class="tuile-sous">
            <span class="acwr-badge" :class="'zone-' + (athlete.resume.acwr.zone || 'insuffisant')" title="ACWR : charge des 7 derniers jours / moyenne des 28">
              <small>ACWR</small> {{ athlete.resume.acwr.valeur !== null ? formatDecimal(athlete.resume.acwr.valeur) : '—' }}
            </span>
            sem. préc. {{ Math.round(athlete.resume.charge_semaine_precedente) }} UA
          </span>
        </div>

        <div class="tuile" v-if="athlete.resume">
          <span class="tuile-label"><i class="ti ti-mood-check"></i> Wellness</span>
          <span class="tuile-valeur">
            <template v-if="athlete.resume.hooper_dernier">
              {{ athlete.resume.hooper_dernier }}<small>/28</small>
              <span class="mini-badge" :class="'wellness-' + athlete.resume.wellness_zone">{{ LIBELLES_WELLNESS[athlete.resume.wellness_zone] }}</span>
            </template>
            <template v-else>—</template>
          </span>
          <span class="tuile-sous">
            <template v-if="athlete.resume.wellness_repondu_aujourdhui"><i class="ti ti-check ok"></i> Rempli aujourd'hui</template>
            <template v-else-if="athlete.resume.dernier_wellness">Dernier : {{ formatJourRelatif(athlete.resume.dernier_wellness) }}</template>
            <template v-else>Jamais rempli</template>
          </span>
        </div>

        <div class="tuile" v-if="athlete.resume">
          <span class="tuile-label"><i class="ti ti-zzz"></i> Sommeil 7 nuits</span>
          <span class="tuile-valeur">{{ athlete.resume.sommeil.moyenne !== null ? formatHeures(athlete.resume.sommeil.moyenne) : '—' }}</span>
          <span class="tuile-sous" :class="'sommeil-' + athlete.resume.sommeil.niveau">
            <template v-if="athlete.resume.sommeil.statut === 'ok'">
              {{ athlete.resume.sommeil.nuits_courtes }} nuit{{ athlete.resume.sommeil.nuits_courtes > 1 ? 's' : '' }} &lt; 7 h
            </template>
            <template v-else>{{ athlete.resume.sommeil.nuits_renseignees }} nuit{{ athlete.resume.sommeil.nuits_renseignees > 1 ? 's' : '' }} renseignée{{ athlete.resume.sommeil.nuits_renseignees > 1 ? 's' : '' }}</template>
          </span>
        </div>

        <button type="button" class="tuile" v-if="athlete.resume" @click="allerA('poids')">
          <span class="tuile-label"><i class="ti ti-scale"></i> Poids</span>
          <span class="tuile-valeur">
            <template v-if="athlete.resume.dernier_poids">{{ formatDecimal(athlete.resume.dernier_poids.poids, 1) }}<small> kg</small></template>
            <template v-else>—</template>
          </span>
          <span class="tuile-sous">{{ athlete.resume.dernier_poids ? formatJourRelatif(athlete.resume.dernier_poids.date) : 'Aucune pesée' }}</span>
          <i class="ti ti-chevron-right tuile-chevron" aria-hidden="true"></i>
        </button>

        <button type="button" class="tuile" :class="{ 'tuile-alerte': nbBlessuresEnCours > 0 }" @click="allerA('blessures')">
          <span class="tuile-label"><i class="ti ti-bandage"></i> Blessures</span>
          <span class="tuile-valeur">{{ nbBlessuresEnCours > 0 ? `${nbBlessuresEnCours} en cours` : 'Aucune' }}</span>
          <span class="tuile-sous">{{ nbBlessuresEnCours > 0 ? 'Déclarée par l\'athlète' : 'en cours' }}</span>
          <i class="ti ti-chevron-right tuile-chevron" aria-hidden="true"></i>
        </button>

        <button type="button" class="tuile" @click="allerA('programme')">
          <span class="tuile-label"><i class="ti ti-layout-grid"></i> Programmes</span>
          <span class="tuile-valeur">{{ programmesAssignes.length }}</span>
          <span class="tuile-sous tuile-coupe">{{ programmesAssignes.length ? programmesAssignes.map(p => p.nom).join(', ') : 'Aucun assigné' }}</span>
          <i class="ti ti-chevron-right tuile-chevron" aria-hidden="true"></i>
        </button>

      </section>

      <div class="section-entete">
        <span class="section-title">Charge &amp; wellness · 90 jours</span>
      </div>
      <div v-if="loadingApercu" class="empty">Chargement…</div>
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

    <!-- SÉANCES : toutes ses séances validées (tous programmes), puis la
         progression exercice par exercice -->
    <div v-if="sousOnglet === 'seances'" class="tab-content">
      <div class="histo-switcher" role="group" aria-label="Affichage">
        <button type="button" class="histo-chip" :class="{ active: vueSeances === 'liste' }" :aria-pressed="vueSeances === 'liste'" @click="vueSeances = 'liste'">
          <i class="ti ti-list-details"></i> Séances
        </button>
        <button type="button" class="histo-chip" :class="{ active: vueSeances === 'courbes' }" :aria-pressed="vueSeances === 'courbes'" @click="ouvrirProgression">
          <i class="ti ti-chart-line"></i> Progression
        </button>
      </div>

      <ListeSeancesRealisees
        v-show="vueSeances === 'liste'"
        :athlete-ids="[athlete.id]"
        :actif="sousOnglet === 'seances' && vueSeances === 'liste'"
        deplier-premiere
        texte-vide="Aucune séance validée par cet athlète pour le moment."
      />

      <template v-if="vueSeances === 'courbes'">
        <div v-if="programmesAssignes.length === 0" class="empty">Aucun programme assigné : pas de progression à tracer.</div>
        <template v-else>
          <div class="histo-filtres">
            <select v-if="programmesAssignes.length > 1" v-model="programmeLogsId" class="select-histo" aria-label="Programme">
              <option v-for="p in programmesAssignes" :key="p.id" :value="p.id">{{ p.nom }}</option>
            </select>
            <select v-if="nomsSeances.length > 1" v-model="seanceFiltre" class="select-histo" aria-label="Séance">
              <option value="toutes">Toutes les séances</option>
              <option v-for="nom in nomsSeances" :key="nom" :value="nom">{{ nom }}</option>
            </select>
          </div>
          <div v-if="loadingLogs" class="empty">Chargement…</div>
          <div v-else-if="courbesProgression.length === 0" class="empty">
            Il faut au moins deux séances réalisées avec le même exercice pour tracer une courbe.
          </div>
          <div class="stat-card" v-for="courbe in courbesProgression" :key="courbe.nom">
            <CourbeProgression
              :points="courbe.points"
              :label="`${courbe.nom} — ${courbe.label}`"
              :unite="courbe.unite"
              :axe-x="courbe.points.length > 8 ? 'dates' : 'tentatives'"
            />
          </div>
        </template>
      </template>
    </div>

    <!-- PROGRAMMES : programmes assignés, dépliables jusqu'aux exercices -->
    <div v-if="sousOnglet === 'programme'" class="tab-content">
      <div class="prog-topbar">
        <span class="prog-topbar-titre">{{ programmesAssignes.length }} programme{{ programmesAssignes.length > 1 ? 's' : '' }} assigné{{ programmesAssignes.length > 1 ? 's' : '' }}</span>
        <button class="btn btn-sm btn-primary" @click="modalAjoutProgramme = true"><i class="ti ti-plus"></i> Ajouter</button>
      </div>

      <div v-if="programmesAssignes.length === 0" class="empty">
        Aucun programme assigné à cet athlète. Utilisez « Ajouter » pour lui en attribuer un.
      </div>

      <div v-for="p in programmesAssignes" :key="p.id" class="prog-block">
        <button type="button" class="prog-head" @click="basculerProgramme(p)" :aria-expanded="programmesOuverts.has(p.id)">
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
          <div v-if="loadingSeances.has(p.id) && !seancesParProgramme[p.id]" class="empty">Chargement…</div>
          <div v-else-if="semainesDuProgramme(p.id).length === 0" class="empty">Ce programme ne contient aucune séance.</div>

          <div v-for="semaine in semainesDuProgramme(p.id)" :key="semaine.numero" class="prog-semaine">
            <div class="prog-semaine-titre">Semaine {{ semaine.numero }}</div>

            <div v-for="seance in semaine.seances" :key="seance.id" class="seance-prog-block">
              <button type="button" class="seance-prog-head" @click="basculerSeanceProg(seance.id)" :aria-expanded="seancesOuvertes.has(seance.id)">
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
                  v-for="groupe in grouperExercices(seance.exercices)"
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

    <!-- POIDS : calendrier des pesées + courbe, lecture seule -->
    <div v-if="sousOnglet === 'poids'" class="tab-content">
      <div v-if="loadingPoids" class="empty">Chargement…</div>
      <div v-else-if="entriesPoids.length === 0" class="empty">Aucune pesée enregistrée pour cet athlète.</div>
      <template v-else>
        <div class="histo-resume">
          <div class="histo-stat">
            <span class="histo-stat-valeur"><span v-compteur="resumePoids.dernier"></span> kg</span>
            <span class="histo-stat-label">dernière pesée — {{ formatDateCourte(resumePoids.dateDernier) }}</span>
          </div>
          <div class="histo-stat">
            <span class="histo-stat-valeur" :class="resumePoids.classeVariation">{{ resumePoids.variation }}</span>
            <span class="histo-stat-label">sur 30 jours</span>
          </div>
          <div class="histo-stat">
            <span class="histo-stat-valeur" v-compteur="resumePoids.nbMois"></span>
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
      <div v-if="loadingBlessures" class="empty">Chargement…</div>
      <div v-else-if="blessures.length === 0" class="empty">Aucune blessure déclarée par cet athlète.</div>
      <template v-else>
        <div class="histo-resume">
          <div class="histo-stat">
            <span class="histo-stat-valeur" :class="{ 'variation-hausse': blessuresEnCours.length > 0 }" v-compteur="blessuresEnCours.length"></span>
            <span class="histo-stat-label">en cours</span>
          </div>
          <div class="histo-stat">
            <span class="histo-stat-valeur" v-compteur="blessuresGueries.length"></span>
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
import ListeSeancesRealisees from './ListeSeancesRealisees.vue'
import TitreAthlete from './TitreAthlete.vue'
import { grouperExercices, typeGroupe, labelTypeGroupe } from '../../data/typesGroupe'
import { labelDureeBlessure, formatDateBlessure, labelAnciennete } from '../../data/blessures'
import { formatHeures, labelNiveauSommeil } from '../../data/sommeil'
import { FENETRE_ACTIVITE, LABELS_NIVEAU_ACTIVITE, niveauActivite, libelleActivite, formatJourRelatif } from '../../data/activite'
import { typeSeance, labelTypeSeance, iconeTypeSeance } from '../../data/typesSeance'
import { heureDe, texteRessenti, tauxSeance, classeTaux } from '../../data/seancesRealisees'
import { signauxDe } from '../../data/signaux'
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
  { cle: 'seances', label: 'Séances', icone: 'ti-history' },
  { cle: 'programme', label: 'Programmes', icone: 'ti-layout-grid' },
  { cle: 'poids', label: 'Poids', icone: 'ti-scale' },
  { cle: 'blessures', label: 'Blessures', icone: 'ti-bandage' }
]
const ONGLETS_FICHE = ONGLETS.map(o => o.cle)

const LIBELLES_WELLNESS = { bon: 'Bon', moyen: 'Moyen', degrade: 'Dégradé' }

const pad2 = (n) => String(n).padStart(2, '0')

export default {
  components: {
    CourbeProgression, GraphiqueDouble, GraphiqueAcwrZones, GraphiqueBarres,
    GroupesManagerModal, AssignerProgrammeModal, ListeSeancesRealisees, TitreAthlete
  },
  emits: ['fermer', 'modifie', 'ouvrir-programme', 'changer-onglet'],
  props: {
    athlete: { type: Object, required: true },
    programmes: { type: Array, default: () => [] },
    groupes: { type: Array, default: () => [] },
    monCercle: { type: Array, default: () => [] },
    // Onglet affiché, porté par l'adresse de la page (bouton retour du téléphone)
    onglet: { type: String, default: 'apercu' }
  },
  setup(props, { emit }) {
    const api = useApi()
    const authStore = useAuthStore()
    const estSuperPrepa = computed(() => authStore.role === 'super_prepa')

    // « historique » : nom de l'onglet Séances avant la refonte (liens gardés)
    const sousOnglet = computed(() => {
      const cle = props.onglet === 'historique' ? 'seances' : props.onglet
      return ONGLETS_FICHE.includes(cle) ? cle : 'apercu'
    })
    const modalGroupes = ref(false)

    const groupesDe = computed(() => props.groupes.filter(g => g.athletes.find(a => a.id === props.athlete.id)))
    const initiales = (nom) => nom.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    const fr = (n) => Number(n || 0).toLocaleString('fr-FR')
    const formatDecimal = (v, decimales = 2) => Number(v).toFixed(decimales).replace('.', ',').replace(/,0+$/, '')
    const iconeTendance = (t) => ({ hausse: 'ti-trending-up', baisse: 'ti-trending-down', stable: 'ti-minus' }[t] || 'ti-minus')

    // --- Titre, niveau et dernière séance (résumé du cercle) ---
    const progression = computed(() => props.athlete.resume?.progression || null)
    const pourcentageNiveau = computed(() => {
      const p = progression.value
      if (!p?.xp_niveau_suivant) return 100
      return Math.min(100, Math.round((p.xp_dans_niveau / p.xp_niveau_suivant) * 100))
    })
    const derniereSeance = computed(() => props.athlete.resume?.derniere_seance_info || null)

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

    // --- Aperçu (monitoring) ---
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

    // --- Programmes : contenu des programmes assignés, assigner/retirer ---
    const enCours = ref(new Set())
    const modalAjoutProgramme = ref(false)
    const programmesOuverts = ref(new Set())
    const seancesOuvertes = ref(new Set())
    const seancesParProgramme = ref({})
    const loadingSeances = ref(new Set())

    const estAssigne = (p) => p.athletes.some(a => a.id === props.athlete.id)
    const programmesAssignes = computed(() => props.programmes.filter(p => estAssigne(p)))
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
      } catch (e) {
        erreurFiche.value = e.message || 'Impossible de charger ce programme'
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
    const resumeSerie = (serie, type) => {
      const parts = []
      if (type === 'natation' || type === 'athletisme') {
        if (serie.metres) parts.push(`${serie.metres} m`)
        if (serie.intensite) parts.push(serie.intensite)
      } else if (type === 'pliometrie') {
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

    const letterFor = (idx) => String.fromCharCode(65 + idx)

    // --- Séances : liste (composant partagé) ou progression par exercice ---
    const vueSeances = ref('liste')
    const programmeLogsId = ref(null)
    const logs = ref([])
    const loadingLogs = ref(false)
    const seanceFiltre = ref('toutes')

    const fetchLogs = async () => {
      if (!programmeLogsId.value) { logs.value = []; return }
      const programmeId = programmeLogsId.value
      loadingLogs.value = true
      try {
        const donnees = await api.get(`/logs/programme/${programmeId}/athlete/${props.athlete.id}`)
        // un autre programme a pu être choisi pendant le chargement
        if (programmeLogsId.value === programmeId) logs.value = donnees
      } catch (e) {
        erreurFiche.value = e.message || 'Impossible de charger la progression'
      } finally {
        loadingLogs.value = false
      }
    }
    const ouvrirProgression = () => {
      vueSeances.value = 'courbes'
      if (!programmeLogsId.value && programmesAssignes.value.length > 0) {
        programmeLogsId.value = programmesAssignes.value[0].id
      }
    }
    watch(programmeLogsId, () => { seanceFiltre.value = 'toutes'; fetchLogs() })

    const nomsSeances = computed(() => [...new Set(logs.value.map(l => l.seance.nom))].sort((a, b) => a.localeCompare(b)))

    // Une courbe par exercice : un point par séance réalisée (tentative),
    // moyenne du champ « charge » sur ses séries.
    const courbesProgression = computed(() => {
      const parExo = {}
      for (const log of logs.value) {
        if (seanceFiltre.value !== 'toutes' && log.seance.nom !== seanceFiltre.value) continue
        const conf = champCharge(log.seance.type_seance)
        const valeur = parseValeurSerie(log[conf.champ])
        if (isNaN(valeur)) continue
        const jour = log.date.split('T')[0]
        const cle = log.session_id || `${jour}__${log.seance.id}`
        const exo = (parExo[log.exercice.nom] ??= { nom: log.exercice.nom, label: conf.label, unite: conf.unite, tentatives: new Map() })
        if (!exo.tentatives.has(cle)) exo.tentatives.set(cle, { date: jour, valeurs: [] })
        exo.tentatives.get(cle).valeurs.push(valeur)
      }
      return Object.values(parExo)
        .map(e => ({
          nom: e.nom,
          label: e.label,
          unite: e.unite,
          points: [...e.tentatives.values()]
            .map(t => ({ date: t.date, valeur: Math.round((t.valeurs.reduce((a, b) => a + b, 0) / t.valeurs.length) * 100) / 100 }))
            .sort((a, b) => a.date.localeCompare(b.date))
        }))
        .filter(c => c.points.length >= 2)
        .sort((a, b) => a.nom.localeCompare(b.nom))
    })

    const formatDateCourte = (d) => new Date(d).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })

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
      } catch (e) {
        erreurFiche.value = e.message || 'Impossible de charger les pesées'
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

    // Avant l'ouverture de l'onglet, le compteur vient du résumé monitoring
    // déjà chargé pour la liste ; ensuite, des blessures elles-mêmes
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
      } catch (e) {
        erreurFiche.value = e.message || 'Impossible de charger les blessures'
      } finally {
        loadingBlessures.value = false
        blessuresChargees.value = true
      }
    }

    // --- Navigation par onglet (clic ou swipe) ---
    // Chaque onglet charge ses données à sa première ouverture.
    const chargerOnglet = (cle) => {
      if (cle === 'apercu' && !detail.value && !loadingApercu.value) fetchApercu()
      else if (cle === 'poids' && !poidsCharge.value && !loadingPoids.value) fetchPoids()
      else if (cle === 'blessures' && !blessuresChargees.value && !loadingBlessures.value) fetchBlessures()
    }
    watch(sousOnglet, chargerOnglet, { immediate: true })

    // Recentre l'onglet actif dans la barre (qui peut déborder sur mobile) :
    // au swipe comme au clic, l'onglet qui devient actif se replace bien en
    // vue, quitte à faire sortir son opposé de l'autre côté.
    const tabRefs = {}
    const setTabRef = (tab, el) => { if (el) tabRefs[tab] = el }
    watch(sousOnglet, async (tab) => {
      await nextTick()
      tabRefs[tab]?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
    })

    const allerA = (tab) => { if (tab !== sousOnglet.value) emit('changer-onglet', tab) }

    // Swipe gauche/droite pour changer d'onglet, même logique que le swipe
    // de tabs du dashboard athlète (détection au relâché uniquement, pour
    // ne jamais interférer avec le scroll vertical ou les clics).
    const swipeState = { startX: 0, startY: 0, pointerId: null }
    // Coupe la propagation : la fiche a la priorité sur le swipe d'onglets
    // du tableau de bord prépa quand elle est ouverte.
    const onSwipeStart = (e) => {
      e.stopPropagation()
      // Au doigt seulement : à la souris, un glissé sert à sélectionner du
      // texte (un email, un tableau), et la barre d'onglets est à portée.
      if (e.pointerType === 'mouse') return
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

    onMounted(fetchProfil)

    return {
      estSuperPrepa, sousOnglet, modalGroupes, groupesDe, initiales, retirerDuCercle, ONGLETS, erreurFiche,
      profil, photoUrl, lignesProfil, urlApi, fr, formatDecimal, iconeTendance,
      progression, pourcentageNiveau, derniereSeance, signauxDe, LIBELLES_WELLNESS,
      FENETRE_ACTIVITE, LABELS_NIVEAU_ACTIVITE, niveauActivite, libelleActivite, formatJourRelatif,
      typeSeance, labelTypeSeance, iconeTypeSeance, heureDe, texteRessenti, tauxSeance, classeTaux,
      detail, loadingApercu, pointsAcwr, pointsAigueChronique, pointsMonotonie, pointsContrainte,
      pointsHooper, dernierWellness, barresDernierWellness, formatDateCourt,
      pointsSommeil, formatHeures, labelNiveauSommeil,
      enCours, assignerProgramme, retirerProgramme,
      modalAjoutProgramme, programmesDisponibles, programmesOuverts, seancesOuvertes,
      seancesParProgramme, loadingSeances, basculerProgramme, basculerSeanceProg,
      semainesDuProgramme, resumeSerie, grouperExercices, letterFor, typeGroupe, labelTypeGroupe,
      programmesAssignes, vueSeances, ouvrirProgression, programmeLogsId, loadingLogs, seanceFiltre, nomsSeances, courbesProgression,
      formatDateCourte,
      loadingPoids, entriesPoids, courbePoids,
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
  padding: var(--spacing-xl) max(var(--spacing-2xl), calc((100% - 1080px) / 2)) var(--spacing-3xl);
  overflow-y: auto; flex: 1; min-height: 0; touch-action: pan-y;
}

.fiche-topbar { display: flex; align-items: center; justify-content: space-between; gap: var(--spacing-md); flex-wrap: wrap; }
.retour-fiche { flex-shrink: 0; margin-left: calc(-1 * var(--spacing-md)); }
.fiche-topbar-actions { display: flex; gap: var(--spacing-sm); flex-shrink: 0; flex-wrap: wrap; }
.btn-retirer { color: var(--color-danger-text); }
.btn-retirer:hover:not(:disabled) { background: var(--color-danger-bg-soft); color: var(--color-danger-text); }
.erreur-fiche { display: flex; align-items: center; gap: 6px; margin: 0; }
.erreur-fiche-fermer {
  margin-left: auto; min-width: 32px; min-height: 32px;
  border: none; background: transparent; color: inherit; cursor: pointer;
}

/* --- En-tête --- */
.fiche-header {
  display: flex; align-items: flex-start; gap: var(--spacing-lg); flex-wrap: wrap;
  padding: var(--spacing-lg) var(--spacing-xl);
  background: var(--color-bg); border: 1px solid var(--color-border); border-radius: var(--radius-xl);
  box-shadow: var(--shadow-card);
}
.fiche-avatar {
  position: relative; flex-shrink: 0;
  width: 64px; height: 64px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  background: var(--color-avatar-athlete-bg); color: var(--color-avatar-athlete-text);
  font-size: var(--font-size-lg); font-weight: 700;
}
.activite-inactif .fiche-avatar { background: var(--color-bg-tertiary); color: var(--color-text-muted); }
.avatar-pastille {
  position: absolute; right: 1px; bottom: 1px;
  width: 16px; height: 16px; border-radius: 50%;
  border: 2px solid var(--color-bg); background: var(--color-border-strong);
}
.activite-regulier .avatar-pastille, .activite-actif .avatar-pastille { background: var(--color-valid-text); }
.activite-irregulier .avatar-pastille { background: var(--color-warning-icon); }
.fiche-header-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6px; }
.fiche-header-info h3 { margin: 0; font-size: var(--font-size-xl); font-weight: 700; letter-spacing: -0.3px; }
.fiche-header-info h3 .org-badge { margin-left: 6px; font-weight: 500; vertical-align: middle; }
.fiche-titre { display: flex; align-items: center; gap: var(--spacing-md); flex-wrap: wrap; }
.fiche-xp { display: inline-flex; align-items: center; gap: var(--spacing-sm); }
.jauge { display: block; width: 110px; height: 6px; border-radius: var(--radius-full); background: var(--color-bg-tertiary); overflow: hidden; }
.jauge-remplie { display: block; height: 100%; border-radius: inherit; background: var(--gradient-neon); box-shadow: var(--glow-neon); }
.fiche-xp-texte { font-size: var(--font-size-xs); color: var(--color-text-secondary); font-variant-numeric: tabular-nums; }
/* Les deux morceaux passent à la ligne en bloc, jamais au milieu. */
.fiche-activite { display: flex; flex-wrap: wrap; column-gap: 4px; font-size: var(--font-size-xs); color: var(--color-text-secondary); }
.activite-libelle, .activite-jours { white-space: nowrap; }
.activite-libelle { font-weight: 600; color: var(--color-text-muted); }
.activite-regulier .activite-libelle { color: var(--color-valid-text-strong); }
.activite-irregulier .activite-libelle { color: var(--color-warning-text-strong); }
.fiche-profil { display: flex; flex-wrap: wrap; gap: 4px var(--spacing-lg); font-size: var(--font-size-sm); color: var(--color-text-body); }
.fiche-profil-item { display: inline-flex; align-items: center; gap: 6px; min-width: 0; }
.fiche-profil-item .ti { color: var(--color-text-muted); }
.fiche-profil-item a { color: var(--color-primary-text); }
.fiche-email { font-size: var(--font-size-xs); color: var(--color-text-secondary); overflow-wrap: anywhere; }
.groupes-badges { display: flex; gap: 4px; flex-wrap: wrap; }
.groupe-badge { font-size: var(--font-size-xs); font-weight: 600; padding: 2px 8px; border-radius: var(--radius-full); }
.fiche-signaux {
  flex-basis: 100%; display: flex; gap: 6px; flex-wrap: wrap;
  padding-top: var(--spacing-md); border-top: 1px solid var(--color-border);
}
.signal {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 3px 9px; border-radius: var(--radius-full); border: none;
  font-family: inherit; font-size: var(--font-size-xs); font-weight: 600;
  background: var(--color-warning-bg); color: var(--color-warning-text-strong);
}
.signal.signal-surcharge, .signal.signal-blessure { background: var(--color-danger-bg); color: var(--color-danger-text); }
button.signal { cursor: pointer; }

/* --- Onglets --- */
.tabs {
  position: sticky; top: calc(-1 * var(--spacing-xl)); z-index: 4;
  display: flex; gap: 4px; flex-shrink: 0; overflow-x: auto; scroll-behavior: smooth; scrollbar-width: none;
  margin: 0 calc(-1 * var(--spacing-sm));
  padding: 0 var(--spacing-sm);
  border-bottom: 1px solid var(--color-border);
  background: var(--color-bg-app);
}
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

/* --- En bref --- */
.en-bref { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: var(--spacing-sm); }
.tuile {
  position: relative;
  display: flex; flex-direction: column; align-items: flex-start; gap: 4px; min-width: 0;
  padding: var(--spacing-md) var(--spacing-lg);
  background: var(--color-bg); border: 1px solid var(--color-border); border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
  font-family: inherit; color: inherit; text-align: left;
}
button.tuile { cursor: pointer; transition: border-color var(--transition-fast), box-shadow var(--transition-fast); }
button.tuile:hover { border-color: var(--color-primary); box-shadow: var(--shadow-card-hover); }
.tuile-large { grid-column: span 2; }
.tuile-alerte { border-color: var(--color-danger-border); background: var(--color-danger-bg-soft); }
.tuile-label { display: inline-flex; align-items: center; gap: 5px; font-size: var(--font-size-xs); font-weight: 600; color: var(--color-text-secondary); }
.tuile-label .ti { font-size: 15px; color: var(--color-text-muted); }
.tuile-valeur { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; font-size: var(--font-size-xl); font-weight: 700; letter-spacing: -0.3px; color: var(--color-text); font-variant-numeric: tabular-nums; }
.tuile-valeur small { font-size: var(--font-size-xs); font-weight: 600; color: var(--color-text-muted); letter-spacing: 0; }
.tuile-texte { font-size: var(--font-size-lg); padding-right: var(--spacing-lg); overflow-wrap: anywhere; }
.tuile-vide { font-size: var(--font-size-base); color: var(--color-text-muted); }
.tuile-sous { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; font-size: var(--font-size-xs); color: var(--color-text-secondary); }
.tuile-sous .ok { color: var(--color-valid-text); }
.tuile-sous.sommeil-modere { color: var(--color-warning-text-strong); font-weight: 600; }
.tuile-sous.sommeil-eleve { color: var(--color-danger-text); font-weight: 600; }
.tuile-coupe { display: block; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tuile-chevron { position: absolute; top: var(--spacing-md); right: var(--spacing-md); color: var(--color-text-muted); }
.tendance { font-size: var(--font-size-lg); color: var(--color-text-secondary); }
.mini-badge {
  padding: 1px 7px; border-radius: var(--radius-full);
  font-size: 11px; font-weight: 700; white-space: nowrap; letter-spacing: 0;
  background: var(--color-bg-tertiary); color: var(--color-text-secondary);
}
.mini-badge.taux-done, .mini-badge.wellness-bon { background: var(--color-valid-bg); color: var(--color-valid-text-strong); }
.mini-badge.taux-warn, .mini-badge.wellness-moyen { background: var(--color-warning-bg); color: var(--color-warning-text-strong); }
.mini-badge.taux-skip, .mini-badge.wellness-degrade { background: var(--color-danger-bg); color: var(--color-danger-text); }
.mini-badge-ressenti { background: var(--color-primary-light); color: var(--color-primary-text); }
.acwr-badge {
  display: inline-flex; align-items: baseline; gap: 3px;
  padding: 1px 7px; border-radius: var(--radius-full);
  font-size: 11px; font-weight: 700; font-variant-numeric: tabular-nums;
}
.acwr-badge small { font-size: 9px; font-weight: 600; letter-spacing: 0.3px; opacity: 0.75; }
.acwr-badge.zone-optimale { background: var(--color-valid-bg); color: var(--color-valid-text-strong); }
.acwr-badge.zone-vigilance { background: var(--color-warning-bg); color: var(--color-warning-text-strong); }
.acwr-badge.zone-surcharge { background: var(--color-danger-bg); color: var(--color-danger-text); }
.acwr-badge.zone-sous_charge { background: var(--color-bg-tertiary); color: var(--color-text-secondary); }
.acwr-badge.zone-insuffisant { background: var(--color-bg-tertiary); color: var(--color-text-muted); }
.section-entete { margin-top: var(--spacing-sm); }

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
.histo-stat-valeur.variation-hausse { color: var(--color-warning-text-strong); }
.histo-stat-valeur.variation-baisse { color: var(--color-valid-text-strong); }
.histo-stat-label { font-size: var(--font-size-xs); color: var(--color-text-secondary); line-height: 1.3; }

.histo-switcher { display: flex; gap: var(--spacing-sm); flex-wrap: wrap; }
.histo-chip {
  display: inline-flex; align-items: center; gap: 6px;
  min-height: 36px; padding: 0 var(--spacing-lg);
  border: 1px solid var(--color-border); border-radius: var(--radius-full);
  background: var(--color-bg); color: var(--color-text-secondary);
  font-family: inherit; font-size: var(--font-size-sm); font-weight: 500; cursor: pointer;
}
.histo-chip.active { background: var(--color-primary-light); border-color: var(--color-primary); color: var(--color-primary-text); font-weight: 600; }

/* En-tête repliable commun (programme, séance) : un titre qui peut
   s'allonger et une ligne de méta qui s'enroule dessous, pour qu'aucun badge
   ne vienne écraser le nom sur un écran étroit. */
.bloc-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
.bloc-titre { display: flex; align-items: center; justify-content: space-between; gap: var(--spacing-sm); }
.bloc-meta {
  display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
  font-size: var(--font-size-xs); color: var(--color-text-secondary);
}
.meta-sep { color: var(--color-text-muted); }
.meta-jour { text-transform: capitalize; }

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

@media (max-width: 900px) {
  .en-bref { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 768px) {
  .fiche-athlete { padding: var(--spacing-md) var(--spacing-lg) var(--spacing-2xl); }
  .tabs { top: calc(-1 * var(--spacing-md)); margin: 0 calc(-1 * var(--spacing-lg)); padding: 0 var(--spacing-sm); }
  .fiche-header { padding: var(--spacing-md); gap: var(--spacing-md); }
  .fiche-avatar { width: 52px; height: 52px; font-size: var(--font-size-base); }
  .tab { padding: var(--spacing-sm) var(--spacing-md); }
  .detail-grid { grid-template-columns: 1fr; }
  .tuile { padding: var(--spacing-md); }
  .tuile-valeur { font-size: var(--font-size-lg); }
  .tuile-texte { font-size: var(--font-size-base); }
  /* L'écran est trop étroit pour aligner les séries sous le nom de l'exercice */
  .series-chips { padding-left: 0; }
  .prog-head, .prog-body, .prog-actions { padding-left: var(--spacing-md); padding-right: var(--spacing-md); }
}
</style>
