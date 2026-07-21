<template>
  <div class="tree">
    <div v-if="groupes.length === 0" class="empty">
      {{ isSearching ? 'Aucun athlète ne correspond à la recherche.' : 'Aucune organisation pour l\'instant.' }}
    </div>

    <div v-for="g in groupes" :key="orgKey(g.org)" class="org-bloc">
      <div class="org-header" @click="toggleOrg(g.org)">
        <i class="ti" :class="orgEstOuvert(g.org) ? 'ti-chevron-down' : 'ti-chevron-right'"></i>
        <div class="org-info">
          <span class="org-nom">{{ g.org.nom }}</span>
          <span class="org-slug" v-if="g.org.id !== null">{{ g.org.slug }}</span>
        </div>
        <span class="org-total">{{ totalMembres(g) }}</span>
        <button class="btn btn-sm" @click.stop="$emit('ajouter', g.org.id)" title="Ajouter un compte">
          <i class="ti ti-plus"></i>
        </button>
      </div>

      <div v-if="orgEstOuvert(g.org)" class="org-body">
        <div v-for="role in rolesAffiches" :key="role" class="role-bloc">
          <div class="role-header" @click="toggleGroupe(g.org, role)">
            <i class="ti" :class="groupeEstOuvert(g.org, role) ? 'ti-chevron-down' : 'ti-chevron-right'"></i>
            <span class="role-label">{{ libelleRole(role) }}</span>
            <span class="role-count">{{ g.parRole[role].length }}</span>
          </div>

          <div v-if="groupeEstOuvert(g.org, role)" class="profil-list">
            <div v-if="g.parRole[role].length === 0" class="empty-inline">Aucun</div>
            <div v-for="u in g.parRole[role]" :key="u.id" class="profil-row">
              <div class="mini-av" :class="`av-${u.role}`">{{ initiales(u.nom) }}</div>
              <div class="profil-txt">
                <span class="profil-nom">{{ u.nom }}</span>
                <span class="profil-email">{{ u.email }}</span>
              </div>
              <select class="org-select" :value="u.organisation_id ?? ''" @change="onChangeOrg(u, $event.target.value)">
                <option value="">Indépendant</option>
                <option v-for="org in organisationsReelles" :key="org.id" :value="org.id">{{ org.nom }}</option>
              </select>
              <button class="btn btn-sm btn-icon" @click="$emit('reset-password', u)" title="Réinitialiser le mot de passe">
                <i class="ti ti-lock"></i>
              </button>
              <button class="btn btn-sm btn-icon btn-danger" @click="$emit('delete', u)" title="Supprimer">
                <i class="ti ti-trash"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { computed, reactive } from 'vue'

const ROLES = ['admin', 'prepa', 'athlete']
const LIBELLES = { admin: 'Admins', prepa: 'Préparateurs', athlete: 'Athlètes' }

export default {
  emits: ['reassign', 'reset-password', 'delete', 'ajouter'],
  props: {
    organisations: { type: Array, default: () => [] },
    users: { type: Array, default: () => [] },
    searchQuery: { type: String, default: '' }
  },
  setup(props, { emit }) {
    const orgsOuverts = reactive(new Set())
    const groupesOuverts = reactive(new Set())

    const query = computed(() => props.searchQuery.trim().toLowerCase())
    const isSearching = computed(() => query.value.length > 0)
    const rolesAffiches = computed(() => (isSearching.value ? ['athlete'] : ROLES))
    // La liste passée par le parent inclut déjà l'entrée synthétique
    // Indépendant (id: null) pour former les groupes de l'arbre ; le select
    // de réassignation la propose séparément (option "Indépendant" fixe),
    // donc on ne garde ici que les vraies organisations.
    const organisationsReelles = computed(() => props.organisations.filter((org) => org.id !== null))

    const orgKey = (org) => (org.id === null ? 'indep' : String(org.id))

    const matchAthlete = (u) =>
      u.nom.toLowerCase().includes(query.value) || u.email.toLowerCase().includes(query.value)

    const groupes = computed(() => {
      return props.organisations
        .map((org) => {
          const membres = props.users.filter((u) => (u.organisation_id ?? null) === org.id)
          const parRole = {
            admin: membres.filter((u) => u.role === 'admin'),
            prepa: membres.filter((u) => u.role === 'prepa'),
            athlete: membres.filter((u) => u.role === 'athlete')
          }
          if (isSearching.value) parRole.athlete = parRole.athlete.filter(matchAthlete)
          return { org, parRole }
        })
        .filter((g) => (isSearching.value ? g.parRole.athlete.length > 0 : true))
    })

    const totalMembres = (g) => g.parRole.admin.length + g.parRole.prepa.length + g.parRole.athlete.length

    const toggleOrg = (org) => {
      const k = orgKey(org)
      if (orgsOuverts.has(k)) orgsOuverts.delete(k)
      else orgsOuverts.add(k)
    }
    const orgEstOuvert = (org) => (isSearching.value ? true : orgsOuverts.has(orgKey(org)))

    const toggleGroupe = (org, role) => {
      const k = `${orgKey(org)}:${role}`
      if (groupesOuverts.has(k)) groupesOuverts.delete(k)
      else groupesOuverts.add(k)
    }
    const groupeEstOuvert = (org, role) => (isSearching.value ? role === 'athlete' : groupesOuverts.has(`${orgKey(org)}:${role}`))

    const libelleRole = (role) => LIBELLES[role]
    const initiales = (nom) => nom.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)

    const onChangeOrg = (user, rawValue) => {
      const nouvelleOrgId = rawValue === '' ? null : Number(rawValue)
      if (nouvelleOrgId === (user.organisation_id ?? null)) return
      emit('reassign', user, nouvelleOrgId)
    }

    return {
      groupes, rolesAffiches, isSearching, organisationsReelles,
      orgKey, toggleOrg, orgEstOuvert, toggleGroupe, groupeEstOuvert,
      totalMembres, libelleRole, initiales, onChangeOrg
    }
  }
}
</script>

