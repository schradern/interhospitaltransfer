# interhospitaltransfer

Eine Progressive Web App (PWA) zur strukturierten Erfassung von Verlegungsanfragen (Interhospitaltransfer).
Die App funktioniert offline, speichert ausschließlich lokal und passwortverschlüsselt (IndexedDB) und erzeugt auf Wunsch einen PDF-Erfassungsbogen.

---

## Zweckbestimmung

Die Anwendung dient ausschließlich der strukturierten Erfassung, lokalen Speicherung und dem Ausdruck (PDF) von Angaben zu Verlegungsanfragen – vergleichbar mit einem Papierformular.

- Eingaben werden unverändert wiedergegeben. Es finden keine Berechnungen, Auswertungen, Bewertungen, Empfehlungen oder Warnungen statt.
- Die Anwendung ist nicht dazu bestimmt, diagnostische oder therapeutische Entscheidungen zu unterstützen. Alle medizinischen Bewertungen und Entscheidungen trifft ausschließlich die anwendende Person.
- Die Anwendung ist kein Medizinprodukt im Sinne der Verordnung (EU) 2017/745 (MDR) und darf nicht als solches eingesetzt werden.

Hinweis für Weiterentwicklungen: Funktionen, die aus eingegebenen Werten neue patientenbezogene Informationen ableiten (z. B. Scores, berechnete Vitalparameter, Dosisberechnungen, Plausibilitäts- oder Grenzwertwarnungen, Transportmittel-Empfehlungen), können die Einstufung als Medizinprodukt-Software (MDCG 2019-11) auslösen und sind daher bewusst nicht enthalten.

---

## Features

- Mehrstufiges Formular für Patientendaten, Transferdetails, klinischen Zustand, Instrumentierung und Entscheidung
- Auswahlfelder starten mit „Keine Angabe“ – es werden keine Angaben vorbelegt
- Lokale, verschlüsselte Datenspeicherung in IndexedDB (AES-GCM 256, Schlüssel per PBKDF2-SHA-256 aus einem Passwort)
- Automatische Sperre nach 15 Minuten ohne Eingabe, manuelles Sperren jederzeit
- Automatische Löschung 7 Tage nach der letzten Änderung (Datenminimierung), ausgeführt beim nächsten Start der App bzw. stündlich während der Nutzung
- PDF mit eingebetteter Unicode-Schrift (Latein inkl. Sonderzeichen, Griechisch, Kyrillisch); nicht darstellbare Zeichen werden nach dem Export als Hinweis aufgelistet
- Am Desktop: Seitenleiste mit allen Formularschritten, Tabellenansicht der Einträge, Speichern mit Strg/⌘ + S
- Warnung vor dem Verwerfen ungespeicherter Eingaben
- Export als strukturierter PDF-Erfassungsbogen (Dateiname ohne Patientennamen)
- Offlinefähig dank Service Worker
- Installierbar auf iOS und Android (Zum Home-Bildschirm hinzufügen), heller und dunkler Modus

---

## Projektstruktur

```
├── index.html               # Haupt-HTML-Seite inkl. Nutzungshinweis
├── main.js                  # Einstiegspunkt
├── form-template.html       # HTML-Template des Formulars
├── LICENSE                  # MIT-Lizenz
├── manifest.json            # Web App Manifest
├── service-worker.js        # Offline-Cache (CACHE_VERSION bei jeder Veröffentlichung erhöhen)
├── icons/                   # App-Icons
├── styles/
│   ├── base.css             # Farben, Layout, Kopf-/Fußzeile
│   ├── overlays.css         # Statusmeldung, Dialog
│   ├── steps.css            # Schrittnavigation, Desktop-Seitenleiste
│   ├── form.css             # Formularfelder
│   ├── form-layout.css      # Formular-Zonen (mobil zuerst, Desktop-Seitenleiste)
│   ├── list.css             # Eintragsliste
│   └── lock.css             # Sperrbildschirm
├── libs/
│   ├── jspdf.umd.min.js     # jsPDF 4.2.1 (lokal, wird erst bei Bedarf geladen)
│   └── fonts/               # Noto Sans (Teilmenge) inkl. OFL-Lizenz
└── ressources/
    ├── db.js                # IndexedDB-Zugriff
    ├── crypto.js            # Verschlüsselung (Web Crypto API)
    ├── vault.js             # Passwort, Sitzungsschlüssel, Migration
    ├── entrystore.js        # Verschlüsseltes Lesen/Schreiben der Einträge
    ├── retention.js         # Automatische Löschung
    ├── lock.js              # Sperrbildschirm und automatische Sperre
    ├── entryhandler.js      # Listenansicht und Löschen
    ├── swipe.js             # Wischgeste zum Löschen (Touch)
    ├── formhandler.js       # Formularschritte und Speichern
    ├── formdata.js          # Formular lesen/befüllen, abhängige Felder
    ├── navigation.js        # Navigation und Browser-Verlauf
    ├── pdfhandler.js        # PDF-Export
    ├── pdflayout.js         # PDF-Layout
    ├── pdffont.js           # Eingebettete PDF-Schrift und Zeichenabdeckung
    ├── pdfcontent.js        # PDF-Inhalte
    └── status.js            # Statusmeldungen
```

---

## Installation

### Lokale Nutzung

1. Projekt klonen:

```bash
git clone https://github.com/schradern/interhospitaltransfer.git
cd interhospitaltransfer
```

2. Lokalen Server starten (z. B. mit Python):

```bash
python3 -m http.server
```

