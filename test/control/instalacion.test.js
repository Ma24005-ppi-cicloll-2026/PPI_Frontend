{
const { expect } = chai;

// Prepara un navegador simulado para probar la instalación.
function crearEntorno({ standalone = false, agente = "Chrome", conSw = false } = {}) {
    const ventana = new EventTarget();
    ventana.matchMedia = () => ({ matches: standalone });
    const navegador = { userAgent: agente, onLine: true };
    if (conSw) navegador.serviceWorker = { register: sinon.stub().resolves({ scope: "./" }) };
    return { ventana, navegador };
}
// Crea una copia en memoria del almacenamiento del navegador.
function almacenFalso() {
    const mapa = new Map();
    // Crea el registro o elemento que necesita este flujo.
    const crear = () => ({
        // Lee un valor del almacenamiento simulado.
        getItem: clave => (mapa.has(clave) ? mapa.get(clave) : null),
        // Guarda un valor en el almacenamiento simulado.
        setItem: (clave, valor) => mapa.set(clave, String(valor)),
        // Elimina una clave del almacenamiento simulado.
        removeItem: clave => mapa.delete(clave)
    });
    return { local: crear(), sesion: crear() };
}
// Simula el evento y la respuesta del diálogo de instalación.
function eventoInstalacion() {
    const e = new Event("beforeinstallprompt", { cancelable: true });
    e.prompt = async () => {};
    e.userChoice = Promise.resolve({ outcome: "accepted" });
    return e;
}

describe("Pwa · instalacion (estado unico e invitacion)", () => {

    describe("estado", () => {
        it("sin evento, sin iOS y sin standalone: no_soportado (Firefox de escritorio)", () => {
            const pwa = new Pwa(crearEntorno());
            expect(pwa.estado).to.equal("no_soportado");
        });
        it("Chromium con service worker registrado es instalable AUN sin beforeinstallprompt (probable)", async () => {
            const { ventana, navegador } = crearEntorno({ agente: "Chrome/120", conSw: true });
            const pwa = new Pwa({ ventana, navegador });
            await pwa.iniciar();
            expect(pwa.estado).to.equal("instalable");
            expect(pwa.puedeInstalar).to.equal(false, "el dialogo del navegador aun no esta disponible");
        });
        it("Firefox y Safari de escritorio NO se consideran probables aunque tengan service worker", async () => {
            for (const agente of ["Firefox/130", "Mozilla/5.0 (Macintosh) Version/17 Safari"]) {
                const { ventana, navegador } = crearEntorno({ agente, conSw: true });
                const pwa = new Pwa({ ventana, navegador });
                await pwa.iniciar();
                expect(pwa.estado, agente).to.equal("no_soportado");
            }
        });
        it("Chrome en iPhone (CriOS) no es probable: pasa a la guia manual de iOS", async () => {
            const { ventana, navegador } = crearEntorno({
                agente: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) CriOS/120", conSw: true
            });
            const pwa = new Pwa({ ventana, navegador });
            await pwa.iniciar();
            expect(pwa.estado).to.equal("ios_manual");
        });
        it("adopta el beforeinstallprompt capturado ANTES de la suscripcion (pwa_antes.js)", () => {
            const { ventana, navegador } = crearEntorno();
            ventana.galenoEventoInstalacion = eventoInstalacion();
            const pwa = new Pwa({ ventana, navegador });
            const aviso = sinon.spy(); ventana.addEventListener("galeno-instalable", aviso);
            pwa.iniciar();
            expect(pwa.estado).to.equal("instalable");
            expect(aviso.calledOnce).to.equal(true);
            expect(ventana.galenoEventoInstalacion, "el evento se consumio").to.equal(null);
        });
        it("tras appinstalled queda instalada y NO revive por probable", async () => {
            const { ventana, navegador } = crearEntorno({ agente: "Chrome/120", conSw: true });
            const pwa = new Pwa({ ventana, navegador });
            await pwa.iniciar();
            ventana.dispatchEvent(new Event("appinstalled"));
            expect(pwa.estado).to.equal("instalada");
            expect(pwa.navegadorInstalable()).to.equal(false);
        });
        it("con beforeinstallprompt: instalable", () => {
            const entorno = crearEntorno({ conPrompt: true });
            const pwa = new Pwa(entorno);
            pwa.iniciar();
            entorno.ventana.dispatchEvent(eventoInstalacion());
            expect(pwa.estado).to.equal("instalable");
        });
        it("en iPhone: ios_manual", () => {
            const pwa = new Pwa(crearEntorno({ agente: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Safari" }));
            expect(pwa.estado).to.equal("ios_manual");
        });
        it("si ya corre standalone: instalada (aunque llegue un evento de instalacion)", () => {
            const entorno = crearEntorno({ standalone: true });
            const pwa = new Pwa(entorno);
            entorno.ventana.dispatchEvent(eventoInstalacion());
            expect(pwa.estado).to.equal("instalada");
        });
        it("appinstalled pasa a instalada aunque el navegador lo permitiera antes", () => {
            const entorno = crearEntorno({ conPrompt: true });
            const pwa = new Pwa(entorno);
            pwa.iniciar();
            entorno.ventana.dispatchEvent(eventoInstalacion());
            entorno.ventana.dispatchEvent(new Event("appinstalled"));
            expect(pwa.estado).to.equal("instalada");
        });
        it("instalar() en estado no_soportado devuelve no-disponible", async () => {
            expect(await new Pwa(crearEntorno()).instalar()).to.equal("no-disponible");
        });
    });

    describe("invitacion (persistencia)", () => {
        it("puedeInvitar: solo en instalable o ios_manual", () => {
            const noSoportado = new Pwa({ ...crearEntorno(), almacen: almacenFalso() });
            expect(noSoportado.puedeInvitar()).to.equal(false);
            const entorno = crearEntorno({ conPrompt: true });
            const pwa = new Pwa({ ...entorno, almacen: almacenFalso() });
            pwa.iniciar();
            entorno.ventana.dispatchEvent(eventoInstalacion());
            expect(pwa.puedeInvitar()).to.equal(true);
            const iphone = crearEntorno({ agente: "iPhone Safari" });
            const pwaIos = new Pwa({ ...iphone, almacen: almacenFalso() });
            expect(pwaIos.puedeInvitar()).to.equal(true);
        });
        it("marca de sesion: la invitacion sale una sola vez por sesion", () => {
            const almacen = almacenFalso();
            const entorno = crearEntorno({ conPrompt: true });
            const pwa = new Pwa({ ...entorno, almacen });
            pwa.iniciar();
            entorno.ventana.dispatchEvent(eventoInstalacion());
            expect(pwa.invitacionMostrada()).to.equal(false);
            pwa.marcarInvitacionMostrada();
            expect(pwa.invitacionMostrada()).to.equal(true);
            expect(pwa.puedeInvitar()).to.equal(false);
        });
        it("el 'Ahora no' silencia 7 dias y vuelve a invitar justo despues", () => {
            const reloj = sinon.useFakeTimers({ now: new Date("2026-01-10T12:00:00") });
            try {
                const almacen = almacenFalso();
                const entorno = crearEntorno({ conPrompt: true });
                const pwa = new Pwa({ ...entorno, almacen });
                pwa.iniciar();
                entorno.ventana.dispatchEvent(eventoInstalacion());
                pwa.aplazar();
                expect(pwa.aplazado(), "apenas aplazada").to.equal(true);
                expect(pwa.puedeInvitar()).to.equal(false);
                reloj.tick(7 * 24 * 60 * 60 * 1000 - 1000);
                expect(pwa.aplazado(), "aun dentro de los 7 dias").to.equal(true);
                reloj.tick(1000);
                expect(pwa.aplazado(), "pasados los 7 dias se vuelve a invitar").to.equal(false);
                expect(pwa.puedeInvitar()).to.equal(true);
            } finally { reloj.restore(); }
        });
        it("una marca vieja en el almacen (mas de 7 dias) no silencia", () => {
            const reloj = sinon.useFakeTimers({ now: new Date("2026-01-10T12:00:00") });
            try {
                const almacen = almacenFalso();
                const entorno = crearEntorno({ conPrompt: true });
                const pwa = new Pwa({ ...entorno, almacen });
                pwa.iniciar();
                almacen.local.setItem("galeno-instalar-aplazo", String(Date.now() - 8 * 24 * 60 * 60 * 1000));
                entorno.ventana.dispatchEvent(eventoInstalacion());
                expect(pwa.aplazado()).to.equal(false);
                expect(pwa.puedeInvitar()).to.equal(true);
            } finally { reloj.restore(); }
        });
        it("sin almacen (localStorage roto): no falla y la invitacion puede salir", () => {
            const roto = {
                local: {
                    // Lee un valor del almacenamiento simulado.
                    getItem: () => { throw new Error("bloqueado"); },
                    // Guarda un valor en el almacenamiento simulado.
                    setItem: () => { throw new Error("bloqueado"); } },
                sesion: {
                    // Lee un valor del almacenamiento simulado.
                    getItem: () => { throw new Error("bloqueado"); },
                    // Guarda un valor en el almacenamiento simulado.
                    setItem: () => { throw new Error("bloqueado"); } }
            };
            const entorno = crearEntorno({ conPrompt: true });
            const pwa = new Pwa({ ...entorno, almacen: roto });
            pwa.iniciar();
            entorno.ventana.dispatchEvent(eventoInstalacion());
            expect(() => pwa.aplazar()).to.not.throw();
            expect(() => pwa.marcarInvitacionMostrada()).to.not.throw();
            expect(pwa.aplazado()).to.equal(false);
            expect(pwa.invitacionMostrada()).to.equal(false);
            expect(pwa.puedeInvitar()).to.equal(true);
        });
        it("sin evento de instalacion ni iOS, la invitacion no sale aunque el almacen este limpio", () => {
            const pwa = new Pwa({ ...crearEntorno(), almacen: almacenFalso() });
            expect(pwa.puedeInvitar()).to.equal(false);
        });
    });
});
}
