{
const { expect } = chai;

describe("<galeno-conexion>", () => {
    let el, reloj;
    // Busca el aviso de conexión dentro del componente.
    const aviso = () => el.shadowRoot.querySelector("[role=status]");
    // Prepara el entorno de las pruebas.
    beforeEach(() => { reloj = sinon.useFakeTimers(); el = document.createElement("galeno-conexion"); document.body.append(el); });
    // Limpia el entorno al terminar las pruebas.
    afterEach(() => { el.remove(); reloj.restore(); });

    it("con conexion no muestra nada", () => {
        expect(el.estado).to.equal("oculto");
        expect(aviso().textContent).to.equal("");
    });
    it("al perder la conexion avisa que muestra datos guardados", () => {
        window.dispatchEvent(new Event("offline"));
        expect(el.estado).to.equal("sin-conexion");
        expect(aviso().textContent).to.contain("No se puede acceder al servidor");
        expect(aviso().getAttribute("aria-live")).to.equal("polite");
    });
    it("al volver dice 'Conexión restablecida' y se esconde solo a los 3 segundos", () => {
        window.dispatchEvent(new Event("offline"));
        window.dispatchEvent(new Event("online"));
        expect(aviso().textContent).to.equal("Conexión restablecida");
        reloj.tick(3000);
        expect(el.estado).to.equal("oculto");
        expect(aviso().textContent).to.equal("");
    });
    it("al quitarlo de la pagina deja de escuchar", () => {
        el.remove();
        window.dispatchEvent(new Event("offline"));
        expect(el.estado).to.equal("oculto");
    });
});
}
