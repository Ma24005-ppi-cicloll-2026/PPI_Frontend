{
const { expect } = chai;

// Pruebas unitarias: el expediente es falso, así el panel se prueba sin depender de pasos, roles ni servicios.
describe("DashboardModel (HU3)", () => {
    const empleado = { idPersona: "p1", nombre: "Ana Mejía", contextos: [
        { idPersonaRol: "pr-med-sa", idRol: "r-med", rol: "Médico", idClinica: "c-sa", clinica: "Santa Ana" },
        { idPersonaRol: "pr-rec-sa", idRol: "r-rec", rol: "Recepcionista", idClinica: "c-sa", clinica: "Santa Ana" },
        { idPersonaRol: "pr-med-sm", idRol: "r-med", rol: "Médico", idClinica: "c-sm", clinica: "San Miguel" }] };
    // Consulta mínima: para qué rol está pendiente, si fue devuelta, de qué clínica y qué paciente.
    const consulta = (id, { rol = "r-med", clinica = "c-sa", desfase = 0, paciente = "Luis Pérez", devuelta = false } = {}) =>
        ({ idConsulta: id, fechaInicio: Falsos.dia(desfase), rol, devuelta, paciente, idPersonaRol: { idClinica: { idClinica: clinica } } });
    let zona, modelo, expediente, sesion, irA;

    // Expediente falso: decide qué es de cada rol según los campos de la consulta de prueba.
    const expedienteFalso = consultas => ({
        cargar: sinon.stub().callsFake(() => Promise.resolve({ consultas })),
        pendienteDelRol: (d, c, idRol) => c.rol === idRol,
        devuelta: (d, c) => c.devuelta,
        paciente: (d, c) => ({ nombre: c.paciente, documento: "" }),
        procedimientosDe: () => [],
        tarjeta: (d, c) => ({ idConsulta: c.idConsulta, fechaInicio: c.fechaInicio, paciente: { nombre: c.paciente },
                              procedimientos: [], devuelta: c.devuelta, finalizada: false, puedeAtender: true }),
        registro: sinon.stub().returns({ procedimiento: "General", paso: "Triaje", estado: "Completado", examenes: [] })
    });
    // Crea el modelo con la sesión y el expediente falsos.
    const montar = (consultas = []) => {
        expediente = expedienteFalso(consultas);
        sesion = Falsos.sesion(empleado);
        irA = sinon.spy();
        zona = document.createElement("div"); document.body.append(zona);
        modelo = new DashboardModel(zona, { irA, sesion, expediente });
        modelo.iniciar();
    };
    // Busca un elemento de la vista.
    const q = id => zona.querySelector("#" + id);
    // Elige la clínica y el rol y carga el panel.
    const cargar = (idClinica = "c-sa", idRol = "r-med") => {
        Ayuda.elegir(q("clinica"), q("clinica").opciones.findIndex(c => c.idClinica === idClinica));
        Ayuda.elegir(q("rol"), q("rol").opciones.findIndex(r => r.idRol === idRol));
        return modelo.cargar();
    };
    // Cambia el filtro de fechas.
    const modo = nombre => q("modo").seleccionar(q("modo").opciones.find(o => o.nombre === nombre));
    // IDs de las tarjetas visibles.
    const ids = () => [...zona.querySelectorAll("galeno-tarjeta-agenda")].map(t => t.datos.idConsulta);

    afterEach(() => zona?.remove());

    it("ofrece solo las clínicas del empleado y, al elegir una, sus roles en ella", () => {
        montar();
        expect(q("clinica").opciones.map(c => c.idClinica)).to.have.members(["c-sa", "c-sm"]);
        Ayuda.elegir(q("clinica"), q("clinica").opciones.findIndex(c => c.idClinica === "c-sa"));
        expect(q("rol").opciones.map(r => r.idRol)).to.have.members(["r-med", "r-rec"]);
    });
    it("sin clínica o rol no pide el expediente", async () => {
        montar();
        await modelo.cargar();
        expect(expediente.cargar.called).to.equal(false);
    });
    it("al cargar guarda la clínica y el rol en la sesión", async () => {
        montar();
        await cargar("c-sa", "r-rec");
        expect(sesion.contexto()).to.include({ idPersonaRol: "pr-rec-sa", idClinica: "c-sa" });
    });
    it("cargar no se bloquea: la vista reacciona al evento galeno-panel-cargado", async () => {
        montar([consulta("k1")]);
        const eventos = [];
        zona.addEventListener("galeno-panel-cargado", () => eventos.push(ids().length));
        const promesa = cargar();
        expect(eventos).to.have.length(0);
        await promesa;
        expect(eventos).to.have.length(1);
        expect(ids()).to.deep.equal(["k1"]);
    });
    it("solo muestra lo pendiente para el rol elegido y de la clínica elegida", async () => {
        montar([consulta("k-med"), consulta("k-rec", { rol: "r-rec" }), consulta("k-otra-clinica", { clinica: "c-sm" })]);
        await cargar("c-sa", "r-med");
        expect(ids()).to.deep.equal(["k-med"]);
    });
    it("los filtros Hoy, Futuro y Pasado cambian la lista sin volver a pedir datos", async () => {
        montar([consulta("k-ayer", { desfase: -1 }), consulta("k-hoy"), consulta("k-manana", { desfase: 1 })]);
        await cargar();
        expect(ids()).to.deep.equal(["k-hoy"]);
        modo("Futuro"); expect(ids()).to.deep.equal(["k-manana"]);
        modo("Pasado"); expect(ids()).to.deep.equal(["k-ayer"]);
        expect(expediente.cargar.calledOnce).to.equal(true);
    });
    it("el rango de fechas filtra por día", async () => {
        montar([consulta("k-hoy"), consulta("k-manana", { desfase: 1 })]);
        await cargar();
        modo("Rango");
        q("desde").value = Falsos.fechaLocal(1); q("hasta").value = Falsos.fechaLocal(1);
        q("hasta").entrada.dispatchEvent(new Event("input"));
        expect(ids()).to.deep.equal(["k-manana"]);
    });
    it("busca al paciente sin importar tildes ni mayúsculas", async () => {
        montar([consulta("k1", { paciente: "Luis Pérez" }), consulta("k2", { paciente: "Jenni Rivas" })]);
        await cargar();
        Ayuda.escribir(q("paciente"), "PEREZ");
        expect(ids()).to.deep.equal(["k1"]);
    });
    it("los contadores separan En curso y Devueltas, y filtran al pulsarlos", async () => {
        montar([consulta("k1"), consulta("k2", { devuelta: true })]);
        await cargar();
        const n = estado => q("conteo").querySelector(`[data-conteo="${estado}"]`).textContent;
        expect([n("total"), n("curso"), n("devueltas")]).to.deep.equal(["2", "1", "1"]);
        q("conteo").querySelector('[data-estado="devueltas"]').click();
        expect(ids()).to.deep.equal(["k2"]);
    });
    it("muestra de a 12 tarjetas y agrega el resto con Mostrar más", async () => {
        montar(Array.from({ length: 15 }, (_, i) => consulta("k" + i)));
        await cargar();
        expect(ids()).to.have.length(12);
        q("mostrar-mas").click();
        expect(ids()).to.have.length(15);
    });
    it("descarta un expediente que llega cuando ya se pidió otro", async () => {
        montar([consulta("k-nuevo")]);
        const lenta = Falsos.diferida();
        expediente.cargar.onFirstCall().returns(lenta.promesa);
        const primera = cargar();
        await modelo.cargar();
        lenta.resolver({ consultas: [consulta("k-viejo")] });
        await primera;
        expect(ids()).to.deep.equal(["k-nuevo"]);
    });
    it("si el expediente no carga muestra el estado de error", async () => {
        montar();
        expediente.cargar.callsFake(() => Promise.reject(new Error("sin red")));
        await cargar();
        expect(q("estado").estado).to.equal("error");
    });
    it("Atender consulta y Registro reaccionan a los eventos de la tarjeta", async () => {
        montar([consulta("k1")]);
        await cargar();
        q("lista").dispatchEvent(new CustomEvent("galeno-atender", { detail: { idConsulta: "k1" } }));
        expect(irA.calledWith("consulta", "k1")).to.equal(true);
        q("lista").dispatchEvent(new CustomEvent("galeno-ver-registro", { detail: { idPaso: "cpp1" } }));
        expect(expediente.registro.calledWith(sinon.match.any, "cpp1")).to.equal(true);
        expect(q("registro").abierta).to.equal(true);
        q("registro").cerrar();
    });
});
}
