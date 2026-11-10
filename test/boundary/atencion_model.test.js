// Pruebas de AtencionModel (HU3): el medico ve las consultas pendientes y trabaja sobre ellas.
{
const { expect } = chai;

const ana = { idPersona: "p1", nombres: "Ana", apellidos: "López" };
const luis = { idPersona: "p2", nombres: "Luis", apellidos: "Mena" };
const pr = (id, persona, clinica = "c1") => ({ idPersonaRol: id, idPersona: persona, idClinica: { idClinica: clinica } });
const BD = {
    consulta: [
        { idConsulta: "k1", fechaInicio: "2026-11-09T15:00:00Z[UTC]", fechaFin: null, observaciones: "Dolor", idPersonaRol: pr("pac-1", ana) },
        { idConsulta: "k2", fechaInicio: "2026-11-08T15:00:00Z[UTC]", fechaFin: "2026-11-08T16:00:00Z[UTC]", observaciones: "FINALIZADA", idPersonaRol: pr("pac-1", ana) },
        { idConsulta: "k3", fechaInicio: "2026-11-09T16:00:00Z[UTC]", fechaFin: null, observaciones: "OTRA CLINICA", idPersonaRol: pr("pac-9", luis, "c9") },
        { idConsulta: "k4", fechaInicio: "2026-11-10T09:00:00Z[UTC]", fechaFin: null, observaciones: "Control", idPersonaRol: pr("pac-2", luis) }],
    procedimiento: [{ idProcedimiento: "pr1", nombre: "Rayos X", activo: true }],
    consulta_procedimiento: [
        { idConsultaProcedimiento: "cp1", idConsulta: { idConsulta: "k1" }, idProcedimiento: "pr1", fechaInicio: "2026-11-09T15:05:00Z[UTC]" }],
    consulta_procedimiento_paso: [
        { idConsultaProcedimientoPaso: "s1", idConsultaProcedimiento: { idConsultaProcedimiento: "cp1" }, estado: "En proceso", fechaInicio: "2026-11-09T15:10:00Z[UTC]" },
        { idConsultaProcedimientoPaso: "s2", idConsultaProcedimiento: { idConsultaProcedimiento: "cp1" }, estado: "Completado", fechaInicio: "2026-11-09T15:20:00Z[UTC]", fechaFin: "2026-11-09T15:30:00Z[UTC]" }],
    orden_examen: [
        { idOrdenExamen: "o1", idConsultaProcedimientoPaso: { idConsultaProcedimientoPaso: "s1" }, indicaciones: "Placa frontal", fechaCreacion: "2026-11-09T15:40:00Z[UTC]" },
        { idOrdenExamen: "o2", idConsultaProcedimientoPaso: { idConsultaProcedimientoPaso: "s1" }, indicaciones: "Placa lateral", fechaCreacion: "2026-11-09T15:41:00Z[UTC]" }],
    examen_resultado: [{ idExamenResultado: "e1", idOrdenExamen: { idOrdenExamen: "o1" }, resultado: "Normal" }],
    documento: [],
    persona_rol: [{ idPersonaRol: "emp-001", idPersona: { nombres: "Gregory", apellidos: "House" }, idRol: { nombre: "Médico" } }]
};

describe("AtencionModel (HU3)", () => {
    let api, contenedor, aviso, modelo;
    const $ = id => contenedor.querySelector("#" + id);
    const botones = () => [...$("acciones").querySelectorAll("button")].map(b => b.textContent);
    const guardar = datos => $("formulario").dispatchEvent(new CustomEvent("galeno-guardar", { detail: { datos } }));
    async function arrancar(rol = "Médico") {
        Sesion.iniciar({ idPersonaRol: "emp-001", nombre: "Gregory House", rol, clinica: "Central", idClinica: "c1" });
        modelo = new AtencionModel(contenedor);
        await modelo.iniciar();
    }
    async function abrir(id = "k1") {
        $("tarjetas").dispatchEvent(new CustomEvent("galeno-abrir-consulta", { detail: { idConsulta: id } }));
        await Ayuda.esperar(20);
    }
    const accion = async clave => { contenedor.querySelector(`[data-accion=${clave}]`).click(); await Ayuda.esperar(); };

    beforeEach(() => {
        api = new ApiFalsa(BD);
        aviso = document.createElement("galeno-notificacion-emergente"); aviso.id = "aviso";
        contenedor = document.createElement("div");
        document.body.append(aviso, contenedor);
        sinon.spy(aviso, "mostrar");
        Sesion.cerrar();
    });
    afterEach(() => { api.restaurar(); aviso.remove(); contenedor.remove(); Sesion.cerrar(); });

    it("sin sesion no muestra nada de atencion", async () => {
        modelo = new AtencionModel(contenedor); await modelo.iniciar();
        expect(contenedor.textContent).to.contain("Inicie sesión");
        expect(api.llamadas).to.have.length(0);
    });
    it("una recepcionista no tiene acceso", async () => {
        Sesion.iniciar({ nombre: "Laura", rol: "Recepcionista", idClinica: "c1" });
        modelo = new AtencionModel(contenedor); await modelo.iniciar();
        expect(contenedor.textContent).to.contain("Inicie sesión");
    });

    describe("consultas pendientes", () => {
        beforeEach(() => arrancar());
        it("lista solo las que no estan finalizadas y son de su clinica, la mas reciente primero", () => {
            const t = [...$("tarjetas").querySelectorAll("galeno-tarjeta-consulta")];
            expect(t.map(x => x.consulta.idConsulta)).to.deep.equal(["k4", "k1"]);
        });
        it("cada tarjeta muestra al paciente", () => {
            expect($("tarjetas").querySelector("galeno-tarjeta-consulta").shadowRoot.textContent).to.contain("Paciente: Luis Mena");
        });
        it("si no hay pendientes dice que esta vacio", async () => {
            api.bd.consulta.forEach(c => { c.fechaFin = "2026-11-10T00:00:00Z[UTC]"; });
            contenedor.replaceChildren(); await arrancar();
            expect($("estado").shadowRoot.textContent).to.contain("No hay");
        });
    });

    describe("trabajar una consulta", () => {
        beforeEach(async () => { await arrancar(); await abrir("k1"); });

        it("al elegirla se esconde la lista y se muestra el detalle con sus procedimientos por nombre", () => {
            expect($("lista").hidden).to.equal(true);
            expect($("trabajo").hidden).to.equal(false);
            expect(modelo.detalle.tablas.procedimientos.filas).to.have.length(1);
            expect(Ayuda.textos(modelo.detalle.tablas.procedimientos, "td")).to.include("Rayos X");
        });
        it("ofrece las acciones del medico (y no finalizar: eso es de recepcion)", () => {
            expect(botones()).to.deep.equal(["Registrar paso", "Actualizar paso", "Solicitar examen", "Registrar resultado"]);
        });
        it("Volver regresa a la lista", () => {
            $("detalle").querySelector("#volver").click();
            expect($("lista").hidden).to.equal(false);
            expect($("trabajo").hidden).to.equal(true);
        });

        describe("registrar paso", () => {
            beforeEach(() => accion("paso"));
            it("abre el formulario", () => expect($("formulario").hidden).to.equal(false));
            it("guarda el paso con estado, fecha y quien lo registro", async () => {
                guardar({ procedimiento: BD.consulta_procedimiento[0], estado: { nombre: "En proceso" } });
                await Ayuda.esperar(20);
                const [p] = api.enviados("POST", "consulta_procedimiento_paso");
                expect(p.cuerpo).to.deep.include({ estado: "En proceso", fechaFin: null });
                expect(p.cuerpo.idConsultaProcedimiento.idConsultaProcedimiento).to.equal("cp1");
                expect(p.cuerpo.idPersonaRol.idPersonaRol).to.equal("emp-001");
                expect(p.cuerpo.fechaInicio).to.be.a("string");
                expect(aviso.mostrar.calledWith("Paso registrado", "exito")).to.equal(true);
            });
            it("si el estado es Completado guarda tambien la fecha de fin", async () => {
                guardar({ procedimiento: BD.consulta_procedimiento[0], estado: { nombre: "Completado" } });
                await Ayuda.esperar(20);
                expect(api.enviados("POST", "consulta_procedimiento_paso")[0].cuerpo.fechaFin).to.be.a("string");
            });
            it("despues de guardar cierra el formulario y refresca el detalle", async () => {
                guardar({ procedimiento: BD.consulta_procedimiento[0], estado: { nombre: "Pendiente" } });
                await Ayuda.esperar(20);
                expect($("formulario").hidden).to.equal(true);
                expect(modelo.detalle.tablas.pasos.filas).to.have.length(3);
            });
        });

        describe("actualizar paso", () => {
            it("solo ofrece los pasos que no estan Completados", async () => {
                await accion("estado");
                const campos = modelo.formulario._campos;
                expect(campos[0].opciones.map(p => p.idConsultaProcedimientoPaso)).to.deep.equal(["s1"]);
            });
            it("cambia el estado del paso con un PUT y conserva el resto de sus datos", async () => {
                await accion("estado");
                guardar({ paso: BD.consulta_procedimiento_paso[0], estado: { nombre: "Completado" } });
                await Ayuda.esperar(20);
                const [put] = api.enviados("PUT", "consulta_procedimiento_paso");
                expect(put.id).to.equal("s1");
                expect(put.cuerpo).to.deep.include({ estado: "Completado", idConsultaProcedimientoPaso: "s1" });
                expect(put.cuerpo.fechaFin).to.be.a("string");
            });
        });

        describe("solicitar examen", () => {
            it("crea la orden ligada al paso con las indicaciones", async () => {
                await accion("examen");
                guardar({ paso: BD.consulta_procedimiento_paso[0], indicaciones: "Hemograma" });
                await Ayuda.esperar(20);
                const [o] = api.enviados("POST", "orden_examen");
                expect(o.cuerpo).to.deep.include({ indicaciones: "Hemograma" });
                expect(o.cuerpo.idConsultaProcedimientoPaso.idConsultaProcedimientoPaso).to.equal("s1");
                expect(aviso.mostrar.calledWith("Examen solicitado", "exito")).to.equal(true);
            });
        });

        describe("registrar resultado", () => {
            it("solo ofrece las ordenes que todavia no tienen resultado", async () => {
                await accion("resultado");
                expect(modelo.formulario._campos[0].opciones.map(o => o.idOrdenExamen)).to.deep.equal(["o2"]);
            });
            it("guarda el resultado ligado a la orden", async () => {
                await accion("resultado");
                guardar({ orden: BD.orden_examen[1], resultado: "Fractura leve", interpretacion: "Inmovilizar" });
                await Ayuda.esperar(20);
                const [r] = api.enviados("POST", "examen_resultado");
                expect(r.cuerpo).to.deep.include({ resultado: "Fractura leve", interpretacion: "Inmovilizar" });
                expect(r.cuerpo.idOrdenExamen.idOrdenExamen).to.equal("o2");
            });
        });

        it("si una accion no tiene opciones lo avisa en vez de abrir un formulario vacio", async () => {
            api.bd.consulta_procedimiento_paso = [];
            await abrir("k1");
            await accion("estado");
            expect($("formulario").hidden).to.equal(true);
            expect(aviso.mostrar.lastCall.args[1]).to.equal("info");
        });
        it("si el backend rechaza la accion avisa el error y deja el formulario abierto", async () => {
            await accion("examen");
            const original = api.responder.bind(api);
            api.responder = async (url, op) => op.method === "POST" ? new Response("", { status: 500 }) : original(url, op);
            guardar({ paso: BD.consulta_procedimiento_paso[0], indicaciones: "X" });
            await Ayuda.esperar(20);
            expect(aviso.mostrar.lastCall.args[1]).to.equal("error");
            expect($("formulario").hidden).to.equal(false);
        });
    });
});
}
