{
const { expect } = chai;

// Pruebas de integración: recorren cada historia de usuario con todas las piezas reales y el API simulado.
// Son pocas a propósito; el detalle de cada pieza se prueba en las pruebas unitarias.
describe("Integración: recorridos completos", () => {
    let api, zona, modelos;
    const recepcion = { idPersonaRol: "pr-ana-rec-sa", idRol: "r-rec", rol: "Recepcionista", idClinica: "c-sa", clinica: "Santa Ana" };
    const medico = { idPersonaRol: "pr-ana-med-sa", idRol: "r-med", rol: "Médico", idClinica: "c-sa", clinica: "Santa Ana" };

    beforeEach(() => { modelos = []; new Sesion().cerrar(); api = new ApiFalsa(Datos.bd()); zona = document.createElement("div"); document.body.append(zona); });
    afterEach(() => { modelos.forEach(m => m.destruir()); api.restaurar(); zona.remove(); new Sesion().cerrar(); });

    // Abre el panel con la clínica y el rol indicados y devuelve los IDs visibles.
    const panel = async contexto => {
        zona.replaceChildren();
        new Sesion().iniciar({ idPersona: "p-ana", nombre: "Ana Mejía", contextos: [recepcion, medico] });
        modelos.forEach(x => x.destruir());
        const m = new DashboardModel(zona); modelos.push(m);
        m.iniciar();
        Ayuda.elegir(zona.querySelector("#clinica"), m.selClinica.opciones.findIndex(c => c.idClinica === contexto.idClinica));
        Ayuda.elegir(zona.querySelector("#rol"), m.selRol.opciones.findIndex(r => r.idPersonaRol === contexto.idPersonaRol));
        await m.cargar();
        m.selModo.seleccionar(m.selModo.opciones.find(o => o.nombre === "Rango"));
        return [...zona.querySelectorAll("galeno-tarjeta-agenda")].map(t => t.datos.idConsulta);
    };
    // Abre una consulta con el contexto indicado.
    const consulta = async (id, contexto) => {
        zona.replaceChildren();
        new Sesion().iniciar({ idPersona: "p-ana", nombre: "Ana Mejía", contextos: [recepcion, medico] });
        new Sesion().elegirContexto(contexto);
        modelos.forEach(x => x.destruir());
        const m = new SeguimientoModel(zona, id); modelos.push(m);
        await m.iniciar();
        return m;
    };

    it("HU1: un paciente busca sus citas con su documento y las ve", async () => {
        const m = new CitasModel(zona, { descargar: sinon.stub().resolves() });
        await m.iniciar();
        Ayuda.tipo(zona.querySelector("#tipo"), "DUI");
        Ayuda.escribir(zona.querySelector("#numero"), "11111111-1");
        Ayuda.elegir(zona.querySelector("#clinica"), m.selClinica.opciones.findIndex(c => c.idClinica === "c-sa"));
        zona.querySelector("#formulario").dispatchEvent(new Event("submit", { cancelable: true }));
        await Ayuda.hasta(() => zona.querySelectorAll("galeno-tarjeta-cita").length > 0, { mensaje: "no aparecieron citas" });
    });
    it("HU2: un empleado inicia sesión con su documento", async () => {
        const pantalla = document.createElement("galeno-pantalla-login");
        zona.append(pantalla);
        await pantalla._modelo.datos;
        Ayuda.tipo(pantalla.shadowRoot.querySelector("#tipo"), "DUI");
        Ayuda.escribir(pantalla.shadowRoot.querySelector("#numero"), "01234567-8");
        pantalla.shadowRoot.querySelector("#formulario").dispatchEvent(new Event("submit", { cancelable: true }));
        await Ayuda.hasta(() => new Sesion().obtener() !== null, { mensaje: "no se inició la sesión" });
    });
    it("HU3 y HU4: el médico devuelve el expediente, recepción lo completa y vuelve al médico", async () => {
        expect(await panel(medico)).to.include("k-hoy");
        expect(await panel(recepcion)).to.not.include("k-hoy");

        const m = await consulta("k-hoy", medico);
        m.abrirDevolucion(true);
        m.motivo.value = "Falta la presión";
        await m.devolverPaso();
        expect(await panel(medico)).to.not.include("k-hoy");
        expect(await panel(recepcion)).to.include("k-hoy");

        const r = await consulta("k-hoy", recepcion);
        expect(r.editable()).to.equal(true);
        await r.guardarYAvanzar();
        expect(await panel(recepcion)).to.not.include("k-hoy");
        expect(await panel(medico)).to.include("k-hoy");
    });
    it("HU4: al finalizar, la consulta sale del panel", async () => {
        const m = await consulta("k-hoy", medico);
        await m.finalizarConsulta();
        expect(await panel(medico)).to.not.include("k-hoy");
    });
});
}
