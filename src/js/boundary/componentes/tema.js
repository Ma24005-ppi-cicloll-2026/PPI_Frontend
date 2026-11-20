class GalenoTema extends HTMLElement {

    // Moldes HTML del componente.
    plantillas = new Plantillas();

    clave = "galeno-tema";
    orden = ["auto", "claro", "oscuro"];

    // Prepara el estado interno antes de montar el componente.
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this._valor = this.leer();
        this.alCambiarSistema = () => { if (this._valor === "auto") this.pintar(); };
    }

    // Recupera el dato si existe y conserva un formato válido.
    leer() {
        try {
            const v = localStorage.getItem(this.clave);
            return this.orden.includes(v) ? v : "auto";
        } catch (e) { return "auto"; }
    }

    // Guarda el dato o reemplaza la nota del paso correspondiente.
    guardar(v) {
        try { localStorage.setItem(this.clave, v); } catch (e) {   }
    }

    // Devuelve el valor del control.
    get valor() { return this._valor; }

    // Devuelve el estado del tema oscuro.
    get oscuro() {
        if (this._valor === "oscuro") return true;
        if (this._valor === "claro") return false;
        try { return window.matchMedia("(prefers-color-scheme: dark)").matches; }
        catch (e) { return false; }
    }

    // Selecciona la opción indicada.
    elegir(valor) {
        this._valor = this.orden.includes(valor) ? valor : "auto";
        this.guardar(this._valor);
        this.pintar();
        this.dispatchEvent(new CustomEvent("galeno-tema",
            { detail: { valor: this._valor }, bubbles: true, composed: true }));
    }

    // Prepara el componente cuando se incorpora al documento.
    connectedCallback() {
        try { window.matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", this.alCambiarSistema); } catch (e) {}
        this.pintar();
    }

    // Libera las escuchas y recursos al retirar el componente.
    disconnectedCallback() {
        try { window.matchMedia("(prefers-color-scheme: dark)").removeEventListener?.("change", this.alCambiarSistema); } catch (e) {}
    }

    // Aplica el tema seleccionado al documento.
    aplicar(valor) {
        const raiz = document.documentElement;
        if (valor === "claro" || valor === "oscuro") raiz.dataset.tema = valor;
        else delete raiz.dataset.tema;
    }

    // Actualiza la vista con los datos y el estado actuales.
    pintar() {
        this.aplicar(this._valor);
        const oscuro = this.oscuro;
        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta) meta.content = oscuro ? "#0F1E26" : "#F1F8FB";
        const nombres = { auto: "automático", claro: "claro", oscuro: "oscuro" };
        const etiqueta = `Tema: ${nombres[this._valor]}${this._valor === "auto" ? ` (se ve ${oscuro ? "oscuro" : "claro"})` : ""}`;
        const raiz = this.plantillas.clonar("plantilla-galeno-tema");
        const boton = raiz.querySelector("button");
        boton.setAttribute("aria-checked", String(oscuro));
        boton.title = etiqueta;
        boton.setAttribute("aria-label", etiqueta);
        boton.classList.toggle("oscuro", oscuro);
        boton.addEventListener("click", () => {
            const i = this.orden.indexOf(this._valor);
            this.elegir(this.orden[(i + 1) % this.orden.length]);
        });
        this.shadowRoot.replaceChildren(raiz);
    }
}

customElements.define("galeno-tema", GalenoTema);
