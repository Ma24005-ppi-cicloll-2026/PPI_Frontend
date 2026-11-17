// Pruebas del control segmentado <galeno-segmentado> (Fechas del Dashboard).
// API tipo galeno-selector; a diferencia del selector, seleccionar() por programa
// TAMBIEN emite "galeno-seleccion" (el dashboard repinta la lista en ambos casos).
{
const { expect } = chai;
describe("galeno-segmentado", () => {
    let el;
    afterEach(() => el?.remove());
    const crear = () => {
        el = document.createElement("galeno-segmentado");
        el.setAttribute("label", "Fechas");
        document.body.append(el);
        el.opciones = [{ nombre: "Hoy" }, { nombre: "Pasado" }, { nombre: "Futuro" }, { nombre: "Rango" }];
        return el;
    };
    const pildoras = () => [...el.shadowRoot.querySelectorAll("[role=radio]")];

    it("dibuja una pildora por opcion en un radiogroup, sin eleccion al inicio", () => {
        crear();
        expect(el.shadowRoot.querySelector("[role=radiogroup]")).to.not.equal(null);
        expect(pildoras()).to.have.length(4);
        expect(Ayuda.textos(el, "[role=radio]")).to.deep.equal(["Hoy", "Pasado", "Futuro", "Rango"]);
        expect(el.seleccionado).to.equal(null);
    });

    it("seleccionar() marca aria-checked, tabindex de roving y avisa con galeno-seleccion", () => {
        crear();
        let v; el.addEventListener("galeno-seleccion", e => { v = e.detail.valor; });
        el.seleccionar(el.opciones[2]);
        expect(el.seleccionado.nombre).to.equal("Futuro");
        expect(v.nombre).to.equal("Futuro");
        const bs = pildoras();
        expect(bs[2].getAttribute("aria-checked")).to.equal("true");
        expect(bs[2].tabIndex).to.equal(0);
        expect(bs[0].tabIndex).to.equal(-1);
        expect(bs[2].textContent).to.contain("Futuro");
    });

    it("clic en una pildora la elige y emite el evento con la opcion", () => {
        crear();
        let v; el.addEventListener("galeno-seleccion", e => { v = e.detail.valor; });
        Ayuda.clic(el, "[role=radio][data-i='1']");
        expect(el.seleccionado.nombre).to.equal("Pasado");
        expect(v.nombre).to.equal("Pasado");
    });

    it("formatoTexto cambia lo que se ve; al cambiar las opciones se pierde la eleccion vieja", () => {
        crear();
        el.formatoTexto = o => o.nombre.toUpperCase(); el.opciones = el.opciones;
        expect(Ayuda.textos(el, "[role=radio]")[0]).to.equal("HOY");
        el.seleccionar(el.opciones[1]);
        el.opciones = [{ nombre: "Otro" }];
        expect(el.seleccionado).to.equal(null);
    });

    it("elegir una opcion que no existe deja null; error() muestra el mensaje", () => {
        crear();
        el.seleccionar({ nombre: "x" }); el.error("Elija un modo");
        expect(el.seleccionado).to.equal(null);
        expect(el.shadowRoot.querySelector("#error").textContent).to.equal("Elija un modo");
    });

    it("deshabilitado bloquea todas las pildoras", () => {
        crear();
        el.deshabilitado = true;
        expect(pildoras().every(b => b.disabled)).to.equal(true);
    });

    it("radiogroup por teclado: las flechas y Fin mueven el foco, el clic elige", () => {
        crear();
        el.seleccionar(el.opciones[0]);
        const bs = pildoras();
        bs[0].focus();
        bs[0].dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
        expect(document.activeElement).to.equal(bs[1]);
        bs[1].dispatchEvent(new KeyboardEvent("keydown", { key: "End", bubbles: true }));
        expect(document.activeElement).to.equal(bs[3]);
        bs[1].click();     // Enter/Espacio de un boton = clic: elige
        expect(el.seleccionado.nombre).to.equal("Pasado");
        expect(document.activeElement).to.equal(pildoras()[1]);   // el foco vuelve a la elegida
    });

    it("sin opciones no dibuja pildoras", () => {
        el = document.createElement("galeno-segmentado");
        document.body.append(el);
        expect(pildoras()).to.have.length(0);
    });
});
}
