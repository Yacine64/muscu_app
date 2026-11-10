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
- `src/pages/Exercices.tsx` (liste, filtres gardés dans l'URL), `ExerciceFiche.tsx`, `ExerciceForm.tsx`
- `src/pages/Programmes.tsx` (liste), `ProgrammeEdit.tsx` (`/programmes/:id`), `SeanceModele.tsx` (`/programmes/seance/:id`, enregistrement à chaque modification)
- `src/pages/Seance.tsx` (démarrage ou séance en cours), `SeanceEnCours.tsx` (saisie, sauvegarde continue, Wake Lock), `SeanceResume.tsx` (`/seance/resume/:id`) ; `Accueil.tsx` (prochaine séance, reprise, semaine)
- `src/pages/Progres.tsx` (`?vue=corps|exercices|historique` : poids + moyenne 7 j, mensurations, liste des exercices, historique) ; détail d'une séance passée = `SeanceResume` sur `/progres/seance/:id` (avec suppression) ; `components/TimeChart.tsx` (Recharts, axe X en dates réelles, un seul axe Y) ; `components/ExerciseProgress.tsx` (record, graphiques charge et volume, historique, par matériel) affiché dans la fiche exercice
- `src/lib/restTimer.ts` : minuteur global (heure de fin dans localStorage, vibration, bip WebAudio, notification si app en arrière-plan) ; `RestTimerBanner` au-dessus des onglets ; `useWakeLock.ts`
- `src/db/sessions.ts` : démarrer / terminer / abandonner une séance
- `src/components/ui.tsx` : Chip, Button, IconButton, Label, inputClass (gros éléments tactiles) ; `NumberField` (pavé numérique), `ExercisePicker` (choix dans la banque), `BackButton`
- `src/db/programs.ts` : opérations programmes/séances (actif unique, dupliquer, supprimer en retirant des programmes)
- `src/data/exercises.json` : 21 exercices pré-chargés (nom, muscles, matériel) ; `src/data/exerciseDetails.json` : leurs fiches (consignes, `warnings`, image, source), fournies par l'utilisateur, rapprochées par nom (`lib/exerciseDetails.ts`) ; images dans `public/media/exercises/` (free-exercise-db, Unlicense, réduites à 640 px, mises en cache hors ligne)
- `src/db/` : `types.ts` (modèle), `db.ts` (Dexie, schéma v3 + pré-chargement au `populate`), `seed.ts` (exercices, programme A/B/C, réglages par défaut), `useLiveQuery.ts` (hook maison, pas de dexie-react-hooks)
- `src/lib/` : logique pure et testée (`text`, `equipment`, `exerciseFilter`, `importExercises`, `programs`, `session`, `timer`, `progress`, `exerciseDetails`) ; tests dans `*.test.ts`
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

- **Suppression d'un exercice** : archivé (au lieu de supprimé) s'il apparaît dans l'historique **ou dans une séance modèle** ; un exercice archivé peut être désarchivé depuis sa fiche.
- **Programmes** : un seul programme actif. Supprimer un programme garde ses séances (« Séances hors programme ») ; supprimer une séance modèle la retire des programmes mais garde l'historique. Réordonner avec des boutons ↑ ↓ (pas de glisser-déposer, pour ne pas ajouter de bibliothèque).
- **Séance en cours** : `entries[].target` (fourchette, repos, isTimed) est copié depuis le modèle au démarrage ; `templateName` est gardé dans la séance. À la fin, seules les séries validées sont conservées. Valider une série recopie charge/reps dans les séries suivantes encore à 0 kg. Remplacer un exercice après des séries faites garde ces séries sur l'exercice d'origine. Changer de matériel re-remplit les séries non validées avec l'historique de ce matériel.
- **Poulie** : même pas d'augmentation que barre/machine (2,5 kg). Poids du corps : pas de charge suggérée, message « haut de fourchette atteint ».
- **Machine d'assistance** (`Exercise.assisted`, ex. dips assistés, migration Dexie v2) : moins de kg = plus dur. La suggestion retire de l'assistance (−2,5 kg machine) ; le record et le graphique retiennent l'assistance la plus faible ; pas de graphique de volume.
- **Poids et mensurations** : dates au format jour `AAAA-MM-JJ`. Moyenne 7 jours = pesées du jour et des 6 jours précédents (chaque pesée compte).
- **Fiche exercice** (migration Dexie v3) : `instructions` = texte, une étape par ligne (affiché en liste numérotée « Exécution ») ; `warnings: string[]` (« Points de vigilance ») ; `mediaSource` = crédit affiché sous l'image. Un `mediaUrl` sans `http` est un fichier de l'app, résolu avec `import.meta.env.BASE_URL`. La migration ne remplit que les champs vides des exercices non personnalisés. L'import JSON accepte `instructions` et `warnings` en liste ou en texte.
- **Recherche** : chaque mot tapé doit apparaître dans le nom, dans n'importe quel ordre (« tirage large »).

## Hors V1 (à ne pas développer, mais ne pas bloquer)

Import d'une base externe (dédoublonnage par nom), alimentation/déficit calorique (nouvelle version du schéma Dexie), suivi des courses (séance « cardio » durée + distance).

## Plan de développement

1. ✅ **Socle** : Vite + React + TS + Tailwind, PWA installable, déploiement GitHub Pages, 5 onglets vides.
2. ✅ **Données et banque d'exercices** — fini quand « Dos + Poulie » affiche les 2 tirages verticaux et le rowing assis, et qu'un exercice ajouté reste après redémarrage.
3. ✅ **Programmes** — fini quand on peut modifier la Séance A (ajouter, réordonner, supprimer) et retrouver les changements.
4. ✅ **Séance en cours et minuteur** — fini quand une séance complète se fait sans connexion et reprend après fermeture.
5. ✅ **Progression et corps** — fini quand, après 3 séances, le graphique d'un exercice montre 3 points corrects.
6. **Sauvegarde** — fini quand un export importé sur un autre navigateur restitue tout à l'identique.

## Règles de travail

- Une étape à la fois. À la fin : `npm test` et `npm run build` passent, commit, puis expliquer à l'utilisateur (débutant) comment tester sur son téléphone, en français simple.
- Tests Vitest obligatoires pour : suggestion d'augmentation de charge, moyenne 7 jours, export/import.
- En cas d'ambiguïté dans le cahier des charges : poser la question plutôt que deviner.
