# interhospitaltransfer

Eine Progressive Web App (PWA) zur Erfassung und Evaluation von Interhospital-Transfers.
Die App funktioniert offline, speichert lokal (IndexedDB) und bietet eine strukturierte PDF-Export-Funktion.

---

## Features

- Multi-Step Formular für Patientendaten, Transferdetails und klinischen Zustand
- Lokale Datenspeicherung in IndexedDB (browserbasiert)
- Export von Datensätzen als strukturierte PDF
- Offlinefähig dank Service Worker und App-Cache
- Installierbar auf iOS und Android (Add to Homescreen)

---

## Projektstruktur

```
├── index.html          # Haupt-HTML-Seite
├── style.css           # Haupt-Stylesheet
├── main.js             # Einstiegspunkt (modular)
├── form-template.html  # HTML-Template für Formulare
├── manifest.json       # Web App Manifest (Homescreen-Support)
├── service-worker.js   # Service Worker (Caching / Offline Support)
├── libs/
│   └── jspdf.umd.min.js    # Lokale jsPDF Bibliothek für PDF-Generierung
├── ressources/
│   ├── db.js              # IndexedDB-Handling
│   ├── entryhandler.js    # Listenansicht und Löschlogik
│   ├── formhandler.js     # Formularlogik und Validierung
│   ├── navigation.js      # Navigation zwischen Formular und Liste
│   └── pdfhandler.js      # PDF-Export Logik
```

---

## Installation

### Lokale Nutzung

1. Projekt klonen:

```bash
git clone https://github.com/DEINUSERNAME/interhospitaltransfer.git
cd interhospitaltransfer
```

2. Lokalen Server starten (z.B. mit Python):

```bash
python3 -m http.server
```

Dann im Browser öffnen: http://localhost:8000

Hinweis: Service Worker funktionieren nur über HTTPS oder localhost.

---

## Technologien

- Vanilla JavaScript (ES6+ Module)
- HTML5 / CSS3
- IndexedDB (lokale Speicherung)
- Service Worker API
- jsPDF (PDF-Generierung)

---

## Autor

Dr. med. Nikolas B. Schrader  
[medizin.dev](https://www.medizin.dev)

---

## Lizenz

Dieses Projekt ist lizenziert unter der [Creative Commons Namensnennung - Nicht kommerziell - Weitergabe unter gleichen Bedingungen 4.0 International Lizenz (CC BY-NC-SA 4.0)](https://creativecommons.org/licenses/by-nc-sa/4.0/).

Kurzfassung:
- Namensnennung erforderlich: "Dr. med. Nikolas B. Schrader – medizin.dev"
- Keine kommerzielle Nutzung erlaubt
- Änderungen und Weiterentwicklungen müssen unter denselben Bedingungen weitergegeben werden
- Vollständige Lizenz anzeigen: https://creativecommons.org/licenses/by-nc-sa/4.0/

(c) 2025 Dr. med. Nikolas B. Schrader

---

## Drittanbieter-Lizenzen

Dieses Projekt verwendet folgende externe Bibliothek:

- jsPDF (https://github.com/parallax/jsPDF)  
  Lizenz: MIT License  
  Copyright (c) 2010-2021  
  James Hall, yWorks GmbH, Lukas Holländer, Aras Abbasi und weitere Mitwirkende

Hinweis: Der vollständige Lizenztext ist innerhalb der Datei `libs/jspdf.umd.min.js` enthalten.

---

## Funktionsweise & Datenschutz

- Alle erfassten Daten (Patientendaten, Transferinformationen) werden ausschließlich lokal im Browser des Nutzers gespeichert, über IndexedDB.
- Es erfolgt keine Datenübertragung an Server oder Dritte.
- Die App funktioniert vollständig offline.
- Exportierte PDF-Dokumente werden lokal erstellt und gespeichert.
- Löschung von Datensätzen erfolgt manuell durch den Nutzer.
- Keine Verwendung von Cookies, Trackern oder externen Analyse-Tools.

Hinweis: Bei Löschen des Browser-Cache oder Zurücksetzen der IndexedDB können gespeicherte Einträge verloren gehen.
