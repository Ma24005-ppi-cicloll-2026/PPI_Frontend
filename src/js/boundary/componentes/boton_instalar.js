class GalenoBotonInstalar extends HTMLElement {

    // Moldes HTML del componente.
    plantillas = new Plantillas();

    // Prepara el estado interno antes de montar el componente.
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this._pwa = null;
        this._aviso = null;
        this._ocupada = false;
        this.alCambiar = () => this.pintar();
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
        this._pwa.ventana.addEventListener("galeno-instalable", this.alCambiar);
        this._pwa.ventana.addEventListener("galeno-instalada", this.alCambiar);
    }
    // Retira las suscripciones del componente.
    quitarEscuchas() {
        if (!this._pwa) return;
        this._pwa.ventana.removeEventListener("galeno-instalable", this.alCambiar);
        this._pwa.ventana.removeEventListener("galeno-instalada", this.alCambiar);
    }

    // Resuelve la acción del botón según el estado de instalación.
    pulsar() {
        const pwa = this._pwa;
        if (!pwa || this._ocupada) return Promise.resolve();
        const estado = pwa.estado;
        if (estado === "ios_manual") {
            pwa.ventana.dispatchEvent(new Event("galeno-abrir-guia"));
            this.dispatchEvent(new CustomEvent("galeno-instalacion",
                { detail: { resultado: "manual" }, bubbles: true, composed: true }));
            return;
        }
        if (estado !== "instalable") return;
        this._ocupada = true;
        return Promise.resolve()
            .then(() => pwa.instalar())
            .then(resultado => {
                if (resultado === "accepted") this._aviso?.mostrar("¡GalenoSV instalada!", "exito");
                else if (resultado === "no-disponible")
                    this._aviso?.mostrar("También puedes instalarla desde el menú o la barra de direcciones de tu navegador", "info");
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
        const estado = pwa?.estado ?? "no_soportado";
        const visible = estado === "instalable" || estado === "ios_manual";
        this.hidden = !visible;
        const raiz = this.plantillas.clonar("plantilla-galeno-boton-instalar");
        const boton = raiz.querySelector("button");
        boton.hidden = !visible;
        boton.addEventListener("click", () => this.pulsar());
        this.shadowRoot.replaceChildren(raiz);
    }
}

customElements.define("galeno-boton-instalar", GalenoBotonInstalar);
