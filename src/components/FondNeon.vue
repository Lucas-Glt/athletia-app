<template>
  <!-- Le dégradé CSS du conteneur reste visible tant que WebGL n'a rien
       dessiné, et à sa place s'il est indisponible. -->
  <div ref="racine" class="fond-neon" aria-hidden="true">
    <canvas ref="toile" class="fond-neon-toile" :class="{ pret }"></canvas>
  </div>
</template>

<script>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { mouvementReduit } from '../animations/mouvement'

const VERTEX = /* glsl */ `
attribute vec2 uv;
attribute vec2 position;
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 0.0, 1.0);
}
`

// Trois taches de lumière (violet, cyan, lavande) qui dérivent sur la nuit
// du logo, sur un plan qui ondule lentement.
const FRAGMENT = /* glsl */ `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform float uTemps;
uniform vec2 uTaille;
uniform float uIntensite;
uniform vec3 uNuit;
uniform vec3 uViolet;
uniform vec3 uLavande;
uniform vec3 uCyan;
varying vec2 vUv;

float tache(vec2 p, vec2 c, float r) {
  vec2 d = p - c;
  return exp(-dot(d, d) / (r * r));
}

float grain(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
  float ratio = uTaille.x / uTaille.y;
  vec2 p = vec2(vUv.x * ratio, vUv.y);
  float t = uTemps;
  p += 0.05 * vec2(sin(p.y * 4.0 + t * 0.7), cos(p.x * 3.5 - t * 0.6));

  vec2 c1 = vec2(ratio * (0.22 + 0.18 * sin(t * 0.23)), 0.30 + 0.20 * cos(t * 0.31));
  vec2 c2 = vec2(ratio * (0.80 + 0.14 * cos(t * 0.19)), 0.72 + 0.18 * sin(t * 0.27));
  vec2 c3 = vec2(ratio * (0.55 + 0.25 * sin(t * 0.13 + 1.7)), 0.12 + 0.12 * cos(t * 0.21 + 0.5));

  vec3 col = uNuit;
  col = mix(col, uViolet, tache(p, c1, 0.55) * 0.85 * uIntensite);
  col = mix(col, uCyan, tache(p, c2, 0.42) * 0.5 * uIntensite);
  col = mix(col, uLavande, tache(p, c3, 0.38) * 0.4 * uIntensite);
  // Grain très léger : casse les bandes visibles des dégradés sombres
  col += (grain(gl_FragCoord.xy + fract(t)) - 0.5) * (3.0 / 255.0);
  gl_FragColor = vec4(col, 1.0);
}
`

const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)

// Un dégradé flou n'a pas besoin de pleine définition : moitié moins de
// pixels à calculer, agrandis par le navigateur sans perte visible.
const DEFINITION = 0.5
// 30 images/s suffisent à une dérive aussi lente, pour moitié moins de batterie
const IMAGE_MS = 1000 / 30
// Instant figé affiché si l'utilisateur réduit les animations
const TEMPS_FIGE = 7

