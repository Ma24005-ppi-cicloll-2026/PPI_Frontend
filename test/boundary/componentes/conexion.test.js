// Pruebas de <galeno-conexion> (aviso sin conexion).
// (Las de <galeno-instalar> se retiraron con ese componente: su flujo vive hoy en
//  boton_instalar.test.js, invitacion_instalar.test.js y guia_instalacion.test.js.)
{
const { expect } = chai;

describe("<galeno-conexion>", () => {
    let el, reloj;
    const aviso = () => el.shadowRoot.querySelector("[role=status]");
    beforeEach(() => { reloj = sinon.useFakeTimers(); el = document.createElement("galeno-conexion"); document.body.append(el); });
    afterEach(() => { el.remove(); reloj.restore(); });

    it("con conexion no muestra nada", () => {
        expect(el.estado).to.equal("oculto");
        expect(aviso().textContent).to.equal("");
    });
    it("al perder la conexion avisa que muestra datos guardados", () => {
        window.dispatchEvent(new Event("offline"));
        expect(el.estado).to.equal("sin-conexion");
        expect(aviso().textContent).to.contain("Sin conexión");
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
