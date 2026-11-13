// <galeno-conexion>: la franja que avisa si se perdio o volvio la conexion.
// No necesita nada: escucha "online" y "offline" de window.
//   Sin conexion  -> "Sin conexión: se muestran los datos guardados en este dispositivo."
//   Al volver     -> "Conexión restablecida" (se esconde sola a los 3 segundos)
// role="status": los lectores de pantalla lo anuncian sin interrumpir.
class GalenoConexion extends HTMLElement {

    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this._estado = "oculto";              // "oculto" | "sin-conexion" | "restablecida"
        this.temporizador = null;
        this.alPerder = () => this.perder();
        this.alVolver = () => this.volver();
    }

    get estado() { return this._estado; }

    connectedCallback() {
        window.addEventListener("offline", this.alPerder);
        window.addEventListener("online", this.alVolver);
        if (navigator.onLine === false) this._estado = "sin-conexion";
        this.pintar();
    }

    disconnectedCallback() {
        window.removeEventListener("offline", this.alPerder);
        window.removeEventListener("online", this.alVolver);
        clearTimeout(this.temporizador);
    }

    perder() {
        clearTimeout(this.temporizador);
        this._estado = "sin-conexion";
        this.pintar();
    }

    volver() {
        clearTimeout(this.temporizador);
        this._estado = "restablecida";
        this.pintar();
        this.temporizador = setTimeout(() => { this._estado = "oculto"; this.pintar(); }, 3000);
    }

    pintar() {
        const textos = {
            "sin-conexion": "Sin conexión: se muestran los datos guardados en este dispositivo.",
            "restablecida": "Conexión restablecida"
        };
        this.shadowRoot.innerHTML = `
          <style>
            :host { display:block; }
            div { padding:.45rem 1rem; text-align:center; font-size:var(--fs-1, .875rem); font-weight:600; }
            .sin-conexion { background:var(--error, #A8402F); color:#fff; }
            .restablecida { background:var(--exito, #3E7C59); color:#fff; }
            .oculto { display:none; }
          </style>
          <div role="status" aria-live="polite" class="${this._estado}">${textos[this._estado] ?? ""}</div>`;
    }
}

customElements.define("galeno-conexion", GalenoConexion);
