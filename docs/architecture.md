# Architecture

Ce document explique **pourquoi** le code est organisé ainsi. Le « quoi » se lit dans l'arborescence ;
ce qui suit est ce qu'on ne peut pas deviner en la lisant.

---

## 1. La décision centrale : la lecture est locale

À la connexion, l'intégralité des Memories, Tags et DateTags de l'utilisateur est synchronisée via
`onSnapshot` dans un store normalisé en mémoire, adossé au cache IndexedDB de Firestore. **Toutes**
les lectures — accueil, recherche, calendrier, mode swipe, filtres — sont des sélecteurs purs sur ce
store. Les écritures passent par les repositories vers Firestore, qui les applique immédiatement au
cache local : l'UI optimiste et le mode hors-ligne en découlent gratuitement.

Ce n'est pas un raccourci, c'est une contrainte de Firestore :

| Besoin de l'application                | Côté serveur Firestore                                                              | Côté client                         |
| -------------------------------------- | ----------------------------------------------------------------------------------- | ----------------------------------- |
| Recherche plein texte                  | **Impossible** nativement — nécessite Algolia ou Typesense                          | MiniSearch, flou + préfixe          |
| Filtrer sur plusieurs tags en ET       | `array-contains-any` est un OU, limité à 30 valeurs, un seul filtre tableau/requête | trivial                             |
| Croiser texte + tags + dates + période | Explosion d'index composites, certaines combinaisons restent impossibles            | trivial                             |
| Tirage aléatoire                       | Nécessite un champ `random` et des requêtes bricolées                               | trivial                             |
| Latence                                | Un aller-retour réseau par changement de filtre                                     | 0 ms                                |
| Coût                                   | Relecture facturée à chaque requête                                                 | 1 lecture initiale, puis les deltas |

### Le garde-fou

