class GalenoTarjetaCita extends HTMLElement {

    // Moldes HTML del componente.
    plantillas = new Plantillas();

    // Utilidades del sistema que usa el componente para mostrar los datos.
    fechas = new GestorFechas();

    // Prepara el estado interno antes de montar el componente.
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this._cita = null;
    }

    // Actualiza los datos de la cita.
    set cita(v) { this._cita = v; this.pintar(); }
    // Devuelve los datos de la cita.
    get cita() { return this._cita; }

    // Actualiza el bloqueo mientras se procesa la acción.
    set ocupada(v) {
        if (this._cita) this._cita = { ...this._cita, ocupada: Boolean(v) };
        this.pintar();
    }

    // Prepara el componente cuando se incorpora al documento.
    connectedCallback() { this.pintar(); }

    // Clona el molde de la tarjeta y le pone los datos de la cita.
    pintar() {
        const c = this._cita || {};
        const f = this.fechas.leer(c.fechaInicio);
        const dia = f ? f.toLocaleDateString("es-SV", { day: "2-digit" }) : "—";
        const mes = f ? f.toLocaleDateString("es-SV", { month: "short" }).replace(".", "") : "—";
        const anio = f ? String(f.getFullYear()) : "";
        const hora = f ? f.toLocaleTimeString("es-SV", { hour: "2-digit", minute: "2-digit" }) : "—";
        const raiz = this.plantillas.llenar(this.plantillas.clonar("plantilla-galeno-tarjeta-cita"), {
            dia, mes, anio, hora, clinica: c.clinica || "—",
            boton: c.ocupada ? "Generando ticket..." : "Descargar ticket (PDF)" });
        raiz.querySelector("article").setAttribute("aria-label", `Cita del ${dia} de ${mes} de ${anio} a las ${hora}`);
        const chips = raiz.querySelector(".chips");
        if (c.procedimientos?.length) {
            chips.append(...c.procedimientos.map(p => {
                const li = this.plantillas.clonar("plantilla-galeno-tarjeta-cita-chip").firstElementChild;
                li.textContent = p;
                return li;
            }));
            raiz.querySelector(".sin").remove();
        } else chips.remove();
        const boton = raiz.querySelector("#ticket");
        boton.disabled = Boolean(c.ocupada);
        boton.addEventListener("click", () =>
            this.dispatchEvent(new CustomEvent("galeno-descargar-ticket",
                { detail: { idConsulta: c.idConsulta }, bubbles: true, composed: true })));
        this.shadowRoot.replaceChildren(raiz);
    }
}

customElements.define("galeno-tarjeta-cita", GalenoTarjetaCita);
