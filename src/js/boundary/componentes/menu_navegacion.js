// <galeno-menu>: el menu del <nav> del index.html (Inicio, Personas, Consultas, Cambio de rol...).
//   menu.items = [ { texto: "Inicio", destino: "inicio" }, { texto: "Consultas", destino: "consulta" } ];
//   menu.activo = "inicio";
//   menu.addEventListener("galeno-navegar", e => mostrarPantalla(e.detail.destino));
// No cambia de pagina por si solo: el Model decide que pantalla mostrar.
class GalenoMenu extends HTMLElement {

    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this._items = [];
        this._activo = null;
    }

    set items(v) { this._items = Array.isArray(v) ? v : []; this.pintar(); }
    set activo(v) { this._activo = v; this.pintar(); }
    get activo() { return this._activo; }

    connectedCallback() { this.pintar(); }

    pintar() {
        this.shadowRoot.innerHTML = `
          <style>
            ul { list-style:none; margin:0; padding:0; }
            button { width:100%; text-align:left; padding:.7rem 1rem; border:0; background:transparent;
                     color:#1D3461; cursor:pointer; font:inherit; }
            button:hover { background:#F8F4E3; }
            button[aria-current=page] { background:#1D3461; color:#fff; font-weight:700; }
          </style>
          <ul></ul>`;
        const ul = this.shadowRoot.querySelector("ul");
        this._items.forEach(item => {
            const li = document.createElement("li");
            const b = document.createElement("button");
            b.type = "button";
            b.textContent = item.texto;
            if (item.destino === this._activo) b.setAttribute("aria-current", "page");
            b.addEventListener("click", () => {
                this._activo = item.destino;
                this.pintar();
                this.dispatchEvent(new CustomEvent("galeno-navegar",
                    { detail: { destino: item.destino }, bubbles: true, composed: true }));
            });
            li.append(b); ul.append(li);
        });
    }
}

customElements.define("galeno-menu", GalenoMenu);
