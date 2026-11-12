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
            :host { display:block; font-family:inherit; color:#1D3461; }
            h3 { margin:0 0 .5rem; }
            label.cat { display:block; font-weight:600; margin-bottom:.3rem; }
            select { width:100%; box-sizing:border-box; padding:.5rem; border:1px solid #5D7899; border-radius:.4rem; font:inherit; min-height:2.5rem; }
            ul { list-style:none; margin:.6rem 0; padding:0; border:1px solid #5D7899; border-radius:.4rem; max-height:16rem; overflow:auto; }
            li { border-bottom:1px solid #DCE6F1; }
            li label { display:flex; gap:.6rem; align-items:center; padding:.5rem .7rem; min-height:2.5rem; cursor:pointer; }
            li small { color:#3A4F73; display:block; }
            input { width:1.2rem; height:1.2rem; }
            .vacio { padding:.7rem; }
            button { width:100%; min-height:2.75rem; border:0; border-radius:.5rem; background:#1D3461; color:#fff; font:inherit; cursor:pointer; }
            button:disabled { background:#829CBC; cursor:not-allowed; }
            :focus-visible { outline:3px solid #629DCB; outline-offset:2px; }
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
