<template>
  <!-- Nouveautés de l'appli et mot du prépa (contenu : src/data/notesMaj.js),
       en bas de l'accueil : la plus récente dépliée, le reste au besoin. -->
  <aside v-if="derniere" class="notes-maj" aria-labelledby="notes-maj-titre">
    <div class="notes-maj-tete">
      <span class="notes-maj-badge"><i class="ti ti-sparkles"></i> Nouveau</span>
      <span class="notes-maj-date">{{ derniere.date }}</span>
    </div>
    <h3 id="notes-maj-titre">{{ derniere.titre }}</h3>
    <ul>
      <li v-for="(point, i) in derniere.points" :key="i">{{ point }}</li>
    </ul>

    <details v-if="precedentes.length" class="notes-maj-plus">
      <summary><i class="ti ti-history"></i> Mises à jour précédentes</summary>
      <article v-for="note in precedentes" :key="note.date + note.titre" class="notes-maj-ancienne">
        <span class="notes-maj-date">{{ note.date }}</span>
        <h4>{{ note.titre }}</h4>
        <ul>
          <li v-for="(point, i) in note.points" :key="i">{{ point }}</li>
        </ul>
      </article>
    </details>

    <details class="notes-maj-plus">
      <summary><i class="ti ti-speakerphone"></i> Le mot du prépa</summary>
      <div class="notes-maj-mot">
        <p v-for="(paragraphe, i) in MOT_DU_PREPA" :key="i">{{ paragraphe }}</p>
        <p class="notes-maj-signature">{{ SIGNATURE_MOT }}</p>
      </div>
    </details>
  </aside>
</template>

<script>
import { MOT_DU_PREPA, SIGNATURE_MOT, NOTES_MAJ } from '../../data/notesMaj'

export default {
  setup() {
    const [derniere, ...precedentes] = NOTES_MAJ
    return { derniere, precedentes, MOT_DU_PREPA, SIGNATURE_MOT }
  }
}
</script>

<style scoped>
.notes-maj {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: var(--spacing-md) var(--spacing-lg);
  border: 1px dashed var(--color-primary-lighter);
  border-radius: var(--radius-lg);
  background: var(--color-primary-light);
}
.notes-maj-tete { display: flex; align-items: center; justify-content: space-between; gap: var(--spacing-sm); }
.notes-maj-badge {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 1px 8px; border-radius: var(--radius-full);
  background: var(--color-primary); color: var(--color-on-primary);
  font-size: 11px; font-weight: 700;
}
.notes-maj-date { font-size: 11px; font-weight: 600; color: var(--color-text-muted); }
.notes-maj h3 { margin: 0; font-size: var(--font-size-sm); font-weight: 700; color: var(--color-text); }
.notes-maj h4 { margin: 0; font-size: var(--font-size-xs); font-weight: 700; color: var(--color-text); }
.notes-maj ul { margin: 0; padding-left: 16px; display: flex; flex-direction: column; gap: 2px; }
.notes-maj li { font-size: var(--font-size-xs); line-height: 1.5; color: var(--color-text-body); }

.notes-maj-plus { border-top: 1px solid var(--color-primary-lighter); }
.notes-maj-plus summary {
  display: flex; align-items: center; gap: 6px;
  min-height: 36px;
  font-size: var(--font-size-xs); font-weight: 600; color: var(--color-primary-dark);
  cursor: pointer; list-style: none;
}
.notes-maj-plus summary::-webkit-details-marker { display: none; }
.notes-maj-plus[open] summary { margin-bottom: 4px; }
.notes-maj-ancienne { display: flex; flex-direction: column; gap: 2px; padding-bottom: var(--spacing-sm); }
.notes-maj-ancienne + .notes-maj-ancienne { padding-top: var(--spacing-sm); border-top: 1px solid var(--color-primary-lighter); }
.notes-maj-mot { display: flex; flex-direction: column; gap: 6px; padding-bottom: var(--spacing-sm); }
.notes-maj-mot p { margin: 0; font-size: var(--font-size-xs); line-height: 1.55; color: var(--color-text-body); }
.notes-maj-mot .notes-maj-signature { font-weight: 700; color: var(--color-primary-dark); }
</style>
