// Politique de confidentialité, affichée à l'inscription (case à cocher), sur
// l'écran de connexion et sur la page publique /confidentialite.
//
// Changer MISE_A_JOUR à chaque modification du texte.

export const MISE_A_JOUR = '12 novembre 2026'

const RESPONSABLE = 'Lucas Gilet'
const CONTACT = 'athletia@espacenum.fr'

// Chaque section : titre + paragraphes et/ou liste à puces.
export const SECTIONS = [
  {
    titre: 'Qui est responsable de vos données',
    paragraphes: [
      `Athletia est édité par ${RESPONSABLE}, responsable du traitement de vos données personnelles. Pour toute question ou demande : ${CONTACT}.`
    ]
  },
  {
    titre: 'Les données que nous collectons',
    paragraphes: ['Uniquement ce que vous, votre club ou votre préparateur saisissez dans l\'application :'],
    liste: [
      'Compte : email (votre identifiant), mot de passe (stocké sous une forme chiffrée que personne ne peut relire), rôle, club et préparateurs auxquels vous êtes rattaché.',
      'Profil : prénom, nom, sexe, date de naissance, téléphone, sports pratiqués, objectif sportif et photo. Seuls le prénom et le nom sont obligatoires.',
      'Entraînement : programmes, séances réalisées, séries (charges, répétitions, distances), ressenti et durée des séances, tests physiques et performances.',
      'Santé et forme : questionnaire de forme (sommeil, fatigue, courbatures, stress), blessures (zone, circonstances, consultation d\'un médecin ou d\'un kiné, durée d\'arrêt), poids, et alimentation (repas, aliments, calories, objectif calorique).'
    ]
  },
  {
    titre: 'Des données de santé, avec votre accord',
    paragraphes: [
      'La forme, les blessures, le poids et l\'alimentation sont des données de santé, que la loi protège particulièrement. Nous ne les traitons qu\'avec votre accord explicite, donné en cochant la case prévue à l\'inscription.',
      'Vous pouvez retirer cet accord à tout moment en nous écrivant : les données de santé déjà saisies sont alors supprimées. Les autres fonctions de l\'application restent utilisables.'
    ]
  },
  {
    titre: 'À quoi elles servent',
    liste: [
      'Suivre votre entraînement, votre forme et votre progression.',
      'Permettre à votre préparateur d\'adapter vos programmes et de prévenir les blessures (charge d\'entraînement, forme du jour).',
      'Permettre à votre club de gérer ses membres.',
      'Calculer votre expérience, vos niveaux et vos statistiques.'
    ],
    paragraphesApres: [
      'Vos données ne sont jamais vendues, ni utilisées pour de la publicité, ni transmises à des tiers à des fins commerciales.'
    ]
  },
  {
    titre: 'Qui peut les voir',
    liste: [
      'Vous : toutes vos données.',
      'Les préparateurs qui vous suivent : votre profil, votre entraînement, votre forme, vos blessures et votre poids. Un préparateur ne vous suit que si vous avez rejoint son cercle (code coach) ou si votre club vous y a ajouté.',
      'Votre alimentation : vous seul. Elle n\'est pas visible par votre préparateur.',
      'L\'administrateur de votre club : votre compte et votre profil, pour gérer les membres (création de comptes, mot de passe oublié, départ du club).',
      'L\'équipe qui gère Athletia : uniquement pour la maintenance et le support, sans consulter vos données sans raison.'
    ]
  },
  {
    titre: 'Où elles sont stockées',
    paragraphes: [
      `Sur un serveur loué chez OVHcloud, en France, hébergeur de l'application. Les échanges entre votre téléphone et le serveur sont chiffrés (HTTPS).`,
      'La police de caractères de l\'application est chargée depuis les serveurs de Google (Google Fonts), qui reçoivent à cette occasion votre adresse IP, comme pour n\'importe quel site qui l\'utilise.',
      'Votre navigateur garde votre session de connexion et vos préférences d\'affichage (thème, affichage des séances). Il n\'y a ni cookie publicitaire, ni outil de mesure d\'audience.'
    ]
  },
  {
    titre: 'Combien de temps',
    paragraphes: [
      `Vos données sont conservées tant que votre compte existe. Quand votre compte est supprimé, vos données le sont aussi. Un compte inutilisé pendant un an et demi est supprimé.`
    ]
  },
  {
    titre: 'Moins de 15 ans',
    paragraphes: [
      'Si vous avez moins de 15 ans, créez votre compte avec l\'accord de l\'un de vos parents (ou de la personne qui a l\'autorité parentale), qui peut exercer vos droits à votre place.'
    ]
  },
  {
    titre: 'Vos droits',
    paragraphes: [
      'Vous pouvez à tout moment consulter vos données, les corriger (la plupart directement depuis votre profil), les récupérer, en limiter l\'usage, vous y opposer, retirer votre accord ou demander leur suppression.',
      `Écrivez à ${CONTACT} : nous répondons dans un délai d'un mois. Si vous estimez que vos droits ne sont pas respectés, vous pouvez saisir la CNIL (www.cnil.fr).`
    ]
  },
  {
    titre: 'Modifications',
    paragraphes: [
      'Si cette politique change de façon importante, vous en serez informé dans l\'application.'
    ]
  }
]
