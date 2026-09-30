/**
 * Nezha V2 (ELECFREAKS) für den Unterricht ab Klasse 7
 * Motoren, PlanetX-Liniensensor, PlanetX-Farbsensor, PlanetX-Ultraschall,
 * OLED-Display 0,96" und Rescue Line (RoboCupJunior Line / Line Entry)
 */
//% color=#ff0011 icon="\uf06d" block="Nezha V2-ab" blockId="nezhaV2"
//% subcategories='["1 Motoren", "2 Liniensensor", "3 Farbsensor", "4 Ultraschall", "5 Display", "6 Rescue Line"]'
//% groups='["Einrichten", "Fahren", "Einzelmotor", "Abfragen", "Erkennen", "Messen", "Anzeigen", "Manöver"]'
namespace nezhaV2 {

    // ============================================================
    // 1 Motoren
    // ============================================================

    export enum MotorPostion {
        //% block="M1"
        M1 = 1,
        //% block="M2"
        M2 = 2,
        //% block="M3"
        M3 = 3,
        //% block="M4"
        M4 = 4
    }

    export enum MountMode {
        //% block="normal"
        Normal = 1,
        //% block="umgekehrt"
        Reversed = 2
    }

    export enum DriveDirection {
        //% block="vorwärts"
        Forward = 1,
        //% block="rückwärts"
        Backward = 2
    }

    export enum TurnDirection {
        //% block="links"
        Left = 1,
        //% block="rechts"
        Right = 2
    }

    export enum DriveUnit {
        //% block="cm"
        Cm = 1,
        //% block="Sekunden"
        Seconds = 2,
        //% block="Radumdrehungen"
        Rotations = 3
    }

    // ---------- Motorsteuerung des Nezha V2 (I2C 0x10) ----------

    enum MovementDirection {
        CW = 1,
        CCW = 2
    }

    enum SportsMode {
        Degree = 2,
        Circle = 1,
        Second = 3
    }

    const NEZHA_ADDR = 0x10;
    let servoSpeedGlobal = 900;
    // Radumfang in cm (EV3-Rad mit 5,6 cm Durchmesser) und Radabstand in cm
    let degreeToDistance = Math.PI * 5.6;
    let wheelBaseDistance = 12;
    let driveTurnFactor = 1.0;

    let driveMotorLeft = MotorPostion.M1;
    let driveMotorRight = MotorPostion.M2;
    // Drehrichtung, bei der das Rad vorwärts rollt (Motoren spiegelbildlich eingebaut)
    let driveFwdLeft = MovementDirection.CCW;
    let driveFwdRight = MovementDirection.CW;

    function __motorCommand(motor: number, b3: number, b4: number, b5: number, b6: number, b7: number): void {
        let buf = pins.createBuffer(8);
        buf[0] = 0xFF;
        buf[1] = 0xF9;
        buf[2] = motor;
        buf[3] = b3;
        buf[4] = b4;
        buf[5] = b5;
        buf[6] = b6;
        buf[7] = b7;
        pins.i2cWriteBuffer(NEZHA_ADDR, buf);
    }

    // Motor um einen Wert (Grad, Umdrehungen oder Sekunden) drehen
    function __move(motor: MotorPostion, direction: MovementDirection, value: number, mode: SportsMode): void {
        value = Math.round(value);
        __motorCommand(motor, direction, 0x70, (value >> 8) & 0xFF, mode, value & 0xFF);
    }

    // Motor dauerhaft mit Tempo 0..100 drehen
    function __start(motor: MotorPostion, direction: MovementDirection, speed: number): void {
        __motorCommand(motor, direction, 0x60, Math.floor(speed), 0xF5, 0x00);
    }

    function __stop(motor: MotorPostion): void {
        __motorCommand(motor, 0x00, 0x5F, 0x00, 0xF5, 0x00);
    }

    // Tempo für Bewegungen mit festem Weg (0..100 %)
    function __setServoSpeed(speed: number): void {
        if (speed < 0) speed = 0;
        speed *= 9;
        servoSpeedGlobal = speed;
        __motorCommand(0x00, 0x00, 0x77, (speed >> 8) & 0xFF, 0x00, speed & 0xFF);
    }

    // wartet, bis eine Bewegung mit festem Weg ungefähr fertig ist
    function __motorDelay(value: number, mode: SportsMode): void {
        let delayTime = 0;
        if (value == 0 || servoSpeedGlobal == 0) return;
        if (mode == SportsMode.Circle) {
            delayTime = value * 360000.0 / servoSpeedGlobal + 500;
        } else if (mode == SportsMode.Second) {
            delayTime = value * 1000;
        } else {
            delayTime = value * 1000.0 / servoSpeedGlobal + 500;
        }
        basic.pause(delayTime);
    }

    function __driveDirection(isLeft: boolean, forward: boolean): MovementDirection {
        let dir = isLeft ? driveFwdLeft : driveFwdRight;
        if (forward) return dir;
        return dir == MovementDirection.CW ? MovementDirection.CCW : MovementDirection.CW;
    }

    function __clamp(v: number, min: number, max: number): number {
        if (v < min) return min;
        if (v > max) return max;
        return v;
    }

    /**
     * Legt fest, an welchen Anschlüssen die beiden Antriebsmotoren stecken.
     * Dreht sich ein Rad beim Vorwärtsfahren rückwärts, diesen Motor auf „umgekehrt“ stellen.
     */
    //% subcategory="1 Motoren" color=#F7931E group="Einrichten"
    //% weight=100
    //% blockId=nezhaV2_drive_setup
    //% block="Motoren: links %left %leftMode rechts %right %rightMode"
    //% right.defl=nezhaV2.MotorPostion.M2
    //% inlineInputMode=inline
    export function driveSetup(left: MotorPostion, leftMode: MountMode, right: MotorPostion, rightMode: MountMode): void {
        driveMotorLeft = left;
        driveMotorRight = right;
        driveFwdLeft = leftMode == MountMode.Reversed ? MovementDirection.CW : MovementDirection.CCW;
        driveFwdRight = rightMode == MountMode.Reversed ? MovementDirection.CCW : MovementDirection.CW;
    }

    /**
     * Raddurchmesser und Abstand der beiden Räder (Mitte bis Mitte), beides mit dem Lineal messen.
     * Ohne diesen Block gilt: EV3-Rad 5,6 cm, Radabstand 12 cm.
     * @param diameter Raddurchmesser in cm, eg: 5.6
     * @param wheelBase Abstand der Räder in cm, eg: 12
     */
    //% subcategory="1 Motoren" color=#F7931E group="Einrichten"
    //% weight=99
    //% blockId=nezhaV2_drive_wheels
    //% block="Räder: Durchmesser %diameter cm Abstand %wheelBase cm"
    //% inlineInputMode=inline
    export function driveWheels(diameter: number, wheelBase: number): void {
        if (diameter > 0) degreeToDistance = Math.PI * diameter;
        if (wheelBase > 0) wheelBaseDistance = wheelBase;
    }

    /**
     * Korrektur für Drehungen: dreht der Roboter zu wenig, Wert erhöhen (z. B. 1.1), dreht er zu weit, verkleinern (z. B. 0.9)
     * @param factor Korrekturfaktor, eg: 1
     */
    //% subcategory="1 Motoren" color=#F7931E group="Einrichten"
    //% weight=98
    //% blockId=nezhaV2_drive_turn_calibration
    //% block="Drehkorrektur %factor"
    //% factor.defl=1
    export function driveTurnCalibration(factor: number): void {
        if (factor <= 0) factor = 1.0;
        driveTurnFactor = factor;
    }

    /**
     * Beide Räder drehen gleich schnell, bis „stoppe die Motoren“ kommt
     * @param speed Tempo in %, eg: 50
     */
    //% subcategory="1 Motoren" color=#F7931E group="Fahren"
    //% weight=90
    //% blockId=nezhaV2_drive_start
    //% block="fahre %direction mit %speed \\%"
    //% speed.min=0 speed.max=100 speed.defl=50
    export function driveStart(direction: DriveDirection, speed: number): void {
        speed = __clamp(speed, 0, 100);
        let forward = direction == DriveDirection.Forward;
        __start(driveMotorLeft, __driveDirection(true, forward), speed);
        __start(driveMotorRight, __driveDirection(false, forward), speed);
    }

