
//% color=#ff0011  icon="\uf06d" block="nezhaV2-ab" blockId="nezhaV2"
namespace nezhaV2 {

    export enum MovementDirection {
        //%block="clockwise"
        CW = 1,
        //%block="counterclockwise"
        CCW = 2
    }
    export enum ServoMotionMode {
        //%block="clockwise"
        CW = 2,
        //%block="counterclockwise"
        CCW = 3,
        //%block="shortest path"
        ShortPath = 1
    }
    
    export enum DelayMode {
        //%block="automatic delay"
        AutoDelayStatus = 1,
        //%block="no delay"
        NoDelay = 0
    }
    export enum SportsMode {
        //%block="degrees"
        Degree = 2,
        //%block="turns"
        Circle = 1,
        //%block="seconds"
        Second = 3
    }
    
    
    export enum VerticallDirection {
        //%block="forward"
        Up = 1,
        //%block="backward"
        Down = 2
    }
    
    export enum Uint {
        //%block="cm"
        cm = 1,
        //%block="inch"
        inch = 2
    }
    
    export enum DistanceAndAngleUnit {
        //%block="degrees"
        Degree = 2,
        //%block="turns"
        Circle = 1,
        //%block="seconds"
        Second = 3,
        //%block="cm"
        cm = 4,
        //%block="inch"
        inch = 5
    }
    
    export enum MotorPostion {
        //%block="M1"
        M1 = 1,
        //%block="M2"
        M2 = 2,
        //%block="M3"
        M3 = 3,
        //%block="M4"
        M4 = 4
    }

    let i2cAddr: number = 0x10;
    let servoSpeedGlobal = 900
    // 相对角度值(用于相对角度值归零函数)
    let relativeAngularArr = [0, 0, 0, 0];
    // 组合积木块变量
    let motorLeftGlobal = 0
    let motorRightGlobal = 0
    let degreeToDistance = 0
    let wheelBaseDistance = 0
    let comboRotateCalibrationFactor = 1.0

    export function delayMs(ms: number): void {
        let time = input.runningTime() + ms
        while (time >= input.runningTime()) {

        }
    }

    export function motorDelay(value: number, motorFunction: SportsMode) {
        let delayTime = 0;
        if (value == 0 || servoSpeedGlobal == 0) {
            return;
        } else if (motorFunction == SportsMode.Circle) {
            delayTime = value * 360000.0 / servoSpeedGlobal + 500;
        } else if (motorFunction == SportsMode.Second) {
            delayTime = (value * 1000);
        } else if (motorFunction == SportsMode.Degree) {
            delayTime = value * 1000.0 / servoSpeedGlobal + 500;
        }
        basic.pause(delayTime);

    }

    //% group="Basic functions"
    //% block="set %motor at %speed\\%to run %direction %value %mode || %isDelay"
    //% inlineInputMode=inline
    //% speed.min=0  speed.max=100
    //% weight=407 
    export function move(motor: MotorPostion, speed: number, direction: MovementDirection, value: number, mode: SportsMode, isDelay: DelayMode = DelayMode.AutoDelayStatus): void {
        if (speed <= 0 || value <= 0) {
            // 速度和运行值不能小于等于0
            return;
        }
        setServoSpeed(speed);
        __move(motor, direction, value, mode);
        if (isDelay) {
            motorDelay(value, mode);
        }
    }

    export function __move(motor: MotorPostion, direction: MovementDirection, value: number, mode: SportsMode): void {

        let buf = pins.createBuffer(8);
        buf[0] = 0xFF;
        buf[1] = 0xF9;
        buf[2] = motor;
        buf[3] = direction;
        buf[4] = 0x70;
        buf[5] = (value >> 8) & 0XFF;
        buf[6] = mode;
        buf[7] = (value >> 0) & 0XFF;
        pins.i2cWriteBuffer(i2cAddr, buf);

    }

    //% group="Basic functions"
    //% weight=406
    //% block="set %motor to rotate %turnMode at angle %angle || %isDelay  "
    //% angle.min=0  angle.max=359
    //% inlineInputMode=inline
    export function moveToAbsAngle(motor: MotorPostion, turnMode: ServoMotionMode, angle: number, isDelay: DelayMode = DelayMode.AutoDelayStatus): void {
        while (angle < 0) {
            angle += 360
        }
        angle %= 360
        let buf = pins.createBuffer(8)
        buf[0] = 0xFF;
        buf[1] = 0xF9;
        buf[2] = motor;
        buf[3] = 0x00;
        buf[4] = 0x5D;
        buf[5] = (angle >> 8) & 0XFF;
        buf[6] = turnMode;
        buf[7] = (angle >> 0) & 0XFF;
        pins.i2cWriteBuffer(i2cAddr, buf);
        delayMs(4);// 等待不能删除，且禁止有其他任务插入，否则有BUG
        if (isDelay) {
            motorDelay(0.5, SportsMode.Second)
        }
    }

    //% group="Basic functions"
    //% weight=404
    //% block="set %motor shutting down the motor"
    export function stop(motor: MotorPostion): void {
        let buf = pins.createBuffer(8)
        buf[0] = 0xFF;
        buf[1] = 0xF9;
        buf[2] = motor;
        buf[3] = 0x00;
        buf[4] = 0x5F;
        buf[5] = 0x00;
        buf[6] = 0xF5;
        buf[7] = 0x00;
        pins.i2cWriteBuffer(i2cAddr, buf);
    }