Dann im Browser öffnen: http://localhost:8000

Hinweis: Service Worker funktionieren nur über HTTPS oder localhost.

### Veröffentlichung

Die App wird unter https://transfer.medizin.dev bereitgestellt (eigener Ursprung, damit keine andere Website den Browser-Speicher teilt). Alle Pfade sind relativ; die App läuft daher unter jedem Pfad. Bei jeder Änderung `CACHE_VERSION` in `service-worker.js` erhöhen, sonst erhalten installierte Apps das Update nicht.

---

## Technologien

- Vanilla JavaScript (ES-Module)
- HTML5 / CSS3
- IndexedDB (lokale Speicherung)
- Service Worker API
- jsPDF (PDF-Generierung)

---

## Anbieter

Dr. med. Nikolas B. Schrader – [medizin.dev](https://www.medizin.dev)  
Anbieterkennzeichnung: [Impressum](https://medizin.dev/impressum)

---

## Lizenz

Dieses Projekt steht unter der [MIT-Lizenz](LICENSE).

Kurzfassung (maßgeblich ist allein der Lizenztext): Nutzung, Änderung und Weitergabe sind – auch kommerziell – erlaubt, sofern der Copyright-Hinweis und der Lizenztext mitgegeben werden. Die Software wird ohne Gewährleistung bereitgestellt.

---

## Drittanbieter-Lizenzen

Dieses Projekt verwendet folgende Drittanbieter-Komponenten:

- jsPDF 4.2.1 (https://github.com/parallax/jsPDF)
  Lizenz: MIT License
  Copyright (c) 2010-2025
  James Hall, yWorks GmbH, Lukas Holländer, Aras Abbasi und weitere Mitwirkende

Hinweis: Der vollständige Lizenztext ist innerhalb der Datei `libs/jspdf.umd.min.js` enthalten.

- Noto Sans (https://github.com/notofonts/latin-greek-cyrillic), als Teilmenge eingebettet in `libs/fonts/`
  Lizenz: SIL Open Font License 1.1 (`libs/fonts/OFL.txt`)
  Copyright 2022 The Noto Project Authors

---

## Funktionsweise & Datenschutz

- Alle erfassten Daten (Patientendaten, Transferinformationen) werden ausschließlich lokal im Browser des Nutzers gespeichert (IndexedDB), verschlüsselt mit einem vom Nutzer gewählten Passwort. Das Passwort wird nicht gespeichert und ist nicht wiederherstellbar; „Passwort vergessen“ löscht alle Daten.
- Unverschlüsselt bleiben nur Eintrags-ID sowie Erstellungs- und Änderungszeitpunkt (für Sortierung und automatische Löschung).
- Einträge werden 7 Tage nach der letzten Änderung automatisch gelöscht, sobald die App das nächste Mal läuft (beim Start und stündlich während der Nutzung); bis dahin bleiben abgelaufene Einträge verschlüsselt auf dem Gerät. Die App sperrt sich nach 15 Minuten ohne Eingabe; beim Sperren werden angezeigte Patientendaten aus der Seite entfernt.
- Erfasste Daten werden nicht an Server oder Dritte übertragen. Beim Aufruf der App werden lediglich die Programmdateien vom Server geladen (Hetzner Online GmbH, Deutschland); dabei werden technisch notwendige Zugriffsdaten (u. a. IP-Adresse) im Server-Protokoll gespeichert und nach sieben Tagen gelöscht. Der Datenschutzhinweis in der App verweist auf das [Impressum](https://medizin.dev/impressum).
- Eine Content Security Policy verhindert das Nachladen fremder Skripte und das Absenden von Formulardaten an Server.
- Browser-Autovervollständigung ist für das Formular deaktiviert, damit Patientendaten nicht im Autofill-Verlauf landen.
- Die App funktioniert nach dem ersten Aufruf vollständig offline.
- Exportierte PDF-Dokumente werden lokal erstellt; der Dateiname enthält keinen Patientennamen.
- Löschung von Datensätzen erfolgt manuell durch den Nutzer (mit Rückfrage).
- Keine Verwendung von Cookies, Trackern oder externen Analyse-Tools.
- Beim Löschen der Browserdaten, beim Zurücksetzen des Gerätes oder durch automatische Speicherbereinigung des Browsers können lokal gespeicherte Daten unwiederbringlich verloren gehen.
- Exportierte bzw. ausgedruckte PDFs sind nicht verschlüsselt und unterliegen nicht der automatischen Löschung.
- Der Anwender bzw. dessen Einrichtung bleibt Verantwortlicher im Sinne der DSGVO (Art. 4 Nr. 7, Art. 24) für die erfassten Patientendaten. Verschlüsselung, Sperre und Löschfrist sind technische Hilfen; sie ersetzen nicht die Prüfung durch die Einrichtung (z. B. Datenschutzbeauftragte, Gerätesicherheit, Verzeichnis von Verarbeitungstätigkeiten).
- Alle erfassten Angaben – insbesondere der erzeugte PDF-Erfassungsbogen – sind von der anwendenden Person vor jeder Weitergabe oder Verwendung auf Richtigkeit und Vollständigkeit zu prüfen.
- Diese Webanwendung dient ausschließlich der unterstützenden Erfassung von Verlegungsanfragen. Sie ersetzt keine medizinische Dokumentation im Sinne gesetzlicher Vorschriften. Für die korrekte Erfassung, Aufbewahrung und Sicherung von Patientendaten bleibt der Anwender verantwortlich.