    /**
     * Fährt eine feste Strecke, eine feste Zeit oder eine Anzahl Radumdrehungen und hält dann an
     * @param value Strecke, Zeit oder Umdrehungen, eg: 20
     * @param speed Tempo in %, eg: 50
     */
    //% subcategory="1 Motoren" color=#F7931E group="Fahren"
    //% weight=89
    //% blockId=nezhaV2_drive_move
    //% block="fahre %direction %value %unit mit %speed \\%"
    //% value.defl=20 speed.min=0 speed.max=100 speed.defl=50
    //% inlineInputMode=inline
    export function driveMove(direction: DriveDirection, value: number, unit: DriveUnit, speed: number): void {
        speed = __clamp(speed, 0, 100);
        if (speed <= 0 || value <= 0) return;
        __setServoSpeed(speed);
        let mode = SportsMode.Degree;
        if (unit == DriveUnit.Seconds) {
            mode = SportsMode.Second;
        } else if (unit == DriveUnit.Rotations) {
            mode = SportsMode.Circle;
        } else {
            value = 360 * value / degreeToDistance;
        }
        let forward = direction == DriveDirection.Forward;
        __move(driveMotorLeft, __driveDirection(true, forward), value, mode);
        __move(driveMotorRight, __driveDirection(false, forward), value, mode);
        __motorDelay(value, mode);
    }

    /**
     * Dreht den Roboter auf der Stelle (ein Rad vorwärts, eines rückwärts)
     * @param angle Winkel in Grad, eg: 90
     * @param speed Tempo in %, eg: 40
     */
    //% subcategory="1 Motoren" color=#F7931E group="Fahren"
    //% weight=88
    //% blockId=nezhaV2_drive_turn
    //% block="drehe %direction um %angle ° mit %speed \\%"
    //% angle.min=1 angle.max=360 angle.defl=90
    //% speed.min=0 speed.max=100 speed.defl=40
    //% inlineInputMode=inline
    export function driveTurn(direction: TurnDirection, angle: number, speed: number): void {
        speed = __clamp(speed, 0, 100);
        if (speed <= 0 || angle <= 0) return;
        // Bogenlänge eines Rades, umgerechnet in Motorgrad
        let arcDistance = angle * Math.PI / 180 * (wheelBaseDistance / 2);
        let motorDegrees = arcDistance * 360 * driveTurnFactor / degreeToDistance;
        __setServoSpeed(speed);
        let leftForward = direction == TurnDirection.Right;
        __move(driveMotorLeft, __driveDirection(true, leftForward), motorDegrees, SportsMode.Degree);
        __move(driveMotorRight, __driveDirection(false, !leftForward), motorDegrees, SportsMode.Degree);
        __motorDelay(motorDegrees, SportsMode.Degree);
    }

    /**
     * Jedes Rad bekommt ein eigenes Tempo (-100 bis 100 %). Unterschiedliche Werte ergeben eine Kurve.
     * @param speedLeft Tempo linkes Rad in %, eg: 50
     * @param speedRight Tempo rechtes Rad in %, eg: 30
     */
    //% subcategory="1 Motoren" color=#F7931E group="Fahren"
    //% weight=87
    //% blockId=nezhaV2_drive_steer
    //% block="fahre mit links %speedLeft \\% rechts %speedRight \\%"
    //% speedLeft.min=-100 speedLeft.max=100 speedLeft.defl=50
    //% speedRight.min=-100 speedRight.max=100 speedRight.defl=30
    //% inlineInputMode=inline
    export function driveSteer(speedLeft: number, speedRight: number): void {
        speedLeft = __clamp(speedLeft, -100, 100);
        speedRight = __clamp(speedRight, -100, 100);
        __start(driveMotorLeft, __driveDirection(true, speedLeft >= 0), Math.abs(speedLeft));
        __start(driveMotorRight, __driveDirection(false, speedRight >= 0), Math.abs(speedRight));
    }

    /**
     * Hält beide Antriebsmotoren an
     */
    //% subcategory="1 Motoren" color=#F7931E group="Fahren"
    //% weight=86
    //% blockId=nezhaV2_drive_stop
    //% block="stoppe die Motoren"
    export function driveStop(): void {
        __stop(driveMotorLeft);
        __stop(driveMotorRight);
    }

    /**
     * Ein einzelner Motor dreht dauerhaft, z. B. für einen Greifarm. Minus = andere Richtung.
     * @param speed Tempo in % (-100 bis 100), eg: 50
     */
    //% subcategory="1 Motoren" color=#F7931E group="Einzelmotor"
    //% weight=80
    //% blockId=nezhaV2_motor_run
    //% block="Motor %motor drehe mit %speed \\%"
    //% motor.defl=nezhaV2.MotorPostion.M3
    //% speed.min=-100 speed.max=100 speed.defl=50
    export function motorRun(motor: MotorPostion, speed: number): void {
        speed = __clamp(speed, -100, 100);
        __start(motor, speed >= 0 ? MovementDirection.CW : MovementDirection.CCW, Math.abs(speed));
    }

    /**
     * Ein einzelner Motor dreht um einen Winkel und hält dann an. Minus = andere Richtung.
     * @param angle Winkel in Grad, eg: 90
     * @param speed Tempo in %, eg: 30
     */
    //% subcategory="1 Motoren" color=#F7931E group="Einzelmotor"
    //% weight=79
    //% blockId=nezhaV2_motor_angle
    //% block="Motor %motor drehe um %angle ° mit %speed \\%"
    //% motor.defl=nezhaV2.MotorPostion.M3
    //% angle.defl=90 speed.min=0 speed.max=100 speed.defl=30
    //% inlineInputMode=inline
    export function motorTurnBy(motor: MotorPostion, angle: number, speed: number): void {
        speed = __clamp(speed, 0, 100);
        if (speed <= 0 || angle == 0) return;
        __setServoSpeed(speed);
        let dir = angle > 0 ? MovementDirection.CW : MovementDirection.CCW;
        let a = Math.abs(angle);
        __move(motor, dir, a, SportsMode.Degree);
        __motorDelay(a, SportsMode.Degree);
    }

    /**
     * Hält einen einzelnen Motor an
     */
    //% subcategory="1 Motoren" color=#F7931E group="Einzelmotor"
    //% weight=78
    //% blockId=nezhaV2_motor_stop
    //% block="Motor %motor stopp"
    //% motor.defl=nezhaV2.MotorPostion.M3
    export function motorStop(motor: MotorPostion): void {
        __stop(motor);
    }

    // ============================================================
    // 2 Liniensensor (ELECFREAKS PlanetX)
    // EF05019: 2-Kanal-Sensor an RJ11, Ausgang LOW = schwarze Linie
    // zwei EF05019 nebeneinander arbeiten wie ein 4-Kanal-Sensor
    // EF05053 „Trackbit“: 4-Kanal-Sensor an IIC, Adresse 0x1A, Register 4 = Kanalbits
    // ============================================================

    export enum RJPort {
        //% block="J1"
        J1 = 1,
        //% block="J2"
        J2 = 2,
        //% block="J3"
        J3 = 3,
        //% block="J4"
        J4 = 4
    }

    export enum LineChannel {
        //% block="1 (ganz links)"
        C1 = 1,
        //% block="2"
        C2 = 2,
        //% block="3"
        C3 = 3,
        //% block="4 (ganz rechts)"
        C4 = 4
    }

    export enum PxLine2State {
        //% block="◌ ◌"
        None = 0,
        //% block="● ◌"
        Left = 1,
        //% block="◌ ●"
        Right = 2,
        //% block="● ●"
        Both = 3
    }

    export enum PxLine4State {
        //% block="◌ ◌ ◌ ◌"
        S0 = 0,
        //% block="◌ ● ● ◌"
        S6 = 6,
        //% block="◌ ● ◌ ◌"
        S2 = 2,
        //% block="◌ ◌ ● ◌"
        S4 = 4,
        //% block="● ◌ ◌ ◌"
        S1 = 1,
        //% block="● ● ◌ ◌"
        S3 = 3,
        //% block="● ● ● ◌"
        S7 = 7,
        //% block="● ◌ ● ◌"
        S5 = 5,
        //% block="◌ ◌ ◌ ●"
        S8 = 8,
        //% block="◌ ◌ ● ●"
        S12 = 12,
        //% block="◌ ● ● ●"
        S14 = 14,
        //% block="◌ ● ◌ ●"
        S10 = 10,
        //% block="● ◌ ◌ ●"
        S9 = 9,
        //% block="● ● ● ●"
        S15 = 15,
        //% block="● ◌ ● ●"
        S13 = 13,
        //% block="● ● ◌ ●"
        S11 = 11
    }

