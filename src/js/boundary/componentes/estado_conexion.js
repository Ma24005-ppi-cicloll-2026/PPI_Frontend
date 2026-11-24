class GalenoConexion extends HTMLElement {

    // Moldes HTML del componente.
    plantillas = new Plantillas();

    // Prepara el estado interno antes de montar el componente.
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this._estado = "oculto";
        this.temporizador = null;
        this.alPerder = () => this.perder();
        this.alVolver = () => this.volver();
        this.alApiDisponible = () => { if (this._estado === "sin-conexion") this.volver(); };
    }

    // Devuelve el estado actual.
    get estado() { return this._estado; }

    // Prepara el componente cuando se incorpora al documento.
    connectedCallback() {
        window.addEventListener("offline", this.alPerder);
        window.addEventListener("online", this.alVolver);
        window.addEventListener("galeno-api-no-disponible", this.alPerder);
        window.addEventListener("galeno-api-disponible", this.alApiDisponible);
        if (navigator.onLine === false) this.perder();
        this.pintar();
    }

    // Libera las escuchas y recursos al retirar el componente.
    disconnectedCallback() {
        window.removeEventListener("offline", this.alPerder);
        window.removeEventListener("online", this.alVolver);
        window.removeEventListener("galeno-api-no-disponible", this.alPerder);
        window.removeEventListener("galeno-api-disponible", this.alApiDisponible);
        clearTimeout(this.temporizador);
    }

    // Actualiza el indicador al perder la conexión.
    perder() {
        if (this._estado === "sin-conexion") return;
        clearTimeout(this.temporizador);
        this._estado = "sin-conexion";
        this.pintar();
    }

    // Actualiza la vista al recuperar la conexión o regresar al listado.
    volver() {
        clearTimeout(this.temporizador);
        this._estado = "restablecida";
        this.pintar();
        this.temporizador = setTimeout(() => { this._estado = "oculto"; this.pintar(); }, 3000);
    }

    // Actualiza la vista con los datos y el estado actuales.
    pintar() {
        const textos = {
            "sin-conexion": "Se muestran los últimos datos guardados en este dispositivo. Las escrituras requieren conexión.",
            "restablecida": "Conexión restablecida"
        };
        const raiz = this.shadowRoot;
        if (!raiz.firstChild) raiz.append(this.plantillas.clonar("plantilla-galeno-conexion"));
        this.dataset.estado = this._estado;
        const caja = raiz.querySelector("[role=status]");
        caja.className = this._estado;
        raiz.querySelector("strong").textContent = this._estado === "sin-conexion" ? "No se puede acceder al servidor. " : "";
        raiz.querySelector(".icono.sin").toggleAttribute("hidden", this._estado !== "sin-conexion");
        raiz.querySelector(".icono.ok").toggleAttribute("hidden", this._estado !== "restablecida");
        raiz.querySelector(".texto").textContent = textos[this._estado] ?? "";
    }
}

customElements.define("galeno-conexion", GalenoConexion);
