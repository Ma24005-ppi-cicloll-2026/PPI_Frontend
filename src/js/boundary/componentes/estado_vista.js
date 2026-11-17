// <galeno-estado-vista>: lo que se ve mientras la pantalla pide datos al backend.
//   estado.mostrar("cargando");                    // esqueleto de carga (skeleton)
//   estado.mostrar("vacio");                       // la lista llego sin registros
//   estado.mostrar("error", "No se pudo listar");  // con boton "Reintentar"
//   estado.mostrar("contenido");                   // no dibuja nada: ya se puede ver la tabla
// Opciones (tercer argumento, opcional):
//   { tarjetas: 6 }   -> en "cargando" dibuja 6 esqueletos con forma de tarjeta en rejilla (dashboard)
//   { arte: true }    -> en "vacio" agrega una ilustracion propia encima del mensaje
// Al pulsar "Reintentar" emite "galeno-reintentar".
class GalenoEstadoVista extends HTMLElement {

    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this._estado = "contenido";
        this._mensaje = "";
        this._opts = {};
    }

    connectedCallback() { this.pintar(); }

    mostrar(estado, mensaje = "", opts = {}) {
        this._estado = estado;
        this._mensaje = mensaje;
        this._opts = opts || {};
        this.pintar();
    }

    get estado() { return this._estado; }

    pintar() {
        const textos = { cargando: "Cargando información...", vacio: "Todavía no hay registros para mostrar." };
        const mensaje = this._mensaje || textos[this._estado] || "";
        const raiz = this.shadowRoot;
        if (this._estado === "contenido" || !mensaje) { raiz.innerHTML = ""; return; }
        if (this._estado === "cargando") {
            const n = Number(this._opts.tarjetas) > 0 ? Number(this._opts.tarjetas) : 0;
            // esqueleto: se ve la forma del contenido mientras llega; el texto va para lectores de pantalla.
            // Con { tarjetas: n } son n tarjetas en rejilla; sin opciones, la caja clasica de siempre.
            raiz.innerHTML = `
          <style>
            :host { display:block; }
            .rejilla-esqueleto { display:grid; gap:.8rem; grid-template-columns:repeat(auto-fill, minmax(min(100%, 18rem), 1fr)); }
            .esqueleto { position:relative; display:grid; gap:.7rem; padding:1rem;
                         border:1px solid var(--borde, #E3EAEA); border-radius:var(--radio-tarjeta, .875rem);
                         background:var(--superficie, #fff); height:100%; box-sizing:border-box; }
            .esqueleto span { display:block; height:.9rem; border-radius:.4rem;
                              background:linear-gradient(90deg, var(--borde, #E3EAEA) 25%, var(--fondo, #F5F8F8) 50%, var(--borde, #E3EAEA) 75%);
                              background-size:12rem 100%; animation:brillo 1.4s ease infinite; }
            .esqueleto span.titulo { width:40%; height:1.1rem; }
            .esqueleto span.larga { width:92%; }
            .esqueleto span.media { width:70%; }
            .esqueleto span.corta { width:35%; }
            .lector { position:absolute; width:1px; height:1px; overflow:hidden; clip-path:inset(50%); white-space:nowrap; }
            @keyframes brillo { from { background-position:12rem 0; } to { background-position:-12rem 0; } }
            @media (prefers-reduced-motion: reduce) { .esqueleto span { animation:none; } }
          </style>
          <div role="status" aria-live="polite">
            <span class="lector">Cargando información...</span>
            ${n > 0
                ? `<div class="rejilla-esqueleto">${Array.from({ length: n }, () => `
                    <div class="esqueleto" aria-hidden="true">
                      <span class="titulo"></span><span class="larga"></span><span class="media"></span><span class="corta"></span>
                    </div>`).join("")}</div>`
                : `<div class="esqueleto"><span class="titulo"></span><span class="larga"></span><span class="media"></span><span class="corta"></span></div>`}
          </div>`;
            return;
        }
        const deError = this._estado === "error";
        const arte = !deError && this._opts.arte
            ? `<svg class="arte" viewBox="0 0 120 70" width="120" height="70" aria-hidden="true" focusable="false">
                 <rect x="14" y="12" width="66" height="46" rx="6" fill="none" stroke="var(--secundario-borde, #AECFC6)" stroke-width="3"/>
                 <path d="M14 24h66" stroke="var(--secundario-borde, #AECFC6)" stroke-width="3"/>
                 <circle cx="22" cy="18" r="2" fill="var(--secundario-borde, #AECFC6)"/>
                 <path d="M24 34h30M24 42h44M24 50h20" stroke="var(--borde, #E3EAEA)" stroke-width="4" stroke-linecap="round"/>
                 <circle cx="92" cy="48" r="14" fill="var(--primario-suave, #E9F1EF)" stroke="var(--primario, #2F6F73)" stroke-width="3"/>
                 <path d="M92 41v14M85 48h14" stroke="var(--primario, #2F6F73)" stroke-width="3" stroke-linecap="round"/>
               </svg>` : "";
        raiz.innerHTML = `
          <style>
            div { padding:1.1rem; border:1px solid var(--borde, #E3EAEA); border-radius:var(--radio-tarjeta, .875rem);
                  font-family:inherit; text-align:center;
                  background:var(--info-fondo, #EDF3F2); color:var(--tinta, #1D3461); }
            div.error { background:var(--error-fondo, #F9EAE6); color:var(--error, #A8402F); border-color:var(--error, #A8402F); }
            .arte { display:block; margin:0 auto .5rem; }
            p { margin:.2rem 0 0; }
            button { margin-left:.6rem; padding:.35rem .9rem; border:0; border-radius:var(--radio-control, .625rem);
                     background:var(--error, #A8402F); color:#fff; cursor:pointer; font:inherit; min-height:2.2rem; }
            button:hover { filter:brightness(.92); }
            button:focus-visible { outline:3px solid var(--foco, #2F6F73); outline-offset:2px; }
          </style>
          <div class="${this._estado}" role="status" aria-live="polite">
            ${arte}
            <span id="texto"></span>
            ${deError ? '<button id="reintentar" type="button">Reintentar</button>' : ""}
          </div>`;
        raiz.querySelector("#texto").textContent = mensaje;     // textContent: seguro
        const b = raiz.querySelector("#reintentar");
        if (b) b.addEventListener("click", () =>
            this.dispatchEvent(new CustomEvent("galeno-reintentar", { bubbles: true, composed: true })));
    }
}

customElements.define("galeno-estado-vista", GalenoEstadoVista);