    const PXLINE_ADDR = 0x1A;
    let pxLineType = 0;          // 0 = nicht eingerichtet, 2 = ein 2-Kanal-Sensor, 4 = Trackbit, 5 = zwei 2-Kanal-Sensoren
    let pxLinePins = [DigitalPin.P1, DigitalPin.P8, DigitalPin.P2, DigitalPin.P12];
    let pxLineMirrored = false;
    let pxLineLastPos = 0;
    let pxSteerGain = 0.5;       // sanfte Lenkung
    let pxCurSpeed = 0;          // aktuelles Tempo (sanftes Anfahren und Bremsen)
    let pxSteer = 0;             // geglättete Lenkung
    let pxLastFollow = 0;        // Zeit des letzten Folge-Schritts
    let pxLockUntil = 0;         // nach dem Abbiegen kurz keine neue Kreuzung melden

    function __rjPins(port: RJPort): DigitalPin[] {
        switch (port) {
            case RJPort.J2: return [DigitalPin.P2, DigitalPin.P12];
            case RJPort.J3: return [DigitalPin.P13, DigitalPin.P14];
            case RJPort.J4: return [DigitalPin.P15, DigitalPin.P16];
        }
        return [DigitalPin.P1, DigitalPin.P8];
    }

    function __pxRjPins(port: RJPort, first: number): void {
        let p = __rjPins(port);
        pxLinePins[first] = p[0];
        pxLinePins[first + 1] = p[1];
        pins.setPull(p[0], PinPullMode.PullUp);
        pins.setPull(p[1], PinPullMode.PullUp);
    }

    function __pxTrackbitBits(): number {
        pins.i2cWriteNumber(PXLINE_ADDR, 4, NumberFormat.Int8LE);
        return pins.i2cReadNumber(PXLINE_ADDR, NumberFormat.UInt8LE, false) & 0x0F;
    }

    // true, wenn vier Kanäle vorhanden sind (Trackbit oder zwei 2-Kanal-Sensoren)
    function __pxQuad(): boolean {
        return pxLineType == 4 || pxLineType == 5;
    }

    // Muster von hinten gesehen: Bit 0 = Kanal ganz links
    function __pxLineBits(): number {
        let v = 0;
        if (pxLineType == 2 || pxLineType == 5) {
            let n = pxLineType == 5 ? 4 : 2;
            for (let i = 0; i < n; i++) {
                if (pins.digitalReadPin(pxLinePins[i]) == 0) v |= 1 << i;
            }
            // gespiegelt: links und rechts innerhalb jedes Sensors tauschen
            if (pxLineMirrored) v = ((v & 5) << 1) | ((v & 10) >> 1);
        } else if (pxLineType == 4) {
            v = __pxTrackbitBits();
            if (pxLineMirrored) {
                v = ((v & 1) << 3) | ((v & 2) << 1) | ((v & 4) >> 1) | ((v & 8) >> 3);
            }
        }
        return v;
    }

    function __pxCount(v: number): number {
        let n = 0;
        for (let i = 0; i < 4; i++) {
            if (v & (1 << i)) n++;
        }
        return n;
    }

    /**
     * Zwei 2-Kanal-Liniensensoren nebeneinander. Sie arbeiten zusammen wie ein Sensor mit 4 Kanälen:
     * Kanal 1 und 2 am linken Sensor, Kanal 3 und 4 am rechten Sensor.
     */
    //% subcategory="2 Liniensensor" color=#795548 group="Einrichten"
    //% weight=100
    //% blockId=nezhaV2_pxline_setup_dual
    //% block="Liniensensoren: links an %left rechts an %right"
    //% left.fieldEditor="gridpicker" left.fieldOptions.columns=4
    //% right.fieldEditor="gridpicker" right.fieldOptions.columns=4
    //% right.defl=nezhaV2.RJPort.J2
    //% inlineInputMode=inline
    export function pxLineSetupDual(left: RJPort, right: RJPort): void {
        __pxRjPins(left, 0);
        __pxRjPins(right, 2);
        pxLineType = 5;
        pxLineLastPos = 0;
    }

    /**
     * Nur ein 2-Kanal-Liniensensor: Kanal 1 = links, Kanal 2 = rechts
     */
    //% subcategory="2 Liniensensor" color=#795548 group="Einrichten"
    //% weight=99
    //% blockId=nezhaV2_pxline_setup2
    //% block="ein Liniensensor an %port"
    //% port.fieldEditor="gridpicker" port.fieldOptions.columns=4
    export function pxLineSetup2(port: RJPort): void {
        __pxRjPins(port, 0);
        pxLineType = 2;
        pxLineLastPos = 0;
    }

    /**
     * 4-Kanal-Liniensensor „Trackbit“ am IIC-Anschluss. Vorher mit seiner Lerntaste auf Linie und Boden einlernen.
     */
    //% subcategory="2 Liniensensor" color=#795548 group="Einrichten"
    //% weight=98
    //% blockId=nezhaV2_pxline_setup4
    //% block="Trackbit-Liniensensor an IIC"
    export function pxLineSetup4(): void {
        pxLineType = 4;
        pxLineLastPos = 0;
    }

    /**
     * Tauscht links und rechts, falls der Sensor andersherum eingebaut ist.
     * Prüfen: Liegt die Linie links, muss die Linienposition negativ sein.
     */
    //% subcategory="2 Liniensensor" color=#795548 group="Einrichten"
    //% weight=97
    //% blockId=nezhaV2_pxline_mirror
    //% block="Liniensensor gespiegelt %on"
    //% on.shadow="toggleOnOff" on.defl=false
    export function pxLineMirror(on: boolean): void {
        pxLineMirrored = on;
    }

    /**
     * Wie stark der Roboter beim Linienfolgen lenkt: klein = sanfte Bögen, groß = scharfe Reaktionen
     * @param gain Lenkstärke, eg: 0.5
     */
    //% subcategory="2 Liniensensor" color=#795548 group="Einrichten"
    //% weight=96
    //% blockId=nezhaV2_pxline_steering
    //% block="Lenkstärke %gain"
    //% gain.min=0.1 gain.max=2 gain.defl=0.5
    export function pxLineSteering(gain: number): void {
        pxSteerGain = __clamp(gain, 0.1, 2);
    }

    /**
     * true, wenn dieser Kanal über der schwarzen Linie ist. Kanäle von links nach rechts gezählt.
     */
    //% subcategory="2 Liniensensor" color=#795548 group="Abfragen"
    //% weight=90
    //% blockId=nezhaV2_pxline_seen
    //% block="Kanal %channel sieht die Linie"
    //% channel.fieldEditor="gridpicker" channel.fieldOptions.columns=4
    export function pxLineSeen(channel: LineChannel): boolean {
        return (__pxLineBits() & (1 << (channel - 1))) != 0;
    }

    /**
     * true, wenn die vier Kanäle genau dieses Muster zeigen, von links nach rechts (● = Linie, ◌ = Boden)
     */
    //% subcategory="2 Liniensensor" color=#795548 group="Abfragen"
    //% weight=89
    //% blockId=nezhaV2_pxline4_is
    //% block="4 Kanäle zeigen %state"
    //% state.fieldEditor="gridpicker" state.fieldOptions.columns=4
    export function pxLine4Is(state: PxLine4State): boolean {
        if (!__pxQuad()) return false;
        return __pxLineBits() == state;
    }

    /**
     * Nur für einen einzelnen 2-Kanal-Sensor: true, wenn er genau dieses Muster zeigt (● = Linie, ◌ = Boden)
     */
    //% subcategory="2 Liniensensor" color=#795548 group="Abfragen"
    //% weight=88
    //% blockId=nezhaV2_pxline2_is
    //% block="2 Kanäle zeigen %state"
    //% state.fieldEditor="gridpicker" state.fieldOptions.columns=2
    export function pxLine2Is(state: PxLine2State): boolean {
        if (pxLineType != 2) return false;
        return __pxLineBits() == state;
    }

