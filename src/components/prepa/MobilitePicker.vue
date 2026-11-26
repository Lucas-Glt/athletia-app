<template>
  <Teleport to="body">
    <div class="modal-overlay mobilite-overlay" @click.self="$emit('fermer')">
      <div class="modal mobilite-modal" role="dialog" aria-labelledby="mobilite-titre">
        <div class="modal-header">
          <h3 id="mobilite-titre"><i class="ti ti-stretching"></i> Mobilité &amp; étirements</h3>
          <button class="modal-close" aria-label="Fermer" @click="$emit('fermer')"><i class="ti ti-x"></i></button>
        </div>

        <div class="mobilite-filtres">
          <div class="mobilite-zones" role="radiogroup" aria-label="Zone travaillée">
            <button
              v-for="z in zonesProposees"
              :key="z.cle"
              type="button"
              role="radio"
              class="filtre-chip"
              :class="{ actif: zone === z.cle }"
              :aria-checked="zone === z.cle"
              @click="zone = z.cle"
            >{{ z.label }}</button>
          </div>
          <div class="mobilite-natures" role="radiogroup" aria-label="Nature">
            <button
              v-for="n in NATURES"
              :key="n.cle"
              type="button"
              role="radio"
              class="nature-btn"
              :class="{ actif: nature === n.cle }"
              :aria-checked="nature === n.cle"
              @click="nature = n.cle"
            >{{ n.label }}</button>
          </div>
        </div>

        <div class="modal-body mobilite-corps">
          <div v-if="chargement" class="empty">Chargement…</div>
          <div v-else-if="erreur" class="empty">{{ erreur }}</div>
          <div v-else-if="!exercicesFiltres.length" class="empty">Aucun exercice pour ce filtre.</div>
          <div v-else class="mobilite-grille">
            <button
              v-for="ex in exercicesFiltres"
              :key="ex.id"
              type="button"
              class="mobilite-carte"
              :title="ex.consigne"
              @click="$emit('choisir', ex)"
            >
              <span class="mobilite-image">
                <img :src="url(ex.image_url)" :alt="ex.nom" loading="lazy" :class="{ 'est-photo': !/\.svg$/i.test(ex.image_url) }" />
                <span v-if="ex.image_url_2" class="mobilite-temps" title="Départ et fin du mouvement">2 temps</span>
              </span>
              <span class="mobilite-nom">{{ ex.nom }}</span>
              <span class="mobilite-meta">
                {{ LABEL_NATURE[ex.categorie] || 'Étirement' }} · {{ labelsZones(ex) }}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useApi } from '../../services/api'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const NATURES = [
  { cle: 'tout', label: 'Tout' },
  { cle: 'etirement', label: 'Étirements' },
  { cle: 'mobilite', label: 'Dynamique' },
  { cle: 'rouleau', label: 'Rouleau' }
]
const LABEL_NATURE = { etirement: 'Étirement', mobilite: 'Dynamique', rouleau: 'Rouleau' }

// Une trentaine d'exercices qui ne changent qu'au déploiement : chargés une
// fois par session, partagés par tous les champs « exercice » de la page.
let catalogue = null

export default {
  emits: ['choisir', 'fermer'],
  setup(_, { emit }) {
    const api = useApi()
    const zones = ref([])
    const exercices = ref([])
    const chargement = ref(true)
    const erreur = ref('')
    const zone = ref('toutes')
    const nature = ref('tout')

    onMounted(async () => {
      try {
        catalogue = catalogue || api.get('/exercices/catalogue/mobilite')
        const data = await catalogue
        zones.value = data.zones
        exercices.value = data.exercices
      } catch (e) {
        catalogue = null
        erreur.value = e.message || 'Impossible de charger les exercices de mobilité'
      } finally {
        chargement.value = false
      }
    })

    const labelParZone = computed(() => Object.fromEntries(zones.value.map(z => [z.cle, z.label])))
    // seulement les zones qui ont des exercices, dans l'ordre de l'API (tête → pieds)
    const zonesProposees = computed(() => [
      { cle: 'toutes', label: 'Toutes' },
      ...zones.value.filter(z => exercices.value.some(e => e.zones.includes(z.cle)))
    ])
    const exercicesFiltres = computed(() => exercices.value.filter(e =>
      (zone.value === 'toutes' || e.zones.includes(zone.value)) &&
      (nature.value === 'tout' || e.categorie === nature.value)
    ))
    const labelsZones = (ex) => ex.zones.slice(0, 2).map(z => labelParZone.value[z] || z).join(', ')
    const url = (chemin) => `${BASE_URL}${chemin}`

    const onKey = (e) => { if (e.key === 'Escape') emit('fermer') }
    window.addEventListener('keydown', onKey)
    onBeforeUnmount(() => window.removeEventListener('keydown', onKey))

    return { NATURES, LABEL_NATURE, zone, nature, chargement, erreur, zonesProposees, exercicesFiltres, labelsZones, url }
  }
}
</script>

