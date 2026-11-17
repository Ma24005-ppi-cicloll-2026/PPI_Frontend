import * as chaiLocal from "./js/lib/chai/index.js";

// El runner y sus ayudantes se sirven desde el repositorio: las pruebas abren incluso sin internet.
window.chai = chaiLocal;

function cargar(src) {
    return new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = src;
        script.onload = resolve;
        script.onerror = () => reject(new Error("No se pudo cargar " + src));
        document.head.append(script);
    });
}

for (const etiqueta of document.querySelectorAll("script[data-prueba]"))
    await cargar(etiqueta.dataset.prueba);

mocha.run();
