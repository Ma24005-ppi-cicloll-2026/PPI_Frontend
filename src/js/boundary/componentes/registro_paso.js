class GalenoRegistroPaso extends HTMLElement {

    // Moldes HTML del componente.
    plantillas = new Plantillas();

    // Utilidades del sistema que usa el componente para mostrar los datos.
    fechas = new GestorFechas();

    // Prepara el estado interno antes de montar el componente.
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this._datos = null;
        this._retorno = null;
    }

    // Actualiza los datos de la vista.
    set datos(v) { this._datos = v; this.pintar(); }
    // Devuelve los datos de la vista.
    get datos() { return this._datos; }

    // Prepara el componente cuando se incorpora al documento.
    connectedCallback() { this.pintar(); }

    // Devuelve el diálogo interno.
    get dialogo() { return this.shadowRoot.querySelector("dialog"); }
    // Indica si el diálogo de registro está abierto.
    get abierta() { return Boolean(this.dialogo?.open); }

    // Abre el detalle y recuerda dónde devolver el foco.
    abrir() {
        if (this.abierta) return;
        this._retorno = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        this.dialogo.showModal();
    }
    // Cierra el detalle si sigue abierto.
    cerrar() { if (this.abierta) this.dialogo.close(); }

    // Devuelve el foco al elemento que abrió la interfaz.
    devolverFoco() {
        if (this._retorno?.isConnected) { this._retorno.focus(); this._retorno = null; }
    }

    // Clona el molde del diálogo y le pone el detalle del paso.
    pintar() {
        const d = this._datos || {};
        const raiz = this.plantillas.clonar("plantilla-galeno-registro-paso");
        const detalle = [d.quien || "—", d.rol || "", this.fechas.aFechaHora(d.inicio)].filter(Boolean).join(" · ");
        raiz.querySelector(".titulo").textContent = d.paso || "Paso";
        raiz.querySelector(".procedimiento").textContent = d.procedimiento || "";
        raiz.querySelector(".detalle").textContent = (d.procedimiento ? " · " : "") + detalle;
        raiz.querySelector(".estado").textContent = d.estado || "—";
        raiz.querySelector(".fin").textContent = " " + (d.fin ? this.fechas.aFechaHora(d.fin) : "En proceso");
        raiz.querySelector(".nota").textContent = d.nota || "No se escribieron notas.";
        const lista = raiz.querySelector(".examenes");
        if (d.examenes?.length) {
            lista.append(...d.examenes.map(x => {
                const li = this.plantillas.clonar("plantilla-galeno-registro-paso-examen").firstElementChild;
                li.querySelector("strong").textContent = x.nombre;
                li.querySelector(".resultado").textContent = ": " + (x.resultado || "sin resultado todavía");
                return li;
            }));
            raiz.querySelector(".sin-examenes").remove();
        } else lista.remove();
        raiz.querySelector("#cerrar").addEventListener("click", () => this.cerrar());
        raiz.querySelector("dialog").addEventListener("close", () => this.devolverFoco());
        this.shadowRoot.replaceChildren(raiz);
    }
}

customElements.define("galeno-registro-paso", GalenoRegistroPaso);
