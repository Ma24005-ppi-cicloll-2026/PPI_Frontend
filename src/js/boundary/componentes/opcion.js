class GalenoOpcion extends HTMLElement {

    // Moldes HTML del componente.
    plantillas = new Plantillas();

    // Elige el icono que corresponde al tipo de opción.
    iconoPara(texto) {
        const t = String(texto ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
        if (/cardi|corazon/.test(t)) return "corazon";
        if (/dent|odont|diente/.test(t)) return "diente";
        if (/oft|ojo|vista|optic/.test(t)) return "ojo";
        if (/pediat|bebe|nino|materno|mater/.test(t)) return "bebe";
        if (/emerg|urgen|hospital|general/.test(t)) return "cruz";
        return "general";
    }

    // Prepara el estado interno antes de montar el componente.
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this._datos = {};
        this._seleccionada = false;
    }

    // Actualiza los datos de la vista.
    set datos(v) { this._datos = v || {}; this.pintar(); }
    // Devuelve los datos de la vista.
    get datos() { return this._datos; }
    // Actualiza la opción seleccionada.
    set seleccionada(v) { this._seleccionada = Boolean(v); this.pintar(); }
    // Devuelve la opción seleccionada.
    get seleccionada() { return this._seleccionada; }

    // Prepara el componente cuando se incorpora al documento.
    connectedCallback() { this.pintar(); }

    // Clona el molde de la opción y muestra solo las partes que aplican.
    pintar() {
        const d = this._datos;
        const activo = d.activo !== false;
        const raiz = this.plantillas.clonar("plantilla-galeno-opcion");
        const boton = raiz.querySelector("button");
        boton.setAttribute("aria-pressed", String(this._seleccionada));
        boton.disabled = !activo;
        if (this.hasAttribute("sin-icono")) raiz.querySelector("svg").remove();
        else {
            const molde = document.getElementById("icono-opcion-" + d.icono) ? "icono-opcion-" + d.icono : "icono-opcion-general";
            raiz.querySelector("svg").replaceWith(this.plantillas.clonar(molde));
        }
        raiz.querySelector(".titulo").textContent = d.titulo ?? "";
        if (d.detalle) raiz.querySelector(".detalle").textContent = d.detalle;
        else raiz.querySelector(".detalle").remove();
        if (activo) raiz.querySelector(".no-disponible").remove();
        if (!this._seleccionada) raiz.querySelector(".marca").remove();
        this.shadowRoot.replaceChildren(raiz);
        boton.addEventListener("click", () => {
            if (!activo) return;
            this.dispatchEvent(new CustomEvent("galeno-elegir", { detail: { id: d.id }, bubbles: true, composed: true }));
        });
    }
}

customElements.define("galeno-opcion", GalenoOpcion);
