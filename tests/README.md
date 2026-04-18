## LexCite Test Harnesses

Diese kleinen Harnesses laufen ohne `node` direkt über `osascript` und prüfen die wichtigsten Bereiche der App reproduzierbar.

Die Eingabefälle liegen in `tests/fixtures/` und können dort erweitert werden, ohne die Harness-Skripte selbst anzupassen.

### Prüfer-Suite

```sh
ROOT_DIR="/Users/detjondreshaj/Documents/New project" zsh "/Users/detjondreshaj/Documents/New project/tests/run-checker-suite.sh"
```

Erwartete Ausgabe:

```txt
FULL_REFERENCE_AND_NEGATIVE_SUITES_OK
```

### PDF-Erkennungs-Suite

```sh
ROOT_DIR="/Users/detjondreshaj/Documents/New project" zsh "/Users/detjondreshaj/Documents/New project/tests/run-pdf-detection-suite.sh"
```

Erwartete Ausgabe:

```txt
PDF_DETECTION_SUITE_OK
```

### Alles zusammen

```sh
ROOT_DIR="/Users/detjondreshaj/Documents/New project" zsh "/Users/detjondreshaj/Documents/New project/tests/run-all.sh"
```

Erwartete Ausgabe:

```txt
LEXCITE_TESTS_OK
```

### Zweck

- `run-checker-suite.sh`: lädt Regeln, Audit und Prüfer-UI mit DOM-Stubs und führt die Guide-Referenz- und Negativsuite aus.
- `run-pdf-detection-suite.sh`: prüft zentrale Erkennungshelfer wie Datumsnormalisierung, BGer-Geschäftsnummern und typische Quellentyp-Erkennung.
- `run-all.sh`: startet beide Suiten nacheinander.
- `tests/fixtures/pdf-detection-fixtures.json`: Fixture-Daten für PDF-Helfer und PDF-Typ-Erkennung.
- `tests/fixtures/checker-fixtures.json`: kleine Metadaten für die Checker-Harness.
