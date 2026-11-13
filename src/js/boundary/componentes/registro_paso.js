// <galeno-registro-paso>: ventana que muestra QUE SE REGISTRO en un paso (boton "Registro" del Dashboard).
//   ventana.datos = { procedimiento, paso, estado, quien, rol, inicio, fin, nota, examenes: [{ nombre, resultado }] };
//   ventana.abrir();   ventana.cerrar();
// Se cierra con el boton Cerrar o con Escape. Panel centrado en escritorio; en celular es una hoja
// inferior (bottom sheet). El foco vuelve al elemento que la abrio (tambien con Escape).
class GalenoRegistroPaso extends HTMLElement {

    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this._datos = null;
        this._retorno = null;      // a quien devolverle el foco al cerrar
    }

    set datos(v) { this._datos = v; this.pintar(); }
    get datos() { return this._datos; }

    connectedCallback() { this.pintar(); }

    get dialogo() { return this.shadowRoot.querySelector("dialog"); }
    get abierta() { return Boolean(this.dialogo?.open); }

    abrir() {
        if (this.abierta) return;
        this._retorno = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        this.dialogo.showModal();
    }
    cerrar() { if (this.abierta) this.dialogo.close(); }

    devolverFoco() {
        if (this._retorno?.isConnected) { this._retorno.focus(); this._retorno = null; }
    }

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
        const detalle = [d.quien ? e(d.quien) : "—", d.rol ? e(d.rol) : "", e(GestorFechas.aFechaHora(d.inicio))]
            .filter(Boolean).join(" · ");
        this.shadowRoot.innerHTML = `
          <style>
            dialog { border:1px solid var(--borde, #E3EAEA); border-radius:var(--radio-tarjeta, .875rem);
                     padding:1.1rem 1.3rem; max-width:32rem; width:calc(100% - 2rem);
                     color:var(--tinta, #1D3461); font-family:inherit;
                     background:var(--superficie, #fff); box-shadow:var(--sombra-2, none); }
            dialog::backdrop { background:rgba(29,52,97,.45); }
            .titulo { margin:0 0 .15rem; font-size:var(--fs-3, 1.25rem); }
            .autor { margin:0 0 .8rem; padding-bottom:.6rem; border-bottom:1px solid var(--borde, #E3EAEA);
                     color:var(--tinta-suave, #44577B); font-size:var(--fs-1, .875rem); }
            .autor strong { color:var(--tinta, #1D3461); }
            h3 { margin:.9rem 0 .25rem; font-size:var(--fs-1, .875rem); text-transform:uppercase; letter-spacing:.05em;
                 color:var(--tinta-suave, #44577B); }
            p { margin:.3rem 0; }
            .estado { display:inline-flex; align-items:center; gap:.4rem; border-radius:999px; padding:.1rem .6rem;
                      font-size:var(--fs-0, .75rem); font-weight:700;
                      background:var(--exito-fondo, #E9F3ED); color:var(--exito, #3E7C59); border:1px solid var(--exito, #3E7C59); }
            .meta { margin:.5rem 0 0; color:var(--tinta-suave, #44577B); font-size:var(--fs-1, .875rem); }
            .nota { white-space:pre-wrap; background:var(--info-fondo, #EDF3F2); border:1px solid var(--borde, #E3EAEA);
                    border-radius:var(--radio-control, .625rem); padding:.6rem .8rem; margin:0; }
            ul { margin:.2rem 0 0; padding-left:1.2rem; }
            ul li + li { margin-top:.3rem; }
            .pie { display:flex; justify-content:flex-end; margin-top:1.1rem; }
            button { min-height:2.75rem; padding:.5rem 1.2rem; border:0; border-radius:var(--radio-control, .625rem);
                     background:var(--primario, #2F6F73); color:var(--sobre-primario, #fff); cursor:pointer; font:inherit; font-weight:600;
                     transition:background var(--velocidad, 180ms); }
            button:hover { background:var(--primario-oscuro, #25585B); }
            button:focus-visible { outline:3px solid var(--foco, #2F6F73); outline-offset:2px; }
          /* celular: hoja inferior (bottom sheet) pegada al borde de abajo */
            @media (max-width:47.99em) {
              dialog { position:fixed; inset:auto 0 0 0; margin:0; width:100%; max-width:none;
                       border-radius:1rem 1rem 0 0; max-height:85vh; overflow:auto; }
            }
          /* respeta la preferencia de menos movimiento (las transiciones usan --velocidad) */
            @media (prefers-reduced-motion: reduce) { :host { --velocidad:0ms; } }
          </style>
          <dialog aria-labelledby="titulo">
            <h2 class="titulo" id="titulo">${e(d.paso || "Paso")}</h2>
            <p class="autor"><strong>${e(d.procedimiento || "")}</strong>${d.procedimiento ? " · " : ""}${detalle}</p>
            <p><span class="estado">${e(d.estado || "—")}</span></p>
            <p class="meta"><strong>Fin:</strong> ${d.fin ? e(GestorFechas.aFechaHora(d.fin)) : "En proceso"}</p>
            <h3>Notas</h3>
            <p class="nota">${e(d.nota || "No se escribieron notas.")}</p>
            <h3>Exámenes</h3>
            ${examenes}
            <div class="pie"><button id="cerrar" type="button">Cerrar</button></div>
          </dialog>`;
        this.shadowRoot.querySelector("#cerrar").addEventListener("click", () => this.cerrar());
        this.dialogo.addEventListener("close", () => this.devolverFoco());
    }
}

customElements.define("galeno-registro-paso", GalenoRegistroPaso);
