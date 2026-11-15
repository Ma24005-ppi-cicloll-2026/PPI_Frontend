// Cada ruta de la SPA es un Web Component con ciclo de vida propio.
// Las vistas siguen usando los modelos de boundary para coordinar datos y eventos,
// pero ahora el DOM de cada pantalla queda dentro de su elemento personalizado.
class GalenoPantalla extends HTMLElement {

    constructor() {
        super();
        this._irA = () => {};
        this._modelo = null;
        this._activa = false;
    }

    set irA(funcion) { this._irA = typeof funcion === "function" ? funcion : () => {}; }
    get irA() { return this._irA; }

    connectedCallback() {
        if (this._activa) return;
        this._activa = true;
        this.iniciarModelo();
    }

    disconnectedCallback() {
        this._activa = false;
        this._modelo?.destruir?.();
    }

    iniciarModelo() {}
}

class GalenoPantallaCitas extends GalenoPantalla {
    iniciarModelo() { this._modelo = new CitasModel(this); this._modelo.iniciar(); }
}

class GalenoPantallaLogin extends GalenoPantalla {
    iniciarModelo() { this._modelo = new LoginModel(this, { irA: this.irA }); this._modelo.iniciar(); }
}

class GalenoPantallaDashboard extends GalenoPantalla {
    iniciarModelo() { this._modelo = new DashboardModel(this, { irA: this.irA }); this._modelo.iniciar(); }
}

class GalenoPantallaConsulta extends GalenoPantalla {
    constructor() { super(); this.idConsulta = null; }
    iniciarModelo() {
        this._modelo = new SeguimientoModel(this, this.idConsulta, { irA: this.irA });
        this._modelo.iniciar();
    }
}

customElements.define("galeno-pantalla-citas", GalenoPantallaCitas);
customElements.define("galeno-pantalla-login", GalenoPantallaLogin);
customElements.define("galeno-pantalla-dashboard", GalenoPantallaDashboard);
customElements.define("galeno-pantalla-consulta", GalenoPantallaConsulta);
