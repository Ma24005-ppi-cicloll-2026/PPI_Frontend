// Vincula el ciclo de vida de la ruta con el de su controlador.
class GalenoPantalla extends HTMLElement {

    // Prepara el estado interno antes de montar el componente.
    constructor() {
        super();
        this._irA = () => {};
        this._modelo = null;
        // Servicios o utilidades que se le pasan al modelo; las pruebas ponen aquí sus versiones falsas.
        this.dependencias = {};
        this._activa = false;
    }

    // Actualiza la función de navegación.
    set irA(funcion) { this._irA = typeof funcion === "function" ? funcion : () => {}; }
    // Devuelve la función de navegación.
    get irA() { return this._irA; }

    // Prepara el componente cuando se incorpora al documento.
    connectedCallback() {
        if (this._activa) return;
        this._activa = true;
        this.iniciarModelo();
    }

    // Libera las escuchas y recursos al retirar el componente.
    disconnectedCallback() {
        this._activa = false;
        this._modelo?.destruir?.();
    }

    // Monta el controlador de esta ruta con su propia vista.
    iniciarModelo() {}
}

class GalenoPantallaCitas extends GalenoPantalla {
    // Monta el controlador de esta ruta con su propia vista.
    iniciarModelo() { this._modelo = new CitasModel(this, this.dependencias); this._modelo.iniciar(); }
}

class GalenoPantallaLogin extends GalenoPantalla {
    // Prepara el estado interno antes de montar el componente.
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
    }

    // Coloca el foco en el selector de tipo de documento.
    enfocarEntrada() {
        this.shadowRoot.querySelector("#tipo").focus({ preventScroll: true });
    }

    // Monta el controlador de esta ruta con su propia vista.
    iniciarModelo() {
        this.shadowRoot.replaceChildren(new Plantillas().clonar("plantilla-pantalla-login"));
        const aviso = this.closest("galeno-app")?.querySelector("#aviso") ?? document.querySelector("#aviso");
        this._modelo = new LoginModel(this.shadowRoot, { irA: this.irA, aviso, ...this.dependencias });
        this._modelo.iniciar();
    }
}

class GalenoPantallaDashboard extends GalenoPantalla {
    // Monta el controlador de esta ruta con su propia vista.
    iniciarModelo() { this._modelo = new DashboardModel(this, { irA: this.irA, ...this.dependencias }); this._modelo.iniciar(); }
}

class GalenoPantallaConsulta extends GalenoPantalla {
    // Prepara el estado interno antes de montar el componente.
    constructor() { super(); this.idConsulta = null; }
    // Monta el controlador de esta ruta con su propia vista.
    iniciarModelo() {
        this._modelo = new SeguimientoModel(this, this.idConsulta, { irA: this.irA, ...this.dependencias });
        this._modelo.iniciar();
    }
}

customElements.define("galeno-pantalla-citas", GalenoPantallaCitas);
customElements.define("galeno-pantalla-login", GalenoPantallaLogin);
customElements.define("galeno-pantalla-dashboard", GalenoPantallaDashboard);
customElements.define("galeno-pantalla-consulta", GalenoPantallaConsulta);
