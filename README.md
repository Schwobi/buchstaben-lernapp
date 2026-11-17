# Buchstaben-Spaß

Eine Web-App (PWA) für Kindergartenkinder von 4 bis 6 Jahren, um Buchstaben zu lernen.

## Was die App kann

- **Nachfahren:** Groß- und Kleinbuchstaben (A–Z, Ä, Ö, Ü, ß) mit dem Finger oder Stift nachfahren.
- **Schreibrichtung:** Grüne Startpunkte mit Nummern zeigen, wo man ansetzt und in welcher
  Reihenfolge die Striche kommen. Pfeile zeigen die Richtung. Ein ✏️ macht den Buchstaben vor
  (automatisch beim Öffnen und mit ▶️).
- **Punkte und Sterne:** 0–100 Punkte und bis zu 3 Sterne, je nachdem wie gut nachgefahren wurde,
  plus ein gesprochener Tipp, was man besser machen kann.
- **Vorlesen:** Erst der Buchstabe langsam und deutlich („E!“), dann „E wie Elefant“, mit Bild.
- **Schreiblinien** wie im Schulheft.
- **Fortschritt** (Punkte und bester Stern je Buchstabe) bleibt auf dem Gerät gespeichert.
- **Offline-fähig** und **installierbar** („Zum Startbildschirm hinzufügen“).
- Mit Stift wird die Handfläche auf dem Bildschirm ignoriert.

## So wird bewertet

Jeder Buchstabe ist in `js/strokes.js` als Folge von Strichen mit Startpunkt und Richtung
hinterlegt (angelehnt an die Grundschrift). Die gemalten Striche werden den Vorlage-Strichen
zugeordnet und einzeln geprüft (`js/scoring.js`):

1. **Genauigkeit:** mittlerer und größter Abstand zur Linie.
2. **Form und Rundheit:** zeigt die Linie überall in die gleiche Richtung wie die Vorlage?
   Ein eckiges O oder eine wackelige Linie gibt weniger Punkte.
3. **Richtung und Startpunkt:** falsch herum gefahren oder an der falschen Stelle angesetzt kostet Punkte.
4. **Vollständigkeit:** fehlende Striche zählen 0, zusätzliche Kritzel und falsche Reihenfolge
   ziehen ab.

Sterne: ab 85 Punkten 3, ab 65 Punkten 2, ab 40 Punkten 1.

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
