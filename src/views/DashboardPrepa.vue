<template>
  <AppLayout :title="vueLabel">
    <template #nav>
      <div class="nav-item" :class="{ active: onglet === 'athletes' }" @click="onglet = 'athletes'">
        <i class="ti ti-users"></i> Athlètes
      </div>
      <div class="nav-item" :class="{ active: onglet === 'programmes' }" @click="onglet = 'programmes'">
        <i class="ti ti-layout-grid"></i> Programmes
      </div>
      <div class="nav-item" :class="{ active: onglet === 'tests' }" @click="onglet = 'tests'">
        <i class="ti ti-clipboard-list"></i> Tests
      </div>
    </template>

    <template #actions>
      <button class="btn btn-primary" @click="vue = 'form'" v-if="onglet === 'programmes' && vue === 'liste' && sousOngletProgrammes === 'mes-programmes'">
        <i class="ti ti-plus"></i> Nouveau programme
      </button>
    </template>

    <div class="dashboard-root" @pointerdown="onTabSwipeStart" @pointerup="onTabSwipeEnd" @pointercancel="onTabSwipeCancel">
      <!-- Échec d'une action sur un programme : affiché quel que soit le
           défilement, au lieu de l'échec silencieux d'avant. -->
      <div v-if="erreurAction" class="toast-erreur" role="alert">
        <i class="ti ti-alert-triangle"></i>
        <span>{{ erreurAction }}</span>
        <button type="button" class="toast-fermer" aria-label="Fermer" @click="erreurAction = ''">
          <i class="ti ti-x"></i>
        </button>
      </div>

      <AssignerAthleteModal
        v-if="modalAssigner"
        :programme="programmeActif"
        :monCercle="monCercle"
        :groupes="groupes"
        @fermer="modalAssigner = false"
        @modifie="onModifie"
      />

      <!-- ONGLET PROGRAMMES : les programmes existants, et l'Atelier pour en
           construire autrement (prototype). Les sous-onglets disparaissent
           pendant la création classique, pour ne pas en sortir par erreur. -->
      <div v-if="onglet === 'programmes'" class="onglet-wrapper onglet-programmes">
        <nav v-if="vue === 'liste'" class="sous-onglets" aria-label="Programmes">
          <button
            type="button"
            class="sous-onglet"
            :class="{ active: sousOngletProgrammes === 'mes-programmes' }"
            @click="sousOngletProgrammes = 'mes-programmes'"
          >
            <i class="ti ti-layout-grid"></i> Mes programmes
          </button>
          <button
            type="button"
            class="sous-onglet"
            :class="{ active: sousOngletProgrammes === 'atelier' }"
            @click="sousOngletProgrammes = 'atelier'"
          >
            <i class="ti ti-flask"></i> Atelier <span class="badge-beta">bêta</span>
          </button>
        </nav>

        <ProgrammeForm v-if="vue === 'form'" @termine="onTermine" />

        <AtelierProgramme v-else-if="sousOngletProgrammes === 'atelier'" />

        <div v-else class="content-body" :class="{ 'detail-ouvert': mobileDetail }">
          <!-- Liste des programmes : colonne desktop, écran plein mobile -->
          <div class="panel-list">
            <div class="panel-list-entete">
              <span class="section-title">Mes programmes</span>
              <span class="panel-list-compte" v-if="programmes.length > 0">{{ programmes.length }}</span>
            </div>
            <div v-if="programmes.length === 0" class="empty">Aucun programme pour l'instant.</div>
            <button
              v-for="p in programmes"
              :key="p.id"
              type="button"
              class="prog-card"
              :class="{ active: programmeActif?.id === p.id }"
              @click="selectProgramme(p); mobileDetail = true"
            >
              <span class="prog-card-haut">
                <span class="prog-name">{{ p.nom }}</span>
                <span class="badge" :class="p.statut === 'actif' ? 'badge-green' : 'badge-gray'">{{ p.statut }}</span>
              </span>
              <span class="prog-meta">
                <span class="avatars-pile" v-if="p.athletes.length > 0">
                  <span class="avatar-pile" v-for="a in p.athletes.slice(0, 3)" :key="a.id" :title="a.nom">{{ initiales(a.nom) }}</span>
                </span>
                <span>{{ p.athletes.length > 0 ? `${p.athletes.length} athlète${p.athletes.length > 1 ? 's' : ''}` : 'Aucun athlète' }}</span>
              </span>
            </button>
            <button class="btn btn-dashed" @click="vue = 'form'">
              <i class="ti ti-plus"></i> Nouveau
            </button>
          </div>

          <!-- Panel detail -->
          <div class="panel-detail" v-if="programmeActif">
            <button class="btn btn-sm btn-ghost retour-mobile" @click="mobileDetail = false">
              <i class="ti ti-arrow-left"></i> Programmes
            </button>

            <div v-if="editMode" class="edit-banner">
              <i class="ti ti-edit"></i>
              <span>Mode édition : chaque modification est enregistrée automatiquement.</span>
            </div>

            <div class="detail-top">
              <div class="detail-info" v-if="!editMode">
                <h3>{{ programmeActif.nom }}</h3>
                <p v-if="programmeActif.description">{{ programmeActif.description }}</p>
              </div>
              <div class="detail-edit" v-else>
                <input v-model="editNom" placeholder="Nom du programme" />
                <input v-model="editDesc" placeholder="Description" />
              </div>
              <div class="detail-actions">
                <template v-if="!editMode">
                  <button class="btn btn-sm" @click="modalAssigner = true"><i class="ti ti-user-plus"></i> Assigner</button>
                  <button class="btn btn-sm btn-primary" @click="startEditMode"><i class="ti ti-edit"></i> Modifier</button>
                  <button class="btn btn-sm btn-danger" :disabled="occupe" @click="supprimerProgramme(programmeActif)"><i class="ti ti-trash"></i> Supprimer</button>
                </template>
                <template v-else>
                  <button class="btn btn-sm btn-primary" :disabled="occupe" @click="terminerEditMode">✓ Terminer</button>
                </template>
              </div>
            </div>

            <div class="info-grid">
              <div class="info-cell">
                <label>Statut</label>
                <span class="badge" :class="programmeActif.statut === 'actif' ? 'badge-green' : 'badge-gray'">
                  {{ programmeActif.statut }}
                </span>
              </div>
              <div class="info-cell">
                <label>Semaines</label>
                <span class="info-valeur">{{ semainesDisponibles.length }}</span>
              </div>
              <div class="info-cell">
                <label>Séances</label>
                <span class="info-valeur">{{ seances.length }}</span>
              </div>
              <div class="info-cell">
                <label>Athlètes</label>
                <span class="info-valeur">{{ programmeActif.athletes.length }}</span>
              </div>
            </div>

            <div class="section-title">Athlètes assignés</div>
            <div class="athletes-row">
              <span v-if="programmeActif.athletes.length === 0 && !editMode" class="athletes-vide">
                Personne pour l'instant : « Assigner » pour l'attribuer à un athlète ou un groupe.
              </span>
              <div class="athlete-chip" v-for="a in programmeActif.athletes" :key="a.id">
                <div class="mini-av">{{ initiales(a.nom) }}</div>
                {{ a.nom }}
              </div>
              <button v-if="editMode" class="btn btn-sm btn-dashed" @click="modalAssigner = true">
                <i class="ti ti-plus"></i> Ajouter
              </button>
            </div>

            <div class="section-title">Séances &amp; exercices</div>
            <div class="tab-content">
              <div class="semaines-tabs" v-if="semainesDisponibles.length > 0">
                <div
                  v-for="sem in semainesDisponibles"
                  :key="sem"
                  class="semaine-tab"
                  :class="{ active: semaineActive === sem }"
                  @click="semaineActive = sem"
                >
                  <span>Semaine {{ sem }}</span>
                  <button v-if="editMode && semainesDisponibles.length > 1" class="btn-icon-tiny" :disabled="occupe" @click.stop="supprimerSemaine(sem)">
                    <i class="ti ti-x"></i>
                  </button>
                </div>
                <button v-if="editMode" class="semaine-tab semaine-add" :disabled="occupe" @click="dupliquerSemaine">
                  <i class="ti ti-plus"></i> Nouvelle semaine
                </button>
              </div>

              <div v-if="loadingSeances" class="empty">Chargement...</div>

              <div
                v-for="seance in seancesFiltrees"
                :key="seance.id"
                class="seance-block"
              >
                <div class="seance-head" @click="toggleSeance(seance.id)">
                  <span class="type-icone" :class="`type-icone-${typeSeance(seance.type_seance)}`" :title="labelTypeSeance(seance.type_seance)">
                    <i class="ti" :class="iconeTypeSeance(seance.type_seance)"></i>
                  </span>
                  <span v-if="!editMode" class="seance-titre">
                    <span class="seance-nom">{{ seance.nom }}</span>
                    <span class="seance-meta">
                      <span class="type-badge" :class="`type-badge-${typeSeance(seance.type_seance)}`">{{ labelTypeSeance(seance.type_seance) }}</span>
                      <span class="seance-jour" v-if="seance.jour">{{ seance.jour }}</span>
                      <span>{{ seance.exercices?.length || 0 }} exercice{{ seance.exercices?.length > 1 ? 's' : '' }}</span>
                    </span>
                  </span>
                  <template v-else>
                    <select
                      v-model="seance.jour"
                      @focus="onFocusSeanceChamp(seance)"
                      @change="mettreAJourSeance(seance)"
                      @click.stop
                      class="select-jour"
                    >
                      <option value="">Jour</option>
                      <option v-for="j in jours" :key="j" :value="j">{{ j }}</option>
                    </select>
                    <input
                      v-model="seance.nom"
                      @focus="onFocusSeanceChamp(seance)"
                      @change="mettreAJourSeance(seance)"
                      @click.stop
                      class="input-inline"
                      placeholder="Nom de la séance"
                    />
                    <span class="exo-count-badge">{{ seance.exercices?.length || 0 }} exo{{ seance.exercices?.length > 1 ? 's' : '' }}</span>
                  </template>
                  <i class="ti seance-chevron" :class="isSeanceOuverte(seance.id) ? 'ti-chevron-up' : 'ti-chevron-down'"></i>
                  <button v-if="editMode" class="btn btn-sm btn-danger" :disabled="occupe" @click.stop="supprimerSeance(seance)">
                    <i class="ti ti-trash"></i>
                  </button>
                </div>

                <div class="seance-body" v-if="isSeanceOuverte(seance.id)">
                  <div class="empty-seance" v-if="!seance.exercices || seance.exercices.length === 0">
                    Aucun exercice
                  </div>

                  <div
                    v-for="groupe in grouperExercices(seance.exercices)"
                    :key="groupe.key"
                    class="exo-group"
                    :class="{ 'is-superset': groupe.exercices.length > 1 }"
                  >
                    <div v-if="editMode" class="exo-group-toolbar">
                      <button class="btn-icon-tiny" title="Monter" :disabled="occupe || estPremierGroupe(seance, groupe)" @click="deplacerGroupe(seance, groupe, -1)">
                        <i class="ti ti-arrow-up"></i>
                      </button>
                      <button class="btn-icon-tiny" title="Descendre" :disabled="occupe || estDernierGroupe(seance, groupe)" @click="deplacerGroupe(seance, groupe, 1)">
                        <i class="ti ti-arrow-down"></i>
                      </button>
                      <span class="exo-group-toolbar-label">Réordonner</span>
                    </div>

                    <div v-if="groupe.exercices.length > 1" class="superset-banner">
                      <i class="ti ti-link"></i>
                      <select
                        v-if="editMode"
                        class="type-groupe-select"
                        :value="typeGroupe(groupe)"
                        @click.stop
                        @change="changerTypeGroupe(groupe, $event.target.value)"
                      >
                        <option v-for="t in TYPES_GROUPE" :key="t.valeur" :value="t.valeur">{{ t.label }}</option>
                      </select>
                      <span v-else>{{ labelTypeGroupe(typeGroupe(groupe)) }}</span>
                      <span>· {{ groupe.exercices.length }} exercices</span>
                    </div>

                    <div class="exo-list">
                      <div v-for="(exo, eidx) in groupe.exercices" :key="exo.id" class="exo-block" :class="{ 'is-optionnel': exo.optionnel }">
                        <div class="exo-head">
                          <span class="exo-letter" v-if="groupe.exercices.length > 1">{{ letterFor(eidx) }}</span>
                          <span class="exo-num" v-else>{{ exo.ordre }}</span>
                          <ExerciceImage :src="exo.image_url" :src2="exo.image_url_2" :nom="exo.nom" size="md" />
                          <ExerciceAutocomplete
                            v-if="editMode"
                            v-model="exo.nom"
                            placeholder="Nom de l'exercice"
                            @select="item => { exo.catalogue_id = item?.id ?? null; if (item) mettreAJourExercice(exo) }"
                            @blur="mettreAJourExercice(exo)"
                            @click.stop
                          />
                          <span v-else class="exo-name">{{ exo.nom }}</span>
                          <span v-if="!editMode && exo.optionnel" class="optionnel-badge">optionnelle</span>
                          <label v-if="editMode" class="optionnel-check" @click.stop>
                            <input type="checkbox" v-model="exo.optionnel" @change="mettreAJourExercice(exo)" />
                            Optionnelle
                          </label>
                          <button v-if="editMode" class="btn btn-sm btn-danger" :disabled="occupe" @click="supprimerExercice(seance, exo)">
                            <i class="ti ti-trash"></i>
                          </button>
                        </div>
                      </div>
                    </div>

                    <template v-if="editMode && groupe.exercices[0].series.length === 0">
                      <button
                        v-if="!getGroupeForm(groupe, groupe.exercices[0])._formSupersetOuvert"
                        class="btn btn-sm btn-secondary btn-superset"
                        @click="getGroupeForm(groupe, groupe.exercices[0])._formSupersetOuvert = true"
                      >
                        <i class="ti ti-link"></i> Ajouter un superset à ce groupe
                      </button>
                      <div v-else class="add-exo-superset-form">
                        <ExerciceAutocomplete
                          v-model="getGroupeForm(groupe, groupe.exercices[0])._nouvelExoNom"
                          placeholder="Nom de l'exercice à enchaîner"
                          @select="item => getGroupeForm(groupe, groupe.exercices[0])._nouvelExoCatalogueId = item?.id ?? null"
                        />
                        <button class="btn btn-sm btn-primary" @click="ajouterAuSupersetEdit(seance, groupe)" :disabled="occupe || !getGroupeForm(groupe, groupe.exercices[0])._nouvelExoNom">+ Ajouter</button>
                        <button class="btn btn-sm btn-secondary" @click="getGroupeForm(groupe, groupe.exercices[0])._formSupersetOuvert = false">Annuler</button>
                      </div>
                    </template>

                    <div v-if="groupe.exercices[0].series.length > 0">
                      <div class="groupe-series-head" @click="toggleGroupeSeries(groupe.key + '_' + seance.id)">
                        <span class="series-count">{{ groupe.exercices[0].series.length }} séries</span>
                        <i class="ti series-chevron" :class="isGroupeSeriesOuvert(groupe.key + '_' + seance.id) ? 'ti-chevron-up' : 'ti-chevron-down'"></i>
                      </div>

                      <div v-if="isGroupeSeriesOuvert(groupe.key + '_' + seance.id)" class="series-display">
                        <div v-for="serieIdx in groupe.exercices[0].series.length" :key="serieIdx" class="serie-group-row">
                          <div class="serie-label">Série {{ serieIdx }}</div>
                          <div class="serie-exos">
                            <div v-for="(exo, eidx) in groupe.exercices" :key="exo.id" class="serie-exo">
                              <span class="exo-letter-mini" v-if="groupe.exercices.length > 1">{{ letterFor(eidx) }}</span>
                              <strong>{{ exo.nom }}</strong>
                              <template v-if="!editMode">
                                <span class="serie-values">
                                  <template v-if="seance.type_seance === 'musculation' || !seance.type_seance">
                                    <span v-if="exo.series[serieIdx-1]?.nb_reps">{{ exo.series[serieIdx-1].nb_reps }} reps</span>
                                    <span v-if="exo.series[serieIdx-1]?.poids_cible"> · {{ exo.series[serieIdx-1].poids_cible }}</span>
                                    <span v-if="exo.series[serieIdx-1]?.rm"> · {{ exo.series[serieIdx-1].rm }}</span>
                                    <span v-if="exo.series[serieIdx-1]?.tempo"> · {{ exo.series[serieIdx-1].tempo }}</span>
                                    <span v-if="groupe.exercices.length === 1 && exo.series[serieIdx-1]?.temps_repos" class="repos-tag"> · repos {{ exo.series[serieIdx-1].temps_repos }}</span>
                                  </template>
                                  <template v-else-if="seance.type_seance === 'natation' || seance.type_seance === 'athletisme'">
                                    <span v-if="exo.series[serieIdx-1]?.metres">{{ exo.series[serieIdx-1].metres }}m</span>
                                    <span v-if="exo.series[serieIdx-1]?.intensite"> · {{ exo.series[serieIdx-1].intensite }}</span>
                                    <span v-if="groupe.exercices.length === 1 && exo.series[serieIdx-1]?.temps_repos" class="repos-tag"> · repos {{ exo.series[serieIdx-1].temps_repos }}</span>
                                  </template>
                                  <template v-else-if="seance.type_seance === 'pliometrie'">
                                    <span v-if="exo.series[serieIdx-1]?.bonds">{{ exo.series[serieIdx-1].bonds }} bonds</span>
                                    <span v-if="exo.series[serieIdx-1]?.intensite"> · {{ exo.series[serieIdx-1].intensite }}</span>
                                    <span v-if="groupe.exercices.length === 1 && exo.series[serieIdx-1]?.temps_repos" class="repos-tag"> · repos {{ exo.series[serieIdx-1].temps_repos }}</span>
                                  </template>
                                </span>
                              </template>
                              <template v-else>
                                <div class="serie-inputs">
                                  <template v-if="seance.type_seance === 'musculation' || !seance.type_seance">
                                    <label class="mini-field"><span>reps</span><input v-model="exo.series[serieIdx-1].nb_reps" @change="mettreAJourSerie(exo.series[serieIdx-1])" class="mini-input" /></label>
                                    <label class="mini-field"><span>charge</span><input v-model="exo.series[serieIdx-1].poids_cible" @change="mettreAJourSerie(exo.series[serieIdx-1])" class="mini-input" /></label>
                                    <label class="mini-field"><span>%RM</span><input v-model="exo.series[serieIdx-1].rm" @change="mettreAJourSerie(exo.series[serieIdx-1])" class="mini-input" /></label>
                                    <label class="mini-field"><span>tempo</span><input v-model="exo.series[serieIdx-1].tempo" @change="mettreAJourSerie(exo.series[serieIdx-1])" class="mini-input" /></label>
                                    <label v-if="groupe.exercices.length === 1" class="mini-field"><span>repos</span><input v-model="exo.series[serieIdx-1].temps_repos" @change="mettreAJourSerie(exo.series[serieIdx-1])" class="mini-input repos-input" /></label>
                                  </template>
                                  <template v-else-if="seance.type_seance === 'natation' || seance.type_seance === 'athletisme'">
                                    <label class="mini-field"><span>mètres</span><input v-model="exo.series[serieIdx-1].metres" @change="mettreAJourSerie(exo.series[serieIdx-1])" class="mini-input" /></label>
                                    <label class="mini-field"><span>intensité</span><input v-model="exo.series[serieIdx-1].intensite" @change="mettreAJourSerie(exo.series[serieIdx-1])" class="mini-input" /></label>
                                    <label v-if="groupe.exercices.length === 1" class="mini-field"><span>repos</span><input v-model="exo.series[serieIdx-1].temps_repos" @change="mettreAJourSerie(exo.series[serieIdx-1])" class="mini-input repos-input" /></label>
                                  </template>
                                  <template v-else-if="seance.type_seance === 'pliometrie'">
                                    <label class="mini-field"><span>bonds</span><input v-model="exo.series[serieIdx-1].bonds" @change="mettreAJourSerie(exo.series[serieIdx-1])" class="mini-input" /></label>
                                    <label class="mini-field"><span>intensité</span><input v-model="exo.series[serieIdx-1].intensite" @change="mettreAJourSerie(exo.series[serieIdx-1])" class="mini-input" /></label>
                                    <label v-if="groupe.exercices.length === 1" class="mini-field"><span>repos</span><input v-model="exo.series[serieIdx-1].temps_repos" @change="mettreAJourSerie(exo.series[serieIdx-1])" class="mini-input repos-input" /></label>
                                  </template>
                                </div>
                              </template>
                            </div>

                            <div v-if="groupe.exercices.length > 1" class="repos-commun">
                              <template v-if="!editMode">
                                <span class="repos-tag" v-if="groupe.exercices[0].series[serieIdx-1]?.temps_repos">
                                  <i class="ti ti-clock"></i> Repos · {{ groupe.exercices[0].series[serieIdx-1].temps_repos }}
                                </span>
                              </template>
                              <template v-else>
                                <span class="repos-label"><i class="ti ti-clock"></i> Repos :</span>
                                <input v-model="groupe.exercices[0].series[serieIdx-1].temps_repos" @change="syncReposSuperset(groupe, serieIdx-1)" placeholder="ex: 1min30" class="mini-input repos-input" />
                              </template>
                            </div>
                          </div>
                          <button v-if="editMode" class="btn-icon-tiny serie-delete-btn" title="Supprimer cette série" :disabled="occupe" @click="supprimerSerieIndex(groupe, serieIdx - 1)">
                            <i class="ti ti-trash"></i>
                          </button>
                        </div>

                        <button v-if="editMode" class="btn btn-sm btn-secondary btn-ajouter-serie" :disabled="occupe" @click="ajouterSerieGroupe(groupe, seance)">
                          <i class="ti ti-plus"></i> Ajouter une série
                        </button>
                      </div>
                    </div>

                    <template v-else-if="editMode">
                      <div class="serie-gen-form">
                        <div v-for="(exo, eidx) in groupe.exercices" :key="exo.id" class="serie-gen-exo">
                          <div class="serie-gen-exo-head">
                            <span class="exo-letter-mini" v-if="groupe.exercices.length > 1">{{ letterFor(eidx) }}</span>
                            <strong>{{ exo.nom }}</strong>
                          </div>
                          <div class="serie-inputs">
                            <template v-if="seance.type_seance === 'musculation' || !seance.type_seance">
                              <label class="mini-field"><span>reps</span><input v-model="getGroupeForm(groupe, exo).params[exo.id].nb_reps" class="mini-input" /></label>
                              <label class="mini-field"><span>charge</span><input v-model="getGroupeForm(groupe, exo).params[exo.id].poids_cible" class="mini-input" /></label>
                              <label class="mini-field"><span>%RM</span><input v-model="getGroupeForm(groupe, exo).params[exo.id].rm" class="mini-input" /></label>
                              <label class="mini-field"><span>tempo</span><input v-model="getGroupeForm(groupe, exo).params[exo.id].tempo" class="mini-input" /></label>
                              <label v-if="groupe.exercices.length === 1" class="mini-field"><span>repos</span><input v-model="getGroupeForm(groupe, exo).temps_repos" class="mini-input repos-input" /></label>
                            </template>
                            <template v-else-if="seance.type_seance === 'natation' || seance.type_seance === 'athletisme'">
                              <label class="mini-field"><span>mètres</span><input v-model="getGroupeForm(groupe, exo).params[exo.id].metres" class="mini-input" /></label>
                              <label class="mini-field"><span>intensité</span><input v-model="getGroupeForm(groupe, exo).params[exo.id].intensite" class="mini-input" /></label>
                              <label v-if="groupe.exercices.length === 1" class="mini-field"><span>repos</span><input v-model="getGroupeForm(groupe, exo).temps_repos" class="mini-input repos-input" /></label>
                            </template>
                            <template v-else-if="seance.type_seance === 'pliometrie'">
                              <label class="mini-field"><span>bonds</span><input v-model="getGroupeForm(groupe, exo).params[exo.id].bonds" class="mini-input" /></label>
                              <label class="mini-field"><span>intensité</span><input v-model="getGroupeForm(groupe, exo).params[exo.id].intensite" class="mini-input" /></label>
                              <label v-if="groupe.exercices.length === 1" class="mini-field"><span>repos</span><input v-model="getGroupeForm(groupe, exo).temps_repos" class="mini-input repos-input" /></label>
                            </template>
                          </div>
                        </div>
                        <div v-if="groupe.exercices.length > 1" class="serie-gen-repos-superset">
                          <span class="repos-label"><i class="ti ti-clock"></i> Repos après le superset :</span>
                          <input v-model="getGroupeForm(groupe, groupe.exercices[0]).temps_repos" placeholder="ex: 1min30" class="mini-input" />
                        </div>
                        <div class="serie-gen-footer">
                          <label class="mini-field"><span>Nb séries</span>
                            <input v-model.number="getGroupeForm(groupe, groupe.exercices[0]).nb_series" type="number" min="1" placeholder="4" class="mini-input" />
                          </label>
                          <button class="btn btn-sm btn-primary" :disabled="occupe" @click="genererSeriesGroupeEdit(groupe, seance)">
                            Générer {{ getGroupeForm(groupe, groupe.exercices[0]).nb_series || '?' }} séries
                          </button>
                        </div>
                      </div>
                    </template>

                    <div v-else class="empty-series">Aucune série définie</div>
                  </div>

                  <div v-if="editMode" class="add-exercice-form">
                    <ExerciceAutocomplete
                      v-model="seance._nouvelExercice.nom"
                      placeholder="Nom de l'exercice"
                      @select="item => seance._nouvelExercice.catalogueId = item?.id ?? null"
                    />
                    <button class="btn btn-sm" @click="ajouterExercice(seance)" :disabled="occupe || !seance._nouvelExercice.nom">+ Exercice</button>
                  </div>
                </div>
              </div>

              <div v-if="editMode" class="add-seance-form">
                <input v-model="nouvelleSeance.nom" placeholder="Nom de la séance" class="input-flex" />
                <select v-model="nouvelleSeance.type_seance">
                  <option value="musculation">Musculation</option>
                  <option value="natation">Natation</option>
                  <option value="athletisme">Athlétisme</option>
                  <option value="pliometrie">Pliométrie</option>
                </select>
                <select v-model="nouvelleSeance.jour">
                  <option value="">Jour</option>
                  <option v-for="j in jours" :key="j" :value="j">{{ j }}</option>
                </select>
                <button class="btn btn-sm" @click="ajouterSeance" :disabled="occupe || !nouvelleSeance.nom">+ Séance</button>
              </div>
            </div>

          </div>
          <!-- fin panel-detail -->

          <div class="panel-detail panel-detail-vide" v-else>Sélectionnez un programme</div>

        </div>
        <!-- fin content-body -->
      </div>
      <!-- fin onglet-wrapper programmes -->

      <!-- ONGLET ATHLETES -->
      <AthletesPanel
        v-if="onglet === 'athletes'"
        :monCercle="monCercle"
        :groupes="groupes"
        :programmes="programmes"
        :actif="onglet === 'athletes'"
        @modifie="onModifie"
        @ouvrir-programme="ouvrirProgrammeDepuisFiche"
      />

      <!-- ONGLET TESTS -->
      <TestsPanel
        v-if="onglet === 'tests'"
        :monCercle="monCercle"
        :actif="onglet === 'tests'"
      />

    </div>
  </AppLayout>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useApi } from '../services/api'
