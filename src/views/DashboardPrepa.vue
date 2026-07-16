<template>
  <AppLayout :title="vueLabel">
    <template #nav>
      <div class="nav-item" :class="{ active: onglet === 'programmes' }" @click="onglet = 'programmes'">
        <i class="ti ti-layout-grid"></i> Programmes
      </div>
      <div class="nav-item" :class="{ active: onglet === 'athletes' }" @click="onglet = 'athletes'">
        <i class="ti ti-users"></i> Mes athlètes
      </div>
    </template>

    <template #actions>
      <button class="btn btn-primary" @click="vue = 'form'" v-if="onglet === 'programmes' && vue === 'liste'">
        <i class="ti ti-plus"></i> Nouveau programme
      </button>
      <button class="btn" @click="logout"><i class="ti ti-logout"></i> Déconnexion</button>
    </template>

    <div class="dashboard-root">
      <AssignerAthleteModal
        v-if="modalAssigner"
        :programme="programmeActif"
        :monCercle="monCercle"
        @fermer="modalAssigner = false"
        @modifie="onModifie"
      />

      <!-- ONGLET PROGRAMMES -->
      <div v-if="onglet === 'programmes'" class="onglet-wrapper">
        <ProgrammeForm v-if="vue === 'form'" @termine="onTermine" />

        <div v-if="vue === 'liste'" class="content-body">

          <!-- Sidebar coulissante -->
          <div class="sidebar-wrapper" :class="{ open: sidebarOuverte }">

            <!-- Bande verticale toujours visible -->
            <div class="sidebar-strip" @click="sidebarOuverte = !sidebarOuverte">
              <i class="ti" :class="sidebarOuverte ? 'ti-chevron-left' : 'ti-chevron-right'"></i>
              <div class="sidebar-dots">
                <span
                  v-for="p in programmes"
                  :key="p.id"
                  class="sidebar-dot"
                  :class="{ active: programmeActif?.id === p.id }"
                ></span>
              </div>
            </div>

            <!-- Panel liste programmes -->
            <div class="panel-list">
              <div class="section-title">Mes programmes</div>
              <div v-if="programmes.length === 0" class="empty">Aucun programme.</div>
              <div
                v-for="p in programmes"
                :key="p.id"
                class="prog-card"
                :class="{ active: programmeActif?.id === p.id }"
                @click="selectProgramme(p); sidebarOuverte = false"
              >
                <div class="prog-card-top">
                  <div class="prog-name">{{ p.nom }}</div>
                </div>
                <div class="prog-meta">
                  <span class="badge" :class="p.statut === 'actif' ? 'badge-green' : 'badge-gray'">{{ p.statut }}</span>
                  <span>{{ p.athletes.length }} athlète{{ p.athletes.length > 1 ? 's' : '' }}</span>
                </div>
              </div>
              <button class="btn btn-dashed" @click="vue = 'form'">
                <i class="ti ti-plus"></i> Nouveau
              </button>
            </div>
          </div>

          <!-- Panel detail -->
          <div class="panel-detail" v-if="programmeActif">

            <div v-if="editMode" class="edit-banner">
              <i class="ti ti-edit"></i>
              <span>Mode édition activé</span>
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
                  <button class="btn btn-sm btn-danger" @click="supprimerProgramme(programmeActif)"><i class="ti ti-trash"></i> Supprimer</button>
                </template>
                <template v-else>
                  <button class="btn btn-sm btn-primary" @click="sauvegarderEditMode">✓ Sauvegarder</button>
                  <button class="btn btn-sm" @click="annulerEditMode">Annuler</button>
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
                <label>Nombre de semaines</label>
                <span>{{ semainesDisponibles.length }}</span>
              </div>
            </div>

            <div class="section-title">Athlètes assignés</div>
            <div class="athletes-row">
              <div class="athlete-chip" v-for="a in programmeActif.athletes" :key="a.id">
                <div class="mini-av">{{ initiales(a.nom) }}</div>
                {{ a.nom }}
              </div>
              <button v-if="editMode" class="btn btn-sm btn-dashed" @click="modalAssigner = true">
                <i class="ti ti-plus"></i> Ajouter
              </button>
            </div>

            <div class="tabs">
              <div class="tab" :class="{ active: tabDetail === 'seances' }" @click="tabDetail = 'seances'">
                Séances & exercices
              </div>
              <div class="tab" :class="{ active: tabDetail === 'logs' }" @click="onClickTabLogs">
                Logs athlètes
              </div>
            </div>

            <!-- TAB SÉANCES -->
            <div v-if="tabDetail === 'seances'" class="tab-content">
              <div class="semaines-tabs" v-if="semainesDisponibles.length > 0">
                <div
                  v-for="sem in semainesDisponibles"
                  :key="sem"
                  class="semaine-tab"
                  :class="{ active: semaineActive === sem }"
                  @click="semaineActive = sem"
                >
                  <span>Semaine {{ sem }}</span>
                  <button v-if="editMode && semainesDisponibles.length > 1" class="btn-icon-tiny" @click.stop="supprimerSemaine(sem)">
                    <i class="ti ti-x"></i>
                  </button>
                </div>
                <button v-if="editMode" class="semaine-tab semaine-add" @click="dupliquerSemaine">
                  <i class="ti ti-plus"></i> Nouvelle semaine
                </button>
              </div>

              <div v-if="loadingSeances" class="empty">Chargement...</div>

              <div
                v-for="seance in seancesFiltrees"
                :key="seance.id"
                class="seance-block"
                :class="`type-${seance.type_seance || 'musculation'}`"
              >
                <div class="seance-head" @click="toggleSeance(seance.id)">
                  <span class="type-badge" :class="`type-badge-${seance.type_seance || 'musculation'}`">
                    {{ labelType(seance.type_seance) }}
                  </span>
                  <span class="badge badge-purple" v-if="seance.jour && !editMode">{{ seance.jour }}</span>
                  <select
                    v-if="editMode"
                    v-model="seance.jour"
                    @change="mettreAJourSeance(seance)"
                    @click.stop
                    class="select-jour"
                  >
                    <option value="">Jour</option>
                    <option v-for="j in jours" :key="j" :value="j">{{ j }}</option>
                  </select>
                  <input
                    v-if="editMode"
                    v-model="seance.nom"
                    @change="mettreAJourSeance(seance)"
                    @click.stop
                    class="input-inline"
                    placeholder="Nom de la séance"
                  />
                  <span v-else style="flex:1">{{ seance.nom }}</span>
                  <span class="exo-count-badge">{{ seance.exercices?.length || 0 }} exo{{ seance.exercices?.length > 1 ? 's' : '' }}</span>
                  <i class="ti" :class="isSeanceOuverte(seance.id) ? 'ti-chevron-up' : 'ti-chevron-down'" style="color:var(--color-text-muted);font-size:14px"></i>
                  <button v-if="editMode" class="btn btn-sm btn-danger" @click.stop="supprimerSeance(seance)">
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
                    <div v-if="groupe.exercices.length > 1" class="superset-banner">
                      <i class="ti ti-link"></i>
                      <span>Superset/Biset · {{ groupe.exercices.length }} exercices</span>
                    </div>

                    <div class="exo-list">
                      <div v-for="(exo, eidx) in groupe.exercices" :key="exo.id" class="exo-block" :class="{ 'is-optionnel': exo.optionnel }">
                        <div class="exo-head">
                          <span class="exo-letter" v-if="groupe.exercices.length > 1">{{ letterFor(eidx) }}</span>
                          <span class="exo-num" v-else>{{ exo.ordre }}</span>
                          <input
                            v-if="editMode"
                            v-model="exo.nom"
                            @change="mettreAJourExercice(exo)"
                            @click.stop
                            class="input-inline"
                            placeholder="Nom de l'exercice"
                          />
                          <span v-else class="exo-name" style="flex:1">{{ exo.nom }}</span>
                          <span v-if="!editMode && exo.optionnel" class="optionnel-badge">optionnelle</span>
                          <label v-if="editMode" class="optionnel-check" @click.stop>
                            <input type="checkbox" v-model="exo.optionnel" @change="mettreAJourExercice(exo)" />
                            Optionnelle
                          </label>
                          <button v-if="editMode" class="btn-icon btn-danger" @click="supprimerExercice(seance, exo)">
                            <i class="ti ti-trash"></i>
                          </button>
                        </div>
                      </div>
                    </div>

                    <template v-if="editMode && groupe.exercices[0].series.length === 0">
                      <button
                        v-if="!getGroupeForm(groupe, groupe.exercices[0])._formSupersetOuvert"
                        class="btn-secondary btn-sm"
                        style="align-self:flex-start"
                        @click="getGroupeForm(groupe, groupe.exercices[0])._formSupersetOuvert = true"
                      >
                        <i class="ti ti-link"></i> Ajouter un superset à ce groupe
                      </button>
                      <div v-else class="add-exo-superset-form">
                        <input v-model="getGroupeForm(groupe, groupe.exercices[0])._nouvelExoNom" placeholder="Nom de l'exercice à enchaîner" class="input-flex" />
                        <button @click="ajouterAuSupersetEdit(seance, groupe)" :disabled="!getGroupeForm(groupe, groupe.exercices[0])._nouvelExoNom">+ Ajouter</button>
                        <button class="btn-secondary" @click="getGroupeForm(groupe, groupe.exercices[0])._formSupersetOuvert = false">Annuler</button>
                      </div>
                    </template>

                    <div v-if="groupe.exercices[0].series.length > 0">
                      <div class="groupe-series-head" @click="toggleGroupeSeries(groupe.key + '_' + seance.id)">
                        <span class="series-count">{{ groupe.exercices[0].series.length }} séries</span>
                        <i class="ti" :class="isGroupeSeriesOuvert(groupe.key + '_' + seance.id) ? 'ti-chevron-up' : 'ti-chevron-down'" style="font-size:13px;color:var(--color-text-muted)"></i>
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
                                <template v-if="seance.type_seance === 'musculation' || !seance.type_seance">
                                  <input v-model="exo.series[serieIdx-1].nb_reps" @change="mettreAJourSerie(exo.series[serieIdx-1])" placeholder="reps" class="mini-input" />
                                  <input v-model="exo.series[serieIdx-1].poids_cible" @change="mettreAJourSerie(exo.series[serieIdx-1])" placeholder="charge" class="mini-input" />
                                  <input v-model="exo.series[serieIdx-1].rm" @change="mettreAJourSerie(exo.series[serieIdx-1])" placeholder="%RM" class="mini-input" />
                                  <input v-model="exo.series[serieIdx-1].tempo" @change="mettreAJourSerie(exo.series[serieIdx-1])" placeholder="tempo" class="mini-input" />
                                  <input v-if="groupe.exercices.length === 1" v-model="exo.series[serieIdx-1].temps_repos" @change="mettreAJourSerie(exo.series[serieIdx-1])" placeholder="repos" class="mini-input repos-input" />
                                </template>
                                <template v-else-if="seance.type_seance === 'natation' || seance.type_seance === 'athletisme'">
                                  <input v-model="exo.series[serieIdx-1].metres" @change="mettreAJourSerie(exo.series[serieIdx-1])" placeholder="mètres" class="mini-input" />
                                  <input v-model="exo.series[serieIdx-1].intensite" @change="mettreAJourSerie(exo.series[serieIdx-1])" placeholder="intensité" class="mini-input" />
                                  <input v-if="groupe.exercices.length === 1" v-model="exo.series[serieIdx-1].temps_repos" @change="mettreAJourSerie(exo.series[serieIdx-1])" placeholder="repos" class="mini-input repos-input" />
                                </template>
                                <template v-else-if="seance.type_seance === 'pliometrie'">
                                  <input v-model="exo.series[serieIdx-1].bonds" @change="mettreAJourSerie(exo.series[serieIdx-1])" placeholder="bonds" class="mini-input" />
                                  <input v-model="exo.series[serieIdx-1].intensite" @change="mettreAJourSerie(exo.series[serieIdx-1])" placeholder="intensité" class="mini-input" />
                                  <input v-if="groupe.exercices.length === 1" v-model="exo.series[serieIdx-1].temps_repos" @change="mettreAJourSerie(exo.series[serieIdx-1])" placeholder="repos" class="mini-input repos-input" />
                                </template>
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
                        </div>
                      </div>
                    </div>

                    <template v-else-if="editMode">
                      <div class="serie-gen-form">
                        <div v-for="(exo, eidx) in groupe.exercices" :key="exo.id" class="serie-gen-exo">
                          <span class="exo-letter-mini" v-if="groupe.exercices.length > 1">{{ letterFor(eidx) }}</span>
                          <strong style="font-size:12px;min-width:80px">{{ exo.nom }}</strong>
                          <template v-if="seance.type_seance === 'musculation' || !seance.type_seance">
                            <input v-model="getGroupeForm(groupe, exo).params[exo.id].nb_reps" placeholder="reps" class="mini-input" />
                            <input v-model="getGroupeForm(groupe, exo).params[exo.id].poids_cible" placeholder="charge" class="mini-input" />
                            <input v-model="getGroupeForm(groupe, exo).params[exo.id].rm" placeholder="%RM" class="mini-input" />
                            <input v-model="getGroupeForm(groupe, exo).params[exo.id].tempo" placeholder="tempo" class="mini-input" />
                            <input v-if="groupe.exercices.length === 1" v-model="getGroupeForm(groupe, exo).temps_repos" placeholder="repos" class="mini-input repos-input" />
                          </template>
                          <template v-else-if="seance.type_seance === 'natation' || seance.type_seance === 'athletisme'">
                            <input v-model="getGroupeForm(groupe, exo).params[exo.id].metres" placeholder="mètres" class="mini-input" />
                            <input v-model="getGroupeForm(groupe, exo).params[exo.id].intensite" placeholder="intensité" class="mini-input" />
                            <input v-if="groupe.exercices.length === 1" v-model="getGroupeForm(groupe, exo).temps_repos" placeholder="repos" class="mini-input repos-input" />
                          </template>
                          <template v-else-if="seance.type_seance === 'pliometrie'">
                            <input v-model="getGroupeForm(groupe, exo).params[exo.id].bonds" placeholder="bonds" class="mini-input" />
                            <input v-model="getGroupeForm(groupe, exo).params[exo.id].intensite" placeholder="intensité" class="mini-input" />
                            <input v-if="groupe.exercices.length === 1" v-model="getGroupeForm(groupe, exo).temps_repos" placeholder="repos" class="mini-input repos-input" />
                          </template>
                        </div>
                        <div v-if="groupe.exercices.length > 1" class="serie-gen-repos-superset">
                          <span class="repos-label"><i class="ti ti-clock"></i> Repos après le superset :</span>
                          <input v-model="getGroupeForm(groupe, groupe.exercices[0]).temps_repos" placeholder="ex: 1min30" class="mini-input" style="width:110px" />
                        </div>
                        <div class="serie-gen-footer">
                          <div class="field-inline">
                            <label>Nb séries</label>
                            <input v-model.number="getGroupeForm(groupe, groupe.exercices[0]).nb_series" type="number" min="1" placeholder="4" class="mini-input" style="width:70px" />
                          </div>
                          <button class="btn btn-sm btn-primary" @click="genererSeriesGroupeEdit(groupe, seance)">
                            Générer {{ getGroupeForm(groupe, groupe.exercices[0]).nb_series || '?' }} séries
                          </button>
                        </div>
                      </div>
                    </template>

                    <div v-else class="empty-series">Aucune série définie</div>
                  </div>

                  <div v-if="editMode" class="add-exercice-form">
                    <input v-model="seance._nouvelExercice.nom" placeholder="Nom de l'exercice" class="input-flex" />
                    <button class="btn btn-sm" @click="ajouterExercice(seance)" :disabled="!seance._nouvelExercice.nom">+ Exercice</button>
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
                <button class="btn btn-sm" @click="ajouterSeance" :disabled="!nouvelleSeance.nom">+ Séance</button>
              </div>
            </div>

            <!-- TAB LOGS -->
            <div v-if="tabDetail === 'logs'" class="tab-content">
              <div v-if="programmeActif.athletes.length === 0" class="empty">Aucun athlète assigné à ce programme.</div>

              <div v-if="!athleteLogs" class="logs-athletes-list">
                <div v-for="a in programmeActif.athletes" :key="a.id" class="athlete-card" @click="voirLogsAthlete(a)">
                  <div class="mini-av-lg">{{ initiales(a.nom) }}</div>
                  <div class="athlete-info">
                    <div class="athlete-nom">{{ a.nom }}</div>
                    <div class="athlete-email">{{ a.email }}</div>
                  </div>
                  <i class="ti ti-chevron-right"></i>
                </div>
              </div>

              <div v-else class="logs-detail">
                <div class="logs-header">
                  <button class="btn btn-sm" @click="athleteLogs = null" style="align-self:flex-start">
                    <i class="ti ti-arrow-left"></i> Retour
                  </button>
                  <div class="logs-title">
                    <div class="mini-av-lg">{{ initiales(athleteLogs.nom) }}</div>
                    <div>
                      <div class="athlete-nom">{{ athleteLogs.nom }}</div>
                      <div class="athlete-email">{{ athleteLogs.email }}</div>
                    </div>
                  </div>
                </div>

                <div v-if="loadingLogs" class="empty">Chargement...</div>
                <div v-else-if="logsGroupes.length === 0" class="empty">Aucun log enregistré pour cet athlète.</div>

                <div v-else>
                  <div v-for="session in logsGroupes" :key="session.key" class="session-block">
                    <div class="session-head">
                      <span class="badge badge-purple" v-if="session.jour">{{ session.jour }}</span>
                      <span class="session-nom">{{ session.seanceNom }}</span>
                      <span class="session-date">{{ formatDate(session.date) }}</span>
                    </div>
                    <div class="session-body">
                      <div v-for="exo in session.exercices" :key="exo.id" class="exo-bloc">
                        <div class="exo-header">
                          <div class="exo-num">{{ exo.ordre }}</div>
                          <span class="exo-name">{{ exo.nom }}</span>
                        </div>
                        <div class="comparatif-grid">
                          <div class="comparatif-header">
                            <span>#</span><span>Prescrit</span><span>Réalisé</span><span></span>
                          </div>
                          <div v-for="(log, i) in exo.logs" :key="log.id" class="comparatif-row" :class="getStatutClasse(log)">
                            <span class="serie-num">{{ i + 1 }}</span>
                            <div class="prescrit-cell">
                              <span v-if="log.serie.nb_reps">{{ log.serie.nb_reps }} reps</span>
                              <span v-if="log.serie.poids_cible"> · {{ log.serie.poids_cible }}</span>
                              <span v-if="log.serie.rm"> · {{ log.serie.rm }}</span>
                            </div>
                            <div class="realise-cell">
                              <template v-if="log.fait">
                                <span v-if="log.reps_realisees">{{ log.reps_realisees }} reps</span>
                                <span v-if="log.poids_realise"> · {{ log.poids_realise }}</span>
                                <span v-if="!log.reps_realisees && !log.poids_realise">—</span>
                              </template>
                              <span v-else class="non-fait">non réalisé</span>
                            </div>
                            <span class="statut-icon"><i :class="getStatutIcon(log)"></i></span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
          <!-- fin panel-detail -->

          <div class="panel-detail empty" v-else>Sélectionnez un programme</div>

        </div>
        <!-- fin content-body -->
      </div>
      <!-- fin onglet-wrapper programmes -->

      <!-- ONGLET ATHLETES -->
      <div v-if="onglet === 'athletes'" class="onglet-wrapper athletes-page">
        <div class="section-title" style="margin-bottom:12px">Mon cercle d'athlètes</div>
        <div v-if="monCercle.length === 0" class="empty">Aucun athlète dans votre cercle.</div>
        <div v-for="a in monCercle" :key="a.id" class="athlete-row">
          <div class="mini-av-lg">{{ initiales(a.nom) }}</div>
          <div class="athlete-info">
            <div class="athlete-nom">{{ a.nom }}</div>
            <div class="athlete-email">{{ a.email }}</div>
          </div>
          <button class="btn btn-sm btn-danger" @click="retirerDuCercle(a)">Retirer</button>
        </div>
        <div class="add-athlete-row">
          <input v-model="searchEmail" placeholder="Email de l'athlète" type="email" style="flex:1" />
          <button class="btn" @click="rechercherAthlète" :disabled="!searchEmail">Rechercher</button>
        </div>
        <div v-if="athleteTrouve" class="athlete-row found">
          <div class="mini-av-lg">{{ initiales(athleteTrouve.nom) }}</div>
          <div class="athlete-info">
            <div class="athlete-nom">{{ athleteTrouve.nom }}</div>
            <div class="athlete-email">{{ athleteTrouve.email }}</div>
          </div>
          <button class="btn btn-sm btn-primary" @click="ajouterAuCercle">+ Ajouter</button>
        </div>
        <div v-if="searchError" class="error">{{ searchError }}</div>
      </div>

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

