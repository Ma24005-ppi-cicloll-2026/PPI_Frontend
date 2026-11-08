// <galeno-notificacion-emergente>: aviso que aparece arriba y se esconde solo.
// Uso desde un Model:
//   notificacion.mostrar("Registro guardado", "exito");   // tipos: exito, error, info
class GalenoNotificacionEmergente extends HTMLElement {

    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this._temporizador = null;
    }

    connectedCallback() {
        this.shadowRoot.innerHTML = `
          <style>
            div { position:fixed; top:1rem; right:1rem; z-index:1000; max-width:22rem;
                  padding:.8rem 1rem; border-radius:.5rem; color:#fff; font-family:inherit;
                  box-shadow:0 2px 8px rgba(0,0,0,.3); }
            div[hidden] { display:none; }
            .exito { background:#2e7d32; }
            .error { background:#b3261e; }
            .info  { background:#1D3461; }
          </style>
          <div id="caja" role="status" aria-live="polite" hidden></div>`;
    }

    mostrar(mensaje, tipo = "info", milisegundos = 4000) {
        const caja = this.shadowRoot.querySelector("#caja");
        caja.className = tipo;
        caja.textContent = mensaje;          // textContent: no interpreta HTML
        caja.hidden = false;
        clearTimeout(this._temporizador);
        this._temporizador = setTimeout(() => this.ocultar(), milisegundos);
    }

    ocultar() {
        this.shadowRoot.querySelector("#caja").hidden = true;
    }
}

customElements.define("galeno-notificacion-emergente", GalenoNotificacionEmergente);