import AppLayout from '../components/AppLayout.vue'
import ProgrammeForm from '../components/prepa/ProgrammeForm.vue'
import AssignerAthleteModal from '../components/prepa/AssignerAthleteModal.vue'
import AthletesPanel from '../components/prepa/AthletesPanel.vue'
import TestsPanel from '../components/prepa/TestsPanel.vue'
import AtelierProgramme from '../components/prepa/AtelierProgramme.vue'
import ExerciceAutocomplete from '../components/prepa/ExerciceAutocomplete.vue'
import ExerciceImage from '../components/ExerciceImage.vue'
import { TYPES_GROUPE, TYPE_GROUPE_DEFAUT, typeGroupe, labelTypeGroupe } from '../data/typesGroupe'
import { typeSeance, labelTypeSeance, iconeTypeSeance } from '../data/typesSeance'
import { useActionUnique } from '../utils/actionUnique'

// Distance horizontale minimale pour valider un swipe. Volontairement haute :
// un doigt qui ripe sur un simple appui ne doit jamais changer d'onglet.
const SEUIL_SWIPE = 80

export default {
  components: { AppLayout, ProgrammeForm, AssignerAthleteModal, AthletesPanel, TestsPanel, AtelierProgramme, ExerciceAutocomplete, ExerciceImage },
  setup() {
    const programmes = ref([])
    const programmeActif = ref(null)
    const seances = ref([])
    const monCercle = ref([])
    const groupes = ref([])
    const loadingSeances = ref(false)
    const modalAssigner = ref(false)
    const vue = ref('liste')
    const onglet = ref('athletes')
    const editMode = ref(false)
    const editNom = ref('')
    const editDesc = ref('')
    const nouvelleSeance = ref({ nom: '', jour: '', type_seance: 'musculation' })
    const semaineActive = ref(1)
    const seanceEnEdition = ref(null)
    const groupeForms = ref({})
    const seancesOuvertes = ref({})
    const groupesSeriesOuverts = ref({})
    const mobileDetail = ref(false)
    const router = useRouter()
    const authStore = useAuthStore()
    const api = useApi()
    // Une création/suppression à la fois (double-clic = doublons), et un
    // message à l'écran quand l'API refuse — jusqu'ici rien ne s'affichait.
    const { occupe, erreur: erreurAction, executer, signaler } = useActionUnique()

    const jours = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']
    const LABELS_ONGLETS = { athletes: 'Athlètes', programmes: 'Programmes', tests: 'Tests' }
    const vueLabel = computed(() => LABELS_ONGLETS[onglet.value] || 'Programmes')
    // Dans l'onglet Programmes : 'mes-programmes' (liste + détail) ou 'atelier'.
    const sousOngletProgrammes = ref('mes-programmes')

    // Swipe entre les onglets Athlètes/Programmes/Tests, même logique que le
    // swipe de tabs du dashboard athlète. Sans effet quand la fiche d'un
    // athlète est ouverte : FicheAthlete.vue stoppe la propagation de ses
    // propres pointerdown/pointerup, son swipe interne (Aperçu/Programme/
    // Séances/Poids) est alors prioritaire. L'Atelier la stoppe aussi : c'est
    // un formulaire, un glissé pour sélectionner du texte ne doit pas changer
    // d'onglet.
    const ONGLETS_PREPA = ['athletes', 'programmes', 'tests']
    const tabSwipeState = { startX: 0, startY: 0, pointerId: null }
    const onTabSwipeStart = (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return
      // un second doigt ne doit pas redéfinir l'origine du geste en cours
      if (!e.isPrimary) return
      tabSwipeState.startX = e.clientX
      tabSwipeState.startY = e.clientY
      tabSwipeState.pointerId = e.pointerId
    }
    // iOS annule le pointeur dès que le navigateur prend la main (début de
    // scroll, appui long, zoom) et dispatche pointercancel sans coordonnées
    // utilisables : depuis (0, 0), dx vaut -startX, soit un swipe d'onglet
    // déclenché par un simple appui. Un pointeur annulé n'est pas un geste.
    const onTabSwipeCancel = () => { tabSwipeState.pointerId = null }
    const onTabSwipeEnd = (e) => {
      if (tabSwipeState.pointerId !== e.pointerId) return
      tabSwipeState.pointerId = null
      const dx = e.clientX - tabSwipeState.startX
      const dy = e.clientY - tabSwipeState.startY
      if (Math.abs(dy) > Math.abs(dx) + 10) return
      const idx = ONGLETS_PREPA.indexOf(onglet.value)
      if (dx <= -SEUIL_SWIPE && idx < ONGLETS_PREPA.length - 1) onglet.value = ONGLETS_PREPA[idx + 1]
      else if (dx >= SEUIL_SWIPE && idx > 0) onglet.value = ONGLETS_PREPA[idx - 1]
    }

    const letterFor = (idx) => String.fromCharCode(65 + idx)

    const toggleSeance = (id) => { seancesOuvertes.value[id] = !seancesOuvertes.value[id] }
    const isSeanceOuverte = (id) => !!seancesOuvertes.value[id]

    const toggleGroupeSeries = (key) => { groupesSeriesOuverts.value[key] = !groupesSeriesOuverts.value[key] }
    const isGroupeSeriesOuvert = (key) => !!groupesSeriesOuverts.value[key]

    const grouperExercices = (exercices) => {
      if (!exercices || exercices.length === 0) return []
      const groupes = []
      const map = {}
      const sorted = [...exercices].sort((a, b) => a.ordre - b.ordre)
      sorted.forEach(exo => {
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

    const getGroupeForm = (groupe, exo) => {
      const key = groupe.key
      if (!groupeForms.value[key]) {
        groupeForms.value[key] = { nb_series: 4, temps_repos: '', params: {}, _formSupersetOuvert: false, _nouvelExoNom: '', _nouvelExoCatalogueId: null }
      }
      const form = groupeForms.value[key]
      groupe.exercices.forEach(e => {
        if (!form.params[e.id]) form.params[e.id] = { nb_reps: '', poids_cible: '', rm: '', tempo: '', metres: '', bonds: '', intensite: '' }
      })
      if (exo && !form.params[exo.id]) form.params[exo.id] = { nb_reps: '', poids_cible: '', rm: '', tempo: '', metres: '', bonds: '', intensite: '' }
      return form
    }

    // Payload d'une série selon le type de séance — partagé entre la
    // génération en masse (genererSeriesGroupeEdit) et l'ajout d'une série
    // isolée (ajouterSerieGroupe).
    const buildSeriePayload = (type, params, tempsRepos) => {
      if (type === 'musculation' || !type) return { nb_reps: params.nb_reps || null, poids_cible: params.poids_cible || null, rm: params.rm || null, tempo: params.tempo || null, temps_repos: tempsRepos || null }
      if (type === 'natation' || type === 'athletisme') return { nb_series: '1', metres: params.metres || null, intensite: params.intensite || null, temps_repos: tempsRepos || null }
      if (type === 'pliometrie') return { nb_series: '1', bonds: params.bonds || null, intensite: params.intensite || null, temps_repos: tempsRepos || null }
      return {}
    }

    const genererSeriesGroupeEdit = (groupe, seance) => executer(async () => {
      const form = groupeForms.value[groupe.key]
      if (!form) return
      const type = seance.type_seance || 'musculation'
      for (const exo of groupe.exercices) {
        const params = form.params[exo.id] || {}
        for (let i = 0; i < form.nb_series; i++) await api.post(`/exercices/${exo.id}/series/`, buildSeriePayload(type, params, form.temps_repos))
      }
      await fetchSeances(programmeActif.value.id)
    })

    // Ajoute une seule série à un groupe déjà généré, en reprenant les
    // valeurs de la dernière série comme point de départ (repos compris).
    const ajouterSerieGroupe = (groupe, seance) => executer(async () => {
      const type = seance.type_seance || 'musculation'
      for (const exo of groupe.exercices) {
        const derniere = exo.series[exo.series.length - 1] || {}
        const data = await api.post(`/exercices/${exo.id}/series/`, buildSeriePayload(type, derniere, derniere.temps_repos))
        exo.series.push(data)
      }
    })

    const supprimerSerieIndex = (groupe, idx) => {
      if (!confirm(`Supprimer la série ${idx + 1} ? Les résultats déjà enregistrés par vos athlètes restent dans leur historique.`)) return
      return executer(async () => {
        for (const exo of groupe.exercices) {
          const serie = exo.series[idx]
          if (serie) {
            await api.del(`/series/${serie.id}`)
            exo.series.splice(idx, 1)
          }
        }
      })
    }

    // Réordonnancement des groupes d'exercices (drag manuel via flèches) :
    // on renumérote l'`ordre` de tous les exercices de la séance en suivant
    // le nouvel ordre des groupes, puis on ne PATCH que ceux qui ont changé.
    const estPremierGroupe = (seance, groupe) => grouperExercices(seance.exercices)[0]?.key === groupe.key
    const estDernierGroupe = (seance, groupe) => {
      const groupes = grouperExercices(seance.exercices)
      return groupes[groupes.length - 1]?.key === groupe.key
    }

    const deplacerGroupe = (seance, groupe, direction) => executer(async () => {
      const groupesOrdre = grouperExercices(seance.exercices)
      const idx = groupesOrdre.findIndex(g => g.key === groupe.key)
      const cible = idx + direction
      if (idx === -1 || cible < 0 || cible >= groupesOrdre.length) return
      const reordonnes = [...groupesOrdre]
      ;[reordonnes[idx], reordonnes[cible]] = [reordonnes[cible], reordonnes[idx]]

      let ordre = 1
      const aPatcher = []
      for (const g of reordonnes) {
        for (const exo of g.exercices) {
          if (exo.ordre !== ordre) aPatcher.push(exo)
          exo.ordre = ordre
          ordre++
        }
      }
      for (const exo of aPatcher) await mettreAJourExercice(exo)
    })

    const syncReposSuperset = (groupe, serieIdx) => signaler(async () => {
      const repos = groupe.exercices[0].series[serieIdx]?.temps_repos
      for (const exo of groupe.exercices) {
        const serie = exo.series[serieIdx]
        if (serie) { serie.temps_repos = repos; await mettreAJourSerie(serie) }
      }
    })

    const ajouterAuSupersetEdit = (seance, groupe) => executer(async () => {
      const form = groupeForms.value[groupe.key]
      if (!form?._nouvelExoNom) return
      let numGroupe = groupe.exercices[0].groupe
      if (!numGroupe) {
        const maxGroupe = Math.max(0, ...seance.exercices.map(e => e.groupe || 0))
        numGroupe = maxGroupe + 1
        const premierExo = groupe.exercices[0]
        premierExo.groupe = numGroupe
        premierExo.type_groupe = TYPE_GROUPE_DEFAUT
        await mettreAJourExercice(premierExo)
      }
      const data = await api.post(`/seances/${seance.id}/exercices/`, { nom: form._nouvelExoNom, ordre: seance.exercices.length + 1, groupe: numGroupe, type_groupe: typeGroupe(groupe), catalogue_id: form._nouvelExoCatalogueId })
      seance.exercices.push({ ...data, series: [] })
      form._nouvelExoNom = ''
      form._nouvelExoCatalogueId = null
      form._formSupersetOuvert = false
      await fetchSeances(programmeActif.value.id)
    })

    const semainesDisponibles = computed(() => {
      const set = new Set(seances.value.map(s => s.semaine || 1))
      return Array.from(set).sort((a, b) => a - b)
    })

    const jourOrdre = { lundi: 1, mardi: 2, mercredi: 3, jeudi: 4, vendredi: 5, samedi: 6, dimanche: 7 }

    const seancesFiltrees = computed(() => {
      return seances.value
        .filter(s => (s.semaine || 1) === semaineActive.value)
        .sort((a, b) => {
          const jourA = jourOrdre[a.jour] || 8
          const jourB = jourOrdre[b.jour] || 8
          if (jourA !== jourB) return jourA - jourB
          return a.ordre - b.ordre
        })
    })

    const fetchProgrammes = async () => {
      programmes.value = await api.get('/programmes/')
      if (programmes.value.length > 0 && !programmeActif.value) programmeActif.value = programmes.value[0]
    }

    const fetchSeances = async (programmeId) => {
      loadingSeances.value = true
      try {
        const data = await api.get(`/programmes/${programmeId}/seances/`)
        seances.value = data.map(s => ({ ...s, _nouvelExercice: { nom: '', catalogueId: null } }))
        seances.value.forEach(s => {
          if (seancesOuvertes.value[s.id] === undefined) {
            seancesOuvertes.value[s.id] = false
          }
        })
        groupesSeriesOuverts.value = {}
        const semaines = [...new Set(seances.value.map(s => s.semaine || 1))]
        if (!semaines.includes(semaineActive.value)) semaineActive.value = semaines[0] || 1
      } catch (e) {
        // sans ça « Chargement… » restait affiché indéfiniment
        erreurAction.value = e.message || 'Impossible de charger les séances'
      } finally {
        loadingSeances.value = false
      }
    }

    const fetchMonCercle = async () => {
      const me = await api.get('/users/me')
      monCercle.value = me.athletes || []
    }

    const fetchGroupes = async () => {
      groupes.value = await api.get('/groupes/')
    }

    const selectProgramme = async (p) => {
      // Rien n'est en attente en mode édition (chaque champ s'enregistre à la
      // volée) : changer de programme termine simplement l'édition.
      if (editMode.value) {
        await terminerEditMode()
        if (editMode.value) return
      }
      programmeActif.value = p
      semaineActive.value = 1
      groupeForms.value = {}
      seancesOuvertes.value = {}
      groupesSeriesOuverts.value = {}
    }

    watch(programmeActif, (p) => {
      if (p) fetchSeances(p.id)
    })

    // Depuis la Fiche Athlète (onglet Athlètes), bouton "Voir / éditer" d'un
    // programme assigné : bascule vers l'onglet Programmes avec ce
    // programme déjà sélectionné.
    const ouvrirProgrammeDepuisFiche = (programme) => {
      onglet.value = 'programmes'
      sousOngletProgrammes.value = 'mes-programmes'
      selectProgramme(programme)
      vue.value = 'liste'
      mobileDetail.value = true
    }

    const startEditMode = () => {
      editNom.value = programmeActif.value.nom
      editDesc.value = programmeActif.value.description || ''
      editMode.value = true
      groupeForms.value = {}
    }

    // Séances, exercices et séries s'enregistrent à chaque modification :
    // « Annuler » laissait croire le contraire. Seuls le nom et la
    // description sont enregistrés ici, s'ils ont changé.
    const terminerEditMode = () => executer(async () => {
      const nom = editNom.value.trim()
      if (!nom) throw new Error('Le nom du programme est obligatoire')
      const description = editDesc.value.trim() || null
      if (nom !== programmeActif.value.nom || description !== (programmeActif.value.description || null)) {
        const data = await api.patch(`/programmes/${programmeActif.value.id}`, { nom, description })
        programmeActif.value = data
        programmes.value = programmes.value.map(p => p.id === data.id ? data : p)
      }
      editMode.value = false
      groupeForms.value = {}
    })

    const ajouterSeance = () => executer(async () => {
      const seancesSemaine = seances.value.filter(s => (s.semaine || 1) === semaineActive.value)
      const data = await api.post(`/programmes/${programmeActif.value.id}/seances/`, {
        nom: nouvelleSeance.value.nom, ordre: seancesSemaine.length + 1,
        jour: nouvelleSeance.value.jour || null, semaine: semaineActive.value,
        type_seance: nouvelleSeance.value.type_seance
      })
      seances.value.push({ ...data, exercices: [], _nouvelExercice: { nom: '', catalogueId: null } })
      seancesOuvertes.value[data.id] = true
      nouvelleSeance.value = { nom: '', jour: '', type_seance: 'musculation' }
    })

    const dupliquerSemaine = () => executer(async () => {
      const nouvellesSeances = await api.post(`/programmes/${programmeActif.value.id}/seances/dupliquer-semaine/${semaineActive.value}`)
      await fetchSeances(programmeActif.value.id)
      if (nouvellesSeances.length > 0) semaineActive.value = nouvellesSeances[0].semaine
    })

    const supprimerSemaine = (numero) => {
      if (!confirm(`Supprimer toute la semaine ${numero} ? Les résultats déjà enregistrés par vos athlètes restent dans leur historique.`)) return
      return executer(async () => {
        await api.del(`/programmes/${programmeActif.value.id}/seances/semaine/${numero}`)
        await fetchSeances(programmeActif.value.id)
      })
    }

    const ajouterExercice = (seance) => executer(async () => {
      const data = await api.post(`/seances/${seance.id}/exercices/`, { nom: seance._nouvelExercice.nom, ordre: seance.exercices.length + 1, groupe: null, catalogue_id: seance._nouvelExercice.catalogueId })
      seance.exercices.push({ ...data, series: [] })
      seance._nouvelExercice = { nom: '', catalogueId: null }
    })

    const mettreAJourSerie = (serie) => signaler(() => api.patch(`/series/${serie.id}`, {
      nb_reps: serie.nb_reps || null, poids_cible: serie.poids_cible || null,
      rm: serie.rm || null, tempo: serie.tempo || null, metres: serie.metres || null,
      bonds: serie.bonds || null, nb_series: serie.nb_series || null,
      intensite: serie.intensite || null, temps_repos: serie.temps_repos || null
    }))

    const supprimerProgramme = (p) => {
      if (!confirm(`Supprimer « ${p.nom} » ? Il disparaîtra aussi chez les athlètes à qui il est assigné. Les résultats déjà enregistrés par vos athlètes restent dans leur historique.`)) return
      return executer(async () => {
        await api.del(`/programmes/${p.id}`)
        programmes.value = programmes.value.filter(x => x.id !== p.id)
        if (programmeActif.value?.id === p.id) { programmeActif.value = programmes.value[0] || null; editMode.value = false }
      })
    }

    const supprimerSeance = (seance) => {
      if (!confirm(`Supprimer la séance « ${seance.nom} » ? Les résultats déjà enregistrés par vos athlètes restent dans leur historique.`)) return
      return executer(async () => {
        await api.del(`/seances/${seance.id}`)
        seances.value = seances.value.filter(s => s.id !== seance.id)
      })
    }

    const supprimerExercice = (seance, exo) => {
      if (!confirm(`Supprimer l'exercice « ${exo.nom} » ? Les résultats déjà enregistrés par vos athlètes restent dans leur historique.`)) return
      return executer(async () => {
        await api.del(`/exercices/${exo.id}`)
        seance.exercices = seance.exercices.filter(e => e.id !== exo.id)
      })
    }

    const onTermine = () => { vue.value = 'liste'; fetchProgrammes() }

    const onModifie = async () => {
      await fetchProgrammes()
      await fetchMonCercle()
      await fetchGroupes()
      if (programmeActif.value) programmeActif.value = programmes.value.find(p => p.id === programmeActif.value.id)
    }

    const logout = () => { authStore.logout(); router.push('/') }
    const initiales = (nom) => nom.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

    onMounted(async () => {
      await fetchProgrammes()
      await fetchMonCercle()
      await fetchGroupes()
    })

    const mettreAJourExercice = (exo) => signaler(async () => {
      const data = await api.patch(`/exercices/${exo.id}`, {
        nom: exo.nom,
        ordre: exo.ordre,
        groupe: exo.groupe || null,
        type_groupe: exo.type_groupe || null,
        optionnel: exo.optionnel || false,
        catalogue_id: exo.catalogue_id
      })
      // la vignette suit immédiatement le choix dans le catalogue (ou son
      // retrait quand le nom est retapé à la main), sans recharger les séances
      exo.image_url = data.image_url
    })

    // Le type est porté par chaque exercice du groupe (le champ `groupe`
    // n'est qu'un numéro, sans entité propre côté backend) : on les met tous
    // à jour pour que supprimer un exercice ne fasse pas perdre le type.
    const changerTypeGroupe = async (groupe, valeur) => {
      for (const exo of groupe.exercices) {
        exo.type_groupe = valeur
        await mettreAJourExercice(exo)
      }
    }

    const onFocusSeanceChamp = (seance) => {
      seanceEnEdition.value = { id: seance.id, nom: seance.nom, jour: seance.jour, ordre: seance.ordre }
    }

    // Un même créneau (nom + jour + ordre) est dupliqué une fois par semaine
    // (cf. dupliquerSemaine) et l'athlète le reconstitue via cette identité
    // (voir seancesAffichees côté DashboardAthlete.vue). Si le prépa renomme
    // ou change le jour d'une seule occurrence, la clé diverge des autres
    // semaines et l'athlète voit apparaître un créneau fantôme en double :
    // on propage donc le changement aux séances sœurs des autres semaines.
    const mettreAJourSeance = (seance) => signaler(async () => {
      const avant = seanceEnEdition.value && seanceEnEdition.value.id === seance.id ? seanceEnEdition.value : null

      await api.patch(`/seances/${seance.id}`, {
        nom: seance.nom,
        ordre: seance.ordre,
        jour: seance.jour || null,
        semaine: seance.semaine,
        type_seance: seance.type_seance
      })

      if (avant && (avant.nom !== seance.nom || avant.jour !== seance.jour)) {
        const soeurs = seances.value.filter(s =>
          s.id !== seance.id &&
          s.ordre === avant.ordre &&
          s.nom === avant.nom &&
          s.jour === avant.jour
        )
        for (const soeur of soeurs) {
          soeur.nom = seance.nom
          soeur.jour = seance.jour
          await api.patch(`/seances/${soeur.id}`, {
            nom: soeur.nom,
            ordre: soeur.ordre,
            jour: soeur.jour || null,
            semaine: soeur.semaine,
            type_seance: soeur.type_seance
          })
        }
      }

      seanceEnEdition.value = null
    })
    return {
      programmes, programmeActif, seances, monCercle, groupes,
      loadingSeances, modalAssigner, vue, onglet, vueLabel,
      onTabSwipeStart, onTabSwipeEnd, onTabSwipeCancel,
      editMode, editNom, editDesc,
      nouvelleSeance, jours, typeSeance, labelTypeSeance, iconeTypeSeance, letterFor, grouperExercices,
      TYPES_GROUPE, typeGroupe, labelTypeGroupe, changerTypeGroupe,
      semaineActive, semainesDisponibles, seancesFiltrees,
      groupeForms, getGroupeForm, genererSeriesGroupeEdit,
      ajouterSerieGroupe, supprimerSerieIndex,
      estPremierGroupe, estDernierGroupe, deplacerGroupe,
      syncReposSuperset, ajouterAuSupersetEdit,
      seancesOuvertes, toggleSeance, isSeanceOuverte,
      groupesSeriesOuverts, toggleGroupeSeries, isGroupeSeriesOuvert,
      selectProgramme, startEditMode, terminerEditMode, occupe, erreurAction,
      ajouterSeance, ajouterExercice, mettreAJourSerie,
      dupliquerSemaine, supprimerSemaine,
      supprimerProgramme, supprimerSeance, supprimerExercice,
      onTermine, onModifie, ouvrirProgrammeDepuisFiche, logout, initiales, sousOngletProgrammes,
      mobileDetail, mettreAJourSeance, mettreAJourExercice, onFocusSeanceChamp
    }
  }
}
</script>

<style scoped>
.toast-erreur {
  position: fixed;
  left: 50%;
  bottom: var(--spacing-lg);
  transform: translateX(-50%);
  z-index: 260;
  width: min(560px, calc(100% - 2 * var(--spacing-lg)));
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-sm) var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-danger-border);
  background: var(--color-danger-bg-soft);
  color: var(--color-danger-text);
  font-size: var(--font-size-sm);
  box-shadow: 0 6px 20px -6px rgba(0, 0, 0, 0.25);
}
.toast-erreur span { flex: 1; }
.toast-fermer {
  flex-shrink: 0;
  width: var(--tap-min);
  height: var(--tap-min);
  border: none;
  background: transparent;
  color: inherit;
  cursor: pointer;
}
@media (max-width: 768px) {
  .toast-erreur { bottom: calc(var(--bottom-nav-h) + env(safe-area-inset-bottom) + var(--spacing-sm)); }
}
.dashboard-root { display: flex; flex: 1; flex-direction: column; overflow: hidden; min-height: 0; touch-action: pan-y; }
.onglet-wrapper { display: flex; flex: 1; overflow: hidden; min-height: 0; }
.onglet-programmes { flex-direction: column; }

/* --- Sous-onglets de Programmes : Mes programmes / Atelier --- */
.sous-onglets {
  display: flex;
  gap: 4px;
  padding: var(--spacing-sm) var(--spacing-lg);
  background: var(--color-bg);
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}
.sous-onglet {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 36px;
  padding: 0 var(--spacing-md);
  border: none;
  border-radius: var(--radius-md);
  background: transparent;
  font-family: inherit;
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: background var(--transition-fast), color var(--transition-fast);
}
.sous-onglet:hover { background: var(--color-bg-secondary); color: var(--color-text-body); }
.sous-onglet.active { background: var(--color-primary-light); color: var(--color-primary-dark); }
.badge-beta {
  padding: 1px 6px;
  border-radius: var(--radius-full);
  background: var(--color-bg);
  color: var(--color-primary-text);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.3px;
  text-transform: uppercase;
}
.sous-onglet:not(.active) .badge-beta { background: var(--color-primary-light); }
.content-body { display: flex; flex: 1; overflow: hidden; min-height: 0; min-width: 0; }

/* --- Liste des programmes --- */
.panel-list {
  width: 280px;
  border-right: 1px solid var(--color-border);
  background: var(--color-bg);
  overflow-y: auto;
  padding: var(--spacing-lg);
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}
.panel-list-entete { display: flex; align-items: center; justify-content: space-between; gap: var(--spacing-sm); margin-bottom: 2px; }
.panel-list-compte {
  min-width: 22px; padding: 1px 7px; border-radius: var(--radius-full);
  background: var(--color-bg-tertiary); color: var(--color-text-secondary);
  font-size: var(--font-size-xs); font-weight: 700; text-align: center;
}
.panel-detail {
  flex: 1;
  overflow-y: auto;
  padding: var(--spacing-lg) var(--spacing-xl);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  min-height: 0;
}
.panel-detail-vide {
  align-items: center;
  justify-content: center;
  color: var(--color-text-muted);
}
.tab-content { display: flex; flex-direction: column; gap: var(--spacing-md); }

.retour-mobile { display: none; align-self: flex-start; }

.edit-banner {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-primary-light);
  color: var(--color-primary-text);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  font-weight: 600;
  flex-shrink: 0;
  position: sticky;
  top: 0;
  z-index: 10;
}

