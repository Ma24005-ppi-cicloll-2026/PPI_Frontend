// <galeno-lista-examenes>: los examenes que se pueden asignar en un paso (HU4), con filtro por categoria.
//   lista.examenes = [{ id, nombre, categoria }];          // categoria puede venir vacia
//   lista.asignados = ["id1", "id2"];                      // ya asignados: salen marcados y bloqueados
//   lista.seleccionados                                    // ids marcados ahora
//   lista.addEventListener("galeno-asignar", e => e.detail.ids);   // boton "Asignar exámenes seleccionados"
class GalenoListaExamenes extends HTMLElement {

    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this._examenes = [];
        this._asignados = new Set();
        this._marcados = new Set();
        this._categoria = "";
    }

    set examenes(v) { this._examenes = Array.isArray(v) ? v : []; this._categoria = ""; this._marcados.clear(); this.pintar(); }
    get examenes() { return this._examenes; }
    set asignados(v) { this._asignados = new Set(v || []); this._marcados.clear(); this.pintar(); }
    get seleccionados() { return [...this._marcados]; }
    set deshabilitada(v) { this._deshabilitada = Boolean(v); this.pintar(); }

    connectedCallback() { this.pintar(); }

    categorias() {
        return [...new Set(this._examenes.map(x => x.categoria).filter(Boolean))].sort();
    }

    visibles() {
        return this._examenes.filter(x => !this._categoria || x.categoria === this._categoria);
    }

    escapar(v) {
        return String(v ?? "").replace(/[&<>"']/g,
            c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
    }

    pintar() {
        const e = t => this.escapar(t);
        const bloqueada = Boolean(this._deshabilitada);
        this.shadowRoot.innerHTML = `
          <style>
            :host { display:block; font-family:inherit; color:var(--tinta, #1D3461); }
            h3 { margin:0 0 .5rem; font-size:var(--fs-2, 1rem); }
            label.cat { display:block; font-weight:600; margin-bottom:.3rem; font-size:var(--fs-1, .875rem); }
            select { width:100%; box-sizing:border-box; padding:.5rem .7rem; border:1px solid var(--borde-fuerte, #9FB0B8);
                     border-radius:var(--radio-control, .625rem); font:inherit; min-height:2.5rem; background:var(--superficie, #fff);
                     color:var(--texto, #26354E); }
            select:disabled { background:var(--info-fondo, #EDF3F2); border-style:dashed; color:var(--inactivo, #8CA0A8); cursor:not-allowed; }
            select:focus-visible { outline:3px solid var(--foco, #2F6F73); outline-offset:2px; }
            ul { list-style:none; margin:.6rem 0; padding:0; border:1px solid var(--borde, #E3EAEA);
                 border-radius:var(--radio-control, .625rem); max-height:16rem; overflow:auto; }
            li { border-bottom:1px solid var(--borde, #E3EAEA); }
            li:last-child { border-bottom:0; }
            li label { display:flex; gap:.6rem; align-items:center; padding:.5rem .7rem; min-height:2.5rem; cursor:pointer;
                       transition:background var(--velocidad, 180ms); }
            li label:hover { background:var(--primario-suave, #E9F1EF); }
            li small { color:var(--tinta-suave, #44577B); display:block; }
            input { width:1.2rem; height:1.2rem; accent-color:var(--primario, #2F6F73); flex:0 0 auto; }
            input:focus-visible { outline:3px solid var(--foco, #2F6F73); outline-offset:2px; }
            .vacio { padding:.7rem; }
            button { width:100%; min-height:2.75rem; border:0; border-radius:var(--radio-control, .625rem);
                     background:var(--primario, #2F6F73); color:var(--sobre-primario, #fff); font:inherit; font-weight:600; cursor:pointer;
                     transition:background var(--velocidad, 180ms); }
            button:hover:not(:disabled) { background:var(--primario-oscuro, #25585B); }
            button:disabled { background:var(--inactivo, #8CA0A8); cursor:not-allowed; }
            button:focus-visible { outline:3px solid var(--foco, #2F6F73); outline-offset:2px; }
          /* respeta la preferencia de menos movimiento (las transiciones usan --velocidad) */
            @media (prefers-reduced-motion: reduce) { :host { --velocidad:0ms; } }
          </style>
          <h3>Lista de exámenes asignables</h3>
          <label class="cat" for="cat">Categoría</label>
          <select id="cat" ${this._examenes.length ? "" : "disabled"}>
            <option value="">Todas las categorías</option>
            ${this.categorias().map(c => `<option value="${e(c)}" ${c === this._categoria ? "selected" : ""}>${e(c)}</option>`).join("")}
          </select>
          <ul role="group" aria-label="Exámenes">
            ${this.visibles().map(x => `<li><label>
                <input type="checkbox" data-id="${e(x.id)}" ${this._asignados.has(x.id) ? "checked disabled" : ""} ${this._marcados.has(x.id) ? "checked" : ""}>
                <span>${e(x.nombre)}${this._asignados.has(x.id) ? "<small>Ya asignado</small>" : (x.categoria ? `<small>${e(x.categoria)}</small>` : "")}</span>
              </label></li>`).join("") || `<li class="vacio">No hay exámenes para este paso.</li>`}
          </ul>
          <button id="asignar" type="button" ${bloqueada || this._marcados.size === 0 ? "disabled" : ""}>Asignar exámenes seleccionados</button>`;
        this.shadowRoot.querySelector("#cat").addEventListener("change", ev => { this._categoria = ev.target.value; this.pintar(); });
        this.shadowRoot.querySelectorAll("input[data-id]").forEach(i => i.addEventListener("change", () => {
            if (i.checked) this._marcados.add(i.dataset.id); else this._marcados.delete(i.dataset.id);
            this.shadowRoot.querySelector("#asignar").disabled = bloqueada || this._marcados.size === 0;
        }));
        this.shadowRoot.querySelector("#asignar").addEventListener("click", () => {
            const ids = this.seleccionados;
            if (ids.length) this.dispatchEvent(new CustomEvent("galeno-asignar", { detail: { ids }, bubbles: true, composed: true }));
        });
    }
}

customElements.define("galeno-lista-examenes", GalenoListaExamenes);
