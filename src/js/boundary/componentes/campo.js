class GalenoCampo extends HTMLElement {

    // Prepara el estado interno antes de montar el componente.
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this.pintado = false;
    }

    // Prepara el componente cuando se incorpora al documento.
    connectedCallback() { if (!this.pintado) this.pintar(); }

    // Devuelve el control de entrada interno.
    get entrada() { return this.shadowRoot.querySelector("input, textarea"); }

    // Actualiza el bloqueo de la entrada.
    set deshabilitado(v) {
        if (!this.pintado) this.pintar();
        this.entrada.disabled = Boolean(v);
    }
    // Devuelve el bloqueo de la entrada.
    get deshabilitado() { return Boolean(this.entrada?.disabled); }

    // Devuelve el valor de la entrada.
    get value() {
        const e = this.entrada;
        if (!e) return this.getAttribute("type") === "checkbox" ? false : "";
        return e.type === "checkbox" ? e.checked : e.value;
    }
    // Actualiza el valor de la entrada.
    set value(v) {
        if (!this.pintado) this.pintar();
        const e = this.entrada;
        if (e.type === "checkbox") e.checked = Boolean(v); else e.value = v ?? "";
    }

    // Lleva el foco al control que recibe la entrada.
    focus() { this.entrada?.focus(); }

    // Actualiza el texto de ayuda.
    set ayuda(v) {
        if (!this.pintado) this.pintar();
        const a = this.shadowRoot.querySelector("#ayuda");
        if (a) a.textContent = v ?? "";
    }

    // Actualiza el mensaje de validación del control.
    error(mensaje) {
        if (!this.pintado) this.pintar();
        this.shadowRoot.querySelector("#error").textContent = mensaje || "";
        this.entrada.setAttribute("aria-invalid", String(Boolean(mensaje)));
    }

    // Escapa los caracteres con significado en HTML.
    escapar(v) {
        return String(v ?? "").replace(/[&<>"']/g,
            c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
    }

    // Actualiza la vista con los datos y el estado actuales.
    pintar() {
        this.pintado = true;
        const tipo = this.getAttribute("type") || "text";
        const etiqueta = this.escapar(this.getAttribute("label") || "");
        const ayuda = this.escapar(this.getAttribute("ayuda") || "");
        const estilos = `
          <style>
            :host { display:block; font-family:inherit; color:var(--tinta, #1D3461); min-width:0; }
            label { display:block; font-weight:600; margin-bottom:.3rem; font-size:var(--tamano-etiqueta, var(--fs-1, .875rem));
                    white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
            .fila { display:flex; gap:.4rem; }
            input:not([type=checkbox]), textarea { flex:1; min-width:0; box-sizing:border-box; padding:.6rem .7rem;
                   border:1px solid var(--borde-fuerte, #9FB0B8); border-radius:var(--radio-control, .625rem); font:inherit;
                   color:var(--texto, #26354E); background:var(--superficie, #fff);
                   transition:border-color var(--velocidad, 180ms), background var(--velocidad, 180ms); }
            input:not([type=checkbox]) { height:var(--altura-control, 2.75rem); }
            textarea { resize:vertical; min-height:6rem; }
            input::placeholder, textarea::placeholder { color:var(--texto-placeholder, var(--inactivo, #8CA0A8)); overflow:hidden; text-overflow:ellipsis; }
            input:disabled, textarea:disabled { background:var(--info-fondo, #EDF3F2);
                   border:1px solid var(--borde, #E3EAEA); color:var(--inactivo, #8CA0A8); cursor:not-allowed; }
            input[aria-invalid=true], textarea[aria-invalid=true] { border-color:var(--error, #A8402F); border-width:2px; }
            input:focus-visible, button:focus-visible { outline:3px solid var(--foco, #2F6F73); outline-offset:2px; }
            .check { display:flex; align-items:center; gap:.5rem; font-weight:400; min-height:2.5rem; }
            input[type=checkbox] { width:1.2rem; height:1.2rem; accent-color:var(--primario, #2F6F73); }
            button { padding:0 .8rem; border:1px solid var(--tinta, #1D3461); background:var(--superficie, #fff); color:var(--tinta, #1D3461);
                     border-radius:var(--radio-control, .625rem); cursor:pointer; font:inherit; min-height:2.75rem; }
            button:hover { background:var(--info-fondo, #EDF3F2); }
            small { display:block; min-block-size:var(--alto-ayuda, 0px); margin-top:.25rem; color:var(--tinta-suave, #44577B); font-size:var(--fs-1, .875rem); }
            #error { color:var(--error, #A8402F); font-weight:600; min-height:1.2em; font-size:var(--fs-1, .875rem); }
            #error:empty { display:none; }
            .icono { align-self:center; flex:0 0 auto; color:var(--inactivo, #8CA0A8); }
            button.x { display:none; align-self:center; flex:0 0 auto; width:2rem; height:2rem; padding:0;
                       justify-content:center; align-items:center; border:0; border-radius:50%;
                       background:none; color:var(--tinta-suave, #44577B); font-size:1.1rem; line-height:1; cursor:pointer; }
            button.x:hover { background:var(--info-fondo, #EDF3F2); color:var(--tinta, #1D3461); }
            input:not(:placeholder-shown) + button.x { display:inline-flex; }
            @media (prefers-reduced-motion: reduce) { :host { --velocidad:0ms; } }
          </style>`;
        if (tipo === "checkbox") {
            this.shadowRoot.innerHTML = `${estilos}<label class="check"><input type="checkbox">${etiqueta}</label><div id="error" role="alert"></div>`;
        } else {
            const control = tipo === "textarea"
                ? `<textarea id="c" rows="5" placeholder="${this.escapar(this.getAttribute("placeholder") || "")}" aria-describedby="ayuda error"></textarea>`
                : `<input id="c" type="${this.escapar(tipo)}" autocomplete="${this.escapar(this.getAttribute("autocomplete") || "off")}"
                       placeholder="${this.escapar(this.getAttribute("placeholder") || "")}" aria-describedby="ayuda error">`;
            const icono = tipo !== "textarea" && this.getAttribute("icono") === "lupa"
                ? '<svg class="icono" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false"><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="2"/><path d="m20 20-3.5-3.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
                : "";
            const limpiar = tipo !== "textarea" && this.hasAttribute("limpiar") && tipo !== "date"
                ? '<button class="x" type="button" aria-label="Limpiar" title="Limpiar">×</button>'
                : "";
            this.shadowRoot.innerHTML = `${estilos}
              <label for="c">${etiqueta}</label>
              <div class="fila">
                ${icono}
                ${control}
                ${tipo === "password" ? '<button id="ver" type="button" aria-pressed="false">Mostrar</button>' : limpiar}
              </div>
              <small id="ayuda">${ayuda}</small>
              <div id="error" role="alert"></div>`;
        }
        const e = this.entrada;
        // Emite el cambio con el valor actual del campo.
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
        const x = this.shadowRoot.querySelector("button.x");
        if (x) x.addEventListener("click", () => {
            e.value = "";
            e.focus();
            this.dispatchEvent(new CustomEvent("galeno-cambio",
                { detail: { valor: this.value }, bubbles: true, composed: true }));
        });
    }
}

customElements.define("galeno-campo", GalenoCampo);