    export function __start(motor: MotorPostion, direction: MovementDirection, speed: number): void {
        let buf = pins.createBuffer(8)
        buf[0] = 0xFF;
        buf[1] = 0xF9;
        buf[2] = motor;
        buf[3] = direction;
        buf[4] = 0x60;
        buf[5] = Math.floor(speed);
        buf[6] = 0xF5;
        buf[7] = 0x00;
        pins.i2cWriteBuffer(i2cAddr, buf);
    }

    //% group="Basic functions"
    //% weight=403
    //% block="set the speed of %motor to %speed \\% and start the motor"
    //% speed.min=-100  speed.max=100
    export function start(motor: MotorPostion, speed: number): void {
        if (speed < -100) {
            speed = -100
        }else if (speed > 100) {
            speed = 100
        }
        let direction = speed > 0 ? MovementDirection.CW : MovementDirection.CCW
        __start(motor, direction, Math.abs(speed))
    }

    export function readAngle(motor: MotorPostion): number {
        delayMs(4)
        let buf = pins.createBuffer(8);
        buf[0] = 0xFF;
        buf[1] = 0xF9;
        buf[2] = motor;
        buf[3] = 0x00;
        buf[4] = 0x46;
        buf[5] = 0x00;
        buf[6] = 0xF5;
        buf[7] = 0x00;
        pins.i2cWriteBuffer(i2cAddr, buf);
        delayMs(4)
        let arr = pins.i2cReadBuffer(i2cAddr, 4);
        return (arr[3] << 24) | (arr[2] << 16) | (arr[1] << 8) | (arr[0]);
    }

    //% group="Basic functions"
    //% weight=402
    //%block="%motor absolute angular value"
    export function readAbsAngle(motor: MotorPostion): number {
        let position = readAngle(motor)
        while (position < 0) {
            position += 3600;
        }
        return (position % 3600) * 0.1;
    }

    //% group="Basic functions"
    //% weight=402
    //%block="%motor relative angular value"
    export function readRelAngle(motor: MotorPostion): number {
        return (readAngle(motor) - relativeAngularArr[motor - 1]) * 0.1;
    }

    //% group="Basic functions"
    //% weight=400
    //%block="%motor speed (laps/sec)"
    export function readSpeed(motor: MotorPostion): number {
        delayMs(4)
        let buf = pins.createBuffer(8)
        buf[0] = 0xFF;
        buf[1] = 0xF9;
        buf[2] = motor;
        buf[3] = 0x00;
        buf[4] = 0x47;
        buf[5] = 0x00;
        buf[6] = 0xF5;
        buf[7] = 0x00;
        pins.i2cWriteBuffer(i2cAddr, buf);
        delayMs(4)
        let arr = pins.i2cReadBuffer(i2cAddr, 2);
        let retData = (arr[1] << 8) | (arr[0]);
        return Math.floor(retData / 3.6) * 0.01;
    }

    //% group="Basic functions"
    //% weight=399
    //%block="set servo %motor to zero"
    export function reset(motor: MotorPostion): void {
        let buf = pins.createBuffer(8)
        buf[0] = 0xFF;
        buf[1] = 0xF9;
        buf[2] = motor;
        buf[3] = 0x00;
        buf[4] = 0x1D;
        buf[5] = 0x00;
        buf[6] = 0xF5;
        buf[7] = 0x00;
        pins.i2cWriteBuffer(i2cAddr, buf);
        relativeAngularArr[motor - 1] = 0;
        motorDelay(1, SportsMode.Second)
    }

    //% group="Basic functions"
    //% weight=399
    //%block="set servo %motor relative angular to zero"
    export function resetRelAngleValue(motor: MotorPostion) {
        relativeAngularArr[motor - 1] = readAngle(motor);
    }

    export function setServoSpeed(speed: number): void {
        if(speed < 0) speed = 0;
        speed *= 9;
        servoSpeedGlobal = speed;
        let buf = pins.createBuffer(8)
        buf[0] = 0xFF;
        buf[1] = 0xF9;
        buf[2] = 0x00;
        buf[3] = 0x00;
        buf[4] = 0x77;
        buf[5] = (speed >> 8) & 0XFF;
        buf[6] = 0x00;
        buf[7] = (speed >> 0) & 0XFF;
        pins.i2cWriteBuffer(i2cAddr, buf);

    }

    //% group="Application functions"
    //% weight=410
    //%block="set the running motor to left wheel %motor_l right wheel %motor_r"
    export function setComboMotor(motor_l: MotorPostion, motor_r: MotorPostion): void {
        motorLeftGlobal = motor_l;
        motorRightGlobal = motor_r;
    }

    //% group="Application functions"
    //% weight=409
    //%block="Set %speed\\% speed and move %direction"
    //% speed.min=0  speed.max=100
    export function comboRun(speed: number, direction: VerticallDirection): void {
        if (speed < 0) {
            speed = 0;
        } else if (speed > 100) {
            speed = 100;
        }
        __start(motorLeftGlobal, direction % 2 + 1, speed);
        __start(motorRightGlobal, (direction + 1) % 2 + 1, speed);
    }