    /**
     * Wo liegt die Linie? -100 = ganz links, 0 = Mitte, 100 = ganz rechts.
     * Sieht kein Kanal die Linie, bleibt eine äußere Lage erhalten (scharfe Kurve), sonst 0.
     */
    //% subcategory="2 Liniensensor" color=#795548 group="Abfragen"
    //% weight=87
    //% blockId=nezhaV2_pxline_position
    //% block="Linienposition (-100 … 100)"
    export function pxLinePosition(): number {
        let v = __pxLineBits();
        if (pxLineType == 2) {
            if (v == 1) pxLineLastPos = -100;
            else if (v == 2) pxLineLastPos = 100;
            else pxLineLastPos = 0;
            return pxLineLastPos;
        }
        if (__pxQuad() && v != 0) {
            // Lage der Kanäle von links nach rechts: -100, -33, 33, 100
            let sum = 0;
            let count = 0;
            if (v & 1) { sum -= 100; count++; }
            if (v & 2) { sum -= 33; count++; }
            if (v & 4) { sum += 33; count++; }
            if (v & 8) { sum += 100; count++; }
            pxLineLastPos = Math.round(sum / count);
        } else if (__pxQuad() && Math.abs(pxLineLastPos) < 50) {
            // Linie zwischen den Kanälen oder Lücke: geradeaus
            pxLineLastPos = 0;
        }
        return pxLineLastPos;
    }

    /**
     * true, wenn kein Kanal die Linie sieht (Lücke oder Linie verlassen)
     */
    //% subcategory="2 Liniensensor" color=#795548 group="Abfragen"
    //% weight=86
    //% blockId=nezhaV2_pxline_lost
    //% block="Linie verloren"
    export function pxLineLost(): boolean {
        return __pxLineBits() == 0;
    }

    /**
     * true an einer Kreuzung oder T-Kreuzung (beide äußeren Kanäle oder drei Kanäle sehen die Linie)
     */
    //% subcategory="2 Liniensensor" color=#795548 group="Abfragen"
    //% weight=85
    //% blockId=nezhaV2_pxline_cross
    //% block="Kreuzung erkannt"
    export function pxLineIntersection(): boolean {
        let v = __pxLineBits();
        if (pxLineType == 2) return v == 3;
        if (__pxQuad()) return (v & 9) == 9 || __pxCount(v) >= 3;
        return false;
    }

    /**
     * true an einer Kreuzung, an der eine Linie zu dieser Seite abgeht.
     * Direkt nach dem Abbiegen kurz false, damit dieselbe Kreuzung nicht doppelt zählt.
     */
    //% subcategory="2 Liniensensor" color=#795548 group="Abfragen"
    //% weight=84
    //% blockId=nezhaV2_pxline_branch
    //% block="Abzweig nach %direction"
    export function pxLineBranch(direction: TurnDirection): boolean {
        if (input.runningTime() < pxLockUntil) return false;
        if (!pxLineIntersection()) return false;
        if (pxLineType == 2) return true;   // zwei Kanäle können die Seiten nicht unterscheiden
        let v = __pxLineBits();
        if (direction == TurnDirection.Right) return (v & 8) != 0;
        return (v & 1) != 0;
    }

    /**
     * Ein Schritt Linienfolgen, immer in einer Schleife verwenden.
     * Fährt weich an, lenkt in sanften Bögen und fährt über Kreuzungen geradeaus.
     * @param speed Tempo in %, eg: 30
     */
    //% subcategory="2 Liniensensor" color=#795548 group="Fahren"
    //% weight=80
    //% blockId=nezhaV2_pxline_follow
    //% block="folge der Linie mit %speed \\%"
    //% speed.min=0 speed.max=100 speed.defl=30
    export function pxLineFollow(speed: number): void {
        speed = __clamp(speed, 0, 100);
        let now = input.runningTime();
        if (now - pxLastFollow > 500) {
            // nach einer Pause wieder langsam anfahren
            pxCurSpeed = 0;
            pxSteer = 0;
        }
        pxLastFollow = now;
        if (pxCurSpeed < speed) pxCurSpeed = Math.min(speed, pxCurSpeed + 2);
        else pxCurSpeed = speed;
        let target = 0;
        if (!pxLineIntersection()) {
            target = pxLinePosition() * pxCurSpeed * pxSteerGain / 100;
        }
        pxSteer += (target - pxSteer) * 0.3;
        // das innere Rad dreht nie rückwärts: weiche Bögen statt Drehen auf der Stelle
        let left = __clamp(pxCurSpeed + pxSteer, 0, 100);
        let right = __clamp(pxCurSpeed - pxSteer, 0, 100);
        driveSteer(Math.round(left), Math.round(right));
    }

    /**
     * Biegt an einer Kreuzung in einem weichen Bogen ab: bremst sanft, fährt einen Bogen
     * und hört auf zu drehen, sobald die neue Linie unter dem Sensor liegt.
     * @param speed Tempo in %, eg: 25
     */
    //% subcategory="2 Liniensensor" color=#795548 group="Fahren"
    //% weight=79
    //% blockId=nezhaV2_pxline_turn
    //% block="biege %direction ab mit %speed \\%"
    //% speed.min=5 speed.max=100 speed.defl=25
    export function pxLineTurn(direction: TurnDirection, speed: number): void {
        if (pxLineType == 0) return;
        speed = __clamp(speed, 5, 100);
        // sanft auf Abbiegetempo bremsen
        while (pxCurSpeed > speed) {
            pxCurSpeed -= 2;
            driveSteer(pxCurSpeed, pxCurSpeed);
            basic.pause(10);
        }
        driveSteer(speed, speed);
        basic.pause(100);
        // Bogen: äußeres Rad volles Abbiegetempo, inneres Rad ein Viertel
        let inner = Math.round(speed / 4);
        if (direction == TurnDirection.Right) driveSteer(speed, inner);
        else driveSteer(inner, speed);
        let end = input.runningTime() + 2000;
        if (__pxQuad()) {
            // erst die alte Linie mit den inneren Kanälen verlassen, dann die neue finden
            while ((__pxLineBits() & 6) != 0 && input.runningTime() < end) basic.pause(5);
            end = input.runningTime() + 4000;
            while ((__pxLineBits() & 6) == 0 && input.runningTime() < end) basic.pause(5);
        } else {
            let lead = direction == TurnDirection.Right ? 2 : 1;
            while (__pxLineBits() != 0 && input.runningTime() < end) basic.pause(5);
            end = input.runningTime() + 4000;
            while ((__pxLineBits() & lead) == 0 && input.runningTime() < end) basic.pause(5);
            end = input.runningTime() + 1500;
            while ((__pxLineBits() & lead) != 0 && input.runningTime() < end) basic.pause(5);
        }
        // ohne Anhalten weiterfahren
        pxCurSpeed = speed;
        pxSteer = 0;
        pxLastFollow = input.runningTime();
        pxLockUntil = pxLastFollow + 800;
    }

    // ============================================================
    // 3 Farbsensor (ELECFREAKS PlanetX, IIC)
    // neueres Modul: I2C 0x43 · älteres Modul: APDS9960 auf I2C 0x39
    // Registerfolgen wie in der offiziellen Erweiterung pxt-PlanetX
    // ============================================================

    export enum PlanetXColor {
        //% block="rot"
        Red = 1,
        //% block="gelb"
        Yellow = 2,
        //% block="grün"
        Green = 3,
        //% block="cyan"
        Cyan = 4,
        //% block="blau"
        Blue = 5,
        //% block="magenta"
        Magenta = 6,
        //% block="weiß"
        White = 7
    }

    export enum ColorChannel {
        //% block="rot"
        Red = 1,
        //% block="grün"
        Green = 2,
        //% block="blau"
        Blue = 3,
        //% block="Helligkeit"
        Brightness = 4
    }

    const PX_ADDR_NEW = 0x43;
    const PX_ADDR_APDS = 0x39;
    let pxColorMode = 0;         // 0 = noch nicht gesucht, 1 = Modul 0x43, 2 = APDS9960, -1 = nicht gefunden
    let pxRaw = [0, 0, 0, 0];    // Helligkeit, rot, grün, blau (korrigiert)
    let pxScaled = [0, 0, 0];    // rot, grün, blau 0..255

