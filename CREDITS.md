# Atlas Sources And Credits

This atlas builds on [sajee05/Diagrams-Models](https://github.com/sajee05/Diagrams-Models). Original authorship is retained. No new licence is assigned to upstream code or third-party imagery by this contribution.

## Maps And Editorial Records

- Indian national and State/UT boundaries: Government of India BharatMaps/NIC layers, with neighbouring country shapes clipped against the Indian extent. Other country boundaries originate from Natural Earth. Cartographic boundaries are distinct from ground administration.
- Wetland designation records: [Ramsar Sites Information Service](https://rsis.ramsar.org/) and its India records; inventory snapshot checked 25 October 2026. Designation dates are kept distinct from announcement dates.
- Heritage records and photographs: [UNESCO World Heritage Centre](https://whc.unesco.org/en/statesparties/in). `world-map/data/place-photos.js` records each photograph's source and supplied creator credit. Images remain subject to their original rights; inclusion does not make them public domain.
- Species images: individual source and creator credits accompany each image in `world-map/data/se7en-content.js`. Sources include NOAA Fisheries, the Field Museum and credited institutional contributors. Their original licence conditions continue to apply.
- Taxonomic/conservation metadata: GBIF-hosted taxonomic records and IUCN assessment references where supplied; assessment scope matters. Unresolved statuses must not be interpreted as Least Concern or Not Evaluated.

## Animation

Wave illustrations and motion are schematic teaching graphics. Colour distinguishes relative warm/cold current classes. Apparent wave height and travel speed do not represent measured ocean conditions, currents' physical transport speeds or tsunami forecasts. Current paths and seasonal behaviour still require geographic review. The North Indian monsoon current currently displays one route orientation and does not provide a seasonal reversal control.

## Current Coverage Limits

The library contains 82 selectable themes and 1,124 indexed records, including inherited records and aliases. These are not counts of distinct, fully reviewed sites. Some themes remain sparse, duplicates remain, and inherited factual material requires further editorial verification. Comprehensive site coverage, entity-level notes, identification imagery and source-linked question banks are unfinished. Notes-based quizzes exclude entries without supporting, visible, source-linked facts and a valid authored question; some selections therefore have no notes-based questions yet.

## Local Checks

No build step is needed: serve the repository with a static HTTP server and open `world-map.html` or `index.html`.

```sh
node world-map/tests/integrity-test.js
node world-map/tests/se7en-evidence-test.cjs
node world-map/tests/wave-orientation-test.cjs
```

These checks validate structure and selected behaviour, not the factual completeness or accuracy of every inherited note.

## Ramsar Notes Update — 29 October 2026

All 103 sites in the October 2026 inventory now have site-specific notes in the Ramsar map, with 97 shared species profiles carrying global IUCN categories, assessment references and distinguishing ecology. The full source document is available at `world-map/notes/India_103_Ramsar_Sites_Notes.md`; the map offers a complete-document download and per-site exports including associated species. This update does not claim complete coverage of the other 81 themes or add an authored Ramsar quiz bank.

To regenerate the web data after editing the Markdown document:

```sh
python3 tools/compile_ramsar_notes.py
node world-map/tests/ramsar-notes-test.cjs
```
