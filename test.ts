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
