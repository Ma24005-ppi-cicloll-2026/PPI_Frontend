// <galeno-selector>: una lista desplegable para ELEGIR una opcion (clinica, rol, categoria...).
//   <galeno-selector label="Clínica" placeholder="Selecciona tu clínica..."></galeno-selector>
//   selector.opciones = [{ idClinica: "c1", nombre: "Santa Ana" }, ...];
//   selector.formatoTexto = o => o.nombre;           // como se ve cada opcion (por defecto, su "nombre")
//   selector.seleccionado                             // la opcion elegida (objeto) o null
//   selector.seleccionar(opcion);  selector.error("Elija una clínica");  selector.deshabilitado = true;
//   selector.addEventListener("galeno-seleccion", e => e.detail.valor);   // la opcion elegida, o null
class GalenoSelector extends HTMLElement {

    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this._opciones = [];
        this._seleccionado = null;
        this._deshabilitado = false;
    }

    texto(opcion) {
        if (typeof this.formatoTexto === "function") return String(this.formatoTexto(opcion) ?? "");
        return String(opcion?.nombre ?? "");
    }

    set opciones(lista) {
        this._opciones = Array.isArray(lista) ? lista : [];
        if (!this._opciones.includes(this._seleccionado)) this._seleccionado = null;
        this.pintar();
    }
    get opciones() { return this._opciones; }
    get seleccionado() { return this._seleccionado; }

    set deshabilitado(v) { this._deshabilitado = Boolean(v); this.pintar(); }
    get deshabilitado() { return this._deshabilitado; }

    connectedCallback() { this.pintar(); }

    seleccionar(opcion) {
        this._seleccionado = this._opciones.includes(opcion) ? opcion : null;
        this.pintar();
    }

    error(mensaje) {
        const e = this.shadowRoot.querySelector("#error");
        if (e) e.textContent = mensaje || "";
        this.shadowRoot.querySelector("select")?.setAttribute("aria-invalid", String(Boolean(mensaje)));
    }

    escapar(v) {
        return String(v ?? "").replace(/[&<>"']/g,
            c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
    }

    pintar() {
        const indice = this._opciones.indexOf(this._seleccionado);
        this.shadowRoot.innerHTML = `
          <style>
            :host { display:block; font-family:inherit; color:#1D3461; }
            label { display:block; font-weight:600; margin-bottom:.3rem; }
            select { width:100%; box-sizing:border-box; padding:.6rem .7rem; border:1px solid #5D7899;
                     border-radius:.4rem; font:inherit; height:2.75rem; background:#fff; color:inherit; }
            select:disabled { background:#EEF2F7; cursor:not-allowed; }
            select[aria-invalid=true] { border-color:#B3261E; border-width:2px; }
            select:focus-visible { outline:3px solid #629DCB; outline-offset:2px; }
            #error { color:#B3261E; font-weight:600; min-height:1.2em; }
          </style>
          <label for="s">${this.escapar(this.getAttribute("label") || "")}</label>
          <select id="s" ${this._deshabilitado ? "disabled" : ""} aria-describedby="error">
            <option value="">${this.escapar(this.getAttribute("placeholder") || "Seleccione...")}</option>
            ${this._opciones.map((o, i) => `<option value="${i}" ${i === indice ? "selected" : ""}>${this.escapar(this.texto(o))}</option>`).join("")}
          </select>
          <div id="error" role="alert"></div>`;
        this.shadowRoot.querySelector("select").addEventListener("change", e => {
            this._seleccionado = e.target.value === "" ? null : this._opciones[Number(e.target.value)];
            this.dispatchEvent(new CustomEvent("galeno-seleccion",
                { detail: { valor: this._seleccionado }, bubbles: true, composed: true }));
        });
    }
}

customElements.define("galeno-selector", GalenoSelector);
