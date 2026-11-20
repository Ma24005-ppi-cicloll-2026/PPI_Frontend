class GalenoSegmentado extends HTMLElement {

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
        const conFoco = this.shadowRoot.activeElement?.getAttribute?.("role") === "radio";
        this._seleccionado = this._opciones.includes(opcion) ? opcion : null;
        this.pintar();
        if (conFoco) this.shadowRoot.querySelector('[aria-checked="true"]')?.focus();
        this.dispatchEvent(new CustomEvent("galeno-seleccion",
            { detail: { valor: this._seleccionado }, bubbles: true, composed: true }));
    }

    // Actualiza el mensaje de validación del control.
    error(mensaje) {
        const e = this.shadowRoot?.querySelector("#error");
        if (e) e.textContent = mensaje || "";
    }

    // Desplaza el foco entre las opciones del control.
    moverFoco(desde, paso) {
        const botones = [...this.shadowRoot.querySelectorAll("[role=radio]")];
        if (!botones.length) return;
        const i = (desde + paso + botones.length) % botones.length;
        botones[i].focus();
    }

    // Clona el molde y agrega un botón por cada opción.
    pintar() {
        const indice = this._opciones.indexOf(this._seleccionado);
        const raiz = this.plantillas.clonar("plantilla-galeno-segmentado");
        const grupo = raiz.querySelector(".grupo");
        const etiqueta = this.getAttribute("label");
        if (etiqueta) raiz.querySelector("label").textContent = etiqueta;
        else {
            raiz.querySelector("label").remove();
            grupo.removeAttribute("aria-labelledby");
            grupo.setAttribute("aria-label", "Opciones");
        }
        const botones = this._opciones.map((o, i) => {
            const b = this.plantillas.clonar("plantilla-galeno-segmentado-opcion").firstElementChild;
            b.dataset.i = String(i);
            b.textContent = this.texto(o);
            b.setAttribute("aria-checked", String(i === indice));
            b.tabIndex = i === indice || (indice < 0 && i === 0) ? 0 : -1;
            b.disabled = this._deshabilitado;
            b.addEventListener("click", () => this.seleccionar(this._opciones[i]));
            // Atiende las teclas que controla esta vista.
            b.addEventListener("keydown", ev => {
                const teclas = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
                if (ev.key in teclas) { ev.preventDefault(); this.moverFoco(i, teclas[ev.key]); }
                else if (ev.key === "Home") { ev.preventDefault(); this.moverFoco(i, -i); }
                else if (ev.key === "End") { ev.preventDefault(); this.moverFoco(i, this._opciones.length - 1 - i); }
            });
            return b;
        });
        grupo.append(...botones);
        this.shadowRoot.replaceChildren(raiz);
    }
}

customElements.define("galeno-segmentado", GalenoSegmentado);