<style scoped>
/* au-dessus du menu d'autocomplétion (310) d'où elle s'ouvre */
.mobilite-overlay { z-index: 320; }
.mobilite-modal { max-width: 760px; height: 85vh; }
.modal-header h3 { display: flex; align-items: center; gap: var(--spacing-sm); }
.modal-header h3 .ti { color: var(--color-primary); font-size: var(--font-size-lg); }

.mobilite-filtres {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  padding: var(--spacing-md) var(--spacing-xl) var(--spacing-sm);
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}
.mobilite-zones { display: flex; gap: 6px; overflow-x: auto; padding-bottom: 2px; scrollbar-width: none; }
.filtre-chip {
  flex-shrink: 0;
  min-height: 36px;
  padding: 0 var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  background: var(--color-bg);
  color: var(--color-text-body);
  font-size: var(--font-size-sm);
  cursor: pointer;
}
.filtre-chip.actif { background: var(--color-primary); border-color: var(--color-primary); color: var(--color-on-primary); font-weight: 600; }
.mobilite-natures { display: inline-flex; align-self: flex-start; padding: 3px; gap: 2px; border-radius: var(--radius-full); background: var(--color-bg-tertiary); }
.nature-btn {
  min-height: 30px;
  padding: 0 var(--spacing-md);
  border: none;
  border-radius: var(--radius-full);
  background: none;
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
  font-weight: 600;
  cursor: pointer;
}
.nature-btn.actif { background: var(--color-bg); color: var(--color-text); box-shadow: var(--shadow-sm, 0 1px 2px rgba(0, 0, 0, 0.1)); }

.mobilite-corps { padding: var(--spacing-md) var(--spacing-xl) var(--spacing-xl); }
.mobilite-grille { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: var(--spacing-sm); align-items: start; }
.mobilite-carte {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: var(--spacing-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-bg-secondary);
  text-align: left;
  cursor: pointer;
  transition: border-color var(--transition-fast), transform var(--transition-fast);
}
.mobilite-carte:hover { border-color: var(--color-primary); transform: translateY(-1px); }
.mobilite-image { position: relative; display: block; }
.mobilite-image img { width: 100%; height: auto; aspect-ratio: 1; display: block; border-radius: 17%; }
/* photos et dessins du catalogue wger : formats variés, jamais recadrés, sur
   plaque blanche (traits noirs invisibles en mode sombre sinon) */
.mobilite-image img.est-photo { object-fit: contain; background: #fff; border: 1px solid var(--color-border); border-radius: var(--radius-lg); }
.mobilite-temps {
  position: absolute;
  right: 6px;
  bottom: 6px;
  padding: 1px 7px;
  border-radius: var(--radius-full);
  background: rgba(79, 227, 214, 0.18);
  color: #4fe3d6;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.2px;
}
.mobilite-nom { font-size: var(--font-size-sm); font-weight: 600; color: var(--color-text); line-height: 1.3; }
.mobilite-meta { font-size: var(--font-size-xs); color: var(--color-text-muted); }

@media (max-width: 560px) {
  .mobilite-overlay { padding: 0; align-items: flex-end; }
  .mobilite-modal { max-width: none; height: 92dvh; max-height: 92dvh; border-radius: var(--radius-xl) var(--radius-xl) 0 0; }
  .mobilite-filtres, .mobilite-corps { padding-left: var(--spacing-md); padding-right: var(--spacing-md); }
  .mobilite-grille { grid-template-columns: repeat(2, 1fr); }
}
</style>
