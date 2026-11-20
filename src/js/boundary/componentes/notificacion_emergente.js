class GalenoNotificacionEmergente extends HTMLElement {

    // Moldes HTML del componente.
    plantillas = new Plantillas();

    // Prepara el estado interno antes de montar el componente.
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this._temporizador = null;
        this.alTecla = ev => { if (ev.key === "Escape") this.ocultar(); };
    }

    // Prepara el componente cuando se incorpora al documento.
    connectedCallback() {
        this.shadowRoot.replaceChildren(this.plantillas.clonar("plantilla-galeno-notificacion"));
        // Atiende las teclas que controla esta vista.
        this.addEventListener("keydown", this.alTecla);
    }

    // Libera las escuchas y recursos al retirar el componente.
    disconnectedCallback() {
        this.removeEventListener("keydown", this.alTecla);
        clearTimeout(this._temporizador);
    }

    // Presenta el contenido o estado indicado.
    mostrar(mensaje, tipo = "info", milisegundos = 4000) {
        const caja = this.shadowRoot.querySelector("#caja");
        const aviso = this.plantillas.clonar("plantilla-galeno-notificacion-aviso");
        const icono = document.getElementById("icono-aviso-" + tipo) ? "icono-aviso-" + tipo : "icono-aviso-info";
        aviso.querySelector(".icono-aviso").replaceWith(this.plantillas.clonar(icono));
        aviso.querySelector(".texto").textContent = mensaje;
        aviso.querySelector(".barra").style.animationDuration = `${milisegundos}ms`;
        aviso.querySelector(".cerrar").addEventListener("click", () => this.ocultar());
        caja.className = tipo;
        caja.replaceChildren(aviso);
        caja.hidden = false;
        clearTimeout(this._temporizador);
        this._temporizador = setTimeout(() => this.ocultar(), milisegundos);
    }

    // Retira la interfaz visible.
    ocultar() {
        clearTimeout(this._temporizador);
        this.shadowRoot.querySelector("#caja").hidden = true;
    }
}

customElements.define("galeno-notificacion-emergente", GalenoNotificacionEmergente);
