// Pruebas de <galeno-tema>: interruptor de tema claro/oscuro/automatico, persistido en
// localStorage (clave "galeno-tema") y aplicado con data-tema en <html>.
{
const { expect } = chai;
const CLAVE = "galeno-tema";
const quitarClave = () => { try { localStorage.removeItem(CLAVE); } catch (e) {} };

describe("<galeno-tema>", () => {
    let tema;
    beforeEach(() => {
        quitarClave();
        document.documentElement.removeAttribute("data-tema");
        tema = document.createElement("galeno-tema");
        document.body.append(tema);
    });
    afterEach(() => {
        tema.remove();
        quitarClave();
        document.documentElement.removeAttribute("data-tema");
    });

    const boton = () => tema.shadowRoot.querySelector("button");

    it("por defecto queda automatico: sin data-tema en <html> y sin marcarse oscuro", () => {
        const mm = sinon.stub(window, "matchMedia").returns({
            matches: false, addEventListener() {}, removeEventListener() {}
        });   // determinista: aunque el navegador del probador este en oscuro
        const otro = document.createElement("galeno-tema");
        document.body.append(otro);
        expect(otro.valor).to.equal("auto");
        expect(document.documentElement.hasAttribute("data-tema")).to.equal(false);
        expect(otro.shadowRoot.querySelector("button").getAttribute("role")).to.equal("switch");
        expect(otro.shadowRoot.querySelector("button").getAttribute("aria-checked")).to.equal("false");
        otro.remove();
        mm.restore();
    });

    it("elegir oscuro lo aplica, marca el switch y lo guarda", () => {
        tema.elegir("oscuro");
        expect(document.documentElement.dataset.tema).to.equal("oscuro");
        expect(boton().getAttribute("aria-checked")).to.equal("true");
        expect(tema.oscuro).to.equal(true);
        let guardado = null;
        try { guardado = localStorage.getItem(CLAVE); } catch (e) {}
        expect(guardado).to.equal("oscuro");
    });

    it("elegir claro lo aplica y desmarca el switch", () => {
        tema.elegir("oscuro");
        tema.elegir("claro");
        expect(document.documentElement.dataset.tema).to.equal("claro");
        expect(boton().getAttribute("aria-checked")).to.equal("false");
        expect(tema.oscuro).to.equal(false);
    });

    it("volver a automatico quita data-tema (el CSS decide segun el sistema)", () => {
        tema.elegir("oscuro");
        expect(document.documentElement.hasAttribute("data-tema")).to.equal(true);
        tema.elegir("auto");
        expect(document.documentElement.hasAttribute("data-tema")).to.equal(false);
        expect(tema.valor).to.equal("auto");
    });

    it("con storage roto sigue funcionando en automatico (lectura tolerante)", () => {
        const stub = sinon.stub(localStorage, "getItem").throws(new Error("bloqueado"));
        const otro = document.createElement("galeno-tema");
        document.body.append(otro);
        expect(otro.valor).to.equal("auto");
        otro.remove();
        stub.restore();
        expect(document.documentElement.hasAttribute("data-tema")).to.equal(false);
    });

    it("en automatico con el sistema en oscuro, se ve oscuro sin fijar data-tema", () => {
        const mm = sinon.stub(window, "matchMedia").returns({
            matches: true, addEventListener() {}, removeEventListener() {}
        });
        const otro = document.createElement("galeno-tema");
        document.body.append(otro);
        expect(otro.oscuro).to.equal(true);
        expect(otro.shadowRoot.querySelector("button").getAttribute("aria-checked")).to.equal("true");
        expect(document.documentElement.hasAttribute("data-tema")).to.equal(false);   // lo decide el CSS
        otro.remove();
        mm.restore();
    });

    it("avisa con galeno-tema y el valor elegido", () => {
        let visto = null;
        tema.addEventListener("galeno-tema", e => { visto = e.detail.valor; });
        tema.elegir("claro");
        expect(visto).to.equal("claro");
    });

    it("el clic cicla automatico -> claro -> oscuro -> automatico", () => {
        boton().click();
        expect(tema.valor).to.equal("claro");
        boton().click();
        expect(tema.valor).to.equal("oscuro");
        expect(document.documentElement.dataset.tema).to.equal("oscuro");
        boton().click();
        expect(tema.valor).to.equal("auto");
        expect(document.documentElement.hasAttribute("data-tema")).to.equal(false);
    });
});
}
