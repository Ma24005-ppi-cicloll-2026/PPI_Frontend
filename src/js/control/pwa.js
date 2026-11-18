class Pwa {

    static CLAVE_APLAZO = "galeno-instalar-aplazo";
    static CLAVE_SESION = "galeno-invitacion-vista";
    static DIAS_APLAZO = 7;
    static MS_DIA = 24 * 60 * 60 * 1000;

    // Prepara las referencias del navegador y el estado de instalación.
    constructor({ ventana = window, navegador = navigator, almacen = null } = {}) {
        this.ventana = ventana;
        this.navegador = navegador;
        this.almacen = almacen || { local: ventana.localStorage, sesion: ventana.sessionStorage };
        this.eventoInstalacion = null;
        this.registro = null;
        this._probable = false;
        this._instaladaRecien = false;
        this.alInstalable = e => {
            e.preventDefault();
            this.eventoInstalacion = e;
            this.ventana.dispatchEvent(new CustomEvent("galeno-instalable"));
        };
        this.alInstalada = () => {
            this.eventoInstalacion = null;
            this._probable = false;
            this._instaladaRecien = true;
            this.ventana.dispatchEvent(new CustomEvent("galeno-instalada"));
        };
    }

    // Prepara el estado y las escuchas que necesita este flujo.
    iniciar() {
        // Conserva el evento para que la aplicación pueda ofrecer la instalación.
        this.ventana.addEventListener("beforeinstallprompt", this.alInstalable);
        this.ventana.addEventListener("appinstalled", this.alInstalada);
        if (!this.instalada && this.ventana.galenoEventoInstalacion) {
            const evento = this.ventana.galenoEventoInstalacion;
            this.ventana.galenoEventoInstalacion = null;
            this.eventoInstalacion = evento;
            this.ventana.dispatchEvent(new CustomEvent("galeno-instalable"));
        }
        return this.registrar();
    }

    // Descarta el trabajo pendiente de la vista al salir.
    destruir() {
        this.ventana.removeEventListener("beforeinstallprompt", this.alInstalable);
        this.ventana.removeEventListener("appinstalled", this.alInstalada);
    }

    // Registra el service worker si el navegador lo admite.
    async registrar(ruta = "sw.js") {
        if (!("serviceWorker" in this.navegador)) return null;
        try {
            this.registro = await this.navegador.serviceWorker.register(ruta);
            this._probable = this.navegadorInstalable();
            if (this._probable) this.ventana.dispatchEvent(new CustomEvent("galeno-instalable"));
            return this.registro;
        } catch (e) {
            console.warn("No se pudo registrar el service worker:", e.message);
            return null;
        }
    }

    // Comprueba si el navegador ofrece instalación.
    navegadorInstalable() {
        if (!("serviceWorker" in this.navegador)) return false;
        const agente = this.navegador.userAgent || "";
        const chromium = /Chrome\/|Chromium\/|Edg\//.test(agente) && !/Firefox|FxiOS/i.test(agente);
        return chromium && !this.instalada && !this._instaladaRecien;
    }

    // Devuelve el estado de conexión.
    get enLinea() { return this.navegador.onLine !== false; }

    // Devuelve el estado de instalación.
    get instalada() {
        const independiente = this.ventana.matchMedia?.("(display-mode: standalone)")?.matches;
        return Boolean(independiente || this.navegador.standalone);
    }

    // Devuelve la disponibilidad de instalación.
    get puedeInstalar() { return !this.instalada && this.eventoInstalacion !== null; }

    // Devuelve la necesidad de instrucciones manuales.
    get requiereInstruccionManual() {
        const agente = this.navegador.userAgent || "";
        return /iphone|ipad|ipod/i.test(agente) && !this.instalada;
    }

    // Devuelve el estado actual.
    get estado() {
        if (this.instalada || this._instaladaRecien) return "instalada";
        if (this.eventoInstalacion) return "instalable";
        if (this.requiereInstruccionManual) return "ios_manual";
        if (this._probable) return "instalable";
        return "no_soportado";
    }

    // Solicita la instalación o abre las instrucciones disponibles.
    async instalar() {
        if (!this.puedeInstalar) return "no-disponible";
        const evento = this.eventoInstalacion;
        this.eventoInstalacion = null;
        await evento.prompt();
        const { outcome } = await evento.userChoice;
        return outcome;
    }


    // Guarda la fecha desde la que se cuenta el aplazamiento.
    aplazar() {
        try { this.almacen.local.setItem(Pwa.CLAVE_APLAZO, String(Date.now())); } catch (e) {   }
    }

    // Indica si sigue vigente el aplazamiento de la invitación.
    aplazado() {
        try {
            const fecha = Number(this.almacen.local.getItem(Pwa.CLAVE_APLAZO));
            if (!fecha) return false;
            return Date.now() - fecha < Pwa.DIAS_APLAZO * Pwa.MS_DIA;
        } catch (e) { return false; }
    }

    // Registra que la invitación ya se mostró en esta sesión.
    marcarInvitacionMostrada() {
        try { this.almacen.sesion.setItem(Pwa.CLAVE_SESION, "1"); } catch (e) {   }
    }

    // Consulta si ya se mostró la invitación en esta sesión.
    invitacionMostrada() {
        try { return this.almacen.sesion.getItem(Pwa.CLAVE_SESION) === "1"; } catch (e) { return false; }
    }

    // Comprueba si corresponde ofrecer la invitación en esta sesión.
    puedeInvitar() {
        const estado = this.estado;
        return (estado === "instalable" || estado === "ios_manual")
            && !this.aplazado() && !this.invitacionMostrada();
    }
}
