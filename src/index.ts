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

        const keyToIndex = (key: string) => parseInt(key, 16);

        window.addEventListener("keydown", e => {
            let index = keyToIndex(e.key);
            if (!isNaN(index)) interpreter.keydown(index);
        });

        window.addEventListener("keyup", e => {
            let index = keyToIndex(e.key);
            if (!isNaN(index)) interpreter.keyup(index);
        });

        let lastUpdate: number | null = null;

        const $ipsInput = document.createElement("input");
        $ipsInput.name = "ips";
        $ipsInput.type = "range";
        $ipsInput.min = "0";
        $ipsInput.value = "1200";
        $ipsInput.max = "2500";
        document.body.appendChild($ipsInput);

        const $ipsInputLabel = document.createElement("label");
        $ipsInputLabel.setAttribute("for", "ips");
        $ipsInputLabel.textContent = `Instructions Per Second (${$ipsInput.value})`;
        document.body.appendChild($ipsInputLabel);

        let msPerFrame = (1 / +$ipsInput.value) * 1000;
        $ipsInput.addEventListener("input", () => {
            msPerFrame = (1 / +$ipsInput.value) * 1000;
            $ipsInputLabel.textContent = `Instructions Per Second (${$ipsInput.value})`;
        })

        window.requestAnimationFrame(function loop(timestamp) {

            if (lastUpdate !== null) {
                const dt = timestamp - lastUpdate;
                const frames = dt / msPerFrame;
                for (let i = 0; i < frames; ++i) {
                    interpreter.cycle();
                }
            }
            lastUpdate = timestamp;
            window.requestAnimationFrame(loop);
        });
    });
