{
const { expect } = chai;

describe("<galeno-guia-instalacion>", () => {
    let el;
    // Busca el cuadro visible dentro del componente.
    const caja = () => el.shadowRoot.querySelector(".caja");
    // Comprueba si se muestra la interfaz de prueba.
    const visible = () => !caja().hidden;
    // Prepara el entorno de las pruebas.
    beforeEach(() => { el = document.createElement("galeno-guia-instalacion"); document.body.append(el); });
    // Limpia el entorno al terminar las pruebas.
    afterEach(() => el.remove());

    it("empieza cerrada", () => {
        expect(visible()).to.equal(false);
    });
    it("se abre con 'galeno-abrir-guia' en la ventana", () => {
        window.dispatchEvent(new Event("galeno-abrir-guia"));
        expect(visible()).to.equal(true);
        expect(caja().getAttribute("role")).to.equal("dialog");
        expect(caja().getAttribute("aria-modal")).to.equal("true");
        expect(caja().getAttribute("aria-labelledby")).to.equal("guia-titulo");
    });
    it("muestra los 3 pasos de iOS en espanol", () => {
        window.dispatchEvent(new Event("galeno-abrir-guia"));
        const pasos = el.shadowRoot.querySelectorAll(".caja ol li");
        expect(pasos.length).to.equal(3);
        const texto = caja().textContent;
        expect(texto).to.contain("Toque Compartir");
        expect(texto).to.contain("Agregar a pantalla de inicio");
        expect(texto).to.contain("Confirme");
        expect(caja().querySelectorAll(".icono svg").length).to.equal(3);
    });
    it("al abrir enfoca el primer control del dialogo (el boton de cerrar)", () => {
        window.dispatchEvent(new Event("galeno-abrir-guia"));
        expect(el.shadowRoot.activeElement).to.equal(el.shadowRoot.querySelector(".cerrar"));
    });
    it("el foco queda atrapado: Tab no sale del dialogo", () => {
        window.dispatchEvent(new Event("galeno-abrir-guia"));
        const cerrar = el.shadowRoot.querySelector(".cerrar");
        window.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab" }));
        expect(el.shadowRoot.activeElement).to.equal(cerrar);
    });
    it("Escape cierra y devuelve el foco al elemento que lo tenia antes", () => {
        const otro = document.createElement("button");
        document.body.append(otro);
        try {
            otro.focus();
            window.dispatchEvent(new Event("galeno-abrir-guia"));
            expect(visible()).to.equal(true);
            window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
            expect(visible()).to.equal(false);
            expect(document.activeElement).to.equal(otro);
        } finally { otro.remove(); }
    });
    it("el boton de cerrar tambien cierra", () => {
        window.dispatchEvent(new Event("galeno-abrir-guia"));
        el.shadowRoot.querySelector(".cerrar").click();
        expect(visible()).to.equal(false);
    });
    it("abrir dos veces seguidas no rompe; cerrada ignora Escape", () => {
        window.dispatchEvent(new Event("galeno-abrir-guia"));
        window.dispatchEvent(new Event("galeno-abrir-guia"));
        expect(visible()).to.equal(true);
        el.shadowRoot.querySelector(".cerrar").click();
        window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
        expect(visible()).to.equal(false);
    });
    it("al quitarlo de la pagina deja de escuchar la ventana", () => {
        el.remove();
        window.dispatchEvent(new Event("galeno-abrir-guia"));
        expect(caja().hidden).to.equal(true);
    });
});
}
