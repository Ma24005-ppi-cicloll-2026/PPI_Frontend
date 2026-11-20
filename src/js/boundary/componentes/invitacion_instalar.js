class GalenoInvitacionInstalar extends HTMLElement {

    // Moldes HTML del componente.
    plantillas = new Plantillas();

    // Prepara el estado interno antes de montar el componente.
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this._pwa = null;
        this._aviso = null;
        this._ocupada = false;
        this._abierta = false;
        this.alTicket = () => this.invitar();
        this.alTecla = e => { if (e.key === "Escape" && this._abierta) this.cerrar(); };
    }

    // Actualiza el servicio de instalación.
    set pwa(valor) {
        this.quitarEscuchas();
        this._pwa = valor;
        this.ponerEscuchas();
        this.pintar();
    }
    // Devuelve el servicio de instalación.
    get pwa() { return this._pwa; }

    // Actualiza el componente que muestra avisos.
    set aviso(valor) { this._aviso = valor; }
    // Devuelve el componente que muestra avisos.
    get aviso() { return this._aviso; }

    // Prepara el componente cuando se incorpora al documento.
    connectedCallback() { this.ponerEscuchas(); this.pintar(); }
    // Libera las escuchas y recursos al retirar el componente.
    disconnectedCallback() { this.quitarEscuchas(); }

    // Suscribe los eventos que necesita el componente.
    ponerEscuchas() {
        if (!this._pwa || !this.isConnected) return;
        this._pwa.ventana.addEventListener("galeno-ticket-descargado", this.alTicket);
        // Atiende las teclas que controla esta vista.
        this._pwa.ventana.addEventListener("keydown", this.alTecla);
    }
    // Retira las suscripciones del componente.
    quitarEscuchas() {
        if (!this._pwa) return;
        this._pwa.ventana.removeEventListener("galeno-ticket-descargado", this.alTicket);
        this._pwa.ventana.removeEventListener("keydown", this.alTecla);
    }

    // Muestra la invitación cuando el estado de instalación lo permite.
    invitar() {
        if (!this._pwa || !this._pwa.puedeInvitar()) return false;
        this._pwa.marcarInvitacionMostrada();
        this._abierta = true;
        this.pintar();
        return true;
    }

    // Cierra el estado abierto y libera sus recursos.
    cerrar() {
        this._abierta = false;
        this._pwa?.aplazar();
        this.pintar();
        this.dispatchEvent(new CustomEvent("galeno-instalacion",
            { detail: { resultado: "dismissed" }, bubbles: true, composed: true }));
    }

    // Procesa la aceptación de la invitación de instalación.
    aceptar() {
        const pwa = this._pwa;
        if (!pwa || this._ocupada) return Promise.resolve();
        if (pwa.estado === "ios_manual") {
            pwa.ventana.dispatchEvent(new Event("galeno-abrir-guia"));
            this._abierta = false;
            this.pintar();
            this.dispatchEvent(new CustomEvent("galeno-instalacion",
                { detail: { resultado: "manual" }, bubbles: true, composed: true }));
            return;
        }
        this._ocupada = true;
        return Promise.resolve()
            .then(() => pwa.instalar())
            .then(resultado => {
                this._abierta = false;
                if (resultado === "accepted") this._aviso?.mostrar("¡GalenoSV instalada!", "exito");
                this.dispatchEvent(new CustomEvent("galeno-instalacion",
                    { detail: { resultado }, bubbles: true, composed: true }));
            })
            .catch(() => this.dispatchEvent(new CustomEvent("galeno-instalacion",
                { detail: { resultado: "error" }, bubbles: true, composed: true })))
            .finally(() => {
                this._ocupada = false;
                this.pintar();
            });
    }

    // Actualiza la vista con los datos y el estado actuales.
    pintar() {
        const pwa = this._pwa;
        const ios = pwa?.estado === "ios_manual";
        const raiz = this.plantillas.clonar("plantilla-galeno-invitacion");
        raiz.querySelector(".tarjeta").hidden = !this._abierta;
        raiz.querySelector(".primario").textContent = ios ? "Ver cómo instalar" : "Instalar";
        raiz.querySelector(".tarjeta .primario").addEventListener("click", () => this.aceptar());
        raiz.querySelector(".ahora-no").addEventListener("click", () => this.cerrar());
        raiz.querySelector(".cerrar").addEventListener("click", () => this.cerrar());
        this.shadowRoot.replaceChildren(raiz);
    }
}

customElements.define("galeno-invitacion-instalar", GalenoInvitacionInstalar);
