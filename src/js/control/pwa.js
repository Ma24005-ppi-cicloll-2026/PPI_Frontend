// Todo lo "PWA" del lado de la pagina: registrar el service worker, saber si la app se puede instalar
// e instalarla. Se arranca desde el index.html:
//     const pwa = new Pwa(); pwa.iniciar();
// Avisa con eventos en window:
//     "galeno-instalable"  -> el navegador permite instalar (se puede mostrar el boton)
//     "galeno-instalada"   -> el usuario ya la instalo
// ventana y navegador se pueden cambiar por falsos en las pruebas.
class Pwa {

    constructor({ ventana = window, navegador = navigator } = {}) {
        this.ventana = ventana;
        this.navegador = navegador;
        this.eventoInstalacion = null;        // lo entrega el navegador; sirve para abrir el dialogo de instalar
        this.registro = null;
    }

    iniciar() {
        this.ventana.addEventListener("beforeinstallprompt", e => {
            e.preventDefault();                // evita el mini-aviso del navegador: la instalacion la pide nuestro boton
            this.eventoInstalacion = e;
            this.ventana.dispatchEvent(new CustomEvent("galeno-instalable"));
        });
        this.ventana.addEventListener("appinstalled", () => {
            this.eventoInstalacion = null;
            this.ventana.dispatchEvent(new CustomEvent("galeno-instalada"));
        });
        return this.registrar();
    }

    // Registra sw.js. Devuelve el registro, o null si el navegador no soporta service workers o falla.
    async registrar(ruta = "sw.js") {
        if (!("serviceWorker" in this.navegador)) return null;
        try {
            this.registro = await this.navegador.serviceWorker.register(ruta);
            return this.registro;
        } catch (e) {
            console.warn("No se pudo registrar el service worker:", e.message);
            return null;
        }
    }

    get enLinea() { return this.navegador.onLine !== false; }

    // true si ya se abrio como app instalada (ventana propia, sin barra del navegador)
    get instalada() {
        const independiente = this.ventana.matchMedia?.("(display-mode: standalone)")?.matches;
        return Boolean(independiente || this.navegador.standalone);
    }

    get puedeInstalar() { return !this.instalada && this.eventoInstalacion !== null; }

    // Safari en iPhone/iPad no tiene el dialogo de instalar: hay que explicarle el camino manual
    get requiereInstruccionManual() {
        const agente = this.navegador.userAgent || "";
        return /iphone|ipad|ipod/i.test(agente) && !this.instalada;
    }

    // Abre el dialogo de instalacion. Devuelve "accepted", "dismissed" o "no-disponible".
    async instalar() {
        if (!this.puedeInstalar) return "no-disponible";
        const evento = this.eventoInstalacion;
        this.eventoInstalacion = null;          // el navegador solo deja usarlo una vez
        await evento.prompt();
        const { outcome } = await evento.userChoice;
        return outcome;
    }
}
