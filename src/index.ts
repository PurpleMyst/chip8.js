"use strict";

import { askForROMFile, readROM } from "./rom_manager";
import { Chip8Interpreter } from "./interpreter";

askForROMFile()
    .then(file => readROM(file))
    .then(data => {
        const canvas = document.createElement("canvas");
        canvas.width = 64 * 10;
        canvas.height = 32 * 10;
        document.body.appendChild(canvas);

        const interpreter = new Chip8Interpreter(canvas);
        const rom = new Uint8Array(data);
        interpreter.loadROMData(rom);

        window.requestAnimationFrame(function loop() {
            interpreter.cycle();
            window.requestAnimationFrame(loop);
        });
    });
