# Honeyapps – Firmen-Website (honeyapps.de)

Statische Website (GitHub Pages, Repo `honeyapps-pixel/website`, CNAME `www.honeyapps.de`).
Kein Build-Schritt. Reines HTML/CSS/JS + geteilte Motion-Engine (GSAP + Lenis).

## Aufbau / Seiten
- `index.html` — Startseite (Studio-Positionierung, 4 Säulen, eigene Apps, Story, Praxis-Band, Kontakt)
- `apps/` — Apps (Route2Bee, ReciBee = live; Diveo = Beta). **App-Inhalte & Store-Links unverändert übernommen.**
- `webdesign/` — Webdesign (Demo-first-Modell + Showcase mit **einer** Demo: InTroTech, Sanierung/Gifhorn)
- `hausautomatisierung/` — Hausautomatisierung & Visualisierung (neuer Geschäftsbereich)
- `software/` — Smarte Software-Lösungen (inkl. Praxisbeispiel Sanierungs-Betriebssoftware, verlinkt auf `saas/`)
- `saas/` — **Betriebssoftware als SaaS**: Module, Referenz ITT Dashboard, Ablauf, Preis auf Anfrage.
  **Kein eigener Nav-Reiter** (Nutzer-Entscheidung): SaaS haengt unter *Software*. Einstiege sind die
  SaaS-Sektion auf `software/` (`#saas`) und der Footer; die Seite selbst markiert *Software* als aktiven
  Bereich. Auf der Startseite nennt die Software-Saeule die Mietsoftware mit — keine eigene Saeule.
  Die Produktansicht im Hero ist **in HTML/CSS gebaut** (`.ui-shell` in `main.css`), kein Screenshot — die
  Sidebar-Beschriftungen und Board-Spalten entsprechen 1:1 der echten Software (`Projekte/ITT-Dashboard`,
  `frontend/src/components/layout/Sidebar.tsx`). Bei Änderungen an den Modulen dort hier nachziehen.
- `ueber-uns/` — Über uns (Gründer-Story, Team-Karten)
- `impressum.html` — Impressum (eigene Seite, aus alter Home-Sektion übernommen)
- `datenschutz.html`, `agb.html` — unverändert (nutzen noch das alte `style.css`)
- `route2bee/`, `recibee/`, `diveo/` — App-Landingpages, unverändert

## Design-System
- `assets/main.css` — „Hell & präzise · Swiss": weißer Hintergrund, Apple-Grautöne (Originalpalette), EIN blauer Akzent (#0071e3), Hairline-Raster, 01–05-Index.
  Neu für `saas/`: `.ui-shell` (Produktansicht, auch auf `software/#saas`), `.mods` (Modul-Raster),
  `.chain` (Phasen-Kette), `.price-box`.
- `assets/main.js` — Mobil-Menü Scroll-Lock/Escape + CDN-Failsafe.
- `assets/motion.js` — Kopie der geteilten Motion-Engine (`_engine/motion.js` aus dem Webdesgin-Repo).
- Schriften: Switzer (Display + Body) über Fontshare-CDN.
- Favicon: `assets/favicon.svg` (Wabe + Honigtropfen) — ersetzt das alte 🍯-Emoji.

## Bilder
- `assets/img/*.jpg` — atmosphärische Pexels-Bilder (Nachweise in `assets/img/_attribution.txt`).
- `assets/img/showcase/introtech.jpg` — Screenshot der InTroTech-Demo (Webdesign-Showcase, einzige Demo),
  neu erzeugbar via Playwright aus `../Webdesgin/introtech-sanierung/index.html`.

## Travelbook
Vollständig entfernt: Ordner `travelbook/`, Home-/Footer-Links und die nur dafür existierenden
`/.well-known/apple-app-site-association` + `assetlinks.json` (com.travelrank.travelrank, Platzhalter-Fingerprint).

## V2 / noch nachzuliefern
- **Gründer-Fotos** (Über uns): aktuell Platzhalter-Kacheln „Foto folgt" (Initialen LS/JW). Echte Porträts
  (Format 4:5) in `ueber-uns/index.html` im `.founder-photo` einsetzen (Kommentar `V2:` markiert die Stellen).
- **Echte Screenshots** für den Sanierungs-Case und die Visualisierung könnten die Pexels-Platzhalter ersetzen
  (`assets/img/software-case.jpg`, `smarthome-viz.jpg`).
- **Preise für die SaaS** (`saas/`): steht bewusst auf „Angebot auf Anfrage". Sobald ein Preismodell festgelegt ist,
  die `.price-box` in `saas/index.html` mit echten Zahlen füllen — nichts schätzen.

## Vor dem Live-Gang bestätigen
1. **⚠️ InTroTech namentlich als Software-/SaaS-Referenz** — OFFEN, vor dem Live-Gang entscheiden.
   `saas/` und `software/` nennen die **InTroTech GmbH** inzwischen beim Namen (vorher: „ein Sanierungsfachbetrieb
   aus der Region"). InTroTech ist eine **verbundene Partei** (Johann Warkentin = GF und zugleich Honeyapps-
   Gesellschafter). Entweder (a) Freigabe von InTroTech einholen **und** die Verbindung auf der Seite offenlegen,
   oder (b) wieder anonymisieren. Betroffen: `saas/index.html` (Sektion `#referenz`, Absatz + Fließtext) und
   `software/index.html` (Praxisbeispiel-Absatz). Im Webdesign-Showcase wird InTroTech schon länger genannt.
2. **Webdesign-Showcase**: zeigt nur die InTroTech-Demo (auf Wunsch des Kunden). Weitere Demos bei Bedarf ergänzbar.
3. **Smart-Home-Tiefe**: Systeme (KNX/Loxone/Home Assistant) als Angebot formuliert — bestätigen, was real angeboten wird.
4. **Gründer-Schwerpunkte** (Über uns) ggf. präzisieren (aktuell neutral gehalten).

## Lokal testen
```
cd /Users/nemo/Desktop/Projekte/Website
python3 -m http.server 8848
# dann im Browser (Safari): http://localhost:8848/
```
Wichtig: über einen lokalen Server testen (nicht per `file://`), da absolute Pfade `/assets/…` verwendet werden.

## Deploy
Erst nach ausdrücklicher Freigabe (siehe Memory „deploy-erst-nach-freigabe"). GitHub Pages zieht aus `main`.
