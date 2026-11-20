class GalenoAutocomplete extends HTMLElement {

    // Moldes HTML del componente.
    plantillas = new Plantillas();

    // Prepara el estado interno antes de montar el componente.
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this._opciones = [];
        this._seleccionado = null;
    }

    // Obtiene la etiqueta que se muestra para la opción.
    texto(opcion) {
        if (typeof this.formatoTexto === "function") return String(this.formatoTexto(opcion) ?? "");
        return String(opcion?.[this.getAttribute("campo-texto") || "nombre"] ?? "");
    }

    // Fija la opción seleccionada y sincroniza el control.
    seleccionar(opcion) {
        this._seleccionado = opcion || null;
        const entrada = this.shadowRoot.querySelector("#q");
        if (entrada) entrada.value = opcion ? this.texto(opcion) : "";
    }

    // Actualiza las opciones disponibles.
    set opciones(lista) {
        this._opciones = Array.isArray(lista) ? lista : [];
        this.filtrar();
    }
    // Devuelve las opciones disponibles.
    get opciones() { return this._opciones; }
    // Devuelve el valor seleccionado.
    get seleccionado() { return this._seleccionado; }

    // Lleva el foco al control que recibe la entrada.
    focus(opciones) { this.shadowRoot.querySelector("#q")?.focus(opciones); }

    // Prepara el componente cuando se incorpora al documento.
    connectedCallback() {
        const raiz = this.plantillas.clonar("plantilla-galeno-autocomplete");
        raiz.querySelector("label").textContent = this.getAttribute("label") || "Buscar";
        raiz.querySelector("#q").placeholder = this.getAttribute("placeholder") || "Escriba para buscar...";
        this.shadowRoot.replaceChildren(raiz);
        const entrada = this.shadowRoot.querySelector("#q");
        entrada.addEventListener("input", () => this.filtrar());
        if (this._seleccionado) entrada.value = this.texto(this._seleccionado);
    }

    // Actualiza las sugerencias a partir del texto escrito.
    filtrar() {
        const entrada = this.shadowRoot.querySelector("#q");
        if (!entrada) return;
        const lista = this.shadowRoot.querySelector("#lista");
        const ayuda = this.shadowRoot.querySelector("#ayuda");
        const termino = entrada.value.trim().toLowerCase();

        const coincidencias = this._opciones
            .filter(o => this.texto(o).toLowerCase().includes(termino))
            .slice(0, 10);

        lista.replaceChildren();
        coincidencias.forEach(opcion => {
            const li = this.plantillas.clonar("plantilla-galeno-autocomplete-opcion").firstElementChild;
            const boton = li.querySelector("button");
            boton.textContent = this.texto(opcion);
            li.addEventListener("click", () => {
                this._seleccionado = opcion;
                entrada.value = this.texto(opcion);
                lista.hidden = true;
                if (this.shadowRoot.activeElement === boton) this.focus({ preventScroll: true });
                this.dispatchEvent(new CustomEvent("galeno-seleccion",
                    { detail: { valor: opcion }, bubbles: true, composed: true }));
            });
            lista.append(li);
        });

        lista.hidden = termino === "" || coincidencias.length === 0;
        ayuda.textContent = termino === "" ? "" :
            (coincidencias.length ? "" : "Sin resultados");
    }

    // Elimina los datos o la selección que mantiene este objeto.
    limpiar() {
        this._seleccionado = null;
        const entrada = this.shadowRoot.querySelector("#q");
        if (entrada) entrada.value = "";
        this.filtrar();
    }
}

customElements.define("galeno-autocomplete", GalenoAutocomplete);
