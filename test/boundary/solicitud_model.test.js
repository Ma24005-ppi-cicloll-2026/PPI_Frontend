// Pruebas de SolicitudModel (HU2): el paciente pide su consulta sin iniciar sesion.
{
const { expect } = chai;

const BD = {
    clinica: [
        { idClinica: "c1", nombre: "Clínica Central", tipo: "General", activo: true },
        { idClinica: "c2", nombre: "Dental Sonrisa", tipo: "Odontología", activo: true },
        { idClinica: "c3", nombre: "Clínica Cerrada", tipo: "General", activo: false }],
    procedimiento: [
        { idProcedimiento: "pr1", nombre: "Rayos X", activo: true, observaciones: "Torácico" },
        { idProcedimiento: "pr2", nombre: "Limpieza dental", activo: true },
        { idProcedimiento: "pr3", nombre: "Cirugía antigua", activo: false }],
    rol: [{ idRol: "r1", nombre: "Médico" }, { idRol: "r2", nombre: " Paciente " }],
    persona: [{ idPersona: "p1", nombres: "Ana", apellidos: "López" }],
    persona_rol: [
        { idPersonaRol: "pac-1", idPersona: { idPersona: "p1", nombres: "Ana", apellidos: "López" }, idRol: { nombre: "Paciente" }, idClinica: { idClinica: "c1" } }]
};

describe("SolicitudModel (HU2)", () => {
    let api, contenedor, aviso, modelo;
    const $ = id => contenedor.querySelector("#" + id);
    const tarjetas = id => [...$(id).querySelectorAll("galeno-opcion")];
    const titulos = id => tarjetas(id).map(t => t.datos.titulo);
    const elegir = (zona, titulo) => tarjetas(zona).find(t => t.datos.titulo === titulo).shadowRoot.querySelector("button").click();
    const llenar = (nombres, apellidos) => { Ayuda.escribir($("nombres"), nombres); Ayuda.escribir($("apellidos"), apellidos); };

    beforeEach(async () => {
        api = new ApiFalsa(BD);
        aviso = document.createElement("galeno-notificacion-emergente"); aviso.id = "aviso";
        contenedor = document.createElement("div");
        document.body.append(aviso, contenedor);
        sinon.spy(aviso, "mostrar");
        modelo = new SolicitudModel(contenedor);
        await modelo.iniciar();
    });
    afterEach(() => { api.restaurar(); aviso.remove(); contenedor.remove(); });

    describe("no necesita iniciar sesion", () => {
        it("funciona sin sesion", () => {
            expect(Sesion.obtener()).to.equal(null);
            expect(contenedor.querySelector("h2").textContent).to.equal("Solicitar consulta");
        });
    });

    describe("clinicas (categorias)", () => {
        it("muestra todas las clinicas con su imagen", () => {
            expect(titulos("clinicas")).to.deep.equal(["Clínica Central", "Dental Sonrisa", "Clínica Cerrada"]);
            tarjetas("clinicas").forEach(t => expect(t.shadowRoot.querySelector("svg")).to.not.equal(null));
        });
        it("la imagen depende del tipo de clinica", () => {
            expect(tarjetas("clinicas")[1].datos.icono).to.equal("diente");
        });
        it("se pueden buscar por nombre o por tipo", () => {
            Ayuda.escribir($("buscar"), "odonto");
            expect(titulos("clinicas")).to.deep.equal(["Dental Sonrisa"]);
            Ayuda.escribir($("buscar"), "CENTRAL");
            expect(titulos("clinicas")).to.deep.equal(["Clínica Central"]);
        });
        it("una clinica inactiva se ve pero no se puede elegir", () => {
            const cerrada = tarjetas("clinicas")[2];
            expect(cerrada.datos.activo).to.equal(false);
            elegir("clinicas", "Clínica Cerrada");
            expect($("seccionProcedimientos").hidden).to.equal(true);
        });
        it("si falla el backend ofrece reintentar", async () => {
            api.restaurar();
            api = new ApiFalsa({}); api.stub.callsFake(async () => new Response("", { status: 500 }));
            contenedor.replaceChildren();
            await new SolicitudModel(contenedor).iniciar();
            expect($("estadoClinicas").shadowRoot.textContent).to.contain("Reintentar");
        });
    });

    describe("procedimientos (productos)", () => {
        beforeEach(() => elegir("clinicas", "Clínica Central"));

        it("al elegir una clinica activa aparecen los procedimientos", () => {
            expect($("seccionProcedimientos").hidden).to.equal(false);
            expect($("tituloProcedimientos").textContent).to.contain("Clínica Central");
            expect(titulos("procedimientos")).to.deep.equal(["Rayos X", "Limpieza dental", "Cirugía antigua"]);
        });
        it("la clinica elegida queda marcada", () => {
            expect(tarjetas("clinicas")[0].seleccionada).to.equal(true);
            expect(tarjetas("clinicas")[1].seleccionada).to.equal(false);
        });
        it("los procedimientos activos se pueden elegir y quitar", () => {
            elegir("procedimientos", "Rayos X");
            expect(tarjetas("procedimientos")[0].seleccionada).to.equal(true);
            expect($("resumen").textContent).to.equal("Clínica Central: 1 procedimiento elegido");
            elegir("procedimientos", "Rayos X");
            expect($("resumen").textContent).to.equal("Clínica Central: 0 procedimientos elegidos");
        });
        it("un procedimiento inactivo no se puede elegir", () => {
            elegir("procedimientos", "Cirugía antigua");
            expect(modelo.elegidos.size).to.equal(0);
        });
    });

    describe("el boton Solicitar consulta", () => {
        it("empieza deshabilitado", () => expect($("enviar").disabled).to.equal(true));
        it("se habilita solo con nombre, apellido, clinica y al menos un procedimiento", () => {
            llenar("Ana", "López");
            expect($("enviar").disabled).to.equal(true);
            elegir("clinicas", "Clínica Central");
            expect($("enviar").disabled).to.equal(true);
            elegir("procedimientos", "Rayos X");
            expect($("enviar").disabled).to.equal(false);
            Ayuda.escribir($("apellidos"), "");
            expect($("enviar").disabled).to.equal(true);
        });
        it("si se fuerza sin nombre, avisa en el campo y no envia nada", async () => {
            elegir("clinicas", "Clínica Central"); elegir("procedimientos", "Rayos X");
            await modelo.solicitar();
            expect($("nombres").shadowRoot.querySelector("#error").textContent).to.contain("nombres");
            expect(api.enviados("POST", "consulta")).to.have.length(0);
        });
    });

    describe("enviar la solicitud", () => {
        async function enviar(nombres, apellidos, clinica, procs) {
            llenar(nombres, apellidos);
            elegir("clinicas", clinica);
            procs.forEach(p => elegir("procedimientos", p));
            $("enviar").click();
            await Ayuda.esperar(20);
        }

        it("paciente ya registrado: crea la consulta con su nombre en la descripcion, sin duplicar a la persona", async () => {
            await enviar("ana", "LOPEZ", "Clínica Central", ["Rayos X"]);
            expect(api.enviados("POST", "persona")).to.have.length(0);
            expect(api.enviados("POST", "persona_rol")).to.have.length(0);
            const [consulta] = api.enviados("POST", "consulta");
            expect(consulta.cuerpo.idPersonaRol.idPersonaRol).to.equal("pac-1");
            expect(consulta.cuerpo.observaciones).to.contain("Solicitada por ana LOPEZ");
            expect(consulta.cuerpo.observaciones).to.contain("Rayos X");
            expect(consulta.cuerpo.fechaInicio).to.be.a("string");
        });
        it("agrega cada procedimiento elegido con el nombre del paciente en su descripcion", async () => {
            await enviar("Ana", "López", "Clínica Central", ["Rayos X", "Limpieza dental"]);
            const cps = api.enviados("POST", "consulta_procedimiento");
            expect(cps.map(c => c.cuerpo.idProcedimiento)).to.deep.equal(["pr1", "pr2"]);
            cps.forEach(c => {
                expect(c.cuerpo.observaciones).to.equal("Solicitado por Ana López");
                expect(c.cuerpo.idConsulta.idConsulta).to.match(/^consulta-nuevo/);
            });
        });
        it("persona nueva: se registra como paciente de la clinica elegida y luego se crea la consulta", async () => {
            await enviar("Luis", "Mena", "Dental Sonrisa", ["Limpieza dental"]);
            const [persona] = api.enviados("POST", "persona");
            expect(persona.cuerpo).to.deep.include({ nombres: "Luis", apellidos: "Mena" });
            const [rolPaciente] = api.enviados("POST", "persona_rol");
            expect(rolPaciente.cuerpo.idRol.idRol).to.equal("r2");
            expect(rolPaciente.cuerpo.idClinica.idClinica).to.equal("c2");
            expect(rolPaciente.cuerpo.idPersona.nombres).to.equal("Luis");
            const [consulta] = api.enviados("POST", "consulta");
            expect(consulta.cuerpo.idPersonaRol.idPersona.nombres).to.equal("Luis");
        });
        it("persona que ya existe pero nunca fue paciente de esa clinica: solo se le agrega el rol", async () => {
            await enviar("Ana", "López", "Dental Sonrisa", ["Limpieza dental"]);
            expect(api.enviados("POST", "persona")).to.have.length(0);
            expect(api.enviados("POST", "persona_rol")).to.have.length(1);
        });
        it("si no existe el rol de paciente avisa y no crea ninguna consulta", async () => {
            api.bd.rol = [{ idRol: "r1", nombre: "Médico" }];
            await enviar("Luis", "Mena", "Dental Sonrisa", ["Limpieza dental"]);
            expect(aviso.mostrar.lastCall.args).to.deep.equal(["La clínica aún no tiene configurado el rol de paciente", "error"]);
            expect(api.enviados("POST", "consulta")).to.have.length(0);
        });
        it("si el backend rechaza la consulta avisa el error", async () => {
            const original = api.responder.bind(api);
            api.responder = async (url, op) => op.method === "POST" && url.includes("/consulta?") === false && url.endsWith("/consulta")
                ? new Response("", { status: 500 }) : original(url, op);
            await enviar("Ana", "López", "Clínica Central", ["Rayos X"]);
            expect(aviso.mostrar.lastCall.args[1]).to.equal("error");
        });
        it("al terminar muestra la confirmacion y limpia los procedimientos elegidos", async () => {
            await enviar("Ana", "López", "Clínica Central", ["Rayos X"]);
            expect($("confirmacion").hidden).to.equal(false);
            expect($("confirmacion").textContent).to.contain("Ana López");
            expect($("confirmacion").textContent).to.contain("Rayos X");
            expect(modelo.elegidos.size).to.equal(0);
            expect(aviso.mostrar.calledWith("Consulta solicitada", "exito")).to.equal(true);
        });
        it("el boton vuelve a su texto despues de enviar", async () => {
            await enviar("Ana", "López", "Clínica Central", ["Rayos X"]);
            expect($("enviar").textContent).to.equal("Solicitar consulta");
        });
    });
});
}