.prog-card {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  width: 100%;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--spacing-md);
  cursor: pointer;
  background: var(--color-bg);
  font-family: inherit;
  color: inherit;
  text-align: left;
  transition: border-color var(--transition-fast), background var(--transition-fast), box-shadow var(--transition-fast);
}
.prog-card:hover { border-color: var(--color-border-strong); background: var(--color-bg-hover); }
.prog-card.active { border-color: var(--color-primary); background: var(--color-primary-light); box-shadow: inset 3px 0 0 var(--color-primary); }
.prog-card.active .prog-name { color: var(--color-primary-text); }
.prog-card-haut { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--spacing-sm); }
.prog-name { font-size: var(--font-size-base); font-weight: 600; overflow-wrap: anywhere; }
.prog-meta { display: flex; gap: var(--spacing-sm); align-items: center; font-size: var(--font-size-xs); color: var(--color-text-secondary); }
.avatars-pile { display: inline-flex; padding-left: 3px; }
.avatar-pile {
  width: 24px; height: 24px; margin-left: -3px; border-radius: 50%;
  display: inline-flex; align-items: center; justify-content: center;
  background: var(--color-avatar-athlete-bg); color: var(--color-avatar-athlete-text);
  border: 2px solid var(--color-bg);
  font-size: 9px; font-weight: 700;
}
.prog-card.active .avatar-pile { border-color: var(--color-primary-light); }

