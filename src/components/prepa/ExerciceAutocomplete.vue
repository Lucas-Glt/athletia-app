<template>
  <div class="exo-autocomplete">
    <input
      ref="inputRef"
      :value="modelValue"
      @input="onInput($event.target.value)"
      @focus="onFocus"
      @blur="onBlur"
      :placeholder="placeholder"
      class="exo-autocomplete-input"
    />
    <Teleport to="body">
      <div v-if="ouvert && resultats.length" class="autocomplete-dropdown" :style="dropdownStyle">
        <button
          v-for="r in resultats"
          :key="r.id"
          type="button"
          class="autocomplete-item"
          @mousedown.prevent="choisir(r)"
        >
          <img :src="urlImage(r.image_url)" :alt="r.nom" loading="lazy" />
          <span>{{ r.nom }}</span>
        </button>
      </div>
    </Teleport>
  </div>
</template>

<script>
import { ref, onBeforeUnmount } from 'vue'
import { useApi } from '../../services/api'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default {
  props: {
    modelValue: { type: String, default: '' },
    placeholder: { type: String, default: "Nom de l'exercice" }
  },
  emits: ['update:modelValue', 'select', 'blur'],
  setup(_, { emit }) {
    const api = useApi()
    const resultats = ref([])
    const ouvert = ref(false)
    const inputRef = ref(null)
    const dropdownStyle = ref({})
    let timer = null

    // Le menu est téléporté dans <body> et positionné en fixed à partir des
    // coordonnées écran du champ : ça l'affranchit de tout ancêtre en
    // overflow:hidden/auto (panneaux scrollables de la fiche programme) et
    // de la pile d'empilement locale. Position recalculée à l'ouverture, à
    // chaque nouveau résultat, et au redimensionnement (clavier virtuel qui
    // s'ouvre/se referme, barre d'onglets et bannière PWA fixes en bas
    // d'écran mangent de la place sans que window.innerHeight ne bouge).
    const majPosition = () => {
      if (!inputRef.value) return
      const rect = inputRef.value.getBoundingClientRect()
      let basVisible = window.innerHeight
      document.querySelectorAll('.bottom-nav, .install-banner').forEach(el => {
        const top = el.getBoundingClientRect().top
        if (top < basVisible) basVisible = top
      })
      const espaceEnDessous = basVisible - rect.bottom
      const espaceAuDessus = rect.top
      const versLeHaut = espaceEnDessous < 150 && espaceAuDessus > espaceEnDessous
      const espaceDispo = Math.max(120, (versLeHaut ? espaceAuDessus : espaceEnDessous) - 12)

      dropdownStyle.value = versLeHaut
        ? { left: `${rect.left}px`, width: `${rect.width}px`, bottom: `${window.innerHeight - rect.top + 4}px`, maxHeight: `${espaceDispo}px` }
        : { left: `${rect.left}px`, width: `${rect.width}px`, top: `${rect.bottom + 4}px`, maxHeight: `${espaceDispo}px` }
    }

    const onReposition = () => { if (ouvert.value) majPosition() }
    window.addEventListener('resize', onReposition)
    window.addEventListener('scroll', onReposition, true)
    window.visualViewport?.addEventListener('resize', onReposition)
    onBeforeUnmount(() => {
      window.removeEventListener('resize', onReposition)
      window.removeEventListener('scroll', onReposition, true)
      window.visualViewport?.removeEventListener('resize', onReposition)
    })

    const rechercher = async (q) => {
      if (q.trim().length < 2) {
        resultats.value = []
        return
      }
      try {
        resultats.value = await api.get(`/exercices/catalogue?q=${encodeURIComponent(q.trim())}`)
        majPosition()
      } catch {
        resultats.value = []
      }
    }

    const onInput = (valeur) => {
      emit('update:modelValue', valeur)
      emit('select', null)
      ouvert.value = true
      clearTimeout(timer)
      timer = setTimeout(() => rechercher(valeur), 250)
    }

    const onFocus = () => {
      if (resultats.value.length) {
        majPosition()
        ouvert.value = true
      }
    }
    const onBlur = () => {
      // le mousedown.prevent d'un choix au clic garde le focus sur le champ,
      // donc cet événement ne se déclenche que sur une vraie sortie du champ
      emit('blur')
      setTimeout(() => { ouvert.value = false }, 150)
    }

    const choisir = (item) => {
      emit('update:modelValue', item.nom)
      emit('select', item)
      resultats.value = []
      ouvert.value = false
    }

    const urlImage = (path) => `${BASE_URL}${path}`

    return { resultats, ouvert, inputRef, dropdownStyle, onInput, onFocus, onBlur, choisir, urlImage }
  }
}
</script>

<style scoped>
.exo-autocomplete { position: relative; flex: 1; }

.exo-autocomplete-input {
  width: 100%;
  min-width: 140px;
  min-height: var(--tap-min);
  padding: 0 var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--font-size-base);
  background: var(--color-bg);
  color: var(--color-text-body);
}
.exo-autocomplete-input:focus { outline: none; border-color: var(--color-primary); }

.autocomplete-dropdown {
  position: fixed;
  background: var(--color-bg);
  border: 1px solid var(--color-primary-light);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-dropdown);
  overflow-y: auto;
  /* au-dessus de la bannière d'installation PWA (z-index: 300) et de la
     barre d'onglets mobile (z-index: 90), fixes en bas de l'écran */
  z-index: 310;
}

.autocomplete-item {
  width: 100%;
  min-height: var(--tap-min);
  padding: 6px var(--spacing-md);
  background: none;
  border: none;
  appearance: none;
  -webkit-appearance: none;
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  text-align: left;
  font-size: var(--font-size-sm);
  color: var(--color-text-body);
  cursor: pointer;
}
.autocomplete-item:hover { background: var(--color-bg-secondary); }
.autocomplete-item img {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-sm);
  object-fit: cover;
  background: var(--color-bg-tertiary);
  flex-shrink: 0;
}
.autocomplete-item span { flex: 1; }
</style>
