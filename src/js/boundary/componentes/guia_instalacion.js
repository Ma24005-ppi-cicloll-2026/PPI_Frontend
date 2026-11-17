// <galeno-guia-instalacion>: dialogo accesible con los 3 pasos para instalar la PWA a mano
// en Safari de iPhone/iPad (donde no existe el dialogo del navegador).
// Se abre con "galeno-abrir-guia" en window (lo emiten el boton de la cabecera y la
// invitacion cuando el estado es "ios_manual"). Nadie mas lo abre.
//   guia.addEventListener("galeno-guia-cerrada", ...);   // opcional
// Accesibilidad: role="dialog", aria-modal="true", foco atrapado dentro, Escape cierra
// y devuelve el foco al elemento que lo tenia antes de abrir.
class GalenoGuiaInstalacion extends HTMLElement {

    static PASOS = [
        {
            titulo: "1. Toque Compartir",
            texto: "En Safari, pulse el boton Compartir de la barra inferior.",
            svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M12 15V4m0 0-3 3m3-3 3 3"/><path d="M6 10v8.5A1.5 1.5 0 0 0 7.5 20h9a1.5 1.5 0 0 0 1.5-1.5V10"/></svg>'
        },
        {
            titulo: "2. Elija «Agregar a pantalla de inicio»",
            texto: "Baje en la lista de opciones y elija «Agregar a pantalla de inicio».",
            svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><rect x="6.5" y="2.5" width="11" height="19" rx="2.5"/><path d="M12 18.5h.01"/></svg>'
        },
        {
            titulo: "3. Confirme con «Agregar»",
            texto: "Pulse «Agregar»: GalenoSV queda con su propio icono y pantalla completa.",
            svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><rect x="4.5" y="3" width="15" height="18" rx="2.5"/><path d="M12 8v7.2m0 0-2.7-2.7m2.7 2.7 2.7-2.7"/></svg>'
        }
    ];

    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this._abierta = false;
        this._focoPrevio = null;
        this.alTecla = e => {
            if (!this._abierta) return;
            if (e.key === "Escape") { e.stopPropagation(); this.cerrar(); return; }
            if (e.key === "Tab") this.traparFoco(e);
        };
    }

    connectedCallback() {
        window.addEventListener("keydown", this.alTecla);
        window.addEventListener("galeno-abrir-guia", this.alAbrirGuia = () => this.abrir());
        this.pintar();
    }

    disconnectedCallback() {
        window.removeEventListener("keydown", this.alTecla);
        window.removeEventListener("galeno-abrir-guia", this.alAbrirGuia);
    }

    abrir() {
        if (this._abierta) return;
        this._abierta = true;
        this._focoPrevio = document.activeElement;
        this.pintar();
        const cerrar = this.shadowRoot.querySelector(".cerrar");
        cerrar?.focus();
    }

    cerrar() {
        if (!this._abierta) return;
        this._abierta = false;
        this.pintar();
        this._focoPrevio?.focus?.();
        this._focoPrevio = null;
        this.dispatchEvent(new CustomEvent("galeno-guia-cerrada", { bubbles: true, composed: true }));
    }

    // mantiene Tab (y Shift+Tab) entre los botones del dialogo
    traparFoco(e) {
        const botones = [...this.shadowRoot.querySelectorAll("button:not([hidden])")];
        if (!botones.length) return;
        const i = botones.indexOf(this.shadowRoot.activeElement);
        e.preventDefault();
        const siguiente = e.shiftKey
            ? botones[(i <= 0 ? botones.length : i) - 1]
            : botones[(i + 1) % botones.length];
        siguiente.focus();
    }

    pintar() {
        const pasos = GalenoGuiaInstalacion.PASOS.map(p => `
            <li>
              <span class="icono">${p.svg}</span>
              <span class="paso-texto"><strong>${p.titulo}</strong><small>${p.texto}</small></span>
            </li>`).join("");
        this.shadowRoot.innerHTML = `
          <style>
            :host { display:block; height:0; }
            .fondo { position:fixed; inset:0; z-index:90; display:block;
                     background:rgba(15, 30, 38, .45); }
            .fondo[hidden] { display:none; }
            .caja { position:fixed; left:50%; top:50%; transform:translate(-50%, -50%); z-index:91;
                    display:block;
                    width:min(22rem, calc(100vw - 2rem)); max-height:calc(100vh - 2rem); overflow:auto;
                    background:var(--superficie, #fff); color:var(--tinta, #1D3461);
                    border:1px solid var(--borde, #DCE9F0); border-radius:var(--radio-tarjeta, .875rem);
                    box-shadow:var(--sombra-2, 0 6px 18px rgba(29,52,97,.12));
                    padding:1rem 1.1rem; font-family:inherit;
                    animation:guia-entrada 200ms ease-out; }
            .caja[hidden] { display:none; }
            .encabezado { display:flex; align-items:center; gap:.5rem; }
            .encabezado svg { color:var(--primario, #2F6F73); flex:0 0 auto; }
            h2 { flex:1 1 auto; margin:0; font-size:var(--fs-2, 1rem); }
            .cerrar { flex:0 0 auto; display:inline-flex; align-items:center; justify-content:center;
                      width:2.5rem; height:2.5rem; margin:-.3rem -.4rem 0 0; padding:0; border:0; border-radius:50%;
                      background:none; color:inherit; cursor:pointer; }
            .cerrar:hover { background:var(--celeste, #E3F1F7); }
            .cerrar:focus-visible { outline:3px solid var(--foco, #2F6F73); outline-offset:2px; }
            ol { list-style:none; margin:.8rem 0 0; padding:0; display:grid; gap:.8rem; }
            li { display:flex; align-items:flex-start; gap:.6rem; }
            .icono { width:2.4rem; height:2.4rem; flex:0 0 auto; display:grid; place-items:center;
                     border:1px solid var(--secundario-borde, #AECFC6); border-radius:var(--radio-control, .625rem);
                     background:var(--primario-suave, #E9F1EF); color:var(--primario, #2F6F73); }
            .icono svg { width:1.3rem; height:1.3rem; }
            .paso-texto { display:flex; flex-direction:column; gap:.15rem; font-size:var(--fs-1, .875rem); }
            .paso-texto small { color:var(--tinta-suave, #44577B); }
            .nota { margin:.8rem 0 0; font-size:var(--fs-0, .75rem); color:var(--tinta-suave, #44577B); }
            @keyframes guia-entrada { from { opacity:0; transform:translate(-50%, calc(-50% + 1rem)); }
                                      to { opacity:1; transform:translate(-50%, -50%); } }
            @media (prefers-reduced-motion: reduce) { .caja { animation:none; } }
          </style>
          <div class="fondo" ${this._abierta ? "" : "hidden"}></div>
          <div class="caja" role="dialog" aria-modal="true" aria-labelledby="guia-titulo"
               ${this._abierta ? "" : "hidden"}>
            <div class="encabezado">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8"
                   stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
                <rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18.5h2"/>
              </svg>
              <h2 id="guia-titulo">Instalar GalenoSV en iPhone</h2>
              <button class="cerrar" type="button" aria-label="Cerrar la guía">
                <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"
                     stroke-linecap="round" aria-hidden="true" focusable="false"><path d="m5 5 10 10m0-10L5 15"/></svg>
              </button>
            </div>
            <ol>${pasos}</ol>
            <p class="nota">Pasos de Safari en iPhone o iPad. Solo toma unos segundos y no borra nada.</p>
          </div>`;
        this.shadowRoot.querySelector(".cerrar").addEventListener("click", () => this.cerrar());
    }
}

customElements.define("galeno-guia-instalacion", GalenoGuiaInstalacion);