    function __i2cWrite8(addr: number, reg: number, value: number): void {
        let buf = pins.createBuffer(2);
        buf[0] = reg;
        buf[1] = value;
        pins.i2cWriteBuffer(addr, buf);
    }

    function __pxRead8(addr: number, reg: number): number {
        pins.i2cWriteNumber(addr, reg, NumberFormat.UInt8BE);
        return pins.i2cReadNumber(addr, NumberFormat.UInt8BE);
    }

    function __pxRead16(addr: number, regLow: number): number {
        return __pxRead8(addr, regLow) + __pxRead8(addr, regLow + 1) * 256;
    }

    function __pxColorInit(): void {
        if (pxColorMode != 0) return;
        // neueres Modul auf 0x43
        let i = 0;
        while (i++ < 10) {
            __i2cWrite8(PX_ADDR_NEW, 0x81, 0xCA);
            __i2cWrite8(PX_ADDR_NEW, 0x80, 0x17);
            basic.pause(50);
            if (__pxRead16(PX_ADDR_NEW, 0xA4) != 0) {
                pxColorMode = 1;
                return;
            }
        }
        // älteres Modul: APDS9960, ID-Register 0x92
        let id = __pxRead8(PX_ADDR_APDS, 0x92);
        if (id == 0xAB || id == 0x9C || id == 0xA8) {
            __i2cWrite8(PX_ADDR_APDS, 0x81, 252);  // ATIME
            __i2cWrite8(PX_ADDR_APDS, 0x8F, 0x03); // CONTROL: Verstärkung
            __i2cWrite8(PX_ADDR_APDS, 0x80, 0x00); // ENABLE aus
            __i2cWrite8(PX_ADDR_APDS, 0xAB, 0x00); // GCONF4
            __i2cWrite8(PX_ADDR_APDS, 0xE7, 0x00); // AICLEAR
            __i2cWrite8(PX_ADDR_APDS, 0x80, 0x01); // einschalten
            let tmp = __pxRead8(PX_ADDR_APDS, 0x80) | 0x02; // Farbmessung aktivieren
            __i2cWrite8(PX_ADDR_APDS, 0x80, tmp);
            pxColorMode = 2;
            return;
        }
        pxColorMode = -1;
    }

    function __pxColorMeasure(): void {
        __pxColorInit();
        let c = 0, r = 0, g = 0, b = 0;
        if (pxColorMode == 1) {
            basic.pause(100);
            c = __pxRead16(PX_ADDR_NEW, 0xA6);
            r = __pxRead16(PX_ADDR_NEW, 0xA0);
            g = __pxRead16(PX_ADDR_NEW, 0xA2);
            b = __pxRead16(PX_ADDR_NEW, 0xA4);
            // Kanalkorrektur der offiziellen Erweiterung
            r *= 1.3 * 0.47 * 0.83;
            g *= 0.69 * 0.56 * 0.83;
            b *= 0.80 * 0.415 * 0.83;
            c *= 0.3;
            if (r > b && r > g) {
                b *= 1.18;
                g *= 0.95;
            }
        } else if (pxColorMode == 2) {
            let ready = __pxRead8(PX_ADDR_APDS, 0x93) & 0x01;
            let guard = 0;
            while (!ready && guard++ < 50) {
                basic.pause(5);
                ready = __pxRead8(PX_ADDR_APDS, 0x93) & 0x01;
            }
            c = __pxRead16(PX_ADDR_APDS, 0x94);
            r = __pxRead16(PX_ADDR_APDS, 0x96);
            g = __pxRead16(PX_ADDR_APDS, 0x98);
            b = __pxRead16(PX_ADDR_APDS, 0x9A);
        }
        pxRaw = [c, r, g, b];
        // über den Helligkeitskanal auf 0..255 skalieren
        let avg = c / 3;
        if (avg <= 0) {
            pxScaled = [0, 0, 0];
        } else {
            pxScaled = [
                Math.min(255, Math.round(r * 255 / avg)),
                Math.min(255, Math.round(g * 255 / avg)),
                Math.min(255, Math.round(b * 255 / avg))
            ];
        }
    }

    function __colorHue(r: number, g: number, b: number): number {
        let max = Math.max(r, Math.max(g, b));
        let min = Math.min(r, Math.min(g, b));
        let d = max - min;
        if (d == 0) return 0;
        let h = 0;
        if (max == r) {
            h = 60 * ((g - b) / d);
        } else if (max == g) {
            h = 60 * ((b - r) / d + 2);
        } else {
            h = 60 * ((r - g) / d + 4);
        }
        if (h < 0) h += 360;
        return Math.round(h);
    }

    /**
     * true, wenn der Farbsensor diese Farbe sieht
     */
    //% subcategory="3 Farbsensor" color=#9C27B0 group="Erkennen"
    //% weight=100
    //% blockId=nezhaV2_px_color_is
    //% block="Farbsensor erkennt %color"
    //% color.fieldEditor="gridpicker" color.fieldOptions.columns=3
    export function planetXColorIs(color: PlanetXColor): boolean {
        let hue = planetXColorHue();
        if (pxColorMode < 0) return false;
        switch (color) {
            case PlanetXColor.Red: return hue > 330 || hue < 20;
            case PlanetXColor.Yellow: return hue > 30 && hue < 120;
            case PlanetXColor.Green: return hue > 120 && hue < 180;
            case PlanetXColor.Cyan: return hue > 190 && hue < 210;
            case PlanetXColor.Blue: return hue > 210 && hue < 270;
            case PlanetXColor.Magenta: return hue > 260 && hue < 330;
            case PlanetXColor.White: return hue >= 180 && hue < 190;
        }
        return false;
    }

    /**
     * Misst einen Farbanteil (rot, grün, blau: 0 bis 255) oder die Helligkeit
     */
    //% subcategory="3 Farbsensor" color=#9C27B0 group="Messen"
    //% weight=90
    //% blockId=nezhaV2_px_color_value
    //% block="Farbsensor %channel"
    export function planetXColorValue(channel: ColorChannel): number {
        __pxColorMeasure();
        if (channel == ColorChannel.Brightness) return Math.round(pxRaw[0]);
        return pxScaled[channel - 1];
    }

    /**
     * Farbton in Grad: 0 = rot, 60 = gelb, 120 = grün, 240 = blau
     */
    //% subcategory="3 Farbsensor" color=#9C27B0 group="Messen"
    //% weight=89
    //% blockId=nezhaV2_px_color_hue
    //% block="Farbsensor Farbton (0–360°)"
    export function planetXColorHue(): number {
        __pxColorMeasure();
        if (pxColorMode < 0) return 0;
        return __colorHue(pxScaled[0], pxScaled[1], pxScaled[2]);
    }

    /**
     * true, wenn ein Farbsensor am IIC-Anschluss gefunden wurde
     */
    //% subcategory="3 Farbsensor" color=#9C27B0 group="Messen"
    //% weight=88
    //% blockId=nezhaV2_px_color_connected
    //% block="Farbsensor angeschlossen"
    export function planetXColorConnected(): boolean {
        __pxColorInit();
        return pxColorMode > 0;
    }

    // ============================================================
    // 4 Ultraschall (ELECFREAKS PlanetX, RJ11)
    // ============================================================

    let ultrasonicLast = [0, 0, 0, 0, 0];

    /**
     * Misst die Entfernung zum nächsten Hindernis in cm (0 = kein Echo, zu weit weg)
     */
    //% subcategory="4 Ultraschall" color=#00A0E9 group="Messen"
    //% weight=100
    //% blockId=nezhaV2_ultrasonic_distance
    //% block="Ultraschall an %port Entfernung (cm)"
    //% port.fieldEditor="gridpicker" port.fieldOptions.columns=4
    //% port.defl=nezhaV2.RJPort.J3
    export function ultrasonicDistance(port: RJPort): number {
        let p = __rjPins(port);
        let trig = p[0];
        let echo = p[1];
        pins.setPull(trig, PinPullMode.PullNone);
        pins.digitalWritePin(trig, 0);
        control.waitMicros(2);
        pins.digitalWritePin(trig, 1);
        control.waitMicros(10);
        pins.digitalWritePin(trig, 0);
        // höchstens etwa 4 m -> 25 ms warten
        let d = pins.pulseIn(echo, PulseValue.High, 25000);
        let distance = d * 34 / 2 / 1000;
        if (control.hardwareVersion() == "1") {
            distance = distance * 3 / 2;
        }
        if (distance > 430) distance = 0;
        // einzelne Fehlmessungen liefern den letzten gültigen Wert
        if (distance == 0) {
            distance = ultrasonicLast[port];
            ultrasonicLast[port] = 0;
        } else {
            ultrasonicLast[port] = distance;
        }
        return Math.round(distance);
    }

