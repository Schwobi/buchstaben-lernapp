# Buchstaben-Spaß

Eine Web-App (PWA) für Kindergartenkinder von 4 bis 6 Jahren, um Buchstaben zu lernen.

## Was die App kann

- **Nachfahren:** Groß- und Kleinbuchstaben (A–Z, Ä, Ö, Ü, ß) mit dem Finger oder Stift nachfahren.
  Je genauer, desto mehr Punkte (0–100) und Sterne (bis zu 3).
- **Vorlesen:** Beim Öffnen eines Buchstabens und per 🔊-Knopf liest die App vor, z. B. „A wie Affe“,
  mit Bild zum Beispielwort.
- **Schreiblinien** wie im Schulheft, damit die Lage der Buchstaben stimmt.
- **Fortschritt** (Punkte und bester Stern je Buchstabe) bleibt auf dem Gerät gespeichert.
- **Offline-fähig** und **installierbar** („Zum Startbildschirm hinzufügen“).
- Mit Stift wird die Handfläche auf dem Bildschirm ignoriert.

## So wird bewertet

Der Buchstabe wird intern als Maske gezeichnet. Die App misst
1. **Abdeckung:** wie viel vom Buchstaben überfahren wurde,
2. **Genauigkeit:** wie viel der gemalten Linie auf dem Buchstaben liegt,
3. ob die Linie viel länger ist als der Buchstabe (wildes Kritzeln gibt kaum Punkte).

Details in `js/scoring.js`.

## Starten

Keine Installation und kein Build nötig, nur ein einfacher Webserver:

```sh
python3 -m http.server 8000
# dann http://localhost:8000 öffnen
```

Für die Installation als App muss sie über HTTPS ausgeliefert werden, z. B. mit GitHub Pages
(Settings → Pages → Branch `main`, Ordner `/`).

## Hinweise

- Die Sprachausgabe nutzt die deutsche Stimme des Geräts (Web Speech API). Auf den meisten
  Tablets und Handys ist sie vorhanden; ohne deutsche Stimme bleibt die App stumm.
- Schrift: [Andika](https://software.sil.org/andika/) von SIL, speziell für Leseanfänger,
  unter der SIL Open Font License (`fonts/OFL.txt`).
