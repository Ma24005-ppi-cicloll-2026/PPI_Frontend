// Pruebas de InicioModel: la bienvenida con una tarjeta por modulo permitido.
{  // bloque: evita que 'expect' choque con el de otros archivos de prueba
const { expect } = chai;

describe("InicioModel", () => {
    let contenedor, irA;
    const MODULOS = [
        { destino: "consulta", titulo: "Consultas", descripcion: "Buscar pacientes" },
        { destino: "historial", titulo: "Mi historial", descripcion: "Sus consultas" }
    ];
    function crear(modulos) {
        contenedor = document.createElement("div");
        document.body.append(contenedor);
        irA = sinon.spy();
        new InicioModel(contenedor, irA, modulos).iniciar();
    }
    afterEach(() => { contenedor.remove(); Sesion.cerrar(); });

    const tarjetas = () => [...contenedor.querySelectorAll("galeno-tarjeta-simple")];

    it("saluda por el nombre de quien inicio sesion", () => {
        Sesion.iniciar({ nombre: "Ana Lopez", rol: "Paciente" });
        crear(MODULOS);
        expect(contenedor.querySelector("h2").textContent).to.equal("Bienvenido, Ana Lopez");
    });
    it("tiene una tarjeta por cada modulo recibido", () => {
        crear(MODULOS);
        expect(tarjetas().map(t => t.datos.titulo)).to.deep.equal(["Consultas", "Mi historial"]);
    });
    it("cada tarjeta tiene descripcion y boton Abrir", () => {
        crear(MODULOS);
        tarjetas().forEach(t => {
            expect(t.datos.descripcion).to.be.a("string").and.not.equal("");
            expect(t.datos.boton).to.equal("Abrir");
        });
    });
    it("al pulsar Abrir llama a irA con el destino de esa tarjeta", () => {
        crear(MODULOS);
        tarjetas()[1].shadowRoot.querySelector("#accion").click();
        expect(irA.calledOnceWithExactly("historial")).to.equal(true);
    });
    it("si el rol no tiene pantallas lo dice y no dibuja tarjetas", () => {
        crear([]);
        expect(tarjetas()).to.have.length(0);
        expect(contenedor.textContent).to.include("todavía no tiene pantallas asignadas");
    });
    it("no interpreta HTML en el nombre", () => {
        Sesion.iniciar({ nombre: "<b>x</b>", rol: "Paciente" });
        crear(MODULOS);
        expect(contenedor.querySelector("h2 b")).to.equal(null);
    });
});
}
