class GalenoInvitacionInstalar extends HTMLElement {

    // Prepara el estado interno antes de montar el componente.
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this._pwa = null;
        this._aviso = null;
        this._ocupada = false;
        this._abierta = false;
        this.alTicket = () => this.invitar();
        this.alTecla = e => { if (e.key === "Escape" && this._abierta) this.cerrar(); };
    }

    // Actualiza el servicio de instalación.
    set pwa(valor) {
        this.quitarEscuchas();
        this._pwa = valor;
        this.ponerEscuchas();
        this.pintar();
    }
    // Devuelve el servicio de instalación.
    get pwa() { return this._pwa; }

    // Actualiza el componente que muestra avisos.
    set aviso(valor) { this._aviso = valor; }
    // Devuelve el componente que muestra avisos.
    get aviso() { return this._aviso; }

    // Prepara el componente cuando se incorpora al documento.
    connectedCallback() { this.ponerEscuchas(); this.pintar(); }
    // Libera las escuchas y recursos al retirar el componente.
    disconnectedCallback() { this.quitarEscuchas(); }

    // Suscribe los eventos que necesita el componente.
    ponerEscuchas() {
        if (!this._pwa || !this.isConnected) return;
        this._pwa.ventana.addEventListener("galeno-ticket-descargado", this.alTicket);
        // Atiende las teclas que controla esta vista.
        this._pwa.ventana.addEventListener("keydown", this.alTecla);
    }
    // Retira las suscripciones del componente.
    quitarEscuchas() {
        if (!this._pwa) return;
        this._pwa.ventana.removeEventListener("galeno-ticket-descargado", this.alTicket);
        this._pwa.ventana.removeEventListener("keydown", this.alTecla);
    }

    // Muestra la invitación cuando el estado de instalación lo permite.
    invitar() {
        if (!this._pwa || !this._pwa.puedeInvitar()) return false;
        this._pwa.marcarInvitacionMostrada();
        this._abierta = true;
        this.pintar();
        return true;
    }

    // Cierra el estado abierto y libera sus recursos.
    cerrar() {
        this._abierta = false;
        this._pwa?.aplazar();
        this.pintar();
        this.dispatchEvent(new CustomEvent("galeno-instalacion",
            { detail: { resultado: "dismissed" }, bubbles: true, composed: true }));
    }

    // Procesa la aceptación de la invitación de instalación.
    aceptar() {
        const pwa = this._pwa;
        if (!pwa || this._ocupada) return Promise.resolve();
        if (pwa.estado === "ios_manual") {
            pwa.ventana.dispatchEvent(new Event("galeno-abrir-guia"));
            this._abierta = false;
            this.pintar();
            this.dispatchEvent(new CustomEvent("galeno-instalacion",
                { detail: { resultado: "manual" }, bubbles: true, composed: true }));
            return;
        }
        this._ocupada = true;
        return Promise.resolve()
            .then(() => pwa.instalar())
            .then(resultado => {
                this._abierta = false;
                if (resultado === "accepted") this._aviso?.mostrar("¡GalenoSV instalada!", "exito");
                this.dispatchEvent(new CustomEvent("galeno-instalacion",
                    { detail: { resultado }, bubbles: true, composed: true }));
            })
            .catch(() => this.dispatchEvent(new CustomEvent("galeno-instalacion",
                { detail: { resultado: "error" }, bubbles: true, composed: true })))
            .finally(() => {
                this._ocupada = false;
                this.pintar();
            });
    }

    // Actualiza la vista con los datos y el estado actuales.
    pintar() {
        const pwa = this._pwa;
        const ios = pwa?.estado === "ios_manual";
        this.shadowRoot.innerHTML = `
          <style>
            :host { display:block; height:0; }
            .tarjeta { position:fixed; z-index:80; display:block;
                       background:var(--superficie, #fff); color:var(--tinta, #1D3461);
                       border:1px solid var(--borde, #DCE9F0); border-radius:var(--radio-tarjeta, .875rem);
                       box-shadow:var(--sombra-2, 0 6px 18px rgba(29,52,97,.12));
                       padding:.9rem 1rem; font-family:inherit; max-width:20rem;
                       animation:invitacion-entrada 200ms ease-out; }
            .tarjeta[hidden] { display:none; }
            @media (max-width:47.9999em) {
                .tarjeta { left:.5rem; right:.5rem; bottom:calc(var(--barra-movil, 0rem) + env(safe-area-inset-bottom, 0px) + .5rem);
                           max-width:none; }
            }
            @media (min-width:48em) {
                .tarjeta { right:1rem; bottom:1.2rem; }
            }
            .encabezado { display:flex; align-items:flex-start; gap:.5rem; }
            .encabezado svg { color:var(--exito, #4F8A6B); flex:0 0 auto; margin-top:.15rem; }
            .titulo { flex:1 1 auto; margin:0; font-size:var(--fs-2, 1rem); font-weight:700; }
            .cerrar { flex:0 0 auto; display:inline-flex; align-items:center; justify-content:center;
                      width:2rem; height:2rem; margin:-.25rem -.3rem 0 0; padding:0; border:0; border-radius:50%;
                      background:none; color:inherit; cursor:pointer; }
            .cerrar:hover { background:var(--celeste, #E3F1F7); }
            .cerrar:focus-visible { outline:3px solid var(--foco, #2F6F73); outline-offset:2px; }
            .texto { margin:.35rem 0 .8rem; font-size:var(--fs-1, .875rem); color:var(--texto, #26354E); }
            .fila { display:flex; align-items:center; gap:.6rem; flex-wrap:wrap; }
            .fila button { min-height:2.75rem; border-radius:999px; padding:.35rem 1rem; cursor:pointer;
                           font:inherit; font-size:var(--fs-1, .875rem); font-weight:600;
                           transition:background var(--velocidad, 180ms); }
            .primario { border:1px solid var(--primario, #2F6F73); background:var(--primario, #2F6F73);
                        color:var(--sobre-primario, #fff); }
            .primario:hover { background:var(--primario-oscuro, #0F6461); }
            .primario:focus-visible { outline:3px solid var(--foco, #2F6F73); outline-offset:2px; }
            .ahora-no { border:0; background:none; color:var(--tinta-suave, #44577B);
                        text-decoration:underline; text-underline-offset:2px; padding:.2rem .4rem; }
            .ahora-no:hover { color:var(--tinta, #1D3461); }
            .ahora-no:focus-visible { outline:3px solid var(--foco, #2F6F73); outline-offset:2px; }
            @keyframes invitacion-entrada { from { opacity:0; transform:translateY(1rem); } to { opacity:1; transform:none; } }
            @media (prefers-reduced-motion: reduce) { .tarjeta { animation:none; } .fila button { transition:none; } }
          </style>
          <div class="tarjeta" role="status" aria-live="polite" ${this._abierta ? "" : "hidden"}>
            <div class="encabezado">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"
                   stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
                <circle cx="12" cy="12" r="9"/><path d="m8 12.2 2.6 2.6L16.4 9"/>
              </svg>
              <h2 class="titulo" id="titulo-invitacion">¡Tu ticket está listo!</h2>
              <button class="cerrar" type="button" aria-label="Cerrar la invitación">
                <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"
                     stroke-linecap="round" aria-hidden="true" focusable="false"><path d="m5 5 10 10m0-10L5 15"/></svg>
              </button>
            </div>
            <p class="texto">Instala GalenoSV y llévalo contigo: acceso directo, pantalla completa y lo que ya
              consultaste disponible incluso sin conexión.</p>
            <div class="fila">
              <button class="primario" type="button">${ios ? "Ver cómo instalar" : "Instalar"}</button>
              <button class="ahora-no" type="button">Ahora no</button>
            </div>
          </div>`;
        const raiz = this.shadowRoot;
        raiz.querySelector(".tarjeta .primario").addEventListener("click", () => this.aceptar());
        raiz.querySelector(".ahora-no").addEventListener("click", () => this.cerrar());
        raiz.querySelector(".cerrar").addEventListener("click", () => this.cerrar());
    }
}

customElements.define("galeno-invitacion-instalar", GalenoInvitacionInstalar);
