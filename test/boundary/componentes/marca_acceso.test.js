{
const { expect } = chai;

describe("<galeno-marca-acceso>", () => {
    let contenedor, raiz;

    // Prepara el entorno de las pruebas.
    beforeEach(() => {
        contenedor = document.createElement("div");
        contenedor.style.cssText = "container:acceso / inline-size; width:60rem";
        contenedor.append(document.createElement("galeno-marca-acceso"));
        document.body.append(contenedor);
        raiz = contenedor.firstElementChild.shadowRoot;
    });

    // Limpia el entorno al terminar las pruebas.
    afterEach(() => contenedor.remove());

    it("expone el nombre, el título, el lema y los tres puntos de valor en orden", () => {
        const marca = raiz.querySelector(".marca");
        const textos = [...marca.querySelectorAll("p, li")];
        expect(textos.map(nodo => nodo.textContent.trim())).to.deep.equal([
            "GalenoSV", "Portal de empleados", "Cada paciente, con todo su contexto a la mano.",
            "Acceso con tu documento", "Tus consultas del día", "Funciona sin conexión"
        ]);
        expect(textos.every(nodo => !nodo.closest('[aria-hidden="true"]'))).to.equal(true);
    });

    it("oculta todas las ilustraciones a los lectores de pantalla", () => {
        const dibujos = [...raiz.querySelectorAll("svg")];
        expect(dibujos).to.have.length(6);
        expect(dibujos.every(svg => svg.getAttribute("aria-hidden") === "true" &&
            svg.getAttribute("focusable") === "false")).to.equal(true);
    });

    it("anima el pulso y dibuja el trazo completo al reducir el movimiento", () => {
        const trazo = raiz.querySelector(".trazo");
        const reducido = matchMedia("(prefers-reduced-motion: reduce)").matches;
        expect(getComputedStyle(trazo).animationName).to.equal(reducido ? "none" : "pulso");
        const reglas = [...raiz.querySelector("style").sheet.cssRules];
        const media = reglas.find(regla => regla.conditionText === "(prefers-reduced-motion: reduce)");
        const estatica = [...media.cssRules].find(regla => regla.selectorText === ".trazo").style;
        expect(estatica.animation).to.equal("none");
        expect(estatica.strokeDasharray).to.equal("none");
        expect(estatica.strokeDashoffset).to.equal("0");
    });
});
}
