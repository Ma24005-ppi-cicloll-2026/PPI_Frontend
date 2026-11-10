// Pruebas de Pwa: registro del service worker e instalacion de la app.
{
const { expect } = chai;

// ventana y navegador falsos: no se toca el navegador real
function crearEntorno({ standalone = false, agente = "Chrome", conSw = true } = {}) {
    const ventana = new EventTarget();
    ventana.matchMedia = () => ({ matches: standalone });
    const navegador = { userAgent: agente, onLine: true };
    if (conSw) navegador.serviceWorker = { register: sinon.stub().resolves({ scope: "./" }) };
    return { ventana, navegador };
}
function eventoInstalacion(resultado = "accepted") {
    const e = new Event("beforeinstallprompt", { cancelable: true });
    e.prompt = sinon.stub().resolves();
    e.userChoice = Promise.resolve({ outcome: resultado });
    return e;
}

describe("Pwa", () => {

    describe("service worker", () => {
        it("registra sw.js al iniciar", async () => {
            const { ventana, navegador } = crearEntorno();
            const pwa = new Pwa({ ventana, navegador });
            const registro = await pwa.iniciar();
            expect(navegador.serviceWorker.register.calledWith("sw.js")).to.equal(true);
            expect(registro.scope).to.equal("./");
        });
        it("si el navegador no soporta service workers, no falla y devuelve null", async () => {
            const { ventana, navegador } = crearEntorno({ conSw: false });
            expect(await new Pwa({ ventana, navegador }).iniciar()).to.equal(null);
        });
        it("si el registro falla, devuelve null en vez de romper la app", async () => {
            const { ventana, navegador } = crearEntorno();
            navegador.serviceWorker.register = sinon.stub().rejects(new Error("sin https"));
            const aviso = sinon.stub(console, "warn");
            try { expect(await new Pwa({ ventana, navegador }).iniciar()).to.equal(null); }
            finally { aviso.restore(); }
        });
    });

    describe("instalacion", () => {
        it("al inicio no se puede instalar (el navegador aun no lo permite)", async () => {
            const { ventana, navegador } = crearEntorno();
            const pwa = new Pwa({ ventana, navegador }); await pwa.iniciar();
            expect(pwa.puedeInstalar).to.equal(false);
            expect(await pwa.instalar()).to.equal("no-disponible");
        });
        it("cuando el navegador lo permite, avisa con galeno-instalable y evita el mini-aviso", async () => {
            const { ventana, navegador } = crearEntorno();
            const pwa = new Pwa({ ventana, navegador }); await pwa.iniciar();
            const aviso = sinon.spy(); ventana.addEventListener("galeno-instalable", aviso);
            const e = eventoInstalacion(); ventana.dispatchEvent(e);
            expect(e.defaultPrevented).to.equal(true);
            expect(aviso.calledOnce).to.equal(true);
            expect(pwa.puedeInstalar).to.equal(true);
        });
        it("instalar() abre el dialogo y devuelve lo que eligio el usuario", async () => {
            for (const eleccion of ["accepted", "dismissed"]) {
                const { ventana, navegador } = crearEntorno();
                const pwa = new Pwa({ ventana, navegador }); await pwa.iniciar();
                const e = eventoInstalacion(eleccion); ventana.dispatchEvent(e);
                expect(await pwa.instalar()).to.equal(eleccion);
                expect(e.prompt.calledOnce).to.equal(true);
                expect(pwa.puedeInstalar, "el evento solo se puede usar una vez").to.equal(false);
            }
        });
        it("al terminar de instalarse avisa con galeno-instalada", async () => {
            const { ventana, navegador } = crearEntorno();
            const pwa = new Pwa({ ventana, navegador }); await pwa.iniciar();
            ventana.dispatchEvent(eventoInstalacion());
            const aviso = sinon.spy(); ventana.addEventListener("galeno-instalada", aviso);
            ventana.dispatchEvent(new Event("appinstalled"));
            expect(aviso.calledOnce).to.equal(true);
            expect(pwa.puedeInstalar).to.equal(false);
        });
        it("si ya corre como app instalada no ofrece instalar", async () => {
            const { ventana, navegador } = crearEntorno({ standalone: true });
            const pwa = new Pwa({ ventana, navegador }); await pwa.iniciar();
            ventana.dispatchEvent(eventoInstalacion());
            expect(pwa.instalada).to.equal(true);
            expect(pwa.puedeInstalar).to.equal(false);
        });
        it("en iPhone pide instalar a mano; en otros navegadores no", () => {
            const iphone = crearEntorno({ agente: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari" });
            const otro = crearEntorno({ agente: "Mozilla/5.0 (Windows NT 10.0) Chrome/120" });
            expect(new Pwa(iphone).requiereInstruccionManual).to.equal(true);
            expect(new Pwa(otro).requiereInstruccionManual).to.equal(false);
        });
    });

    describe("conexion", () => {
        it("enLinea refleja navigator.onLine", () => {
            const { ventana, navegador } = crearEntorno();
            const pwa = new Pwa({ ventana, navegador });
            expect(pwa.enLinea).to.equal(true);
            navegador.onLine = false;
            expect(pwa.enLinea).to.equal(false);
        });
    });
});
}
