// <galeno-instalar>: el boton "Instalar app". Solo aparece cuando se puede instalar.
//   instalar.pwa = pwa;        // el objeto Pwa (control/pwa.js)
// Flujo: el navegador avisa que se puede instalar -> aparece el boton -> el usuario lo pulsa ->
//        sale el dialogo del navegador -> si acepta, el boton desaparece; si cancela, sigue disponible.
// En iPhone/iPad (sin dialogo propio) el boton muestra los pasos manuales.
// Emite "galeno-instalacion" con { resultado }: "accepted", "dismissed" o "manual".
class GalenoInstalar extends HTMLElement {

    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this._pwa = null;
        this._ayuda = false;
        this.alCambiar = () => this.pintar();
    }

    set pwa(valor) {
        this.quitarEscuchas();
        this._pwa = valor;
        this.ponerEscuchas();
        this.pintar();
    }
    get pwa() { return this._pwa; }

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
        if (!pwa) return;
        if (!pwa.puedeInstalar && pwa.requiereInstruccionManual) {
            this._ayuda = !this._ayuda;
            this.pintar();
            this.emitir("manual");
            return;
        }
        const resultado = await pwa.instalar();
        this.pintar();
        this.emitir(resultado);
    }

    emitir(resultado) {
        this.dispatchEvent(new CustomEvent("galeno-instalacion",
            { detail: { resultado }, bubbles: true, composed: true }));
    }

    pintar() {
        const pwa = this._pwa;
        const visible = Boolean(pwa) && (pwa.puedeInstalar || pwa.requiereInstruccionManual);
        this.shadowRoot.innerHTML = `
          <style>
            :host { display:inline-block; }
            :host([hidden]), .oculto { display:none; }
            button { padding:.45rem .9rem; border:1px solid var(--borde-fuerte, #9FB0B8); border-radius:999px;
                     background:var(--superficie, #fff); color:var(--tinta, #1D3461);
                     cursor:pointer; font:inherit; min-height:2.5rem; font-weight:600; font-size:var(--fs-1, .875rem);
                     transition:background var(--velocidad, 180ms); }
            button:hover { background:var(--primario-suave, #E9F1EF); }
            button:focus-visible { outline:3px solid var(--foco, #2F6F73); outline-offset:2px; }
            p { margin:.5rem 0 0; font-size:var(--fs-0, .75rem); max-width:18rem; color:var(--tinta-suave, #44577B); }
          /* respeta la preferencia de menos movimiento (las transiciones usan --velocidad) */
            @media (prefers-reduced-motion: reduce) { :host { --velocidad:0ms; } }
          </style>
          <div class="${visible ? "" : "oculto"}">
            <button id="instalar" type="button" aria-label="Instalar la aplicación GalenoSV">Instalar app</button>
            ${this._ayuda ? '<p id="ayuda" role="note">En Safari pulse Compartir y luego «Agregar a pantalla de inicio».</p>' : ""}
          </div>`;
        this.shadowRoot.querySelector("#instalar").addEventListener("click", () => this.pulsar());
    }
}

customElements.define("galeno-instalar", GalenoInstalar);
