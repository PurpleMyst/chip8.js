export function askForROMFile(): Promise<File> {
    return new Promise((resolve, _reject) => {
        const $fileInput = document.createElement("input");
        $fileInput.type = "file";
        document.body.appendChild($fileInput);

        $fileInput.addEventListener("input", () => {
            const file = $fileInput.files[0];
            $fileInput.remove();
            resolve(file);
        });
    });
}

export function readROM(file: File): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => {
        // @ts-ignore We, the hoomans, know that reader.result is an ArrayBuffer. TS does not.
        resolve(reader.result);
    });
    reader.readAsArrayBuffer(file);
    });
}
