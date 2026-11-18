{
const { expect } = chai;
describe("LoginModel (HU2)", () => {
    let api, pantalla, zona, modelo, irA;
    // Prepara el entorno de las pruebas.
    beforeEach(async () => {
        Sesion.cerrar();
        api = new ApiFalsa(Datos.bd());
        irA = sinon.spy();
        pantalla = document.createElement("galeno-pantalla-login");
        pantalla.irA = irA;
        document.body.append(pantalla);
        zona = pantalla.shadowRoot;
        modelo = pantalla._modelo;
        await modelo.datos;
    });
    // Limpia el entorno al terminar las pruebas.
    afterEach(() => { api.restaurar(); pantalla.remove(); Sesion.cerrar(); });
    // Busca un elemento de la pantalla de prueba por su ID.
    const q = id => zona.querySelector("#" + id);
    // Envía el formulario y espera su resultado.
    const enviar = async () => { q("formulario").dispatchEvent(new Event("submit", { cancelable: true })); await Ayuda.esperar(); };
    // Rellena el tipo y el número de documento.
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
    it("anuncia los errores y contiene el panel de marca", async () => {
        expect(zona.querySelector("galeno-marca-acceso")).to.not.equal(null);
        expect(q("mensaje").getAttribute("role")).to.equal("alert");
        await enviar();
        expect(q("mensaje").textContent).to.contain("tipo de documento");
        expect(q("reintentar").hidden).to.equal(true);
    });
    it("permite reintentar la carga tras un fallo y recuperar el acceso", async () => {
        api.stub.onCall(api.stub.callCount).rejects(new Error("sin red"));
        await modelo.cargarDatos();
        const reintentar = q("reintentar");
        expect(q("mensaje").textContent).to.contain("No se pudo conectar");
        expect(Sesion.obtener()).to.equal(null);
        expect(reintentar.hidden).to.equal(false);
        reintentar.click();
        expect(reintentar.disabled).to.equal(true);
        expect(await modelo.datos).to.equal(true);
        expect(reintentar.hidden).to.equal(true);
        expect(q("mensaje").textContent).to.equal("");
        expect(q("tipo").opciones.map(tipo => tipo.nombre)).to.include("DUI");
        await llenar("DUI", "01234567-8"); await enviar();
        expect(Sesion.obtener().nombre).to.equal("Ana Mejía");
    });
    it("Enter en el número envía el formulario a través de su evento submit", async () => {
        await llenar("DUI", "01234567-8");
        q("numero").entrada.dispatchEvent(new KeyboardEvent("keydown", {
            key: "Enter", bubbles: true, composed: true, cancelable: true
        }));
        await Ayuda.esperar();
        expect(Sesion.obtener().nombre).to.equal("Ana Mejía");
    });
    it("tiene un enlace a Buscar citas", () => {
        q("citas").click();
        expect(irA.calledWith("citas")).to.equal(true);
    });
});
}