    //% group="Application functions"
    //% weight=406
    //%block="stop movement"
    export function comboStop(): void {
        stop(motorLeftGlobal)
        stop(motorRightGlobal)
    }

    /**
    * The distance length of the motor movement per circle
    */
    //% group="Application functions"
    //% weight=404
    //%block="Set the wheel circumference to %value %unit"
    export function setWheelPerimeter(value: number, unit: Uint): void {
        if(value < 0){
            value = 0;
        }
        if (unit == Uint.inch) {
            degreeToDistance = value * 2.54
        }else{
            degreeToDistance = value
        }
    }

    //% group="Application functions"
    //% weight=402
    //%block="set wheelbase (distance between wheels) to %value %unit"
    export function setWheelBase(value: number, unit: Uint): void {
        if(value < 0){
            value = 0;
        }
        if (unit == Uint.inch) {
            wheelBaseDistance = value * 2.54
        }else{
            wheelBaseDistance = value
        }
    }

    //% group="Application functions"
    //% weight=403
    //%block="Combination Motor Move at %speed to %direction %value %uint "
    //% speed.min=0  speed.max=100
    //% inlineInputMode=inline
    export function comboMove(speed: number, direction: VerticallDirection, value: number, uint: DistanceAndAngleUnit): void {
        if(speed <= 0){
            return;
        }
        setServoSpeed(speed)
        let mode;
        switch (uint) {
            case DistanceAndAngleUnit.Circle:
                mode = SportsMode.Circle;
                break;
            case DistanceAndAngleUnit.Degree:
                mode = SportsMode.Degree;
                break;
            case DistanceAndAngleUnit.Second:
                mode = SportsMode.Second;
                break;
            case DistanceAndAngleUnit.cm:
                value = 360 * value / degreeToDistance
                mode = SportsMode.Degree;
                break;
            case DistanceAndAngleUnit.inch:
                value = 360 * value * 2.54 / degreeToDistance
                mode = SportsMode.Degree;
                break;
        }
        if (direction == VerticallDirection.Up) {
            __move(motorLeftGlobal, MovementDirection.CCW, value, mode)
            __move(motorRightGlobal, MovementDirection.CW, value, mode)
        }
        else {
            __move(motorLeftGlobal, MovementDirection.CW, value, mode)
            __move(motorRightGlobal, MovementDirection.CCW, value, mode)
        }
        motorDelay(value, mode);
    }

    //% group="Application functions"
    //% weight=402
    //%block="set the left wheel speed at %speed_l \\%, right wheel speed at %speed_r \\% and start the motor"
    //% speed_l.min=-100  speed_l.max=100 speed_r.min=-100  speed_r.max=100
    export function comboStart(speed_l: number, speed_r: number): void {
        start(motorLeftGlobal, -speed_l);
        start(motorRightGlobal, speed_r);
    }

    //% group="Application functions"
    //% weight=400
    //% block="combination Motor rotate by %angle degrees at %speed\\%"
    //% speed.min=0  speed.max=100
    export function comboRotate(angle: number, speed: number): void {
        if (speed <= 0 || angle == 0 || wheelBaseDistance <= 0 || degreeToDistance <= 0) {
            return;
        }
        
        let rotationDirection = angle > 0 ? MovementDirection.CW : MovementDirection.CCW;
        let absoluteAngle = Math.abs(angle);
        
        let radians = absoluteAngle * Math.PI / 180;
        let arcDistance = radians * (wheelBaseDistance / 2);
        let motorDegrees = (arcDistance * 360 * comboRotateCalibrationFactor) / degreeToDistance;
        
        setServoSpeed(speed);
        
        if (rotationDirection == MovementDirection.CW) {
            __move(motorLeftGlobal, MovementDirection.CCW, motorDegrees, SportsMode.Degree);
            __move(motorRightGlobal, MovementDirection.CCW, motorDegrees, SportsMode.Degree);
        } else {
            __move(motorLeftGlobal, MovementDirection.CW, motorDegrees, SportsMode.Degree);
            __move(motorRightGlobal, MovementDirection.CW, motorDegrees, SportsMode.Degree);
        }
        
        motorDelay(motorDegrees, SportsMode.Degree);
    }

    //% group="Application functions"
    //% weight=401
    //% block="set combo rotate calibration factor to %factor"
    export function setComboRotateCalibration(factor: number): void {
        if (factor <= 0) {
            factor = 1.0;
        }
        comboRotateCalibrationFactor = factor;
    }

    // ===================== Ultrasonic sensor =====================

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

    // last valid measurement per port (J1..J4) and for free pins (index 0)
    let ultrasonicLast = [0, 0, 0, 0, 0];