.detail-top { display: flex; justify-content: space-between; align-items: flex-start; gap: var(--spacing-md); flex-shrink: 0; flex-wrap: wrap; }
.detail-info h3 { font-size: var(--font-size-xl); font-weight: 700; margin: 0 0 3px; }
.detail-info p { font-size: var(--font-size-sm); color: var(--color-text-secondary); margin: 0; }
.detail-edit { display: flex; flex-direction: column; gap: 6px; flex: 1; min-width: 200px; }
.detail-edit input {
  min-height: var(--tap-min);
  padding: 0 var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--font-size-base);
  background: var(--color-bg);
}
.detail-actions { display: flex; gap: 6px; flex-shrink: 0; flex-wrap: wrap; }

.info-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: var(--spacing-sm); flex-shrink: 0; }
.info-cell {
  display: flex; flex-direction: column; align-items: flex-start; gap: 4px;
  background: var(--color-bg); border: 1px solid var(--color-border); border-radius: var(--radius-lg);
  padding: var(--spacing-sm) var(--spacing-md);
}
.info-cell label {
  font-size: var(--font-size-xs); font-weight: 600; color: var(--color-text-muted);
  text-transform: uppercase; letter-spacing: 0.4px;
}
.info-valeur { font-size: var(--font-size-lg); font-weight: 700; font-variant-numeric: tabular-nums; }

