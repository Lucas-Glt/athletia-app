<template>
  <div class="blessures">
    <div class="info-note">
      <i class="ti ti-info-circle"></i>
      Déclarez vos blessures : votre préparateur les voit et peut adapter vos séances.
    </div>

    <button class="btn btn-primary btn-declarer" @click="ouvrirDeclaration">
      <i class="ti ti-plus"></i> Déclarer une blessure
    </button>

    <p v-if="erreurListe" class="error">{{ erreurListe }}</p>

    <div v-if="chargement" class="empty">Chargement...</div>

    <template v-else>
      <!-- En cours d'abord : c'est l'état actuel qui compte, l'historique
           n'est là que pour la mémoire. -->
      <section v-if="enCours.length > 0" class="blessure-section">
        <h3 class="blessure-section-titre">
          <i class="ti ti-bandage"></i> En cours ({{ enCours.length }})
        </h3>
        <article v-for="b in enCours" :key="b.id" class="blessure-carte est-en-cours">
          <div class="blessure-head">
            <div>
              <div class="blessure-zone">{{ b.zone }}</div>
              <div class="blessure-meta">
                {{ formatDateBlessure(b.date_blessure) }} · {{ labelAnciennete(b.date_blessure) }}
              </div>
            </div>
            <span class="badge badge-danger">En cours</span>
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
              <i class="ti ti-hourglass"></i> {{ labelDureeBlessure(b.duree_estimee) }}
            </span>
          </div>

          <div class="blessure-actions">
            <button class="btn btn-sm btn-primary" @click="marquerGuerie(b)">
              <i class="ti ti-heart-check"></i> Je suis guéri
            </button>
            <button class="btn btn-sm" @click="ouvrirEdition(b)">
              <i class="ti ti-pencil"></i> Modifier
            </button>
            <button class="btn btn-sm btn-danger" @click="supprimer(b)" aria-label="Supprimer">
              <i class="ti ti-trash"></i>
            </button>
          </div>
        </article>
      </section>

      <section v-if="gueries.length > 0" class="blessure-section">
        <h3 class="blessure-section-titre">
          <i class="ti ti-history"></i> Historique ({{ gueries.length }})
        </h3>
        <article v-for="b in gueries" :key="b.id" class="blessure-carte">
          <div class="blessure-head">
            <div>
              <div class="blessure-zone">{{ b.zone }}</div>
              <div class="blessure-meta">
                {{ formatDateBlessure(b.date_blessure) }} → {{ formatDateBlessure(b.date_guerison) }}
              </div>
            </div>
            <span class="badge badge-green">Guérie</span>
          </div>

          <p v-if="b.circonstances" class="blessure-circonstances">{{ b.circonstances }}</p>

          <div class="blessure-actions">
            <button class="btn btn-sm" @click="rouvrir(b)">
              <i class="ti ti-rotate-2"></i> Toujours blessé
            </button>
            <button class="btn btn-sm btn-danger" @click="supprimer(b)" aria-label="Supprimer">
              <i class="ti ti-trash"></i>
            </button>
          </div>
        </article>
      </section>

      <div v-if="blessures.length === 0" class="empty-state">
        <i class="ti ti-mood-happy empty-icon"></i>
        <p>Aucune blessure déclarée.</p>
        <span>Tant mieux — déclarez-en une si ça arrive.</span>
      </div>
    </template>

    <!-- Déclaration / modification : même formulaire, la présence de
         form.id décide de la route appelée. -->
    <div v-if="formulaireOuvert" class="modal-overlay" @click.self="fermerFormulaire">
      <div class="modal">
        <div class="modal-header">
          <h3>{{ form.id ? 'Modifier la blessure' : 'Déclarer une blessure' }}</h3>
          <button class="modal-close" @click="fermerFormulaire" aria-label="Fermer">
            <i class="ti ti-x"></i>
          </button>
        </div>

        <div class="modal-body">
          <div class="field">
            <label for="bl-zone">Blessure</label>
            <input
              id="bl-zone"
              v-model="form.zone"
              placeholder="Ex : ischio-jambier droit"
              maxlength="120"
            />
          </div>

          <div class="field">
            <label for="bl-date">Date de la blessure</label>
            <input id="bl-date" v-model="form.date_blessure" type="date" :max="aujourdhui" />
          </div>

          <div class="field">
            <label for="bl-comment">Comment est-ce arrivé ?</label>
            <textarea
              id="bl-comment"
              v-model="form.circonstances"
              rows="3"
              maxlength="500"
              placeholder="Ex : sprint en fin de séance, douleur brutale à l'arrière de la cuisse"
            ></textarea>
          </div>

          <div class="field">
            <label>Vu par un médecin ?</label>
            <div class="ouinon">
              <button type="button" class="ouinon-btn" :class="{ actif: form.docteur }" @click="form.docteur = true">Oui</button>
              <button type="button" class="ouinon-btn" :class="{ actif: !form.docteur }" @click="form.docteur = false">Non</button>
            </div>
          </div>

          <div class="field">
            <label>Suivi par un kiné ?</label>
            <div class="ouinon">
              <button type="button" class="ouinon-btn" :class="{ actif: form.kine }" @click="form.kine = true">Oui</button>
              <button type="button" class="ouinon-btn" :class="{ actif: !form.kine }" @click="form.kine = false">Non</button>
            </div>
          </div>

          <div class="field">
            <label for="bl-duree">Combien de temps d'arrêt ?</label>
            <select id="bl-duree" v-model="form.duree_estimee">
              <option value="">Non précisé</option>
              <option v-for="d in DUREES_BLESSURE" :key="d.valeur" :value="d.valeur">{{ d.label }}</option>
            </select>
          </div>

          <p v-if="erreur" class="error">{{ erreur }}</p>
        </div>

        <div class="modal-footer">
          <button class="btn" @click="fermerFormulaire">Annuler</button>
          <button class="btn btn-primary" :disabled="!formValide || envoiEnCours" @click="enregistrer">
            <i class="ti ti-check"></i> {{ form.id ? 'Enregistrer' : 'Déclarer' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { useApi } from '../../services/api'
import { DUREES_BLESSURE, labelDureeBlessure, formatDateBlessure, labelAnciennete } from '../../data/blessures'

const pad2 = (n) => String(n).padStart(2, '0')
const dateISOLocale = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`

const formVide = () => ({
  id: null,
  zone: '',
  date_blessure: dateISOLocale(new Date()),
  circonstances: '',
  docteur: false,
  kine: false,
  duree_estimee: ''
})

export default {
  setup() {
    const api = useApi()
    const blessures = ref([])
    const chargement = ref(true)
    const formulaireOuvert = ref(false)
    const envoiEnCours = ref(false)
    // Deux emplacements distincts : le formulaire a le sien dans la modale,
    // les actions de la liste (guérir, rouvrir, supprimer) n'en avaient aucun
    // et échouaient sans rien afficher.
    const erreur = ref('')
    const erreurListe = ref('')
    const form = ref(formVide())

    const aujourdhui = dateISOLocale(new Date())

    // L'API renvoie déjà « en cours d'abord, puis du plus récent au plus
    // ancien » : on se contente de séparer les deux blocs sans retrier.
    const enCours = computed(() => blessures.value.filter(b => b.en_cours))
    const gueries = computed(() => blessures.value.filter(b => !b.en_cours))

    const formValide = computed(() => !!form.value.zone.trim() && !!form.value.date_blessure)

    const charger = async () => {
      try {
        blessures.value = await api.get('/blessures/moi')
      } catch (e) {
        console.error('Erreur chargement blessures:', e)
      } finally {
        chargement.value = false
      }
    }

    const ouvrirDeclaration = () => {
      form.value = formVide()
      erreur.value = ''
      formulaireOuvert.value = true
    }

    const ouvrirEdition = (b) => {
      form.value = {
        id: b.id,
        zone: b.zone,
        date_blessure: b.date_blessure,
        circonstances: b.circonstances || '',
        docteur: b.docteur,
        kine: b.kine,
        duree_estimee: b.duree_estimee || ''
      }
      erreur.value = ''
      formulaireOuvert.value = true
    }

    const fermerFormulaire = () => {
      formulaireOuvert.value = false
      erreur.value = ''
    }

    const enregistrer = async () => {
      if (!formValide.value || envoiEnCours.value) return
      envoiEnCours.value = true
      erreur.value = ''
      const corps = {
        zone: form.value.zone.trim(),
        date_blessure: form.value.date_blessure,
        circonstances: form.value.circonstances.trim() || null,
        docteur: form.value.docteur,
        kine: form.value.kine,
        duree_estimee: form.value.duree_estimee || null
      }
      try {
        if (form.value.id) await api.patch(`/blessures/${form.value.id}`, corps)
        else await api.post('/blessures/', corps)
        formulaireOuvert.value = false
        await charger()
      } catch (e) {
        erreur.value = e.message || "Erreur lors de l'enregistrement"
      } finally {
        envoiEnCours.value = false
      }
    }

    // PATCH ciblé : n'envoyer que date_guerison évite d'écraser une
    // déclaration corrigée entre-temps sur un autre appareil. La date est
    // recalculée au clic, pas au montage : l'app peut rester ouverte
    // plusieurs jours sur un téléphone.
    const majGuerison = async (b, date_guerison) => {
      erreurListe.value = ''
      try {
        await api.patch(`/blessures/${b.id}`, { date_guerison })
        await charger()
      } catch (e) {
        erreurListe.value = e.message || 'Erreur lors de la mise à jour'
      }
    }

    const marquerGuerie = (b) => majGuerison(b, dateISOLocale(new Date()))
    const rouvrir = (b) => majGuerison(b, null)

    const supprimer = async (b) => {
      if (!confirm(`Supprimer la blessure « ${b.zone} » ?`)) return
      erreurListe.value = ''
      try {
        await api.del(`/blessures/${b.id}`)
        await charger()
      } catch (e) {
        erreurListe.value = e.message || 'Erreur lors de la suppression'
      }
    }

    onMounted(charger)

    return {
      blessures, chargement, enCours, gueries,
      formulaireOuvert, form, formValide, erreur, erreurListe, envoiEnCours, aujourdhui,
      ouvrirDeclaration, ouvrirEdition, fermerFormulaire, enregistrer,
      marquerGuerie, rouvrir, supprimer,
      DUREES_BLESSURE, labelDureeBlessure, formatDateBlessure, labelAnciennete
    }
  }
}
</script>

<style scoped>
.blessures {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: var(--spacing-lg);
  padding: var(--spacing-lg) var(--spacing-xl);
  overflow-y: auto;
  min-height: 0;
  touch-action: pan-y;
}

.info-note {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  background: var(--color-bg-secondary);
  border-radius: var(--radius-md);
  padding: var(--spacing-sm) var(--spacing-md);
}
.info-note i { color: var(--color-primary); flex-shrink: 0; }

.btn-declarer { align-self: flex-start; }

.blessure-section { display: flex; flex-direction: column; gap: var(--spacing-sm); }
.blessure-section-titre {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: var(--font-size-sm);
  font-weight: 700;
  color: var(--color-text-secondary);
}

.blessure-carte {
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}
/* Le liseré suffit à distinguer une blessure active dans une liste qui mêle
   en cours et guéries, sans répéter la couleur sur toute la carte. */
.blessure-carte.est-en-cours { border-left: 3px solid var(--color-danger-text); }

.blessure-head { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--spacing-md); }
.blessure-zone { font-size: var(--font-size-base); font-weight: 700; }
.blessure-meta { font-size: var(--font-size-xs); color: var(--color-text-muted); margin-top: 2px; }
.blessure-circonstances {
  margin: 0;
  font-size: var(--font-size-sm);
  color: var(--color-text-body);
  white-space: pre-wrap;
}

.badge-danger { background: var(--color-danger-bg); color: var(--color-danger-text); }

.blessure-tags { display: flex; flex-wrap: wrap; gap: 6px; }
.tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: var(--font-size-xs);
  font-weight: 600;
  padding: 3px 8px;
  border-radius: var(--radius-full);
  background: var(--color-bg-secondary);
  color: var(--color-text-secondary);
}
.tag-oui { background: var(--color-valid-bg); color: var(--color-valid-text-strong); }
.tag-non { color: var(--color-text-muted); }

.blessure-actions { display: flex; flex-wrap: wrap; gap: var(--spacing-sm); }

.ouinon { display: flex; gap: var(--spacing-sm); }
.ouinon-btn {
  flex: 1;
  min-height: var(--tap-min);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg);
  font-size: var(--font-size-base);
  font-weight: 600;
  cursor: pointer;
}
.ouinon-btn.actif { background: var(--color-primary); border-color: var(--color-primary); color: var(--color-on-primary); }

/* base.css n'habille que input et select : le textarea suit les mêmes
   règles, hauteur libre en plus. */
.field textarea {
  padding: var(--spacing-sm) var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--font-size-base);
  font-family: inherit;
  background: var(--color-bg);
  width: 100%;
  resize: vertical;
  transition: border-color 0.15s;
}
.field textarea:focus { outline: none; border-color: var(--color-primary); }

.empty { color: var(--color-text-muted); font-size: var(--font-size-sm); }
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
