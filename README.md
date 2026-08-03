# Me'Mories

Notez en quelques secondes ce que vous voulez retenir — une anecdote, une idée, une citation, un fait —
et retrouvez-le des semaines ou des années plus tard.

L'application est construite autour de deux exigences qui se répondent : la **création doit être
quasi instantanée** (on n'organise rien au moment de la saisie), donc tout le poids retombe sur la
**recherche** et la **redécouverte**.

---

## Démarrage rapide

Prérequis : Node.js ≥ 20 et un JDK ≥ 11 (l'émulateur Firestore tourne sur la JVM).

```bash
npm install
```

```bash
npm run dev:emulators
```

L'application démarre sur http://localhost:5173 et parle aux émulateurs Firebase locaux
(interface d'administration sur http://localhost:4000). Aucun projet Firebase réel n'est nécessaire :
`.env` utilise l'identifiant de projet `demo-me-mories`, que le SDK Firebase reconnaît comme un
projet de démonstration et qui refuse toute connexion à un backend réel.

Pour lancer les deux séparément :

```bash
npm run emulators
```

```bash
npm run dev
```

### Brancher un vrai projet Firebase

1. Créez un projet dans la [console Firebase](https://console.firebase.google.com/), ajoutez-y une
   application Web, et activez **Authentication** (e-mail/mot de passe et Google).
2. Copiez `.env.example` vers `.env.local` et renseignez les valeurs de la configuration Web.
3. Laissez `VITE_USE_FIREBASE_EMULATORS=false`.

`.env.local` est ignoré par Git et prioritaire sur les valeurs de démo de `.env` : rien d'autre à
modifier. Au démarrage, la console affiche le projet réellement utilisé.

> **Attention à l'ordre de chargement de Vite.** Il va du plus fort au plus faible :
> `.env.[mode].local` › `.env.[mode]` › `.env.local` › `.env`. Un fichier de mode
> (`.env.development`, `.env.production`) **écrase** `.env.local` — c'est pourquoi les valeurs de
> démo vivent dans `.env` et non dans `.env.development`. `.env.test` fait exception volontairement :
> il est prioritaire pour garder la suite de tests loin de votre vrai projet.

Pour déployer les règles de sécurité :

```bash
npx firebase deploy --only firestore:rules --project <votre-projet>
```

---

## Scripts

| Commande                | Rôle                                                              |
| ----------------------- | ----------------------------------------------------------------- |
| `npm run dev`           | Serveur de développement Vite                                     |
| `npm run dev:emulators` | Émulateurs Firebase **et** serveur de développement, en parallèle |
| `npm run emulators`     | Émulateurs Auth + Firestore seuls                                 |
| `npm run build`         | Vérification de types puis build de production                    |
| `npm run preview`       | Sert le build de production localement                            |
| `npm run typecheck`     | `tsc -b` sur les trois projets TypeScript                         |
| `npm run lint`          | oxlint, dont les frontières d'architecture (voir plus bas)        |
| `npm run format`        | Prettier en écriture                                              |
| `npm test`              | Tests unitaires (domaine, hooks, composants)                      |
| `npm run test:rules`    | Tests des règles Firestore contre l'émulateur (voir avertissement) |
| `npm run verify`        | `typecheck` + `lint` + `test`                                     |

---

## Fonctionnalités

**Capture** — un overlay accessible partout (touche `n`), avec reconnaissance automatique de
`#tag` et `@2024-03-12` / `@hier` / `@12/03/2024` dans le texte. Brouillon sauvegardé à chaque
frappe, enregistrement par `Ctrl+↵`.

**Recherche** — plein texte tolérant aux fautes et aux accents manquants (`cafe` trouve `café`),
combinable avec des tags (ET ou OU), des dates, une période de création et un filtre « sans tag ».
Les critères vivent dans l'URL : rechargeable, partageable, compatible avec le bouton retour.

**Calendrier** — deux axes commutables : _date de création_ et _date évoquée_. Une anecdote de 1995
notée aujourd'hui apparaît en 1995 sur le second axe, ce qui est le seul classement utile pour la
retrouver.

**Relire** — les mémoires défilent une par une, dans un ordre pondéré par l'oubli : ce qui n'a jamais
été relu passe en premier. Édition, tags, dates et suppression sur place, au doigt ou au clavier.

**Accueil** — récentes, tirages aléatoires sur la semaine et sur les six derniers mois,
« il y a un an » et quelques statistiques.

**Le reste** — corbeille avec annulation immédiate, fusion et renommage de tags, export JSON et
Markdown, thème clair/sombre, installation en PWA et fonctionnement hors ligne.

### Raccourcis clavier

| Raccourci           | Action                                           |
| ------------------- | ------------------------------------------------ |
| `n`                 | Nouvelle mémoire                                 |
| `Ctrl/Cmd + K`      | Palette de commandes (chercher, naviguer, créer) |
| `Ctrl/Cmd + ↵`      | Enregistrer la mémoire en cours de saisie        |
| `←` `→`             | Mémoire suivante, en mode Relire                 |
| `E` · `T` · `Suppr` | Modifier · Tags · Supprimer, en mode Relire      |
| `Échap`             | Fermer la fenêtre courante                       |

> **Les tests de règles vident l'émulateur.** `@firebase/rules-unit-testing` appelle
> `clearFirestore()` avant chaque test, ce qui efface **toutes** les données du projet émulé.
> `npm run test:rules` démarre donc son propre émulateur et échoue si le port 8080 est déjà pris —
> ne contournez pas le script en lançant `vitest --project rules` à la main pendant qu'un émulateur
> de développement tourne, vous perdriez vos données de test.

---

## Organisation du code

```
src/
├── app/              Racine de composition : providers, router, layouts
├── domain/           Modèles, schémas Zod, interfaces de repositories, logique métier pure
├── infrastructure/   Adaptateurs Firebase (implémentations des repositories, auth)
├── store/            État normalisé (Zustand) alimenté par les listeners Firestore
├── search/           Index de recherche plein texte (MiniSearch)
├── features/         Une tranche par domaine fonctionnel (memories, tags, swipe…)
├── pages/            Une page par route
├── ui/               Design system SCSS maison, purement présentationnel
├── hooks/  lib/      Hooks et utilitaires génériques
├── config/           Variables d'environnement validées, libellés
└── styles/           Tokens, mixins, reset, styles globaux
```

### Règle de dépendance

```
pages / features  →  store · search · ui · hooks
store · search    →  infrastructure · domain
infrastructure    →  domain
domain            →  (rien)
ui                →  (rien d'autre que lui-même)
```

Elle n'est pas seulement documentée : elle est **imposée par le linter** via
`no-restricted-imports` dans `.oxlintrc.json`. Un import qui traverse une frontière échoue en CI
avec un message explicite. `src/app` est la seule exception — c'est la racine de composition, le
seul endroit autorisé à câbler toutes les couches entre elles.

---

## Choix structurants

Le détail et les justifications se trouvent dans [docs/architecture.md](docs/architecture.md).
En résumé :

- **Lecture locale.** Les collections de l'utilisateur sont synchronisées intégralement en mémoire,
  et toutes les lectures (accueil, recherche, calendrier, swipe) sont des sélecteurs purs. Firestore
  ne sait pas faire de recherche plein texte ni combiner plusieurs filtres tableau : côté client,
  c'est instantané et sans index composite.
- **Suppression douce.** Une Memory supprimée part en corbeille (`deletedAt`), jamais directement à
  la poubelle — swiper pour supprimer une base de connaissances doit être réversible.
- **DateTags en date civile.** Stockés en `YYYY-MM-DD`, jamais en `Timestamp` : un fuseau horaire ne
  doit pas pouvoir décaler un souvenir d'un jour.
- **Validation aux frontières.** Firestore est schemaless ; chaque document est validé par Zod à la
  lecture et par les règles de sécurité à l'écriture.

---

## Dépannage

**L'icône de l'application est floue une fois installée sur iOS.**
Le manifeste utilise le SVG `public/favicon.svg`, honoré par Chrome, Edge, Firefox et Android.
iOS ignore les icônes SVG : ajoutez un `public/apple-touch-icon.png` de 180 × 180 px et une balise
`<link rel="apple-touch-icon" href="/apple-touch-icon.png" />` dans `index.html`.

**L'émulateur Firestore refuse de démarrer avec `failed to create a child event loop`.**
Depuis le JDK 21 sous Windows, java.nio crée une socket AF_UNIX dans le dossier temporaire ; sur
certains profils (AzureAD, dossiers redirigés, chemins courts type `C:\Users\ANSGAR~1`) cette
connexion échoue. `npm run emulators` contourne le problème automatiquement via
`scripts/emulators.mjs`. Si votre machine refuse `C:\Windows\Temp`, pointez
`MEMORIES_JAVA_TMPDIR` sur un dossier temporaire accessible en écriture.