export default {
  components: { AppLayout, ProgrammeForm, AssignerAthleteModal },
  setup() {
    const programmes = ref([])
    const programmeActif = ref(null)
    const seances = ref([])
    const monCercle = ref([])
    const loadingSeances = ref(false)
    const modalAssigner = ref(false)
    const vue = ref('liste')
    const onglet = ref('programmes')
    const tabDetail = ref('seances')
    const editMode = ref(false)
    const editNom = ref('')
    const editDesc = ref('')
    const searchEmail = ref('')
    const athleteTrouve = ref(null)
    const searchError = ref('')
    const athleteLogs = ref(null)
    const logs = ref([])
    const loadingLogs = ref(false)
    const nouvelleSeance = ref({ nom: '', jour: '', type_seance: 'musculation' })
    const semaineActive = ref(1)
    const groupeForms = ref({})
    const seancesOuvertes = ref({})
    const groupesSeriesOuverts = ref({})
    const sidebarOuverte = ref(false)
    const router = useRouter()
    const authStore = useAuthStore()
    const api = useApi()

    const jours = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']
    const vueLabel = computed(() => onglet.value === 'athletes' ? 'Mes athlètes' : 'Programmes')

    const labelType = (t) => {
      const map = { musculation: 'Musculation', natation: 'Natation', athletisme: 'Athlétisme', pliometrie: 'Pliométrie' }
      return map[t] || 'Musculation'
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
        groupeForms.value[key] = { nb_series: 4, temps_repos: '', params: {}, _formSupersetOuvert: false, _nouvelExoNom: '' }
      }
      const form = groupeForms.value[key]
      groupe.exercices.forEach(e => {
        if (!form.params[e.id]) form.params[e.id] = { nb_reps: '', poids_cible: '', rm: '', tempo: '', metres: '', bonds: '', intensite: '' }
      })
      if (exo && !form.params[exo.id]) form.params[exo.id] = { nb_reps: '', poids_cible: '', rm: '', tempo: '', metres: '', bonds: '', intensite: '' }
      return form
    }

    const genererSeriesGroupeEdit = async (groupe, seance) => {
      const form = groupeForms.value[groupe.key]
      if (!form) return
      const type = seance.type_seance || 'musculation'
      const buildPayload = (params) => {
        if (type === 'musculation') return { nb_reps: params.nb_reps || null, poids_cible: params.poids_cible || null, rm: params.rm || null, tempo: params.tempo || null, temps_repos: form.temps_repos || null }
        if (type === 'natation' || type === 'athletisme') return { nb_series: '1', metres: params.metres || null, intensite: params.intensite || null, temps_repos: form.temps_repos || null }
        if (type === 'pliometrie') return { nb_series: '1', bonds: params.bonds || null, intensite: params.intensite || null, temps_repos: form.temps_repos || null }
        return {}
      }
      for (const exo of groupe.exercices) {
        const params = form.params[exo.id] || {}
        for (let i = 0; i < form.nb_series; i++) await api.post(`/exercices/${exo.id}/series/`, buildPayload(params))
      }
      await fetchSeances(programmeActif.value.id)
    }

    const syncReposSuperset = async (groupe, serieIdx) => {
      const repos = groupe.exercices[0].series[serieIdx]?.temps_repos
      for (const exo of groupe.exercices) {
        const serie = exo.series[serieIdx]
        if (serie) { serie.temps_repos = repos; await mettreAJourSerie(serie) }
      }
    }

    const ajouterAuSupersetEdit = async (seance, groupe) => {
      const form = groupeForms.value[groupe.key]
      if (!form?._nouvelExoNom) return
      let numGroupe = groupe.exercices[0].groupe
      if (!numGroupe) {
        const maxGroupe = Math.max(0, ...seance.exercices.map(e => e.groupe || 0))
        numGroupe = maxGroupe + 1
        const premierExo = groupe.exercices[0]
        await api.patch(`/exercices/${premierExo.id}`, { nom: premierExo.nom, ordre: premierExo.ordre, groupe: numGroupe, optionnel: premierExo.optionnel || false })
        premierExo.groupe = numGroupe
      }
      const data = await api.post(`/seances/${seance.id}/exercices/`, { nom: form._nouvelExoNom, ordre: seance.exercices.length + 1, groupe: numGroupe })
      seance.exercices.push({ ...data, series: [] })
      form._nouvelExoNom = ''
      form._formSupersetOuvert = false
      await fetchSeances(programmeActif.value.id)
    }

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

    const logsGroupes = computed(() => {
      const sessions = {}
      logs.value.forEach(log => {
        const dateStr = log.date.split('T')[0]
        const key = `${dateStr}__${log.seance.id}`
        if (!sessions[key]) sessions[key] = { key, date: dateStr, seanceNom: log.seance.nom, jour: log.seance.jour, exercices: {} }
        if (!sessions[key].exercices[log.exercice.id]) sessions[key].exercices[log.exercice.id] = { id: log.exercice.id, nom: log.exercice.nom, ordre: log.exercice.ordre, logs: [] }
        sessions[key].exercices[log.exercice.id].logs.push(log)
      })
      return Object.values(sessions).sort((a, b) => b.date.localeCompare(a.date)).map(s => ({ ...s, exercices: Object.values(s.exercices).sort((a, b) => a.ordre - b.ordre) }))
    })

    const fetchProgrammes = async () => {
      programmes.value = await api.get('/programmes/')
      if (programmes.value.length > 0 && !programmeActif.value) programmeActif.value = programmes.value[0]
    }

    const fetchSeances = async (programmeId) => {
      loadingSeances.value = true
      const data = await api.get(`/programmes/${programmeId}/seances/`)
      seances.value = data.map(s => ({ ...s, _nouvelExercice: { nom: '' } }))
      seances.value.forEach(s => {
        if (seancesOuvertes.value[s.id] === undefined) {
          seancesOuvertes.value[s.id] = false
        }
      })
      groupesSeriesOuverts.value = {}
      const semaines = [...new Set(seances.value.map(s => s.semaine || 1))]
      if (!semaines.includes(semaineActive.value)) semaineActive.value = semaines[0] || 1
      loadingSeances.value = false
    }

    const fetchMonCercle = async () => {
      const me = await api.get('/users/me')
      monCercle.value = me.athletes || []
    }

    const selectProgramme = (p) => {
      if (editMode.value) {
        if (!confirm('Annuler les modifications en cours ?')) return
        editMode.value = false
      }
      programmeActif.value = p
      semaineActive.value = 1
      groupeForms.value = {}
      seancesOuvertes.value = {}
      groupesSeriesOuverts.value = {}
    }

    watch(programmeActif, (p) => {
      if (p) fetchSeances(p.id)
      athleteLogs.value = null
      tabDetail.value = 'seances'
    })

    const startEditMode = () => {
      editNom.value = programmeActif.value.nom
      editDesc.value = programmeActif.value.description || ''
      editMode.value = true
      groupeForms.value = {}
    }

    const sauvegarderEditMode = async () => {
      const data = await api.patch(`/programmes/${programmeActif.value.id}`, { nom: editNom.value, description: editDesc.value || null })
      programmeActif.value = data
      programmes.value = programmes.value.map(p => p.id === data.id ? data : p)
      editMode.value = false
    }

    const annulerEditMode = () => {
      editMode.value = false
      groupeForms.value = {}
      fetchSeances(programmeActif.value.id)
    }

    const ajouterSeance = async () => {
      const seancesSemaine = seances.value.filter(s => (s.semaine || 1) === semaineActive.value)
      const data = await api.post(`/programmes/${programmeActif.value.id}/seances/`, {
        nom: nouvelleSeance.value.nom, ordre: seancesSemaine.length + 1,
        jour: nouvelleSeance.value.jour || null, semaine: semaineActive.value,
        type_seance: nouvelleSeance.value.type_seance
      })
      seances.value.push({ ...data, exercices: [], _nouvelExercice: { nom: '' } })
      seancesOuvertes.value[data.id] = true
      nouvelleSeance.value = { nom: '', jour: '', type_seance: 'musculation' }
    }

    const dupliquerSemaine = async () => {
      const nouvellesSeances = await api.post(`/programmes/${programmeActif.value.id}/seances/dupliquer-semaine/${semaineActive.value}`)
      await fetchSeances(programmeActif.value.id)
      if (nouvellesSeances.length > 0) semaineActive.value = nouvellesSeances[0].semaine
    }

    const supprimerSemaine = async (numero) => {
      if (!confirm(`Supprimer toute la semaine ${numero} ?`)) return
      await api.del(`/programmes/${programmeActif.value.id}/seances/semaine/${numero}`)
      await fetchSeances(programmeActif.value.id)
    }

    const ajouterExercice = async (seance) => {
      const data = await api.post(`/seances/${seance.id}/exercices/`, { nom: seance._nouvelExercice.nom, ordre: seance.exercices.length + 1, groupe: null })
      seance.exercices.push({ ...data, series: [] })
      seance._nouvelExercice = { nom: '' }
    }

    const mettreAJourSerie = async (serie) => {
      await api.patch(`/series/${serie.id}`, {
        nb_reps: serie.nb_reps || null, poids_cible: serie.poids_cible || null,
        rm: serie.rm || null, tempo: serie.tempo || null, metres: serie.metres || null,
        bonds: serie.bonds || null, nb_series: serie.nb_series || null,
        intensite: serie.intensite || null, temps_repos: serie.temps_repos || null
      })
    }

    const supprimerProgramme = async (p) => {
      if (!confirm(`Supprimer "${p.nom}" ?`)) return
      await api.del(`/programmes/${p.id}`)
      programmes.value = programmes.value.filter(x => x.id !== p.id)
      if (programmeActif.value?.id === p.id) { programmeActif.value = programmes.value[0] || null; editMode.value = false }
    }

    const supprimerSeance = async (seance) => {
      if (!confirm(`Supprimer la séance "${seance.nom}" ?`)) return
      await api.del(`/seances/${seance.id}`)
      seances.value = seances.value.filter(s => s.id !== seance.id)
    }

    const supprimerExercice = async (seance, exo) => {
      if (!confirm(`Supprimer l'exercice "${exo.nom}" ?`)) return
      await api.del(`/exercices/${exo.id}`)
      seance.exercices = seance.exercices.filter(e => e.id !== exo.id)
    }

    const onClickTabLogs = () => { tabDetail.value = 'logs'; athleteLogs.value = null }

    const voirLogsAthlete = async (athlete) => {
      athleteLogs.value = athlete
      loadingLogs.value = true
      logs.value = await api.get(`/logs/programme/${programmeActif.value.id}/athlete/${athlete.id}`)
      loadingLogs.value = false
    }

    const formatDate = (d) => new Date(d).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

    const getStatutClasse = (log) => {
      if (!log.fait) return 'statut-skip'
      if (!log.reps_realisees && !log.poids_realise) return 'statut-warn'
      const prescR = parseFloat(log.serie.nb_reps)
      const realR = parseFloat(log.reps_realisees)
      if (!isNaN(prescR) && !isNaN(realR) && realR < prescR) return 'statut-warn'
      return 'statut-done'
    }

    const getStatutIcon = (log) => {
      if (!log.fait) return 'ti ti-x'
      return getStatutClasse(log) === 'statut-warn' ? 'ti ti-alert-triangle' : 'ti ti-check'
    }

    const onTermine = () => { vue.value = 'liste'; fetchProgrammes() }

    const onModifie = async () => {
      await fetchProgrammes()
      await fetchMonCercle()
      if (programmeActif.value) programmeActif.value = programmes.value.find(p => p.id === programmeActif.value.id)
    }

    const retirerDuCercle = async (athlete) => {
      await api.del(`/users/mes-athletes/${athlete.id}`)
      monCercle.value = monCercle.value.filter(a => a.id !== athlete.id)
    }

    const rechercherAthlète = async () => {
      searchError.value = ''
      athleteTrouve.value = null
      try {
        const found = await api.get(`/users/recherche?email=${encodeURIComponent(searchEmail.value)}`)
        if (found.detail) { searchError.value = found.detail; return }
        if (monCercle.value.find(a => a.id === found.id)) { searchError.value = 'Déjà dans votre cercle'; return }
        athleteTrouve.value = found
      } catch { searchError.value = 'Athlète introuvable' }
    }

    const ajouterAuCercle = async () => {
      await api.post(`/users/mes-athletes/${athleteTrouve.value.id}`)
      monCercle.value.push(athleteTrouve.value)
      athleteTrouve.value = null
      searchEmail.value = ''
    }

    const logout = () => { authStore.logout(); router.push('/') }
    const initiales = (nom) => nom.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

    onMounted(async () => {
      await fetchProgrammes()
      await fetchMonCercle()
    })

    const mettreAJourExercice = async (exo) => {
      await api.patch(`/exercices/${exo.id}`, {
        nom: exo.nom,
        ordre: exo.ordre,
        groupe: exo.groupe || null,
        optionnel: exo.optionnel || false
      })
    }

    const mettreAJourSeance = async (seance) => {
      await api.patch(`/seances/${seance.id}`, {
        nom: seance.nom,
        ordre: seance.ordre,
        jour: seance.jour || null,
        semaine: seance.semaine,
        type_seance: seance.type_seance
      })
    }
    return {
      programmes, programmeActif, seances, monCercle,
      loadingSeances, modalAssigner, vue, onglet, vueLabel,
      tabDetail, athleteLogs, logs, loadingLogs, logsGroupes,
      editMode, editNom, editDesc,
      nouvelleSeance, jours, labelType, letterFor, grouperExercices,
      semaineActive, semainesDisponibles, seancesFiltrees,
      groupeForms, getGroupeForm, genererSeriesGroupeEdit,
      syncReposSuperset, ajouterAuSupersetEdit,
      seancesOuvertes, toggleSeance, isSeanceOuverte,
      groupesSeriesOuverts, toggleGroupeSeries, isGroupeSeriesOuvert,
      searchEmail, athleteTrouve, searchError,
      selectProgramme, startEditMode, sauvegarderEditMode, annulerEditMode,
      ajouterSeance, ajouterExercice, mettreAJourSerie,
      dupliquerSemaine, supprimerSemaine,
      supprimerProgramme, supprimerSeance, supprimerExercice,
      onTermine, onModifie, logout, initiales,
      onClickTabLogs, voirLogsAthlete, formatDate,
      getStatutClasse, getStatutIcon,
      retirerDuCercle, rechercherAthlète, ajouterAuCercle,
      sidebarOuverte,mettreAJourSeance, mettreAJourExercice
    }
  }
}
</script>

