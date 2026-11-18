{
const { expect } = chai;
const CLAVE = "galeno-tema";
// Elimina la preferencia de tema guardada para la prueba.
const quitarClave = () => { try { localStorage.removeItem(CLAVE); } catch (e) {} };

describe("<galeno-tema>", () => {
    let tema;
    // Prepara el entorno de las pruebas.
    beforeEach(() => {
        quitarClave();
        document.documentElement.removeAttribute("data-tema");
        tema = document.createElement("galeno-tema");
        document.body.append(tema);
    });
    // Limpia el entorno al terminar las pruebas.
    afterEach(() => {
        tema.remove();
        quitarClave();
        document.documentElement.removeAttribute("data-tema");
    });

    // Busca el botón que se usa en la prueba.
    const boton = () => tema.shadowRoot.querySelector("button");

    it("por defecto queda automatico: sin data-tema en <html> y sin marcarse oscuro", () => {
        const mm = sinon.stub(window, "matchMedia").returns({
            matches: false,
                // Simula la suscripción a un evento del navegador.
                addEventListener() {},
                // Simula la retirada de una suscripción del navegador.
                removeEventListener() {}
        });
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
            matches: true,
                // Simula la suscripción a un evento del navegador.
                addEventListener() {},
                // Simula la retirada de una suscripción del navegador.
                removeEventListener() {}
        });
        const otro = document.createElement("galeno-tema");
        document.body.append(otro);
        expect(otro.oscuro).to.equal(true);
        expect(otro.shadowRoot.querySelector("button").getAttribute("aria-checked")).to.equal("true");
        expect(document.documentElement.hasAttribute("data-tema")).to.equal(false);
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

    it("en automatico sigue al sistema: si cambia prefers-color-scheme se repinta", () => {
        let oyentes = [];
        const mm = sinon.stub(window, "matchMedia").returns({
            matches: false,
            // Simula la suscripción a un evento del navegador.
            addEventListener: (tipo, f) => oyentes.push(f),
            // Simula la retirada de una suscripción del navegador.
            removeEventListener: (tipo, f) => { oyentes = oyentes.filter(o => o !== f); }
        });
        const otro = document.createElement("galeno-tema");
        document.body.append(otro);
        try {
            expect(otro.valor).to.equal("auto");
            expect(otro.shadowRoot.querySelector("button").getAttribute("aria-checked")).to.equal("false");
            mm.returns({ matches: true,
                // Simula la suscripción a un evento del navegador.
                addEventListener() {},
                // Simula la retirada de una suscripción del navegador.
                removeEventListener() {} });
            oyentes.forEach(f => f());
            expect(otro.shadowRoot.querySelector("button").getAttribute("aria-checked")).to.equal("true");
            expect(document.documentElement.hasAttribute("data-tema")).to.equal(false);
            otro.elegir("claro");
            oyentes.forEach(f => f());
            expect(otro.shadowRoot.querySelector("button").getAttribute("aria-checked")).to.equal("false");
        } finally {
            otro.remove();
            mm.restore();
        }
    });

    it("actualiza la meta theme-color segun el tema que se ve", () => {
        const meta = document.createElement("meta");
        meta.name = "theme-color";
        document.head.append(meta);
        const mm = sinon.stub(window, "matchMedia").returns({
            matches: false,
                // Simula la suscripción a un evento del navegador.
                addEventListener() {},
                // Simula la retirada de una suscripción del navegador.
                removeEventListener() {}
        });
        try {
            tema.elegir("oscuro");
            expect(meta.content).to.equal("#0F1E26");
            tema.elegir("claro");
            expect(meta.content).to.equal("#F1F8FB");
            tema.elegir("auto");
            expect(meta.content).to.equal("#F1F8FB");
        } finally {
            meta.remove();
            mm.restore();
        }
    });
});
}
