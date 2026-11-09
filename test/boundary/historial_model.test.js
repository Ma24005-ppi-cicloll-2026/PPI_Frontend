// Pruebas de HistorialModel: lo que ve el paciente (solo SU historial).
{  // bloque: evita que 'expect' choque con el de otros archivos de prueba
const { expect } = chai;

const BD = {
    consulta: [
        { idConsulta: "k1", fechaInicio: "2026-01-01T10:00:00Z[UTC]", observaciones: "Mia vieja", idPersonaRol: { idPersona: { idPersona: "p1" } } },
        { idConsulta: "k2", fechaInicio: "2026-06-01T10:00:00Z[UTC]", observaciones: "Mia nueva", idPersonaRol: { idPersona: { idPersona: "p1" } } },
        { idConsulta: "k3", fechaInicio: "2026-03-01T10:00:00Z[UTC]", observaciones: "DE OTRO PACIENTE", idPersonaRol: { idPersona: { idPersona: "p2" } } }
    ],
    documento: [
        { valor: "01234567-8", idPersona: { idPersona: "p1" }, idTipoDocumento: { nombre: "DUI" } },
        { valor: "99999999-9", idPersona: { idPersona: "p2" }, idTipoDocumento: { nombre: "DUI" } }
    ],
    consulta_procedimiento: [{ idConsultaProcedimiento: "cp1", idConsulta: { idConsulta: "k1" }, idProcedimiento: { nombre: "Rayos X" } }],
    consulta_procedimiento_paso: [{ idConsultaProcedimientoPaso: "s1", estado: "EN CURSO", idConsultaProcedimiento: { idConsultaProcedimiento: "cp1" } }],
    orden_examen: [{ idOrdenExamen: "o1", indicaciones: "Ayuno", idConsultaProcedimientoPaso: { idConsultaProcedimientoPaso: "s1" } }],
    examen_resultado: [{ idExamenResultado: "r1", resultado: "Normal", interpretacion: "Todo bien", idOrdenExamen: { idOrdenExamen: "o1" } }]
};

describe("HistorialModel", () => {
    let fetchFalso, contenedor, aviso, datos;
    const esperar = () => new Promise(r => setTimeout(r, 0));
    const $ = id => contenedor.querySelector("#" + id);
    const tarjetas = () => [...contenedor.querySelectorAll("#lista galeno-tarjeta-consulta")];
    async function arrancar() {
        await new HistorialModel(contenedor).iniciar();
    }

    beforeEach(() => {
        datos = JSON.parse(JSON.stringify(BD));
        fetchFalso = sinon.stub(window, "fetch").callsFake(async url => {
            const ruta = url.split("/resources/")[1].split("?")[0];
            return new Response(JSON.stringify(datos[ruta] || []), { status: 200 });
        });
        Sesion.iniciar({ idPersona: "p1", nombre: "Ana Lopez", rol: "Paciente", clinica: "" });
        aviso = document.createElement("galeno-notificacion-emergente");
        aviso.id = "aviso";
        contenedor = document.createElement("div");
        document.body.append(aviso, contenedor);
        sinon.spy(aviso, "mostrar");
    });
    afterEach(() => { fetchFalso.restore(); aviso.remove(); contenedor.remove(); Sesion.cerrar(); });

    describe("acceso", () => {
        it("sin sesion pide iniciar sesion y no consulta nada", async () => {
            Sesion.cerrar();
            await arrancar();
            expect(contenedor.textContent).to.include("Inicie sesión como paciente");
            expect(fetchFalso.called).to.equal(false);
        });
        it("el personal no entra a esta pantalla", async () => {
            Sesion.iniciar({ nombre: "Dr", rol: "Medico", clinica: "C", idClinica: "c1" });
            await arrancar();
            expect(contenedor.textContent).to.include("Inicie sesión como paciente");
            expect(fetchFalso.called).to.equal(false);
        });
    });

    describe("lista de consultas", () => {
        beforeEach(arrancar);

        it("muestra solo las consultas del paciente que inicio sesion", () => {
            const textos = tarjetas().map(t => t.shadowRoot.textContent).join();
            expect(tarjetas()).to.have.length(2);
            expect(textos).to.not.include("DE OTRO PACIENTE");
        });
        it("la mas reciente va primero", () => {
            expect(tarjetas()[0].shadowRoot.textContent).to.include("Mia nueva");
            expect(tarjetas()[1].shadowRoot.textContent).to.include("Mia vieja");
        });
        it("resume cuantas consultas tiene", () => {
            expect($("resumen").textContent).to.equal("Tiene 2 consultas registradas.");
        });
        it("dice cuando todavia no tiene consultas", async () => {
            datos.consulta = [];
            const otro = document.createElement("div");
            document.body.append(otro);
            await new HistorialModel(otro).iniciar();
            expect(otro.querySelector("#resumen").textContent).to.equal("Aún no tiene consultas registradas.");
            otro.remove();
        });
        it("avisa si el backend falla", async () => {
            fetchFalso.callsFake(async () => new Response(null, { status: 500 }));
            const otro = document.createElement("div");
            document.body.append(otro);
            await new HistorialModel(otro).iniciar();
            expect(aviso.mostrar.lastCall.args[1]).to.equal("error");
            otro.remove();
        });
    });

    describe("detalle", () => {
        beforeEach(async () => {
            await arrancar();
            tarjetas().find(t => t.shadowRoot.textContent.includes("Mia vieja")).shadowRoot.querySelector("#ver").click();
            for (let i = 0; i < 10; i++) await esperar();
        });
        const textoDe = id => $(id).shadowRoot.textContent;

        it("tiene las 5 pestañas, incluidos los pasos", () => {
            const titulos = [...$("pestanas").shadowRoot.querySelectorAll("button")].map(b => b.textContent);
            expect(titulos).to.deep.equal(["Documentos", "Procedimientos", "Pasos", "Órdenes de examen", "Resultados"]);
        });
        it("esconde la lista y no repite la tarjeta", () => {
            expect($("detalle").hidden).to.equal(false);
            expect($("lista").hidden).to.equal(true);
            expect($("detalle").querySelectorAll("galeno-tarjeta-consulta")).to.have.length(1);
        });
        it("muestra solo los documentos del paciente", () => {
            expect(textoDe("tablaDocumentos")).to.include("01234567-8");
            expect(textoDe("tablaDocumentos")).to.not.include("99999999-9");
        });
        it("muestra como van sus pasos", () => {
            expect(textoDe("tablaPasos")).to.include("EN CURSO");
        });
        it("muestra sus ordenes y resultados", () => {
            expect(textoDe("tablaOrdenes")).to.include("Ayuno");
            expect(textoDe("tablaResultados")).to.include("Todo bien");
        });
        it("Volver regresa a la lista", () => {
            $("volver").click();
            expect($("detalle").hidden).to.equal(true);
            expect($("lista").hidden).to.equal(false);
        });
    });
});
}