    /**
     * true, wenn ein Hindernis näher als der angegebene Abstand ist
     * @param value Abstand in cm, eg: 10
     */
    //% subcategory="4 Ultraschall" color=#00A0E9 group="Erkennen"
    //% weight=90
    //% blockId=nezhaV2_ultrasonic_obstacle
    //% block="Ultraschall an %port Hindernis näher als %value cm"
    //% port.fieldEditor="gridpicker" port.fieldOptions.columns=4
    //% port.defl=nezhaV2.RJPort.J3
    //% value.min=1 value.max=400 value.defl=10
    export function ultrasonicObstacle(port: RJPort, value: number): boolean {
        let distance = ultrasonicDistance(port);
        return distance > 0 && distance < value;
    }

    // ============================================================
    // 5 Display (OLED 0,96", SSD1306, 128 × 64, I2C)
    // eigener Treiber ohne fremde Erweiterung
    // 5×7-Schrift für ASCII 32 bis 126, 5 Byte pro Zeichen (Bit 0 = obere Pixelreihe)
    // ============================================================

    export enum DisplayOrientation {
        //% block="normal"
        Normal = 0,
        //% block="gespiegelt"
        Mirrored = 1,
        //% block="auf dem Kopf"
        UpsideDown = 2,
        //% block="auf dem Kopf gespiegelt"
        UpsideDownMirrored = 3
    }

    const OLED_FONT = hex`00000000005E000000000600060000143C751F04005C7C74000E1A7C5820304E5262500600000000007F000000003E000000000C1E120010107C1010004000000010101000000040000000006018060018664A7E0000427E40004062524E004052527E002028267E20404E4A7A00187E5272000242320E00207E527E00044E4A3E000048000000004800000000303048002828282828484830300000025A0600784C343438603C263840007E527E00107E4242007E42423C00007E525200007E12120018664272007E10107E0000427E42004042423E007E181C6240007E4040407E0E180E7E7E0E187E001866427E00007E0A0E041866427E007E0A0A3E40044E5A720002027E02021E60407E00023C601C021E7018700E4026182640020C78060000625A4642007F410000000C304000417F0000000004020400000000000000000000002078587800007F48780000784848003078487F00307858580000087F09003078487800007F08780000487940000008790000007F10680000017F4000780878087000780878002078487800007848780030784878007818080800005848680008087C480000784078000830403800186030601800683048000030603800004848480000087F41007F0000000000417F08001010101010`;

    let oledAddr = 0x3C;
    let oledReady = false;
    let oledBig = false;
    let oledSeg = 0xA1;          // Spalten-Reihenfolge
    let oledCom = 0xC8;          // Zeilen-Reihenfolge
    let oledInverted = false;

    // mehrere Befehle in einem I2C-Paket
    function __oledCmds(cmds: number[]): void {
        let b = pins.createBuffer(cmds.length + 1);
        b[0] = 0x00;
        for (let i = 0; i < cmds.length; i++) b[i + 1] = cmds[i];
        pins.i2cWriteBuffer(oledAddr, b);
    }

    // schreibt eine Seite (Zeile aus 8 Pixelreihen) ab Spalte 0.
    // Vorher werden Ausrichtung und Grundeinstellungen neu gesendet: Hat eine Störung auf
    // der Leitung einen falschen Befehl ausgelöst, ist er so mit der nächsten Zeile wieder behoben.
    function __oledWritePage(page: number, data: Buffer): void {
        __oledCmds([0x20, 0x02, 0x8D, 0x14, oledSeg, oledCom, oledInverted ? 0xA7 : 0xA6, 0xAF,
            0xB0 | page, 0x00, 0x10]);
        let out = pins.createBuffer(data.length + 1);
        out[0] = 0x40;
        for (let i = 0; i < data.length; i++) {
            out[i + 1] = data[i];
        }
        pins.i2cWriteBuffer(oledAddr, out);
    }

    // verdoppelt die Pixel einer Spalte: half 0 = obere Hälfte, half 1 = untere Hälfte
    function __oledStretch(b: number, half: number): number {
        let out = 0;
        for (let i = 0; i < 4; i++) {
            if ((b >> (half * 4 + i)) & 1) {
                out |= 3 << (i * 2);
            }
        }
        return out;
    }

    function __oledFontByte(charCode: number, column: number): number {
        if (charCode < 32 || charCode > 126) charCode = 32;
        return OLED_FONT[(charCode - 32) * 5 + column];
    }

    function __oledLine(line: number): number {
        return __clamp(Math.round(line), 0, 7);
    }

    /**
     * Schaltet das Display ein. Die meisten Displays haben die Adresse 60, manche 61.
     * @param address I2C-Adresse des Displays, eg: 60
     */
    //% subcategory="5 Display" color=#5C6BC0 group="Einrichten"
    //% weight=100
    //% blockId=nezhaV2_oled_start
    //% block="Display starten (Adresse %address)"
    //% address.defl=60
    export function displayStart(address: number): void {
        oledAddr = address;
        __oledCmds([0xAE]);                  // Display aus
        __oledCmds([0xD5, 0x80]);            // Takt
        __oledCmds([0xA8, 0x3F]);            // 64 Zeilen
        __oledCmds([0xD3, 0x00]);            // kein Versatz
        __oledCmds([0x40]);                  // Startzeile 0
        __oledCmds([0x8D, 0x14]);            // Ladungspumpe an
        __oledCmds([0x20, 0x02]);            // Seitenadressierung
        __oledCmds([oledSeg, oledCom]);      // Ausrichtung
        __oledCmds([0xDA, 0x12]);            // COM-Pins
        __oledCmds([0x81, 0x7F]);            // Helligkeit
        __oledCmds([0xD9, 0xF1]);            // Vorladung
        __oledCmds([0xDB, 0x40]);            // VCOM
        __oledCmds([0xA4]);                  // Bildspeicher anzeigen
        __oledCmds([oledInverted ? 0xA7 : 0xA6]);
        __oledCmds([0xAF]);                  // Display an
        oledReady = true;
        displayClear();
    }

    /**
     * Löscht das ganze Display
     */
    //% subcategory="5 Display" color=#5C6BC0 group="Einrichten"
    //% weight=99
    //% blockId=nezhaV2_oled_clear
    //% block="Display löschen"
    export function displayClear(): void {
        if (!oledReady) return;
        let empty = pins.createBuffer(128);
        for (let page = 0; page < 8; page++) {
            __oledWritePage(page, empty);
        }
    }

    /**
     * Große Schrift: 4 Zeilen mit je 10 Zeichen. Kleine Schrift: 8 Zeilen mit je 21 Zeichen.
     */
    //% subcategory="5 Display" color=#5C6BC0 group="Einrichten"
    //% weight=98
    //% blockId=nezhaV2_oled_big
    //% block="große Schrift %big"
    //% big.shadow="toggleOnOff" big.defl=false
    export function displayBigFont(big: boolean): void {
        oledBig = big;
    }

    /**
     * Dreht oder spiegelt die Anzeige, damit sie zur Einbaulage am Roboter passt
     */
    //% subcategory="5 Display" color=#5C6BC0 group="Einrichten"
    //% weight=97
    //% blockId=nezhaV2_oled_orientation
    //% block="Display Ausrichtung %mode"
    export function displayOrientation(mode: DisplayOrientation): void {
        let upside = mode == DisplayOrientation.UpsideDown || mode == DisplayOrientation.UpsideDownMirrored;
        let mirror = mode == DisplayOrientation.Mirrored || mode == DisplayOrientation.UpsideDownMirrored;
        // normal: Spalten A1, Zeilen C8 · auf dem Kopf: A0, C0 · gespiegelt: nur die Spalten tauschen
        oledSeg = upside ? 0xA0 : 0xA1;
        oledCom = upside ? 0xC0 : 0xC8;
        if (mirror) oledSeg = oledSeg == 0xA1 ? 0xA0 : 0xA1;
        if (oledReady) __oledCmds([oledSeg, oledCom]);
    }

