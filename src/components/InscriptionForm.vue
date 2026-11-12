<template>
  <!-- Inscription libre : athlète ou préparateur, avec un vrai email comme
       identifiant. Le code (club ou coach) est facultatif. -->
  <form class="inscription" @submit.prevent="inscrire">
    <div class="field">
      <label>Je suis</label>
      <div class="choix-ligne">
        <button type="button" class="choix" :class="{ actif: form.role === 'athlete' }" @click="form.role = 'athlete'">
          <i class="ti ti-run"></i> Athlète
        </button>
        <button type="button" class="choix" :class="{ actif: form.role === 'prepa' }" @click="form.role = 'prepa'">
          <i class="ti ti-clipboard-list"></i> Préparateur
        </button>
      </div>
    </div>

    <div class="deux-colonnes">
      <div class="field">
        <label for="insc-prenom">Prénom</label>
        <input id="insc-prenom" v-model="form.prenom" autocomplete="given-name" maxlength="60" required />
      </div>
      <div class="field">
        <label for="insc-nom">Nom</label>
        <input id="insc-nom" v-model="form.nom_de_famille" autocomplete="family-name" maxlength="60" required />
      </div>
    </div>

    <div class="field">
      <label for="insc-email">Email</label>
      <input id="insc-email" v-model="form.email" type="email" autocomplete="email" autocapitalize="none" required />
      <span class="aide">Il servira à vous connecter.</span>
    </div>

    <div class="deux-colonnes">
      <div class="field">
        <label for="insc-mdp">Mot de passe</label>
        <input id="insc-mdp" v-model="form.password" type="password" autocomplete="new-password" placeholder="8 caractères minimum" required />
      </div>
      <div class="field">
        <label for="insc-mdp2">Confirmation</label>
        <input id="insc-mdp2" v-model="confirmation" type="password" autocomplete="new-password" required />
      </div>
    </div>

    <div class="deux-colonnes">
      <div class="field">
        <label for="insc-naissance">Date de naissance</label>
        <input id="insc-naissance" v-model="form.date_naissance" type="date" :max="aujourdhui" />
      </div>
      <div class="field">
        <label for="insc-tel">Téléphone <span class="facultatif">(facultatif)</span></label>
        <input id="insc-tel" v-model="form.telephone" type="tel" autocomplete="tel" />
      </div>
    </div>

    <div class="field">
      <label>Sexe</label>
      <div class="choix-ligne">
        <button v-for="s in SEXES" :key="s.label" type="button" class="choix" :class="{ actif: form.sexe === s.valeur }" @click="form.sexe = s.valeur">
          {{ s.label }}
        </button>
      </div>
    </div>

    <div class="field">
      <label for="insc-code">{{ form.role === 'athlete' ? 'Code club ou code coach' : 'Code club (préparateurs)' }} <span class="facultatif">(facultatif)</span></label>
      <input id="insc-code" v-model="form.code" autocapitalize="characters" autocomplete="off" placeholder="Ex : K7P4QX9M" />
      <span class="aide">
        {{ form.role === 'athlete'
          ? 'Donné par votre club ou votre préparateur. Sans code, votre compte est indépendant : vous pourrez en saisir un plus tard dans votre profil.'
          : "Donné par l'administrateur de votre club. Sans code, vous êtes indépendant : vos athlètes vous rejoindront avec votre code coach." }}
      </span>
    </div>

    <!-- Champ piège : invisible et hors du parcours clavier, seul un robot le
         remplit (le serveur refuse alors l'inscription). -->
    <div class="piege" aria-hidden="true">
      <label for="insc-site">Site web</label>
      <input id="insc-site" v-model="form.site_web" name="site_web" tabindex="-1" autocomplete="off" />
    </div>

    <label class="consentement">
      <input v-model="form.consentement" type="checkbox" />
      <span>
        J'accepte la
        <button type="button" class="lien" @click="politiqueOuverte = true">politique de confidentialité</button>,
        y compris le traitement de mes données de santé (forme, blessures, poids, alimentation) pour mon suivi sportif.
      </span>
    </label>

    <p v-if="erreur" class="error" role="alert">{{ erreur }}</p>

    <button type="submit" class="btn btn-primary btn-plein" :disabled="envoi">
      {{ envoi ? 'Création du compte…' : 'Créer mon compte' }}
    </button>
    <button type="button" class="btn btn-ghost btn-plein" @click="$emit('annuler')">J'ai déjà un compte</button>
  </form>
  <PolitiqueConfidentialite v-if="politiqueOuverte" @fermer="politiqueOuverte = false" />
</template>

<script>
import { ref } from 'vue'
import { lireCorps, messageErreur, requeteReseau } from '../services/api'
import { erreurMotDePasse } from '../utils/motDePasse'
import PolitiqueConfidentialite from './PolitiqueConfidentialite.vue'

const SEXES = [
  { valeur: 'homme', label: 'Homme' },
  { valeur: 'femme', label: 'Femme' },
  { valeur: null, label: 'Non précisé' }
]
const pad2 = (n) => String(n).padStart(2, '0')

export default {
  components: { PolitiqueConfidentialite },
  emits: ['inscrit', 'annuler'],
  setup(_, { emit }) {
    const form = ref({
      role: 'athlete', prenom: '', nom_de_famille: '', email: '', password: '',
      date_naissance: '', telephone: '', sexe: null, code: '', consentement: false, site_web: ''
    })
    const confirmation = ref('')
    const erreur = ref('')
    const envoi = ref(false)
    const politiqueOuverte = ref(false)
    const now = new Date()
    const aujourdhui = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`

    const inscrire = async () => {
      erreur.value = erreurMotDePasse(form.value.password)
      if (!erreur.value && form.value.password !== confirmation.value) {
        erreur.value = 'Les mots de passe ne correspondent pas'
      }
      if (!erreur.value && !form.value.consentement) {
        erreur.value = 'Acceptez la politique de confidentialité pour créer votre compte'
      }
      if (erreur.value) return
      envoi.value = true
      try {
        const f = form.value
        const response = await requeteReseau('/auth/inscription', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...f,
            email: f.email.trim(),
            date_naissance: f.date_naissance || null,
            telephone: f.telephone.trim() || null,
            code: f.code.trim() || null
          })
        })
        const data = await lireCorps(response)
        if (!response.ok) throw new Error(messageErreur(data, response.status))
        emit('inscrit', data.access_token)
      } catch (e) {
        erreur.value = e.message
      } finally {
        envoi.value = false
      }
    }

    return { SEXES, form, confirmation, erreur, envoi, politiqueOuverte, aujourdhui, inscrire }
  }
}
</script>

<style scoped>
.inscription { display: flex; flex-direction: column; gap: var(--spacing-md); }
.deux-colonnes { display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-md); }
@media (max-width: 420px) { .deux-colonnes { grid-template-columns: 1fr; } }
.aide { font-size: var(--font-size-xs); color: var(--color-text-secondary); }
.facultatif { font-weight: 400; color: var(--color-text-muted); }
.choix-ligne { display: flex; gap: var(--spacing-sm); flex-wrap: wrap; }
.choix {
  flex: 1;
  min-height: var(--tap-min);
  padding: 0 var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}
.choix.actif { border-color: var(--color-primary); background: var(--color-primary-light); color: var(--color-primary-text); font-weight: 600; }
.btn-plein { width: 100%; }
.piege { position: absolute; left: -10000px; width: 1px; height: 1px; overflow: hidden; }
.consentement { display: flex; gap: var(--spacing-sm); align-items: flex-start; font-size: var(--font-size-sm); line-height: 1.4; cursor: pointer; }
.consentement input { flex-shrink: 0; width: 20px; height: 20px; margin: 1px 0 0; accent-color: var(--color-primary); }
.lien { background: none; border: none; padding: 0; font: inherit; color: var(--color-primary-text); text-decoration: underline; cursor: pointer; }
</style>