Cette approche tient jusqu'à ~20 000–50 000 Memories (une Memory pèse 200 à 500 octets ; 50 000
représentent 10 à 25 Mo en mémoire, index de recherche compris). Au-delà, la porte de sortie est déjà
posée : les repositories sont derrière des interfaces (`src/domain/repositories/`), ce qui permet de
basculer sur une synchronisation fenêtrée (`where('updatedAt', '>', lastSync)` plus pagination de
l'historique) **sans toucher aux écrans**.

C'est aussi pourquoi `firestore.indexes.json` est vide : l'application n'envoie que des listeners de
collection non filtrés. Un index composite qui apparaîtrait dans ce fichier signalerait une dérive
par rapport à cette conception.

---

## 2. Les couches

```
pages / features  →  store · search · ui · hooks
store · search    →  infrastructure · domain
infrastructure    →  domain
domain            →  (rien)
ui                →  (rien d'autre que lui-même)
```

- **`domain/`** — modèles, schémas Zod, interfaces de repositories et logique métier pure. Aucun
  React, aucun Firebase, aucun store. C'est ce qui rend la logique testable sans émulateur et
  portable si le backend change.
- **`infrastructure/`** — les adaptateurs qui implémentent les interfaces du domaine avec Firebase.
  Ignorent tout de React et de l'UI.
- **`store/` et `search/`** — le modèle de lecture. Consomment l'infrastructure, ne remontent jamais
  vers les vues.
- **`features/` et `pages/`** — les vues. Elles ne parlent jamais à Firestore directement : toute
  écriture passe par une action du store.
- **`ui/`** — le design system. Piloté uniquement par props, réutilisable hors de ce projet.
- **`app/`** — la racine de composition, seule couche autorisée à tout câbler ensemble.

La règle est appliquée par `no-restricted-imports` dans `.oxlintrc.json`, avec un message
d'erreur explicite par frontière. Une règle documentée mais non vérifiée se dégrade en quelques
semaines.

---

## 3. Modèle de données

```
users/{uid}                        UserProfile
users/{uid}/memories/{memoryId}    Memory
users/{uid}/tags/{tagId}           Tag
users/{uid}/dateTags/{dateTagId}   DateTag
```

Le choix des sous-collections plutôt que de collections racine avec un champ `ownerId` donne une
isolation par utilisateur native et des règles de sécurité auditables en une lecture.

### Décisions de modélisation

**`DateTag.date` est une chaîne `YYYY-MM-DD`, pas un `Timestamp`.** Un DateTag désigne une date
civile (« 12 mars 2024 »), pas un instant. Stocké en `Timestamp`, il change de jour selon le fuseau
de lecture — un bug silencieux et pénible dans une application dont la promesse est de retrouver
des souvenirs datés.

**Pas de compteur `memoryCount` dénormalisé sur les Tags.** Impossible à garder cohérent sans
transactions ou Cloud Functions, et inutile ici : puisque tout est en mémoire, le comptage est un
sélecteur.

**`deletedAt` plutôt qu'une suppression sèche.** Le mode swipe propose de supprimer ; sur une base
de connaissances personnelle, ce geste doit être réversible. La suppression définitive n'existe qu'au
vidage de la corbeille.

**`lastReviewedAt` et `reviewCount` dès la v1.** Ils alimentent le tirage pondéré : une Memory jamais
revue remonte en priorité dans le mode swipe et sur l'accueil. Un tirage purement aléatoire répète
et laisse des angles morts.

### Extensibilité

Les évolutions prévues — favoris, archivage, pièces jointes, liens, collections, rappels, embeddings,
partage — sont toutes des **champs optionnels additifs**. Les schémas Zod utilisent `.optional()` et
`.default()`, donc un document existant reste valide sans migration. `schemaVersion` couvre le cas
où une vraie migration deviendrait nécessaire.

---

## 4. Sécurité

`firestore.rules` porte deux garanties, dans cet ordre :

1. **Isolation.** Tout vit sous `/users/{uid}` : aucune collection partagée d'où fuiter.
2. **Forme.** Le client n'est pas un endroit de confiance pour valider un schéma. Un document qui ne
   correspond pas au modèle est refusé côté serveur, avec des listes de clés exactes, des types, des
   bornes de taille et un format de date vérifié par regex. `createdAt` est immuable après création.

Ces garanties sont couvertes par 25 tests exécutés contre l'émulateur (`npm run test:rules`) — la
seule manière de savoir qu'une règle de sécurité fait ce qu'on croit.

---

## 5. Deux détails qui coûtent cher si on les rate

**Le `<dialog>` natif plutôt qu'une modale maison.** `showModal()` apporte le piège de focus, la
restauration du focus à la fermeture, la touche Échap, le _top layer_ et l'inertie de l'arrière-plan.
Réimplémenter tout cela est l'endroit exact où les design systems maison abandonnent les utilisateurs
au clavier. Seule l'animation de sortie reste à notre charge — et un délai de secours ferme le
dialogue même si l'animation ne se termine jamais, parce qu'une modale bloquée ouverte retient le
focus.

**Le surlignage doit tolérer les mêmes approximations que la recherche.** `normalizeText` décompose
en NFD, ce qui change la longueur de la chaîne : un décalage calculé dessus découperait le texte
d'origine au mauvais endroit. `lib/highlight.ts` replie donc caractère par caractère pour conserver
une correspondance d'index exacte. Sans cela, chercher `cafe` renverrait bien la mémoire contenant
`café`, mais sans rien surligner — ce qui se lit comme un bug.

---

## 6. Choix de bibliothèques

| Bibliothèque                  | Pourquoi                                                                                                                                             |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Zustand**                   | Store normalisé alimenté par les listeners. TanStack Query a été écarté : avec `onSnapshot` comme source de vérité, son cache ferait doublon.        |
| **Zod**                       | Firestore est schemaless. Validation à la frontière (converters), des formulaires et des variables d'environnement.                                  |
| **MiniSearch**                | ~10 ko, recherche floue, préfixes et champs pondérés. C'est le cœur de la promesse « retrouver une info ancienne ».                                  |
| **date-fns**                  | Tree-shakable, locale française, API de fonctions pures.                                                                                             |
| **motion**                    | Gestes de swipe (drag + vélocité) et transitions. L'écrire à la main coûterait plus cher que la dépendance.                                          |
| **SCSS Modules**              | Design system maison, styles scopés, tokens partagés en variables CSS pour le thème clair/sombre.                                                    |
| _(pas de lib de formulaires)_ | Les formulaires de l'application sont minuscules : un textarea, un titre + couleur, une date + label. Composants contrôlés et schémas Zod suffisent. |
