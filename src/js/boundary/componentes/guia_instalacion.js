class GalenoGuiaInstalacion extends HTMLElement {

    // Moldes HTML del componente.
    plantillas = new Plantillas();

    // Prepara el estado interno antes de montar el componente.
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this._abierta = false;
        this._focoPrevio = null;
        this.alTecla = e => {
            if (!this._abierta) return;
            if (e.key === "Escape") { e.stopPropagation(); this.cerrar(); return; }
            if (e.key === "Tab") this.traparFoco(e);
        };
    }

    // Prepara el componente cuando se incorpora al documento.
    connectedCallback() {
        // Atiende las teclas que controla esta vista.
        window.addEventListener("keydown", this.alTecla);
        window.addEventListener("galeno-abrir-guia", this.alAbrirGuia = () => this.abrir());
        this.pintar();
    }

    // Libera las escuchas y recursos al retirar el componente.
    disconnectedCallback() {
        window.removeEventListener("keydown", this.alTecla);
        window.removeEventListener("galeno-abrir-guia", this.alAbrirGuia);
    }

    // Abre el recurso y deja listo su estado para usarlo.
    abrir() {
        if (this._abierta) return;
        this._abierta = true;
        this._focoPrevio = document.activeElement;
        this.pintar();
        const cerrar = this.shadowRoot.querySelector(".cerrar");
        cerrar?.focus();
    }

    // Cierra el estado abierto y libera sus recursos.
    cerrar() {
        if (!this._abierta) return;
        this._abierta = false;
        this.pintar();
        this._focoPrevio?.focus?.();
        this._focoPrevio = null;
        this.dispatchEvent(new CustomEvent("galeno-guia-cerrada", { bubbles: true, composed: true }));
    }

    // Mantiene la tabulación dentro del cuadro de diálogo.
    traparFoco(e) {
        const botones = [...this.shadowRoot.querySelectorAll("button:not([hidden])")];
        if (!botones.length) return;
        const i = botones.indexOf(this.shadowRoot.activeElement);
        e.preventDefault();
        const siguiente = e.shiftKey
            ? botones[(i <= 0 ? botones.length : i) - 1]
            : botones[(i + 1) % botones.length];
        siguiente.focus();
    }

    // Actualiza la vista con los datos y el estado actuales.
    pintar() {
        const raiz = this.plantillas.clonar("plantilla-galeno-guia");
        raiz.querySelector(".fondo").hidden = !this._abierta;
        raiz.querySelector(".caja").hidden = !this._abierta;
        raiz.querySelector(".cerrar").addEventListener("click", () => this.cerrar());
        this.shadowRoot.replaceChildren(raiz);
    }
}

customElements.define("galeno-guia-instalacion", GalenoGuiaInstalacion);
