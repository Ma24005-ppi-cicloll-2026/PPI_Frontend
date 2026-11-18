class GalenoSegmentado extends HTMLElement {

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

    // Escapa los caracteres con significado en HTML.
    escapar(v) {
        return String(v ?? "").replace(/[&<>"']/g,
            c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
    }

    // Desplaza el foco entre las opciones del control.
    moverFoco(desde, paso) {
        const botones = [...this.shadowRoot.querySelectorAll("[role=radio]")];
        if (!botones.length) return;
        const i = (desde + paso + botones.length) % botones.length;
        botones[i].focus();
    }

    // Actualiza la vista con los datos y el estado actuales.
    pintar() {
        const indice = this._opciones.indexOf(this._seleccionado);
        // Escapa los textos que se insertan en la plantilla.
        const e = t => this.escapar(t);
        this.shadowRoot.innerHTML = `
          <style>
            :host { display:block; font-family:inherit; color:var(--tinta, #1D3461); min-width:0; }
            label { display:block; font-weight:600; margin-bottom:.3rem; font-size:var(--fs-1, .875rem);
                    white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
            .grupo { display:flex; flex-wrap:wrap; gap:.3rem; align-items:center; min-width:0;
                     background:var(--info-fondo, #EDF3F2); border:1px solid var(--borde, #E3EAEA);
                     border-radius:999px; padding:.2rem; }
            button { font:inherit; font-size:var(--fs-1, .875rem); font-weight:600; cursor:pointer;
                     border:1px solid transparent; border-radius:999px; background:none; color:var(--tinta-suave, #44577B);
                     padding:.4rem .85rem; min-height:2.25rem;
                     transition:background var(--velocidad, 180ms), color var(--velocidad, 180ms), border-color var(--velocidad, 180ms); }
            button:hover { color:var(--tinta, #1D3461); }
            button[aria-checked=true] { background:var(--superficie, #fff); color:var(--primario-oscuro, #25585B);
                                        border-color:var(--secundario-borde, #AECFC6); box-shadow:var(--sombra-1, none); }
            button:disabled { opacity:.55; cursor:not-allowed; }
            button:focus-visible { outline:3px solid var(--foco, #2F6F73); outline-offset:2px; }
            #error { color:var(--error, #A8402F); font-weight:600; font-size:var(--fs-1, .875rem); }
            #error:empty { display:none; }
            @media (prefers-reduced-motion: reduce) { :host { --velocidad:0ms; } }
          </style>
          ${this.getAttribute("label") ? `<label id="etiqueta">${e(this.getAttribute("label"))}</label>` : ""}
          <div class="grupo" role="radiogroup" ${this.getAttribute("label") ? 'aria-labelledby="etiqueta"' : 'aria-label="Opciones"'}>
            ${this._opciones.map((o, i) => `
              <button type="button" role="radio" data-i="${i}"
                      aria-checked="${i === indice}" tabindex="${i === indice ? 0 : (indice < 0 && i === 0 ? 0 : -1)}"
                      ${this._deshabilitado ? "disabled" : ""}>${e(this.texto(o))}</button>`).join("")}
          </div>
          <div id="error" role="alert"></div>`;
        const botones = [...this.shadowRoot.querySelectorAll("[role=radio]")];
        botones.forEach(b => {
            b.addEventListener("click", () => this.seleccionar(this._opciones[Number(b.dataset.i)]));
            // Atiende las teclas que controla esta vista.
            b.addEventListener("keydown", ev => {
                const i = Number(b.dataset.i);
                const teclas = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
                if (ev.key in teclas) { ev.preventDefault(); this.moverFoco(i, teclas[ev.key]); }
                else if (ev.key === "Home") { ev.preventDefault(); this.moverFoco(i, -i); }
                else if (ev.key === "End") { ev.preventDefault(); this.moverFoco(i, botones.length - 1 - i); }
            });
        });
    }
}

customElements.define("galeno-segmentado", GalenoSegmentado);