    function __ultrasonicMeasure(trig: DigitalPin, echo: DigitalPin, slot: number, unit: Uint): number {
        pins.setPull(trig, PinPullMode.PullNone);
        pins.digitalWritePin(trig, 0);
        control.waitMicros(2);
        pins.digitalWritePin(trig, 1);
        control.waitMicros(10);
        pins.digitalWritePin(trig, 0);
        // max. ~4 m range -> 25 ms timeout
        let d = pins.pulseIn(echo, PulseValue.High, 25000);
        let distance = d * 34 / 2 / 1000;
        if (control.hardwareVersion() == "1") {
            distance = distance * 3 / 2;
        }
        if (distance > 430) {
            distance = 0;
        }
        // single failed readings return the last valid value
        if (distance == 0) {
            distance = ultrasonicLast[slot];
            ultrasonicLast[slot] = 0;
        } else {
            ultrasonicLast[slot] = distance;
        }
        if (unit == Uint.inch) {
            return Math.round(distance / 2.54 * 10) / 10;
        }
        return Math.round(distance);
    }

    /**
     * Measures the distance with an ELECFREAKS ultrasonic sensor on an RJ11 port (0 = no echo / out of range)
     * @param port RJ11 port of the sensor, eg: nezhaV2.RJPort.J1
     */
    //% subcategory="Ultrasonic sensor" color=#00A0E9 group="RJ11 port"
    //% weight=300
    //% blockId=nezhaV2_ultrasonic_distance
    //% block="ultrasonic sensor %port distance in %unit"
    //% port.fieldEditor="gridpicker" port.fieldOptions.columns=4
    export function ultrasonicDistance(port: RJPort, unit: Uint): number {
        let trig = DigitalPin.P1;
        let echo = DigitalPin.P8;
        switch (port) {
            case RJPort.J1: trig = DigitalPin.P1; echo = DigitalPin.P8; break;
            case RJPort.J2: trig = DigitalPin.P2; echo = DigitalPin.P12; break;
            case RJPort.J3: trig = DigitalPin.P13; echo = DigitalPin.P14; break;
            case RJPort.J4: trig = DigitalPin.P15; echo = DigitalPin.P16; break;
        }
        return __ultrasonicMeasure(trig, echo, port, unit);
    }

    /**
     * Checks whether an obstacle is closer than the given distance
     * @param port RJ11 port of the sensor, eg: nezhaV2.RJPort.J1
     * @param value threshold distance, eg: 10
     */
    //% subcategory="Ultrasonic sensor" color=#00A0E9 group="RJ11 port"
    //% weight=299
    //% blockId=nezhaV2_ultrasonic_obstacle
    //% block="ultrasonic sensor %port obstacle closer than %value %unit"
    //% port.fieldEditor="gridpicker" port.fieldOptions.columns=4
    //% value.min=1 value.max=400 value.defl=10
    export function ultrasonicObstacle(port: RJPort, value: number, unit: Uint): boolean {
        let distance = ultrasonicDistance(port, unit);
        return distance > 0 && distance < value;
    }

    /**
     * Measures the distance with an ultrasonic sensor (e.g. HC-SR04) on freely chosen pins (0 = no echo / out of range)
     * @param trig trigger pin, eg: DigitalPin.P1
     * @param echo echo pin, eg: DigitalPin.P2
     */
    //% subcategory="Ultrasonic sensor" color=#00A0E9 group="Free pins"
    //% weight=290
    //% blockId=nezhaV2_ultrasonic_distance_pins
    //% block="ultrasonic sensor trig %trig echo %echo distance in %unit"
    //% trig.defl=DigitalPin.P1 echo.defl=DigitalPin.P2
    //% inlineInputMode=inline
    export function ultrasonicDistancePins(trig: DigitalPin, echo: DigitalPin, unit: Uint): number {
        return __ultrasonicMeasure(trig, echo, 0, unit);
    }

    // ===================== Color sensor (Grove I2C Color Sensor) =====================
    // v2.0: TCS3472 (I2C 0x29) - v1.2: TCS3414CS (I2C 0x39), detected automatically

    export enum ColorChannel {
        //% block="red"
        Red = 1,
        //% block="green"
        Green = 2,
        //% block="blue"
        Blue = 3,
        //% block="brightness"
        Brightness = 4
    }

    export enum DetectColor {
        //% block="red"
        Red = 1,
        //% block="yellow"
        Yellow = 2,
        //% block="green"
        Green = 3,
        //% block="blue"
        Blue = 4,
        //% block="black"
        Black = 5,
        //% block="white"
        White = 6
    }

    const COLOR_ADDR_V2 = 0x29;
    const COLOR_ADDR_V1 = 0x39;
    let colorChip = 0; // 0 = not initialised, 1 = TCS3414 (v1.2), 2 = TCS3472 (v2.0), -1 = not found
    // raw values of the last measurement: clear, red, green, blue
    let colorRaw = [0, 0, 0, 0];
    // white reference (0 = not calibrated)
    let colorWhite = [0, 0, 0, 0];

    function __colorWrite(addr: number, reg: number, value: number): void {
        let buf = pins.createBuffer(2);
        buf[0] = reg;
        buf[1] = value;
        pins.i2cWriteBuffer(addr, buf);
    }

    function __colorRead8(addr: number, reg: number): number {
        pins.i2cWriteNumber(addr, reg, NumberFormat.UInt8BE, true);
        return pins.i2cReadNumber(addr, NumberFormat.UInt8BE, false);
    }

