// <galeno-registro-paso>: ventana que muestra QUE SE REGISTRO en un paso (boton "Ver registro" del Dashboard).
//   ventana.datos = { procedimiento, paso, estado, quien, rol, inicio, fin, nota, examenes: [{ nombre, resultado }] };
//   ventana.abrir();   ventana.cerrar();
// Se cierra con el boton Cerrar o con Escape.
class GalenoRegistroPaso extends HTMLElement {

    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this._datos = null;
    }

    set datos(v) { this._datos = v; this.pintar(); }
    get datos() { return this._datos; }

    connectedCallback() { this.pintar(); }

    get dialogo() { return this.shadowRoot.querySelector("dialog"); }
    get abierta() { return Boolean(this.dialogo?.open); }

    abrir() { if (!this.abierta) this.dialogo.showModal(); }
    cerrar() { if (this.abierta) this.dialogo.close(); }

    escapar(v) {
        return String(v ?? "").replace(/[&<>"']/g,
            c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
    }

    pintar() {
        const d = this._datos || {};
        const e = t => this.escapar(t);
        const examenes = d.examenes?.length
            ? `<ul>${d.examenes.map(x => `<li><strong>${e(x.nombre)}</strong>: ${e(x.resultado || "sin resultado todavía")}</li>`).join("")}</ul>`
            : "<p>No se asignaron exámenes.</p>";
        this.shadowRoot.innerHTML = `
          <style>
            dialog { border:2px solid #1D3461; border-radius:.8rem; padding:1.2rem; max-width:34rem; width:calc(100% - 2rem);
                     color:#1D3461; font-family:inherit; }
            dialog::backdrop { background:rgba(29,52,97,.5); }
            h2 { margin:0 0 .2rem; }
            h3 { margin:1rem 0 .2rem; font-size:1rem; }
            small { color:#3A4F73; }
            .nota { white-space:pre-wrap; background:#EEF5FB; border-radius:.4rem; padding:.6rem; margin:0; }
            button { margin-top:1rem; min-height:2.75rem; padding:.5rem 1.2rem; border:0; border-radius:.5rem;
                     background:#1D3461; color:#fff; cursor:pointer; font:inherit; }
            button:focus-visible { outline:3px solid #629DCB; outline-offset:2px; }
          </style>
          <dialog aria-labelledby="titulo">
            <h2 id="titulo">${e(d.paso || "Paso")}</h2>
            <small>${e(d.procedimiento || "")}</small>
            <p><strong>Estado:</strong> ${e(d.estado || "—")}<br>
               <strong>Realizado por:</strong> ${e(d.quien || "—")}${d.rol ? " (" + e(d.rol) + ")" : ""}<br>
               <strong>Inicio:</strong> ${e(GestorFechas.aFechaHora(d.inicio))}<br>
               <strong>Fin:</strong> ${d.fin ? e(GestorFechas.aFechaHora(d.fin)) : "En proceso"}</p>
            <h3>Notas</h3>
            <p class="nota">${e(d.nota || "No se escribieron notas.")}</p>
            <h3>Exámenes</h3>
            ${examenes}
            <button id="cerrar" type="button">Cerrar</button>
          </dialog>`;
        this.shadowRoot.querySelector("#cerrar").addEventListener("click", () => this.cerrar());
    }
}

customElements.define("galeno-registro-paso", GalenoRegistroPaso);
