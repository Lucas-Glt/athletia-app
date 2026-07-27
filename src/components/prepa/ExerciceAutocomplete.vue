<template>
  <div class="exo-autocomplete">
    <input
      :value="modelValue"
      @input="onInput($event.target.value)"
      @focus="onFocus"
      @blur="onBlur"
      :placeholder="placeholder"
      class="input-flex"
    />
    <div v-if="ouvert && resultats.length" class="autocomplete-dropdown">
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
  </div>
</template>

<script>
import { ref } from 'vue'
import { useApi } from '../../services/api'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default {
  props: {
    modelValue: { type: String, default: '' },
    placeholder: { type: String, default: "Nom de l'exercice" }
  },
  emits: ['update:modelValue', 'select'],
  setup(_, { emit }) {
    const api = useApi()
    const resultats = ref([])
    const ouvert = ref(false)
    let timer = null

    const rechercher = async (q) => {
      if (q.trim().length < 2) {
        resultats.value = []
        return
      }
      try {
        resultats.value = await api.get(`/exercices/catalogue?q=${encodeURIComponent(q.trim())}`)
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
      if (resultats.value.length) ouvert.value = true
    }
    const onBlur = () => {
      setTimeout(() => { ouvert.value = false }, 150)
    }

    const choisir = (item) => {
      emit('update:modelValue', item.nom)
      emit('select', item)
      resultats.value = []
      ouvert.value = false
    }

    const urlImage = (path) => `${BASE_URL}${path}`

    return { resultats, ouvert, onInput, onFocus, onBlur, choisir, urlImage }
  }
}
</script>

<style scoped>
.exo-autocomplete { position: relative; flex: 1; }

.autocomplete-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: var(--color-bg);
  border: 1px solid var(--color-primary-light);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-dropdown);
  max-height: 280px;
  overflow-y: auto;
  z-index: 50;
}

.autocomplete-item {
  width: 100%;
  min-height: var(--tap-min);
  padding: 6px var(--spacing-md);
  background: none;
  border: none;
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
