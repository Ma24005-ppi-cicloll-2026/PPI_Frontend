// <galeno-paginador>: Anterior / Siguiente para las listas que usan service.listar(primero, max).
//   paginador.tamano = 10;
//   paginador.addEventListener("galeno-cambiar-pagina", e => { const { primero, max } = e.detail; ... });
//   despues de cada listar():   paginador.actualizar(filas.length);              // total desconocido
//                               paginador.actualizar(filas.length, totalDatos);  // si se conoce el total
// Sin total (DefaultResponse.totalDatos = -1) se sabe que no hay mas paginas cuando
// llegan menos filas que `tamano`.
class GalenoPaginador extends HTMLElement {

    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this._pagina = 1;
        this._tamano = 10;
        this._hayMas = false;
        this._total = -1;
    }

    set tamano(v) { this._tamano = Math.max(1, Number(v) || 10); this.pintar(); }
    get tamano() { return this._tamano; }
    get pagina() { return this._pagina; }
    get primero() { return (this._pagina - 1) * this._tamano; }

    connectedCallback() { this.pintar(); }

    actualizar(cantidadRecibida, total = -1) {
        this._total = Number(total);
        this._hayMas = this._total >= 0
            ? this.primero + cantidadRecibida < this._total
            : cantidadRecibida >= this._tamano;
        this.pintar();
    }

    reiniciar() { this._pagina = 1; this._hayMas = false; this._total = -1; this.pintar(); }

    pintar() {
        const paginas = this._total >= 0 ? Math.max(1, Math.ceil(this._total / this._tamano)) : null;
        this.shadowRoot.innerHTML = `
          <style>
            nav { display:flex; gap:.8rem; align-items:center; justify-content:center;
                  font-family:inherit; color:#1D3461; padding:.5rem; }
            button { padding:.4rem .8rem; border:0; border-radius:.4rem; background:#1D3461; color:#fff; cursor:pointer; }
            button:disabled { background:#829CBC; cursor:not-allowed; }
          </style>
          <nav aria-label="Paginación">
            <button id="ant" type="button" ${this._pagina <= 1 ? "disabled" : ""}>Anterior</button>
            <span>Página ${this._pagina}${paginas ? " de " + paginas : ""}</span>
            <button id="sig" type="button" ${this._hayMas ? "" : "disabled"}>Siguiente</button>
          </nav>`;
        this.shadowRoot.querySelector("#ant").addEventListener("click", () => this.ir(this._pagina - 1));
        this.shadowRoot.querySelector("#sig").addEventListener("click", () => this.ir(this._pagina + 1));
    }

    ir(pagina) {
        if (pagina < 1) return;
        this._pagina = pagina;
        this.pintar();
        this.dispatchEvent(new CustomEvent("galeno-cambiar-pagina", {
            detail: { pagina, primero: this.primero, max: this._tamano },
            bubbles: true, composed: true
        }));
    }
}

customElements.define("galeno-paginador", GalenoPaginador);
