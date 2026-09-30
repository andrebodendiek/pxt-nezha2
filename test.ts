// Linienfolger: an jeder Kreuzung mit Abzweig nach rechts wird rechts abgebogen
let fahren = false
nezhaV2.driveSetup(nezhaV2.MotorPostion.M1, nezhaV2.MountMode.Normal, nezhaV2.MotorPostion.M2, nezhaV2.MountMode.Normal)
nezhaV2.pxLineSetupDual(nezhaV2.RJPort.J1, nezhaV2.RJPort.J2)
nezhaV2.displayStart(60)
nezhaV2.displayText("Linienfolger", 0)

input.onButtonPressed(Button.A, function () {
    fahren = true
})
input.onButtonPressed(Button.B, function () {
    fahren = false
    nezhaV2.driveStop()
})
basic.forever(function () {
    if (fahren) {
        if (nezhaV2.ultrasonicObstacle(nezhaV2.RJPort.J3, 10)) {
            nezhaV2.avoidObstacle(nezhaV2.TurnDirection.Right, 30, 20, 30)
        } else if (nezhaV2.pxLineBranch(nezhaV2.TurnDirection.Right)) {
            nezhaV2.pxLineTurn(nezhaV2.TurnDirection.Right, 25)
        } else {
            nezhaV2.pxLineFollow(30)
        }
    }
})
basic.forever(function () {
    nezhaV2.displayPxLine(2)
    nezhaV2.displayValue("Abstand", nezhaV2.ultrasonicDistance(nezhaV2.RJPort.J3), 4)
    basic.pause(200)
})
