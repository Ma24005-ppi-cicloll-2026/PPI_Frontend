class Pwa {

    // Prepara las referencias del navegador y el estado de instalación.
    constructor({ ventana = window, navegador = navigator, almacen = null } = {}) {
        this.ventana = ventana;
        this.navegador = navegador;
        this.almacen = almacen || { local: ventana.localStorage, sesion: ventana.sessionStorage };
        this.claveAplazo = "galeno-instalar-aplazo";
        this.claveSesion = "galeno-invitacion-vista";
        this.msAplazo = 7 * 24 * 60 * 60 * 1000;
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
    registrar(ruta = "sw.js") {
        if (!("serviceWorker" in this.navegador)) return Promise.resolve(null);
        return Promise.resolve()
            .then(() => this.navegador.serviceWorker.register(ruta))
            .then(registro => {
                this.registro = registro;
                this._probable = this.navegadorInstalable();
                if (this._probable) this.ventana.dispatchEvent(new CustomEvent("galeno-instalable"));
                return registro;
            })
            .catch(e => {
                console.warn("No se pudo registrar el service worker:", e.message);
                return null;
            });
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
    instalar() {
        if (!this.puedeInstalar) return Promise.resolve("no-disponible");
        const evento = this.eventoInstalacion;
        this.eventoInstalacion = null;
        return Promise.resolve(evento.prompt())
            .then(() => evento.userChoice)
            .then(({ outcome }) => outcome);
    }


    // Guarda la fecha desde la que se cuenta el aplazamiento.
    aplazar() {
        try { this.almacen.local.setItem(this.claveAplazo, String(Date.now())); } catch (e) {   }
    }

    // Indica si sigue vigente el aplazamiento de la invitación.
    aplazado() {
        try {
            const fecha = Number(this.almacen.local.getItem(this.claveAplazo));
            if (!fecha) return false;
            return Date.now() - fecha < this.msAplazo;
        } catch (e) { return false; }
    }

    // Registra que la invitación ya se mostró en esta sesión.
    marcarInvitacionMostrada() {
        try { this.almacen.sesion.setItem(this.claveSesion, "1"); } catch (e) {   }
    }

    // Consulta si ya se mostró la invitación en esta sesión.
    invitacionMostrada() {
        try { return this.almacen.sesion.getItem(this.claveSesion) === "1"; } catch (e) { return false; }
    }

    // Comprueba si corresponde ofrecer la invitación en esta sesión.
    puedeInvitar() {
        const estado = this.estado;
        return (estado === "instalable" || estado === "ios_manual")
            && !this.aplazado() && !this.invitacionMostrada();
    }
}
