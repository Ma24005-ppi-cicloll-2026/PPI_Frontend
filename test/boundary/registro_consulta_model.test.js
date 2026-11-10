// Pruebas de RegistroConsultaModel: recepcion abre la consulta de un paciente ya registrado.
{
const { expect } = chai;

const DUI = { idTipoDocumento: "t-dui", nombre: "DUI", indicaciones: "00000000-0", expresionRegular: "^\\d{8}-\\d$", activo: true };
const ana = { idPersona: "p1", nombres: "Ana", apellidos: "López" };
const luis = { idPersona: "p2", nombres: "Luis", apellidos: "Mena" };
const otra = { idPersona: "p9", nombres: "Zoila", apellidos: "Otra" };
const clinica = { idClinica: "c1", nombre: "Central" };
const rolPac = { nombre: "Paciente" };
const BD = {
    persona_rol: [
        { idPersonaRol: "rec-1", idPersona: { idPersona: "r1", nombres: "Laura", apellidos: "Pérez" }, idRol: { nombre: "Recepcionista" }, idClinica: clinica },
        { idPersonaRol: "pac-1", idPersona: ana, idRol: rolPac, idClinica: clinica },
        { idPersonaRol: "pac-2", idPersona: luis, idRol: rolPac, idClinica: clinica },
        { idPersonaRol: "pac-9", idPersona: otra, idRol: rolPac, idClinica: { idClinica: "c9" } }],
    tipo_documento: [DUI],
    documento: [{ idDocumento: "d1", valor: "01234567-8", idPersona: { idPersona: "p1" }, idTipoDocumento: DUI }],
    procedimiento: [
        { idProcedimiento: "pr1", nombre: "Rayos X", activo: true },
        { idProcedimiento: "pr2", nombre: "Limpieza", activo: true },
        { idProcedimiento: "pr3", nombre: "Cirugía", activo: false }]
};

describe("RegistroConsultaModel (recepcion)", () => {
    let api, contenedor, aviso, modelo, destino;
    const $ = id => contenedor.querySelector("#" + id);
    const tiles = () => [...$("procedimientos").querySelectorAll("galeno-opcion")];
    const elegirProc = async id => { $("procedimientos").dispatchEvent(new CustomEvent("galeno-elegir", { detail: { id }, bubbles: true })); await Ayuda.esperar(); };
    const elegirPaciente = persona => $("buscaPaciente").dispatchEvent(new CustomEvent("galeno-seleccion", { detail: { valor: persona } }));
    async function arrancar(rol = "Recepcionista") {
        Sesion.iniciar({ idPersonaRol: "rec-1", nombre: "Laura Pérez", rol, clinica: "Central", idClinica: "c1" });
        modelo = new RegistroConsultaModel(contenedor, { irA: d => { destino = d; } });
        await modelo.iniciar();
        await Ayuda.esperar(20);
    }

    beforeEach(() => {
        destino = null;
        api = new ApiFalsa(BD);
        aviso = document.createElement("galeno-notificacion-emergente"); aviso.id = "aviso";
        contenedor = document.createElement("div");
        document.body.append(aviso, contenedor);
        sinon.spy(aviso, "mostrar");
        Sesion.cerrar();
    });
    afterEach(() => { api.restaurar(); aviso.remove(); contenedor.remove(); Sesion.cerrar(); });

    it("sin sesion no muestra el formulario", async () => {
        modelo = new RegistroConsultaModel(contenedor); await modelo.iniciar();
        expect(contenedor.textContent).to.contain("Inicie sesión");
        expect(api.llamadas).to.have.length(0);
    });
    it("un medico no tiene acceso", async () => {
        await arrancar("Médico");
        expect(contenedor.textContent).to.contain("Inicie sesión");
        expect($("enviar")).to.equal(null);
    });
    it("el buscador solo ofrece pacientes de su clinica", async () => {
        await arrancar();
        expect($("buscaPaciente").opciones.map(p => p.nombres)).to.have.members(["Ana", "Luis"]);
    });
    it("muestra los procedimientos y no deja elegir los inactivos", async () => {
        await arrancar();
        expect(tiles()).to.have.length(3);
        await elegirProc("pr3");
        expect(modelo.elegidos.size).to.equal(0);
    });
    it("el boton se activa solo con paciente y al menos un procedimiento", async () => {
        await arrancar();
        expect($("enviar").disabled).to.equal(true);
        await elegirProc("pr1");
        expect($("enviar").disabled).to.equal(true);
        elegirPaciente(ana);
        expect($("enviar").disabled).to.equal(false);
        expect($("elegido").textContent).to.equal("Paciente: Ana López");
    });
    it("elegir un procedimiento otra vez lo quita", async () => {
        await arrancar();
        await elegirProc("pr1"); await elegirProc("pr1");
        expect(modelo.elegidos.size).to.equal(0);
        expect($("resumen").textContent).to.equal("0 procedimientos elegidos");
    });
    it("¿No esta registrado? lleva a Registrar paciente", async () => {
        await arrancar();
        $("nuevo").click();
        expect(destino).to.equal("admision");
    });
    it("encuentra al paciente por tipo y numero de documento", async () => {
        await arrancar();
        $("buscaTipo").seleccionar(DUI);
        const numero = $("numeroDocumento"); numero.value = "01234567-8";
        modelo.busquedaDocumento.numero = numero;
        await modelo.busquedaDocumento.buscar();
        expect(modelo.paciente.nombres).to.equal("Ana");
    });
    it("un documento de otra clinica no encuentra paciente", async () => {
        api.bd.documento.push({ idDocumento: "d9", valor: "99999999-9", idPersona: { idPersona: "p9" }, idTipoDocumento: DUI });
        await arrancar();
        $("buscaTipo").seleccionar(DUI);
        $("numeroDocumento").value = "99999999-9";
        await modelo.busquedaDocumento.buscar();
        expect(modelo.paciente).to.equal(null);
        expect($("ayudaDocumento").textContent).to.contain("No se encontró");
    });

    describe("registrar", () => {
        beforeEach(async () => {
            await arrancar();
            elegirPaciente(ana);
            await elegirProc("pr1"); await elegirProc("pr2");
            Ayuda.escribir($("motivo"), "Dolor de muela");
            $("enviar").click();
            await Ayuda.esperar(30);
        });
        it("crea una consulta del paciente, con su rol, la hora y el motivo", () => {
            const c = api.enviados("POST", "consulta");
            expect(c).to.have.length(1);
            expect(c[0].cuerpo.idPersonaRol.idPersonaRol).to.equal("pac-1");
            expect(c[0].cuerpo.fechaInicio).to.be.a("string");
            expect(c[0].cuerpo.observaciones).to.contain("Laura Pérez").and.contain("Dolor de muela").and.contain("Rayos X, Limpieza");
        });
        it("crea un procedimiento por cada elegido, ligado a la consulta", () => {
            const cp = api.enviados("POST", "consulta_procedimiento");
            expect(cp.map(x => x.cuerpo.idProcedimiento)).to.deep.equal(["pr1", "pr2"]);
            expect(cp[0].cuerpo.idConsulta.idConsulta).to.equal("consulta-nuevo-1");
        });
        it("no crea personas ni roles nuevos", () => {
            expect(api.enviados("POST", "persona")).to.have.length(0);
            expect(api.enviados("POST", "persona_rol")).to.have.length(0);
        });
        it("confirma y deja la pantalla lista para el siguiente paciente", () => {
            expect($("confirmacion").hidden).to.equal(false);
            expect($("confirmacion").textContent).to.contain("Ana López").and.contain("Rayos X");
            expect(aviso.mostrar.calledWith("Consulta registrada", "exito")).to.equal(true);
            expect(modelo.paciente).to.equal(null);
            expect(modelo.elegidos.size).to.equal(0);
            expect($("enviar").disabled).to.equal(true);
        });
    });

    it("sin motivo igual registra la consulta", async () => {
        await arrancar(); elegirPaciente(luis); await elegirProc("pr2");
        $("enviar").click(); await Ayuda.esperar(30);
        expect(api.enviados("POST", "consulta")[0].cuerpo.observaciones).to.not.contain("Motivo");
    });
    it("si el backend rechaza el guardado muestra el error y el boton vuelve", async () => {
        await arrancar(); elegirPaciente(ana); await elegirProc("pr1");
        const original = api.responder.bind(api);
        api.stub.callsFake(async (url, op = {}) => op.method === "POST" ? new Response("", { status: 400 }) : original(url, op));
        $("enviar").click(); await Ayuda.esperar(30);
        expect(aviso.mostrar.lastCall.args[1]).to.equal("error");
        expect($("enviar").textContent).to.equal("Registrar consulta");
    });
});
}
