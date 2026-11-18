class GalenoSelector extends HTMLElement {

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

    // Escapa los caracteres con significado en HTML.
    escapar(v) {
        return String(v ?? "").replace(/[&<>"']/g,
            c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
    }

    // Actualiza la vista con los datos y el estado actuales.
    pintar() {
        const indice = this._opciones.indexOf(this._seleccionado);
        this.shadowRoot.innerHTML = `
          <style>
            :host { display:block; font-family:inherit; color:var(--tinta, #1D3461); min-width:0; }
            label { display:block; font-weight:600; margin-bottom:.3rem; font-size:var(--fs-1, .875rem);
                    white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
            select { width:100%; box-sizing:border-box; padding:.6rem .7rem; border:1px solid var(--borde-fuerte, #9FB0B8);
                     border-radius:var(--radio-control, .625rem); font:inherit; height:2.75rem; background:var(--superficie, #fff);
                     color:var(--texto, #26354E); text-overflow:ellipsis;
                     transition:border-color var(--velocidad, 180ms), background var(--velocidad, 180ms); }
            select:disabled { background:var(--info-fondo, #EDF3F2); border:1px solid var(--borde, #E3EAEA);
                              color:var(--inactivo, #8CA0A8); cursor:not-allowed; }
            select[aria-invalid=true] { border-color:var(--error, #A8402F); border-width:2px; }
            select:focus-visible { outline:3px solid var(--foco, #2F6F73); outline-offset:2px; }
            #error { color:var(--error, #A8402F); font-weight:600; min-height:1.2em; font-size:var(--fs-1, .875rem); }
            #error:empty { display:none; }
            @media (prefers-reduced-motion: reduce) { :host { --velocidad:0ms; } }
          </style>
          <label for="s">${this.escapar(this.getAttribute("label") || "")}</label>
          <select id="s" ${this._deshabilitado ? "disabled" : ""} aria-describedby="error">
            <option value="">${this.escapar(this.getAttribute("placeholder") || "Seleccione...")}</option>
            ${this._opciones.map((o, i) => `<option value="${i}" ${i === indice ? "selected" : ""}>${this.escapar(this.texto(o))}</option>`).join("")}
          </select>
          <div id="error" role="alert"></div>`;
        this.shadowRoot.querySelector("select").addEventListener("change", e => {
            this._seleccionado = e.target.value === "" ? null : this._opciones[Number(e.target.value)];
            this.dispatchEvent(new CustomEvent("galeno-seleccion",
                { detail: { valor: this._seleccionado }, bubbles: true, composed: true }));
        });
    }
}

customElements.define("galeno-selector", GalenoSelector);
