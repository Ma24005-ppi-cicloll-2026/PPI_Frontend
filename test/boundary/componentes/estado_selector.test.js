{
const { expect } = chai;
describe("galeno-selector, galeno-campo textarea y galeno-estado-vista", () => {
    let el;
    afterEach(() => el?.remove());
    const crear = (tag, attrs = {}) => { el = document.createElement(tag); Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v)); document.body.append(el); return el; };

    describe("selector", () => {
        beforeEach(() => { crear("galeno-selector", { label: "Clínica" }); el.opciones = [{ nombre: "Santa Ana" }, { nombre: "San Miguel" }]; });
        it("lista las opciones por su nombre", () => {
            expect(Ayuda.textos(el, "option")).to.deep.equal(["Seleccione...", "Santa Ana", "San Miguel"]);
        });
        it("emite galeno-seleccion con la opcion elegida", () => {
            let v; el.addEventListener("galeno-seleccion", e => { v = e.detail.valor; });
            Ayuda.elegir(el, 1);
            expect(v.nombre).to.equal("San Miguel");
            expect(el.seleccionado.nombre).to.equal("San Miguel");
        });
        it("volver a 'Seleccione' devuelve null", () => {
            Ayuda.elegir(el, 1);
            const s = el.shadowRoot.querySelector("select"); s.value = ""; s.dispatchEvent(new Event("change"));
            expect(el.seleccionado).to.equal(null);
        });
        it("formatoTexto cambia lo que se ve", () => {
            el.formatoTexto = o => o.nombre.toUpperCase(); el.opciones = el.opciones;
            expect(Ayuda.textos(el, "option")[1]).to.equal("SANTA ANA");
        });
        it("seleccionar() deja una opcion elegida y se puede deshabilitar", () => {
            el.seleccionar(el.opciones[0]); el.deshabilitado = true;
            expect(el.seleccionado.nombre).to.equal("Santa Ana");
            expect(el.shadowRoot.querySelector("select").disabled).to.equal(true);
        });
        it("seleccionar una opcion que no existe deja null; error() muestra el mensaje", () => {
            el.seleccionar({ nombre: "x" }); el.error("Elija una clínica");
            expect(el.seleccionado).to.equal(null);
            expect(el.shadowRoot.querySelector("#error").textContent).to.equal("Elija una clínica");
        });
        it("al cambiar las opciones se pierde la seleccion que ya no existe", () => {
            el.seleccionar(el.opciones[0]); el.opciones = [{ nombre: "Otra" }];
            expect(el.seleccionado).to.equal(null);
        });
    });

    describe("campo type=textarea", () => {
        beforeEach(() => crear("galeno-campo", { label: "Notas", type: "textarea" }));
        it("usa un textarea y entrega lo escrito", () => {
            expect(el.shadowRoot.querySelector("textarea")).to.not.equal(null);
            Ayuda.escribir(el, "línea 1\nlínea 2");
            expect(el.value).to.equal("línea 1\nlínea 2");
        });
        it("avisa con galeno-cambio y se puede deshabilitar", () => {
            let n = 0; el.addEventListener("galeno-cambio", () => n++);
            Ayuda.escribir(el, "x");
            el.deshabilitado = true;
            expect(n).to.equal(1);
            expect(el.entrada.disabled).to.equal(true);
        });
    });

    describe("estado-vista", () => {
        beforeEach(() => crear("galeno-estado-vista"));
        it("cargando y vacio muestran su texto; contenido no dibuja nada", () => {
            el.mostrar("cargando"); expect(el.shadowRoot.textContent).to.contain("Cargando");
            el.mostrar("vacio", "No hay citas"); expect(el.shadowRoot.textContent).to.contain("No hay citas");
            el.mostrar("contenido"); expect(el.shadowRoot.querySelector("div")).to.equal(null);
        });
        it("error muestra Reintentar y lo avisa", () => {
            let n = 0; el.addEventListener("galeno-reintentar", () => n++);
            el.mostrar("error", "Falló"); Ayuda.clic(el, "button");
            expect(n).to.equal(1);
        });
    });
});
}
