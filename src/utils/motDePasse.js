// Mêmes règles que l'API (app/auth.py, hacher_mot_de_passe) pour tout NOUVEAU
// mot de passe : au moins 8 caractères, et pas plus de 72 octets — limite de
// bcrypt, où une lettre accentuée compte double. Vérifié ici aussi pour que
// le message s'affiche avant l'envoi.
export const LONGUEUR_MIN_MOT_DE_PASSE = 8
const OCTETS_MAX = 72

// Message à afficher, ou '' si le mot de passe convient.
export const erreurMotDePasse = (motDePasse) => {
  if ((motDePasse || '').length < LONGUEUR_MIN_MOT_DE_PASSE) {
    return `Le mot de passe doit faire au moins ${LONGUEUR_MIN_MOT_DE_PASSE} caractères`
  }
  if (new TextEncoder().encode(motDePasse).length > OCTETS_MAX) {
    return 'Mot de passe trop long : 72 caractères maximum (une lettre accentuée compte double)'
  }
  return ''
}
