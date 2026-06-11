# FontCompare

*Compare fonts side by side in Figma. System fonts + Google Fonts, with multi-select and one-click to canvas.*

Plugin Figma pour explorer et comparer des typographies. Tapez un texte (un nom de marque, un slogan), prévisualisez-le instantanément avec **toutes les polices disponibles dans Figma** (polices système + polices cloud), cochez celles qui vous plaisent et insérez-les en un clic sur le canvas, proprement alignées.

## Fonctionnalités

- **Aperçu en direct** : le texte saisi s'affiche dans chaque police, à la taille choisie via le curseur (12–96 px). Champ vide ? L'aperçu affiche le nom de la famille, comme sur Google Fonts.
- **Liste fluide, même avec 3000 polices** : rendu par lots de 50 au défilement (lazy loading via `IntersectionObserver`), aucune saccade.
- **Filtres** : recherche par nom, catégories (Sans Serif, Serif, Monospace, Display & Script) et source (Figma Cloud vs Système), avec compteurs.
- **Aperçu fidèle des polices cloud** : pour les familles Google Fonts populaires non installées localement, la feuille de style Google Fonts est injectée à la volée, uniquement pour les familles réellement visibles à l'écran.
- **Insertion propre sur le canvas** : les blocs de texte sont créés avec le style par défaut de chaque famille (Regular si disponible), empilés verticalement, puis sélectionnés et cadrés dans le viewport. Une police indisponible n'interrompt pas le lot : elle est signalée à la fin.
- **Favoris et projets** : une étoile sur chaque ligne pour les coups de cœur, et des collections nommées par client ou par marque via le bouton « Ajouter à la collection » (favoris, projet existant, ou nouveau projet nommé inline). Les collections apparaissent dans la sidebar : un clic filtre la liste sur leur contenu. Renommage au double-clic, suppression au survol. Persistance via `figma.clientStorage`, donc conservée d'un fichier Figma à l'autre.
- **Thème clair et sombre** : l'interface suit automatiquement le thème de Figma.

## Installation

1. Clonez ce dépôt :
   ```sh
   git clone https://github.com/nicolascharr/figma-font-compare.git
   ```
2. Dans **Figma Desktop** : `Plugins → Development → Import plugin from manifest…`
3. Sélectionnez le fichier `manifest.json` du dépôt.

Le code compilé (`code.js`) est versionné : aucune étape de build n'est nécessaire pour utiliser le plugin.

## Développement

Le backend est écrit en TypeScript (`code.ts`) avec les typings officiels [`@figma/plugin-typings`](https://www.npmjs.com/package/@figma/plugin-typings).

```sh
npm install
npx tsc --watch   # recompile code.ts → code.js à chaque modification
```

L'interface (`ui.html`) est autonome : HTML, CSS et JavaScript dans un seul fichier, sans dépendance ni bundler.

## Fonctionnement technique

```
┌──────────────┐  init / create-nodes   ┌─────────────────┐
│   ui.html    │ ─────────────────────▶ │    code.ts      │
│  (iframe UI) │ ◀───────────────────── │ (sandbox Figma) │
└──────────────┘  fonts / progress /    └─────────────────┘
                  create-done
```

- **`code.ts`** interroge `figma.listAvailableFontsAsync()`, regroupe les couples famille/style par famille et les envoie à l'interface. À l'insertion, il appelle `await figma.loadFontAsync()` pour chaque police cochée **avant** de créer le `TextNode` (en définissant `fontName` avant `characters`, comme l'exige l'API), puis positionne les nœuds verticalement.
- **`ui.html`** classe les familles par heuristique de mots-clés (l'API Figma ne fournit pas de catégorie), filtre, et rend la liste par lots. Les stylesheets Google Fonts sont demandées par paquets groupés (debounce 250 ms) pour les seules familles cloud visibles.
- **`manifest.json`** utilise le format actuel : `documentAccess: "dynamic-page"` et `networkAccess` restreint à `fonts.googleapis.com` / `fonts.gstatic.com`.

## Limites connues

- Seules les familles cloud présentes dans la liste interne `GOOGLE_FONTS` (~150 familles populaires) bénéficient d'un aperçu HTML fidèle ; les autres s'affichent avec la police de repli du système dans l'interface. L'insertion sur le canvas, elle, est toujours fidèle : c'est `figma.loadFontAsync` qui fait foi côté Figma.
- La catégorisation (Serif, Mono…) est heuristique : une famille au nom atypique peut être mal classée.
- Les favoris et projets sont stockés en local sur la machine (`figma.clientStorage`, 5 Mo par plugin) : ils ne sont ni synchronisés entre machines, ni partagés entre utilisateurs. Une police enregistrée sur un poste mais absente d'un autre apparaît grisée « Indisponible sur cette machine ».

## Licence

[MIT](LICENSE)
