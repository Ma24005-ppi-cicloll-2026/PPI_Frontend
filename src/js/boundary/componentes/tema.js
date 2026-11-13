// <galeno-tema>: interruptor del tema (claro / oscuro / automatico).
//   tema.valor                  -> "claro" | "oscuro" | "auto" (lo elegido, no lo efectivo)
//   tema.oscuro                 -> true si AHORA se ve oscuro (auto resuelve con el sistema)
//   tema.elegir("claro" | "oscuro" | "auto");
//   tema.addEventListener("galeno-tema", e => e.detail.valor);
// El valor elegido se guarda en localStorage (clave "galeno-tema", con try/catch: si no hay
// almacen, queda "auto"). Aplicar el tema = poner/quitar el atributo data-tema en <html>;
// el CSS de principal.css pinta claro u oscuro segun ese atributo o el sistema.
// El boton tiene role="switch" con aria-checked (true = se ve oscuro), se maneja con
// Enter/Espacio (es un button) y cicla automatico -> claro -> oscuro -> automatico.
class GalenoTema extends HTMLElement {

    static CLAVE = "galeno-tema";
    static ORDEN = ["auto", "claro", "oscuro"];

    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this._valor = GalenoTema.leer();
        this.alCambiarSistema = () => { if (this._valor === "auto") this.pintar(); };
    }

    // lectura tolerante: si localStorage falla o trae basura, queda "automatico"
    static leer() {
        try {
            const v = localStorage.getItem(GalenoTema.CLAVE);
            return GalenoTema.ORDEN.includes(v) ? v : "auto";
        } catch (e) { return "auto"; }
    }

    static guardar(v) {
        try { localStorage.setItem(GalenoTema.CLAVE, v); } catch (e) { /* sin almacen: no persiste */ }
    }

    get valor() { return this._valor; }

    // true si ahora mismo se ve el tema oscuro (con "auto" decide el sistema)
    get oscuro() {
        if (this._valor === "oscuro") return true;
        if (this._valor === "claro") return false;
        try { return window.matchMedia("(prefers-color-scheme: dark)").matches; }
        catch (e) { return false; }
    }

    elegir(valor) {
        this._valor = GalenoTema.ORDEN.includes(valor) ? valor : "auto";
        GalenoTema.guardar(this._valor);
        this.pintar();
        this.dispatchEvent(new CustomEvent("galeno-tema",
            { detail: { valor: this._valor }, bubbles: true, composed: true }));
    }

    connectedCallback() {
        try { window.matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", this.alCambiarSistema); } catch (e) {}
        this.pintar();
    }

    disconnectedCallback() {
        try { window.matchMedia("(prefers-color-scheme: dark)").removeEventListener?.("change", this.alCambiarSistema); } catch (e) {}
    }

    // pone o quita data-tema en <html>: con "auto" lo decide el CSS segun el sistema
    static aplicar(valor) {
        const raiz = document.documentElement;
        if (valor === "claro" || valor === "oscuro") raiz.dataset.tema = valor;
        else delete raiz.dataset.tema;
    }

    pintar() {
        GalenoTema.aplicar(this._valor);
        const oscuro = this.oscuro;
        const nombres = { auto: "automático", claro: "claro", oscuro: "oscuro" };
        const etiqueta = `Tema: ${nombres[this._valor]}${this._valor === "auto" ? ` (se ve ${oscuro ? "oscuro" : "claro"})` : ""}`;
        // sol (claro) / luna (oscuro) dentro de un boton; el aria-checked del switch dice si se ve oscuro
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
            /* micro animacion de entrada del icono (se desactiva con menos movimiento) */
            button svg { transition:transform var(--velocidad, 180ms); }
            button:active svg { transform:scale(.85) rotate(-12deg); }
          </style>
          <button type="button" role="switch" aria-checked="${oscuro}" title="${etiqueta}"
                  aria-label="${etiqueta}" aria-keyshortcuts="t" class="${oscuro ? "oscuro" : ""}">
            <svg class="sol" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5 5l1.4 1.4M17.6 17.6 19 19M19 5l-1.4 1.4M6.4 17.6 5 19"/></svg>
            <svg class="luna" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5Z"/></svg>
          </button>`;
        this.shadowRoot.querySelector("button").addEventListener("click", () => {
            const i = GalenoTema.ORDEN.indexOf(this._valor);
            this.elegir(GalenoTema.ORDEN[(i + 1) % GalenoTema.ORDEN.length]);
        });
    }
}

customElements.define("galeno-tema", GalenoTema);