<style scoped>
.tree { display: flex; flex-direction: column; gap: var(--spacing-sm); }

.org-bloc { border: 1px solid var(--color-border); border-radius: var(--radius-lg); background: var(--color-bg); overflow: hidden; }
.org-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-md) var(--spacing-lg);
  cursor: pointer;
}
.org-header:hover { background: var(--color-bg-hover); }
.org-header > i { color: var(--color-text-secondary); }
.org-info { flex: 1; min-width: 0; display: flex; align-items: baseline; gap: var(--spacing-sm); }
.org-nom { font-size: var(--font-size-sm); font-weight: 600; }
.org-slug { font-size: var(--font-size-xs); color: var(--color-text-secondary); font-family: monospace; }
.org-total {
  font-size: var(--font-size-xs);
  background: var(--color-bg-tertiary);
  color: var(--color-text-secondary);
  padding: 1px 8px;
  border-radius: var(--radius-full);
}

.org-body { border-top: 1px solid var(--color-border); background: var(--color-bg-secondary); }
.role-bloc + .role-bloc { border-top: 1px solid var(--color-border); }
.role-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-lg);
  cursor: pointer;
}
.role-header:hover { background: var(--color-bg-hover); }
.role-header > i { color: var(--color-text-secondary); font-size: var(--font-size-sm); }
.role-label { flex: 1; font-size: var(--font-size-xs); font-weight: 600; color: var(--color-text-secondary); text-transform: uppercase; letter-spacing: 0.4px; }
.role-count { font-size: var(--font-size-xs); color: var(--color-text-muted); }

.profil-list { display: flex; flex-direction: column; padding: 0 var(--spacing-lg) var(--spacing-sm); gap: 6px; }
.empty-inline { font-size: var(--font-size-sm); color: var(--color-text-muted); padding: var(--spacing-xs) 0; }
.profil-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  flex-wrap: wrap;
}
.mini-av {
  width: var(--avatar-md);
  height: var(--avatar-md);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--font-size-xs);
  font-weight: 600;
  flex-shrink: 0;
}
.av-admin { background: var(--color-danger-bg); color: var(--color-danger-text); }
.av-prepa { background: var(--color-primary-light); color: var(--color-primary-text); }
.av-athlete { background: var(--color-success-bg); color: var(--color-success-text); }

.profil-txt { flex: 1; min-width: 140px; display: flex; flex-direction: column; }
.profil-nom { font-size: var(--font-size-sm); font-weight: 500; }
.profil-email { font-size: var(--font-size-xs); color: var(--color-text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.org-select {
  min-height: 36px;
  padding: 0 var(--spacing-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--font-size-xs);
  background: var(--color-bg);
  max-width: 160px;
}

@media (max-width: 768px) {
  .profil-row { flex-wrap: wrap; }
  .org-select { max-width: 100%; order: 3; flex: 1 1 100%; }
}
</style>
