// Valeur numérique d'une saisie de série (prescrite ou réalisée). Le prépa
// peut prescrire « 3+3 » (cluster, chaque côté…) et l'athlète saisir de même :
// les termes sont additionnés (« 3+3 » → 6). parseFloat seul lisait 3.
// Virgule décimale acceptée. NaN si un terme n'est pas numérique.
export const parseValeurSerie = (v) => {
  const termes = String(v ?? '')
    .split('+')
    .map((t) => t.trim())
    .filter(Boolean)
  if (!termes.length) return NaN
  return termes.reduce((total, t) => total + parseFloat(t.replace(',', '.')), 0)
}

// Le clavier décimal mobile n'a pas de touche « + » (iOS comme Android) : le
// clavier téléphone en a une, à n'utiliser que quand le prescrit en contient.
export const inputmodeSaisie = (prescrit) =>
  String(prescrit ?? '').includes('+') ? 'tel' : 'decimal'
