// Pruebas de AdmisionModel: recepcion registra pacientes (Persona + Documento + PersonaRol). No crea consultas.
{
const { expect } = chai;

const DUI = { idTipoDocumento: "t-dui", nombre: "DUI", indicaciones: "00000000-0", expresionRegular: "^\\d{8}-\\d$", activo: true };
const PAS = { idTipoDocumento: "t-pas", nombre: "Pasaporte", indicaciones: "A0000000", expresionRegular: "^[A-Z]\\d{7}$", activo: true };
const clinica = { idClinica: "c1", nombre: "Central" };
const BD = {
    tipo_documento: [DUI, PAS],
    rol: [{ idRol: "r-pac", nombre: "Paciente" }, { idRol: "r-med", nombre: "Médico" }],
    persona: [{ idPersona: "m1", nombres: "Gregory", apellidos: "House" }],
    documento: [{ idDocumento: "d1", valor: "12345678-9", idPersona: { idPersona: "m1", nombres: "Gregory", apellidos: "House" }, idTipoDocumento: DUI }],
    persona_rol: [
        { idPersonaRol: "rec-1", idPersona: { idPersona: "r1", nombres: "Laura", apellidos: "Pérez" }, idRol: { nombre: "Recepcionista" }, idClinica: clinica },
        { idPersonaRol: "pac-7", idPersona: { idPersona: "p7", nombres: "Sofía", apellidos: "Rivas" }, idRol: { idRol: "r-pac", nombre: "Paciente" }, idClinica: clinica }],
    clinica: [clinica]
};

describe("AdmisionModel (recepcion)", () => {
    let api, contenedor, aviso, modelo;
    const $ = id => contenedor.querySelector("#" + id);
    const error = id => $(id).shadowRoot.querySelector("#error").textContent;
    async function arrancar(rol = "Recepcionista") {
        Sesion.iniciar({ idPersonaRol: "rec-1", nombre: "Laura Pérez", rol, clinica: "Central", idClinica: "c1" });
        modelo = new AdmisionModel(contenedor);
        await modelo.iniciar();
        await Ayuda.esperar();
    }
    async function registrar({ nombres = "Carlos", apellidos = "Mena", nace = "", tipo = DUI, numero = "01010101-1" } = {}) {
        Ayuda.escribir($("nombres"), nombres); Ayuda.escribir($("apellidos"), apellidos);
        if (nace) Ayuda.escribir($("nacimiento"), nace);
        if (tipo) $("tipo").seleccionar(tipo);
        Ayuda.escribir($("numero"), numero);
        $("formulario").dispatchEvent(new Event("submit", { cancelable: true }));
        await Ayuda.esperar(25);
    }

    beforeEach(() => {
        api = new ApiFalsa(BD);
        aviso = document.createElement("galeno-notificacion-emergente"); aviso.id = "aviso";
        contenedor = document.createElement("div");
        document.body.append(aviso, contenedor);
        sinon.spy(aviso, "mostrar");
        Sesion.cerrar();
    });
    afterEach(() => { api.restaurar(); aviso.remove(); contenedor.remove(); Sesion.cerrar(); });

    it("sin sesion no muestra el formulario", async () => {
        modelo = new AdmisionModel(contenedor); await modelo.iniciar();
        expect(contenedor.textContent).to.contain("Inicie sesión");
        expect(contenedor.querySelector("form")).to.equal(null);
    });
    it("un medico o una enfermera no tienen acceso", async () => {
        for (const rol of ["Médico", "Enfermera"]) {
            contenedor.replaceChildren();
            Sesion.iniciar({ nombre: "X", rol, idClinica: "c1" });
            await new AdmisionModel(contenedor).iniciar();
            expect(contenedor.querySelector("form"), rol).to.equal(null);
        }
    });
    it("pide nombres, apellidos, fecha de nacimiento, tipo y numero de documento", async () => {
        await arrancar();
        expect($("nacimiento").getAttribute("type")).to.equal("date");
        expect($("tipo").opciones.map(t => t.nombre)).to.deep.equal(["DUI", "Pasaporte"]);
        expect($("numero")).to.not.equal(null);
    });
    it("al elegir el tipo el campo muestra el formato esperado", async () => {
        await arrancar();
        $("tipo").dispatchEvent(new CustomEvent("galeno-seleccion", { detail: { valor: PAS } }));
        expect($("numero").shadowRoot.querySelector("input").placeholder).to.equal("A0000000");
    });

    describe("validacion", () => {
        beforeEach(() => arrancar());
        it("sin nombres no guarda nada", async () => {
            await registrar({ nombres: "" });
            expect(error("nombres")).to.contain("nombres");
            expect(api.llamadas).to.have.length(0);
        });
        it("sin apellidos no guarda nada", async () => {
            await registrar({ apellidos: "" });
            expect(error("apellidos")).to.contain("apellidos");
            expect(api.llamadas).to.have.length(0);
        });
        it("sin tipo de documento lo pide", async () => {
            await registrar({ tipo: null });
            expect($("mensaje").textContent).to.equal("Elija el tipo de documento");
            expect(api.llamadas).to.have.length(0);
        });
        it("el numero debe cumplir la expresion regular del tipo", async () => {
            await registrar({ numero: "123" });
            expect(error("numero")).to.equal("No tiene el formato de DUI: 00000000-0");
            expect(api.llamadas).to.have.length(0);
        });
        it("un pasaporte debe tener el formato de pasaporte", async () => {
            await registrar({ tipo: PAS, numero: "01010101-1" });
            expect(error("numero")).to.contain("formato de Pasaporte");
            await registrar({ tipo: PAS, numero: "C1234567" });
            expect(error("numero")).to.equal("");
            expect(api.enviados("POST", "documento")).to.have.length(1);
        });
        it("la fecha de nacimiento no puede ser futura", async () => {
            await registrar({ nace: "2999-01-01" });
            expect(error("nacimiento")).to.contain("futura");
            expect(api.llamadas).to.have.length(0);
        });
        it("el error se quita al volver a escribir", async () => {
            await registrar({ nombres: "" });
            Ayuda.escribir($("nombres"), "C");
            expect(error("nombres")).to.equal("");
        });
    });

    describe("registrar un paciente nuevo", () => {
        beforeEach(async () => { await arrancar(); await registrar({ nace: "1990-05-20" }); });
        it("crea la persona con su nombre y fecha de nacimiento", () => {
            const p = api.enviados("POST", "persona");
            expect(p).to.have.length(1);
            expect(p[0].cuerpo).to.include({ nombres: "Carlos", apellidos: "Mena" });
            expect(p[0].cuerpo.fechaNacimiento).to.match(/^1990-05-20/);
        });
        it("guarda su documento con el tipo y la persona creada", () => {
            const d = api.enviados("POST", "documento")[0].cuerpo;
            expect(d.valor).to.equal("01010101-1");
            expect(d.idTipoDocumento.nombre).to.equal("DUI");
            expect(d.idPersona.idPersona).to.equal("persona-nuevo-1");
        });
        it("le da el rol de paciente en la clinica de la recepcionista", () => {
            const r = api.enviados("POST", "persona_rol")[0].cuerpo;
            expect(r.idRol.nombre).to.equal("Paciente");
            expect(r.idClinica.idClinica).to.equal("c1");
            expect(r.idPersona.idPersona).to.equal("persona-nuevo-1");
        });
        it("NO crea ninguna consulta", () => {
            expect(api.enviados("POST", "consulta")).to.have.length(0);
            expect(api.enviados("POST", "consulta_procedimiento")).to.have.length(0);
        });
        it("confirma, avisa y deja el formulario limpio para el siguiente", () => {
            expect($("confirmacion").hidden).to.equal(false);
            expect($("confirmacion").textContent).to.contain("Carlos Mena").and.contain("Central");
            expect(aviso.mostrar.calledWith("Paciente registrado", "exito")).to.equal(true);
            expect($("nombres").value).to.equal("");
            expect($("numero").value).to.equal("");
        });
    });

    describe("documento repetido", () => {
        beforeEach(() => arrancar());
        it("si el documento ya es de una persona no la duplica: solo le agrega el rol de paciente", async () => {
            await registrar({ nombres: "Gregory", apellidos: "House", numero: "12345678-9" });
            expect(api.enviados("POST", "persona")).to.have.length(0);
            expect(api.enviados("POST", "documento")).to.have.length(0);
            const r = api.enviados("POST", "persona_rol")[0].cuerpo;
            expect(r.idPersona.idPersona).to.equal("m1");
            expect(r.idRol.nombre).to.equal("Paciente");
            expect($("confirmacion").textContent).to.contain("ya estaba en el sistema");
        });
        it("tambien lo reconoce sin guion", async () => {
            await registrar({ nombres: "Gregory", apellidos: "House", numero: "12345678-9" });
            expect(api.enviados("POST", "persona")).to.have.length(0);
        });
        it("si ya es paciente de la clinica no lo registra otra vez", async () => {
            api.bd.documento.push({ idDocumento: "d9", valor: "77777777-7", idPersona: { idPersona: "p7" }, idTipoDocumento: DUI });
            await registrar({ nombres: "Sofía", apellidos: "Rivas", numero: "77777777-7" });
            expect(api.llamadas).to.have.length(0);
            expect(aviso.mostrar.lastCall.args[0]).to.contain("Ya hay un paciente");
        });
    });

    describe("fallos", () => {
        it("sin rol de paciente configurado avisa y no crea nada", async () => {
            api.bd.rol = [{ idRol: "r-med", nombre: "Médico" }];
            await arrancar(); await registrar();
            expect(aviso.mostrar.lastCall.args[0]).to.contain("rol de paciente");
            expect(api.enviados("POST", "persona")).to.have.length(0);
        });
        it("si el backend rechaza el guardado muestra el error y el boton vuelve", async () => {
            await arrancar();
            const original = api.stub.getCall(0) && api.responder.bind(api);
            api.stub.callsFake(async (url, op = {}) => (op.method === "POST")
                ? new Response("", { status: 400 }) : original(url, op));
            await registrar();
            expect(aviso.mostrar.lastCall.args[1]).to.equal("error");
            expect($("registrar").disabled).to.equal(false);
            expect($("registrar").textContent).to.equal("Registrar paciente");
        });
    });
});
}