    /**
     * Helligkeit des Displays (0 bis 255)
     * @param value Helligkeit, eg: 127
     */
    //% subcategory="5 Display" color=#5C6BC0 group="Einrichten"
    //% weight=96
    //% blockId=nezhaV2_oled_contrast
    //% block="Display Helligkeit %value"
    //% value.min=0 value.max=255 value.defl=127
    export function displayContrast(value: number): void {
        if (!oledReady) return;
        __oledCmds([0x81, __clamp(Math.round(value), 0, 255)]);
    }

    /**
     * Weiße Schrift auf Schwarz (aus) oder schwarze Schrift auf Weiß (an)
     */
    //% subcategory="5 Display" color=#5C6BC0 group="Einrichten"
    //% weight=95
    //% blockId=nezhaV2_oled_invert
    //% block="Display invertiert %on"
    //% on.shadow="toggleOnOff" on.defl=false
    export function displayInvert(on: boolean): void {
        oledInverted = on;
        if (oledReady) __oledCmds([on ? 0xA7 : 0xA6]);
    }

    /**
     * Schreibt einen Text in eine Zeile (Zeile 0 ist oben). Umlaute werden als Leerzeichen gezeigt, besser ae, oe, ue schreiben.
     * @param text Text, eg: "Hallo"
     * @param line Zeile (klein 0–7, groß 0–3), eg: 0
     */
    //% subcategory="5 Display" color=#5C6BC0 group="Anzeigen"
    //% weight=90
    //% blockId=nezhaV2_oled_text
    //% block="zeige %text in Zeile %line"
    //% line.min=0 line.max=7 line.defl=0
    //% inlineInputMode=inline
    export function displayText(text: string, line: number): void {
        if (!oledReady) return;
        if (oledBig) {
            line = __clamp(Math.round(line), 0, 3);
            let upper = pins.createBuffer(128);
            let lower = pins.createBuffer(128);
            let x = 0;
            for (let n = 0; n < text.length && x <= 116; n++) {
                let code = text.charCodeAt(n);
                for (let c = 0; c < 5; c++) {
                    let b = __oledFontByte(code, c);
                    upper[x] = __oledStretch(b, 0);
                    upper[x + 1] = upper[x];
                    lower[x] = __oledStretch(b, 1);
                    lower[x + 1] = lower[x];
                    x += 2;
                }
                x += 2; // Abstand zwischen den Zeichen
            }
            __oledWritePage(line * 2, upper);
            __oledWritePage(line * 2 + 1, lower);
        } else {
            line = __oledLine(line);
            let row = pins.createBuffer(128);
            let pos = 0;
            for (let n = 0; n < text.length && pos <= 122; n++) {
                let code = text.charCodeAt(n);
                for (let c = 0; c < 5; c++) {
                    row[pos + c] = __oledFontByte(code, c);
                }
                pos += 6; // 5 Pixel plus Abstand
            }
            __oledWritePage(line, row);
        }
    }

    /**
     * Schreibt eine Bezeichnung und einen Wert, z. B. „Abstand: 23“
     * @param label Bezeichnung, eg: "Wert"
     * @param line Zeile, eg: 0
     */
    //% subcategory="5 Display" color=#5C6BC0 group="Anzeigen"
    //% weight=89
    //% blockId=nezhaV2_oled_value
    //% block="zeige %label = %value in Zeile %line"
    //% line.min=0 line.max=7 line.defl=0
    //% inlineInputMode=inline
    export function displayValue(label: string, value: number, line: number): void {
        displayText(label + ": " + value, line);
    }

    /**
     * Zeichnet einen Balken über die ganze Breite, z. B. für einen Sensorwert
     * @param value aktueller Wert, eg: 50
     * @param max Wert für einen vollen Balken, eg: 100
     * @param line Zeile (0–7), eg: 3
     */
    //% subcategory="5 Display" color=#5C6BC0 group="Anzeigen"
    //% weight=88
    //% blockId=nezhaV2_oled_bar
    //% block="zeige Balken %value von %max in Zeile %line"
    //% max.defl=100 line.min=0 line.max=7 line.defl=3
    //% inlineInputMode=inline
    export function displayBar(value: number, max: number, line: number): void {
        if (!oledReady) return;
        line = __oledLine(line);
        if (max <= 0) max = 1;
        value = __clamp(value, 0, max);
        let fill = Math.round(value * 125 / max);
        let row = pins.createBuffer(128);
        for (let x = 0; x < 128; x++) {
            if (x == 0 || x == 127) row[x] = 0x7E;        // Rahmen links und rechts
            else if (x <= fill) row[x] = 0x7E;           // gefüllter Teil
            else row[x] = 0x42;                          // leerer Teil: oberer und unterer Rand
        }
        __oledWritePage(line, row);
    }

    /**
     * Zeigt die Kanäle des Liniensensors von links nach rechts (# = Linie, . = Boden) und die Linienposition
     * @param line Zeile (0–7), eg: 2
     */
    //% subcategory="5 Display" color=#5C6BC0 group="Anzeigen"
    //% weight=87
    //% blockId=nezhaV2_oled_pxline
    //% block="zeige Liniensensor in Zeile %line"
    //% line.min=0 line.max=7 line.defl=2
    export function displayPxLine(line: number): void {
        if (pxLineType == 0) {
            displayText("Liniensensor fehlt", line);
            return;
        }
        let v = __pxLineBits();
        let t = "";
        let n = __pxQuad() ? 4 : 2;
        for (let c = 0; c < n; c++) {
            t = t + ((v & (1 << c)) ? "#" : ".");
        }
        displayText(t + "  pos " + pxLinePosition(), line);
    }

    // ============================================================
    // 6 Rescue Line (RoboCupJunior Line / Line Entry)
    // nutzt den Liniensensor aus „2 Liniensensor“ und den Farbsensor aus „3 Farbsensor“
    // Lücken bis 20 cm, Kreuzungen mit grünen Markierungen, Hindernisse, Rampen bis 25°
    // ============================================================

    export enum ExitDirection {
        //% block="nach links"
        Left = 1,
        //% block="geradeaus"
        Straight = 2,
        //% block="nach rechts"
        Right = 3
    }

    export enum FieldColor {
        //% block="schwarz (Linie)"
        Black = 1,
        //% block="weiß (Boden)"
        White = 2,
        //% block="grün (Markierung)"
        Green = 3,
        //% block="rot (Ziel)"
        Red = 4,
        //% block="silber (Rettungszone)"
        Silver = 5
    }

    let lineDarkLevel = 400;
    let lineBrightLevel = 1200;
    let lineSilverLevel = 2600;

    // linke Seite, Mitte, rechte Seite des Liniensensors
    function __lineLeft(): boolean {
        return (__pxLineBits() & 1) != 0;
    }

    function __lineRight(): boolean {
        return (__pxLineBits() & (__pxQuad() ? 8 : 2)) != 0;
    }

    function __lineMiddle(): boolean {
        return __pxQuad() && (__pxLineBits() & 6) != 0;
    }

    // geschätzte Fahrzeit für eine Strecke aus Radumfang und Tempo
    function __driveTimeMs(cm: number, speed: number): number {
        if (speed <= 0) return 0;
        let cmPerSecond = speed * 9 / 360 * degreeToDistance;
        return cm / cmPerSecond * 1000;
    }

    /**
     * Helligkeitsschwellen für schwarz, weiß und silber. Vorher mit „Farbsensor Helligkeit“ auf dem Feld messen.
     * @param dark darunter gilt schwarz, eg: 400
     * @param bright ab hier gilt weiß, eg: 1200
     * @param silver ab hier gilt silber, eg: 2600
     */
    //% subcategory="6 Rescue Line" color=#00B0A0 group="Einrichten"
    //% weight=100
    //% blockId=nezhaV2_line_levels
    //% block="Helligkeit: schwarz unter %dark weiß ab %bright silber ab %silver"
    //% inlineInputMode=inline
    export function setFieldColorLevels(dark: number, bright: number, silver: number): void {
        lineDarkLevel = dark;
        lineBrightLevel = bright;
        lineSilverLevel = silver;
    }

