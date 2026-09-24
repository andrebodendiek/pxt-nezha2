
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

    // ===================== Rescue Line =====================
    // Blocks for RoboCupJunior Rescue Line / Line Entry:
    // line following, gaps (max. 20 cm), perpendicular intersections with 3 or 4
    // branches, 90 degree corners, green markers, obstacles, ramps and seesaws.

    export enum LineSensor {
        //% block="left"
        Left = 1,
        //% block="middle"
        Middle = 2,
        //% block="right"
        Right = 3
    }

    export enum LineLogic {
        //% block="black = LOW (0)"
        BlackLow = 1,
        //% block="black = HIGH (1)"
        BlackHigh = 2
    }

    export enum ExitDirection {
        //% block="left"
        Left = 1,
        //% block="straight ahead"
        Straight = 2,
        //% block="right"
        Right = 3
    }

    export enum FieldColor {
        //% block="black (line)"
        Black = 1,
        //% block="white (floor)"
        White = 2,
        //% block="green (marker)"
        Green = 3,
        //% block="red (goal tile)"
        Red = 4,
        //% block="silver (evacuation zone)"
        Silver = 5
    }

    export enum ColorSource {
        //% block="Planet X"
        PlanetX = 1,
        //% block="Grove"
        Grove = 2
    }

    let lsPinLeft = DigitalPin.P1;
    let lsPinMiddle = DigitalPin.P2;
    let lsPinRight = DigitalPin.P8;
    let lsHasMiddle = false;
    let lsBlackLevel = 0;      // digital level that means "black line"
    let lineGain = 1.2;        // steering strength when following the line
    let lineColorSource = ColorSource.PlanetX;

    /**
     * Line sensors on an RJ11 port (2-way sensor: first signal = left, second = right)
     */
    //% subcategory="Rescue Line" color=#00B0A0 group="Setup"
    //% weight=200
    //% blockId=nezhaV2_line_setup_port
    //% block="line sensors on %port logic %logic"
    export function lineSensorSetupPort(port: RJPort, logic: LineLogic): void {
        switch (port) {
            case RJPort.J1: lsPinLeft = DigitalPin.P1; lsPinRight = DigitalPin.P8; break;
            case RJPort.J2: lsPinLeft = DigitalPin.P2; lsPinRight = DigitalPin.P12; break;
            case RJPort.J3: lsPinLeft = DigitalPin.P13; lsPinRight = DigitalPin.P14; break;
            case RJPort.J4: lsPinLeft = DigitalPin.P15; lsPinRight = DigitalPin.P16; break;
        }
        lsHasMiddle = false;
        lsBlackLevel = logic == LineLogic.BlackHigh ? 1 : 0;
    }

    /**
     * Two line sensors on freely chosen pins
     */
    //% subcategory="Rescue Line" color=#00B0A0 group="Setup"
    //% weight=199
    //% blockId=nezhaV2_line_setup_2pins
    //% block="line sensors left %left right %right logic %logic"
    //% inlineInputMode=inline
    export function lineSensorSetup2(left: DigitalPin, right: DigitalPin, logic: LineLogic): void {
        lsPinLeft = left;
        lsPinRight = right;
        lsHasMiddle = false;
        lsBlackLevel = logic == LineLogic.BlackHigh ? 1 : 0;
    }

    /**
     * Three line sensors on freely chosen pins (the middle one makes intersections easier to detect)
     */
    //% subcategory="Rescue Line" color=#00B0A0 group="Setup"
    //% weight=198
    //% blockId=nezhaV2_line_setup_3pins
    //% block="line sensors left %left middle %middle right %right logic %logic"
    //% inlineInputMode=inline
    export function lineSensorSetup3(left: DigitalPin, middle: DigitalPin, right: DigitalPin, logic: LineLogic): void {
        lsPinLeft = left;
        lsPinMiddle = middle;
        lsPinRight = right;
        lsHasMiddle = true;
        lsBlackLevel = logic == LineLogic.BlackHigh ? 1 : 0;
    }

    /**
     * Steering strength while following the line: higher = sharper corrections
     * @param gain steering strength, eg: 1.2
     */
    //% subcategory="Rescue Line" color=#00B0A0 group="Setup"
    //% weight=197
    //% blockId=nezhaV2_line_gain
    //% block="line steering strength %gain"
    //% gain.min=0.2 gain.max=2 gain.defl=1.2
    export function setLineGain(gain: number): void {
        if (gain < 0.2) gain = 0.2;
        else if (gain > 2) gain = 2;
        lineGain = gain;
    }

    /**
     * Which colour sensor the field colour blocks use
     */
    //% subcategory="Rescue Line" color=#00B0A0 group="Setup"
    //% weight=196
    //% blockId=nezhaV2_line_colorsource
    //% block="use %source colour sensor for field colours"
    export function setColorSource(source: ColorSource): void {
        lineColorSource = source;
    }

    function __lineRead(pin: DigitalPin): boolean {
        return pins.digitalReadPin(pin) == lsBlackLevel;
    }

    /**
     * true if the given sensor is above the black line
     */
    //% subcategory="Rescue Line" color=#00B0A0 group="Sensors"
    //% weight=190
    //% blockId=nezhaV2_line_seen
    //% block="%sensor line sensor sees the line"
    export function lineSeen(sensor: LineSensor): boolean {
        switch (sensor) {
            case LineSensor.Left: return __lineRead(lsPinLeft);
            case LineSensor.Right: return __lineRead(lsPinRight);
            case LineSensor.Middle: return lsHasMiddle ? __lineRead(lsPinMiddle) : false;
        }
        return false;
    }

    /**
     * true if no sensor sees the line (gap, or robot left the line)
     */
    //% subcategory="Rescue Line" color=#00B0A0 group="Sensors"
    //% weight=189
    //% blockId=nezhaV2_line_lost
    //% block="line lost"
    export function lineLost(): boolean {
        if (lineSeen(LineSensor.Left) || lineSeen(LineSensor.Right)) return false;
        if (lsHasMiddle && lineSeen(LineSensor.Middle)) return false;
        return true;
    }

    /**
     * true at a perpendicular intersection or a 90 degree corner: both outer sensors see the line
     */
    //% subcategory="Rescue Line" color=#00B0A0 group="Sensors"
    //% weight=188
    //% blockId=nezhaV2_line_intersection
    //% block="intersection detected"
    export function intersectionDetected(): boolean {
        return lineSeen(LineSensor.Left) && lineSeen(LineSensor.Right);
    }

    /**
     * true at a 90 degree corner in the given direction: only that side sees the line
     */
    //% subcategory="Rescue Line" color=#00B0A0 group="Sensors"
    //% weight=187
    //% blockId=nezhaV2_line_corner
    //% block="90° corner to the %direction detected"
    export function cornerDetected(direction: TurnDirection): boolean {
        if (direction == TurnDirection.Left) {
            return lineSeen(LineSensor.Left) && !lineSeen(LineSensor.Right);
        }
        return lineSeen(LineSensor.Right) && !lineSeen(LineSensor.Left);
    }

    /**
     * true if the colour sensor sees the given field colour (green marker, red goal tile, silver evacuation zone)
     */
    //% subcategory="Rescue Line" color=#00B0A0 group="Sensors"
    //% weight=186
    //% blockId=nezhaV2_line_fieldcolor
    //% block="colour sensor sees %color"
    export function fieldColorIs(color: FieldColor): boolean {
        let hue = 0;
        let brightness = 0;
        let r = 0, g = 0, b = 0;
        if (lineColorSource == ColorSource.PlanetX) {
            hue = planetXColorHue();
            r = planetXColorValue(ColorChannel.Red);
            g = planetXColorValue(ColorChannel.Green);
            b = planetXColorValue(ColorChannel.Blue);
            brightness = pxRaw[0];
        } else {
            hue = colorSensorHue();
            r = colorSensorValue(ColorChannel.Red);
            g = colorSensorValue(ColorChannel.Green);
            b = colorSensorValue(ColorChannel.Blue);
            brightness = colorSensorValue(ColorChannel.Brightness);
        }
        let max = Math.max(r, Math.max(g, b));
        let min = Math.min(r, Math.min(g, b));
        let saturation = max > 0 ? (max - min) / max : 0;
        switch (color) {
            case FieldColor.Green: return saturation >= 0.25 && hue >= 75 && hue < 170;
            case FieldColor.Red: return saturation >= 0.25 && (hue < 20 || hue >= 330);
            case FieldColor.Black: return brightness < lineDarkLevel;
            case FieldColor.White: return brightness >= lineBrightLevel && saturation < 0.25;
            // silver reflects much more strongly than the white floor and stays grey
            case FieldColor.Silver: return brightness >= lineSilverLevel && saturation < 0.25;
        }
        return false;
    }

    let lineDarkLevel = 400;
    let lineBrightLevel = 1200;
    let lineSilverLevel = 2600;

    /**
     * Brightness thresholds for black, white and silver (read them out with the colour sensor blocks first)
     * @param dark below this value counts as black, eg: 400
     * @param bright from this value counts as white, eg: 1200
     * @param silver from this value counts as silver, eg: 2600
     */
    //% subcategory="Rescue Line" color=#00B0A0 group="Setup"
    //% weight=195
    //% blockId=nezhaV2_line_levels
    //% block="brightness thresholds black < %dark white ≥ %bright silver ≥ %silver"
    //% inlineInputMode=inline
    export function setFieldColorLevels(dark: number, bright: number, silver: number): void {
        lineDarkLevel = dark;
        lineBrightLevel = bright;
        lineSilverLevel = silver;
    }

    /**
     * Tilt of the robot in degrees (positive = nose up): ramps up to 25°, seesaws up to 20°
     */
    //% subcategory="Rescue Line" color=#00B0A0 group="Sensors"
    //% weight=185
    //% blockId=nezhaV2_line_tilt
    //% block="tilt angle (°)"
    export function tiltAngle(): number {
        return input.rotation(Rotation.Pitch);
    }

    /**
     * One step of line following - use it inside a loop
     */
    //% subcategory="Rescue Line" color=#00B0A0 group="Drive"
    //% weight=180
    //% blockId=nezhaV2_line_follow_step
    //% block="follow the line at %speed \\%"
    //% speed.min=0 speed.max=100 speed.defl=40
    export function followLineStep(speed: number): void {
        let left = lineSeen(LineSensor.Left);
        let right = lineSeen(LineSensor.Right);
        let inner = Math.round(speed * (1 - lineGain));
        if (left && !right) {
            driveSteer(inner, speed);
        } else if (right && !left) {
            driveSteer(speed, inner);
        } else {
            driveSteer(speed, speed);
        }
    }

    /**
     * Follows the line for the given time
     * @param ms duration in milliseconds, eg: 1000
     */
    //% subcategory="Rescue Line" color=#00B0A0 group="Drive"
    //% weight=179
    //% blockId=nezhaV2_line_follow_ms
    //% block="follow the line at %speed \\% for %ms ms"
    //% speed.min=0 speed.max=100 speed.defl=40 ms.defl=1000
    //% inlineInputMode=inline
    export function followLineFor(speed: number, ms: number): void {
        let end = input.runningTime() + ms;
        while (input.runningTime() < end) {
            followLineStep(speed);
            basic.pause(10);
        }
        driveStop();
    }

    // estimated driving time for a distance, from wheel circumference and speed
    function __driveTimeMs(cm: number, speed: number): number {
        if (degreeToDistance > 0 && speed > 0) {
            let cmPerSecond = speed * 9 / 360 * degreeToDistance;
            if (cmPerSecond > 0) {
                return cm / cmPerSecond * 1000;
            }
        }
        return cm * 100; // fallback without wheel circumference
    }

    /**
     * Drives straight ahead over a gap (max. 20 cm by the rules) until the line is found again
     * @param maxCm how far to search at most, eg: 25
     */
    //% subcategory="Rescue Line" color=#00B0A0 group="Manoeuvres"
    //% weight=170
    //% blockId=nezhaV2_line_gap
    //% block="bridge gap at %speed \\% up to %maxCm cm"
    //% speed.min=0 speed.max=100 speed.defl=35 maxCm.defl=25
    //% inlineInputMode=inline
    export function bridgeGap(speed: number, maxCm: number): boolean {
        let end = input.runningTime() + __driveTimeMs(maxCm, speed);
        driveStart(VerticallDirection.Up, speed);
        while (input.runningTime() < end) {
            if (!lineLost()) {
                driveStop();
                return true;
            }
            basic.pause(5);
        }
        driveStop();
        return false;
    }

    /**
     * Turns on the spot until a line sensor finds the line again
     * @param maxAngle largest angle to turn, eg: 120
     */
    //% subcategory="Rescue Line" color=#00B0A0 group="Manoeuvres"
    //% weight=169
    //% blockId=nezhaV2_line_turn_until
    //% block="turn %direction at %speed \\% until the line is found (max %maxAngle °)"
    //% speed.min=0 speed.max=100 speed.defl=30 maxAngle.defl=120
    //% inlineInputMode=inline
    export function turnUntilLine(direction: TurnDirection, speed: number, maxAngle: number): boolean {
        // estimated turning time from the wheelbase
        let ms = 1500;
        if (wheelBaseDistance > 0 && degreeToDistance > 0) {
            let arc = maxAngle * Math.PI / 180 * (wheelBaseDistance / 2);
            ms = __driveTimeMs(arc, speed);
        }
        let end = input.runningTime() + ms;
        if (direction == TurnDirection.Right) {
            driveSteer(speed, -speed);
        } else {
            driveSteer(-speed, speed);
        }
        // first leave the current line, then look for the new one
        basic.pause(150);
        while (input.runningTime() < end) {
            if (direction == TurnDirection.Right ? lineSeen(LineSensor.Right) : lineSeen(LineSensor.Left)) {
                driveStop();
                return true;
            }
            if (lsHasMiddle && lineSeen(LineSensor.Middle)) {
                driveStop();
                return true;
            }
            basic.pause(5);
        }
        driveStop();
        return false;
    }

    /**
     * Searches for the line by sweeping left and right (after a gap, a corner or an obstacle)
     */
    //% subcategory="Rescue Line" color=#00B0A0 group="Manoeuvres"
    //% weight=168
    //% blockId=nezhaV2_line_search
    //% block="search for the line at %speed \\%"
    //% speed.min=0 speed.max=100 speed.defl=30
    export function searchLine(speed: number): boolean {
        if (!lineLost()) return true;
        if (turnUntilLine(TurnDirection.Left, speed, 60)) return true;
        if (turnUntilLine(TurnDirection.Right, speed, 120)) return true;
        if (turnUntilLine(TurnDirection.Left, speed, 60)) return true;
        return false;
    }

    /**
     * Crosses an intersection: drives onto the intersection, then leaves it in the given direction and picks the line up again
     */
    //% subcategory="Rescue Line" color=#00B0A0 group="Manoeuvres"
    //% weight=167
    //% blockId=nezhaV2_line_cross
    //% block="take intersection %direction at %speed \\%"
    //% speed.min=0 speed.max=100 speed.defl=35
    //% inlineInputMode=inline
    export function crossIntersection(direction: ExitDirection, speed: number): boolean {
        // move the wheels onto the centre of the intersection
        driveStart(VerticallDirection.Up, speed);
        basic.pause(__driveTimeMs(8, speed));
        driveStop();
        if (direction == ExitDirection.Left) {
            return turnUntilLine(TurnDirection.Left, speed, 150);
        } else if (direction == ExitDirection.Right) {
            return turnUntilLine(TurnDirection.Right, speed, 150);
        }
        // straight ahead: there may be a gap right after the intersection
        if (lineLost()) {
            return bridgeGap(speed, 25);
        }
        return true;
    }

    /**
     * true if the colour sensor sees a green marker (marker is placed just before the intersection)
     */
    //% subcategory="Rescue Line" color=#00B0A0 group="Sensors"
    //% weight=184
    //% blockId=nezhaV2_line_marker
    //% block="green marker detected"
    export function greenMarkerSeen(): boolean {
        return fieldColorIs(FieldColor.Green);
    }

    /**
     * Drives around an obstacle (at least 15 cm high, 25 cm free space around it) and looks for the line again
     * @param sideCm how far to drive sideways, eg: 20
     * @param aroundCm how far to drive past the obstacle, eg: 30
     */
    //% subcategory="Rescue Line" color=#00B0A0 group="Manoeuvres"
    //% weight=165
    //% blockId=nezhaV2_line_avoid
    //% block="drive around obstacle to the %direction at %speed \\% (%sideCm cm sideways, %aroundCm cm past)"
    //% speed.min=0 speed.max=100 speed.defl=35 sideCm.defl=20 aroundCm.defl=30
    //% inlineInputMode=inline
    export function avoidObstacle(direction: TurnDirection, speed: number, sideCm: number, aroundCm: number): boolean {
        let away = direction;
        let back = direction == TurnDirection.Left ? TurnDirection.Right : TurnDirection.Left;
        driveTurn(away, 90, speed);
        driveStart(VerticallDirection.Up, speed);
        basic.pause(__driveTimeMs(sideCm, speed));
        driveStop();
        driveTurn(back, 90, speed);
        driveStart(VerticallDirection.Up, speed);
        basic.pause(__driveTimeMs(aroundCm, speed));
        driveStop();
        driveTurn(back, 90, speed);
        // drive back towards the line until a sensor finds it
        return bridgeGap(speed, sideCm + 15);
    }

    // ===================== OLED display (SSD1306, I2C) =====================
    // own driver, no external extension needed
    // 5x7 font for ASCII 32..126, 5 bytes per character (bit 0 = top row)

    const OLED_FONT = hex`00000000005E000000000600060000143C751F04005C7C74000E1A7C5820304E5262500600000000007F000000003E000000000C1E120010107C1010004000000010101000000040000000006018060018664A7E0000427E40004062524E004052527E002028267E20404E4A7A00187E5272000242320E00207E527E00044E4A3E000048000000004800000000303048002828282828484830300000025A0600784C343438603C263840007E527E00107E4242007E42423C00007E525200007E12120018664272007E10107E0000427E42004042423E007E181C6240007E4040407E0E180E7E7E0E187E001866427E00007E0A0E041866427E007E0A0A3E40044E5A720002027E02021E60407E00023C601C021E7018700E4026182640020C78060000625A4642007F410000000C304000417F0000000004020400000000000000000000002078587800007F48780000784848003078487F00307858580000087F09003078487800007F08780000487940000008790000007F10680000017F4000780878087000780878002078487800007848780030784878007818080800005848680008087C480000784078000830403800186030601800683048000030603800004848480000087F41007F0000000000417F08001010101010`;

    let oledAddr = 0x3C;
    let oledReady = false;
    let oledBig = false;

    function __oledCmd(c: number): void {
        let b = pins.createBuffer(2);
        b[0] = 0x00;
        b[1] = c;
        pins.i2cWriteBuffer(oledAddr, b);
    }

    function __oledPos(col: number, page: number): void {
        __oledCmd(0xB0 | page);
        __oledCmd(0x00 | (col & 0x0F));
        __oledCmd(0x10 | (col >> 4));
    }

    // writes one page (row of 8 pixels) starting at column 0
    function __oledWritePage(page: number, data: Buffer): void {
        __oledPos(0, page);
        let out = pins.createBuffer(data.length + 1);
        out[0] = 0x40;
        for (let i = 0; i < data.length; i++) {
            out[i + 1] = data[i];
        }
        pins.i2cWriteBuffer(oledAddr, out);
    }

    // doubles the pixels of a column: half 0 = upper half, half 1 = lower half
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

    /**
     * Switches the OLED display on (usual I2C address 0x3C = 60, some modules use 0x3D = 61)
     * @param address I2C address of the display, eg: 60
     */
    //% subcategory="Display" color=#5C6BC0 group="Setup"
    //% weight=160
    //% blockId=nezhaV2_oled_start
    //% block="start display (address %address)"
    //% address.defl=60
    export function displayStart(address: number): void {
        oledAddr = address;
        __oledCmd(0xAE);             // display off
        __oledCmd(0xD5); __oledCmd(0x80);  // clock
        __oledCmd(0xA8); __oledCmd(0x3F);  // multiplex 1/64
        __oledCmd(0xD3); __oledCmd(0x00);  // no offset
        __oledCmd(0x40);             // start line 0
        __oledCmd(0x8D); __oledCmd(0x14);  // charge pump on
        __oledCmd(0x20); __oledCmd(0x02);  // page addressing mode
        __oledCmd(0xA1);             // segment remap
        __oledCmd(0xC8);             // scan direction
        __oledCmd(0xDA); __oledCmd(0x12);  // COM pins
        __oledCmd(0x81); __oledCmd(0x7F);  // contrast
        __oledCmd(0xD9); __oledCmd(0xF1);  // precharge
        __oledCmd(0xDB); __oledCmd(0x40);  // VCOM
        __oledCmd(0xA4);             // follow RAM
        __oledCmd(0xA6);             // not inverted
        __oledCmd(0xAF);             // display on
        oledReady = true;
        displayClear();
    }

    /**
     * Clears the display
     */
    //% subcategory="Display" color=#5C6BC0 group="Setup"
    //% weight=159
    //% blockId=nezhaV2_oled_clear
    //% block="clear display"
    export function displayClear(): void {
        if (!oledReady) return;
        let empty = pins.createBuffer(128);
        for (let page = 0; page < 8; page++) {
            __oledWritePage(page, empty);
        }
    }

    /**
     * Large font (10 characters per line, 4 lines) or small font (21 characters, 8 lines)
     */
    //% subcategory="Display" color=#5C6BC0 group="Setup"
    //% weight=158
    //% blockId=nezhaV2_oled_big
    //% block="display large font %big"
    //% big.shadow="toggleOnOff" big.defl=false
    export function displayBigFont(big: boolean): void {
        oledBig = big;
    }

    /**
     * Writes a line of text (line 0 is at the top). Small font: lines 0-7, large font: lines 0-3.
     * @param line line number, eg: 0
     */
    //% subcategory="Display" color=#5C6BC0 group="Show"
    //% weight=157
    //% blockId=nezhaV2_oled_text
    //% block="show %text in line %line"
    //% line.min=0 line.max=7 line.defl=0
    //% inlineInputMode=inline
    export function displayText(text: string, line: number): void {
        if (!oledReady) return;
        if (line < 0) line = 0;
        if (oledBig) {
            if (line > 3) line = 3;
            let top = pins.createBuffer(128);
            let bottom = pins.createBuffer(128);
            let x = 0;
            for (let n = 0; n < text.length && x <= 116; n++) {
                let code = text.charCodeAt(n);
                for (let c = 0; c < 5; c++) {
                    let b = __oledFontByte(code, c);
                    top[x] = __oledStretch(b, 0);
                    top[x + 1] = top[x];
                    bottom[x] = __oledStretch(b, 1);
                    bottom[x + 1] = bottom[x];
                    x += 2;
                }
                x += 2; // gap between characters
            }
            __oledWritePage(line * 2, top);
            __oledWritePage(line * 2 + 1, bottom);
        } else {
            if (line > 7) line = 7;
            let row = pins.createBuffer(128);
            let pos = 0;
            for (let n = 0; n < text.length && pos <= 122; n++) {
                let code = text.charCodeAt(n);
                for (let c = 0; c < 5; c++) {
                    row[pos + c] = __oledFontByte(code, c);
                }
                pos += 6; // 5 pixels plus a gap
            }
            __oledWritePage(line, row);
        }
    }

    /**
     * Writes a label and a value, e.g. "Distance: 23"
     * @param line line number, eg: 0
     */
    //% subcategory="Display" color=#5C6BC0 group="Show"
    //% weight=156
    //% blockId=nezhaV2_oled_value
    //% block="show %label = %value in line %line"
    //% line.min=0 line.max=7 line.defl=0
    //% inlineInputMode=inline
    export function displayValue(label: string, value: number, line: number): void {
        displayText(label + ": " + value, line);
    }

    /**
     * Shows the state of the line sensors and the drive speed - handy while tuning
     * @param speed current speed, eg: 40
     * @param line line number, eg: 0
     */
    //% subcategory="Display" color=#5C6BC0 group="Show"
    //% weight=155
    //% blockId=nezhaV2_oled_linestate
    //% block="show line sensor state at %speed \\% in line %line"
    //% speed.min=0 speed.max=100 speed.defl=40 line.min=0 line.max=7 line.defl=0
    //% inlineInputMode=inline
    export function displayLineState(speed: number, line: number): void {
        let l = lineSeen(LineSensor.Left) ? "1" : "0";
        let m = lsHasMiddle ? (lineSeen(LineSensor.Middle) ? "1" : "0") : "-";
        let r = lineSeen(LineSensor.Right) ? "1" : "0";
        displayText("L" + l + " M" + m + " R" + r + "  v" + speed + "%", line);
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
