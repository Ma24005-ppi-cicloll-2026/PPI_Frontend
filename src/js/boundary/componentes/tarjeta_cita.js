// <galeno-tarjeta-cita>: una cita medica como card (HU1: Busqueda de citas).
//   tarjeta.cita = { idConsulta, fechaInicio, clinica, procedimientos: ["Consulta general", ...], ocupada: false };
// Muestra fecha, hora, clinica y procedimientos, y el boton "Descargar ticket (PDF)".
// Al pulsarlo emite "galeno-descargar-ticket" { idConsulta }; `ocupada = true` desactiva el boton mientras se descarga.
class GalenoTarjetaCita extends HTMLElement {

    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this._cita = null;
    }

    set cita(v) { this._cita = v; this.pintar(); }
    get cita() { return this._cita; }

    set ocupada(v) {
        if (this._cita) this._cita = { ...this._cita, ocupada: Boolean(v) };
        this.pintar();
    }

    connectedCallback() { this.pintar(); }

    escapar(v) {
        return String(v ?? "").replace(/[&<>"']/g,
            c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
    }

    pintar() {
        const c = this._cita || {};
        const f = GestorFechas.leer(c.fechaInicio);
        const dia = f ? f.toLocaleDateString("es-SV", { day: "2-digit" }) : "—";
        const mes = f ? f.toLocaleDateString("es-SV", { month: "short" }).replace(".", "") : "—";
        const anio = f ? f.getFullYear() : "";
        const hora = f ? f.toLocaleTimeString("es-SV", { hour: "2-digit", minute: "2-digit" }) : "—";
        const procedimientos = c.procedimientos?.length
            ? `<ul class="chips">${c.procedimientos.map(p => `<li>${this.escapar(p)}</li>`).join("")}</ul>`
            : "<p class='sin'>Sin procedimientos registrados</p>";
        this.shadowRoot.innerHTML = `
          <style>
            :host { display:block; font-family:inherit; height:100%; }
            article { background:var(--superficie, #fff); color:var(--tinta, #1D3461); border:1px solid var(--borde, #E3EAEA);
                      border-radius:var(--radio-tarjeta, .875rem); padding:.8rem; height:100%; box-sizing:border-box;
                      box-shadow:var(--sombra-1, none); display:flex; gap:.8rem;
                      transition:box-shadow var(--velocidad, 180ms), border-color var(--velocidad, 180ms), transform var(--velocidad, 180ms); }
            article:hover { box-shadow:var(--sombra-2, none); border-color:var(--secundario-borde, #AECFC6); transform:translateY(-2px); }
            /* insignia de fecha: dia y mes grandes a la izquierda */
            .fecha { flex:0 0 auto; width:3.4rem; display:flex; flex-direction:column; align-items:center; justify-content:center;
                     gap:.05rem; background:var(--primario-suave, #E9F1EF); border:1px solid var(--secundario-borde, #AECFC6);
                     border-radius:var(--radio-control, .625rem); padding:.5rem .2rem; text-align:center; }
            .fecha .dia { font-size:var(--fs-4, 1.75rem); font-weight:700; line-height:1.1; color:var(--tinta, #1D3461); }
            .fecha .mes { font-size:var(--fs-0, .75rem); font-weight:700; text-transform:uppercase; letter-spacing:.06em;
                          color:var(--primario-oscuro, #25585B); }
            .fecha .anio { font-size:var(--fs-0, .75rem); color:var(--tinta-suave, #44577B); }
            .cuerpo { display:flex; flex-direction:column; gap:.35rem; min-width:0; flex:1 1 auto; }
            .hora, .lugar { display:flex; align-items:center; gap:.4rem; margin:0; font-weight:600; color:var(--tinta, #1D3461); }
            .hora svg, .lugar svg { color:var(--primario, #2F6F73); flex:0 0 auto; }
            .lugar { color:var(--tinta-suave, #44577B); font-weight:600; font-size:var(--fs-1, .875rem); }
            ul.chips { list-style:none; display:flex; flex-wrap:wrap; gap:.35rem; margin:.25rem 0 0; padding:0; }
            ul.chips li { background:var(--secundario, #CFE3DD); color:var(--tinta, #1D3461); border:1px solid var(--secundario-borde, #AECFC6);
                          border-radius:999px; padding:.15rem .7rem; font-size:var(--fs-0, .75rem); font-weight:600; }
            p.sin { margin:.25rem 0 0; color:var(--tinta-suave, #44577B); font-size:var(--fs-1, .875rem); }
            button { margin-top:auto; width:100%; min-height:2.75rem; padding:.5rem .8rem; border:0; border-radius:var(--radio-control, .625rem);
                     background:var(--primario, #2F6F73); color:var(--sobre-primario, #fff); cursor:pointer; font:inherit; font-weight:600;
                     display:inline-flex; align-items:center; justify-content:center; gap:.5rem;
                     transition:background var(--velocidad, 180ms); }
            button:hover:not(:disabled) { background:var(--primario-oscuro, #25585B); }
            button:disabled { background:var(--inactivo, #8CA0A8); cursor:progress; }
            button:focus-visible { outline:3px solid var(--foco, #2F6F73); outline-offset:2px; }
            button svg { flex:0 0 auto; }
          /* respeta la preferencia de menos movimiento (las transiciones usan --velocidad) */
            @media (prefers-reduced-motion: reduce) { :host { --velocidad:0ms; } }
          </style>
          <article aria-label="Cita del ${this.escapar(dia)} de ${this.escapar(mes)} de ${this.escapar(anio)} a las ${this.escapar(hora)}">
            <div class="fecha" aria-hidden="true">
              <span class="dia">${this.escapar(dia)}</span>
              <span class="mes">${this.escapar(mes)}</span>
              <span class="anio">${this.escapar(anio)}</span>
            </div>
            <div class="cuerpo">
              <p class="hora">
                <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true" focusable="false">
                  <circle cx="10" cy="10" r="7" fill="none" stroke="currentColor" stroke-width="1.6"/>
                  <path d="M10 6v4.2l2.8 1.7" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
                </svg>
                ${this.escapar(hora)}
              </p>
              <p class="lugar">
                <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true" focusable="false">
                  <path d="M10 18s-6.5-4.35-6.5-9A3.8 3.8 0 0 1 10 6.6 3.8 3.8 0 0 1 16.5 9c0 4.65-6.5 9-6.5 9z"
                        fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>
                </svg>
                ${this.escapar(c.clinica || "—")}
              </p>
              ${procedimientos}
              <button id="ticket" type="button" ${c.ocupada ? "disabled" : ""}>
                <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true" focusable="false">
                  <path d="M10 3v9m0 0 3.5-3.5M10 12 6.5 8.5M4 16.5h12" fill="none" stroke="currentColor"
                        stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                ${c.ocupada ? "Generando ticket..." : "Descargar ticket (PDF)"}
              </button>
            </div>
          </article>`;
        this.shadowRoot.querySelector("#ticket").addEventListener("click", () =>
            this.dispatchEvent(new CustomEvent("galeno-descargar-ticket",
                { detail: { idConsulta: c.idConsulta }, bubbles: true, composed: true })));
    }
}

customElements.define("galeno-tarjeta-cita", GalenoTarjetaCita);
