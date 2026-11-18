class GalenoNotificacionEmergente extends HTMLElement {

    static ICONOS = {
        exito: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="m8 12.2 2.6 2.6L16.4 9" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
        aviso: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false"><path d="M12 3.5 21.5 20h-19L12 3.5Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M12 9.5v4.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="16.9" r="1.15" fill="currentColor"/></svg>',
        error: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="m9 9 6 6m0-6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
        info:  '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 11v5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="7.8" r="1.15" fill="currentColor"/></svg>'
    };
    static CRUZ = '<svg viewBox="0 0 20 20" width="14" height="14" aria-hidden="true" focusable="false"><path d="m5 5 10 10m0-10L5 15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';

    // Prepara el estado interno antes de montar el componente.
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this._temporizador = null;
        this.alTecla = ev => { if (ev.key === "Escape") this.ocultar(); };
    }

    // Prepara el componente cuando se incorpora al documento.
    connectedCallback() {
        this.shadowRoot.innerHTML = `
          <style>
            #caja { position:fixed; top:1rem; right:1rem; z-index:1000; max-width:22rem;
                    display:flex; align-items:flex-start; gap:.55rem;
                    padding:.8rem .9rem; border-radius:var(--radio-control, .625rem);
                    background:var(--superficie, #fff); color:var(--tinta, #1D3461);
                    border:1px solid var(--borde, #DCE9F0); border-left:6px solid var(--info, #3F78A8);
                    box-shadow:var(--sombra-2, 0 6px 18px rgba(29,52,97,.12)); font-family:inherit;
                    font-size:var(--fs-1, .875rem);
                    animation:toast-entrada var(--velocidad, 180ms) ease-out; }
            #caja[hidden] { display:none; }
            #caja .icono { width:1.15rem; height:1.15rem; flex:0 0 auto; margin-top:.1rem; color:var(--info, #3F78A8); }
            #caja .texto { flex:1 1 auto; font-weight:600; }
            #caja .cerrar { flex:0 0 auto; display:inline-flex; align-items:center; justify-content:center;
                    width:1.6rem; height:1.6rem; margin:-.2rem -.3rem 0 0; padding:0; border:0; border-radius:50%;
                    background:none; color:inherit; cursor:pointer; }
            #caja .cerrar:hover { background:var(--celeste, #E3F1F7); }
            #caja .cerrar:focus-visible { outline:3px solid var(--foco, #2F6F73); outline-offset:2px; }
            #caja .barra { position:absolute; left:0; right:0; bottom:0; height:3px;
                    background:var(--info, #3F78A8); transform-origin:left;
                    animation:toast-tiempo 4000ms linear forwards; }
            #caja.exito { border-left-color:var(--exito, #4F8A6B); }  #caja.exito .icono, #caja.exito .barra { color:var(--exito, #4F8A6B); background-color:var(--exito, #4F8A6B); }
            #caja.aviso { border-left-color:var(--aviso, #B98A3E); }  #caja.aviso .icono, #caja.aviso .barra { color:var(--aviso, #B98A3E); background-color:var(--aviso, #B98A3E); }
            #caja.error { border-left-color:var(--error, #B5524A); }  #caja.error .icono, #caja.error .barra { color:var(--error, #B5524A); background-color:var(--error, #B5524A); }
            #caja.info  { border-left-color:var(--info, #3F78A8); }   #caja.info  .icono, #caja.info  .barra { color:var(--info, #3F78A8); background-color:var(--info, #3F78A8); }
            @keyframes toast-entrada { from { opacity:0; transform:translateY(-.4rem); } to { opacity:1; transform:none; } }
            @keyframes toast-tiempo { from { transform:scaleX(1); } to { transform:scaleX(0); } }
            @media (prefers-reduced-motion: reduce) { #caja { animation:none; } #caja .barra { display:none; } }
          </style>
          <div id="caja" role="status" aria-live="polite" hidden></div>`;
        // Atiende las teclas que controla esta vista.
        this.addEventListener("keydown", this.alTecla);
    }

    // Libera las escuchas y recursos al retirar el componente.
    disconnectedCallback() {
        this.removeEventListener("keydown", this.alTecla);
        clearTimeout(this._temporizador);
    }

    // Presenta el contenido o estado indicado.
    mostrar(mensaje, tipo = "info", milisegundos = 4000) {
        const caja = this.shadowRoot.querySelector("#caja");
        const icono = GalenoNotificacionEmergente.ICONOS[tipo] ?? GalenoNotificacionEmergente.ICONOS.info;
        caja.className = tipo;
        caja.innerHTML = `${icono.replace("<svg ", '<svg class="icono" ')}<span class="texto"></span>` +
            `<button class="cerrar" type="button" aria-label="Cerrar el aviso">${GalenoNotificacionEmergente.CRUZ}</button>` +
            `<span class="barra" aria-hidden="true" style="animation-duration:${milisegundos}ms"></span>`;
        caja.querySelector(".texto").textContent = mensaje;
        caja.querySelector(".cerrar").addEventListener("click", () => this.ocultar());
        caja.hidden = false;
        clearTimeout(this._temporizador);
        this._temporizador = setTimeout(() => this.ocultar(), milisegundos);
    }

    // Retira la interfaz visible.
    ocultar() {
        clearTimeout(this._temporizador);
        this.shadowRoot.querySelector("#caja").hidden = true;
    }
}

customElements.define("galeno-notificacion-emergente", GalenoNotificacionEmergente);
