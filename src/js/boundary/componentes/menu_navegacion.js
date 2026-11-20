class GalenoMenu extends HTMLElement {

    // Moldes HTML del componente.
    plantillas = new Plantillas();

    // Prepara el estado interno antes de montar el componente.
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this._items = [];
        this._activo = null;
    }

    // Devuelve las opciones del menú.
    get items() { return this._items; }
    // Actualiza las opciones del menú.
    set items(v) { this._items = Array.isArray(v) ? v : []; this.pintar(); }
    // Actualiza el destino activo.
    set activo(v) { this._activo = v; this.pintar(); }
    // Devuelve el destino activo.
    get activo() { return this._activo; }

    // Prepara el componente cuando se incorpora al documento.
    connectedCallback() { this.pintar(); }

    // Devuelve una copia del icono del destino, o el general si no tiene uno propio.
    icono(destino) {
        const id = document.getElementById("icono-menu-" + destino) ? "icono-menu-" + destino : "icono-menu-general";
        return this.plantillas.clonar(id);
    }

    // Clona el molde del menú y agrega un botón por cada destino.
    pintar() {
        const raiz = this.plantillas.clonar("plantilla-galeno-menu");
        const ul = raiz.querySelector("ul");
        this._items.forEach(item => {
            const li = this.plantillas.clonar("plantilla-galeno-menu-item").firstElementChild;
            const b = li.querySelector("button");
            b.querySelector(".icono").replaceWith(this.icono(item.destino));
            b.querySelector(".texto").textContent = item.texto ?? "";
            if (item.destino === this._activo) b.setAttribute("aria-current", "page");
            b.addEventListener("click", () => {
                this._activo = item.destino;
                this.pintar();
                this.dispatchEvent(new CustomEvent("galeno-navegar",
                    { detail: { destino: item.destino }, bubbles: true, composed: true }));
            });
            ul.append(li);
        });
        this.shadowRoot.replaceChildren(raiz);
    }
}

customElements.define("galeno-menu", GalenoMenu);
