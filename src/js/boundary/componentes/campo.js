// <galeno-campo>: un campo de texto con su etiqueta, mensaje de ayuda y mensaje de error.
//   <galeno-campo label="Contraseña" type="password" autocomplete="current-password"
//                 ayuda="Escriba su identificador único"></galeno-campo>
//   campo.value                  // lo escrito (con type="checkbox" es true/false)
//   campo.error("Falta la contraseña");   campo.error("");   // muestra / quita el error
//   campo.addEventListener("galeno-cambio", e => e.detail.valor);
// Atributos: label, type (text, password, checkbox...), placeholder, autocomplete, ayuda.
// Con type="password" aparece el boton "Mostrar" para ver lo escrito.
class GalenoCampo extends HTMLElement {

    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this.pintado = false;
    }

    connectedCallback() { if (!this.pintado) this.pintar(); }

    get entrada() { return this.shadowRoot.querySelector("input"); }

    get value() {
        const e = this.entrada;
        if (!e) return this.getAttribute("type") === "checkbox" ? false : "";
        return e.type === "checkbox" ? e.checked : e.value;
    }
    set value(v) {
        if (!this.pintado) this.pintar();
        const e = this.entrada;
        if (e.type === "checkbox") e.checked = Boolean(v); else e.value = v ?? "";
    }

    focus() { this.entrada?.focus(); }

    error(mensaje) {
        if (!this.pintado) this.pintar();
        this.shadowRoot.querySelector("#error").textContent = mensaje || "";
        this.entrada.setAttribute("aria-invalid", String(Boolean(mensaje)));
    }

    escapar(v) {
        return String(v ?? "").replace(/[&<>"']/g,
            c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
    }

    pintar() {
        this.pintado = true;
        const tipo = this.getAttribute("type") || "text";
        const etiqueta = this.escapar(this.getAttribute("label") || "");
        const ayuda = this.escapar(this.getAttribute("ayuda") || "");
        const estilos = `
          <style>
            :host { display:block; font-family:inherit; color:#1D3461; }
            label { display:block; font-weight:600; margin-bottom:.3rem; }
            .fila { display:flex; gap:.4rem; }
            input:not([type=checkbox]) { flex:1; min-width:0; padding:.6rem .7rem; border:1px solid #5D7899;
                   border-radius:.4rem; font:inherit; min-height:2.75rem; }
            input[aria-invalid=true] { border-color:#B3261E; border-width:2px; }
            input:focus-visible, button:focus-visible { outline:3px solid #629DCB; outline-offset:2px; }
            .check { display:flex; align-items:center; gap:.5rem; font-weight:400; min-height:2.5rem; }
            input[type=checkbox] { width:1.2rem; height:1.2rem; }
            button { padding:0 .8rem; border:1px solid #1D3461; background:#fff; color:#1D3461;
                     border-radius:.4rem; cursor:pointer; font:inherit; min-height:2.75rem; }
            small { display:block; margin-top:.25rem; color:#3A4F73; }
            #error { color:#B3261E; font-weight:600; min-height:1.2em; }
          </style>`;
        if (tipo === "checkbox") {
            this.shadowRoot.innerHTML = `${estilos}<label class="check"><input type="checkbox">${etiqueta}</label><div id="error" role="alert"></div>`;
        } else {
            this.shadowRoot.innerHTML = `${estilos}
              <label for="c">${etiqueta}</label>
              <div class="fila">
                <input id="c" type="${this.escapar(tipo)}" autocomplete="${this.escapar(this.getAttribute("autocomplete") || "off")}"
                       placeholder="${this.escapar(this.getAttribute("placeholder") || "")}" aria-describedby="ayuda error">
                ${tipo === "password" ? '<button id="ver" type="button" aria-pressed="false">Mostrar</button>' : ""}
              </div>
              <small id="ayuda">${ayuda}</small>
              <div id="error" role="alert"></div>`;
        }
        const e = this.entrada;
        const avisar = () => this.dispatchEvent(new CustomEvent("galeno-cambio",
            { detail: { valor: this.value }, bubbles: true, composed: true }));
        e.addEventListener(tipo === "checkbox" ? "change" : "input", avisar);
        const ver = this.shadowRoot.querySelector("#ver");
        if (ver) ver.addEventListener("click", () => {
            const oculto = e.type === "password";
            e.type = oculto ? "text" : "password";
            ver.textContent = oculto ? "Ocultar" : "Mostrar";
            ver.setAttribute("aria-pressed", String(oculto));
        });
    }
}

customElements.define("galeno-campo", GalenoCampo);
