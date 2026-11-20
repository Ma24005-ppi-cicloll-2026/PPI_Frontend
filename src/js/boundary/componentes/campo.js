class GalenoCampo extends HTMLElement {

    // Moldes HTML del componente.
    plantillas = new Plantillas();

    // Prepara el estado interno antes de montar el componente.
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this.pintado = false;
    }

    // Prepara el componente cuando se incorpora al documento.
    connectedCallback() { if (!this.pintado) this.pintar(); }

    // Devuelve el control de entrada interno.
    get entrada() { return this.shadowRoot.querySelector("input, textarea"); }

    // Actualiza el bloqueo de la entrada.
    set deshabilitado(v) {
        if (!this.pintado) this.pintar();
        this.entrada.disabled = Boolean(v);
    }
    // Devuelve el bloqueo de la entrada.
    get deshabilitado() { return Boolean(this.entrada?.disabled); }

    // Devuelve el valor de la entrada.
    get value() {
        const e = this.entrada;
        if (!e) return this.getAttribute("type") === "checkbox" ? false : "";
        return e.type === "checkbox" ? e.checked : e.value;
    }
    // Actualiza el valor de la entrada.
    set value(v) {
        if (!this.pintado) this.pintar();
        const e = this.entrada;
        if (e.type === "checkbox") e.checked = Boolean(v); else e.value = v ?? "";
    }

    // Lleva el foco al control que recibe la entrada.
    focus() { this.entrada?.focus(); }

    // Actualiza el texto de ayuda.
    set ayuda(v) {
        if (!this.pintado) this.pintar();
        const a = this.shadowRoot.querySelector("#ayuda");
        if (a) a.textContent = v ?? "";
    }

    // Actualiza el mensaje de validación del control.
    error(mensaje) {
        if (!this.pintado) this.pintar();
        this.shadowRoot.querySelector("#error").textContent = mensaje || "";
        this.entrada.setAttribute("aria-invalid", String(Boolean(mensaje)));
    }

    // Clona el molde del campo y lo ajusta según sus atributos.
    pintar() {
        this.pintado = true;
        const tipo = this.getAttribute("type") || "text";
        const raiz = this.plantillas.clonar("plantilla-galeno-campo");
        const quitar = selector => raiz.querySelector(selector)?.remove();
        if (tipo === "checkbox") {
            const casilla = this.plantillas.clonar("plantilla-galeno-campo-casilla");
            casilla.querySelector(".texto").textContent = this.getAttribute("label") || "";
            raiz.querySelector("label").replaceWith(casilla);
            quitar(".fila"); quitar("#ayuda");
        } else {
            raiz.querySelector("label").textContent = this.getAttribute("label") || "";
            if (tipo === "textarea") raiz.querySelector("#c").replaceWith(this.plantillas.clonar("plantilla-galeno-campo-area"));
            else {
                raiz.querySelector("#c").type = tipo;
                raiz.querySelector("#c").setAttribute("autocomplete", this.getAttribute("autocomplete") || "off");
            }
            raiz.querySelector("#c").placeholder = this.getAttribute("placeholder") || "";
            raiz.querySelector("#ayuda").textContent = this.getAttribute("ayuda") || "";
            const texto = tipo !== "textarea";
            if (!(texto && this.getAttribute("icono") === "lupa")) quitar(".icono");
            if (tipo !== "password") quitar("#ver");
            if (!(texto && tipo !== "password" && tipo !== "date" && this.hasAttribute("limpiar"))) quitar("button.x");
        }
        this.shadowRoot.replaceChildren(raiz);
        const e = this.entrada;
        // Emite el cambio con el valor actual del campo.
        const avisar = () => this.dispatchEvent(new CustomEvent("galeno-cambio",
            { detail: { valor: this.value }, bubbles: true, composed: true }));
        e.addEventListener(tipo === "checkbox" ? "change" : "input", avisar);
        const ver = this.shadowRoot.querySelector("#ver");
        if (ver) ver.addEventListener("click", () => {
            const oculto = e.type === "password";
            e.type = oculto ? "text" : "password";
            ver.textContent = oculto ? "Ocultar" : "Mostrar";
            ver.setAttribute("aria-pressed", String(oculto));
        });
        const x = this.shadowRoot.querySelector("button.x");
        if (x) x.addEventListener("click", () => {
            e.value = "";
            e.focus();
            this.dispatchEvent(new CustomEvent("galeno-cambio",
                { detail: { valor: this.value }, bubbles: true, composed: true }));
        });
    }
}

customElements.define("galeno-campo", GalenoCampo);
