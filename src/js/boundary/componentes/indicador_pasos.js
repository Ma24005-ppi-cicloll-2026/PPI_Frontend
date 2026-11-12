// <galeno-indicador-pasos>: la barra de pasos de una consulta (HU4): "Triaje ✓ | Consulta médica | Tratamiento".
//   indicador.pasos = [{ nombre: "Triaje", estado: "hecho" }, { nombre: "Consulta", estado: "actual" }, { nombre: "Cierre", estado: "pendiente" }];
//   indicador.vista = 1;     // el paso que se esta mirando (se resalta)
// Los pasos hechos y el actual se pueden pulsar para verlos: emite "galeno-ir-paso" { indice }.
class GalenoIndicadorPasos extends HTMLElement {

    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this._pasos = [];
        this._vista = 0;
    }

    set pasos(v) { this._pasos = Array.isArray(v) ? v : []; this.pintar(); }
    get pasos() { return this._pasos; }
    set vista(v) { this._vista = v; this.pintar(); }
    get vista() { return this._vista; }

    connectedCallback() { this.pintar(); }

    escapar(v) {
        return String(v ?? "").replace(/[&<>"']/g,
            c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
    }

    pintar() {
        this.shadowRoot.innerHTML = `
          <style>
            :host { display:block; font-family:inherit; color:#1D3461; }
            ol { display:flex; flex-wrap:wrap; gap:.25rem; list-style:none; margin:0; padding:0; border-bottom:2px solid #1D3461; }
            button { border:0; background:transparent; color:inherit; font:inherit; padding:.5rem .8rem; cursor:pointer; min-height:2.5rem; }
            button:disabled { color:#7C8CA6; cursor:not-allowed; }
            button[aria-current=step] { font-weight:700; border-bottom:4px solid #1D3461; }
            button:focus-visible { outline:3px solid #629DCB; outline-offset:2px; }
          </style>
          <ol aria-label="Pasos del procedimiento"></ol>`;
        const lista = this.shadowRoot.querySelector("ol");
        this._pasos.forEach((p, i) => {
            const li = document.createElement("li");
            const b = document.createElement("button");
            b.type = "button";
            b.textContent = p.nombre + (p.estado === "hecho" ? " ✓" : "");
            b.disabled = p.estado === "pendiente";
            if (i === this._vista) b.setAttribute("aria-current", "step");
            b.addEventListener("click", () => this.dispatchEvent(new CustomEvent("galeno-ir-paso",
                { detail: { indice: i }, bubbles: true, composed: true })));
            li.append(b);
            lista.append(li);
        });
    }
}

customElements.define("galeno-indicador-pasos", GalenoIndicadorPasos);
