// Développements de la planification annuelle : ce que vise chaque semaine.
// Les clés sont celles de l'API (DEVELOPPEMENTS dans app/planification.py) :
// garder les deux listes alignées. Ordre = celui d'une saison type, c'est
// aussi celui de la palette du prépa. `texte` : couleur lisible sur `couleur`.
export const DEVELOPPEMENTS = [
  { cle: 'generale', label: 'Préparation générale', court: 'Prépa générale', icone: 'ti-run', couleur: '#2563EB', texte: '#ffffff' },
  { cle: 'masse', label: 'Prise de masse', court: 'Masse', icone: 'ti-meat', couleur: '#7C3AED', texte: '#ffffff' },
  { cle: 'force', label: 'Force', court: 'Force', icone: 'ti-barbell', couleur: '#DC2626', texte: '#ffffff' },
  { cle: 'puissance', label: 'Puissance', court: 'Puissance', icone: 'ti-bolt', couleur: '#EA580C', texte: '#ffffff' },
  { cle: 'vitesse', label: 'Vitesse', court: 'Vitesse', icone: 'ti-gauge', couleur: '#84CC16', texte: '#1A2E05' },
  { cle: 'endurance', label: 'Endurance', court: 'Endurance', icone: 'ti-heartbeat', couleur: '#0891B2', texte: '#ffffff' },
  { cle: 'seche', label: 'Sèche', court: 'Sèche', icone: 'ti-flame', couleur: '#0D9488', texte: '#ffffff' },
  { cle: 'reathletisation', label: 'Réathlétisation', court: 'Réathlé.', icone: 'ti-bandage', couleur: '#DB2777', texte: '#ffffff' },
  { cle: 'affutage', label: 'Affûtage', court: 'Affûtage', icone: 'ti-target', couleur: '#4338CA', texte: '#ffffff' },
  { cle: 'competition', label: 'Compétition', court: 'Compét.', icone: 'ti-trophy', couleur: '#F59E0B', texte: '#2B1700' },
  { cle: 'decharge', label: 'Décharge', court: 'Décharge', icone: 'ti-feather', couleur: '#CBD5E1', texte: '#1E293B' },
  { cle: 'repos', label: 'Repos', court: 'Repos', icone: 'ti-zzz', couleur: '#475569', texte: '#ffffff' }
]

const PAR_CLE = Object.fromEntries(DEVELOPPEMENTS.map((d) => [d.cle, d]))

// Une clé inconnue (API plus récente que l'interface) s'affiche quand même.
export const developpement = (cle) =>
  PAR_CLE[cle] || { cle, label: cle, court: cle, icone: 'ti-point', couleur: '#94A3B8', texte: '#ffffff' }
