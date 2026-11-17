// Todo lo "PWA" del lado de la pagina: registrar el service worker, saber si la app se puede instalar,
// instalarla y decidir CUANDO invitar a instalar (el unico servicio de instalacion de la app:
// el boton de la cabecera, la invitacion tras el ticket y la guia manual solo leen de aqui).
// Se arranca desde galeno-app:
//     const pwa = new Pwa(); pwa.iniciar();
// Avisa con eventos en window:
//     "galeno-instalable"  -> el navegador permite instalar (se puede mostrar el boton)
//     "galeno-instalada"   -> el usuario ya la instalo
// Estados de instalacion (pwa.estado):
//     "instalable"    -> hay beforeinstallprompt (Chrome/Edge): instalar() abre el dialogo
//     "ios_manual"    -> Safari en iPhone/iPad: la guia explica el camino manual
//     "instalada"     -> ya corre como app (standalone): nada se muestra
//     "no_soportado"  -> no hay forma de instalar (ej. Firefox de escritorio): nada se muestra
// Chrome/Edge a veces tarda en avisar beforeinstallprompt (o no lo avisa si ya esta instalada):
// si el registro del service worker salio bien en un navegador Chromium, el estado TAMBIEN es
// "instalable" (probable); si al pulsar aun no hay dialogo, el boton explica el camino del navegador.
// Persistencia de la invitacion (tolerante a almacen bloqueado):
//     "Ahora no" guarda la fecha en localStorage y silencia la invitacion 7 dias;
//     una marca en sessionStorage evita mostrarla mas de una vez por sesion.
// ventana, navegador y almacen se pueden cambiar por falsos en las pruebas.
class Pwa {

    static CLAVE_APLAZO = "galeno-instalar-aplazo";      // fecha del ultimo "Ahora no" (localStorage)
    static CLAVE_SESION = "galeno-invitacion-vista";     // la invitacion ya salio en esta sesion
    static DIAS_APLAZO = 7;
    static MS_DIA = 24 * 60 * 60 * 1000;

    constructor({ ventana = window, navegador = navigator, almacen = null } = {}) {
        this.ventana = ventana;
        this.navegador = navegador;
        this.almacen = almacen || { local: ventana.localStorage, sesion: ventana.sessionStorage };
        this.eventoInstalacion = null;        // lo entrega el navegador; sirve para abrir el dialogo de instalar
        this.registro = null;
        this._probable = false;               // Chromium con service worker OK, aunque el evento no haya llegado
        this._instaladaRecien = false;        // true al recibir appinstalled (aunque standalone tarde en cumplirse)
        this.alInstalable = e => {
            e.preventDefault();
            this.eventoInstalacion = e;
            this.ventana.dispatchEvent(new CustomEvent("galeno-instalable"));
        };
        this.alInstalada = () => {
            this.eventoInstalacion = null;
            this._probable = false;
            this._instaladaRecien = true;     // aunque standalone tarde en cumplirse, no se vuelve a ofrecer
            this.ventana.dispatchEvent(new CustomEvent("galeno-instalada"));
        };
    }

    iniciar() {
        this.ventana.addEventListener("beforeinstallprompt", this.alInstalable);
        this.ventana.addEventListener("appinstalled", this.alInstalada);
        // el evento pudo llegar ANTES de la suscripcion (js/pwa_antes.js lo guardo): se adopta
        if (!this.instalada && this.ventana.galenoEventoInstalacion) {
            const evento = this.ventana.galenoEventoInstalacion;
            this.ventana.galenoEventoInstalacion = null;
            this.eventoInstalacion = evento;
            this.ventana.dispatchEvent(new CustomEvent("galeno-instalable"));
        }
        return this.registrar();
    }

    destruir() {
        this.ventana.removeEventListener("beforeinstallprompt", this.alInstalable);
        this.ventana.removeEventListener("appinstalled", this.alInstalada);
    }

    // Registra sw.js. Devuelve el registro, o null si el navegador no soporta service workers o falla.
    async registrar(ruta = "sw.js") {
        if (!("serviceWorker" in this.navegador)) return null;
        try {
            this.registro = await this.navegador.serviceWorker.register(ruta);
            // Chromium a veces tarda en avisar beforeinstallprompt (o no lo avisa si la app ya esta
            // instalada): con el service worker registrado se considera instalable y el boton aparece.
            this._probable = this.navegadorInstalable();
            if (this._probable) this.ventana.dispatchEvent(new CustomEvent("galeno-instalable"));
            return this.registro;
        } catch (e) {
            console.warn("No se pudo registrar el service worker:", e.message);
            return null;
        }
    }

    // Navegador capaz de instalar aunque el evento de instalacion aun no llegue:
    // Chromium (Chrome, Edge, Brave...). No Firefox (FxiOS) ni Safari de escritorio.
    navegadorInstalable() {
        if (!("serviceWorker" in this.navegador)) return false;
        const agente = this.navegador.userAgent || "";
        const chromium = /Chrome\/|Chromium\/|Edg\//.test(agente) && !/Firefox|FxiOS/i.test(agente);
        return chromium && !this.instalada && !this._instaladaRecien;
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

    // Estado unico de instalacion, derivado (los componentes solo preguntan pwa.estado)
    get estado() {
        if (this.instalada || this._instaladaRecien) return "instalada";
        if (this.eventoInstalacion) return "instalable";
        if (this.requiereInstruccionManual) return "ios_manual";
        if (this._probable) return "instalable";
        return "no_soportado";
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

    // ---------- invitacion a instalar (persistencia con try/catch) ----------

    // "Ahora no": guarda la fecha y silencia la invitacion DIAS_APLAZO dias
    aplazar() {
        try { this.almacen.local.setItem(Pwa.CLAVE_APLAZO, String(Date.now())); } catch (e) { /* sin almacen */ }
    }

    // true si el usuario dijo "Ahora no" hace menos de DIAS_APLAZO dias
    aplazado() {
        try {
            const fecha = Number(this.almacen.local.getItem(Pwa.CLAVE_APLAZO));
            if (!fecha) return false;
            return Date.now() - fecha < Pwa.DIAS_APLAZO * Pwa.MS_DIA;
        } catch (e) { return false; }
    }

    // la invitacion contextual sale como maximo UNA vez por sesion
    marcarInvitacionMostrada() {
        try { this.almacen.sesion.setItem(Pwa.CLAVE_SESION, "1"); } catch (e) { /* sin almacen */ }
    }

    invitacionMostrada() {
        try { return this.almacen.sesion.getItem(Pwa.CLAVE_SESION) === "1"; } catch (e) { return false; }
    }

    // Puede salir la invitacion contextual? (solo en estados donde tiene sentido, sin aplazo y sin repetirse)
    puedeInvitar() {
        const estado = this.estado;
        return (estado === "instalable" || estado === "ios_manual")
            && !this.aplazado() && !this.invitacionMostrada();
    }
}
