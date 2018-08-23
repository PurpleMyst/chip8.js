"use strict";

import { Chip8Interpreter } from "./interpreter.js";

const canvas = document.createElement("canvas");
canvas.width = 64 * 10;
canvas.height = 32 * 10;
document.body.appendChild(canvas);

const interpreter = new Chip8Interpreter(canvas);

fetch("roms/BC_test.ch8").then(response => response.arrayBuffer()).then(buffer => {
    interpreter.loadROMData(new Uint8Array(buffer));

    window.requestAnimationFrame(function loop() {
        const status = interpreter.cycle();
        if (status === "break") return;
        window.requestAnimationFrame(loop);
    });
});
