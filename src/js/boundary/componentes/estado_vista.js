class GalenoEstadoVista extends HTMLElement {

    // Moldes HTML del componente.
    plantillas = new Plantillas();

    // Prepara el estado interno antes de montar el componente.
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this._estado = "contenido";
        this._mensaje = "";
        this._opts = {};
    }

    // Prepara el componente cuando se incorpora al documento.
    connectedCallback() { this.pintar(); }

    // Presenta el contenido o estado indicado.
    mostrar(estado, mensaje = "", opts = {}) {
        this._estado = estado;
        this._mensaje = mensaje;
        this._opts = opts || {};
        this.pintar();
    }

    // Devuelve el estado actual.
    get estado() { return this._estado; }

    // Actualiza la vista con los datos y el estado actuales.
    pintar() {
        const textos = { cargando: "Cargando información...", vacio: "Todavía no hay registros para mostrar." };
        const mensaje = this._mensaje || textos[this._estado] || "";
        if (this._estado === "contenido" || !mensaje) { this.shadowRoot.replaceChildren(); return; }
        if (this._estado === "cargando") {
            const raiz = this.plantillas.clonar("plantilla-galeno-estado-cargando");
            const n = Number(this._opts.tarjetas) > 0 ? Number(this._opts.tarjetas) : 0;
            const rejilla = raiz.querySelector(".rejilla-esqueleto");
            const esqueletos = Array.from({ length: Math.max(n, 1) }, () => this.plantillas.clonar("plantilla-galeno-estado-esqueleto"));
            if (n > 0) rejilla.append(...esqueletos);
            else {
                const unico = esqueletos[0].firstElementChild;
                unico.removeAttribute("aria-hidden");
                rejilla.replaceWith(unico);
            }
            this.shadowRoot.replaceChildren(raiz);
            return;
        }
        const deError = this._estado === "error";
        const raiz = this.plantillas.clonar("plantilla-galeno-estado-mensaje");
        raiz.querySelector("div").className = this._estado;
        if (deError || !this._opts.arte) raiz.querySelector(".arte").remove();
        raiz.querySelector("#texto").textContent = mensaje;
        const b = raiz.querySelector("#reintentar");
        if (deError) b.addEventListener("click", () =>
            this.dispatchEvent(new CustomEvent("galeno-reintentar", { bubbles: true, composed: true })));
        else b.remove();
        this.shadowRoot.replaceChildren(raiz);
    }
}

customElements.define("galeno-estado-vista", GalenoEstadoVista);
