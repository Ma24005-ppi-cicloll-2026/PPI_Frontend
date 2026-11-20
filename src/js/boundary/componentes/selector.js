class GalenoSelector extends HTMLElement {

    // Moldes HTML del componente.
    plantillas = new Plantillas();

    // Prepara el estado interno antes de montar el componente.
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this._opciones = [];
        this._seleccionado = null;
        this._deshabilitado = false;
    }

    // Obtiene la etiqueta que se muestra para la opción.
    texto(opcion) {
        if (typeof this.formatoTexto === "function") return String(this.formatoTexto(opcion) ?? "");
        return String(opcion?.nombre ?? "");
    }

    // Actualiza las opciones disponibles.
    set opciones(lista) {
        this._opciones = Array.isArray(lista) ? lista : [];
        if (!this._opciones.includes(this._seleccionado)) this._seleccionado = null;
        this.pintar();
    }
    // Devuelve las opciones disponibles.
    get opciones() { return this._opciones; }
    // Devuelve el valor seleccionado.
    get seleccionado() { return this._seleccionado; }

    // Actualiza el bloqueo de la entrada.
    set deshabilitado(v) { this._deshabilitado = Boolean(v); this.pintar(); }
    // Devuelve el bloqueo de la entrada.
    get deshabilitado() { return this._deshabilitado; }

    // Prepara el componente cuando se incorpora al documento.
    connectedCallback() { this.pintar(); }

    // Fija la opción seleccionada y sincroniza el control.
    seleccionar(opcion) {
        this._seleccionado = this._opciones.includes(opcion) ? opcion : null;
        this.pintar();
    }

    // Actualiza el mensaje de validación del control.
    error(mensaje) {
        const e = this.shadowRoot.querySelector("#error");
        if (e) e.textContent = mensaje || "";
        this.shadowRoot.querySelector("select")?.setAttribute("aria-invalid", String(Boolean(mensaje)));
    }

    // Clona el molde y agrega una opción por cada elemento de la lista.
    pintar() {
        const indice = this._opciones.indexOf(this._seleccionado);
        const raiz = this.plantillas.clonar("plantilla-galeno-selector");
        raiz.querySelector("label").textContent = this.getAttribute("label") || "";
        const select = raiz.querySelector("select");
        select.disabled = this._deshabilitado;
        select.options[0].textContent = this.getAttribute("placeholder") || "Seleccione...";
        this._opciones.forEach((o, i) => select.append(new Option(this.texto(o), String(i), false, i === indice)));
        this.shadowRoot.replaceChildren(raiz);
        select.addEventListener("change", e => {
            this._seleccionado = e.target.value === "" ? null : this._opciones[Number(e.target.value)];
            this.dispatchEvent(new CustomEvent("galeno-seleccion",
                { detail: { valor: this._seleccionado }, bubbles: true, composed: true }));
        });
    }
}

customElements.define("galeno-selector", GalenoSelector);
