{
const { expect } = chai;

// Pruebas unitarias: un procedimiento de dos pasos (recepción y médico) armado en cada caso, con servicios falsos.
describe("SeguimientoModel (HU4)", () => {
    const flujo = new FlujoPasos();
    const pasos = [{ idProcedimientoPaso: "s1", nombre: "Triaje", idRol: Falsos.rol("r-rec", "Recepcionista") },
                   { idProcedimientoPaso: "s2", nombre: "Consulta médica", idRol: Falsos.rol("r-med", "Médico") }];
    const medico = { idPersonaRol: "pr-med", idRol: "r-med", rol: "Médico", idClinica: "c1", clinica: "Clínica" };
    const recepcion = { idPersonaRol: "pr-rec", idRol: "r-rec", rol: "Recepcionista", idClinica: "c1", clinica: "Clínica" };
    // Registro de un paso ya trabajado.
    const paso = (id, hora, estado = "Completado") => ({ idConsultaProcedimientoPaso: id, fechaInicio: `2026-01-01T0${hora}:00:00Z`, estado });
    let zona, modelo, servicios, aviso, irA, proc;

    // Crea el modelo con un expediente falso y lo inicia.
    const montar = ({ realizados = [], observaciones = "", fechaFin = null, contexto = medico, existe = true, falla = false } = {}) => {
        const consulta = { idConsulta: "k1", fechaFin };
        proc = { cp: { idConsultaProcedimiento: "cp1", observaciones }, nombre: "General", estado: flujo.estado(pasos, [...realizados]) };
        const expediente = {
            flujo,
            cargar: () => Promise.resolve({ consultas: existe ? [consulta] : [], realizados: [...realizados], ordenes: [] }),
            procedimientosDe: () => [proc],
            paciente: () => ({ nombre: "Luis Pérez", edad: 30, documento: "1" })
        };
        servicios = {
            examenes: Falsos.servicio([{ idExamen: "e1", nombre: "Hemograma" }, { idExamen: "e2", nombre: "Radiografía" }]),
            relaciones: Falsos.servicio(["e1", "e2"].map(e => ({ idExamen: { idExamen: e }, idProcedimientoPaso: { idProcedimientoPaso: "s2" } }))),
            cats: Falsos.servicio(), tipos: Falsos.servicio(),
            realizados: Falsos.servicio([], { id: "idConsultaProcedimientoPaso", falla }),
            cps: Falsos.servicio([], { falla }), consultas: Falsos.servicio([], { falla }),
            ordenes: Falsos.servicio([], { id: "idOrdenExamen", falla })
        };
        aviso = Falsos.aviso();
        irA = sinon.spy();
        zona = document.createElement("div"); document.body.append(zona);
        const sesion = Falsos.sesion({ idPersona: "p1", nombre: "Ana Mejía", contextos: [] }, contexto);
        modelo = new SeguimientoModel(zona, "k1", { irA, aviso, sesion, expediente, servicios });
        return modelo.iniciar();
    };
    // Busca un elemento de la vista.
    const q = id => zona.querySelector("#" + id);
    // Lo que se envió con PUT a un servicio.
    const enviado = (servicio, n = 0) => servicios[servicio].actualizar.getCall(n).args[1];

    afterEach(() => zona?.remove());

    it("si la consulta no existe muestra error", async () => {
        expect(await montar({ existe: false })).to.equal(false);
        expect(q("estado").estado).to.equal("error");
    });
    it("iniciar no se bloquea: la vista reacciona al evento galeno-consulta-cargada", async () => {
        const eventos = [];
        const promesa = montar({ realizados: [paso("cpp1", 1)] });
        zona.addEventListener("galeno-consulta-cargada", () => eventos.push(true));
        expect(eventos).to.have.length(0);
        expect(await promesa).to.equal(true);
        expect(eventos).to.have.length(1);
    });
    it("abre en el paso que toca; al médico en el último paso le muestra Finalizar y Devolver", async () => {
        await montar({ realizados: [paso("cpp1", 1)] });
        expect(modelo.vista).to.equal(1);
        expect(modelo.editable()).to.equal(true);
        expect(q("finalizar").hidden).to.equal(false);
        expect(q("avanzar").hidden).to.equal(true);
        expect(q("devolver").hidden).to.equal(false);
    });
    it("un rol no puede llevar el paso de otro rol", async () => {
        await montar({ contexto: medico });
        expect(modelo.vista).to.equal(0);
        expect(modelo.editable()).to.equal(false);
        expect(q("notas").deshabilitado).to.equal(true);
        expect(q("avanzar").hidden && q("finalizar").hidden && q("devolver").hidden).to.equal(true);
    });
    it("en el primer paso no se puede devolver", async () => {
        await montar({ contexto: recepcion });
        expect(modelo.editable()).to.equal(true);
        expect(q("devolver").hidden).to.equal(true);
    });
    it("Guardar y avanzar crea el paso, guarda la nota, lo completa y pasa al siguiente", async () => {
        await montar({ contexto: recepcion });
        Ayuda.escribir(q("notas"), "Presión normal");
        await modelo.guardarYAvanzar();
        expect(servicios.realizados.crear.firstCall.args[0]).to.include({ estado: "En proceso" });
        expect(enviado("cps").observaciones).to.contain("Presión normal");
        expect(enviado("realizados")).to.include({ estado: "Completado" });
        expect(modelo.vista).to.equal(1);
        expect(modelo.editable()).to.equal(false);
    });
    it("si falla el guardado avisa, no avanza y conserva las notas", async () => {
        await montar({ contexto: recepcion, falla: true });
        Ayuda.escribir(q("notas"), "Presión normal");
        await modelo.guardarYAvanzar();
        expect(aviso.mostrar.calledWith(sinon.match.string, "error")).to.equal(true);
        expect(modelo.vista).to.equal(0);
        expect(q("notas").value).to.equal("Presión normal");
        expect(q("avanzar").disabled).to.equal(false);
    });
    it("Finalizar completa el paso, cierra procedimiento y consulta, y vuelve al panel", async () => {
        await montar({ realizados: [paso("cpp1", 1)] });
        await modelo.finalizarConsulta();
        expect(enviado("realizados")).to.include({ estado: "Completado" });
        expect(servicios.cps.actualizar.lastCall.args[1].fechaFin).to.be.a("string");
        expect(enviado("consultas").fechaFin).to.be.a("string");
        expect(irA.calledWith("dashboard")).to.equal(true);
    });
    it("asignar crea una orden por examen; sin exámenes no envía nada", async () => {
        await montar({ realizados: [paso("cpp1", 1)] });
        await modelo.asignar([]);
        expect(servicios.ordenes.crear.called).to.equal(false);
        await modelo.asignar(["e1", "e2"]);
        expect(servicios.ordenes.crear.args.map(a => a[0].indicaciones)).to.deep.equal(["Hemograma", "Radiografía"]);
    });
    it("devolver sin motivo no envía nada", async () => {
        await montar({ realizados: [paso("cpp1", 1)] });
        q("devolver").click();
        await modelo.devolverPaso();
        expect(servicios.realizados.actualizar.called).to.equal(false);
        expect(q("motivo").shadowRoot.querySelector("#error").textContent).to.not.equal("");
    });
    it("devolver marca el paso anterior como Devuelto, guarda el motivo, avisa con un evento y vuelve al panel", async () => {
        await montar({ realizados: [paso("cpp1", 1)] });
        const eventos = [];
        zona.addEventListener("galeno-paso-devuelto", e => eventos.push(e.detail.rol));
        q("devolver").click();
        Ayuda.escribir(q("motivo"), "Falta la presión");
        await modelo.devolverPaso();
        expect(servicios.realizados.actualizar.firstCall.args[0]).to.equal("cpp1");
        expect(enviado("realizados")).to.include({ estado: "Devuelto", fechaFin: null });
        expect(new NotasPaso().devolucionDe(enviado("cps").observaciones, 1)).to.deep.equal({ autor: "Ana Mejía", motivo: "Falta la presión" });
        expect(eventos).to.deep.equal(["Recepcionista"]);
        expect(irA.calledWith("dashboard")).to.equal(true);
    });
    it("el rol que recibe el paso devuelto ve el motivo y, al completarlo, el motivo se borra", async () => {
        const notas = new NotasPaso();
        await montar({ contexto: recepcion, realizados: [paso("cpp1", 1, "Devuelto")],
                       observaciones: notas.guardarDevolucion("", 1, "Dr. Ruiz", "Falta la presión") });
        expect(modelo.vista).to.equal(0);
        expect(modelo.editable()).to.equal(true);
        expect(q("devuelto").hidden).to.equal(false);
        expect(q("devuelto").textContent).to.contain("Falta la presión");
        await modelo.guardarYAvanzar();
        expect(servicios.realizados.crear.called).to.equal(false);
        expect(notas.devolucionDe(enviado("cps").observaciones, 1)).to.equal(null);
        expect(modelo.vista).to.equal(1);
    });
    it("una consulta finalizada queda en solo lectura", async () => {
        await montar({ realizados: [paso("cpp1", 1), paso("cpp2", 2)], fechaFin: "2026-01-01T10:00:00Z" });
        expect(modelo.editable()).to.equal(false);
        expect(q("avanzar").hidden && q("finalizar").hidden && q("devolver").hidden).to.equal(true);
    });
    it("Anterior muestra el paso previo en solo lectura", async () => {
        await montar({ realizados: [paso("cpp1", 1)] });
        q("anterior").click();
        expect(modelo.vista).to.equal(0);
        expect(q("notas").deshabilitado).to.equal(true);
    });
    it("Volver lleva al panel", async () => {
        await montar();
        q("volver").click();
        expect(irA.calledWith("dashboard")).to.equal(true);
    });
});
}