// Fond « Nuit néon » animé (WebGL, via OGL). OGL n'est téléchargé que par
// les écrans qui l'affichent, et le dessin s'arrête dès que le fond n'est plus
// visible : hors écran, appli en arrière-plan.
export default {
  props: {
    // Force des taches de lumière (0 : nuit unie)
    intensite: { type: Number, default: 1 },
    vitesse: { type: Number, default: 1 }
  },
  setup(props) {
    const racine = ref(null)
    const toile = ref(null)
    const pret = ref(false)

    let renderer = null
    let programme = null
    let mesh = null
    let raf = 0
    let derniere = 0
    let temps = TEMPS_FIGE
    let visible = true
    let demonte = false
    let observateurTaille = null
    let observateurVisibilite = null

    const dessiner = () => {
      programme.uniforms.uTemps.value = temps
      renderer.render({ scene: mesh })
      pret.value = true
    }

    const boucle = (maintenant) => {
      raf = requestAnimationFrame(boucle)
      const ecart = maintenant - derniere
      if (ecart < IMAGE_MS) return
      // Après une pause, on reprend où on en était au lieu de sauter
      temps += (Math.min(ecart, 100) / 1000) * props.vitesse
      derniere = maintenant
      dessiner()
    }

    const arreter = () => {
      cancelAnimationFrame(raf)
      raf = 0
    }
    const demarrer = () => {
      if (raf || !renderer || !visible || document.hidden) return
      if (mouvementReduit()) {
        dessiner()
        return
      }
      derniere = performance.now()
      raf = requestAnimationFrame(boucle)
    }
    const surVisibilitePage = () => (document.hidden ? arreter() : demarrer())

    const redimensionner = () => {
      const { width, height } = racine.value.getBoundingClientRect()
      if (!width || !height) return
      renderer.setSize(width, height)
      programme.uniforms.uTaille.value = [width, height]
      // Le redimensionnement efface la toile : sans animation, on redessine
      if (!raf) dessiner()
    }

    onMounted(async () => {
      let ogl
      try {
        ogl = await import('../animations/ogl')
      } catch {
        return // hors ligne : le dégradé CSS reste en place
      }
      if (demonte) return
      const { Renderer, Program, Mesh, Triangle } = ogl
      try {
        renderer = new Renderer({
          canvas: toile.value,
          dpr: DEFINITION,
          alpha: false,
          depth: false,
          antialias: false,
          powerPreference: 'low-power'
        })
        if (!renderer.gl) throw new Error('WebGL indisponible')
      } catch {
        renderer = null
        return
      }
      const gl = renderer.gl
      programme = new Program(gl, {
        vertex: VERTEX,
        fragment: FRAGMENT,
        depthTest: false,
        uniforms: {
          uTemps: { value: temps },
          uTaille: { value: [1, 1] },
          uIntensite: { value: props.intensite },
          uNuit: { value: rgb('#0C0A22') },
          uViolet: { value: rgb('#5A51BE') },
          uLavande: { value: rgb('#C2BCFF') },
          uCyan: { value: rgb('#4FE3D6') }
        }
      })
      mesh = new Mesh(gl, { geometry: new Triangle(gl), program: programme })

      toile.value.addEventListener('webglcontextlost', (e) => {
        e.preventDefault()
        arreter()
        pret.value = false
        renderer = null
      })

      observateurTaille = new ResizeObserver(redimensionner)
      observateurTaille.observe(racine.value)
      redimensionner()

      observateurVisibilite = new IntersectionObserver(([entree]) => {
        visible = entree.isIntersecting
        if (visible) demarrer()
        else arreter()
      })
      observateurVisibilite.observe(racine.value)
      document.addEventListener('visibilitychange', surVisibilitePage)
      demarrer()
    })

    onBeforeUnmount(() => {
      demonte = true
      arreter()
      observateurTaille?.disconnect()
      observateurVisibilite?.disconnect()
      document.removeEventListener('visibilitychange', surVisibilitePage)
      // Rend le contexte WebGL tout de suite : le navigateur n'en garde
      // qu'une poignée, et l'accueil se remonte à chaque changement d'onglet.
      renderer?.gl?.getExtension('WEBGL_lose_context')?.loseContext()
      renderer = null
    })

    return { racine, toile, pret }
  }
}
</script>

<style scoped>
.fond-neon {
  position: absolute;
  inset: 0;
  overflow: hidden;
  background:
    radial-gradient(ellipse at 20% 30%, rgba(90, 81, 190, 0.85), transparent 55%),
    radial-gradient(ellipse at 85% 75%, rgba(79, 227, 214, 0.35), transparent 50%),
    radial-gradient(ellipse at 55% 5%, rgba(194, 188, 255, 0.3), transparent 45%),
    #0C0A22;
  pointer-events: none;
}
.fond-neon-toile {
  display: block;
  width: 100%;
  height: 100%;
  opacity: 0;
  transition: opacity 0.8s ease;
}
.fond-neon-toile.pret { opacity: 1; }
</style>
