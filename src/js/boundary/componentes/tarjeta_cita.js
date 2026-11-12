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
        const dia = f ? f.toLocaleDateString("es-SV", { day: "2-digit", month: "short", year: "numeric" }) : "—";
        const hora = f ? f.toLocaleTimeString("es-SV", { hour: "2-digit", minute: "2-digit" }) : "—";
        const procedimientos = c.procedimientos?.length
            ? `<ul>${c.procedimientos.map(p => `<li>${this.escapar(p)}</li>`).join("")}</ul>`
            : "<p>Sin procedimientos registrados</p>";
        this.shadowRoot.innerHTML = `
          <style>
            :host { display:block; font-family:inherit; }
            article { background:#fff; color:#1D3461; border:2px solid #1D3461; border-radius:.8rem; padding:1rem; height:100%; box-sizing:border-box; }
            .cuando { display:flex; gap:1.5rem; flex-wrap:wrap; }
            dt { font-weight:700; margin-top:.5rem; }
            dd { margin:0; }
            ul { margin:.25rem 0 0; padding-left:1.2rem; }
            button { margin-top:1rem; width:100%; min-height:2.75rem; padding:.5rem .8rem; border:0; border-radius:.5rem;
                     background:#1D3461; color:#fff; cursor:pointer; font:inherit; }
            button:disabled { background:#829CBC; cursor:progress; }
            button:focus-visible { outline:3px solid #629DCB; outline-offset:2px; }
          </style>
          <article aria-label="Cita del ${this.escapar(dia)}">
            <dl>
              <div class="cuando">
                <div><dt>Fecha</dt><dd>${this.escapar(dia)}</dd></div>
                <div><dt>Hora</dt><dd>${this.escapar(hora)}</dd></div>
              </div>
              <dt>Clínica</dt><dd>${this.escapar(c.clinica || "—")}</dd>
              <dt>Procedimientos</dt><dd>${procedimientos}</dd>
            </dl>
            <button id="ticket" type="button" ${c.ocupada ? "disabled" : ""}>${c.ocupada ? "Generando ticket..." : "Descargar ticket (PDF)"}</button>
          </article>`;
        this.shadowRoot.querySelector("#ticket").addEventListener("click", () =>
            this.dispatchEvent(new CustomEvent("galeno-descargar-ticket",
                { detail: { idConsulta: c.idConsulta }, bubbles: true, composed: true })));
    }
}

customElements.define("galeno-tarjeta-cita", GalenoTarjetaCita);
