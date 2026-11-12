// HU3 · Dashboard
{
const { expect } = chai;
describe("DashboardModel (HU3)", () => {
    let api, zona, modelo, irA;
    const ana = () => ({ idPersona: "p-ana", nombre: "Ana Mejía", contextos: [
        { idPersonaRol: "pr-ana-med-sa", idRol: "r-med", rol: "Médico", idClinica: "c-sa", clinica: "Santa Ana" },
        { idPersonaRol: "pr-ana-rec-sa", idRol: "r-rec", rol: "Recepcionista", idClinica: "c-sa", clinica: "Santa Ana" },
        { idPersonaRol: "pr-ana-med-sm", idRol: "r-med", rol: "Médico", idClinica: "c-sm", clinica: "San Miguel" }] });
    beforeEach(async () => {
        Sesion.iniciar(ana());
        api = new ApiFalsa(Datos.bd());
        zona = document.createElement("div"); document.body.append(zona);
        irA = sinon.spy();
        modelo = new DashboardModel(zona, { irA });
        modelo.iniciar();
    });
    afterEach(() => { api.restaurar(); zona.remove(); Sesion.cerrar(); });
    const q = id => zona.querySelector("#" + id);
    const elegir = async (clinica, rol) => {
        const ci = q("clinica").opciones.findIndex(c => c.nombre === clinica); Ayuda.elegir(q("clinica"), ci);
        const ri = q("rol").opciones.findIndex(r => r.rol === rol); Ayuda.elegir(q("rol"), ri);
        q("contexto").dispatchEvent(new Event("submit", { cancelable: true })); await Ayuda.esperar(15);
    };
    const tarjetas = () => [...zona.querySelectorAll("galeno-tarjeta-agenda")];
    const ids = () => tarjetas().map(t => t.datos.idConsulta);

    it("primero pide clinica y rol, y no muestra consultas ni filtros", () => {
        expect(q("filtros").hidden).to.equal(true);
        expect(tarjetas()).to.have.length(0);
    });
    it("solo ofrece SUS clinicas y, al elegir una, SUS roles en ella", () => {
        expect(q("clinica").opciones.map(c => c.nombre)).to.have.members(["Santa Ana", "San Miguel"]);
        expect(q("rol").deshabilitado).to.equal(true);
        Ayuda.elegir(q("clinica"), q("clinica").opciones.findIndex(c => c.nombre === "Santa Ana"));
        expect(q("rol").opciones.map(r => r.rol)).to.have.members(["Médico", "Recepcionista"]);
    });
    it("exige elegir clinica y rol", async () => {
        q("contexto").dispatchEvent(new Event("submit", { cancelable: true })); await Ayuda.esperar();
        expect(q("clinica").shadowRoot.querySelector("#error").textContent).to.contain("clínica");
    });
    it("Cargar consultas guarda el rol y la clinica en la sesion", async () => {
        await elegir("Santa Ana", "Médico");
        expect(Sesion.contexto()).to.include({ idPersonaRol: "pr-ana-med-sa", clinica: "Santa Ana", rol: "Médico" });
    });
    it("el medico ve las consultas de HOY de su clinica: las abiertas que le tocan y las finalizadas (no las de otra clinica)", async () => {
        await elegir("Santa Ana", "Médico");
        expect(ids()).to.deep.equal(["k-hoy", "k-cerrada"]);   // k-manana es de recepcion y k-sm de otra clinica
    });
    it("recepcion ve otras (las que esperan su paso)", async () => {
        await elegir("Santa Ana", "Recepcionista");
        const hoyYmanana = new Set(ids());
        expect(hoyYmanana.has("k-hoy")).to.equal(false);
    });
    it("Futuro y Pasado cambian la lista", async () => {
        await elegir("Santa Ana", "Recepcionista");
        Ayuda.elegir(q("modo"), Agenda.MODOS.indexOf("Futuro"));
        expect(ids()).to.deep.equal(["k-manana"]);
        Ayuda.elegir(q("modo"), Agenda.MODOS.indexOf("Pasado"));
        expect(ids()).to.deep.equal(["k-ayer"]);
    });
    it("Rango muestra los campos de fecha y filtra", async () => {
        await elegir("Santa Ana", "Recepcionista");
        Ayuda.elegir(q("modo"), Agenda.MODOS.indexOf("Rango"));
        expect(q("desde").hidden).to.equal(false);
        q("desde").value = Datos.fechaLocal(1); q("hasta").value = Datos.fechaLocal(1);
        q("hasta").entrada.dispatchEvent(new Event("input"));
        expect(ids()).to.deep.equal(["k-manana"]);
    });
    it("filtra por paciente (nombre sin tildes o documento)", async () => {
        await elegir("Santa Ana", "Recepcionista");
        Ayuda.elegir(q("modo"), Agenda.MODOS.indexOf("Rango"));
        Ayuda.escribir(q("paciente"), "jenni");
        expect(ids()).to.deep.equal(["k-manana"]);
        Ayuda.escribir(q("paciente"), "11111111");
        expect(ids()).to.deep.equal(["k-ayer", "k-cerrada"]);
        Ayuda.escribir(q("paciente"), "perez");
        expect(ids()).to.deep.equal(["k-ayer", "k-cerrada"]);
    });
    it("sin resultados muestra el mensaje vacio", async () => {
        await elegir("Santa Ana", "Médico");
        Ayuda.escribir(q("paciente"), "nadie");
        expect(q("estado").estado).to.equal("vacio");
    });
    it("cada card tiene paciente, y el paso hecho por quien", async () => {
        await elegir("Santa Ana", "Médico");
        const d = tarjetas()[0].datos;
        expect(d.paciente.nombre).to.equal("Luis Pérez");
        expect(d.procedimientos[0].pasos[0]).to.include({ nombre: "Triaje", quien: "Ana Mejía" });
    });
    it("una consulta finalizada se ve en solo lectura: Ver registro si, Atender no", async () => {
        await elegir("Santa Ana", "Médico");
        const t = tarjetas().find(x => x.datos.idConsulta === "k-cerrada");
        expect(t.datos.finalizada).to.equal(true);
        expect(t.shadowRoot.textContent).to.contain("Consulta finalizada");
        expect(t.shadowRoot.querySelector(".atender")).to.equal(null);
    });
    it("Ver registro abre el detalle del paso con sus examenes", async () => {
        await elegir("Santa Ana", "Médico");
        Ayuda.clic(tarjetas()[0], "button.ver");
        expect(q("registro").abierta).to.equal(true);
        expect(q("registro").datos.examenes[0]).to.deep.equal({ nombre: "Hemograma", resultado: "Normal" });
        q("registro").cerrar();
    });
    it("Atender consulta lleva a la consulta", async () => {
        await elegir("Santa Ana", "Médico");
        [...tarjetas()[0].shadowRoot.querySelectorAll("button")].find(b => /Atender/.test(b.textContent)).click();
        expect(irA.calledWith("consulta", "k-hoy")).to.equal(true);
    });
    it("si el backend falla muestra error con Reintentar", async () => {
        api.restaurar();
        const f = sinon.stub(window, "fetch").rejects(new Error("x"));
        await elegir("Santa Ana", "Médico");
        expect(q("estado").estado).to.equal("error");
        f.restore(); api = new ApiFalsa(Datos.bd());
    });
    it("con una sola clinica y un solo rol quedan elegidos", () => {
        Sesion.iniciar({ ...ana(), contextos: [ana().contextos[2]] });
        const z = document.createElement("div"); document.body.append(z);
        new DashboardModel(z).iniciar();
        expect(z.querySelector("#clinica").seleccionado.nombre).to.equal("San Miguel");
        expect(z.querySelector("#rol").seleccionado.rol).to.equal("Médico");
        z.remove();
    });
});
}
