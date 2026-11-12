<template>
  <!-- Profil de la personne connectée, tous rôles : photo, identité, contact,
       sports et objectif (athlètes), codes pour rejoindre un club ou un coach. -->
  <div class="modal-overlay" @click.self="$emit('fermer')">
    <div class="modal modal-profil">
      <div class="modal-header">
        <h3>Mon profil</h3>
        <button class="modal-close" @click="$emit('fermer')" aria-label="Fermer"><i class="ti ti-x"></i></button>
      </div>

      <div v-if="chargement" class="modal-body"><p class="empty">Chargement…</p></div>

      <div v-else-if="profil" class="modal-body">
        <!-- Photo -->
        <div class="profil-photo-ligne">
          <span class="profil-avatar">
            <img v-if="profil.photo_url" class="avatar-photo" :src="urlApi(profil.photo_url)" alt="" />
            <template v-else>{{ initiales }}</template>
          </span>
          <div class="profil-photo-actions">
            <label class="btn btn-sm" :class="{ 'est-occupe': envoiPhoto }">
              <i class="ti ti-camera"></i> {{ profil.photo_url ? 'Changer la photo' : 'Ajouter une photo' }}
              <input type="file" accept="image/*" class="input-cache" :disabled="envoiPhoto" @change="choisirPhoto" />
            </label>
            <button v-if="profil.photo_url" type="button" class="btn btn-sm btn-ghost" :disabled="envoiPhoto" @click="retirerPhoto">
              Retirer
            </button>
          </div>
        </div>

        <div class="deux-colonnes">
          <div class="field">
            <label for="profil-prenom">Prénom</label>
            <input id="profil-prenom" v-model="form.prenom" autocomplete="given-name" maxlength="60" />
          </div>
          <div class="field">
            <label for="profil-nom">Nom</label>
            <input id="profil-nom" v-model="form.nom_de_famille" autocomplete="family-name" maxlength="60" />
          </div>
        </div>

        <div class="field">
          <label for="profil-email">Email</label>
          <input id="profil-email" v-model="form.email" type="email" autocomplete="email" />
          <span v-if="profil.identifiant_court" class="aide">
            Vous vous connectez avec <b>{{ profil.identifiant_court }}</b>. Remplacez cette adresse par votre email :
            il deviendra votre identifiant et vous permettra de récupérer votre mot de passe.
          </span>
          <template v-else>
            <span class="aide">C'est aussi votre identifiant de connexion.</span>
            <span v-if="emailsActifs && profil.email_verifie" class="etat-email ok"><i class="ti ti-circle-check"></i> Adresse confirmée</span>
            <span v-else-if="emailsActifs" class="etat-email">
              <i class="ti ti-alert-circle"></i> Adresse non confirmée : elle doit l'être pour récupérer votre mot de passe.
              <button type="button" class="lien" :disabled="envoiLien" @click="envoyerLien">Envoyer le lien de confirmation</button>
            </span>
          </template>
        </div>

        <div class="deux-colonnes">
          <div class="field">
            <label for="profil-tel">Téléphone</label>
            <input id="profil-tel" v-model="form.telephone" type="tel" autocomplete="tel" placeholder="06 12 34 56 78" />
          </div>
          <div class="field">
            <label for="profil-naissance">Date de naissance</label>
            <input id="profil-naissance" v-model="form.date_naissance" type="date" :max="aujourdhui" />
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

        <template v-if="profil.role === 'athlete'">
          <div class="field">
            <label for="profil-sports">Sports pratiqués (en plus de la muscu)</label>
            <input id="profil-sports" v-model="form.sports" maxlength="200" placeholder="Ex : rugby, natation" />
          </div>
          <div class="field">
            <label for="profil-objectif">Objectif sportif</label>
            <textarea id="profil-objectif" v-model="form.objectif_sportif" maxlength="500" rows="2" placeholder="Ex : préparer un semi-marathon"></textarea>
          </div>
        </template>

        <p v-if="erreur" class="error" role="alert">{{ erreur }}</p>
        <p v-if="succes" class="success">{{ succes }}</p>

        <!-- Rejoindre un club ou un coach -->
        <div class="profil-codes">
          <div v-if="profil.code_coach" class="code-coach">
            <span class="code-titre">Votre code coach</span>
            <span class="code-valeur">{{ profil.code_coach }}</span>
            <span class="aide">Donnez-le à vos athlètes : ils vous rejoignent en le saisissant dans leur profil ou à leur inscription.</span>
          </div>
          <span v-if="profil.organisation" class="aide">Club : <b>{{ profil.organisation.nom }}</b></span>
          <form v-if="peutSaisirCode" class="code-saisie" @submit.prevent="saisirCode">
            <label for="profil-code">{{ libelleCode }}</label>
            <div class="code-ligne">
              <input id="profil-code" v-model="code" autocapitalize="characters" autocomplete="off" placeholder="Ex : K7P4QX9M" />
              <button class="btn btn-sm" type="submit" :disabled="!code.trim() || envoiCode">Valider</button>
            </div>
          </form>
        </div>
        <button type="button" class="lien-politique" @click="politiqueOuverte = true">Politique de confidentialité</button>
      </div>

      <div class="modal-footer">
        <button class="btn" @click="$emit('fermer')">Fermer</button>
        <button class="btn btn-primary" :disabled="!profil || envoi" @click="enregistrer">
          <i class="ti ti-check"></i> Enregistrer
        </button>
      </div>
    </div>
    <PolitiqueConfidentialite v-if="politiqueOuverte" @fermer="politiqueOuverte = false" />
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { useApi, urlApi } from '../services/api'
import PolitiqueConfidentialite from './PolitiqueConfidentialite.vue'