<style scoped>
* { box-sizing: border-box; }
.dashboard-root { display: flex; flex: 1; flex-direction: column; overflow: hidden; min-height: 0; }
.onglet-wrapper { display: flex; flex: 1; overflow: hidden; min-height: 0; }
.content-body { display: flex; flex: 1; overflow: hidden; min-height: 0; min-width: 0; }
.btn { display: inline-flex; align-items: center; gap: 6px; padding: 7px 14px; border-radius: var(--radius-md); border: 1px solid var(--color-border); font-size: var(--font-size-md); cursor: pointer; background: transparent; color: var(--color-text-body); }
.btn:hover { background: var(--color-bg-secondary); }
.btn-primary { background: var(--color-primary); color: var(--color-primary-light); border-color: var(--color-primary-dark); }
.btn-primary:hover { background: var(--color-primary-dark); }
.btn-sm { padding: 5px 10px; font-size: var(--font-size-sm); }
.btn-dashed { border-style: dashed; font-size: var(--font-size-sm); }
.btn-icon { width: 26px; height: 26px; padding: 0; display: inline-flex; align-items: center; justify-content: center; border-radius: var(--radius-md); border: none; cursor: pointer; flex-shrink: 0; background: transparent; }
.btn-icon-tiny { width: 18px; height: 18px; padding: 0; display: inline-flex; align-items: center; justify-content: center; border-radius: var(--radius-sm); border: none; cursor: pointer; background: transparent; color: inherit; opacity: 0.6; }
.btn-icon-tiny:hover { opacity: 1; }
.btn-danger { background: var(--color-danger-bg); color: var(--color-danger-text); border: 1px solid #fca5a5; }
.btn-danger:hover { background: #fecaca; }
.btn-secondary { background: var(--color-bg-tertiary); color: var(--color-text-body); border: 1px solid var(--color-border); }
.btn-secondary:hover { background: var(--color-border); }
.nav-item { display: flex; align-items: center; gap: 6px; padding: 6px 12px; font-size: var(--font-size-md); cursor: pointer; color: var(--color-text-secondary); border-radius: var(--radius-md); font-weight: 500; border: none; background: transparent; }
.nav-item:hover { background: var(--color-bg-app); color: var(--color-text-body); }
.nav-item.active { background: var(--color-primary-light); color: var(--color-primary-dark); }
.panel-list { width: 240px; border-right: 1px solid var(--color-border); overflow-y: auto; padding: var(--spacing-md); flex-shrink: 0; display: flex; flex-direction: column; gap: var(--spacing-sm); }
.panel-detail { flex: 1; overflow-y: auto; padding: var(--spacing-lg) var(--spacing-xl); display: flex; flex-direction: column; gap: var(--spacing-md); min-height: 0; }
.panel-detail.empty { align-items: center; justify-content: center; color: var(--color-text-muted); }
.tab-content { display: flex; flex-direction: column; gap: 10px; }
.section-title { font-size: var(--font-size-sm); font-weight: 500; color: var(--color-text-secondary); text-transform: uppercase; letter-spacing: 0.5px; }
.edit-banner { display: flex; align-items: center; gap: var(--spacing-sm); padding: var(--spacing-sm) var(--spacing-md); background: var(--color-primary-light); color: var(--color-primary-text); border-radius: var(--radius-md); font-size: var(--font-size-sm); font-weight: 500; flex-shrink: 0; }
.prog-card { border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: 10px var(--spacing-md); cursor: pointer; }
.prog-card:hover { border-color: var(--color-border-strong); background: var(--color-bg-secondary); }
.prog-card.active { border-color: var(--color-primary); background: var(--color-primary-light); }
.prog-card.active .prog-name { color: var(--color-primary-text); }
.prog-card-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px; }
.prog-name { font-size: var(--font-size-base); font-weight: 500; }
.prog-meta { display: flex; gap: 6px; align-items: center; font-size: var(--font-size-xs); color: var(--color-text-secondary); }
.badge { display: inline-flex; align-items: center; font-size: var(--font-size-xs); padding: 2px 8px; border-radius: var(--radius-full); }
.badge-green { background: var(--color-success-bg); color: var(--color-success-text); }
.badge-purple { background: var(--color-primary-light); color: var(--color-primary-text); }
.badge-gray { background: var(--color-bg-tertiary); color: var(--color-text-secondary); border: 1px solid var(--color-border); }
.detail-top { display: flex; justify-content: space-between; align-items: flex-start; gap: var(--spacing-md); flex-shrink: 0; }
.detail-info h3 { font-size: var(--font-size-17); font-weight: 600; margin-bottom: 3px; }
.detail-info p { font-size: var(--font-size-md); color: var(--color-text-secondary); }
.detail-edit { display: flex; flex-direction: column; gap: 6px; flex: 1; }
.detail-edit input { padding: 6px 10px; border: 1px solid var(--color-border); border-radius: var(--radius-md); font-size: var(--font-size-md); }
.detail-actions { display: flex; gap: 6px; flex-shrink: 0; }
.info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-sm); flex-shrink: 0; }
.info-cell { background: var(--color-bg-secondary); border-radius: var(--radius-md); padding: var(--spacing-sm) var(--spacing-md); }
.info-cell label { font-size: var(--font-size-xs); color: var(--color-text-secondary); display: block; margin-bottom: 2px; }
.info-cell span { font-size: var(--font-size-md); font-weight: 500; }
.athletes-row { display: flex; gap: 6px; flex-wrap: wrap; flex-shrink: 0; }
.athlete-chip { display: flex; align-items: center; gap: 5px; background: var(--color-bg-secondary); border: 1px solid var(--color-border); border-radius: var(--radius-full); padding: 3px 10px; font-size: var(--font-size-sm); }
.mini-av { width: var(--avatar-xs); height: var(--avatar-xs); border-radius: 50%; background: var(--color-avatar-athlete-bg); display: flex; align-items: center; justify-content: center; font-size: 9px; font-weight: 500; color: var(--color-avatar-athlete-text); }
.tabs { display: flex; border-bottom: 1px solid var(--color-border); flex-shrink: 0; }
.tab { padding: 10px var(--spacing-lg); font-size: var(--font-size-base); cursor: pointer; color: var(--color-text-secondary); border-bottom: 2px solid transparent; margin-bottom: -1px; }
.tab.active { color: var(--color-primary-dark); border-bottom-color: var(--color-primary); font-weight: 500; }
.semaines-tabs { display: flex; gap: 4px; flex-wrap: wrap; padding: var(--spacing-sm) 0; flex-shrink: 0; align-items: center; }
.semaine-tab { display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border: 1px solid var(--color-border); border-radius: var(--radius-md); font-size: var(--font-size-sm); cursor: pointer; background: var(--color-bg); color: var(--color-text-secondary); }
.semaine-tab:hover { border-color: var(--color-primary); }
.semaine-tab.active { background: var(--color-primary-light); border-color: var(--color-primary); color: var(--color-primary-text); font-weight: 500; }
.semaine-tab.semaine-add { background: transparent; border-style: dashed; color: var(--color-primary-dark); }
.semaine-tab.semaine-add:hover { background: var(--color-bg-secondary); }
.seance-block { border: 1px solid var(--color-border); border-radius: var(--radius-lg); overflow: hidden; flex-shrink: 0; border-left-width: 4px; }
.seance-block.type-musculation { border-left-color: var(--color-type-musculation-border); }
.seance-block.type-natation { border-left-color: var(--color-type-natation-border); }
.seance-block.type-athletisme { border-left-color: var(--color-type-athletisme-border); }
.seance-block.type-pliometrie { border-left-color: var(--color-type-pliometrie-border); }
.type-badge { display: inline-flex; align-items: center; font-size: var(--font-size-xs); font-weight: 500; padding: 2px 8px; border-radius: var(--radius-full); }
.type-badge-musculation { background: var(--color-type-musculation-bg); color: var(--color-type-musculation-text); }
.type-badge-natation { background: var(--color-type-natation-bg); color: var(--color-type-natation-text); }
.type-badge-athletisme { background: var(--color-type-athletisme-bg); color: var(--color-type-athletisme-text); }
.type-badge-pliometrie { background: var(--color-type-pliometrie-bg); color: var(--color-type-pliometrie-text); }
.seance-head { padding: var(--spacing-md) var(--spacing-lg); background: var(--color-bg-secondary); display: flex; align-items: center; gap: var(--spacing-sm); font-size: var(--font-size-base); font-weight: 500; cursor: pointer; user-select: none; }
.seance-head:hover { background: var(--color-bg-tertiary); }
.seance-body { padding: 10px 14px; display: flex; flex-direction: column; gap: 10px; border-top: 1px solid var(--color-border); }
.exo-count-badge { font-size: var(--font-size-xs); color: var(--color-text-muted); background: var(--color-bg-tertiary); padding: 2px 8px; border-radius: 10px; }
.exo-group { display: flex; flex-direction: column; gap: var(--spacing-sm); padding: var(--spacing-md); background: var(--color-bg-secondary); border-radius: var(--radius-lg); border: 1px solid var(--color-border); }
.exo-group.is-superset { background: var(--color-superset-bg); border: 1px solid var(--color-superset-border); border-left: 3px solid var(--color-primary); }
.superset-banner { display: flex; align-items: center; gap: 6px; font-size: var(--font-size-xs); color: var(--color-superset-text); font-weight: 500; }
.exo-list { display: flex; flex-direction: column; gap: 6px; }
.exo-block { display: flex; flex-direction: column; gap: 6px; background: var(--color-bg); border-radius: var(--radius-md); padding: 8px 10px; border: 1px solid var(--color-border); }
.exo-head { display: flex; align-items: center; gap: var(--spacing-sm); }
.exo-num, .exo-letter { width: 22px; height: 22px; border-radius: var(--radius-sm); background: var(--color-primary-light); color: var(--color-superset-text); font-size: var(--font-size-xs); font-weight: 600; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.exo-letter { background: var(--color-primary); color: var(--color-bg); }
.exo-name { font-size: var(--font-size-base); font-weight: 500; }
.exo-block.is-optionnel { background: var(--color-bg-tertiary); opacity: 0.75; }
.exo-block.is-optionnel .exo-name { color: var(--color-text-muted); }
.optionnel-check { display: inline-flex; align-items: center; gap: 4px; font-size: var(--font-size-xs); color: var(--color-text-secondary); cursor: pointer; white-space: nowrap; flex-shrink: 0; }
.optionnel-check input { width: auto; }
.optionnel-badge { font-size: var(--font-size-2xs); font-weight: 500; color: var(--color-text-muted); background: var(--color-bg-tertiary); padding: 2px 6px; border-radius: var(--radius-full); text-transform: uppercase; letter-spacing: 0.3px; flex-shrink: 0; }
.add-exo-superset-form { display: flex; gap: var(--spacing-sm); align-items: center; padding: var(--spacing-sm); background: var(--color-bg); border-radius: var(--radius-md); border: 1px dashed var(--color-superset-border); }
.groupe-series-head { display: flex; align-items: center; justify-content: space-between; padding: 7px 10px; background: var(--color-bg); border-radius: var(--radius-md); border: 1px solid var(--color-border); cursor: pointer; }
.groupe-series-head:hover { border-color: var(--color-primary); background: #FAFAFE; }
.series-count { font-size: var(--font-size-md); font-weight: 600; color: var(--color-superset-text); }
.series-display { display: flex; flex-direction: column; gap: 6px; margin-top: 6px; }
.serie-group-row { display: flex; gap: 10px; align-items: flex-start; padding: var(--spacing-sm); background: var(--color-bg); border-radius: var(--radius-md); border: 1px solid var(--color-border); }
.serie-label { font-size: var(--font-size-sm); font-weight: 600; color: var(--color-superset-text); padding: 4px 8px; background: var(--color-primary-light); border-radius: var(--radius-sm); white-space: nowrap; flex-shrink: 0; align-self: flex-start; }
.serie-exos { display: flex; flex-direction: column; gap: 6px; flex: 1; }
.serie-exo { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.exo-letter-mini { font-size: var(--font-size-2xs); font-weight: 700; color: var(--color-bg); background: var(--color-primary); padding: 2px 6px; border-radius: var(--radius-sm); flex-shrink: 0; }
.serie-exo strong { font-size: var(--font-size-md); font-weight: 500; min-width: 80px; }
.serie-values { font-size: var(--font-size-md); color: var(--color-text-secondary); }
.repos-tag { font-size: var(--font-size-xs); color: var(--color-text-muted); font-style: italic; }
.repos-commun { display: flex; align-items: center; gap: var(--spacing-sm); padding: 6px 10px; background: var(--color-bg-tertiary); border-radius: var(--radius-md); border: 1px dashed var(--color-border-strong); margin-top: 4px; }
.repos-label { font-size: var(--font-size-xs); color: var(--color-text-secondary); white-space: nowrap; display: flex; align-items: center; gap: 4px; }
.serie-gen-form { display: flex; flex-direction: column; gap: var(--spacing-sm); padding: 10px; background: var(--color-bg); border-radius: var(--radius-md); border: 1px dashed var(--color-primary); }
.serie-gen-exo { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.serie-gen-repos-superset { display: flex; align-items: center; gap: var(--spacing-sm); padding: var(--spacing-sm) 10px; background: var(--color-bg-tertiary); border-radius: var(--radius-md); border: 1px dashed var(--color-border-strong); }
.serie-gen-footer { display: flex; align-items: center; gap: var(--spacing-sm); padding-top: var(--spacing-sm); border-top: 1px solid var(--color-bg-tertiary); }
.field-inline { display: flex; flex-direction: column; gap: 3px; }
.field-inline label { font-size: var(--font-size-2xs); color: var(--color-text-muted); font-weight: 500; }
.mini-input { padding: 4px 8px; font-size: var(--font-size-sm); width: 80px; border: 1px solid var(--color-border); border-radius: var(--radius-sm); }
.mini-input:focus { outline: none; border-color: var(--color-primary); }
.repos-input { border-color: #C8D6E5; background: #f8fafc; }
.empty-series { font-size: var(--font-size-sm); color: var(--color-text-muted); font-style: italic; padding: 4px 0; }
.add-exercice-form { display: flex; gap: var(--spacing-sm); align-items: center; padding-top: var(--spacing-sm); border-top: 1px dashed var(--color-border); }
.add-seance-form { display: flex; gap: var(--spacing-sm); align-items: center; padding: var(--spacing-md) var(--spacing-lg); background: var(--color-bg-secondary); border: 1px dashed var(--color-border); border-radius: var(--radius-lg); flex-shrink: 0; flex-wrap: wrap; }
.add-seance-form select { padding: 6px 10px; border: 1px solid var(--color-border); border-radius: var(--radius-md); font-size: var(--font-size-md); }
.input-flex { flex: 1; min-width: 0; padding: 6px 10px; border: 1px solid var(--color-border); border-radius: var(--radius-md); font-size: var(--font-size-md); }
.empty { color: var(--color-text-muted); text-align: center; padding: var(--spacing-xl); font-size: var(--font-size-md); }
.empty-seance { color: var(--color-text-muted); font-size: var(--font-size-sm); padding: var(--spacing-sm) 0; }
.athletes-page { padding: var(--spacing-xl) var(--spacing-2xl); display: flex; flex-direction: column; gap: var(--spacing-sm); overflow-y: auto; }
.athlete-row { display: flex; align-items: center; gap: var(--spacing-md); padding: 10px var(--spacing-md); border: 1px solid var(--color-border); border-radius: var(--radius-lg); background: var(--color-bg-secondary); }
.athlete-row.found { border-color: var(--color-primary); background: var(--color-primary-light); }
.mini-av-lg { width: var(--avatar-md); height: var(--avatar-md); border-radius: 50%; background: var(--color-avatar-athlete-bg); display: flex; align-items: center; justify-content: center; font-size: var(--font-size-sm); font-weight: 600; color: var(--color-avatar-athlete-text); flex-shrink: 0; }
.athlete-info { flex: 1; }
.athlete-nom { font-size: var(--font-size-md); font-weight: 500; }
.athlete-email { font-size: var(--font-size-xs); color: var(--color-text-secondary); }
.add-athlete-row { display: flex; gap: var(--spacing-sm); margin-top: var(--spacing-sm); }
.add-athlete-row input { padding: 7px 10px; border: 1px solid var(--color-border); border-radius: var(--radius-md); font-size: var(--font-size-md); }
.error { font-size: var(--font-size-sm); color: var(--color-danger-text); }
.logs-athletes-list { display: flex; flex-direction: column; gap: var(--spacing-sm); }
.athlete-card { display: flex; align-items: center; gap: var(--spacing-md); padding: var(--spacing-md); border: 1px solid var(--color-border); border-radius: var(--radius-lg); cursor: pointer; background: var(--color-bg); }
.athlete-card:hover { border-color: var(--color-primary); background: var(--color-bg-secondary); }
.logs-detail { display: flex; flex-direction: column; gap: var(--spacing-md); }
.logs-header { display: flex; flex-direction: column; gap: var(--spacing-md); }
.logs-title { display: flex; align-items: center; gap: var(--spacing-md); }
.session-block { border: 1px solid var(--color-border); border-radius: var(--radius-lg); overflow: hidden; flex-shrink: 0; }
.session-head { padding: 10px 14px; background: var(--color-bg-secondary); display: flex; align-items: center; gap: var(--spacing-sm); border-bottom: 1px solid var(--color-border); font-size: var(--font-size-md); font-weight: 500; }
.session-nom { flex: 1; }
.session-date { font-size: var(--font-size-xs); color: var(--color-text-secondary); text-transform: capitalize; }
.session-body { padding: 12px 14px; display: flex; flex-direction: column; gap: 14px; }
.exo-bloc { display: flex; flex-direction: column; gap: 6px; }
.exo-header { display: flex; align-items: center; gap: var(--spacing-sm); }
.comparatif-grid { display: flex; flex-direction: column; gap: 2px; }
.comparatif-header { display: grid; grid-template-columns: 32px 1.4fr 1.4fr 24px; gap: var(--spacing-sm); font-size: var(--font-size-xs); color: var(--color-text-secondary); font-weight: 500; padding: 0 4px 4px; }
.comparatif-row { display: grid; grid-template-columns: 32px 1.4fr 1.4fr 24px; gap: var(--spacing-sm); align-items: center; padding: 6px 4px; border-radius: var(--radius-md); font-size: var(--font-size-sm); }
.comparatif-row.statut-done { background: var(--color-valid-bg-soft); }
.comparatif-row.statut-done .statut-icon { color: var(--color-valid-text); }
.comparatif-row.statut-warn { background: #fffbeb; }
.comparatif-row.statut-warn .statut-icon { color: #d97706; }
.comparatif-row.statut-skip { background: #fef2f2; opacity: 0.8; }
.comparatif-row.statut-skip .statut-icon { color: var(--color-danger-text); }
.prescrit-cell { color: var(--color-text-secondary); }
.realise-cell { font-weight: 500; }
.non-fait { color: var(--color-danger-text); font-style: italic; }
.statut-icon { display: flex; justify-content: center; }
.serie-num { font-size: var(--font-size-sm); color: var(--color-text-muted); text-align: center; }

.sidebar-wrapper {
  display: flex;
  flex-direction: row;
  flex-shrink: 0;
}

.sidebar-strip {
  display: none;
}

.sidebar-dots {
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: center;
}

.sidebar-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgba(255,255,255,0.4);
  transition: background 0.2s;
}

.sidebar-dot.active {
  background: white;
  width: 8px;
  height: 8px;
}

@media (max-width: 768px) {
  .content-body {
    overflow: visible;
  }

  .sidebar-wrapper {
    position: static;
    flex-shrink: 0;
    z-index: 30;
  }

  .sidebar-strip {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    gap: 16px;
    padding: 16px 6px;
    width: 32px;
    background: var(--color-primary);
    cursor: pointer;
    flex-shrink: 0;
    color: var(--color-bg);
    font-size: var(--font-size-base);
    position: fixed;
    left: 0;
    top: var(--header-height-mobile);
    bottom: 0;
    z-index: 101;
  }

  .sidebar-strip:hover {
    background: var(--color-primary-dark);
  }

  .panel-list {
    position: fixed;
    left: 32px;
    top: var(--header-height-mobile);
    bottom: 0;
    width: 220px;
    transform: translateX(-252px);
    transition: transform 0.3s ease;
    border-right: 1px solid var(--color-border);
    background: var(--color-bg);
    overflow-y: auto;
    z-index: 100;
    box-shadow: var(--shadow-drawer);
  }

  .sidebar-wrapper.open .panel-list {
    transform: translateX(0);
  }

  .panel-detail {
    flex: 1;
    min-width: 0;
    padding: 12px 12px 12px 44px;
    overflow-y: auto;
  }

  .detail-top {
    flex-direction: column;
  }

  .detail-actions {
    flex-wrap: wrap;
  }
}
.select-jour {
  padding: 3px 6px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  color: var(--color-text-body);
  background: var(--color-bg);
  cursor: pointer;
}

.input-inline {
  flex: 1;
  padding: 3px 8px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--font-size-md);
  font-weight: 500;
  background: var(--color-bg);
  min-width: 0;
}

.input-inline:focus {
  outline: none;
  border-color: var(--color-primary);
}
</style>