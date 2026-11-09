// <galeno-estado-vista>: lo que se ve mientras la pantalla pide datos al backend.
//   estado.mostrar("cargando");
//   estado.mostrar("vacio");                       // la lista llego sin registros
//   estado.mostrar("error", "No se pudo listar");  // con boton "Reintentar"
//   estado.mostrar("contenido");                   // no dibuja nada: ya se puede ver la tabla
// Al pulsar "Reintentar" emite "galeno-reintentar".
class GalenoEstadoVista extends HTMLElement {

    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this._estado = "contenido";
        this._mensaje = "";
    }

    connectedCallback() { this.pintar(); }

    mostrar(estado, mensaje = "") {
        this._estado = estado;
        this._mensaje = mensaje;
        this.pintar();
    }

    get estado() { return this._estado; }

    pintar() {
        const textos = { cargando: "Cargando información...", vacio: "No hay registros para mostrar." };
        const mensaje = this._mensaje || textos[this._estado] || "";
        const raiz = this.shadowRoot;
        if (this._estado === "contenido" || !mensaje) { raiz.innerHTML = ""; return; }
        raiz.innerHTML = `
          <style>
            div { padding:.9rem; border-radius:.5rem; font-family:inherit; text-align:center;
                  background:#EEF5FB; color:#1D3461; }
            div.error { background:#fdecea; color:#b3261e; }
            button { margin-left:.6rem; padding:.3rem .7rem; border:0; border-radius:.4rem;
                     background:#b3261e; color:#fff; cursor:pointer; }
          </style>
          <div class="${this._estado}" role="status" aria-live="polite">
            <span id="texto"></span>
            ${this._estado === "error" ? '<button id="reintentar" type="button">Reintentar</button>' : ""}
          </div>`;
        raiz.querySelector("#texto").textContent = mensaje;     // textContent: seguro
        const b = raiz.querySelector("#reintentar");
        if (b) b.addEventListener("click", () =>
            this.dispatchEvent(new CustomEvent("galeno-reintentar", { bubbles: true, composed: true })));
    }
}

customElements.define("galeno-estado-vista", GalenoEstadoVista);
