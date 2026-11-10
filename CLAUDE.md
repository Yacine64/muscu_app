# Muscu – app de musculation perso

PWA personnelle (un seul utilisateur, sans compte ni serveur) pour suivre ses entraînements de musculation sur Android, hors ligne. Interface en français, mobile d'abord, thème sombre, lisible en salle (gros boutons, gros chiffres, pavé numérique).

Le cahier des charges complet a été fourni par l'utilisateur (Yacine) ; ce fichier en est le résumé de travail.

## Stack

- TypeScript, React + Vite
- vite-plugin-pwa (service worker, manifest) — tout doit marcher hors ligne après le premier chargement
- IndexedDB via Dexie.js (à partir de l'étape 2), schéma versionné
- Recharts (étape 5)
- Tailwind CSS v4 (plugin `@tailwindcss/vite`, import dans `src/index.css`)
- React Router en mode hash (`HashRouter`), compatible GitHub Pages
- Vitest pour la logique (calculs, base de données, export/import)
- GitHub Pages, déployé par GitHub Actions (`.github/workflows/deploy.yml`) à chaque push sur `main`

Pas de backend, pas de donnée envoyée sur Internet. **Aucune bibliothèque en plus de cette liste sans l'accord de l'utilisateur.**

## Commandes

```bash
npm install        # installer les dépendances
npm run dev        # serveur de dev (http://localhost:5173)
npm run build      # vérification TypeScript + build de production dans dist/
npm run preview    # servir le build (le service worker n'est actif qu'ici, pas en dev)
npm test           # tests Vitest (une fois)
npm run test:watch # tests en continu
npm run lint       # oxlint
```

`BASE_PATH` (ex. `/muscu_app/`) fixe le chemin de base du build ; le workflow le règle sur le nom du dépôt. Par défaut `/`.

## Organisation

- `src/App.tsx` : routes ; `src/components/BottomNav.tsx` : barre à 5 onglets
- `src/pages/` : Accueil, Séance, Programmes, Exercices, Progrès, Réglages (icône en haut de l'accueil)
- `src/data/exercises.json` : 21 exercices pré-chargés (étape 2)
- `public/` : icônes PWA, générées depuis `icon-source/icon.svg` avec `rsvg-convert`

## Fonctionnalités V1 (6 modules + réglages)

1. **Banque d'exercices** : liste pré-chargée, recherche insensible aux accents/casse, filtres combinables muscle (principal ou secondaire) + matériel, ajout/modif/suppression (archivage si déjà dans l'historique), champs optionnels consignes et média, import JSON.
2. **Séances et programmes** : séance modèle = liste ordonnée d'exercices (séries, fourchette de reps, repos) ; programme = ensemble de séances (A, B, C pré-chargées) ; tout modifiable, réordonnable, duplicable.
3. **Séance en cours** : depuis un modèle ou libre ; charge + reps par série ; valeurs précédentes affichées et pré-remplies ; suggestion d'augmentation si toutes les séries ont atteint le haut de la fourchette (+2,5 kg barre/machine, +1 kg haltères) ; ajout/retrait de série, remplacement d'exercice ; note ; sauvegarde continue.
4. **Minuteur de repos** : auto à la validation d'une série ; +15 s / −15 s / passer ; vibration + son (+ notification si possible) ; Wake Lock pendant la séance.
5. **Historique et progression** : séances passées ; par exercice : charge max, volume, record ; graphiques poids et mensurations ; résumé de la semaine.
6. **Corps et mensurations** : poids daté + moyenne 7 jours ; mensurations (taille, poitrine, bras, cuisse, hanches ; liste modifiable).
- **Réglages** : export/import JSON (toutes les tables + version du schéma + date) ; rappel si dernière sauvegarde > 14 jours ; repos par défaut ; pas d'augmentation ; `navigator.storage.persist()`.

Unités : kg et cm. Ids : UUID. Dates : ISO.

## Modèle de données (Dexie, 7 tables)

`exercises`, `programs`, `templates` (WorkoutTemplate), `sessions` (WorkoutSession, `endedAt` vide = en cours), `bodyWeights`, `measurements`, `settings` (ligne unique `id: 'settings'`). Les interfaces TypeScript exactes sont dans le cahier des charges (section « Modèle de données ») ; `isTimed` sur un exercice de séance = durée au lieu de reps (gainage).

## Décisions de l'utilisateur (précisions au cahier des charges)

- **Matériel multiple** (ex. « Barre ou machine », « Machine ou haltères ») : le matériel est choisi pendant la séance, **machine par défaut** si elle fait partie des choix. Il faut donc enregistrer le matériel utilisé dans chaque entrée de séance (`entries[].equipment`). La suggestion d'augmentation suit le matériel choisi (+2,5 kg machine/barre, +1 kg haltères). **Valeurs précédentes, historique, graphiques et records sont séparés par couple exercice + matériel.**
- **Séance C** : un seul exercice « Dips assistés » ; les pompes sont un remplacement possible pendant la séance.
- **Exercices chronométrés** (`isTimed`, ex. gainage 3×30–45 s) : `repsMin`/`repsMax` contiennent la fourchette en secondes. Si toutes les séries ont atteint le haut de la fourchette la fois précédente, suggérer **+5 s**.

## Hors V1 (à ne pas développer, mais ne pas bloquer)

Médias des exercices, import d'une base externe (dédoublonnage par nom), alimentation/déficit calorique (nouvelle version du schéma Dexie), suivi des courses (séance « cardio » durée + distance).

## Plan de développement

1. ✅ **Socle** : Vite + React + TS + Tailwind, PWA installable, déploiement GitHub Pages, 5 onglets vides.
2. **Données et banque d'exercices** — fini quand « Dos + Poulie » affiche les 2 tirages verticaux et le rowing assis, et qu'un exercice ajouté reste après redémarrage.
3. **Programmes** — fini quand on peut modifier la Séance A (ajouter, réordonner, supprimer) et retrouver les changements.
4. **Séance en cours et minuteur** — fini quand une séance complète se fait sans connexion et reprend après fermeture.
5. **Progression et corps** — fini quand, après 3 séances, le graphique d'un exercice montre 3 points corrects.
6. **Sauvegarde** — fini quand un export importé sur un autre navigateur restitue tout à l'identique.

## Règles de travail

- Une étape à la fois. À la fin : `npm test` et `npm run build` passent, commit, puis expliquer à l'utilisateur (débutant) comment tester sur son téléphone, en français simple.
- Tests Vitest obligatoires pour : suggestion d'augmentation de charge, moyenne 7 jours, export/import.
- En cas d'ambiguïté dans le cahier des charges : poser la question plutôt que deviner.
