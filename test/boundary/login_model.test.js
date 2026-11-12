// HU2 · Login: tipo de documento + numero, nada mas.
{
const { expect } = chai;
describe("LoginModel (HU2)", () => {
    let api, zona, modelo, irA;
    beforeEach(async () => {
        Sesion.cerrar();
        api = new ApiFalsa(Datos.bd());
        zona = document.createElement("div"); document.body.append(zona);
        irA = sinon.spy();
        modelo = new LoginModel(zona, { irA });
        await modelo.iniciar(); await Ayuda.esperar();
    });
    afterEach(() => { api.restaurar(); zona.remove(); Sesion.cerrar(); });
    const q = id => zona.querySelector("#" + id);
    const enviar = async () => { q("formulario").dispatchEvent(new Event("submit", { cancelable: true })); await Ayuda.esperar(); };
    const llenar = async (tipo, numero) => { Ayuda.tipo(q("tipo"), tipo); Ayuda.escribir(q("numero"), numero); };

    it("pide solo tipo de documento y numero (no hay usuario ni clave)", () => {
        expect(zona.querySelectorAll("galeno-campo")).to.have.length(1);
        expect(zona.querySelector("galeno-buscador-tipo-documentos")).to.not.equal(null);
        expect(zona.querySelector("input[type=password]")).to.equal(null);
    });
    it("el numero esta bloqueado hasta elegir el tipo", () => {
        expect(q("numero").deshabilitado).to.equal(true);
        Ayuda.tipo(q("tipo"), "DUI");
        expect(q("numero").deshabilitado).to.equal(false);
        expect(q("numero").entrada.placeholder).to.equal("00000000-0");
    });
    it("sin tipo pide elegirlo", async () => {
        await enviar();
        expect(q("mensaje").textContent).to.contain("tipo de documento");
    });
    it("sin numero lo pide", async () => {
        Ayuda.tipo(q("tipo"), "DUI"); await enviar();
        expect(q("numero").shadowRoot.querySelector("#error").textContent).to.contain("número");
    });
    it("el formato lo dicta la expresion regular del tipo", async () => {
        await llenar("DUI", "1234"); await enviar();
        expect(q("numero").shadowRoot.querySelector("#error").textContent).to.equal("No tiene el formato de DUI: 00000000-0");
        expect(Sesion.obtener()).to.equal(null);
    });
    it("acepta un pasaporte si cumple su expresion regular", async () => {
        Ayuda.tipo(q("tipo"), "Pasaporte"); Ayuda.escribir(q("numero"), "A1234567"); await enviar();
        // Jenni solo es paciente: no inicia sesion
        expect(Sesion.obtener()).to.equal(null);
        expect(q("mensaje").textContent).to.contain("No encontramos un empleado");
    });
    it("un paciente no inicia sesion", async () => {
        await llenar("DUI", "11111111-1"); await enviar();
        expect(Sesion.obtener()).to.equal(null);
        expect(q("mensaje").textContent).to.contain("No encontramos un empleado");
    });
    it("un documento que no existe tampoco (mismo mensaje)", async () => {
        await llenar("DUI", "99999999-9"); await enviar();
        expect(q("mensaje").textContent).to.contain("No encontramos un empleado");
        expect(q("numero").value).to.equal("");
    });
    it("un empleado inicia sesion con TODOS sus roles-clinicas", async () => {
        await llenar("DUI", "01234567-8"); await enviar();
        const s = Sesion.obtener();
        expect(s.nombre).to.equal("Ana Mejía");
        expect(s.contextos.map(c => `${c.rol}@${c.clinica}`)).to.have.members(["Médico@Santa Ana", "Recepcionista@Santa Ana", "Médico@San Miguel"]);
    });
    it("no importa si escribe el numero sin guion... si cumple el formato", async () => {
        await llenar("DUI", "012345678"); await enviar();
        expect(q("numero").shadowRoot.querySelector("#error").textContent).to.contain("formato");
    });
    it("si el backend no responde avisa y no entra", async () => {
        api.restaurar();
        const f = sinon.stub(window, "fetch").rejects(new Error("sin red"));
        modelo = new LoginModel(zona, { irA }); await modelo.iniciar(); await Ayuda.esperar();
        expect(zona.querySelector("#mensaje").textContent).to.contain("No se pudo conectar");
        f.restore(); api = new ApiFalsa(Datos.bd());
    });
    it("tiene un enlace a Buscar citas", () => {
        q("citas").click();
        expect(irA.calledWith("citas")).to.equal(true);
    });
});
}
