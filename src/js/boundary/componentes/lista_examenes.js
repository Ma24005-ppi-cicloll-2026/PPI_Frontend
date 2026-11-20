class GalenoListaExamenes extends HTMLElement {

    // Moldes HTML del componente.
    plantillas = new Plantillas();

    // Prepara el estado interno antes de montar el componente.
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this._examenes = [];
        this._asignados = new Set();
        this._marcados = new Set();
        this._categoria = "";
    }

    // Actualiza los exámenes disponibles.
    set examenes(v) { this._examenes = Array.isArray(v) ? v : []; this._categoria = ""; this._marcados.clear(); this.pintar(); }
    // Devuelve los exámenes disponibles.
    get examenes() { return this._examenes; }
    // Actualiza los exámenes ya asignados.
    set asignados(v) { this._asignados = new Set(v || []); this._marcados.clear(); this.pintar(); }
    // Devuelve los valores seleccionados.
    get seleccionados() { return [...this._marcados]; }
    // Actualiza el bloqueo del control.
    set deshabilitada(v) { this._deshabilitada = Boolean(v); this.pintar(); }

    // Prepara el componente cuando se incorpora al documento.
    connectedCallback() { this.pintar(); }

    // Agrupa los exámenes por categoría.
    categorias() {
        return [...new Set(this._examenes.map(x => x.categoria).filter(Boolean))].sort();
    }

    // Aplica el filtro de estado a las consultas del listado.
    visibles() {
        return this._examenes.filter(x => !this._categoria || x.categoria === this._categoria);
    }

    // Arma la fila de un examen con su casilla.
    fila(x) {
        const li = this.plantillas.clonar("plantilla-galeno-lista-examenes-item").firstElementChild;
        const casilla = li.querySelector("input");
        const asignado = this._asignados.has(x.id);
        casilla.dataset.id = x.id;
        casilla.checked = asignado || this._marcados.has(x.id);
        casilla.disabled = asignado;
        const texto = li.querySelector(".texto");
        texto.prepend(x.nombre ?? "");
        const nota = asignado ? "Ya asignado" : x.categoria;
        if (nota) texto.querySelector("small").textContent = nota;
        else texto.querySelector("small").remove();
        casilla.addEventListener("change", () => {
            if (casilla.checked) this._marcados.add(x.id); else this._marcados.delete(x.id);
            this.shadowRoot.querySelector("#asignar").disabled = Boolean(this._deshabilitada) || this._marcados.size === 0;
        });
        return li;
    }

    // Clona el molde de la lista y la llena con las categorías y los exámenes.
    pintar() {
        const bloqueada = Boolean(this._deshabilitada);
        const raiz = this.plantillas.clonar("plantilla-galeno-lista-examenes");
        const cat = raiz.querySelector("#cat");
        cat.disabled = !this._examenes.length;
        this.categorias().forEach(c => cat.append(new Option(c, c, false, c === this._categoria)));
        cat.addEventListener("change", ev => { this._categoria = ev.target.value; this.pintar(); });
        const visibles = this.visibles();
        raiz.querySelector("ul").append(...(visibles.length ? visibles.map(x => this.fila(x))
            : [this.plantillas.clonar("plantilla-galeno-lista-examenes-vacia").firstElementChild]));
        const asignar = raiz.querySelector("#asignar");
        asignar.disabled = bloqueada || this._marcados.size === 0;
        asignar.addEventListener("click", () => {
            const ids = this.seleccionados;
            if (ids.length) this.dispatchEvent(new CustomEvent("galeno-asignar", { detail: { ids }, bubbles: true, composed: true }));
        });
        this.shadowRoot.replaceChildren(raiz);
    }
}

customElements.define("galeno-lista-examenes", GalenoListaExamenes);
