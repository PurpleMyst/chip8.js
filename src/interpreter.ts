"use strict";

export const TIMER_FREQUENCY = 60 /* hz */;
export const STACK_LIMIT = 16 /* calls */;

function extractAddress(instruction: number) {
    return instruction & 0x0FFF;
}

function extractRegister(instruction: number) {
    return (instruction & 0x0F00) >> (8);
}

function extractRegisterAndConstant(instruction: number) {
    return [(instruction & 0x0F00) >> 8, instruction & 0x00FF];
}

function extractTwoRegisters(instruction: number) {
    return [(instruction & 0x0F00) >> 8, (instruction & 0x00F0) >> 4];
}

function extractTwoRegistersAndConstant(instruction: number) {
    return [(instruction & 0x0F00) >> 8, (instruction & 0x00F0) >> 4, instruction & 0x000F];
}

export class Chip8Interpreter {
    // Main memory
    // 0x000-0x1FF is internal memory which we utilize for character ROM.
    // 0x200 and up is the program's memory
    memory: Uint8Array;

    // 16 registers
    registers: Uint8Array;

    // I register
    addressRegister: number;

    // Program counter, must always be even.
    pc: number;

    // Stack, implemented as a stackpointer + array to be true to the spec.
    sp: number;
    stack: Uint16Array;

    // Timers. The sound timer does nothing.
    delayTimer: number;
    soundTimer: number;

    // Width in internal pixels (not screen pixels)
    width: number;
    height: number;

    // Internal display. Each pixel is either 0 and 1.
    display: Uint8Array;

    // Canvas and context.
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;

    // Key handling
    state: "running" | "waitkeypress" | "finished";
    keys: Uint8Array;
    keypressRegister: number | null;

    constructor(canvas: HTMLCanvasElement, width: number = 64, height: number = 32) {
        this.memory = new Uint8Array(4096);

        this.registers = new Uint8Array(16);
        this.addressRegister = 0;
        this.pc = 0x200;

        this.sp = -1;
        this.stack = new Uint16Array(STACK_LIMIT);

        this.delayTimer = 0;
        this.soundTimer = 0;

        setInterval(() => {
            this.delayTimer -= 1;
            this.soundTimer -= 1;
        }, 1000 / TIMER_FREQUENCY);

        this.width = width;
        this.height = height;
        this.display = new Uint8Array(this.width * this.height);

        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");

        this.state = "running";
        this.keys = new Uint8Array(16);
        this.keypressRegister = null;

        this._loadCharacters();
    }

    _loadCharacters() {
        const characters = [
            [0xF0, 0x90, 0x90, 0x90, 0xF0], // 0
            [0x20, 0x60, 0x20, 0x20, 0x70], // 1
            [0xF0, 0x10, 0xF0, 0x80, 0xF0], // 2
            [0xF0, 0x10, 0xF0, 0x10, 0xF0], // 3
            [0x90, 0x90, 0xF0, 0x10, 0x10], // 4
            [0xF0, 0x80, 0xF0, 0x10, 0xF0], // 5
            [0xF0, 0x80, 0xF0, 0x90, 0xF0], // 6
            [0xF0, 0x10, 0x20, 0x40, 0x40], // 7
            [0xF0, 0x90, 0xF0, 0x90, 0xF0], // 8
            [0xF0, 0x90, 0xF0, 0x10, 0xF0], // 9
            [0xF0, 0x90, 0xF0, 0x90, 0x90], // A
            [0xE0, 0x90, 0xE0, 0x90, 0xE0], // B
            [0xF0, 0x80, 0x80, 0x80, 0xF0], // C
            [0xE0, 0x90, 0x90, 0x90, 0xE0], // D
            [0xF0, 0x80, 0xF0, 0x80, 0xF0], // E
            [0xF0, 0x80, 0xF0, 0x80, 0x80], // F
        ];

        let i = 0;
        for (let character of characters) {
            for (let byte of character) {
                this.memory[i++] = byte;
            }
        }
    }

