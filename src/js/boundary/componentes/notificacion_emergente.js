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
                  padding:.8rem 1rem .8rem 1.1rem; border-radius:var(--radio-control, .625rem); color:#fff; font-family:inherit;
                  font-size:var(--fs-1, .875rem); font-weight:600;
                  border-left:5px solid rgba(255,255,255,.55);
                  box-shadow:var(--sombra-2, 0 6px 18px rgba(29,52,97,.10)); }
            div[hidden] { display:none; }
            .exito { background:var(--exito, #3E7C59); }
            .error { background:var(--error, #A8402F); }
            .info  { background:var(--tinta, #1D3461); }
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
