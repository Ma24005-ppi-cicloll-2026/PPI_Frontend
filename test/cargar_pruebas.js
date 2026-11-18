import * as chaiLocal from "./js/lib/chai/index.js";

window.chai = chaiLocal;

// Carga un script y espera a que termine antes de seguir.
function cargar(src) {
    return new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = src;
        script.onload = resolve;
        script.onerror = () => reject(new Error("No se pudo cargar " + src));
        document.head.append(script);
    });
}

// Carga las dependencias y suites en el orden declarado en el documento.
for (const etiqueta of document.querySelectorAll("script[data-prueba]"))
    await cargar(etiqueta.dataset.prueba);

mocha.run();