const SEXES = [
  { valeur: 'homme', label: 'Homme' },
  { valeur: 'femme', label: 'Femme' },
  { valeur: null, label: 'Non précisé' }
]

// Photo recadrée au carré et réduite sur le téléphone avant l'envoi : une
// photo d'appareil fait plusieurs Mo, l'avatar n'en a besoin que de ~40 Ko.
const COTE_PHOTO = 400
const preparerPhoto = (fichier) => new Promise((resolve, reject) => {
  const url = URL.createObjectURL(fichier)
  const image = new Image()
  image.onload = () => {
    const cote = Math.min(image.naturalWidth, image.naturalHeight)
    const canvas = document.createElement('canvas')
    canvas.width = COTE_PHOTO
    canvas.height = COTE_PHOTO
    canvas.getContext('2d').drawImage(
      image,
      (image.naturalWidth - cote) / 2, (image.naturalHeight - cote) / 2, cote, cote,
      0, 0, COTE_PHOTO, COTE_PHOTO
    )
    URL.revokeObjectURL(url)
    resolve(canvas.toDataURL('image/jpeg', 0.85))
  }
  image.onerror = () => {
    URL.revokeObjectURL(url)
    reject(new Error("Cette image n'a pas pu être lue"))
  }
  image.src = url
})

const pad2 = (n) => String(n).padStart(2, '0')

