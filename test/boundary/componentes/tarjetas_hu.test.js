{
const { expect } = chai;
describe("Tarjetas de citas y de la agenda", () => {
    let el;
    afterEach(() => el?.remove());
    const crear = tag => { el = document.createElement(tag); document.body.append(el); return el; };

    describe("galeno-tarjeta-cita", () => {
        const cita = { idConsulta: "k1", fechaInicio: "2026-11-11T15:30:00Z", clinica: "Santa Ana", procedimientos: ["Consulta general", "Rayos X"] };
        beforeEach(() => { crear("galeno-tarjeta-cita"); el.cita = cita; });
        it("muestra clinica y procedimientos", () => {
            const t = el.shadowRoot.textContent;
            expect(t).to.contain("Santa Ana"); expect(t).to.contain("Consulta general"); expect(t).to.contain("Rayos X");
        });
        it("muestra fecha y hora", () => {
            expect(el.shadowRoot.textContent).to.match(/2026/);
            expect(el.shadowRoot.textContent).to.match(/\d{2}:\d{2}/);
        });
        it("emite galeno-descargar-ticket con el id de la consulta", () => {
            let id; el.addEventListener("galeno-descargar-ticket", e => { id = e.detail.idConsulta; });
            Ayuda.clic(el, "#ticket");
            expect(id).to.equal("k1");
        });
        it("ocupada desactiva el boton", () => {
            el.ocupada = true;
            expect(el.shadowRoot.querySelector("#ticket").disabled).to.equal(true);
            el.ocupada = false;
            expect(el.shadowRoot.querySelector("#ticket").disabled).to.equal(false);
        });
        it("sin procedimientos lo dice, y escapa el HTML", () => {
            el.cita = { ...cita, procedimientos: [], clinica: "<b>x</b>" };
            expect(el.shadowRoot.textContent).to.contain("Sin procedimientos");
            expect(el.shadowRoot.querySelector("b")).to.equal(null);
        });
    });

    describe("galeno-tarjeta-agenda", () => {
        const datos = { idConsulta: "k1", fechaInicio: "2026-11-11T15:30:00Z", titulo: "Consulta",
            paciente: { nombre: "Luis Pérez", edad: 26, documento: "11111111-1" },
            procedimientos: [{ nombre: "Consulta general", pasos: [
                { idPaso: "cpp1", nombre: "Triaje", estado: "Completado", quien: "Ana Mejía", rol: "Recepcionista", fecha: "2026-11-11T14:00:00Z" }] }] };
        beforeEach(() => { crear("galeno-tarjeta-agenda"); el.datos = datos; });
        it("muestra paciente (nombre, edad, ID) y la jerarquia procedimiento > pasos", () => {
            const t = el.shadowRoot.textContent;
            ["Luis Pérez", "26", "11111111-1", "Consulta general", "Triaje", "Ana Mejía"].forEach(x => expect(t, x).to.contain(x));
        });
        it("Ver registro emite el id del paso", () => {
            let id; el.addEventListener("galeno-ver-registro", e => { id = e.detail.idPaso; });
            Ayuda.clic(el, "button.ver");
            expect(id).to.equal("cpp1");
        });
        it("Atender consulta emite el id de la consulta", () => {
            let id; el.addEventListener("galeno-atender", e => { id = e.detail.idConsulta; });
            const boton = [...el.shadowRoot.querySelectorAll("button")].find(b => /Atender/.test(b.textContent));
            boton.click();
            expect(id).to.equal("k1");
        });
        it("finalizada: dice que termino y no ofrece Atender", () => {
            el.datos = { ...datos, finalizada: true, puedeAtender: false };
            expect(el.shadowRoot.textContent).to.contain("Consulta finalizada");
            expect(el.shadowRoot.querySelector(".atender")).to.equal(null);
        });
        it("sin pasos realizados lo dice", () => {
            el.datos = { ...datos, procedimientos: [{ nombre: "X", pasos: [] }] };
            expect(el.shadowRoot.textContent).to.contain("Aún sin pasos");
        });
    });
});
}
