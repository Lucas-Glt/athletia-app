// Mot du prépa et notes de mise à jour, affichés sur la page de connexion
// pour les athlètes.
//
// Pour annoncer une nouvelle mise à jour : ajouter une entrée EN TÊTE de
// NOTES_MAJ (la plus récente d'abord), avec sa date, un titre court et ce qui
// change pour l'athlète, en mots simples. Seule la plus récente est dépliée,
// les autres restent sous « Mises à jour précédentes ».

export const MOT_DU_PREPA = [
  'Salut les gars,',
  "Je vois que beaucoup d'entre vous évoluent grâce à mon application, et j'ai envie de la faire évoluer avec vous. Mon objectif ? Faire de vous les monstres que vous devez être.",
  'Alors si ça vous intéresse, je mettrai ici les mises à jour que je ferai.'
]

export const SIGNATURE_MOT = 'À vos barres…'

export const NOTES_MAJ = [
  {
    date: '8 novembre 2026',
    titre: 'La vue simple',
    points: [
      'Dans une séance, choisis « Vue simple » : tout ce qui est prévu en un coup d\'œil. Tu coches ce que tu as fait, c\'est enregistré avec les valeurs prévues, sans rien saisir série par série.',
      'Un exercice pas fait ? Décoche-le : ton prépa verra exactement ce que tu as fait.',
      'La saisie détaillée reste là pour ceux qui veulent noter leurs charges réelles.'
    ]
  },
  {
    date: '7 novembre 2026',
    titre: 'Plus lisible, plus rien de perdu',
    points: [
      'Nouveau look : les charges prévues en gros, des cases de saisie plus grandes, et Poids, Diète et Blessures regroupés dans « Suivi ».',
      'Chaque série cochée est enregistrée tout de suite : si tu t\'arrêtes en route ou si le réseau coupe, rien n\'est perdu.'
    ]
  },
  {
    date: '18 octobre 2026',
    titre: 'Les séries en plusieurs fois',
    points: [
      'Une série faite en deux fois ? Écris « 3+3 » : c\'est additionné dans tes stats.',
      'Des messages clairs quand le réseau ne passe pas, et une connexion plus solide sur mobile.'
    ]
  },
  {
    date: 'Septembre 2026',
    titre: 'Programmes et régularité',
    points: [
      'Tes programmes s\'affichent en grille, et tu peux épingler celui qui s\'ouvre au lancement.',
      'Touche un jour de ta grille de régularité pour revoir la séance faite ce jour-là.',
      'Diète : un aliment saisi à la main est retenu pour la prochaine fois.',
      'Séances en superset : plus aucune série perdue à la validation.'
    ]
  },
  {
    date: 'Août 2026',
    titre: 'Diète, sommeil, planning et blessures',
    points: [
      'Diète : recherche d\'aliments, calcul des calories et objectif de poids avec sa courbe.',
      'Ton temps de sommeil se note avec le wellness du matin.',
      'Ta semaine d\'entraînement et ton calendrier du mois, avec une couleur par discipline.',
      'Une blessure ? Déclare-la dans l\'appli, ton prépa est prévenu.'
    ]
  }
]
