class GalenoOpcion extends HTMLElement {

    // Devuelve los iconos del menú.
    static get ICONOS() {
        return {
            cruz: '<rect x="20" y="8" width="24" height="48" rx="5"/><rect x="8" y="20" width="48" height="24" rx="5"/>',
            corazon: '<path d="M32 56 C8 38 6 22 16 14 C23 9 30 13 32 19 C34 13 41 9 48 14 C58 22 56 38 32 56Z"/>',
            diente: '<path d="M18 10 C26 6 30 14 32 14 C34 14 38 6 46 10 C54 14 50 30 46 40 C43 52 40 58 37 52 C34 44 34 38 32 38 C30 38 30 44 27 52 C24 58 21 52 18 40 C14 30 10 14 18 10Z"/>',
            ojo: '<path d="M4 32 C16 14 48 14 60 32 C48 50 16 50 4 32Z"/><circle cx="32" cy="32" r="9" fill="#fff"/><circle cx="32" cy="32" r="4"/>',
            bebe: '<circle cx="32" cy="20" r="12"/><path d="M12 58 C12 40 22 34 32 34 C42 34 52 40 52 58Z"/>',
            general: '<circle cx="32" cy="32" r="26" fill="none" stroke="currentColor" stroke-width="6"/><rect x="28" y="16" width="8" height="32" rx="2"/><rect x="16" y="28" width="32" height="8" rx="2"/>'
        };
    }

    // Elige el icono que corresponde al tipo de opción.
    static iconoPara(texto) {
        const t = String(texto ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
        if (/cardi|corazon/.test(t)) return "corazon";
        if (/dent|odont|diente/.test(t)) return "diente";
        if (/oft|ojo|vista|optic/.test(t)) return "ojo";
        if (/pediat|bebe|nino|materno|mater/.test(t)) return "bebe";
        if (/emerg|urgen|hospital|general/.test(t)) return "cruz";
        return "general";
    }

    // Prepara el estado interno antes de montar el componente.
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this._datos = {};
        this._seleccionada = false;
    }

    // Actualiza los datos de la vista.
    set datos(v) { this._datos = v || {}; this.pintar(); }
    // Devuelve los datos de la vista.
    get datos() { return this._datos; }
    // Actualiza la opción seleccionada.
    set seleccionada(v) { this._seleccionada = Boolean(v); this.pintar(); }
    // Devuelve la opción seleccionada.
    get seleccionada() { return this._seleccionada; }

    // Prepara el componente cuando se incorpora al documento.
    connectedCallback() { this.pintar(); }

    // Escapa los caracteres con significado en HTML.
    escapar(v) {
        return String(v ?? "").replace(/[&<>"']/g,
            c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
    }

    // Actualiza la vista con los datos y el estado actuales.
    pintar() {
        const d = this._datos;
        const activo = d.activo !== false;
        const icono = GalenoOpcion.ICONOS[d.icono] ?? GalenoOpcion.ICONOS.general;
        this.shadowRoot.innerHTML = `
          <style>
            :host { display:block; }
            button { width:100%; height:100%; text-align:center; font:inherit; color:var(--tinta, #1D3461); background:var(--superficie, #fff);
                     border:1.5px solid var(--borde-fuerte, #9FB0B8); border-radius:var(--radio-tarjeta, .875rem); padding:.8rem; cursor:pointer;
                     display:grid; gap:.3rem; justify-items:center; align-content:start; position:relative; min-height:3rem;
                     transition:border-color var(--velocidad, 180ms), background var(--velocidad, 180ms), box-shadow var(--velocidad, 180ms); }
            button:hover:not([disabled]) { border-color:var(--primario, #2F6F73); box-shadow:var(--sombra-1, none); }
            button:focus-visible { outline:3px solid var(--foco, #2F6F73); outline-offset:2px; }
            button[aria-pressed=true] { border-color:var(--exito, #3E7C59); background:var(--exito-fondo, #E9F3ED); }
            button[disabled] { opacity:.55; cursor:not-allowed; background:var(--fondo, #F5F8F8); }
            svg { width:3.5rem; height:3.5rem; fill:var(--tinta, #1D3461); color:var(--tinta, #1D3461); }
            strong { font-size:1.05rem; }
            small { color:var(--tinta-suave, #44577B); }
            .marca { position:absolute; top:.4rem; right:.5rem; color:var(--exito, #3E7C59); font-weight:700; }
            @media (prefers-reduced-motion: reduce) { :host { --velocidad:0ms; } }
          </style>
          <button type="button" aria-pressed="${this._seleccionada}" ${activo ? "" : "disabled"}>
            ${this.hasAttribute("sin-icono") ? "" : `<svg viewBox="0 0 64 64" aria-hidden="true">${icono}</svg>`}
            <strong>${this.escapar(d.titulo)}</strong>
            ${d.detalle ? `<small>${this.escapar(d.detalle)}</small>` : ""}
            ${activo ? "" : "<small>No disponible</small>"}
            ${this._seleccionada ? '<span class="marca" aria-hidden="true">✓</span>' : ""}
          </button>`;
        this.shadowRoot.querySelector("button").addEventListener("click", () => {
            if (!activo) return;
            this.dispatchEvent(new CustomEvent("galeno-elegir", { detail: { id: d.id }, bubbles: true, composed: true }));
        });
    }
}

customElements.define("galeno-opcion", GalenoOpcion);