.athletes-row { display: flex; gap: 6px; flex-wrap: wrap; flex-shrink: 0; }
.athletes-vide { font-size: var(--font-size-sm); color: var(--color-text-muted); }
.athlete-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  padding: 6px 12px;
  font-size: var(--font-size-sm);
}
.mini-av {
  width: var(--avatar-xs);
  height: var(--avatar-xs);
  border-radius: 50%;
  background: var(--color-avatar-athlete-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 9px;
  font-weight: 600;
  color: var(--color-avatar-athlete-text);
}

.semaines-tabs { display: flex; gap: var(--spacing-sm); flex-wrap: wrap; padding: var(--spacing-sm) 0; flex-shrink: 0; align-items: center; }
.semaine-tab {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 40px;
  padding: 0 var(--spacing-lg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  font-family: inherit;
  font-size: var(--font-size-sm);
  cursor: pointer;
  background: var(--color-bg);
  color: var(--color-text-secondary);
  transition: background var(--transition-fast), border-color var(--transition-fast), color var(--transition-fast);
}
.semaine-tab:hover { border-color: var(--color-primary); }
.semaine-tab.active { background: var(--color-primary-light); border-color: var(--color-primary); color: var(--color-primary-text); font-weight: 600; }
.semaine-tab.semaine-add { background: transparent; border-style: dashed; color: var(--color-primary-dark); }
.semaine-tab.semaine-add:hover { background: var(--color-bg-secondary); }
.btn-icon-tiny {
  width: 24px;
  height: 24px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  border: none;
  cursor: pointer;
  background: transparent;
  color: inherit;
  opacity: 0.6;
}
.btn-icon-tiny:hover { opacity: 1; }

/* --- Séances --- */
.seance-block {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  flex-shrink: 0;
  background: var(--color-bg);
  box-shadow: var(--shadow-card);
}
.seance-head {
  padding: var(--spacing-md) var(--spacing-lg);
  min-height: 64px;
  background: var(--color-bg);
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  font-size: var(--font-size-sm);
  font-weight: 500;
  cursor: pointer;
  user-select: none;
  flex-wrap: wrap;
  transition: background var(--transition-fast);
}
.seance-head:hover { background: var(--color-bg-hover); }
.seance-titre { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
.seance-nom { font-size: var(--font-size-base); font-weight: 600; overflow-wrap: anywhere; }
.seance-meta { display: flex; align-items: center; gap: var(--spacing-sm); flex-wrap: wrap; font-size: var(--font-size-xs); color: var(--color-text-secondary); font-weight: 400; }
.seance-jour { text-transform: capitalize; }
.seance-chevron { color: var(--color-text-muted); font-size: var(--font-size-base); }
.seance-body { padding: var(--spacing-md) var(--spacing-lg); display: flex; flex-direction: column; gap: var(--spacing-md); border-top: 1px solid var(--color-border); }
.exo-count-badge {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  background: var(--color-bg-tertiary);
  padding: 2px 8px;
  border-radius: var(--radius-full);
}

.exo-group {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  padding: var(--spacing-md);
  background: var(--color-bg-secondary);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
}
.exo-group.is-superset { background: var(--color-superset-bg); border: 1px solid var(--color-superset-border); border-left: 4px solid var(--color-primary); }
.superset-banner { display: flex; align-items: center; gap: 6px; font-size: var(--font-size-xs); color: var(--color-superset-text); font-weight: 600; }
.type-groupe-select {
  min-height: 32px;
  padding: 0 var(--spacing-sm);
  font-size: var(--font-size-xs);
  font-weight: 700;
  color: var(--color-superset-text);
  background: var(--color-bg);
  border: 1px solid var(--color-superset-border);
  border-radius: var(--radius-sm);
}
.type-groupe-select:focus { outline: none; border-color: var(--color-primary); }
.exo-group-toolbar { display: flex; align-items: center; gap: 4px; }
.exo-group-toolbar-label { font-size: var(--font-size-xs); color: var(--color-text-muted); margin-left: 2px; }
.exo-group-toolbar .btn-icon-tiny:disabled { opacity: 0.25; cursor: not-allowed; }
.exo-list { display: flex; flex-direction: column; gap: 6px; }
.exo-block { display: flex; flex-direction: column; gap: 6px; background: var(--color-bg); border-radius: var(--radius-md); padding: var(--spacing-sm) var(--spacing-md); border: 1px solid var(--color-border); }
.exo-head { display: flex; align-items: center; gap: var(--spacing-sm); flex-wrap: wrap; }
.exo-num, .exo-letter {
  width: 24px;
  height: 24px;
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
.exo-name { font-size: var(--font-size-base); font-weight: 500; flex: 1; }
.exo-block.is-optionnel { background: var(--color-bg-tertiary); }
.exo-block.is-optionnel .exo-name { color: var(--color-text-secondary); }
.optionnel-check {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: var(--tap-min);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
}
.optionnel-check input { width: 18px; height: 18px; }
.optionnel-badge {
  font-size: var(--font-size-xs);
  font-weight: 500;
  color: var(--color-text-secondary);
  background: var(--color-bg-tertiary);
  padding: 2px 8px;
  border-radius: var(--radius-full);
  text-transform: uppercase;
  letter-spacing: 0.3px;
  flex-shrink: 0;
}
.add-exo-superset-form {
  display: flex;
  gap: var(--spacing-sm);
  align-items: center;
  padding: var(--spacing-sm);
  background: var(--color-bg);
  border-radius: var(--radius-md);
  border: 1px dashed var(--color-superset-border);
  flex-wrap: wrap;
}
.btn-superset { align-self: flex-start; }

.groupe-series-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: var(--tap-min);
  padding: 0 var(--spacing-md);
  background: var(--color-bg);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  cursor: pointer;
  user-select: none;
}
.groupe-series-head:hover { border-color: var(--color-primary); background: var(--color-bg-hover); }
.series-count { font-size: var(--font-size-sm); font-weight: 600; color: var(--color-superset-text); }
.series-chevron { font-size: var(--font-size-sm); color: var(--color-text-muted); }

.series-display { display: flex; flex-direction: column; gap: 6px; margin-top: 6px; }
.serie-group-row {
  display: flex;
  gap: var(--spacing-md);
  align-items: flex-start;
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-bg);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
}
.serie-label {
  font-size: var(--font-size-xs);
  font-weight: 700;
  color: var(--color-superset-text);
  padding: 4px 8px;
  background: var(--color-primary-light);
  border-radius: var(--radius-sm);
  white-space: nowrap;
  flex-shrink: 0;
  align-self: flex-start;
}
.serie-exos { display: flex; flex-direction: column; gap: 6px; flex: 1; min-width: 0; }
.serie-delete-btn { flex-shrink: 0; align-self: center; }
.btn-ajouter-serie { align-self: flex-start; }
.serie-exo { display: flex; align-items: baseline; gap: 6px; flex-wrap: wrap; }
.exo-letter-mini {
  font-size: var(--font-size-xs);
  font-weight: 700;
  color: var(--color-on-primary);
  background: var(--color-primary);
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  flex-shrink: 0;
}
.serie-exo strong { font-size: var(--font-size-sm); font-weight: 600; min-width: 80px; }
.serie-values { font-size: var(--font-size-sm); color: var(--color-text-secondary); }
.repos-tag { font-size: var(--font-size-xs); color: var(--color-text-muted); font-style: italic; }

/* Champs de série en édition : libellé au-dessus, saisie à 40px */
.serie-inputs { display: flex; gap: var(--spacing-sm); flex-wrap: wrap; flex: 1; }
.mini-field { display: flex; flex-direction: column; gap: 2px; }
.mini-field > span {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  font-weight: 500;
}
.mini-input {
  min-height: 40px;
  padding: 0 var(--spacing-sm);
  font-size: var(--font-size-base);
  width: 86px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-bg);
}
.mini-input:focus { outline: none; border-color: var(--color-primary); }
.repos-input { border-color: var(--color-border-strong); background: var(--color-bg-secondary); }

.repos-commun {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: 6px var(--spacing-md);
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-md);
  border: 1px dashed var(--color-border-strong);
  margin-top: 4px;
  flex-wrap: wrap;
}
.repos-label { font-size: var(--font-size-xs); color: var(--color-text-secondary); white-space: nowrap; display: flex; align-items: center; gap: 4px; }

