class GalenoApp extends HTMLElement {

    // Prepara el estado interno antes de montar el componente.
    constructor() {
        super();
        this._app = null;
        this._pwa = null;
        this._saltar = null;
    }

    // Prepara el componente cuando se incorpora al documento.
    connectedCallback() {
        if (this._app) return;
        this.replaceChildren(new Plantillas().clonar("plantilla-galeno-app"));

        this._app = new AppModel(this);
        this._app.iniciar();
        this._pwa = new Pwa();
        this._pwa.iniciar();
        this.querySelector("#instalar").pwa = this._pwa;
        this.querySelector("#invitacion").pwa = this._pwa;
        const aviso = this.querySelector("#aviso");
        this.querySelector("#instalar").aviso = aviso;
        this.querySelector("#invitacion").aviso = aviso;
        this._saltar = evento => {
            evento.preventDefault();
            this.querySelector("#pantalla").focus();
        };
        this.querySelector("#saltar").addEventListener("click", this._saltar);
    }

    // Libera las escuchas y recursos al retirar el componente.
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

// Carga los moldes HTML y después monta la aplicación.
new Plantillas().cargar()
    .then(() => customElements.define("galeno-app", GalenoApp))
    .catch(error => console.error("No se pudieron cargar las plantillas:", error));
