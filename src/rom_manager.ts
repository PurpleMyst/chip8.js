import { Chip8Interpreter } from './interpreter.ts';

export function askForROM() {
    const $fileInput = document.createElement("input");
    $fileInput.type = "file";
    document.body.appendChild($fileInput);

    $fileInput.addEventListener("input", () => {
        const file = $fileInput.files[0];
        $fileInput.remove();
        readROM(file);
    });
}

function readROM(file: File) {
    const reader = new FileReader();
    reader.addEventListener("load", () => {
        // @ts-ignore We, the hoomans, know that reader.result is an ArrayBuffer. TS does not.
        const rom = new Uint8Array(reader.result);
        const interpreter = createInterpreter(rom);

        window.requestAnimationFrame(function loop() {
            interpreter.cycle();
            window.requestAnimationFrame(loop);
        });
    });
    reader.readAsArrayBuffer(file);
}

function createInterpreter(rom: Uint8Array) {
    const canvas = document.createElement("canvas");
    canvas.width = 640;
    canvas.height = 320;
    document.body.appendChild(canvas);
    const interpreter = new Chip8Interpreter(canvas);
    interpreter.loadROMData(rom);
    return interpreter;
}
