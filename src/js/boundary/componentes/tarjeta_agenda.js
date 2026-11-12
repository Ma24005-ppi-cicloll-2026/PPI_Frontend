// <galeno-tarjeta-agenda>: una consulta del Dashboard del empleado (HU3).
//   tarjeta.datos = {
//     idConsulta, paciente: { nombre, edad, documento }, fechaInicio, titulo,
//     procedimientos: [{ nombre, pasos: [{ idPaso, nombre, estado, quien, rol, fecha }] }],
//     puedeAtender: true }
// Muestra al paciente, la fecha de inicio y los pasos ya realizados en jerarquia (procedimiento > pasos) con
// quien los hizo y cuando. Eventos:
//   "galeno-ver-registro" { idPaso }      boton "Ver registro" de un paso
//   "galeno-atender" { idConsulta }       boton "Atender consulta"
class GalenoTarjetaAgenda extends HTMLElement {

    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this._datos = null;
    }

    set datos(v) { this._datos = v; this.pintar(); }
    get datos() { return this._datos; }

    connectedCallback() { this.pintar(); }

    escapar(v) {
        return String(v ?? "").replace(/[&<>"']/g,
            c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
    }

    pintar() {
        const d = this._datos || {};
        const p = d.paciente || {};
        const e = t => this.escapar(t);
        const pasos = proc => proc.pasos.length
            ? `<ul class="pasos">${proc.pasos.map(s => `
                <li>
                  <span class="marca ${s.estado === DatosClinica.COMPLETADO ? "hecho" : "curso"}" aria-hidden="true">${s.estado === DatosClinica.COMPLETADO ? "✓" : "…"}</span>
                  <span class="paso"><strong>${e(s.nombre)}</strong>
                    <small>${e(s.quien || "—")}${s.rol ? " · " + e(s.rol) : ""}</small></span>
                  <time>${e(Agenda.hora(s.fecha))}</time>
                  <button type="button" class="ver" data-paso="${e(s.idPaso)}" aria-label="Ver registro de ${e(s.nombre)}">Ver registro</button>
                </li>`).join("")}</ul>`
            : `<p class="sin">Aún sin pasos realizados</p>`;
        this.shadowRoot.innerHTML = `
          <style>
            :host { display:block; font-family:inherit; }
            article { background:#fff; color:#1D3461; border:2px solid #1D3461; border-radius:.8rem; padding:1rem;
                      height:100%; box-sizing:border-box; display:flex; flex-direction:column; gap:.5rem; }
            header { display:flex; justify-content:space-between; gap:1rem; }
            h3 { margin:0; font-size:1.1rem; }
            header small, .sin { color:#3A4F73; }
            .cuando { text-align:right; font-size:.9rem; }
            h4 { margin:.6rem 0 .2rem; font-size:.95rem; }
            ul { list-style:none; margin:0; padding:0; }
            .pasos li { display:grid; grid-template-columns:auto 1fr auto auto; gap:.5rem; align-items:center; padding:.3rem 0; border-top:1px solid #DCE6F1; }
            .marca { width:1.4rem; height:1.4rem; border-radius:50%; display:grid; place-items:center; font-size:.8rem; color:#fff; background:#5D7899; }
            .marca.hecho { background:#1B7F4B; }
            .paso { display:flex; flex-direction:column; }
            small { color:#3A4F73; }
            time { font-size:.85rem; }
            button { font:inherit; cursor:pointer; border-radius:.4rem; min-height:2.2rem; }
            .ver { border:1px solid #1D3461; background:#fff; color:#1D3461; padding:0 .5rem; font-size:.8rem; }
            .atender { margin-top:auto; min-height:2.75rem; border:0; background:#1D3461; color:#fff; padding:.5rem .8rem; }
            .final { margin:auto 0 0; font-weight:600; }
            .atender:disabled { background:#829CBC; cursor:not-allowed; }
            button:focus-visible { outline:3px solid #629DCB; outline-offset:2px; }
          </style>
          <article>
            <header>
              <div>
                <h3>${e(p.nombre || "Paciente")}</h3>
                <small>${p.edad != null ? "Edad: " + e(p.edad) + " · " : ""}ID: ${e(p.documento || "—")}</small>
              </div>
              <div class="cuando"><div>${e(Agenda.dia(d.fechaInicio))}</div><div>${e(Agenda.hora(d.fechaInicio))}</div></div>
            </header>
            <small>${e(d.titulo || "")}</small>
            ${(d.procedimientos || []).map(proc => `<section><h4>${e(proc.nombre)}</h4>${pasos(proc)}</section>`).join("")}
            ${d.finalizada ? '<p class="sin final">Consulta finalizada</p>' : `<button type="button" class="atender" ${d.puedeAtender === false ? "disabled" : ""}>Atender consulta</button>`}
          </article>`;
        this.shadowRoot.querySelectorAll(".ver").forEach(b => b.addEventListener("click", () =>
            this.dispatchEvent(new CustomEvent("galeno-ver-registro",
                { detail: { idPaso: b.dataset.paso }, bubbles: true, composed: true }))));
        this.shadowRoot.querySelector(".atender")?.addEventListener("click", () => {
            if (d.puedeAtender !== false) this.dispatchEvent(new CustomEvent("galeno-atender",
                { detail: { idConsulta: d.idConsulta }, bubbles: true, composed: true }));
        });
    }
}

customElements.define("galeno-tarjeta-agenda", GalenoTarjetaAgenda);
