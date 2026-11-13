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
            :host { display:block; font-family:inherit; color:var(--tinta, #1D3461); }
            ol { display:flex; flex-wrap:wrap; gap:.35rem .25rem; list-style:none; margin:0; padding:0; }
            li { display:flex; align-items:center; gap:.25rem; }
            /* conector entre pasos */
            li + li::before { content:""; width:1.4rem; height:2px; background:var(--borde, #E3EAEA); border-radius:2px; flex:0 0 auto;
                              margin-right:.25rem; }
            button { display:inline-flex; align-items:center; gap:.45rem; border:1px solid var(--borde, #E3EAEA);
                     background:var(--superficie, #fff); color:var(--tinta, #1D3461); font:inherit; padding:.35rem .8rem;
                     cursor:pointer; min-height:2.5rem; border-radius:999px; font-size:var(--fs-1, .875rem); font-weight:600;
                     transition:background var(--velocidad, 180ms), border-color var(--velocidad, 180ms), color var(--velocidad, 180ms); }
            button .punto { width:.7rem; height:.7rem; border-radius:50%; flex:0 0 auto;
                            background:var(--borde, #E3EAEA); border:2px solid var(--borde-fuerte, #9FB0B8); box-sizing:border-box; }
            button .punto.hecho { background:var(--exito, #3E7C59); border-color:var(--exito, #3E7C59); }
            button .punto.actual { background:var(--primario, #2F6F73); border-color:var(--primario, #2F6F73); }
            button:hover:not(:disabled) { background:var(--primario-suave, #E9F1EF); }
            button:disabled { color:var(--inactivo, #8CA0A8); cursor:not-allowed; }
            button[aria-current=step] { background:var(--primario-suave, #E9F1EF); border-color:var(--primario, #2F6F73); color:var(--tinta, #1D3461); }
            button:focus-visible { outline:3px solid var(--foco, #2F6F73); outline-offset:2px; }
          /* respeta la preferencia de menos movimiento (las transiciones usan --velocidad) */
            @media (prefers-reduced-motion: reduce) { :host { --velocidad:0ms; } }
          </style>
          <ol aria-label="Pasos del procedimiento"></ol>`;
        const lista = this.shadowRoot.querySelector("ol");
        this._pasos.forEach((p, i) => {
            const li = document.createElement("li");
            const b = document.createElement("button");
            b.type = "button";
            b.innerHTML = `<span class="punto ${this.escapar(p.estado)}" aria-hidden="true"></span><span>${this.escapar(p.nombre)}${p.estado === "hecho" ? " ✓" : ""}</span>`;
            b.disabled = p.estado === "pendiente";
            if (i === this._vista) b.setAttribute("aria-current", "step");
            b.setAttribute("aria-label", `${p.nombre}${p.estado === "hecho" ? " (hecho)" : p.estado === "actual" ? " (paso actual)" : ""}`);
            b.addEventListener("click", () => this.dispatchEvent(new CustomEvent("galeno-ir-paso",
                { detail: { indice: i }, bubbles: true, composed: true })));
            li.append(b);
            lista.append(li);
        });
    }
}

customElements.define("galeno-indicador-pasos", GalenoIndicadorPasos);
