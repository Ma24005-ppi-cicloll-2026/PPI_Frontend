// Pruebas de galeno-tarjeta-consulta (resultados de busqueda) y galeno-tarjeta-simple (Inicio).
{  // bloque: evita que 'expect' choque con el de otros archivos de prueba
const { expect } = chai;

describe("Tarjetas", () => {
    let tarjeta;
    afterEach(() => tarjeta.remove());

    describe("galeno-tarjeta-consulta", () => {
        beforeEach(() => {
            tarjeta = document.createElement("galeno-tarjeta-consulta");
            document.body.append(tarjeta);
        });
        const texto = () => tarjeta.shadowRoot.textContent;

        it("lee las fechas con el sufijo [UTC] del backend", () => {
            tarjeta.consulta = { fechaInicio: "2026-11-04T15:17:01Z[UTC]" };
            expect(texto()).to.include("2026");
            expect(texto()).to.not.include("Invalid");
        });
        it("dice 'En curso' si la consulta no tiene fecha de fin", () => {
            tarjeta.consulta = { fechaInicio: "2026-11-04T15:17:01Z" };
            expect(texto()).to.include("En curso");
        });
        it("dice 'Sin observaciones' cuando no hay", () => {
            tarjeta.consulta = { fechaInicio: "2026-11-04T15:17:01Z" };
            expect(texto()).to.include("Sin observaciones");
        });
        it("muestra la referencia externa y las observaciones", () => {
            tarjeta.consulta = { referenciaExterna: "REF-7", observaciones: "Control mensual" };
            expect(texto()).to.include("REF-7");
            expect(texto()).to.include("Control mensual");
        });
        it("no interpreta HTML en las observaciones", () => {
            tarjeta.consulta = { observaciones: "<b>x</b>" };
            expect(tarjeta.shadowRoot.querySelector("article b")).to.equal(null);
        });
        it("emite galeno-abrir-consulta con el id al pulsar Ver detalle", () => {
            let id = null;
            tarjeta.addEventListener("galeno-abrir-consulta", e => { id = e.detail.idConsulta; });
            tarjeta.consulta = { idConsulta: "k1" };
            tarjeta.shadowRoot.querySelector("#ver").click();
            expect(id).to.equal("k1");
        });
        it("con el atributo sin-boton no dibuja el boton Ver detalle", () => {
            tarjeta.setAttribute("sin-boton", "");
            tarjeta.consulta = { idConsulta: "k1", observaciones: "x" };
            expect(tarjeta.shadowRoot.querySelector("#ver")).to.equal(null);
            expect(tarjeta.shadowRoot.textContent).to.include("x");
        });
        it("no falla si todavia no tiene consulta", () => {
            expect(texto()).to.include("Consulta");
        });
    });

    describe("galeno-tarjeta-simple", () => {
        beforeEach(() => {
            tarjeta = document.createElement("galeno-tarjeta-simple");
            document.body.append(tarjeta);
        });
        const texto = () => tarjeta.shadowRoot.textContent;

        it("muestra titulo y descripcion", () => {
            tarjeta.datos = { titulo: "Consultas", descripcion: "Ver consultas" };
            expect(texto()).to.include("Consultas");
            expect(texto()).to.include("Ver consultas");
        });
        it("muestra los campos etiqueta/valor", () => {
            tarjeta.datos = { titulo: "T", campos: [{ etiqueta: "Nombre", valor: "Ana" }, { etiqueta: "Edad" }] };
            expect(texto()).to.include("Nombre: Ana");
            expect(texto()).to.include("Edad: —");
        });
        it("dibuja el boton solo si viene el texto del boton", () => {
            tarjeta.datos = { titulo: "T" };
            expect(tarjeta.shadowRoot.querySelector("#accion")).to.equal(null);
            tarjeta.datos = { titulo: "T", boton: "Abrir" };
            expect(tarjeta.shadowRoot.querySelector("#accion").textContent).to.equal("Abrir");
        });
        it("emite galeno-accion al pulsar el boton", () => {
            let recibido = null;
            tarjeta.addEventListener("galeno-accion", e => { recibido = e.detail.datos.titulo; });
            tarjeta.datos = { titulo: "Consultas", boton: "Abrir" };
            tarjeta.shadowRoot.querySelector("#accion").click();
            expect(recibido).to.equal("Consultas");
        });
        it("no interpreta HTML en el titulo", () => {
            tarjeta.datos = { titulo: "<i>x</i>" };
            expect(tarjeta.shadowRoot.querySelector("h3 i")).to.equal(null);
        });
        it("acepta datos nulos sin fallar", () => {
            tarjeta.datos = null;
            expect(tarjeta.datos.campos).to.deep.equal([]);
        });
    });
});
}