    function __colorInit(): void {
        if (colorChip != 0) return;
        // TCS3472 (v2.0): ID register 0x12 -> 0x44 or 0x4D
        let id = __colorRead8(COLOR_ADDR_V2, 0x80 | 0x12);
        if (id == 0x44 || id == 0x4D) {
            __colorWrite(COLOR_ADDR_V2, 0x80 | 0x00, 0x01); // ENABLE: power on
            basic.pause(3);
            __colorWrite(COLOR_ADDR_V2, 0x80 | 0x01, 0xEB); // ATIME: ~50 ms
            __colorWrite(COLOR_ADDR_V2, 0x80 | 0x0F, 0x01); // CONTROL: gain 4x
            __colorWrite(COLOR_ADDR_V2, 0x80 | 0x00, 0x03); // ENABLE: power on + ADC
            colorChip = 2;
            basic.pause(60);
            return;
        }
        // address 0x39 is also used by the APDS9960 (Planet X) - exclude it first
        let apdsId = __colorRead8(COLOR_ADDR_V1, 0x92);
        if (apdsId == 0xAB || apdsId == 0x9C || apdsId == 0xA8) {
            colorChip = -1;
            return;
        }
        // TCS3414CS (v1.2): ID register 0x04 -> upper nibble 0x1
        id = __colorRead8(COLOR_ADDR_V1, 0x80 | 0x04);
        if ((id & 0xF0) == 0x10) {
            __colorWrite(COLOR_ADDR_V1, 0x80 | 0x00, 0x01); // CONTROL: power on
            __colorWrite(COLOR_ADDR_V1, 0x80 | 0x01, 0x01); // TIMING: free running, 100 ms
            __colorWrite(COLOR_ADDR_V1, 0x80 | 0x07, 0x10); // GAIN: 4x, prescaler 1
            __colorWrite(COLOR_ADDR_V1, 0x80 | 0x00, 0x03); // CONTROL: power on + ADC
            colorChip = 1;
            basic.pause(120);
            return;
        }
        colorChip = -1;
    }

    function __colorMeasure(): void {
        __colorInit();
        if (colorChip == 2) {
            // auto-increment read from CDATAL (0x14): C, R, G, B (16 bit little endian)
            pins.i2cWriteNumber(COLOR_ADDR_V2, 0x80 | 0x20 | 0x14, NumberFormat.UInt8BE, true);
            let b = pins.i2cReadBuffer(COLOR_ADDR_V2, 8);
            colorRaw[0] = b[0] | (b[1] << 8);
            colorRaw[1] = b[2] | (b[3] << 8);
            colorRaw[2] = b[4] | (b[5] << 8);
            colorRaw[3] = b[6] | (b[7] << 8);
        } else if (colorChip == 1) {
            // data registers: 0x10 green, 0x12 red, 0x14 blue, 0x16 clear
            let g = __colorRead8(COLOR_ADDR_V1, 0x90) | (__colorRead8(COLOR_ADDR_V1, 0x91) << 8);
            let r = __colorRead8(COLOR_ADDR_V1, 0x92) | (__colorRead8(COLOR_ADDR_V1, 0x93) << 8);
            let bl = __colorRead8(COLOR_ADDR_V1, 0x94) | (__colorRead8(COLOR_ADDR_V1, 0x95) << 8);
            let c = __colorRead8(COLOR_ADDR_V1, 0x96) | (__colorRead8(COLOR_ADDR_V1, 0x97) << 8);
            colorRaw[0] = c; colorRaw[1] = r; colorRaw[2] = g; colorRaw[3] = bl;
        } else {
            colorRaw = [0, 0, 0, 0];
        }
    }

