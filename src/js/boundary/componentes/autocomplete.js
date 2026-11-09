// Componente base: <galeno-autocomplete>
// Es el buscador generico. buscador_persona y buscador_tipo_documentos lo extienden.
// No llama al backend: el Model le pasa la lista con `elemento.opciones = [...]`
// y escucha el evento "galeno-seleccion" para saber que eligio el usuario.
class GalenoAutocomplete extends HTMLElement {

    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this._opciones = [];
        this._seleccionado = null;
    }

    // ---- Lo que cambia en cada hijo: como se muestra una opcion ----
    // Si el Model asigna `elemento.formatoTexto = o => ...` se usa esa funcion
    // (sirve para PersonaRol, que no tiene un campo "nombre" propio).
    texto(opcion) {
        if (typeof this.formatoTexto === "function") return String(this.formatoTexto(opcion) ?? "");
        return String(opcion?.[this.getAttribute("campo-texto") || "nombre"] ?? "");
    }

    // Deja una opcion ya elegida (al editar un registro que ya tiene su relacion)
    seleccionar(opcion) {
        this._seleccionado = opcion || null;
        const entrada = this.shadowRoot.querySelector("#q");
        if (entrada) entrada.value = opcion ? this.texto(opcion) : "";
    }

    set opciones(lista) {
        this._opciones = Array.isArray(lista) ? lista : [];
        this.filtrar();
    }
    get opciones() { return this._opciones; }
    get seleccionado() { return this._seleccionado; }

    connectedCallback() {
        this.shadowRoot.innerHTML = `
          <style>
            :host { display:block; font-family:inherit; }
            label { display:block; font-weight:600; margin-bottom:.3rem; }
            input { width:100%; box-sizing:border-box; padding:.55rem .7rem;
                    border:1px solid #829CBC; border-radius:.4rem; font:inherit; }
            ul { list-style:none; margin:.2rem 0 0; padding:0; max-height:12rem; overflow:auto;
                 background:#fff; border:1px solid #829CBC; border-radius:.4rem; }
            li { padding:.5rem .7rem; cursor:pointer; }
            li:hover { background:#EEF5FB; }
            small { color:#1D3461; }
          </style>
          <label for="q">${this.escapar(this.getAttribute("label") || "Buscar")}</label>
          <input id="q" type="search" autocomplete="off"
                 placeholder="${this.escapar(this.getAttribute("placeholder") || "Escriba para buscar...")}">
          <small id="ayuda"></small>
          <ul id="lista" hidden></ul>`;
        const entrada = this.shadowRoot.querySelector("#q");
        entrada.addEventListener("input", () => this.filtrar());
        if (this._seleccionado) entrada.value = this.texto(this._seleccionado);   // preseleccion
    }

    filtrar() {
        const entrada = this.shadowRoot.querySelector("#q");
        if (!entrada) return;                       // todavia no se ha dibujado
        const lista = this.shadowRoot.querySelector("#lista");
        const ayuda = this.shadowRoot.querySelector("#ayuda");
        const termino = entrada.value.trim().toLowerCase();

        const coincidencias = this._opciones
            .filter(o => this.texto(o).toLowerCase().includes(termino))
            .slice(0, 10);

        lista.replaceChildren();
        coincidencias.forEach(opcion => {
            const li = document.createElement("li");
            li.textContent = this.texto(opcion);
            li.addEventListener("click", () => {
                this._seleccionado = opcion;
                entrada.value = this.texto(opcion);
                lista.hidden = true;
                this.dispatchEvent(new CustomEvent("galeno-seleccion",
                    { detail: { valor: opcion }, bubbles: true, composed: true }));
            });
            lista.append(li);
        });

        lista.hidden = termino === "" || coincidencias.length === 0;
        ayuda.textContent = termino === "" ? "" :
            (coincidencias.length ? "" : "Sin resultados");
    }

    limpiar() {
        this._seleccionado = null;
        const entrada = this.shadowRoot.querySelector("#q");
        if (entrada) entrada.value = "";
        this.filtrar();
    }

    escapar(v) {
        return String(v ?? "").replace(/[&<>"']/g,
            c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
    }
}

customElements.define("galeno-autocomplete", GalenoAutocomplete);
