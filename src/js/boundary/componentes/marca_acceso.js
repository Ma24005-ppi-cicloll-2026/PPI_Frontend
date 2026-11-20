class GalenoMarcaAcceso extends HTMLElement {

    // Moldes HTML del componente.
    plantillas = new Plantillas();
    // Prepara el estado interno antes de montar el componente.
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
    }

    // Monta la marca y adapta su contenido al ancho de la pantalla de acceso.
    connectedCallback() {
        this.shadowRoot.replaceChildren(this.plantillas.clonar("plantilla-galeno-marca-acceso"));
    }
}

customElements.define("galeno-marca-acceso", GalenoMarcaAcceso);
