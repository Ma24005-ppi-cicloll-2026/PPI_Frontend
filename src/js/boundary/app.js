// Elemento raíz de la aplicación. El contenido de la interfaz vive dentro de
// este Web Component; AppModel se ocupa de las rutas y de su estado de sesión.
class GalenoApp extends HTMLElement {

    constructor() {
        super();
        this._app = null;
        this._pwa = null;
        this._saltar = null;
    }

    connectedCallback() {
        if (this._app) return;
        this.innerHTML = `
            <galeno-conexion></galeno-conexion>
            <div class="app">
                <a class="saltar" href="#/" id="saltar">Saltar al contenido</a>
                <header>
                    <h1>GalenoSV</h1>
                    <span id="sesion" aria-live="polite"></span>
                    <galeno-instalar id="instalar"></galeno-instalar>
                </header>
                <nav aria-label="Menú principal"><galeno-menu id="menu"></galeno-menu></nav>
                <main id="pantalla" tabindex="-1"></main>
                <footer>GalenoSV · Sistema de gestión médica</footer>
            </div>
            <galeno-notificacion-emergente id="aviso"></galeno-notificacion-emergente>`;

        this._app = new AppModel(this);
        this._app.iniciar();
        this._pwa = new Pwa();
        this._pwa.iniciar();
        this.querySelector("#instalar").pwa = this._pwa;
        this._saltar = evento => {
            evento.preventDefault();
            this.querySelector("#pantalla").focus();
        };
        this.querySelector("#saltar").addEventListener("click", this._saltar);
    }

    disconnectedCallback() {
        this._app?.destruir();
        this._app = null;
        this._pwa?.destruir();
        this._pwa = null;
        const enlace = this.querySelector("#saltar");
        if (enlace && this._saltar) enlace.removeEventListener("click", this._saltar);
        this._saltar = null;
    }
}

customElements.define("galeno-app", GalenoApp);
