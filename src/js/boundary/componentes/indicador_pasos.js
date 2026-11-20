class GalenoIndicadorPasos extends HTMLElement {

    // Moldes HTML del componente.
    plantillas = new Plantillas();

    // Prepara el estado interno antes de montar el componente.
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this._pasos = [];
        this._vista = 0;
    }

    // Actualiza los pasos del procedimiento.
    set pasos(v) { this._pasos = Array.isArray(v) ? v : []; this.pintar(); }
    // Devuelve los pasos del procedimiento.
    get pasos() { return this._pasos; }
    // Actualiza el índice del paso visible.
    set vista(v) { this._vista = v; this.pintar(); }
    // Devuelve el índice del paso visible.
    get vista() { return this._vista; }

    // Prepara el componente cuando se incorpora al documento.
    connectedCallback() { this.pintar(); }

    // Clona el molde y agrega un botón por cada paso.
    pintar() {
        const raiz = this.plantillas.clonar("plantilla-galeno-indicador-pasos");
        raiz.querySelector("ol").append(...this._pasos.map((p, i) => {
            const li = this.plantillas.clonar("plantilla-galeno-indicador-pasos-paso").firstElementChild;
            const b = li.querySelector("button");
            if (p.estado) b.querySelector(".punto").classList.add(p.estado);
            b.querySelector(".nombre").textContent = `${p.nombre ?? ""}${p.estado === "hecho" ? " ✓" : ""}`;
            b.disabled = p.estado === "pendiente";
            if (i === this._vista) b.setAttribute("aria-current", "step");
            b.setAttribute("aria-label", `${p.nombre}${p.estado === "hecho" ? " (hecho)" : p.estado === "actual" ? " (paso actual)" : ""}`);
            b.addEventListener("click", () => this.dispatchEvent(new CustomEvent("galeno-ir-paso",
                { detail: { indice: i }, bubbles: true, composed: true })));
            return li;
        }));
        this.shadowRoot.replaceChildren(raiz);
    }
}

customElements.define("galeno-indicador-pasos", GalenoIndicadorPasos);
