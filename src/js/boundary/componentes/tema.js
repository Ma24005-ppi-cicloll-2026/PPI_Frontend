class GalenoTema extends HTMLElement {

    clave = "galeno-tema";
    orden = ["auto", "claro", "oscuro"];

    // Prepara el estado interno antes de montar el componente.
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this._valor = this.leer();
        this.alCambiarSistema = () => { if (this._valor === "auto") this.pintar(); };
    }

    // Recupera el dato si existe y conserva un formato válido.
    leer() {
        try {
            const v = localStorage.getItem(this.clave);
            return this.orden.includes(v) ? v : "auto";
        } catch (e) { return "auto"; }
    }

    // Guarda el dato o reemplaza la nota del paso correspondiente.
    guardar(v) {
        try { localStorage.setItem(this.clave, v); } catch (e) {   }
    }

    // Devuelve el valor del control.
    get valor() { return this._valor; }

    // Devuelve el estado del tema oscuro.
    get oscuro() {
        if (this._valor === "oscuro") return true;
        if (this._valor === "claro") return false;
        try { return window.matchMedia("(prefers-color-scheme: dark)").matches; }
        catch (e) { return false; }
    }

    // Selecciona la opción indicada.
    elegir(valor) {
        this._valor = this.orden.includes(valor) ? valor : "auto";
        this.guardar(this._valor);
        this.pintar();
        this.dispatchEvent(new CustomEvent("galeno-tema",
            { detail: { valor: this._valor }, bubbles: true, composed: true }));
    }

    // Prepara el componente cuando se incorpora al documento.
    connectedCallback() {
        try { window.matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", this.alCambiarSistema); } catch (e) {}
        this.pintar();
    }

    // Libera las escuchas y recursos al retirar el componente.
    disconnectedCallback() {
        try { window.matchMedia("(prefers-color-scheme: dark)").removeEventListener?.("change", this.alCambiarSistema); } catch (e) {}
    }

    // Aplica el tema seleccionado al documento.
    aplicar(valor) {
        const raiz = document.documentElement;
        if (valor === "claro" || valor === "oscuro") raiz.dataset.tema = valor;
        else delete raiz.dataset.tema;
    }

    // Actualiza la vista con los datos y el estado actuales.
    pintar() {
        this.aplicar(this._valor);
        const oscuro = this.oscuro;
        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta) meta.content = oscuro ? "#0F1E26" : "#F1F8FB";
        const nombres = { auto: "automático", claro: "claro", oscuro: "oscuro" };
        const etiqueta = `Tema: ${nombres[this._valor]}${this._valor === "auto" ? ` (se ve ${oscuro ? "oscuro" : "claro"})` : ""}`;
        this.shadowRoot.innerHTML = `
          <style>
            :host { display:inline-block; }
            button { display:inline-flex; align-items:center; justify-content:center;
                     width:2.4rem; height:2.4rem; padding:0; border:1px solid var(--borde, #DCE9F0);
                     border-radius:999px; background:var(--superficie, #fff); color:var(--primario, #2F6F73);
                     cursor:pointer; font:inherit; transition:background var(--velocidad, 180ms), border-color var(--velocidad, 180ms); }
            button:hover { background:var(--celeste, #E3F1F7); border-color:var(--celeste-fuerte, #B5D8E8); }
            button:focus-visible { outline:3px solid var(--foco, #2F6F73); outline-offset:2px; }
            button svg { width:1.15rem; height:1.15rem; }
            .luna { display:none; }
            button.oscuro .luna { display:block; }
            button.oscuro .sol { display:none; }
            button svg { transition:transform var(--velocidad, 180ms); }
            button:active svg { transform:scale(.85) rotate(-12deg); }
          </style>
          <button type="button" role="switch" aria-checked="${oscuro}" title="${etiqueta}"
                  aria-label="${etiqueta}" aria-keyshortcuts="t" class="${oscuro ? "oscuro" : ""}">
            <svg class="sol" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5 5l1.4 1.4M17.6 17.6 19 19M19 5l-1.4 1.4M6.4 17.6 5 19"/></svg>
            <svg class="luna" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5Z"/></svg>
          </button>`;
        this.shadowRoot.querySelector("button").addEventListener("click", () => {
            const i = this.orden.indexOf(this._valor);
            this.elegir(this.orden[(i + 1) % this.orden.length]);
        });
    }
}

customElements.define("galeno-tema", GalenoTema);
