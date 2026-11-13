// <galeno-conexion>: franja delgada bajo la cabecera que avisa si se perdio o volvio la conexion.
// No necesita nada: escucha "online" y "offline" de window.
//   Sin conexion  -> "Sin conexión: mostrando los datos guardados en este dispositivo."
//   Al volver     -> "Conexión restablecida" (se esconde sola a los 3 segundos)
// role="status": los lectores de pantalla lo anuncian sin interrumpir. El texto va en un span
// (el svg del icono no aporta texto), con fondo suave y borde del color del estado.
class GalenoConexion extends HTMLElement {

    static ICONOS = {
        sin: '<svg class="icono" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false"><path d="M2.5 9.5C8 4.5 16 4.5 21.5 9.5M6 13c3.5-3 8.5-3 12 0m-9 3.5c1.7-1.2 3.8-1.2 5.5 0" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="m4 4 16 16" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
        ok:  '<svg class="icono" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false"><path d="M2.5 9.5C8 4.5 16 4.5 21.5 9.5M6 13c3.5-3 8.5-3 12 0m-9 3.5c1.7-1.2 3.8-1.2 5.5 0" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="19" cy="18" r="4.6" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="m17 18 1.4 1.4L21.4 16.6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>'
    };

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
            "sin-conexion": "Sin conexión: mostrando los datos guardados en este dispositivo.",
            "restablecida": "Conexión restablecida"
        };
        const iconos = { "sin-conexion": GalenoConexion.ICONOS.sin, "restablecida": GalenoConexion.ICONOS.ok };
        this.shadowRoot.innerHTML = `
          <style>
            :host { display:block; }
            div { display:flex; align-items:center; justify-content:center; gap:.45rem;
                  padding:.3rem 1rem; text-align:center;
                  font-size:var(--fs-0, .75rem); font-weight:600; color:var(--tinta, #1D3461); }
            div .icono { flex:0 0 auto; }
            .sin-conexion { background:var(--aviso-fondo, #F7F0E3); }
            .sin-conexion .icono { color:var(--aviso, #B98A3E); }
            .restablecida { background:var(--exito-fondo, #E9F3ED); }
            .restablecida .icono { color:var(--exito, #4F8A6B); }
            .oculto { display:none; }
          </style>
          <div role="status" aria-live="polite" class="${this._estado}">
            ${iconos[this._estado] ?? ""}
            <span class="texto">${textos[this._estado] ?? ""}</span>
          </div>`;
    }
}

customElements.define("galeno-conexion", GalenoConexion);
