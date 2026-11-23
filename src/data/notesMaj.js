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
    date: '23 novembre 2026',
    titre: 'Une séance en plus ? Déclare-la',
    points: [
      'Un match, un footing, de la pliométrie en plus de ton programme ? Dans l\'onglet Séances, touche « Séance hors programme » : le type, comment tu l\'as trouvée et combien de temps elle a duré.',
      'Ton prépa voit ainsi ta vraie charge d\'entraînement. Elle rapporte 100 XP, une fois par jour : ton programme reste la priorité.'
    ]
  },
  {
    date: '20 novembre 2026',
    titre: 'Athletia passe en mode néon',
    points: [
      'Nouveau look « Nuit néon » : le mode sombre prend les couleurs du logo, et ton niveau s\'affiche en haut de l\'accueil, jauge en direct.',
      'Chaque passage de niveau se fête, et tes titres deviennent des cartes à collectionner : fais-les pivoter du doigt dans « Mes titres ».',
      'Le lundi, ton récap de la semaine se regarde comme une story. Et quand ton prépa réagit à une série, tu le vois arriver.'
    ]
  },
  {
    date: '19 novembre 2026',
    titre: 'Une seule vue pour ta séance',
    points: [
      'Ta séance s\'affiche en liste : coche chaque exercice fait, il est enregistré avec les valeurs prévues par ton prépa.',
      'Envie de noter tes vraies charges ? Touche le crayon à côté de l\'exercice : photos, dernière perf et saisie série par série sont là.'
    ]
  },
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
