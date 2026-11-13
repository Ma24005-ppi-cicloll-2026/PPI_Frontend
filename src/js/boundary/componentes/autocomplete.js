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
            :host { display:block; font-family:inherit; color:var(--tinta, #1D3461); position:relative; min-width:0; }
            label { display:block; font-weight:600; margin-bottom:.3rem; font-size:var(--fs-1, .875rem);
                    white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
            input { width:100%; box-sizing:border-box; height:2.75rem; padding:.6rem .7rem;
                    border:1px solid var(--borde-fuerte, #9FB0B8); border-radius:var(--radio-control, .625rem); font:inherit;
                    color:var(--texto, #26354E); background:var(--superficie, #fff);
                    transition:border-color var(--velocidad, 180ms); }
            input::placeholder { color:var(--inactivo, #8CA0A8); overflow:hidden; text-overflow:ellipsis; }
            ul { list-style:none; margin:.25rem 0 0; padding:0; max-height:12rem; overflow:auto;
                 background:var(--superficie, #fff); border:1px solid var(--borde, #E3EAEA); border-radius:var(--radio-control, .625rem);
                 box-shadow:var(--sombra-2, 0 6px 18px rgba(29,52,97,.10)); z-index:10; }
            li { padding:.5rem .7rem; cursor:pointer; font-size:var(--fs-1, .875rem); }
            li:hover { background:var(--primario-suave, #E9F1EF); }
            input:focus-visible { outline:3px solid var(--foco, #2F6F73); outline-offset:2px; }
            small { color:var(--tinta-suave, #44577B); font-size:var(--fs-1, .875rem); }
          /* respeta la preferencia de menos movimiento (las transiciones usan --velocidad) */
            @media (prefers-reduced-motion: reduce) { :host { --velocidad:0ms; } }
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
