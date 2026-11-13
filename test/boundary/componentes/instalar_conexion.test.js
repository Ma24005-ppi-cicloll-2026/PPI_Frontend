// Pruebas de <galeno-instalar> (boton de instalar) y <galeno-conexion> (aviso sin conexion).
{
const { expect } = chai;
const esperar = () => new Promise(r => setTimeout(r, 0));

// Pwa falso con lo minimo que usa el componente
function pwaFalso({ puede = false, manual = false, resultado = "accepted" } = {}) {
    const ventana = new EventTarget();
    return {
        ventana, puedeInstalar: puede, requiereInstruccionManual: manual,
        instalar: sinon.spy(async function () { this.puedeInstalar = resultado !== "accepted" ? this.puedeInstalar : false; return resultado; })
    };
}

describe("<galeno-instalar>", () => {
    let el;
    const boton = () => el.shadowRoot.querySelector("#instalar");
    const visible = () => !el.shadowRoot.querySelector("div").classList.contains("oculto");
    beforeEach(() => { el = document.createElement("galeno-instalar"); document.body.append(el); });
    afterEach(() => {
        el.remove();
        // limpiar el descarte de sesion para no afectar a las demas pruebas
        try { sessionStorage.removeItem("galeno-instalar-descarte"); } catch (e) {}
    });

    it("esta oculto mientras no se pueda instalar", () => {
        el.pwa = pwaFalso();
        expect(visible()).to.equal(false);
    });
    it("aparece cuando el navegador avisa que se puede instalar", () => {
        const pwa = pwaFalso(); el.pwa = pwa;
        pwa.puedeInstalar = true;
        pwa.ventana.dispatchEvent(new CustomEvent("galeno-instalable"));
        expect(visible()).to.equal(true);
        expect(boton().textContent).to.equal("Instalar app");
    });
    it("al pulsarlo instala y, si acepto, el boton desaparece", async () => {
        const pwa = pwaFalso({ puede: true, resultado: "accepted" }); el.pwa = pwa;
        const aviso = sinon.spy(); el.addEventListener("galeno-instalacion", aviso);
        boton().click(); await esperar();
        expect(pwa.instalar.calledOnce).to.equal(true);
        expect(aviso.firstCall.args[0].detail.resultado).to.equal("accepted");
        expect(visible()).to.equal(false);
    });
    it("si el usuario cancela el dialogo, el boton sigue disponible", async () => {
        const pwa = pwaFalso({ puede: true, resultado: "dismissed" }); el.pwa = pwa;
        boton().click(); await esperar();
        expect(visible()).to.equal(true);
    });
    it("desaparece cuando la app queda instalada (galeno-instalada)", () => {
        const pwa = pwaFalso({ puede: true }); el.pwa = pwa;
        pwa.puedeInstalar = false;
        pwa.ventana.dispatchEvent(new CustomEvent("galeno-instalada"));
        expect(visible()).to.equal(false);
    });
    it("en iPhone muestra los pasos manuales en vez del dialogo", async () => {
        const pwa = pwaFalso({ manual: true }); el.pwa = pwa;
        const aviso = sinon.spy(); el.addEventListener("galeno-instalacion", aviso);
        expect(visible()).to.equal(true);
        boton().click();
        expect(el.shadowRoot.querySelector("#ayuda").textContent).to.contain("Agregar a pantalla de inicio");
        expect(pwa.instalar.called).to.equal(false);
        expect(aviso.firstCall.args[0].detail.resultado).to.equal("manual");
    });
    it("el boton tiene nombre accesible", () => {
        el.pwa = pwaFalso({ puede: true });
        expect(boton().getAttribute("aria-label")).to.contain("Instalar");
    });
    it("la tarjeta se descarta con Ahora no y no vuelve a molestar en la sesion", () => {
        const pwa = pwaFalso({ puede: true }); el.pwa = pwa;
        expect(visible()).to.equal(true);
        el.shadowRoot.querySelector("#descartar").click();
        expect(visible()).to.equal(false);
        // aunque el navegador vuelva a avisar, no reaparece en esta sesion
        pwa.ventana.dispatchEvent(new CustomEvent("galeno-instalable"));
        expect(visible()).to.equal(false);
        let marca = null;
        try { marca = sessionStorage.getItem("galeno-instalar-descarte"); } catch (e) {}
        expect(marca).to.equal("1");
    });
});

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