    /**
     * true, wenn der Farbsensor diese Feldfarbe sieht
     */
    //% subcategory="6 Rescue Line" color=#00B0A0 group="Erkennen"
    //% weight=90
    //% blockId=nezhaV2_line_fieldcolor
    //% block="Farbsensor sieht %color"
    export function fieldColorIs(color: FieldColor): boolean {
        let hue = planetXColorHue();
        if (pxColorMode < 0) return false;
        let r = pxScaled[0];
        let g = pxScaled[1];
        let b = pxScaled[2];
        let brightness = pxRaw[0];
        let max = Math.max(r, Math.max(g, b));
        let min = Math.min(r, Math.min(g, b));
        let saturation = max > 0 ? (max - min) / max : 0;
        switch (color) {
            case FieldColor.Green: return saturation >= 0.25 && hue >= 75 && hue < 170;
            case FieldColor.Red: return saturation >= 0.25 && (hue < 20 || hue >= 330);
            case FieldColor.Black: return brightness < lineDarkLevel;
            case FieldColor.White: return brightness >= lineBrightLevel && saturation < 0.25;
            // Silber reflektiert viel stärker als der weiße Boden und bleibt grau
            case FieldColor.Silver: return brightness >= lineSilverLevel && saturation < 0.25;
        }
        return false;
    }

    /**
     * true, wenn der Farbsensor eine grüne Markierung sieht (sie liegt kurz vor der Kreuzung)
     */
    //% subcategory="6 Rescue Line" color=#00B0A0 group="Erkennen"
    //% weight=89
    //% blockId=nezhaV2_line_marker
    //% block="grüne Markierung erkannt"
    export function greenMarkerSeen(): boolean {
        return fieldColorIs(FieldColor.Green);
    }

    /**
     * Neigung des Roboters in Grad (plus = Nase oben): Rampen bis 25°, Wippen bis 20°
     */
    //% subcategory="6 Rescue Line" color=#00B0A0 group="Erkennen"
    //% weight=88
    //% blockId=nezhaV2_line_tilt
    //% block="Neigung (°)"
    export function tiltAngle(): number {
        return input.rotation(Rotation.Pitch);
    }

    /**
     * Fährt geradeaus über eine Lücke (höchstens 20 cm), bis der Liniensensor die Linie wiederfindet.
     * Liefert true, wenn die Linie gefunden wurde.
     * @param speed Tempo in %, eg: 30
     * @param maxCm höchstens so weit suchen, eg: 25
     */
    //% subcategory="6 Rescue Line" color=#00B0A0 group="Manöver"
    //% weight=80
    //% blockId=nezhaV2_line_gap
    //% block="überbrücke Lücke mit %speed \\% bis %maxCm cm"
    //% speed.min=0 speed.max=100 speed.defl=30 maxCm.defl=25
    //% inlineInputMode=inline
    export function bridgeGap(speed: number, maxCm: number): boolean {
        let end = input.runningTime() + __driveTimeMs(maxCm, speed);
        driveStart(DriveDirection.Forward, speed);
        while (input.runningTime() < end) {
            if (!pxLineLost()) {
                driveStop();
                return true;
            }
            basic.pause(5);
        }
        driveStop();
        return false;
    }

    /**
     * Dreht auf der Stelle, bis der Liniensensor die Linie wiederfindet. Liefert true, wenn die Linie gefunden wurde.
     * @param speed Tempo in %, eg: 25
     * @param maxAngle höchstens so weit drehen, eg: 120
     */
    //% subcategory="6 Rescue Line" color=#00B0A0 group="Manöver"
    //% weight=79
    //% blockId=nezhaV2_line_turn_until
    //% block="drehe %direction bis zur Linie mit %speed \\% (höchstens %maxAngle °)"
    //% speed.min=0 speed.max=100 speed.defl=25 maxAngle.defl=120
    //% inlineInputMode=inline
    export function turnUntilLine(direction: TurnDirection, speed: number, maxAngle: number): boolean {
        let arc = maxAngle * Math.PI / 180 * (wheelBaseDistance / 2);
        let end = input.runningTime() + __driveTimeMs(arc, speed);
        if (direction == TurnDirection.Right) driveSteer(speed, -speed);
        else driveSteer(-speed, speed);
        // erst die aktuelle Linie verlassen, dann die neue suchen
        basic.pause(150);
        while (input.runningTime() < end) {
            let found = direction == TurnDirection.Right ? __lineRight() : __lineLeft();
            if (found || __lineMiddle()) {
                driveStop();
                return true;
            }
            basic.pause(5);
        }
        driveStop();
        return false;
    }

    /**
     * Sucht die Linie durch Hin- und Herdrehen (nach einer Lücke, Kurve oder einem Hindernis)
     * @param speed Tempo in %, eg: 25
     */
    //% subcategory="6 Rescue Line" color=#00B0A0 group="Manöver"
    //% weight=78
    //% blockId=nezhaV2_line_search
    //% block="suche die Linie mit %speed \\%"
    //% speed.min=0 speed.max=100 speed.defl=25
    export function searchLine(speed: number): boolean {
        if (!pxLineLost()) return true;
        if (turnUntilLine(TurnDirection.Left, speed, 60)) return true;
        if (turnUntilLine(TurnDirection.Right, speed, 120)) return true;
        if (turnUntilLine(TurnDirection.Left, speed, 60)) return true;
        return false;
    }

    /**
     * Fährt über eine Kreuzung: nach links oder rechts im weichen Bogen, geradeaus auch über eine Lücke dahinter
     * @param speed Tempo in %, eg: 25
     */
    //% subcategory="6 Rescue Line" color=#00B0A0 group="Manöver"
    //% weight=77
    //% blockId=nezhaV2_line_cross
    //% block="nimm Kreuzung %direction mit %speed \\%"
    //% speed.min=5 speed.max=100 speed.defl=25
    //% inlineInputMode=inline
    export function crossIntersection(direction: ExitDirection, speed: number): boolean {
        if (direction == ExitDirection.Left) {
            pxLineTurn(TurnDirection.Left, speed);
            return !pxLineLost();
        }
        if (direction == ExitDirection.Right) {
            pxLineTurn(TurnDirection.Right, speed);
            return !pxLineLost();
        }
        // geradeaus: über die Querlinie fahren, dahinter kann eine Lücke kommen
        driveMove(DriveDirection.Forward, 3, DriveUnit.Cm, speed);
        pxLockUntil = input.runningTime() + 800;
        if (pxLineLost()) return bridgeGap(speed, 25);
        return true;
    }

    /**
     * Umfährt ein Hindernis (mindestens 15 cm hoch, 25 cm Platz drumherum) und sucht danach die Linie
     * @param speed Tempo in %, eg: 30
     * @param sideCm so weit zur Seite fahren, eg: 20
     * @param aroundCm so weit am Hindernis vorbeifahren, eg: 30
     */
    //% subcategory="6 Rescue Line" color=#00B0A0 group="Manöver"
    //% weight=76
    //% blockId=nezhaV2_line_avoid
    //% block="umfahre Hindernis %direction mit %speed \\% (%sideCm cm zur Seite, %aroundCm cm vorbei)"
    //% speed.min=0 speed.max=100 speed.defl=30 sideCm.defl=20 aroundCm.defl=30
    //% inlineInputMode=inline
    export function avoidObstacle(direction: TurnDirection, speed: number, sideCm: number, aroundCm: number): boolean {
        let back = direction == TurnDirection.Left ? TurnDirection.Right : TurnDirection.Left;
        driveTurn(direction, 90, speed);
        driveMove(DriveDirection.Forward, sideCm, DriveUnit.Cm, speed);
        driveTurn(back, 90, speed);
        driveMove(DriveDirection.Forward, aroundCm, DriveUnit.Cm, speed);
        driveTurn(back, 90, speed);
        // zurück zur Linie fahren, bis der Sensor sie findet
        return bridgeGap(speed, sideCm + 15);
    }
}
