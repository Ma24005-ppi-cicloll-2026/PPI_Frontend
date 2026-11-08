// <galeno-instalador-app>: boton "Instalar aplicacion". Solo aparece cuando el navegador
// dice que la app se puede instalar (necesita manifest.webmanifest + sw.js y localhost/HTTPS).
//   <galeno-instalador-app registrar></galeno-instalador-app>
// Con el atributo `registrar` tambien registra el service worker (sw.js).
// Emite "galeno-instalacion" { resultado: "accepted" | "dismissed" }.
class GalenoInstaladorApp extends HTMLElement {

    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this._evento = null;
        this._alOfrecer = e => { e.preventDefault(); this._evento = e; this.pintar(); };
        this._alInstalar = () => { this._evento = null; this.pintar(); };
    }

    connectedCallback() {
        window.addEventListener("beforeinstallprompt", this._alOfrecer);
        window.addEventListener("appinstalled", this._alInstalar);
        if (this.hasAttribute("registrar") && "serviceWorker" in navigator) {
            navigator.serviceWorker.register(this.getAttribute("sw") || "sw.js").catch(() => {});
        }
        this.pintar();
    }

    disconnectedCallback() {
        window.removeEventListener("beforeinstallprompt", this._alOfrecer);
        window.removeEventListener("appinstalled", this._alInstalar);
    }

    async instalar() {
        if (!this._evento) return;
        this._evento.prompt();
        const eleccion = await this._evento.userChoice;
        this._evento = null;
        this.pintar();
        this.dispatchEvent(new CustomEvent("galeno-instalacion",
            { detail: { resultado: eleccion.outcome }, bubbles: true, composed: true }));
    }

    pintar() {
        this.shadowRoot.innerHTML = this._evento ? `
          <style>
            button { padding:.5rem 1rem; border:0; border-radius:.4rem; background:#629DCB;
                     color:#fff; cursor:pointer; font:inherit; }
          </style>
          <button id="instalar" type="button">Instalar aplicación</button>` : "";
        const b = this.shadowRoot.querySelector("#instalar");
        if (b) b.addEventListener("click", () => this.instalar());
    }
}

customElements.define("galeno-instalador-app", GalenoInstaladorApp);
