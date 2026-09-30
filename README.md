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
| 6 | Rescue Line | Manöver für RoboCupJunior Line / Line Entry | – |

## Beispiel: Linienfolger

```javascript
let fahren = false
nezhaV2.driveSetup(nezhaV2.MotorPostion.M1, nezhaV2.MountMode.Normal, nezhaV2.MotorPostion.M2, nezhaV2.MountMode.Normal)
nezhaV2.pxLineSetupDual(nezhaV2.RJPort.J1, nezhaV2.RJPort.J2)
nezhaV2.displayStart(60)

input.onButtonPressed(Button.A, function () {
    fahren = true
})
input.onButtonPressed(Button.B, function () {
    fahren = false
    nezhaV2.driveStop()
})
basic.forever(function () {
    if (fahren) {
        if (nezhaV2.pxLineBranch(nezhaV2.TurnDirection.Right)) {
            nezhaV2.pxLineTurn(nezhaV2.TurnDirection.Right, 25)
        } else {
            nezhaV2.pxLineFollow(30)
        }
    }
})
basic.forever(function () {
    nezhaV2.displayPxLine(2)
    basic.pause(200)
})
```

## Hinweise

- Ohne den Block „Räder“ rechnet die Erweiterung mit dem EV3-Rad (5,6 cm Durchmesser) und 12 cm Radabstand.
- Die Display-Schrift kennt keine Umlaute: „ae“, „oe“, „ue“ schreiben.
- Version 1.7.0 ist eine aufgeräumte Neufassung. Programme mit Blöcken älterer Versionen müssen angepasst werden.

## Lizenz

MIT, auf Grundlage von [elecfreaks/pxt-nezha2](https://github.com/elecfreaks/pxt-nezha2).

<script src="https://makecode.com/gh-pages-embed.js"></script><script>makeCodeRender("{{ site.makecode.home_url }}", "{{ site.github.owner_name }}/{{ site.github.repository_name }}");</script>
