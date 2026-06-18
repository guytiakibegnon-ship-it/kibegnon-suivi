# Suivi d'équipe — Entreprise Kibegnon SARL

Application interne de **suivi des tâches**, **pointage du temps** (style Clockify) et **messagerie d'équipe** (style Notion), construite pour l'agence immobilière Kibegnon (Cocody, Abidjan).

**Stack :** React + Vite · Supabase (Auth + Postgres + RLS + Realtime) · Vercel · Tailwind CSS

---

## 1. Aperçu des fonctionnalités

- **Connexion individuelle** par identifiant + mot de passe (chaque membre a son compte).
- **Tableau de bord** : vue d'ensemble des tâches et du temps.
- **Planning hebdomadaire** par membre (lundi → samedi).
- **Tâches** en kanban (À faire · En cours · En revue · Terminé), avec département + urgence.
- **Suivi du temps** : chronomètre en direct + saisie manuelle, synchronisé en temps réel.
- **Messagerie** : canal Général, conversations privées 1-à-1, et **partage de tâches** dans le chat.
- **Supervision** (gérante / responsable admin) : suivi des tâches et du temps de toute l'équipe, graphiques.
- **Administration** (Guy ESDIN) : création / modification / suppression des comptes, réinitialisation de mot de passe, gestion des départements.

Les rôles disponibles : `admin`, `gerante`, `responsable_admin`, `comptable`, `juriste`, `agent`.
La supervision est ouverte à `admin`, `gerante`, `responsable_admin`.

---

## 2. Prérequis

- Un compte **Supabase** (gratuit) → https://supabase.com
- Un compte **Vercel** (gratuit) → https://vercel.com
- Un compte **GitHub**
- **Node.js 18+** et la **CLI Supabase** en local (pour la fonction Edge) → https://supabase.com/docs/guides/cli

---

## 3. Créer le projet Supabase

1. Sur https://supabase.com → **New project**. Notez le mot de passe de la base.
2. Dans **Project Settings → API**, récupérez :
   - **Project URL** (ex. `https://xxxx.supabase.co`)
   - **anon public** key
   - **service_role** key (secrète — ne jamais la mettre côté client)

### 3.1 Créer la base de données

Dans **SQL Editor → New query**, collez tout le contenu de [`supabase/schema.sql`](supabase/schema.sql) puis **Run**.

Cela crée toutes les tables, les départements par défaut, les règles de sécurité (RLS), le canal Général et la synchronisation temps réel.

---

## 4. Déployer la fonction d'administration (création de comptes)

La création des comptes utilisateurs se fait via une **Edge Function** sécurisée (seul un admin peut l'appeler). Depuis le dossier du projet :

```bash
# Connexion à votre projet (project-ref = l'identifiant dans l'URL Supabase)
supabase login
supabase link --project-ref VOTRE_PROJECT_REF

# Déployer la fonction
supabase functions deploy admin-users --no-verify-jwt

# Fournir la clé service_role à la fonction (secret serveur)
supabase secrets set SERVICE_ROLE_KEY=VOTRE_SERVICE_ROLE_KEY
```

> La clé `service_role` reste **uniquement** côté serveur (secret de la fonction). Elle n'apparaît jamais dans le code de l'application.

---

## 5. Créer le premier administrateur (Guy ESDIN)

Comme il n'existe encore aucun admin pour créer des comptes, on amorce le premier à la main :

1. Supabase → **Authentication → Users → Add user**
   - **Email** : `admin@kibegnon.local`
   - **Password** : choisissez un mot de passe solide
   - Cochez **Auto Confirm User** (pas d'email de confirmation).
2. Supabase → **SQL Editor**, exécutez :

```sql
update public.profiles
set role = 'admin',
    full_name = 'Guy ESDIN',
    username = 'admin'
where id = (select id from auth.users where email = 'admin@kibegnon.local');
```

Vous pourrez ensuite vous connecter avec l'identifiant **`admin`** et créer tous les autres comptes depuis l'onglet **Administration** de l'application.

> **Note sur les identifiants :** l'app transforme l'identifiant saisi en e-mail interne `identifiant@kibegnon.local` pour Supabase Auth. Les membres ne tapent donc qu'un **identifiant** (ex. `gestion`), pas une adresse e-mail.

---

## 6. Lancer en local (optionnel)

```bash
cp .env.example .env
# éditez .env avec VOTRE_PROJET et votre anon key
npm install
npm run dev
```

Ouvre http://localhost:5173

---

## 7. Déployer sur Vercel

1. Poussez le projet sur GitHub :

```bash
git init
git add .
git commit -m "Suivi d'équipe Kibegnon"
git branch -M main
git remote add origin https://github.com/VOTRE_COMPTE/kibegnon-suivi.git
git push -u origin main
```

2. Sur https://vercel.com → **Add New → Project** → importez le dépôt GitHub.
3. Vercel détecte Vite automatiquement (build `npm run build`, sortie `dist`).
4. Dans **Settings → Environment Variables**, ajoutez :
   - `VITE_SUPABASE_URL` = votre Project URL
   - `VITE_SUPABASE_ANON_KEY` = votre anon key
5. **Deploy**.

> Après chaque `git push`, Vercel redéploie automatiquement.

---

## 8. Structure du projet

```
kibegnon-suivi/
├── public/
│   ├── logo.png            # logo Kibegnon (en-tête + connexion)
│   └── favicon.png
├── src/
│   ├── main.jsx            # point d'entrée
│   ├── App.jsx             # interface complète (vues, modales, espace de travail)
│   ├── Login.jsx           # page de connexion
│   ├── store.js            # chargement données + Realtime + actions (hook useStore)
│   ├── supabaseClient.js   # client Supabase
│   ├── constants.js        # rôles, urgences, statuts, palette
│   ├── helpers.js          # dates, durées, formatage FR
│   └── index.css           # Tailwind + variables de marque
├── supabase/
│   ├── schema.sql          # base de données complète (à exécuter dans Supabase)
│   └── functions/
│       └── admin-users/
│           └── index.ts    # Edge Function : créer/supprimer/réinitialiser comptes
├── .env.example
├── package.json
├── tailwind.config.js
├── vite.config.js
└── vercel.json
```

---

## 9. Charte graphique (logo Kibegnon)

| Usage | Couleur |
|---|---|
| Marque / actions principales | `#D81F26` (rouge) |
| Chronomètre / temps / succès | `#4F9E2A` (vert) |
| Information | `#2E78A8` (bleu) |
| Barre supérieure / texte | `#1A1C20` (noir) |

---

## 10. Sécurité

- Toutes les tables sont protégées par **Row Level Security** : chacun ne voit que ce qu'il a le droit de voir (ses messages, ses temps ; les superviseurs voient l'équipe).
- La clé `service_role` n'est **jamais** exposée côté navigateur — seule la fonction Edge l'utilise.
- La synchronisation temps réel (Realtime) respecte aussi les règles RLS de chaque utilisateur.
"# kibegnon-suivi" 
