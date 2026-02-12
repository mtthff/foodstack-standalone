# Foodstack

Eine SvelteKit-App zur Erfassung der taeglichen Ernaehrungspyramide nach BZfE. Die App rechnet pro Tag, zeigt Erfuellung und Uebererfuellung (z.B. +1) und bietet eine einfache Statistik pro Kategorie.

## Datenspeicherung

Die App verwendet **JSON-Dateien** statt einer Datenbank:

- `data/pyramid_items.json` - Globale Definition der Pyramiden-Items
- `data/YYYY-MM-DD_portions.json` - Tägliche Portionsdaten (eine Datei pro Tag)

### Struktur pyramid_items.json:
```json
[
  {
    "id": 1,
    "label": "Extras",
    "recommended_portions": 1,
    "tier": 1,
    "item_order": 1
  }
]
```

### Struktur tägliche Portions-Dateien (z.B. 2026-02-12_portions.json):
```json
{
  "id": 20260212,
  "entry_date": "2026-02-12",
  "portions": {
    "1": 2,
    "2": 3
  }
}
```

## Features

- Permanenter Base Path: `/foodstack` (Dev und Prod identisch)
- SvelteKit (JavaScript + JSDoc), adapter-node
- API-Routen mit einheitlichem Response-Format
- Bootstrap 5 UI (CDN)
- JSON-basierte Datenspeicherung (keine Datenbank erforderlich)

## Lokales Setup

1. Abhaengigkeiten installieren

```sh
npm install
```

2. App starten

```sh
npm run dev
```

Die App erstellt beim ersten Start automatisch das `data/`-Verzeichnis und initialisiert die Pyramiden-Items.