export default {
  components: { PolitiqueConfidentialite },
  emits: ['fermer', 'modifie'],
  setup(_, { emit }) {
    const api = useApi()
    const profil = ref(null)
    const form = ref({})
    const chargement = ref(true)
    const envoi = ref(false)
    const envoiPhoto = ref(false)
    const envoiCode = ref(false)
    const erreur = ref('')
    const succes = ref('')
    const code = ref('')
    const politiqueOuverte = ref(false)
    const emailsActifs = ref(false)
    const envoiLien = ref(false)
    const now = new Date()
    const aujourdhui = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`

    // Les anciens comptes n'ont qu'un nom affiché (« Léa Martin ») : le
    // formulaire part de ce nom découpé, que la personne corrige au besoin.
    const remplirFormulaire = (p) => {
      const [premier, ...reste] = (p.nom || '').split(' ')
      form.value = {
        prenom: p.prenom ?? premier ?? '',
        nom_de_famille: p.nom_de_famille ?? reste.join(' '),
        email: p.email,
        telephone: p.telephone ?? '',
        date_naissance: p.date_naissance ?? '',
        sexe: p.sexe ?? null,
        sports: p.sports ?? '',
        objectif_sportif: p.objectif_sportif ?? ''
      }
    }

    const appliquer = (p) => {
      profil.value = p
      remplirFormulaire(p)
      emit('modifie')
    }

    onMounted(async () => {
      api.get('/auth/options').then(o => { emailsActifs.value = o.emails_actifs === true }).catch(() => {})
      try {
        profil.value = await api.get('/users/me/profil')
        remplirFormulaire(profil.value)
      } catch (e) {
        erreur.value = e.message || 'Impossible de charger le profil'
      } finally {
        chargement.value = false
      }
    })

    const initiales = computed(() =>
      (profil.value?.nom || '').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    )

    const peutSaisirCode = computed(() => {
      const p = profil.value
      if (!p) return false
      // Athlète : un club (s'il n'en a pas) ou un coach, toujours possible.
      if (p.role === 'athlete') return true
      // Préparateur : rejoindre un club, s'il n'en a pas encore.
      return p.role === 'prepa' && !p.organisation
    })
    const libelleCode = computed(() =>
      profil.value?.role === 'athlete' ? 'Rejoindre un club ou un coach (code)' : 'Rejoindre un club (code préparateurs)'
    )

    const executer = async (drapeau, action) => {
      erreur.value = ''
      succes.value = ''
      drapeau.value = true
      try {
        await action()
      } catch (e) {
        erreur.value = e.message || 'Une erreur est survenue'
      } finally {
        drapeau.value = false
      }
    }

    const enregistrer = () => executer(envoi, async () => {
      if (!form.value.prenom.trim() || !form.value.nom_de_famille.trim()) {
        throw new Error('Prénom et nom sont obligatoires')
      }
      const corps = {
        prenom: form.value.prenom,
        nom_de_famille: form.value.nom_de_famille,
        telephone: form.value.telephone || null,
        date_naissance: form.value.date_naissance || null,
        sexe: form.value.sexe,
        sports: form.value.sports || null,
        objectif_sportif: form.value.objectif_sportif || null
      }
      const email = form.value.email.trim()
      if (email && email.toLowerCase() !== profil.value.email.toLowerCase()) corps.email = email
      appliquer(await api.patch('/users/me/profil', corps))
      succes.value = !corps.email
        ? 'Profil enregistré.'
        : emailsActifs.value
          ? 'Profil enregistré. Connectez-vous désormais avec votre nouvel email : un lien pour le confirmer vient de vous y être envoyé.'
          : 'Profil enregistré. Connectez-vous désormais avec votre nouvel email.'
    })

    const envoyerLien = () => executer(envoiLien, async () => {
      succes.value = (await api.post('/users/me/verification-email')).message
    })

    const choisirPhoto = (event) => {
      const fichier = event.target.files?.[0]
      event.target.value = ''
      if (!fichier) return
      return executer(envoiPhoto, async () => {
        const image = await preparerPhoto(fichier)
        appliquer(await api.put('/users/me/photo', { image }))
      })
    }

    const retirerPhoto = () => executer(envoiPhoto, async () => {
      appliquer(await api.del('/users/me/photo'))
    })

    const saisirCode = () => executer(envoiCode, async () => {
      const resultat = await api.post('/users/me/code', { code: code.value })
      appliquer(resultat.profil)
      code.value = ''
      succes.value = resultat.message
    })

    return {
      SEXES, urlApi, profil, form, chargement, envoi, envoiPhoto, envoiCode, erreur, succes, code, aujourdhui,
      initiales, peutSaisirCode, libelleCode, enregistrer, choisirPhoto, retirerPhoto, saisirCode, politiqueOuverte,
      emailsActifs, envoiLien, envoyerLien
    }
  }
}
</script>

<style scoped>
.modal-profil { max-width: 560px; }
.profil-photo-ligne { display: flex; align-items: center; gap: var(--spacing-lg); }
.profil-avatar {
  width: 88px;
  height: 88px;
  flex-shrink: 0;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: var(--color-primary-light);
  color: var(--color-primary-text);
  font-size: 28px;
  font-weight: 700;
}
.profil-photo-actions { display: flex; flex-wrap: wrap; gap: var(--spacing-sm); }
.input-cache { display: none; }
.est-occupe { opacity: 0.6; pointer-events: none; }
.deux-colonnes { display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-md); }
@media (max-width: 480px) { .deux-colonnes { grid-template-columns: 1fr; } }
.aide { font-size: var(--font-size-xs); color: var(--color-text-secondary); }
.etat-email { font-size: var(--font-size-xs); color: var(--color-text-secondary); }
.etat-email.ok { color: var(--color-valid-text-strong); }
.etat-email .lien { font-size: inherit; display: block; margin-top: 2px; }
.lien-politique { align-self: flex-start; background: none; border: none; padding: 0; font-size: var(--font-size-xs); color: var(--color-text-secondary); text-decoration: underline; cursor: pointer; }
.field textarea {
  padding: var(--spacing-sm) var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--font-size-base);
  background: var(--color-bg);
  resize: vertical;
}
.choix-ligne { display: flex; gap: var(--spacing-sm); flex-wrap: wrap; }
.choix {
  min-height: var(--tap-min);
  padding: 0 var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg);
  cursor: pointer;
}
.choix.actif { border-color: var(--color-primary); background: var(--color-primary-light); color: var(--color-primary-text); font-weight: 600; }
.profil-codes {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  padding-top: var(--spacing-md);
  border-top: 1px solid var(--color-border);
}
.code-coach { display: flex; flex-direction: column; gap: 2px; }
.code-titre { font-size: var(--font-size-sm); font-weight: 600; color: var(--color-text-body); }
.code-valeur { font-size: var(--font-size-lg); font-weight: 800; letter-spacing: 2px; color: var(--color-primary-text); font-variant-numeric: tabular-nums; }
.code-saisie { display: flex; flex-direction: column; gap: 6px; }
.code-saisie label { font-size: var(--font-size-sm); font-weight: 500; color: var(--color-text-body); }
.code-ligne { display: flex; gap: var(--spacing-sm); }
.code-ligne input {
  flex: 1;
  min-width: 0;
  min-height: var(--tap-min);
  padding: 0 var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg);
  text-transform: uppercase;
  letter-spacing: 1px;
}
.success { color: var(--color-valid-text-strong); font-size: var(--font-size-sm); margin: 0; }
</style>
