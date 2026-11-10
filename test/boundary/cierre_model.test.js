// Pruebas de CierreModel (HU4): recepcion finaliza procedimientos hasta saldo 0, cierra la consulta y baja el PDF.
{
const { expect } = chai;

const ana = { idPersona: "p1", nombres: "Ana", apellidos: "López" };
const consultaK1 = { idConsulta: "k1", fechaInicio: "2026-11-09T15:00:00Z[UTC]", fechaFin: null, observaciones: "Dolor",
    idPersonaRol: { idPersonaRol: "pac-1", idPersona: ana, idClinica: { idClinica: "c1", nombre: "Central" } } };
const BD = () => ({
    consulta: [consultaK1,
        { idConsulta: "k2", fechaInicio: "2026-11-08T15:00:00Z[UTC]", fechaFin: "2026-11-08T16:00:00Z[UTC]", observaciones: "FINALIZADA",
          idPersonaRol: { idPersona: ana, idClinica: { idClinica: "c1" } } },
        { idConsulta: "k3", fechaInicio: "2026-11-09T16:00:00Z[UTC]", fechaFin: null, observaciones: "OTRA CLINICA",
          idPersonaRol: { idPersona: ana, idClinica: { idClinica: "c9" } } }],
    procedimiento: [{ idProcedimiento: "pr1", nombre: "Rayos X" }, { idProcedimiento: "pr2", nombre: "Limpieza dental" }],
    consulta_procedimiento: [
        { idConsultaProcedimiento: "cp1", idConsulta: { idConsulta: "k1" }, idProcedimiento: "pr1", fechaInicio: "2026-11-09T15:05:00Z[UTC]" },
        { idConsultaProcedimiento: "cp2", idConsulta: { idConsulta: "k1" }, idProcedimiento: "pr2", fechaInicio: "2026-11-09T15:06:00Z[UTC]" },
        { idConsultaProcedimiento: "cpX", idConsulta: { idConsulta: "k3" }, idProcedimiento: "pr1" }],
    consulta_procedimiento_paso: [
        { idConsultaProcedimientoPaso: "s1", idConsultaProcedimiento: { idConsultaProcedimiento: "cp1" }, estado: "Completado" },
        { idConsultaProcedimientoPaso: "s2", idConsultaProcedimiento: { idConsultaProcedimiento: "cp1" }, estado: "Completado" },
        { idConsultaProcedimientoPaso: "s3", idConsultaProcedimiento: { idConsultaProcedimiento: "cp2" }, estado: "En proceso" }]
});

describe("CierreModel (HU4)", () => {
    let api, contenedor, aviso, modelo, descarga;
    const $ = id => contenedor.querySelector("#" + id);
    async function arrancar(rol = "Recepcionista") {
        Sesion.iniciar({ idPersonaRol: "emp-002", nombre: "Laura Pérez", rol, clinica: "Central", idClinica: "c1" });
        modelo = new CierreModel(contenedor);
        await modelo.iniciar();
    }
    async function abrir() {
        $("tabla").dispatchEvent(new CustomEvent("galeno-elegir-consulta", { detail: { fila: api.bd.consulta[0] } }));
        await Ayuda.esperar(20);
    }
    const filaProc = nombre => modelo.filas.find(f => f.nombre === nombre);
    const finalizarProc = async nombre => {
        $("procedimientos").dispatchEvent(new CustomEvent("galeno-finalizar-procedimiento", { detail: { fila: filaProc(nombre) } }));
        await Ayuda.esperar(20);
    };

    beforeEach(() => {
        api = new ApiFalsa(BD());
        descarga = sinon.stub(GeneradorPdf, "descargar");
        aviso = document.createElement("galeno-notificacion-emergente"); aviso.id = "aviso";
        contenedor = document.createElement("div");
        document.body.append(aviso, contenedor);
        sinon.spy(aviso, "mostrar");
        Sesion.cerrar();
    });
    afterEach(() => { api.restaurar(); descarga.restore(); aviso.remove(); contenedor.remove(); Sesion.cerrar(); });

    it("sin sesion no deja cerrar consultas", async () => {
        modelo = new CierreModel(contenedor); await modelo.iniciar();
        expect(contenedor.textContent).to.contain("Inicie sesión");
    });
    it("un medico no tiene acceso", async () => {
        Sesion.iniciar({ nombre: "House", rol: "Médico", idClinica: "c1" });
        modelo = new CierreModel(contenedor); await modelo.iniciar();
        expect(contenedor.textContent).to.contain("Inicie sesión");
    });

    describe("consultas pendientes", () => {
        beforeEach(() => arrancar());
        it("lista solo las no finalizadas de su clinica", () => {
            expect($("tabla").filas.map(c => c.idConsulta)).to.deep.equal(["k1"]);
        });
        it("la tabla muestra paciente y observaciones", () => {
            const texto = Ayuda.textos($("tabla"), "td");
            expect(texto).to.include("Ana López");
            expect(texto).to.include("Dolor");
        });
    });

    describe("procedimientos de la consulta", () => {
        beforeEach(async () => { await arrancar(); await abrir(); });

        it("al elegir la consulta se esconde la lista y se muestra el cierre", () => {
            expect($("lista").hidden).to.equal(true);
            expect($("cierre").hidden).to.equal(false);
            expect($("titulo").textContent).to.equal("Consulta de Ana López");
        });
        it("muestra cada procedimiento por nombre con sus pasos completados", () => {
            expect(modelo.filas.map(f => [f.nombre, f.avance])).to.deep.equal([["Rayos X", "2 de 2"], ["Limpieza dental", "0 de 1"]]);
        });
        it("no mezcla procedimientos de otras consultas", () => {
            expect(modelo.filas).to.have.length(2);
        });
        it("el saldo restante cuenta los procedimientos sin finalizar", () => {
            expect($("saldo").textContent).to.equal("Saldo restante: 2 procedimientos por finalizar");
        });
        it("no se puede finalizar la consulta mientras haya saldo", () => {
            expect($("finalizar").disabled).to.equal(true);
        });
        it("Volver regresa a la lista", () => {
            $("volver").click();
            expect($("lista").hidden).to.equal(false);
            expect($("cierre").hidden).to.equal(true);
        });
    });

    describe("finalizar procedimientos", () => {
        beforeEach(async () => { await arrancar(); await abrir(); });

        it("no deja finalizar uno que tiene pasos sin completar y explica por que", async () => {
            await finalizarProc("Limpieza dental");
            expect(api.enviados("PUT", "consulta_procedimiento")).to.have.length(0);
            expect(aviso.mostrar.lastCall.args[0]).to.contain("Faltan 1 paso");
        });
        it("finaliza uno con todos sus pasos completados guardando la fecha de fin", async () => {
            await finalizarProc("Rayos X");
            const [put] = api.enviados("PUT", "consulta_procedimiento");
            expect(put.id).to.equal("cp1");
            expect(put.cuerpo.fechaFin).to.be.a("string");
            expect(put.cuerpo.idProcedimiento).to.equal("pr1");
        });
        it("despues de finalizar baja el saldo restante", async () => {
            await finalizarProc("Rayos X");
            expect($("saldo").textContent).to.equal("Saldo restante: 1 procedimiento por finalizar");
            expect(filaProc("Rayos X").finalizado).to.equal(true);
        });
        it("uno ya finalizado no se vuelve a finalizar", async () => {
            await finalizarProc("Rayos X");
            await finalizarProc("Rayos X");
            expect(api.enviados("PUT", "consulta_procedimiento")).to.have.length(1);
        });
        it("un procedimiento sin pasos registrados se puede finalizar", async () => {
            api.bd.consulta_procedimiento_paso = [];
            await abrir();
            await finalizarProc("Limpieza dental");
            expect(api.enviados("PUT", "consulta_procedimiento")).to.have.length(1);
        });
    });

    describe("finalizar la consulta (saldo 0)", () => {
        beforeEach(async () => {
            api = (api.restaurar(), new ApiFalsa(BD()));
            api.bd.consulta_procedimiento_paso[2].estado = "Completado";
            await arrancar(); await abrir();
            await finalizarProc("Rayos X"); await finalizarProc("Limpieza dental");
        });

        it("con saldo 0 se habilita el boton", () => {
            expect($("saldo").textContent).to.equal("Saldo restante: 0 procedimientos por finalizar");
            expect($("finalizar").disabled).to.equal(false);
        });
        it("guarda la fecha de fin de la consulta", async () => {
            $("finalizar").click(); await Ayuda.esperar(20);
            const [put] = api.enviados("PUT", "consulta");
            expect(put.id).to.equal("k1");
            expect(put.cuerpo.fechaFin).to.be.a("string");
            expect(put.cuerpo.observaciones).to.equal("Dolor");
        });
        it("baja la constancia en PDF con el paciente, los procedimientos y quien atendio", async () => {
            $("finalizar").click(); await Ayuda.esperar(20);
            expect(descarga.calledOnce).to.equal(true);
            const [bytes, nombre] = descarga.firstCall.args;
            expect(nombre).to.match(/^constancia-ana-lopez-\d{4}-\d{2}-\d{2}\.pdf$/);
            const texto = Array.from(bytes, b => String.fromCharCode(b)).join("");
            expect(texto.startsWith("%PDF-")).to.equal(true);
            ["Constancia de consulta", "Paciente: Ana L", "Rayos X", "Limpieza dental", "Central", "Laura P"].forEach(t => expect(texto, t).to.contain(t));
        });
        it("despues de cerrar vuelve a la lista y la consulta ya no aparece como pendiente", async () => {
            $("finalizar").click(); await Ayuda.esperar(20);
            expect($("lista").hidden).to.equal(false);
            expect($("tabla").filas).to.have.length(0);
            expect(aviso.mostrar.calledWith("Consulta finalizada", "exito")).to.equal(true);
        });
        it("si el backend falla al cerrar no baja el PDF", async () => {
            const original = api.responder.bind(api);
            api.responder = async (url, op) => op.method === "PUT" ? new Response("", { status: 500 }) : original(url, op);
            $("finalizar").click(); await Ayuda.esperar(20);
            expect(descarga.called).to.equal(false);
            expect(aviso.mostrar.lastCall.args[1]).to.equal("error");
        });
        it("aunque se fuerce, con saldo pendiente no cierra", async () => {
            modelo.filas[0].finalizado = false;
            await modelo.finalizarConsulta();
            expect(api.enviados("PUT", "consulta")).to.have.length(0);
        });
    });

    describe("consulta sin procedimientos", () => {
        it("no se puede finalizar y lo explica", async () => {
            api.bd.consulta_procedimiento = [];
            await arrancar(); await abrir();
            expect($("finalizar").disabled).to.equal(true);
            expect($("saldo").textContent).to.contain("no tiene procedimientos");
        });
    });
});
}
