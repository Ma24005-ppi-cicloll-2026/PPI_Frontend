// Pruebas de <galeno-boton-instalar> (pildora de la cabecera).
{
const { expect } = chai;
const esperar = () => new Promise(r => setTimeout(r, 0));

// Pwa falso con estado (el componente solo lee pwa.estado y llama pwa.instalar())
function pwaFalso({ estado = "instalable", resultado = "accepted" } = {}) {
    const ventana = new EventTarget();
    return {
        ventana, estado,
        instalar: sinon.spy(async function () {
            if (resultado === "accepted") this.estado = "instalada";
            return resultado;
        })
    };
}

describe("<galeno-boton-instalar>", () => {
    let el;
    const boton = () => el.shadowRoot.querySelector("button");
    const visible = () => !boton().hidden;
    beforeEach(() => { el = document.createElement("galeno-boton-instalar"); document.body.append(el); });
    afterEach(() => el.remove());

    it("esta oculto sin servicio asignado (nada que instalar)", () => {
        expect(visible()).to.equal(false);
    });
    it("esta oculto en estado no_soportado (Firefox de escritorio)", () => {
        el.pwa = pwaFalso({ estado: "no_soportado" });
        expect(visible()).to.equal(false);
    });
    it("esta oculto en estado instalada", () => {
        el.pwa = pwaFalso({ estado: "instalada" });
        expect(visible()).to.equal(false);
    });
    it("aparece en estado instalable con el texto 'Instalar app'", () => {
        el.pwa = pwaFalso({ estado: "instalable" });
        expect(visible()).to.equal(true);
        expect(boton().textContent.trim()).to.equal("Instalar app");
    });
    it("aparece tambien en estado ios_manual", () => {
        el.pwa = pwaFalso({ estado: "ios_manual" });
        expect(visible()).to.equal(true);
    });
    it("aparece cuando llega galeno-instalable y desaparece con galeno-instalada", () => {
        const pwa = pwaFalso({ estado: "no_soportado" }); el.pwa = pwa;
        expect(visible()).to.equal(false);
        pwa.estado = "instalable";
        pwa.ventana.dispatchEvent(new CustomEvent("galeno-instalable"));
        expect(visible()).to.equal(true);
        pwa.estado = "instalada";
        pwa.ventana.dispatchEvent(new CustomEvent("galeno-instalada"));
        expect(visible()).to.equal(false);
    });
    it("el boton tiene nombre accesible 'Instalar app' (aria-label y title)", () => {
        el.pwa = pwaFalso({ estado: "instalable" });
        expect(boton().getAttribute("aria-label")).to.equal("Instalar app");
        expect(boton().getAttribute("title")).to.equal("Instalar app");
    });
    it("en instalable, al pulsarlo llama instalar() y avisa el resultado accepted", async () => {
        const pwa = pwaFalso({ estado: "instalable", resultado: "accepted" }); el.pwa = pwa;
        const avisoFalso = { mostrar: sinon.spy() }; el.aviso = avisoFalso;
        const oyente = sinon.spy(); el.addEventListener("galeno-instalacion", oyente);
        boton().click(); await esperar();
        expect(pwa.instalar.calledOnce).to.equal(true);
        expect(oyente.firstCall.args[0].detail.resultado).to.equal("accepted");
        // al aceptar: toast de exito y el boton se esconde
        expect(avisoFalso.mostrar.calledWith("¡GalenoSV instalada!", "exito")).to.equal(true);
        expect(visible()).to.equal(false);
    });
    it("si el usuario cancela el dialogo (dismissed), no hay toast", async () => {
        const pwa = pwaFalso({ estado: "instalable", resultado: "dismissed" }); el.pwa = pwa;
        const avisoFalso = { mostrar: sinon.spy() }; el.aviso = avisoFalso;
        boton().click(); await esperar();
        expect(pwa.instalar.calledOnce).to.equal(true);
        expect(avisoFalso.mostrar.called).to.equal(false);
        expect(visible(), "sigue disponible por si cambia de idea").to.equal(true);
    });
    it("en ios_manual no llama instalar(): avisa con galeno-abrir-guia para abrir la guia", () => {
        const pwa = pwaFalso({ estado: "ios_manual" }); el.pwa = pwa;
        const oyente = sinon.spy(); pwa.ventana.addEventListener("galeno-abrir-guia", oyente);
        const aviso = sinon.spy(); el.addEventListener("galeno-instalacion", aviso);
        boton().click();
        expect(pwa.instalar.called).to.equal(false);
        expect(oyente.calledOnce).to.equal(true);
        expect(aviso.firstCall.args[0].detail.resultado).to.equal("manual");
    });
    it("sin toast asignado, aceptar no rompe", async () => {
        const pwa = pwaFalso({ estado: "instalable", resultado: "accepted" }); el.pwa = pwa;
        boton().click(); await esperar();
        expect(pwa.instalar.calledOnce).to.equal(true);
    });
    it("si el dialogo del navegador aun no esta disponible, explica el camino en un aviso", async () => {
        const pwa = pwaFalso({ estado: "instalable", resultado: "no-disponible" }); el.pwa = pwa;
        const avisoFalso = { mostrar: sinon.spy() }; el.aviso = avisoFalso;
        boton().click(); await esperar();
        expect(avisoFalso.mostrar.firstCall.args[1]).to.equal("info");
        expect(visible(), "el boton sigue disponible para intentarlo de nuevo").to.equal(true);
    });
    it("al quitarlo de la pagina deja de escuchar al servicio", () => {
        const pwa = pwaFalso({ estado: "no_soportado" }); el.pwa = pwa;
        el.remove();
        pwa.ventana.dispatchEvent(new CustomEvent("galeno-instalable"));
        expect(boton().hidden).to.equal(true);
    });
});
}
