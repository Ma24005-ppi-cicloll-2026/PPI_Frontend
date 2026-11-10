// <galeno-tarjeta-consulta>: muestra una Consulta (campos de la entidad del backend).
//   tarjeta.consulta = consulta;   // objeto que devuelve ConsultaService
// Si el usuario pulsa "Ver detalle" emite "galeno-abrir-consulta" con el idConsulta.
// Con el atributo `sin-boton` no dibuja el boton (cuando la tarjeta ya es el detalle).
// Con el atributo `con-paciente` muestra tambien el nombre del paciente.
// Con el atributo `turno="3"` el titulo dice "Turno 3" (sala de espera).
class GalenoTarjetaConsulta extends HTMLElement {

    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this._consulta = null;
    }

    set consulta(valor) { this._consulta = valor; this.pintar(); }
    get consulta() { return this._consulta; }

    connectedCallback() { this.pintar(); }

    formatear(fecha) {
        if (!fecha) return "—";
        const d = new Date(String(fecha).replace(/\[.*\]$/, ""));   // quita el "[UTC]" del backend
        return isNaN(d) ? "—" : d.toLocaleString("es-SV");
    }

    pintar() {
        const c = this._consulta || {};
        this.shadowRoot.innerHTML = `
          <style>
            article { background:#fff; color:#1D3461; border-left:6px solid #629DCB;
                      border-radius:.5rem; padding:1rem; font-family:inherit;
                      box-shadow:0 1px 4px rgba(0,0,0,.2); }
            h3 { margin:0 0 .5rem; }
            p { margin:.25rem 0; }
            button { margin-top:.5rem; padding:.4rem .8rem; border:0; border-radius:.4rem;
                     background:#1D3461; color:#fff; cursor:pointer; }
          </style>
          <article>
            <h3>${this.hasAttribute("turno") ? "Turno " + this.escapar(this.getAttribute("turno")) : "Consulta"}</h3>
            ${this.hasAttribute("con-paciente") ? `<p><strong>Paciente:</strong> ${this.escapar(this.nombrePaciente(c))}</p>` : ""}
            <p><strong>Inicio:</strong> ${this.formatear(c.fechaInicio)}</p>
            <p><strong>Fin:</strong> ${c.fechaFin ? this.formatear(c.fechaFin) : "En curso"}</p>
            <p><strong>Referencia:</strong> ${this.escapar(c.referenciaExterna || "—")}</p>
            <p><strong>Observaciones:</strong> ${this.escapar(c.observaciones || "Sin observaciones")}</p>
            ${this.hasAttribute("sin-boton") ? "" : '<button id="ver" type="button">Ver detalle</button>'}
          </article>`;
        const ver = this.shadowRoot.querySelector("#ver");
        if (ver) ver.addEventListener("click", () =>
            this.dispatchEvent(new CustomEvent("galeno-abrir-consulta",
                { detail: { idConsulta: c.idConsulta }, bubbles: true, composed: true })));
    }

    nombrePaciente(c) {
        const p = c.idPersonaRol?.idPersona;
        return `${p?.nombres ?? ""} ${p?.apellidos ?? ""}`.trim() || "—";
    }

    escapar(v) {
        return String(v ?? "").replace(/[&<>"']/g,
            c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
    }
}

customElements.define("galeno-tarjeta-consulta", GalenoTarjetaConsulta);