.serie-gen-form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  background: var(--color-bg);
  border-radius: var(--radius-md);
  border: 1px dashed var(--color-primary);
}
.serie-gen-exo { display: flex; flex-direction: column; gap: var(--spacing-xs); }
.serie-gen-exo-head { display: flex; align-items: center; gap: 6px; }
.serie-gen-exo-head strong { font-size: var(--font-size-sm); }
.serie-gen-repos-superset {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-md);
  border: 1px dashed var(--color-border-strong);
  flex-wrap: wrap;
}
.serie-gen-footer {
  display: flex;
  align-items: flex-end;
  gap: var(--spacing-md);
  padding-top: var(--spacing-sm);
  border-top: 1px solid var(--color-bg-tertiary);
}

.empty-series { font-size: var(--font-size-sm); color: var(--color-text-muted); font-style: italic; padding: 4px 0; }
.empty-seance { color: var(--color-text-muted); font-size: var(--font-size-sm); padding: var(--spacing-sm) 0; }

.add-exercice-form { display: flex; gap: var(--spacing-sm); align-items: center; padding-top: var(--spacing-sm); border-top: 1px dashed var(--color-border); flex-wrap: wrap; }
.add-seance-form {
  display: flex;
  gap: var(--spacing-sm);
  align-items: center;
  padding: var(--spacing-md) var(--spacing-lg);
  background: var(--color-bg-secondary);
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-lg);
  flex-shrink: 0;
  flex-wrap: wrap;
}
.add-seance-form select {
  min-height: var(--tap-min);
  padding: 0 var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  background: var(--color-bg);
}
.input-flex {
  flex: 1;
  min-width: 140px;
  min-height: var(--tap-min);
  padding: 0 var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--font-size-base);
  background: var(--color-bg);
}
.input-flex:focus { outline: none; border-color: var(--color-primary); }

.select-jour {
  min-height: 40px;
  padding: 0 var(--spacing-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  color: var(--color-text-body);
  background: var(--color-bg);
  cursor: pointer;
}
.input-inline {
  flex: 1;
  min-height: 40px;
  padding: 0 var(--spacing-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--font-size-base);
  font-weight: 500;
  background: var(--color-bg);
  min-width: 120px;
}
.input-inline:focus { outline: none; border-color: var(--color-primary); }

/* --- Mobile : liste → détail, un seul écran à la fois --- */
@media (max-width: 768px) {
  .panel-list {
    width: 100%;
    border-right: none;
  }
  .panel-detail {
    display: none;
    padding: var(--spacing-md) var(--spacing-lg);
  }
  .content-body.detail-ouvert .panel-list { display: none; }
  .content-body.detail-ouvert .panel-detail { display: flex; }
  .retour-mobile { display: inline-flex; margin-left: calc(-1 * var(--spacing-md)); }
  .info-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }

  .serie-group-row { flex-direction: column; gap: var(--spacing-sm); }
}
</style>
