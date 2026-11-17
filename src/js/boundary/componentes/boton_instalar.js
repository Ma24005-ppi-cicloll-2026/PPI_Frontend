// <galeno-boton-instalar>: pildora discreta de la cabecera para instalar la PWA. Es SOLO
// presentacion: el estado y el dialogo viven en el servicio unico (control/pwa.js).
//   boton.pwa = pwa;            // el objeto Pwa
//   boton.aviso = componente;   // <galeno-notificacion-emergente> para el toast de exito (opcional)
// Visible solo con estado "instalable" o "ios_manual"; oculto si "instalada" o "no_soportado".
// Al pulsar:
//   - "instalable"  -> pwa.instalar(); si acepta, toast "¡GalenoSV instalada!" y desaparece.
//   - "ios_manual"  -> avisa en window con "galeno-abrir-guia" (la abre <galeno-guia-instalacion>).
// En celular queda como icono solo (aria-label + title "Instalar app"); en escritorio, icono + texto.
// Emite "galeno-instalacion" con { resultado }: "accepted", "dismissed" o "manual".
class GalenoBotonInstalar extends HTMLElement {

    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this._pwa = null;
        this._aviso = null;
        this._ocupada = false;
        this.alCambiar = () => this.pintar();
    }

    set pwa(valor) {
        this.quitarEscuchas();
        this._pwa = valor;
        this.ponerEscuchas();
        this.pintar();
    }
    get pwa() { return this._pwa; }

    // toast de exito (opcional: si nadie lo asigna, no se avisa)
    set aviso(valor) { this._aviso = valor; }
    get aviso() { return this._aviso; }

    connectedCallback() { this.ponerEscuchas(); this.pintar(); }
    disconnectedCallback() { this.quitarEscuchas(); }

    ponerEscuchas() {
        if (!this._pwa || !this.isConnected) return;
        this._pwa.ventana.addEventListener("galeno-instalable", this.alCambiar);
        this._pwa.ventana.addEventListener("galeno-instalada", this.alCambiar);
    }
    quitarEscuchas() {
        if (!this._pwa) return;
        this._pwa.ventana.removeEventListener("galeno-instalable", this.alCambiar);
        this._pwa.ventana.removeEventListener("galeno-instalada", this.alCambiar);
    }

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
                // Chromium con el evento retrasado (o app ya instalada): se explica el camino del navegador
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

    pintar() {
        const pwa = this._pwa;
        const estado = pwa?.estado ?? "no_soportado";
        const visible = estado === "instalable" || estado === "ios_manual";
        this.hidden = !visible;   // sin pildora, el anfitrión sale del flujo (no deja hueco)
        this.shadowRoot.innerHTML = `
          <style>
            :host { display:inline-block; }
            :host([hidden]) { display:none; }
            button { display:inline-flex; align-items:center; gap:.4rem; min-height:2.75rem;
                     padding:.35rem .85rem; border:1px solid var(--primario, #2F6F73);
                     border-radius:999px; background:var(--primario-suave, #E9F1EF);
                     color:var(--primario, #2F6F73); cursor:pointer; font:inherit;
                     font-size:var(--fs-1, .875rem); font-weight:600;
                     transition:background var(--velocidad, 180ms), border-color var(--velocidad, 180ms); }
            button:hover { background:var(--secundario, #CFE3DD); border-color:var(--primario-oscuro, #0F6461); }
            button:focus-visible { outline:3px solid var(--foco, #2F6F73); outline-offset:2px; }
            button svg { width:1.1rem; height:1.1rem; flex:0 0 auto; }
            button[hidden] { display:none; }
            /* celular: icono solo (el nombre accesible vive en aria-label y title) */
            @media (max-width:47.9999em) {
                button { padding:.35rem .6rem; }
                .texto { display:none; }
            }
            @media (prefers-reduced-motion: reduce) { button { transition:none; } }
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
