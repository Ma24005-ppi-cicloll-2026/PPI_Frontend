{
const { expect } = chai;
describe("Registro de paso, indicador de pasos y lista de exámenes", () => {
    let el;
    afterEach(() => { el?.cerrar?.(); el?.remove(); });
    const crear = tag => { el = document.createElement(tag); document.body.append(el); return el; };

    describe("galeno-registro-paso", () => {
        beforeEach(() => {
            crear("galeno-registro-paso");
            el.datos = { procedimiento: "Consulta general", paso: "Triaje", estado: "Completado", quien: "Ana Mejía", rol: "Médico",
                inicio: "2026-11-11T14:00:00Z", fin: "2026-11-11T14:10:00Z", nota: "Fiebre", examenes: [{ nombre: "Hemograma", resultado: "Normal" }, { nombre: "Rayos X", resultado: "" }] };
        });
        it("muestra quien, notas y examenes con su resultado", () => {
            const t = el.shadowRoot.textContent;
            ["Triaje", "Ana Mejía", "Fiebre", "Hemograma", "Normal", "sin resultado todavía"].forEach(x => expect(t, x).to.contain(x));
        });
        it("abrir y cerrar", () => {
            el.abrir(); expect(el.abierta).to.equal(true);
            Ayuda.clic(el, "#cerrar"); expect(el.abierta).to.equal(false);
        });
        it("sin notas ni examenes lo dice", () => {
            el.datos = { paso: "X", examenes: [] };
            expect(el.shadowRoot.textContent).to.contain("No se escribieron notas");
            expect(el.shadowRoot.textContent).to.contain("No se asignaron exámenes");
        });
    });

    describe("galeno-indicador-pasos", () => {
        beforeEach(() => {
            crear("galeno-indicador-pasos");
            el.pasos = [{ nombre: "Triaje", estado: "hecho" }, { nombre: "Consulta", estado: "actual" }, { nombre: "Cierre", estado: "pendiente" }];
            el.vista = 1;
        });
        it("marca hechos, resalta el que se mira y bloquea los pendientes", () => {
            const b = [...el.shadowRoot.querySelectorAll("button")];
            expect(b[0].textContent).to.contain("✓");
            expect(b[1].getAttribute("aria-current")).to.equal("step");
            expect(b[2].disabled).to.equal(true);
        });
        it("pulsar un paso emite galeno-ir-paso con su posicion", () => {
            let i; el.addEventListener("galeno-ir-paso", e => { i = e.detail.indice; });
            el.shadowRoot.querySelectorAll("button")[0].click();
            expect(i).to.equal(0);
        });
    });

    describe("galeno-lista-examenes", () => {
        const examenes = [{ id: "a", nombre: "Hemograma", categoria: "Laboratorio" }, { id: "b", nombre: "Radiografía", categoria: "Imagen" }, { id: "c", nombre: "Glucosa", categoria: "Laboratorio" }];
        beforeEach(() => { crear("galeno-lista-examenes"); el.examenes = examenes; });
        const nombres = () => [...el.shadowRoot.querySelectorAll("li span")].map(s => s.firstChild.textContent);
        const marcar = id => { const i = el.shadowRoot.querySelector(`input[data-id="${id}"]`); i.checked = !i.checked; i.dispatchEvent(new Event("change")); };

        it("lista todos los examenes y las categorias disponibles", () => {
            expect(nombres()).to.deep.equal(["Hemograma", "Radiografía", "Glucosa"]);
            expect(Ayuda.textos(el, "#cat option")).to.deep.equal(["Todas las categorías", "Imagen", "Laboratorio"]);
        });
        it("filtra por categoria", () => {
            const s = el.shadowRoot.querySelector("#cat"); s.value = "Laboratorio"; s.dispatchEvent(new Event("change"));
            expect(nombres()).to.deep.equal(["Hemograma", "Glucosa"]);
        });
        it("el boton de asignar esta desactivado hasta marcar uno", () => {
            expect(el.shadowRoot.querySelector("#asignar").disabled).to.equal(true);
            marcar("a");
            expect(el.shadowRoot.querySelector("#asignar").disabled).to.equal(false);
        });
        it("Asignar exámenes seleccionados emite los ids marcados", () => {
            let ids; el.addEventListener("galeno-asignar", e => { ids = e.detail.ids; });
            marcar("a"); marcar("c");
            Ayuda.clic(el, "#asignar");
            expect(ids).to.deep.equal(["a", "c"]);
        });
        it("los ya asignados salen marcados y bloqueados", () => {
            el.asignados = ["b"];
            const i = el.shadowRoot.querySelector('input[data-id="b"]');
            expect(i.checked && i.disabled).to.equal(true);
            expect(el.seleccionados).to.deep.equal([]);
        });
        it("deshabilitada no deja asignar", () => {
            el.deshabilitada = true; marcar("a");
            expect(el.shadowRoot.querySelector("#asignar").disabled).to.equal(true);
        });
        it("sin examenes lo dice", () => {
            el.examenes = [];
            expect(el.shadowRoot.textContent).to.contain("No hay exámenes");
        });
    });
});
}
