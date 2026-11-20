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
        this.alCache = () => this.mostrarCache();
        this.alApiDisponible = () => { if (this._estado === "sin-conexion") this.volver(); };
    }

    // Devuelve el estado actual.
    get estado() { return this._estado; }

    // Prepara el componente cuando se incorpora al documento.
    connectedCallback() {
        window.addEventListener("offline", this.alPerder);
        window.addEventListener("online", this.alVolver);
        window.addEventListener("galeno-api-cache", this.alCache);
        window.addEventListener("galeno-api-disponible", this.alApiDisponible);
        if (navigator.onLine === false) this.perder();
        this.pintar();
    }

    // Libera las escuchas y recursos al retirar el componente.
    disconnectedCallback() {
        window.removeEventListener("offline", this.alPerder);
        window.removeEventListener("online", this.alVolver);
        window.removeEventListener("galeno-api-cache", this.alCache);
        window.removeEventListener("galeno-api-disponible", this.alApiDisponible);
        clearTimeout(this.temporizador);
    }

    // Actualiza el indicador al perder la conexión.
    perder() {
        clearTimeout(this.temporizador);
        this._estado = "sin-conexion";
        this.textoEstado = "Sin conexión: se muestran los últimos datos guardados en este dispositivo. Las escrituras requieren conexión.";
        this.pintar();
    }

    // Avisa de que la información procede de una copia local.
    mostrarCache() {
        clearTimeout(this.temporizador);
        this._estado = "sin-conexion";
        this.textoEstado = "El servidor no responde: se muestran los últimos datos guardados en este dispositivo. Las escrituras requieren conexión.";
        this.pintar();
    }

    // Actualiza la vista al recuperar la conexión o regresar al listado.
    volver() {
        clearTimeout(this.temporizador);
        this._estado = "restablecida";
        this.textoEstado = "Conexión restablecida";
        this.pintar();
        this.temporizador = setTimeout(() => { this._estado = "oculto"; this.pintar(); }, 3000);
    }

    // Actualiza la vista con los datos y el estado actuales.
    pintar() {
        const textos = {
            "sin-conexion": this.textoEstado || "Sin conexión: mostrando los datos guardados en este dispositivo.",
            "restablecida": this.textoEstado || "Conexión restablecida"
        };
        const raiz = this.plantillas.clonar("plantilla-galeno-conexion");
        const caja = raiz.querySelector("div");
        caja.className = this._estado;
        if (this._estado !== "sin-conexion") raiz.querySelector(".icono.sin").remove();
        if (this._estado !== "restablecida") raiz.querySelector(".icono.ok").remove();
        raiz.querySelectorAll(".icono").forEach(i => i.classList.remove("sin", "ok"));
        raiz.querySelector(".texto").textContent = textos[this._estado] ?? "";
        this.shadowRoot.replaceChildren(raiz);
    }
}

customElements.define("galeno-conexion", GalenoConexion);
