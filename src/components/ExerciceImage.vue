<template>
  <button
    v-if="url && !erreur"
    type="button"
    class="exo-img"
    :class="`exo-img-${size}`"
    :aria-label="`Agrandir l'illustration : ${nom}`"
    @click="ouvrir"
  >
    <img :src="urlVignette" :alt="nom" loading="lazy" decoding="async" @error="onErreurVignette" />
    <i class="ti ti-zoom-in exo-img-loupe"></i>
  </button>

  <Teleport to="body">
    <Transition name="exo-lightbox-fade">
      <div v-if="ouvert" class="exo-lightbox" @click="fermer">
        <div class="exo-lightbox-card" :class="{ 'est-double': url2 }" @click.stop>
          <div class="exo-lightbox-head">
            <span class="exo-lightbox-nom">{{ nom }}</span>
            <button type="button" class="exo-lightbox-close" @click="fermer" aria-label="Fermer">
              <i class="ti ti-x"></i>
            </button>
          </div>
          <div class="exo-lightbox-img" :class="{ 'a-deux-phases': url2 }">
            <figure class="exo-phase">
              <img :src="url" :alt="nom" />
              <figcaption v-if="url2">Départ</figcaption>
            </figure>
            <template v-if="url2">
              <i class="ti ti-arrow-right exo-phase-fleche"></i>
              <figure class="exo-phase">
                <img :src="url2" :alt="`${nom} — position finale`" />
                <figcaption>Fin</figcaption>
              </figure>
            </template>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script>
import { ref, computed, onBeforeUnmount } from 'vue'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default {
  props: {
    // chemin relatif renvoyé par l'API (`/static/exercices/xxx.png`), null si
    // l'exercice n'est pas rattaché au catalogue : on n'affiche alors rien
    src: { type: String, default: null },
    // seconde phase du mouvement quand le catalogue en a une : la vignette
    // reste sur la position de départ, les deux ne s'affichent qu'en grand
    src2: { type: String, default: null },
    nom: { type: String, default: '' },
    size: { type: String, default: 'md' } // md (42px) | lg (52px)
  },
  setup(props) {
    const ouvert = ref(false)
    const erreur = ref(false)
    const posterKo = ref(false)
    const url = computed(() => (props.src ? `${BASE_URL}${props.src}` : null))
    const url2 = computed(() => (props.src2 ? `${BASE_URL}${props.src2}` : null))

    // Quelques exercices du catalogue sont des GIF animés (jusqu'à 1,6 Mo,
    // 100 images) : les animer dans une vignette de 42 px au milieu d'une
    // liste, pendant une séance, n'apporte rien et coûte cher. L'import écrit
    // une première image figée `<nom>_poster.png` à côté du GIF — convention
    // partagée avec scripts/import_wger_catalogue.py. L'animation reste
    // servie en grand. Poster absent : on retombe sur le GIF plutôt que de
    // perdre la vignette.
    const urlVignette = computed(() => {
      if (!url.value || posterKo.value || !/\.gif$/i.test(url.value)) return url.value
      return url.value.replace(/\.gif$/i, '_poster.png')
    })
    const onErreurVignette = () => {
      if (urlVignette.value !== url.value) posterKo.value = true
      else erreur.value = true
    }

    const fermer = () => {
      ouvert.value = false
      window.removeEventListener('keydown', onKey)
    }

    const onKey = (e) => { if (e.key === 'Escape') fermer() }

    const ouvrir = (e) => {
      // la vignette est posée dans une carte cliquable (ouverture du panneau
      // de saisie) : le clic sur l'image ne doit pas la déclencher
      e.stopPropagation()
      ouvert.value = true
      window.addEventListener('keydown', onKey)
    }

    onBeforeUnmount(() => window.removeEventListener('keydown', onKey))

    return { ouvert, erreur, url, url2, urlVignette, onErreurVignette, ouvrir, fermer }
  }
}
</script>

<style scoped>
.exo-img {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  padding: 0;
  overflow: hidden;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  /* Les illustrations du catalogue sont des traits noirs sur fond transparent
     ou blanc : il leur faut une plaque claire même en mode sombre, sinon
     elles disparaissent. */
  background: #fff;
  cursor: zoom-in;
  appearance: none;
  -webkit-appearance: none;
  transition: transform 0.12s ease, box-shadow 0.12s ease;
}
.exo-img:hover { transform: scale(1.06); box-shadow: var(--shadow-md); }
.exo-img img {
  width: 100%;
  height: 100%;
  /* formats très variables (400x192 à 185x400), certaines images montrent les
     deux phases du mouvement : jamais de recadrage */
  object-fit: contain;
  display: block;
}

.exo-img-md { width: 42px; height: 42px; }
.exo-img-lg { width: 52px; height: 52px; }

.exo-img-loupe {
  position: absolute;
  right: 1px;
  bottom: 1px;
  width: 15px;
  height: 15px;
  font-size: 10px;
  line-height: 15px;
  text-align: center;
  border-radius: var(--radius-full);
  background: rgba(17, 24, 39, 0.6);
  color: #fff;
}
/* au doigt il n'y a pas de survol pour signaler le clic : la loupe reste
   visible, elle n'apparaît au survol que sur les pointeurs fins */
@media (hover: hover) {
  .exo-img-loupe { opacity: 0; transition: opacity 0.12s ease; }
  .exo-img:hover .exo-img-loupe { opacity: 1; }
}

/* --- Image en grand --- */
.exo-lightbox {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-lg);
  /* au-dessus du panneau de saisie (150) et de la bannière d'installation
     PWA (300) */
  z-index: 400;
}
.exo-lightbox-card {
  width: 100%;
  max-width: 480px;
  max-height: 90dvh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--color-bg);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-modal);
}
.exo-lightbox-card.est-double { max-width: 760px; }
.exo-lightbox-head {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-sm) var(--spacing-sm) var(--spacing-lg);
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}
.exo-lightbox-nom {
  flex: 1;
  min-width: 0;
  font-size: var(--font-size-base);
  font-weight: 700;
  color: var(--color-text);
}
.exo-lightbox-close {
  width: var(--tap-min);
  height: var(--tap-min);
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  border-radius: var(--radius-md);
  font-size: 20px;
  color: var(--color-text-secondary);
  cursor: pointer;
}
.exo-lightbox-close:hover { background: var(--color-bg-secondary); }
.exo-lightbox-img {
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-md);
  padding: var(--spacing-lg);
  background: #fff;
}
.exo-phase {
  margin: 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}
.exo-phase img {
  max-width: 100%;
  max-height: 70dvh;
  object-fit: contain;
  display: block;
}
/* la plaque est toujours blanche, y compris en mode sombre : les couleurs de
   texte sont donc en dur et pas prises aux tokens, qui s'inverseraient */
.exo-phase figcaption {
  font-size: var(--font-size-xs);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  color: #6b7280;
}
.exo-phase-fleche { font-size: 22px; color: #9ca3af; flex-shrink: 0; }
.a-deux-phases .exo-phase img { max-height: 50dvh; }

@media (max-width: 560px) {
  .a-deux-phases { flex-direction: column; }
  .a-deux-phases .exo-phase-fleche { transform: rotate(90deg); }
  .a-deux-phases .exo-phase img { max-height: 30dvh; }
}

.exo-lightbox-fade-enter-active,
.exo-lightbox-fade-leave-active { transition: opacity 0.15s ease; }
.exo-lightbox-fade-enter-from,
.exo-lightbox-fade-leave-to { opacity: 0; }
</style>
