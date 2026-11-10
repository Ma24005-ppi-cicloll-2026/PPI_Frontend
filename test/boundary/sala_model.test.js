// Pruebas de SalaModel: recepcion ve quien espera en su clinica (solo lectura).
{
const { expect } = chai;

const ana = { idPersona: "p1", nombres: "Ana", apellidos: "López" };
const luis = { idPersona: "p2", nombres: "Luis", apellidos: "Mena" };
const pr = (id, persona, clinica = "c1") => ({ idPersonaRol: id, idPersona: persona, idClinica: { idClinica: clinica } });
const hoy = (h, m = 0) => { const d = new Date(); d.setHours(h, m, 0, 0); return d.toISOString(); };
const ayer = () => new Date(Date.now() - 36 * 3600 * 1000).toISOString();

describe("SalaModel (recepcion)", () => {
    let api, contenedor, aviso, modelo;
    const $ = id => contenedor.querySelector("#" + id);
    const tarjetas = zona => [...$(zona).querySelectorAll("galeno-tarjeta-consulta")];
    async function arrancar(rol = "Recepcionista", bd = null) {
        api = new ApiFalsa(bd ?? {
            consulta: [
                { idConsulta: "k2", fechaInicio: hoy(10), fechaFin: null, idPersonaRol: pr("pac-2", luis) },
                { idConsulta: "k1", fechaInicio: hoy(8), fechaFin: null, idPersonaRol: pr("pac-1", ana) },
                { idConsulta: "k3", fechaInicio: hoy(7), fechaFin: hoy(9), idPersonaRol: pr("pac-1", ana) },
                { idConsulta: "k4", fechaInicio: ayer(), fechaFin: ayer(), idPersonaRol: pr("pac-1", ana) },
                { idConsulta: "k5", fechaInicio: hoy(6), fechaFin: null, idPersonaRol: pr("pac-9", luis, "c9") }]
        });
        Sesion.iniciar({ idPersonaRol: "rec-1", nombre: "Laura Pérez", rol, clinica: "Central", idClinica: "c1" });
        modelo = new SalaModel(contenedor);
        await modelo.iniciar();
    }

    beforeEach(() => {
        aviso = document.createElement("galeno-notificacion-emergente"); aviso.id = "aviso";
        contenedor = document.createElement("div");
        document.body.append(aviso, contenedor);
        Sesion.cerrar();
    });
    afterEach(() => { api?.restaurar(); aviso.remove(); contenedor.remove(); Sesion.cerrar(); });

    it("sin sesion no muestra la sala", async () => {
        api = new ApiFalsa({});
        modelo = new SalaModel(contenedor); await modelo.iniciar();
        expect(contenedor.textContent).to.contain("Inicie sesión");
        expect(api.llamadas).to.have.length(0);
    });
    it("un medico no tiene acceso a la sala", async () => {
        api = new ApiFalsa({});
        Sesion.iniciar({ nombre: "Gregory", rol: "Médico", idClinica: "c1" });
        modelo = new SalaModel(contenedor); await modelo.iniciar();
        expect(contenedor.textContent).to.contain("Inicie sesión");
    });
    it("los que esperan salen en orden de llegada, con su turno, y solo de su clinica", async () => {
        await arrancar();
        const t = tarjetas("espera");
        expect(t.map(x => x.consulta.idConsulta)).to.deep.equal(["k1", "k2"]);
        expect(t.map(x => x.getAttribute("turno"))).to.deep.equal(["1", "2"]);
        expect(t[0].shadowRoot.querySelector("h3").textContent).to.equal("Turno 1");
    });
    it("no deja abrir detalles: las tarjetas no traen boton", async () => {
        await arrancar();
        expect(tarjetas("espera")[0].shadowRoot.querySelector("#ver")).to.equal(null);
    });
    it("lista los atendidos de hoy y no los de otro dia", async () => {
        await arrancar();
        expect(tarjetas("atendidos").map(x => x.consulta.idConsulta)).to.deep.equal(["k3"]);
    });
    it("el resumen cuenta a los que esperan y los atendidos", async () => {
        await arrancar();
        expect($("resumen").textContent).to.equal("2 personas esperando · 1 atendida hoy");
    });
    it("sin nadie esperando muestra el estado vacio y el aviso de atendidos", async () => {
        await arrancar("Recepcionista", { consulta: [] });
        expect(tarjetas("espera")).to.have.length(0);
        expect($("sinAtendidos").hidden).to.equal(false);
    });
    it("Actualizar vuelve a pedir las consultas y muestra a quien llego", async () => {
        await arrancar();
        api.bd.consulta.push({ idConsulta: "k6", fechaInicio: hoy(11), fechaFin: null, idPersonaRol: pr("pac-3", ana) });
        $("actualizar").click(); await Ayuda.esperar(20);
        expect(tarjetas("espera").map(x => x.consulta.idConsulta)).to.deep.equal(["k1", "k2", "k6"]);
    });
    it("no escribe nada en el backend (solo lectura)", async () => {
        await arrancar();
        expect(api.llamadas).to.have.length(0);
    });
    it("si el backend falla muestra el error con reintentar", async () => {
        await arrancar();
        api.stub.callsFake(async () => new Response("", { status: 500 }));
        $("actualizar").click(); await Ayuda.esperar(20);
        expect($("estado").estado).to.equal("error");
        expect(tarjetas("espera")).to.have.length(0);
    });
});
}
