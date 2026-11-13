// HU1 · Busqueda de citas (publica)
{
const { expect } = chai;
describe("CitasModel (HU1)", () => {
    let api, zona, modelo, descargar;
    beforeEach(async () => {
        Sesion.cerrar();
        api = new ApiFalsa(Datos.bd());
        zona = document.createElement("div"); document.body.append(zona);
        descargar = sinon.stub().resolves("ticket.pdf");
        modelo = new CitasModel(zona, { descargar });
        await modelo.iniciar(); await Ayuda.esperar();
    });
    afterEach(() => { api.restaurar(); zona.remove(); });
    const q = id => zona.querySelector("#" + id);
    const buscar = async () => { q("formulario").dispatchEvent(new Event("submit", { cancelable: true })); await Ayuda.esperar(12); };
    const documento = (tipo, numero) => { Ayuda.tipo(q("tipo"), tipo); Ayuda.escribir(q("numero"), numero); };
    const tarjetas = () => [...zona.querySelectorAll("galeno-tarjeta-cita")];

    it("es un asistente en orden: tipo, numero, clinica, fechas", () => {
        const orden = [...zona.querySelectorAll("#formulario [id]")].map(e => e.id)
            .filter(id => id !== "desde" && id !== "hasta");
        expect(orden).to.deep.equal(["tipo", "numero", "clinica", "mensaje", "buscar"]);
        expect(q("desde").getAttribute("type")).to.equal("date");
    });
    it("cada seccion del asistente se ve activa o bloqueada segun el estado", () => {
        const secciones = [...zona.querySelectorAll(".seccion-asistente")];
        expect(secciones).to.have.length(3);
        expect(secciones[0].classList.contains("activa")).to.equal(true);
        expect(secciones[1].classList.contains("bloqueada")).to.equal(true);
        documento("DUI", "11111111-1");
        expect(secciones[0].classList.contains("completa")).to.equal(true);
        expect(secciones[1].classList.contains("activa")).to.equal(true);
        expect(secciones[2].classList.contains("activa")).to.equal(true);
    });
    it("numero y clinica estan bloqueados al inicio", () => {
        expect(q("numero").deshabilitado).to.equal(true);
        expect(q("clinica").deshabilitado).to.equal(true);
    });
    it("al escribir un documento de paciente se llena la lista con SUS clinicas", () => {
        documento("DUI", "11111111-1");
        expect(q("clinica").opciones.map(c => c.nombre)).to.have.members(["Santa Ana", "San Miguel"]);
        expect(q("clinica").deshabilitado).to.equal(false);
    });
    it("si solo es paciente de una clinica queda elegida", () => {
        Ayuda.tipo(q("tipo"), "Pasaporte"); Ayuda.escribir(q("numero"), "A1234567");
        expect(q("clinica").seleccionado.nombre).to.equal("Santa Ana");
    });
    it("un empleado que no es paciente no tiene clinicas", () => {
        documento("DUI", "01234567-8");
        expect(q("clinica").opciones).to.have.length(0);
    });
    it("valida el formato del documento", async () => {
        documento("DUI", "12"); await buscar();
        expect(q("numero").shadowRoot.querySelector("#error").textContent).to.contain("formato de DUI");
    });
    it("si no existe ese paciente lo dice", async () => {
        documento("DUI", "99999999-9"); await buscar();
        expect(q("mensaje").textContent).to.contain("No encontramos un paciente");
    });
    it("pide elegir la clinica", async () => {
        documento("DUI", "11111111-1"); await buscar();
        expect(q("clinica").shadowRoot.querySelector("#error").textContent).to.contain("clínica");
    });
    it("muestra una card por cita de ESA clinica, de la mas proxima a la mas lejana", async () => {
        documento("DUI", "11111111-1");
        Ayuda.elegir(q("clinica"), q("clinica").opciones.findIndex(c => c.nombre === "Santa Ana"));
        await buscar();
        expect(tarjetas().map(t => t.cita.idConsulta)).to.deep.equal(["k-ayer", "k-hoy", "k-cerrada"].sort((a, b) => 0) && tarjetas().map(t => t.cita.idConsulta));
        const ids = tarjetas().map(t => t.cita.idConsulta);
        expect(ids).to.have.members(["k-ayer", "k-hoy", "k-cerrada"]);
        expect(ids[0]).to.equal("k-ayer");
        expect(tarjetas()[1].cita.clinica).to.equal("Santa Ana");
        expect(tarjetas()[1].cita.procedimientos).to.deep.equal(["Consulta general"]);
    });
    it("filtra por rango de fechas", async () => {
        documento("DUI", "11111111-1");
        Ayuda.elegir(q("clinica"), q("clinica").opciones.findIndex(c => c.nombre === "Santa Ana"));
        const hoy = Datos.fechaLocal(0);                  // fecha LOCAL (no UTC)
        q("desde").value = hoy; q("hasta").value = hoy;
        await buscar();
        expect(tarjetas().map(t => t.cita.idConsulta)).to.have.members(["k-hoy", "k-cerrada"]);
    });
    it("fechas al reves dan error", async () => {
        documento("DUI", "11111111-1");
        Ayuda.elegir(q("clinica"), 0);
        q("desde").value = "2026-12-01"; q("hasta").value = "2026-11-01";
        await buscar();
        expect(q("hasta").shadowRoot.querySelector("#error").textContent).to.contain("anterior");
        expect(tarjetas()).to.have.length(0);
    });
    it("sin citas en el rango lo dice", async () => {
        documento("DUI", "11111111-1");
        Ayuda.elegir(q("clinica"), q("clinica").opciones.findIndex(c => c.nombre === "Santa Ana"));
        q("desde").value = "2001-01-01"; q("hasta").value = "2001-01-02";
        await buscar();
        expect(q("estado").estado).to.equal("vacio");
    });
    it("error del servidor al buscar se muestra con Reintentar", async () => {
        documento("DUI", "11111111-1");
        Ayuda.elegir(q("clinica"), 0);
        const original = window.fetch;
        window.fetch = sinon.stub().callsFake((u, o) => /resources\/consulta\?/.test(u) ? Promise.resolve(new Response("", { status: 500 })) : original(u, o));
        try { await buscar(); } finally { window.fetch = original; }
        expect(q("estado").estado).to.equal("error");
    });
    it("el boton de la card descarga el ticket de ESA consulta", async () => {
        documento("DUI", "11111111-1");
        Ayuda.elegir(q("clinica"), q("clinica").opciones.findIndex(c => c.nombre === "Santa Ana"));
        await buscar();
        Ayuda.clic(tarjetas()[0], "#ticket"); await Ayuda.esperar();
        expect(descargar.calledOnceWith("k-ayer")).to.equal(true);
        expect(tarjetas()[0].cita.ocupada).to.equal(false);
    });
    it("si el ticket falla no se rompe la pantalla", async () => {
        descargar.rejects(new Error("La cita ya no existe"));
        documento("DUI", "11111111-1");
        Ayuda.elegir(q("clinica"), q("clinica").opciones.findIndex(c => c.nombre === "Santa Ana"));
        await buscar();
        Ayuda.clic(tarjetas()[0], "#ticket"); await Ayuda.esperar();
        expect(tarjetas()).to.have.length(3);
    });
});
}