    loadROMData(data: Uint8Array) {
        for (let i = 0; i < data.length; ++i) {
            this.memory[this.pc + i] = data[i];
        }
    }

    draw() {
        const pixelWidth = this.canvas.width / this.width;
        const pixelHeight = this.canvas.height / this.height;

        this.ctx.fillStyle = "black";
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)

        this.ctx.fillStyle = "white";
        for (let y = 0; y < this.height; ++y) {
            for (let x = 0; x < this.width; ++x) {
                const index = y * this.width + x;
                const pixel = this.display[index];
                if (pixel) this.ctx.fillRect(x * pixelWidth, y * pixelHeight, pixelWidth, pixelHeight);
            }
        }
    }

    executeInstruction(instruction: number) {
        switch ((instruction & 0xF000) >> (8 + 4)) {
            case 0: {
                if (instruction === 0x00E0) {
                    this.display = this.display.map(() => 0);
                } else if (instruction === 0x00EE) {
                    this.pc = this.stack[this.sp];
                    this.sp -= 1;
                } else {
                    console.error(`Unknown instruction: ${instruction.toString(16)}`);
                    return "break";
                }
                break;
            }

            case 1: {
                this.pc = extractAddress(instruction);
                break;
            }

            case 2: {
                this.sp += 1;
                this.stack[this.sp] = this.pc;
                this.pc = extractAddress(instruction);
                break;
            }

            case 3: {
                const [register, constant] = extractRegisterAndConstant(instruction);
                if (this.registers[register] === constant) {
                    this.pc += 2;
                }
                break;
            }

            case 4: {
                const [register, constant] = extractRegisterAndConstant(instruction);
                if (this.registers[register] !== constant) {
                    this.pc += 2;
                }
                break;
            }

            case 5: {
                const [registerX, registerY] = extractTwoRegisters(instruction);
                if (this.registers[registerX] === this.registers[registerY]) {
                    this.pc += 2;
                }
                break;
            }

            case 6: {
                const [register, constant] = extractRegisterAndConstant(instruction);
                this.registers[register] = constant;
                break;
            }

            case 7: {
                const [register, constant] = extractRegisterAndConstant(instruction);
                this.registers[register] += constant;
                break;
            }

            case 8: {
                const [registerX, registerY] = extractTwoRegisters(instruction);
                switch (instruction & 0xF) {
                    case 0: {
                        this.registers[registerX] = this.registers[registerY];
                        break;
                    }

                    case 1: {
                        this.registers[registerX] |= this.registers[registerY];
                        break;
                    }

                    case 2: {
                        this.registers[registerX] &= this.registers[registerY];
                        break;
                    }

                    case 3: {
                        this.registers[registerX] ^= this.registers[registerY];
                        break;
                    }

                    case 4: {
                        const result = this.registers[registerX] + this.registers[registerY];
                        this.registers[registerX] = result;
                        this.registers[0xF] = result > 0xFF ? 1 : 0;
                        break;
                    }

                    case 5: {
                        const notBorrow = this.registers[registerX] > this.registers[registerY];
                        this.registers[registerX] = this.registers[registerX] - this.registers[registerY];
                        this.registers[0xF] = notBorrow ? 1 : 0;
                        break;
                    }

                    case 6: {
                        const lsb = this.registers[registerX] & 1;
                        this.registers[registerX] >>= 1;
                        this.registers[0xF] = lsb;
                        break;
                    }

                    case 7: {
                        const notBorrow = this.registers[registerY] > this.registers[registerX];
                        this.registers[registerX] = this.registers[registerY] - this.registers[registerX];
                        this.registers[0xF] = notBorrow ? 1 : 0;
                        break;
                    }

                    case 0xE: {
                        const msb = this.registers[registerX] & 0b10000000;
                        this.registers[registerX] <<= 1;
                        this.registers[0xF] = msb ? 1 : 0;
                        break;
                    }

                    default: {
                        console.error(`Unknown instruction: ${instruction.toString(16)}`);
                        this.state = "finished";
                    }
                }
                break;
            }

            case 0xA: {
                const address = extractAddress(instruction);
                this.addressRegister = address;
                break;
            }

            case 0xC: {
                const [register, constant] = extractRegisterAndConstant(instruction);
                this.registers[register] = Math.floor(Math.random() * 256) & constant;
                break;
            }

            case 0xD: {
                const [registerX, registerY, height] = extractTwoRegistersAndConstant(instruction);

                const screenX = this.registers[registerX];
                const screenY = this.registers[registerY];

                for (let y = 0; y < height; ++y) {
                    const row = this.memory[this.addressRegister + y];

                    for (let x = 0; x < 8; ++x) {
                        const pixel = (row & (1 << (7 - x))) >> (7 - x);
                        const index = (screenY + y) * this.width + (screenX + x);
                        if (this.display[index] && pixel) this.registers[0xF] = 1;
                        this.display[index] ^= pixel ? 1 : 0;
                    }
                }

                this.draw();
                break;
            }

            case 0xE: {
                const register = extractRegister(instruction);

                switch (instruction & 0xFF) {
                    case 0x9E: {
                        if (this.keys[this.registers[register]]) {
                            this.pc += 2;
                        }
                        break;
                    }

                    case 0xA1: {
                        if (!this.keys[this.registers[register]]) {
                            this.pc += 2;
                        }
                        break;
                    }

                    default: {
                        console.error(`Unknown instruction: ${instruction.toString(16)}`);
                        this.state = "finished";
                    }
                }

                break;
            }

            case 0xF: {
                const register = extractRegister(instruction);

                switch (instruction & 0xFF) {
                    case 0x07: {
                        this.registers[register] = this.delayTimer;
                        break;
                    }

                    case 0x0A: {
                        this.state = "waitkeypress";
                        this.keypressRegister = register;
                        break;
                    }

                    case 0x15: {
                        this.delayTimer = this.registers[register];
                        break;
                    }

                    case 0x18: {
                        this.soundTimer = this.registers[register];
                        break;
                    }

                    case 0x1E: {
                        this.addressRegister += this.registers[register];
                        this.addressRegister &= 0xFFFF;
                        break;
                    }

                    case 0x29: {
                        this.addressRegister = 5 * this.registers[register];
                        break;
                    }

                    case 0x33: {
                        let registerValue = this.registers[register];

                        for (let i = 2; i >= 0; --i) {
                            this.memory[this.addressRegister + i] = registerValue % 10;
                            registerValue /= 10;
                        }

                        break;
                    }

                    case 0x55: {
                        for (let i = 0; i <= register; ++i) {
                            this.memory[this.addressRegister + i] = this.registers[i];
                        }
                        break;
                    }

                    case 0x65: {
                        for (let i = 0; i <= register; ++i) {
                            this.registers[i] = this.memory[this.addressRegister + i];
                        }
                        break;
                    }

                    default: {
                        console.error(`Unknown instruction: ${instruction.toString(16)}`);
                        this.state = "finished";
                    }
                }
                break;
            }

            default:
                console.error(`Unknown instruction: ${instruction.toString(16)}`);
                this.state = "finished";
        }
    }

    keydown(key: number) {
        this.keys[key] = 1;
        if (this.state == "waitkeypress") {
            console.assert(this.keypressRegister !== null);
            this.registers[this.keypressRegister] = key;
        }
    }

    keyup(key: number) {
        this.keys[key] = 0;
    }

    cycle() {
        if (this.state === "running") {
            const instruction = (this.memory[this.pc] << 8) | (this.memory[this.pc + 1]);
            this.pc += 2;
            return this.executeInstruction(instruction);
        }
    }
}
