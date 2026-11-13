// <galeno-menu>: el menu del <nav> del index.html (Buscar citas, Dashboard, Cerrar sesion...).
//   menu.items = [ { texto: "Inicio", destino: "inicio" }, { texto: "Consultas", destino: "consulta" } ];
//   menu.activo = "inicio";
//   menu.addEventListener("galeno-navegar", e => mostrarPantalla(e.detail.destino));
// No cambia de pagina por si solo: el Model decide que pantalla mostrar.
// Cada destino lleva su icono SVG de trazo fino (GalenoMenu.ICONOS) y el texto siempre se escapa.
class GalenoMenu extends HTMLElement {

    // Iconos por destino: trazo fino, currentColor, 20px. "general" es el punto de reserva.
    static ICONOS = {
        citas: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><rect x="3.5" y="5" width="17" height="15.5" rx="2.2"/><path d="M3.5 9.5h17M8 2.8v4.2M16 2.8v4.2"/><path d="m8.6 14.6 2.1 2.1 4.4-4.5"/></svg>`,
        login: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><circle cx="12" cy="8.2" r="3.4"/><path d="M5.5 20c.9-3.3 3.4-5.1 6.5-5.1s5.6 1.8 6.5 5.1"/></svg>`,
        dashboard: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><rect x="4" y="4" width="7" height="7" rx="1.6"/><rect x="13" y="4" width="7" height="7" rx="1.6"/><rect x="4" y="13" width="7" height="7" rx="1.6"/><rect x="13" y="13" width="7" height="7" rx="1.6"/></svg>`,
        salir: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M10.5 4H6.2A2.2 2.2 0 0 0 4 6.2v11.6A2.2 2.2 0 0 0 6.2 20h4.3"/><path d="m15 8 4 4-4 4M19 12H9.5"/></svg>`,
        general: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="4.2"/></svg>`
    };

    // Marca del menu lateral (solo se ve en escritorio, dentro del shadow)
    static MARCA = `<svg viewBox="0 0 32 32" fill="none" aria-hidden="true" focusable="false"><circle cx="16" cy="16" r="14" fill="currentColor" opacity=".14"/><path d="M16 9.5v13M9.5 16h13" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>`;

    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this._items = [];
        this._activo = null;
    }

    get items() { return this._items; }
    set items(v) { this._items = Array.isArray(v) ? v : []; this.pintar(); }
    set activo(v) { this._activo = v; this.pintar(); }
    get activo() { return this._activo; }

    connectedCallback() { this.pintar(); }

    // escapa el texto antes de meterlo en el shadow (los items vienen del Model, pero por prudencia)
    static escapar(t) {
        const d = document.createElement("div");
        d.textContent = t == null ? "" : String(t);
        return d.innerHTML;
    }

    pintar() {
        this.shadowRoot.innerHTML = `
          <style>
            :host { display:block; }
            .marca { display:none; margin:0; align-items:center; gap:.55rem;
                     padding:1.05rem 1.1rem .55rem;
                     color:var(--sobre-tinta, #F2F6F9); font-weight:700; font-size:var(--fs-2, 1rem); letter-spacing:.02em; }
            .marca svg { width:1.45rem; height:1.45rem; flex:0 0 auto; }
            ul { list-style:none; margin:0; padding:.35rem .55rem .7rem;
                 display:flex; gap:.2rem; overflow-x:auto; scrollbar-width:none; }
            ul::-webkit-scrollbar { display:none; }
            li { flex:0 0 auto; }
            button { position:relative; display:inline-flex; flex-direction:column; align-items:center; gap:.25rem;
                     min-width:4.25rem; min-height:3.25rem; padding:.45rem .7rem .6rem;
                     border:1px solid transparent; border-radius:var(--radio-control, .625rem);
                     background:transparent; color:var(--sobre-tinta, #F2F6F9);
                     font:inherit; font-size:var(--fs-0, .75rem); font-weight:600; line-height:1.15;
                     text-align:center; white-space:nowrap; cursor:pointer;
                     transition:background-color 150ms ease, color 150ms ease; }
            button svg { width:1.25rem; height:1.25rem; flex:0 0 auto; }
            button:hover { background:var(--tinta-hover, #254370); }
            button:focus-visible { outline:3px solid var(--secundario, #CFE3DD); outline-offset:2px; }
            button[aria-current=page] { background:var(--secundario, #CFE3DD); color:var(--tinta, #1D3461); font-weight:700; }
            /* movil: linea inferior terracota bajo la pildora activa */
            button[aria-current=page]::after { content:""; position:absolute; left:22%; right:22%; bottom:.22rem;
                                               height:3px; border-radius:2px; background:var(--acento, #C9775B); }
            /* escritorio: barra lateral vertical con la marca arriba */
            @media (min-width: 48em) {
                :host { display:flex; flex-direction:column; height:100%; }
                .marca { display:flex; flex:0 0 auto; padding:1.1rem 1.1rem .6rem; }
                ul { flex:1 1 auto; flex-direction:column; gap:.15rem; overflow:visible; padding:.4rem .7rem .9rem; }
                li { flex:none; }
                button { flex-direction:row; gap:.65rem; width:100%; min-width:0; min-height:2.75rem;
                         padding:.55rem .8rem; text-align:left; font-size:var(--fs-1, .875rem); }
                /* escritorio: barra lateral terracota junto a la pildora activa */
                button[aria-current=page]::after { left:-.7rem; right:auto; top:22%; bottom:22%; width:4px; height:auto; }
            }
            /* respeta la preferencia de menos movimiento (las transiciones son de 150ms) */
            @media (prefers-reduced-motion: reduce) { * { transition:none !important; } }
          </style>
          <p class="marca">${GalenoMenu.MARCA}<span>GalenoSV</span></p>
          <ul></ul>`;
        const ul = this.shadowRoot.querySelector("ul");
        this._items.forEach(item => {
            const li = document.createElement("li");
            const b = document.createElement("button");
            b.type = "button";
            b.innerHTML = (GalenoMenu.ICONOS[item.destino] || GalenoMenu.ICONOS.general)
                + `<span>${GalenoMenu.escapar(item.texto)}</span>`;
            if (item.destino === this._activo) b.setAttribute("aria-current", "page");
            b.addEventListener("click", () => {
                this._activo = item.destino;
                this.pintar();
                this.dispatchEvent(new CustomEvent("galeno-navegar",
                    { detail: { destino: item.destino }, bubbles: true, composed: true }));
            });
            li.append(b); ul.append(li);
        });
    }
}

customElements.define("galeno-menu", GalenoMenu);