    // colour value 0..255 relative to the white reference (or to the strongest channel if not calibrated)
    function __colorScaled(index: number): number {
        let ref = colorWhite[index];
        if (ref <= 0) {
            ref = Math.max(colorRaw[1], Math.max(colorRaw[2], colorRaw[3]));
        }
        if (ref <= 0) return 0;
        return Math.min(255, Math.round(colorRaw[index] * 255 / ref));
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
     * Reads a colour channel (0-255) or the brightness (0-100 %, raw value if not calibrated)
     */
    //% subcategory="Grove color sensor" color=#4CAF50 group="Measure"
    //% weight=280
    //% blockId=nezhaV2_color_value
    //% block="Grove color sensor %channel"
    export function colorSensorValue(channel: ColorChannel): number {
        __colorMeasure();
        if (channel == ColorChannel.Brightness) {
            if (colorWhite[0] > 0) {
                return Math.min(100, Math.round(colorRaw[0] * 100 / colorWhite[0]));
            }
            return colorRaw[0];
        }
        return __colorScaled(channel);
    }

    /**
     * Hue of the measured colour in degrees (0 = red, 120 = green, 240 = blue)
     */
    //% subcategory="Grove color sensor" color=#4CAF50 group="Measure"
    //% weight=279
    //% blockId=nezhaV2_color_hue
    //% block="Grove color sensor hue (0-360°)"
    export function colorSensorHue(): number {
        __colorMeasure();
        return __colorHue(__colorScaled(1), __colorScaled(2), __colorScaled(3));
    }

    /**
     * Checks whether the sensor detects the given colour. Calibrate white first for reliable black/white detection.
     */
    //% subcategory="Grove color sensor" color=#4CAF50 group="Detect"
    //% weight=270
    //% blockId=nezhaV2_color_is
    //% block="Grove color sensor detects %color"
    export function colorSensorIs(color: DetectColor): boolean {
        __colorMeasure();
        if (colorChip < 0) return false;
        let r = __colorScaled(1);
        let g = __colorScaled(2);
        let b = __colorScaled(3);
        let max = Math.max(r, Math.max(g, b));
        let min = Math.min(r, Math.min(g, b));
        let saturation = max > 0 ? (max - min) / max : 0;
        // brightness in % of white (without calibration: rough estimate from the raw clear value)
        let brightness = colorWhite[0] > 0 ? colorRaw[0] * 100 / colorWhite[0] : colorRaw[0] * 100 / (colorChip == 2 ? 3000 : 1500);
        let hue = __colorHue(r, g, b);
        switch (color) {
            case DetectColor.Black:
                return brightness < 20;
            case DetectColor.White:
                return brightness >= 60 && saturation < 0.25;
        }
        if (brightness < 10 || saturation < 0.25) return false;
        switch (color) {
            case DetectColor.Red: return hue < 20 || hue >= 330;
            case DetectColor.Yellow: return hue >= 35 && hue < 75;
            case DetectColor.Green: return hue >= 75 && hue < 170;
            case DetectColor.Blue: return hue >= 170 && hue < 260;
        }
        return false;
    }

    /**
     * Stores the current measurement as white reference. Hold the sensor over a white surface.
     */
    //% subcategory="Grove color sensor" color=#4CAF50 group="Setup"
    //% weight=260
    //% blockId=nezhaV2_color_calibrate
    //% block="Grove color sensor calibrate white"
    export function colorSensorCalibrateWhite(): void {
        __colorMeasure();
        for (let i = 0; i < 4; i++) {
            colorWhite[i] = colorRaw[i];
        }
    }

    /**
     * true if a Grove I2C colour sensor (v1.2 or v2.0) was found
     */
    //% subcategory="Grove color sensor" color=#4CAF50 group="Setup"
    //% weight=259
    //% blockId=nezhaV2_color_connected
    //% block="Grove color sensor connected"
    export function colorSensorConnected(): boolean {
        __colorInit();
        return colorChip > 0;
    }

    // ===================== Drive (two motors, mirrored mounting) =====================

    export enum MountMode {
        //% block="normal"
        Normal = 1,
        //% block="reversed"
        Reversed = 2
    }

    let driveMotorLeft = MotorPostion.M1;
    let driveMotorRight = MotorPostion.M2;
    // direction that makes the wheel turn forwards
    let driveFwdLeft = MovementDirection.CCW;
    let driveFwdRight = MovementDirection.CW;

    function __driveDirection(isLeft: boolean, forward: boolean): MovementDirection {
        let dir = isLeft ? driveFwdLeft : driveFwdRight;
        if (forward) return dir;
        return dir == MovementDirection.CW ? MovementDirection.CCW : MovementDirection.CW;
    }

    /**
     * Assigns the two drive motors and their mounting direction. Set a motor to "reversed" if its wheel turns backwards.
     */
    //% subcategory="Drive" color=#F7931E group="Setup"
    //% weight=250
    //% blockId=nezhaV2_drive_setup
    //% block="drive setup: left motor %left %leftMode right motor %right %rightMode"
    //% inlineInputMode=inline
    export function driveSetup(left: MotorPostion, leftMode: MountMode, right: MotorPostion, rightMode: MountMode): void {
        driveMotorLeft = left;
        driveMotorRight = right;
        driveFwdLeft = leftMode == MountMode.Reversed ? MovementDirection.CW : MovementDirection.CCW;
        driveFwdRight = rightMode == MountMode.Reversed ? MovementDirection.CCW : MovementDirection.CW;
    }

    /**
     * Both motors drive in the same direction until they are stopped
     */
    //% subcategory="Drive" color=#F7931E group="Drive"
    //% weight=240
    //% blockId=nezhaV2_drive_start
    //% block="drive %direction at %speed \\%"
    //% speed.min=0 speed.max=100 speed.defl=50
    export function driveStart(direction: VerticallDirection, speed: number): void {
        if (speed < 0) speed = 0;
        else if (speed > 100) speed = 100;
        let forward = direction == VerticallDirection.Up;
        __start(driveMotorLeft, __driveDirection(true, forward), speed);
        __start(driveMotorRight, __driveDirection(false, forward), speed);
    }

    /**
     * Both motors drive in the same direction for the given distance, angle or time
     */
    //% subcategory="Drive" color=#F7931E group="Drive"
    //% weight=239
    //% blockId=nezhaV2_drive_move
    //% block="drive %direction at %speed \\% for %value %unit"
    //% speed.min=0 speed.max=100 speed.defl=50 value.defl=1
    //% inlineInputMode=inline
    export function driveMove(direction: VerticallDirection, speed: number, value: number, unit: DistanceAndAngleUnit): void {
        if (speed <= 0 || value <= 0) return;
        setServoSpeed(speed);
        let mode = SportsMode.Degree;
        switch (unit) {
            case DistanceAndAngleUnit.Circle: mode = SportsMode.Circle; break;
            case DistanceAndAngleUnit.Degree: mode = SportsMode.Degree; break;
            case DistanceAndAngleUnit.Second: mode = SportsMode.Second; break;
            case DistanceAndAngleUnit.cm:
                if (degreeToDistance <= 0) return;
                value = 360 * value / degreeToDistance;
                mode = SportsMode.Degree;
                break;
            case DistanceAndAngleUnit.inch:
                if (degreeToDistance <= 0) return;
                value = 360 * value * 2.54 / degreeToDistance;
                mode = SportsMode.Degree;
                break;
        }
        let forward = direction == VerticallDirection.Up;
        __move(driveMotorLeft, __driveDirection(true, forward), value, mode);
        __move(driveMotorRight, __driveDirection(false, forward), value, mode);
        motorDelay(value, mode);
    }

    /**
     * Sets both wheel speeds separately (-100 to 100 %), e.g. for curves or turning on the spot
     */
    //% subcategory="Drive" color=#F7931E group="Drive"
    //% weight=238
    //% blockId=nezhaV2_drive_steer
    //% block="drive with left wheel %speedLeft \\% right wheel %speedRight \\%"
    //% speedLeft.min=-100 speedLeft.max=100 speedLeft.defl=50
    //% speedRight.min=-100 speedRight.max=100 speedRight.defl=50
    //% inlineInputMode=inline
    export function driveSteer(speedLeft: number, speedRight: number): void {
        if (speedLeft < -100) speedLeft = -100; else if (speedLeft > 100) speedLeft = 100;
        if (speedRight < -100) speedRight = -100; else if (speedRight > 100) speedRight = 100;
        __start(driveMotorLeft, __driveDirection(true, speedLeft >= 0), Math.abs(speedLeft));
        __start(driveMotorRight, __driveDirection(false, speedRight >= 0), Math.abs(speedRight));
    }

    export enum TurnDirection {
        //% block="left"
        Left = 1,
        //% block="right"
        Right = 2
    }

    let driveTurnFactor = 1.0;

    /**
     * Wheel circumference and wheelbase (distance between the two wheels) - needed for turning on the spot
     * @param perimeter wheel circumference, eg: 20
     * @param wheelBase distance between the two wheels, eg: 12
     */
    //% subcategory="Drive" color=#F7931E group="Setup"
    //% weight=249
    //% blockId=nezhaV2_drive_geometry
    //% block="drive dimensions: wheel circumference %perimeter wheelbase %wheelBase %unit"
    //% inlineInputMode=inline
    export function driveGeometry(perimeter: number, wheelBase: number, unit: Uint): void {
        setWheelPerimeter(perimeter, unit);
        setWheelBase(wheelBase, unit);
    }

    /**
     * Correction factor for turning on the spot: turned too little -> increase, turned too much -> decrease
     * @param factor correction factor, eg: 1
     */
    //% subcategory="Drive" color=#F7931E group="Setup"
    //% weight=248
    //% blockId=nezhaV2_drive_turn_calibration
    //% block="drive turn correction factor %factor"
    //% factor.defl=1
    export function driveTurnCalibration(factor: number): void {
        if (factor <= 0) factor = 1.0;
        driveTurnFactor = factor;
    }

    /**
     * Turns on the spot by the given angle (both wheels run in opposite directions). Requires the drive dimensions.
     * @param angle angle in degrees, eg: 90
     */
    //% subcategory="Drive" color=#F7931E group="Drive"
    //% weight=236
    //% blockId=nezhaV2_drive_turn
    //% block="turn %direction by %angle ° at %speed \\%"
    //% angle.min=1 angle.max=360 angle.defl=90
    //% speed.min=0 speed.max=100 speed.defl=40
    //% inlineInputMode=inline
    export function driveTurn(direction: TurnDirection, angle: number, speed: number): void {
        if (speed <= 0 || angle <= 0) return;
        if (wheelBaseDistance <= 0 || degreeToDistance <= 0) {
            // without the drive dimensions the rotation cannot be calculated
            return;
        }
        // arc length of one wheel, converted into motor degrees
        let arcDistance = angle * Math.PI / 180 * (wheelBaseDistance / 2);
        let motorDegrees = arcDistance * 360 * driveTurnFactor / degreeToDistance;
        setServoSpeed(speed);
        // turning right: left wheel forwards, right wheel backwards
        let leftForward = direction == TurnDirection.Right;
        __move(driveMotorLeft, __driveDirection(true, leftForward), motorDegrees, SportsMode.Degree);
        __move(driveMotorRight, __driveDirection(false, !leftForward), motorDegrees, SportsMode.Degree);
        motorDelay(motorDegrees, SportsMode.Degree);
    }

    /**
     * Turns exactly 90° on the spot. Requires the drive dimensions.
     */
    //% subcategory="Drive" color=#F7931E group="Drive"
    //% weight=235
    //% blockId=nezhaV2_drive_turn90
    //% block="turn 90° %direction at %speed \\%"
    //% speed.min=0 speed.max=100 speed.defl=40
    export function driveTurn90(direction: TurnDirection, speed: number): void {
        driveTurn(direction, 90, speed);
    }

    /**
     * Stops both drive motors
     */
    //% subcategory="Drive" color=#F7931E group="Drive"
    //% weight=237
    //% blockId=nezhaV2_drive_stop
    //% block="stop driving"
    export function driveStop(): void {
        stop(driveMotorLeft);
        stop(driveMotorRight);
    }

    // ===================== Planet X color sensor (ELECFREAKS, I2C port) =====================
    // newer module: I2C 0x43 - older module: APDS9960 on I2C 0x39
    // register sequences follow the official ELECFREAKS extension pxt-PlanetX

    export enum PlanetXColor {
        //% block="red"
        Red = 1,
        //% block="yellow"
        Yellow = 2,
        //% block="green"
        Green = 3,
        //% block="cyan"
        Cyan = 4,
        //% block="blue"
        Blue = 5,
        //% block="magenta"
        Magenta = 6,
        //% block="white"
        White = 7
    }

    const PX_ADDR_NEW = 0x43;
    const PX_ADDR_APDS = 0x39;
    let pxColorMode = 0; // 0 = not initialised, 1 = 0x43 module, 2 = APDS9960, -1 = not found
    let pxRaw = [0, 0, 0, 0];    // clear, red, green, blue (corrected)
    let pxScaled = [0, 0, 0];    // red, green, blue 0..255

    function __pxRead8(addr: number, reg: number): number {
        pins.i2cWriteNumber(addr, reg, NumberFormat.UInt8BE);
        return pins.i2cReadNumber(addr, NumberFormat.UInt8BE);
    }

    function __pxRead16(addr: number, regLow: number): number {
        return __pxRead8(addr, regLow) + __pxRead8(addr, regLow + 1) * 256;
    }

    function __pxColorInit(): void {
        if (pxColorMode != 0) return;
        // newer module on 0x43
        let i = 0;
        while (i++ < 10) {
            __colorWrite(PX_ADDR_NEW, 0x81, 0xCA);
            __colorWrite(PX_ADDR_NEW, 0x80, 0x17);
            basic.pause(50);
            if (__pxRead16(PX_ADDR_NEW, 0xA4) != 0) {
                pxColorMode = 1;
                return;
            }
        }
        // older module: APDS9960, ID register 0x92
        let id = __pxRead8(PX_ADDR_APDS, 0x92);
        if (id == 0xAB || id == 0x9C || id == 0xA8) {
            __colorWrite(PX_ADDR_APDS, 0x81, 252);  // ATIME
            __colorWrite(PX_ADDR_APDS, 0x8F, 0x03); // CONTROL: gain
            __colorWrite(PX_ADDR_APDS, 0x80, 0x00); // ENABLE off
            __colorWrite(PX_ADDR_APDS, 0xAB, 0x00); // GCONF4
            __colorWrite(PX_ADDR_APDS, 0xE7, 0x00); // AICLEAR
            __colorWrite(PX_ADDR_APDS, 0x80, 0x01); // power on
            let tmp = __pxRead8(PX_ADDR_APDS, 0x80) | 0x02; // enable colour measurement
            __colorWrite(PX_ADDR_APDS, 0x80, tmp);
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
            // channel correction of the official extension
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
        // scale to 0..255 via the clear channel
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

    /**
     * Hue of the Planet X colour sensor in degrees (0 = red, 120 = green, 240 = blue)
     */
    //% subcategory="Planet X color sensor" color=#9C27B0 group="Measure"
    //% weight=220
    //% blockId=nezhaV2_px_color_hue
    //% block="Planet X color sensor hue (0-360°)"
    export function planetXColorHue(): number {
        __pxColorMeasure();
        if (pxColorMode < 0) return 0;
        return __colorHue(pxScaled[0], pxScaled[1], pxScaled[2]);
    }

    /**
     * Reads a colour channel (0-255) or the brightness (raw value of the clear channel) of the Planet X colour sensor
     */
    //% subcategory="Planet X color sensor" color=#9C27B0 group="Measure"
    //% weight=219
    //% blockId=nezhaV2_px_color_value
    //% block="Planet X color sensor %channel"
    export function planetXColorValue(channel: ColorChannel): number {
        __pxColorMeasure();
        if (channel == ColorChannel.Brightness) return Math.round(pxRaw[0]);
        return pxScaled[channel - 1];
    }

    /**
     * Checks whether the Planet X colour sensor detects the given colour
     */
    //% subcategory="Planet X color sensor" color=#9C27B0 group="Detect"
    //% weight=218
    //% blockId=nezhaV2_px_color_is
    //% block="Planet X color sensor detects %color"
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
     * true if a Planet X colour sensor was found
     */
    //% subcategory="Planet X color sensor" color=#9C27B0 group="Setup"
    //% weight=217
    //% blockId=nezhaV2_px_color_connected
    //% block="Planet X color sensor connected"
    export function planetXColorConnected(): boolean {
        __pxColorInit();
        return pxColorMode > 0;
    }

    //% group="export functions"
    //% weight=320
    //%block="version number"
    export function readVersion(): string {
        let buf = pins.createBuffer(8);
        buf[0] = 0xFF;
        buf[1] = 0xF9;
        buf[2] = 0x00;
        buf[3] = 0x00;
        buf[4] = 0x88;
        buf[5] = 0x00;
        buf[6] = 0x00;
        buf[7] = 0x00;
        pins.i2cWriteBuffer(i2cAddr, buf);
        let version = pins.i2cReadBuffer(i2cAddr, 3);
        return `V ${version[0]}.${version[1]}.${version[2]}`;
    }
}
