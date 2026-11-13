// <galeno-instalar>: tarjeta amable que invita a instalar la PWA. Solo aparece cuando se puede
// instalar. Ofrece 3 beneficios breves y se puede descartar con "Ahora no" (no vuelve a molestar
// en ESA SESION; la marca queda en sessionStorage con try/catch).
//   instalar.pwa = pwa;        // el objeto Pwa (control/pwa.js)
// Flujo: el navegador avisa que se puede instalar -> aparece la tarjeta -> "Instalar app" ->
//        sale el dialogo del navegador -> si acepta, la tarjeta desaparece; si cancela, sigue disponible.
// En iPhone/iPad (sin dialogo propio) el boton muestra los pasos manuales.
// Emite "galeno-instalacion" con { resultado }: "accepted", "dismissed" o "manual".
class GalenoInstalar extends HTMLElement {

    static CLAVE = "galeno-instalar-descarte";
    static BENEFICIOS = [
        '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false"><path d="M13 2 4.5 13.5h5L10 22l8.5-11.5h-5L13 2Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',
        '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false"><path d="M7 16a4.5 4.5 0 0 1-.4-9A5.5 5.5 0 0 1 17.3 8.6 3.9 3.9 0 0 1 17 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="m9.5 18.5 1.6-3.2m2.9 3.2 1.6-3.2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
        '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false"><rect x="7" y="2.5" width="10" height="19" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M11 18.5h2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>'
    ];

    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this._pwa = null;
        this._ayuda = false;
        this.alCambiar = () => this.pintar();
    }

    set pwa(valor) {
        this.quitarEscuchas();
        this._pwa = valor;
        this.ponerEscuchas();
        this.pintar();
    }
    get pwa() { return this._pwa; }

    connectedCallback() { this.ponerEscuchas(); this.pintar(); }
    disconnectedCallback() { this.quitarEscuchas(); }

    ponerEscuchas() {
        if (!this._pwa || !this.isConnected) return;
        this._pwa.ventana.addEventListener("galeno-instalable", this.alCambiar);
        this._pwa.ventana.addEventListener("galeno-instalada", this.alCambiar);
    }
    quitarEscuchas() {
        if (!this._pwa) return;
        this._pwa.ventana.removeEventListener("galeno-instalable", this.alCambiar);
        this._pwa.ventana.removeEventListener("galeno-instalada", this.alCambiar);
    }

    // la tarjeta se descarto en esta sesion? (sessionStorage, tolerante a almacen bloqueado)
    static descartada() {
        try { return sessionStorage.getItem(GalenoInstalar.CLAVE) === "1"; } catch (e) { return false; }
    }

    descartar() {
        try { sessionStorage.setItem(GalenoInstalar.CLAVE, "1"); } catch (e) { /* sin almacen: solo se esconde ahora */ }
        this.pintar();
    }

    async pulsar() {
        const pwa = this._pwa;
        if (!pwa) return;
        if (!pwa.puedeInstalar && pwa.requiereInstruccionManual) {
            this._ayuda = !this._ayuda;
            this.pintar();
            this.emitir("manual");
            return;
        }
        const resultado = await pwa.instalar();
        this.pintar();
        this.emitir(resultado);
    }

    emitir(resultado) {
        this.dispatchEvent(new CustomEvent("galeno-instalacion",
            { detail: { resultado }, bubbles: true, composed: true }));
    }

    pintar() {
        const pwa = this._pwa;
        const visible = Boolean(pwa) && (pwa.puedeInstalar || pwa.requiereInstruccionManual) && !GalenoInstalar.descartada();
        const [rapida, sinRed, directa] = GalenoInstalar.BENEFICIOS;
        this.shadowRoot.innerHTML = `
          <style>
            :host { display:inline-block; }
            :host([hidden]), .oculto { display:none; }
            /* tarjeta amable flotante: sale del flujo de la cabecera y no la desborda */
            .tarjeta { position:fixed; right:.9rem; bottom:calc(var(--barra-movil, 0rem) + env(safe-area-inset-bottom, 0px) + 1rem);
                       z-index:60; max-width:19rem;
                       background:var(--superficie, #fff); color:var(--tinta, #1D3461);
                       border:1px solid var(--borde, #DCE9F0); border-radius:var(--radio-tarjeta, .875rem);
                       box-shadow:var(--sombra-2, 0 6px 18px rgba(29,52,97,.12));
                       padding:.9rem 1rem; font-family:inherit; }
            @media (min-width:48em) { .tarjeta { bottom:1.2rem; } }
            .titulo { display:flex; align-items:center; gap:.45rem; margin:0 0 .45rem;
                      font-size:var(--fs-1, .875rem); font-weight:700; }
            .titulo svg { color:var(--primario, #2F6F73); flex:0 0 auto; }
            ul { list-style:none; margin:0 0 .7rem; padding:0; display:grid; gap:.3rem; }
            li { display:flex; align-items:flex-start; gap:.45rem; font-size:var(--fs-0, .75rem);
                 color:var(--texto, #26354E); }
            li svg { color:var(--primario, #2F6F73); flex:0 0 auto; margin-top:.1rem; }
            .fila { display:flex; align-items:center; gap:.6rem; flex-wrap:wrap; }
            button { padding:.45rem .9rem; border:1px solid var(--borde-fuerte, #9FB0B8); border-radius:999px;
                     background:var(--primario, #2F6F73); color:var(--sobre-primario, #fff);
                     cursor:pointer; font:inherit; min-height:2.5rem; font-weight:600; font-size:var(--fs-1, .875rem);
                     transition:background var(--velocidad, 180ms); }
            button:hover { background:var(--primario-oscuro, #0F6461); }
            button:focus-visible { outline:3px solid var(--foco, #2F6F73); outline-offset:2px; }
            button.ahora-no { background:none; border:0; color:var(--tinta-suave, #44577B);
                              text-decoration:underline; text-underline-offset:2px; min-height:2rem; padding:.2rem .2rem; }
            button.ahora-no:hover { background:none; color:var(--tinta, #1D3461); }
            p { margin:.5rem 0 0; font-size:var(--fs-0, .75rem); color:var(--tinta-suave, #44577B); }
          /* respeta la preferencia de menos movimiento (las transiciones usan --velocidad) */
            @media (prefers-reduced-motion: reduce) { :host { --velocidad:0ms; } }
          </style>
          <div class="${visible ? "tarjeta" : "oculto"}">
            <p class="titulo">
              <svg viewBox="0 0 32 32" width="18" height="18" aria-hidden="true" focusable="false"><rect x="2.5" y="2.5" width="27" height="27" rx="8" fill="none" stroke="currentColor" stroke-width="2.5"/><path d="M16 9.5v13M9.5 16h13" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
              Lleve GalenoSV consigo
            </p>
            <ul>
              <li>${rapida}<span>Más rápida cada vez que la abre</span></li>
              <li>${sinRed}<span>Funciona sin conexión con sus datos guardados</span></li>
              <li>${directa}<span>Acceso directo desde su pantalla de inicio</span></li>
            </ul>
            <div class="fila">
              <button id="instalar" type="button" aria-label="Instalar la aplicación GalenoSV">Instalar app</button>
              <button id="descartar" class="ahora-no" type="button" aria-label="Ahora no (no vuelve a molestar en esta sesión)">Ahora no</button>
            </div>
            ${this._ayuda ? '<p id="ayuda" role="note">En Safari pulse Compartir y luego «Agregar a pantalla de inicio».</p>' : ""}
          </div>`;
        this.shadowRoot.querySelector("#instalar").addEventListener("click", () => this.pulsar());
        this.shadowRoot.querySelector("#descartar").addEventListener("click", () => this.descartar());
    }
}

customElements.define("galeno-instalar", GalenoInstalar);
