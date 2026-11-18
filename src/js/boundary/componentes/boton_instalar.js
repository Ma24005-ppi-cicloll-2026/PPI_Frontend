class GalenoBotonInstalar extends HTMLElement {

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
    async pulsar() {
        const pwa = this._pwa;
        if (!pwa || this._ocupada) return;
        const estado = pwa.estado;
        if (estado === "ios_manual") {
            pwa.ventana.dispatchEvent(new Event("galeno-abrir-guia"));
            this.dispatchEvent(new CustomEvent("galeno-instalacion",
                { detail: { resultado: "manual" }, bubbles: true, composed: true }));
            return;
        }
        if (estado !== "instalable") return;
        this._ocupada = true;
        try {
            const resultado = await pwa.instalar();
            if (resultado === "accepted") this._aviso?.mostrar("¡GalenoSV instalada!", "exito");
            else if (resultado === "no-disponible")
                this._aviso?.mostrar("También puedes instalarla desde el menú o la barra de direcciones de tu navegador", "info");
            this.dispatchEvent(new CustomEvent("galeno-instalacion",
                { detail: { resultado }, bubbles: true, composed: true }));
        } catch (e) {
            this.dispatchEvent(new CustomEvent("galeno-instalacion",
                { detail: { resultado: "error" }, bubbles: true, composed: true }));
        } finally {
            this._ocupada = false;
            this.pintar();
        }
    }

    // Actualiza la vista con los datos y el estado actuales.
    pintar() {
        const pwa = this._pwa;
        const estado = pwa?.estado ?? "no_soportado";
        const visible = estado === "instalable" || estado === "ios_manual";
        this.hidden = !visible;
        this.shadowRoot.innerHTML = `
          <style>
            :host { display:inline-block; }
            :host([hidden]) { display:none; }
            button { display:inline-flex; align-items:center; gap:.4rem; min-height:2.75rem;
                     padding:.35rem .85rem; border:1px solid var(--instalar-borde, #527C80);
                     border-radius:999px; background:var(--instalar-fondo, #E9F1EF);
                     color:var(--tinta, #1D3461); cursor:pointer; font:inherit;
                     font-size:var(--fs-1, .875rem); font-weight:600; }
            button:hover { background:var(--instalar-hover, #CFE3DD); border-color:var(--foco, #2F6F73); }
            button:focus-visible { outline:3px solid var(--foco, #2F6F73); outline-offset:2px; }
            button svg { width:1.1rem; height:1.1rem; flex:0 0 auto; }
            button[hidden] { display:none; }
            @media (max-width:47.9999em) {
                button { padding:.35rem .6rem; }
                .texto { display:none; }
            }
          </style>
          <button type="button" ${visible ? "" : "hidden"} aria-label="Instalar app" title="Instalar app">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
                 stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
              <rect x="4.5" y="3" width="15" height="18" rx="2.5"/>
              <path d="M12 8v7.2m0 0-2.7-2.7m2.7 2.7 2.7-2.7"/>
            </svg>
            <span class="texto">Instalar app</span>
          </button>`;
        this.shadowRoot.querySelector("button").addEventListener("click", () => this.pulsar());
    }
}

customElements.define("galeno-boton-instalar", GalenoBotonInstalar);
