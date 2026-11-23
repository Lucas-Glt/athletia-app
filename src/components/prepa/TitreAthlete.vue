<template>
  <span class="titre-athlete" :class="`taille-${taille}`" :title="`Niveau ${progression.niveau} · ${progression.titre}`">
    <span class="titre-pastille">
      <i class="ti" :class="progression.icone || 'ti-star'" aria-hidden="true"></i>
      <span class="titre-niveau">Niv. {{ progression.niveau }}</span>
      <span class="titre-nom">{{ progression.titre }}</span>
    </span>
    <span
      v-if="avecSerie && progression.serie_jours >= 2"
      class="titre-serie"
      :title="`${progression.serie_jours} jours d'affilée`"
      :aria-label="`Série de ${progression.serie_jours} jours`"
    ><i class="ti ti-flame" aria-hidden="true"></i>{{ progression.serie_jours }} j</span>
  </span>
</template>

<script>
// Le titre gagné par l'athlète (Asticot, Crevette… Légende) et son niveau,
// tels qu'il les voit chez lui, en pastille « nuit néon » — la couleur des
// moments de progression dans toute l'app.
export default {
  props: {
    // { niveau, titre, icone, serie_jours } (résumé du cercle)
    progression: { type: Object, required: true },
    taille: { type: String, default: 'sm' }, // 'sm' (listes) | 'md' (fiche)
    avecSerie: { type: Boolean, default: true }
  }
}
</script>

<style scoped>
.titre-athlete { display: inline-flex; align-items: center; gap: 6px; min-width: 0; max-width: 100%; vertical-align: middle; }
/* Toujours de nuit, quel que soit le thème (comme le bandeau de niveau de
   l'athlète) : les couleurs y sont donc fixes. */
.titre-pastille {
  display: inline-flex; align-items: center; gap: 5px; min-width: 0;
  padding: 2px 9px 2px 7px;
  border: 1px solid rgba(194, 188, 255, 0.28);
  border-radius: var(--radius-full);
  background: linear-gradient(90deg, #211C4A, #17143A);
  color: #F6F5FF;
  font-size: 11px; font-weight: 600; line-height: 1.5; white-space: nowrap;
}
.titre-pastille .ti { flex-shrink: 0; font-size: 13px; color: #4FE3D6; }
.titre-niveau { flex-shrink: 0; font-weight: 800; color: #C2BCFF; font-variant-numeric: tabular-nums; }
.titre-nom { min-width: 0; overflow: hidden; text-overflow: ellipsis; }
.titre-serie {
  display: inline-flex; align-items: center; gap: 1px; flex-shrink: 0;
  font-size: 11px; font-weight: 700; color: var(--color-warning-text-strong);
  font-variant-numeric: tabular-nums;
}
.titre-serie .ti { font-size: 14px; color: #FB923C; }

.taille-md .titre-pastille { padding: 3px 11px 3px 8px; font-size: var(--font-size-sm); }
.taille-md .titre-pastille .ti { font-size: 16px; }
.taille-md .titre-serie { font-size: var(--font-size-sm); }
.taille-md .titre-serie .ti { font-size: 17px; }
</style>
