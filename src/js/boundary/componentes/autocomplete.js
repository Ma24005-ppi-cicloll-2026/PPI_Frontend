class GalenoAutocomplete extends HTMLElement {

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
        this.shadowRoot.innerHTML = `
          <style>
            :host { display:block; font-family:inherit; color:var(--tinta, #1D3461); position:relative; min-width:0; }
            label { display:block; font-weight:600; margin-bottom:.3rem; font-size:var(--tamano-etiqueta, var(--fs-1, .875rem));
                    white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
            input { width:100%; box-sizing:border-box; height:var(--altura-control, 2.75rem); padding:.6rem .7rem;
                    border:1px solid var(--borde-fuerte, #9FB0B8); border-radius:var(--radio-control, .625rem); font:inherit;
                    color:var(--texto, #26354E); background:var(--superficie, #fff);
                    transition:border-color var(--velocidad, 180ms); }
            input::placeholder { color:var(--texto-placeholder, var(--inactivo, #8CA0A8)); overflow:hidden; text-overflow:ellipsis; }
            ul { list-style:none; margin:.25rem 0 0; padding:0; max-height:12rem; overflow:auto;
                 background:var(--superficie, #fff); border:1px solid var(--borde, #E3EAEA); border-radius:var(--radio-control, .625rem);
                 box-shadow:var(--sombra-2, 0 6px 18px rgba(29,52,97,.10)); z-index:10; }
            li button {
                display:block; width:100%; padding:.5rem .7rem; border:0; background:none;
                color:inherit; font:inherit; font-size:var(--fs-1, .875rem); text-align:start; cursor:pointer;
            }
            li button:hover, li button:focus-visible { background:var(--primario-suave, #E9F1EF); }
            li button:focus-visible { outline:2px solid var(--foco, #2F6F73); outline-offset:-2px; }
            input:focus-visible { outline:3px solid var(--foco, #2F6F73); outline-offset:2px; }
            small { color:var(--tinta-suave, #44577B); font-size:var(--fs-1, .875rem); }
            @media (prefers-reduced-motion: reduce) { :host { --velocidad:0ms; } }
          </style>
          <label for="q">${this.escapar(this.getAttribute("label") || "Buscar")}</label>
          <input id="q" type="search" autocomplete="off"
                 placeholder="${this.escapar(this.getAttribute("placeholder") || "Escriba para buscar...")}">
          <small id="ayuda"></small>
          <ul id="lista" hidden></ul>`;
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
            const li = document.createElement("li");
            const boton = document.createElement("button");
            boton.type = "button";
            boton.textContent = this.texto(opcion);
            li.append(boton);
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

    // Escapa los caracteres con significado en HTML.
    escapar(v) {
        return String(v ?? "").replace(/[&<>"']/g,
            c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
    }
}

customElements.define("galeno-autocomplete", GalenoAutocomplete);
