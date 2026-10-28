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
image_mode: background         # background (photo en fond + dessin animé) | replace
image_opacity: 0.35
status_entity: sensor.poele_status   # statut traduit en français
status_map:                          # traductions personnalisées (facultatif)
  load pellet: Chargement pellet
power_entity: input_number.poele_puissance   # puissance de 1 à 5
power_real_entity: sensor.maison_real_power
power_min: 1
power_max: 5
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
| `image` | Photo du poêle (facultative) |
| `image_mode` | `background` : photo en fond derrière le dessin animé (défaut) · `replace` : la photo remplace le dessin |
| `image_opacity` | Opacité de la photo de fond |
| `status_entity` | Entité dont l'état est traduit en français (`load pellet` → Chargement pellet, `flame light` → Flamme allumée, `work` → Travail, `cleaning final` → Nettoyage final, `ext`/`extinguish` → Extinction…) ; la flamme suit le statut |
| `status_map` | Vos propres traductions (`état: libellé`), prioritaires sur les traductions intégrées |
| `power_entity` | `input_number` ou `number` de puissance : boutons 1 à 5 |
| `power_real_entity` | Lecture de la puissance réelle (affichée sous le réglage) |
| `power_min` / `power_max` | Bornes des boutons de puissance (1 et 5 par défaut) |
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
