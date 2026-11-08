// Pruebas de InicioModel: la pantalla de bienvenida con una tarjeta por modulo.
{  // bloque: evita que 'expect' choque con el de otros archivos de prueba
const { expect } = chai;

describe("InicioModel", () => {
    let contenedor, irA;
    beforeEach(() => {
        contenedor = document.createElement("div");
        document.body.append(contenedor);
        irA = sinon.spy();
        new InicioModel(contenedor, irA).iniciar();
    });
    afterEach(() => contenedor.remove());

    const tarjetas = () => [...contenedor.querySelectorAll("galeno-tarjeta-simple")];

    it("muestra el titulo de bienvenida", () => {
        expect(contenedor.querySelector("h2").textContent).to.include("GalenoSV");
    });
    it("tiene las tarjetas de Consultas y Cambio de rol", () => {
        const titulos = tarjetas().map(t => t.datos.titulo);
        expect(titulos).to.include.members(["Consultas", "Cambio de rol"]);
    });
    it("cada tarjeta tiene descripcion y boton Abrir", () => {
        tarjetas().forEach(t => {
            expect(t.datos.descripcion).to.be.a("string").and.not.equal("");
            expect(t.datos.boton).to.equal("Abrir");
        });
    });
    it("al pulsar Abrir llama a irA con el destino de esa tarjeta", () => {
        const consultas = tarjetas().find(t => t.datos.titulo === "Consultas");
        consultas.shadowRoot.querySelector("#accion").click();
        expect(irA.calledOnceWithExactly("consulta")).to.equal(true);
    });
    it("el boton de Cambio de rol lleva a login", () => {
        const login = tarjetas().find(t => t.datos.titulo === "Cambio de rol");
        login.shadowRoot.querySelector("#accion").click();
        expect(irA.calledWith("login")).to.equal(true);
    });
});
}
