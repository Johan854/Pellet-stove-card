# Pellet Stove Card (FR)

Carte Home Assistant pour **poêle à granulés** (ex. Boston – Stuff Pellet Italia) : flamme animée, température, consigne réglable, marche/arrêt et capteurs associés. Style verre, thème clair/sombre automatique, éditeur visuel, textes en français.

## Installation (HACS)
HACS → ⋮ → Dépôts personnalisés → URL de ce dépôt, catégorie **Tableau de bord** → installer → recharger la page.

## Configuration
Tout se règle dans l'éditeur visuel, ou en YAML :

```yaml
type: custom:pellet-stove-card
entity: climate.poele
name: Poêle du salon
image: /local/poele.png        # facultatif : votre photo (dossier /config/www/)
pellet_entity: sensor.niveau_granules
info_entities:
  - sensor.maison_smoke_temperature
  - sensor.maison_air_temperature
theme: auto                    # auto | light | dark
```

| Option | Description |
|---|---|
| `entity` | Entité `climate` du poêle (obligatoire) |
| `name` | Nom affiché |
| `image` | Photo du poêle ; sans elle, un dessin animé est utilisé |
| `pellet_entity` | Niveau de granulés en % (barre colorée) |
| `info_entities` | Capteurs affichés en tuiles (clic = historique) |
| `temp_step` | Pas de la consigne (0 = automatique) |
| `show_controls` | Boutons marche/arrêt et consigne |
| `theme` | `auto`, `light`, `dark` |

Le bouton marche/arrêt demande une confirmation. Licence MIT.

## Apparence : nuance de couleur

Dans l'éditeur visuel, à côté du thème :

| Option | Valeurs |
|---|---|
| `nuance` | `theme` (par défaut), `braise`, `ocean`, `lagon`, `foret`, `lavande`, `framboise`, `ambre`, `ardoise`, `perso` |
| `nuance_perso` | Couleur au choix (sélecteur de couleur), utilisée avec `nuance: perso` |
| `intensite` | De `0` (neutre) à `2` (très coloré), `1` par défaut |

La nuance teinte le dégradé de fond (et la couleur d'accent quand la carte en a une). Les couleurs d'état (vert, orange, rouge…) ne changent pas.

**Une seule nuance pour toutes les cartes Johan854** : laisse `nuance: theme` et ajoute à ton thème Home Assistant :

```yaml
carte-nuance: "#2f8fd8"
```

Sans cette ligne, `nuance: theme` garde les couleurs d'origine de la carte.

## Historique des versions

- **1.1.0** : nuance de couleur au choix (8 nuances, couleur personnalisée, intensité, ou nuance commune via `carte-nuance` dans le thème).
