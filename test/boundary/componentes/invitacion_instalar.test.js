// Pruebas de <galeno-invitacion-instalar> (invitacion tras la descarga exitosa del ticket).
{
const { expect } = chai;
const esperar = () => new Promise(r => setTimeout(r, 0));

// Pwa falso CON la logica de invitacion (como el servicio real, para probar las reglas)
function pwaFalso({ estado = "instalable", resultado = "accepted", aplazado = false } = {}) {
    const ventana = new EventTarget();
    return {
        ventana, estado, mostrada: false, aplazadoFlag: aplazado, aplazos: 0,
        puedeInvitar() {
            const bueno = this.estado === "instalable" || this.estado === "ios_manual";
            return bueno && !this.aplazadoFlag && !this.mostrada;
        },
        marcarInvitacionMostrada() { this.mostrada = true; },
        aplazar() { this.aplazos++; },
        instalar: sinon.spy(async function () {
            if (resultado === "accepted") this.estado = "instalada";
            return resultado;
        })
    };
}

describe("<galeno-invitacion-instalar>", () => {
    let el;
    const tarjeta = () => el.shadowRoot.querySelector(".tarjeta");
    const visible = () => !tarjeta().hidden;
    const primario = () => tarjeta().querySelector(".primario");
    beforeEach(() => { el = document.createElement("galeno-invitacion-instalar"); document.body.append(el); });
    afterEach(() => el.remove());

    it("empieza escondida", () => {
        el.pwa = pwaFalso();
        expect(visible()).to.equal(false);
    });
    it("no sale si la app ya esta instalada", () => {
        const pwa = pwaFalso({ estado: "instalada" }); el.pwa = pwa;
        expect(el.invitar()).to.equal(false);
        expect(visible()).to.equal(false);
    });
    it("no sale si no hay forma de instalar (no_soportado)", () => {
        const pwa = pwaFalso({ estado: "no_soportado" }); el.pwa = pwa;
        expect(el.invitar()).to.equal(false);
        expect(visible()).to.equal(false);
    });
    it("sale en estado instalable al avisar 'galeno-ticket-descargado' (la descarga del ticket fue EXITOSA)", () => {
        const pwa = pwaFalso(); el.pwa = pwa;
        pwa.ventana.dispatchEvent(new CustomEvent("galeno-ticket-descargado"));
        expect(visible()).to.equal(true);
        expect(tarjeta().getAttribute("role")).to.equal("status");
        expect(tarjeta().getAttribute("aria-live")).to.equal("polite");
        expect(tarjeta().textContent).to.contain("¡Tu ticket está listo!");
        expect(tarjeta().textContent).to.contain("acceso directo");
        expect(primario().textContent.trim()).to.equal("Instalar");
        expect(tarjeta().querySelector(".ahora-no").textContent.trim()).to.equal("Ahora no");
    });
    it("marca la sesion: una sola vez aunque la descarga se repita", () => {
        const pwa = pwaFalso(); el.pwa = pwa;
        pwa.ventana.dispatchEvent(new CustomEvent("galeno-ticket-descargado"));
        expect(visible()).to.equal(true);
        pwa.ventana.dispatchEvent(new CustomEvent("galeno-ticket-descargado"));
        expect(pwa.mostrada, "el servicio ya la marco").to.equal(true);
        expect(visible(), "sigue visible la primera, no aparece otra").to.equal(true);
        // cerrada y nueva descarga: no vuelve (marca de sesion)
        tarjeta().querySelector(".ahora-no").click();
        pwa.ventana.dispatchEvent(new CustomEvent("galeno-ticket-descargado"));
        expect(visible()).to.equal(false);
    });
    it("no sale si el usuario ya la aplazo (7 dias)", () => {
        const pwa = pwaFalso({ aplazado: true }); el.pwa = pwa;
        pwa.ventana.dispatchEvent(new CustomEvent("galeno-ticket-descargado"));
        expect(visible()).to.equal(false);
    });
    it("'Ahora no' aplaza (pwa.aplazar) y se esconde", () => {
        const pwa = pwaFalso(); el.pwa = pwa;
        pwa.ventana.dispatchEvent(new CustomEvent("galeno-ticket-descargado"));
        const aviso = sinon.spy(); el.addEventListener("galeno-instalacion", aviso);
        tarjeta().querySelector(".ahora-no").click();
        expect(pwa.aplazos).to.equal(1);
        expect(visible()).to.equal(false);
        expect(aviso.firstCall.args[0].detail.resultado).to.equal("dismissed");
    });
    it("se cierra con la X igual que con 'Ahora no'", () => {
        const pwa = pwaFalso(); el.pwa = pwa;
        pwa.ventana.dispatchEvent(new CustomEvent("galeno-ticket-descargado"));
        tarjeta().querySelector(".cerrar").click();
        expect(pwa.aplazos).to.equal(1);
        expect(visible()).to.equal(false);
    });
    it("se cierra con Escape (sin robar el foco: el Escape llega a la ventana)", () => {
        const pwa = pwaFalso(); el.pwa = pwa;
        pwa.ventana.dispatchEvent(new CustomEvent("galeno-ticket-descargado"));
        expect(visible()).to.equal(true);
        pwa.ventana.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
        expect(pwa.aplazos).to.equal(1);
        expect(visible()).to.equal(false);
    });
    it("en iOS el primario dice 'Ver cómo instalar' y abre la guia (no llama instalar)", () => {
        const pwa = pwaFalso({ estado: "ios_manual" }); el.pwa = pwa;
        pwa.ventana.dispatchEvent(new CustomEvent("galeno-ticket-descargado"));
        expect(primario().textContent.trim()).to.equal("Ver cómo instalar");
        const oyente = sinon.spy(); pwa.ventana.addEventListener("galeno-abrir-guia", oyente);
        primario().click();
        expect(pwa.instalar.called).to.equal(false);
        expect(oyente.calledOnce).to.equal(true);
        expect(visible()).to.equal(false);
    });
    it("'Instalar' con aceptacion: llama instalar(), muestra el toast y se esconde", async () => {
        const pwa = pwaFalso(); el.pwa = pwa;
        const avisoFalso = { mostrar: sinon.spy() }; el.aviso = avisoFalso;
        pwa.ventana.dispatchEvent(new CustomEvent("galeno-ticket-descargado"));
        primario().click(); await esperar();
        expect(pwa.instalar.calledOnce).to.equal(true);
        expect(avisoFalso.mostrar.calledWith("¡GalenoSV instalada!", "exito")).to.equal(true);
        expect(visible()).to.equal(false);
    });
    it("si el usuario cancela el dialogo del navegador (dismissed), se esconde sin toast", async () => {
        const pwa = pwaFalso({ resultado: "dismissed" }); el.pwa = pwa;
        const avisoFalso = { mostrar: sinon.spy() }; el.aviso = avisoFalso;
        pwa.ventana.dispatchEvent(new CustomEvent("galeno-ticket-descargado"));
        primario().click(); await esperar();
        expect(avisoFalso.mostrar.called).to.equal(false);
        expect(visible()).to.equal(false);
    });
    it("no reacciona a la descarga si nadie le asigno el servicio", () => {
        expect(() => window.dispatchEvent(new CustomEvent("galeno-ticket-descargado"))).to.not.throw();
        expect(visible(), "no hay tarjeta que mostrar").to.equal(false);
    });
});
}
