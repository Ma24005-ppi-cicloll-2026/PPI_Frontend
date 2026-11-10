// Pruebas del boton "Descargar resumen (PDF)" del detalle de consulta.
{
const { expect } = chai;

const BD = {
    documento: [{ valor: "01234567-8", idPersona: { idPersona: "p1" }, idTipoDocumento: { nombre: "DUI" } }],
    consulta_procedimiento: [{ idConsultaProcedimiento: "cp1", idConsulta: { idConsulta: "c1" }, idProcedimiento: { nombre: "Rayos X" },
        fechaInicio: "2026-11-04T15:00:00Z[UTC]", fechaFin: null, observaciones: "Sin novedad" }],
    consulta_procedimiento_paso: [], orden_examen: [], examen_resultado: []
};
const consulta = { idConsulta: "c1", fechaInicio: "2026-11-04T15:00:00Z[UTC]", fechaFin: null,
    referenciaExterna: "REF-9", observaciones: "Dolor de cabeza",
    idPersonaRol: { idPersona: { idPersona: "p1", nombres: "Ana", apellidos: "López" } } };

describe("DetalleConsulta · resumen en PDF", () => {
    let fetchFalso, seccion, detalle, descarga;
    beforeEach(async () => {
        fetchFalso = sinon.stub(window, "fetch").callsFake(async url => {
            const ruta = url.split("/resources/")[1].split("?")[0];
            return new Response(JSON.stringify(BD[ruta] || []), { status: 200 });
        });
        descarga = sinon.stub(GeneradorPdf, "descargar");
        seccion = document.createElement("section"); document.body.append(seccion);
        detalle = new DetalleConsulta(seccion, () => {}); detalle.iniciar();
        await detalle.abrir(consulta, { idPersona: "p1" });
    });
    afterEach(() => { fetchFalso.restore(); descarga.restore(); seccion.remove(); });

    it("hay un boton para descargar el PDF", () => {
        expect(seccion.querySelector("#pdf").textContent).to.contain("PDF");
    });
    it("al pulsarlo se baja un PDF con el nombre de la fecha de la consulta", () => {
        seccion.querySelector("#pdf").click();
        expect(descarga.calledOnce).to.equal(true);
        const [bytes, nombre] = descarga.firstCall.args;
        expect(nombre).to.equal("consulta-2026-11-04.pdf");
        expect(Array.from(bytes.slice(0, 5), b => String.fromCharCode(b)).join("")).to.equal("%PDF-");
    });
    it("el PDF lleva el paciente, la consulta, los documentos y los procedimientos", () => {
        seccion.querySelector("#pdf").click();
        const texto = Array.from(descarga.firstCall.args[0], b => String.fromCharCode(b)).join("");
        ["Paciente: Ana L", "Dolor de cabeza", "REF-9", "DUI", "01234567-8", "Rayos X", "Sin novedad"]
            .forEach(t => expect(texto, t).to.contain(t));
    });
    it("sin una consulta abierta no hace nada", () => {
        const otra = new DetalleConsulta(document.createElement("section"), () => {}); otra.iniciar();
        otra.descargarPdf();
        expect(descarga.called).to.equal(false);
    });
});
}
