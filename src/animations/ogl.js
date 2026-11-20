// Seules classes d'OGL dont le fond néon a besoin. Importées ici en statique
// puis ce module chargé à la demande (cf. FondNeon.vue) : un import dynamique
// direct de 'ogl' embarquerait toute la bibliothèque.
export { Renderer, Program, Mesh, Triangle } from 'ogl'
