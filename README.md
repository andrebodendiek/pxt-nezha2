# Nezha V2-ab

MakeCode-Erweiterung für das **ELECFREAKS Nezha V2** (micro:bit) im Unterricht ab Jahrgang 7.
Alle Blöcke sind deutsch. Die Erweiterung braucht keine weiteren Erweiterungen.

![Nezha V2](nezha_v2.png)

## Einbinden

In MakeCode unter **Erweiterungen** diese Adresse eingeben:

```
github.com/andrebodendiek/pxt-nezha2
```

## Unterkategorien

| Nr. | Unterkategorie | Hardware | Anschluss |
|---|---|---|---|
| 1 | Motoren | 2 Antriebsmotoren, weitere Motoren einzeln | M1–M4 |
| 2 | Liniensensor | 1 oder 2 PlanetX-2-Kanal-Liniensensoren oder PlanetX-Trackbit | J1–J4 bzw. IIC |
| 3 | Farbsensor | PlanetX-Farbsensor | IIC |
| 4 | Ultraschall | PlanetX-Ultraschallsensor | J1–J4 |
| 5 | Display | OLED 0,96″, 128 × 64, I²C (SSD1306) | IIC |

## Beispiel: Linienfolger

Jeder der vier Kanäle bekommt eine eigene Regel für die beiden Motoren. Sieht kein Kanal die Linie, fährt der Roboter so weiter wie zuletzt. So bleibt jede Zeile für Schülerinnen und Schüler erklärbar.

```javascript
// Linienfolger, den man Zeile für Zeile erklären kann:
// Jeder Kanal des Liniensensors bekommt eine eigene Regel für die Motoren.
let fahren = false
let schnell = 30
let langsam = 15
nezhaV2.driveSetup(nezhaV2.MotorPostion.M1, nezhaV2.MountMode.Normal, nezhaV2.MotorPostion.M2, nezhaV2.MountMode.Normal)
nezhaV2.pxLineSetupDual(nezhaV2.RJPort.J1, nezhaV2.RJPort.J2)
input.onButtonPressed(Button.A, function () {
    fahren = true
    nezhaV2.driveSteer(schnell, schnell)
})
input.onButtonPressed(Button.B, function () {
    fahren = false
    nezhaV2.driveStop()
})
basic.forever(function () {
    if (fahren) {
        if (nezhaV2.pxLineSeen(nezhaV2.LineChannel.C1) && nezhaV2.pxLineSeen(nezhaV2.LineChannel.C4)) {
            // Kreuzung: beide äußeren Kanäle sehen Schwarz – geradeaus drüberfahren
            nezhaV2.driveSteer(schnell, schnell)
        } else if (nezhaV2.pxLineSeen(nezhaV2.LineChannel.C1)) {
            // Linie ganz links: scharf nach links
            nezhaV2.driveSteer(0, schnell)
        } else if (nezhaV2.pxLineSeen(nezhaV2.LineChannel.C4)) {
            // Linie ganz rechts: scharf nach rechts
            nezhaV2.driveSteer(schnell, 0)
        } else if (nezhaV2.pxLineSeen(nezhaV2.LineChannel.C2) && nezhaV2.pxLineSeen(nezhaV2.LineChannel.C3)) {
            // Linie genau in der Mitte: geradeaus
            nezhaV2.driveSteer(schnell, schnell)
        } else if (nezhaV2.pxLineSeen(nezhaV2.LineChannel.C2)) {
            // Linie etwas links: leicht nach links
            nezhaV2.driveSteer(langsam, schnell)
        } else if (nezhaV2.pxLineSeen(nezhaV2.LineChannel.C3)) {
            // Linie etwas rechts: leicht nach rechts
            nezhaV2.driveSteer(schnell, langsam)
        }
        // Sieht kein Kanal die Linie, ändert sich nichts: Der Roboter fährt so weiter wie zuletzt.
    }
})
```

## Hinweise

- Ohne den Block „Räder“ rechnet die Erweiterung mit dem EV3-Rad (5,6 cm Durchmesser) und 12 cm Radabstand.
- Die Display-Schrift kennt keine Umlaute: „ae“, „oe“, „ue“ schreiben.
- Version 1.7.0 ist eine aufgeräumte Neufassung. Programme mit Blöcken älterer Versionen müssen angepasst werden.
- Zwei 2-Kanal-Liniensensoren so montieren, dass die beiden inneren Kanäle höchstens so weit auseinanderliegen, wie die Linie breit ist (ca. 1,5 cm). Sonst verschwindet eine mittig liegende Linie zwischen den Sensoren.

## Änderungen

- **1.7.4** – Unterkategorie „6 Rescue Line“ ausgeblendet (die Blöcke funktionieren in bestehenden Programmen weiter). Neues Beispiel: Linienfolger aus einfachen Regeln je Kanal.
- **1.7.3** – Zurück zum Fahrverhalten von 1.7.1. Einzige Änderung: „Linie verloren“ gilt erst, wenn 0,3 s lang kein Kanal die Linie sieht. Kurze Aussetzer lösen keine Suche mehr aus.
- **1.7.2** – (zurückgenommen) geänderte Lenkung und Suche.
- **1.7.1** – „drehe bis zur Linie“: symmetrische Suchzeit.

## Lizenz

MIT, auf Grundlage von [elecfreaks/pxt-nezha2](https://github.com/elecfreaks/pxt-nezha2).

<script src="https://makecode.com/gh-pages-embed.js"></script><script>makeCodeRender("{{ site.makecode.home_url }}", "{{ site.github.owner_name }}/{{ site.github.repository_name }}");</script>
