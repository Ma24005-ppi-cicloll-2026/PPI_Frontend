// Vincula el ciclo de vida de la ruta con el de su controlador.
class GalenoPantalla extends HTMLElement {

    // Prepara el estado interno antes de montar el componente.
    constructor() {
        super();
        this._irA = () => {};
        this._modelo = null;
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
    iniciarModelo() { this._modelo = new CitasModel(this); this._modelo.iniciar(); }
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
        this.shadowRoot.innerHTML = `
            <style>
                .login-marco {
                    box-sizing:border-box; display:grid; inline-size:min(32rem, 100%); min-inline-size:0;
                    background:var(--superficie); border:1px solid var(--borde);
                    border-radius:1rem; box-shadow:var(--sombra-2);
                    animation:entrada .25s ease-out;
                }
                @keyframes entrada {
                    from { opacity:0; transform:translateY(8px); }
                    to { opacity:1; transform:translateY(0); }
                }
                @media (prefers-reduced-motion: reduce) {
                    .login-marco { animation:none; }
                }
                .login-tarjeta {
                    min-inline-size:0; padding:1.25rem;
                    --altura-control:3rem; --tamano-etiqueta:.9rem; --alto-ayuda:1.25rem;
                    --texto-placeholder:var(--tinta-suave);
                }
                h2 { margin:0; font-size:1.75rem; line-height:1.2; font-weight:600; color:var(--tinta); }
                .subtitulo { margin:.5rem 0 1rem; color:var(--tinta-suave); }
                form { display:grid; gap:.75rem; }
                button { font:inherit; font-weight:600; cursor:pointer; }
                button:focus-visible { outline:3px solid var(--foco); outline-offset:2px; }
                button:disabled { opacity:.65; cursor:not-allowed; }
                button[hidden] { display:none; }
                #ingresar {
                    min-block-size:3rem; inline-size:100%; padding:.5rem 1rem; border:0;
                    border-radius:var(--radio-control); color:var(--sobre-primario); background:var(--primario);
                }
                #ingresar:hover:enabled { background:var(--primario-oscuro); }
                /* Reserva espacio para que el error no desplace el enlace de citas. */
                .acciones-alerta {
                    box-sizing:border-box; min-block-size:5.75rem; display:grid; align-content:center;
                    grid-template-columns:1.125rem minmax(0, 1fr); gap:0 .5rem;
                    border-radius:.5rem; border-inline-start:3px solid transparent; padding:.5rem .75rem;
                    font-size:.875rem; line-height:1.35;
                }
                .acciones-alerta:has(#mensaje:not(:empty)) {
                    background:var(--error-fondo); border-inline-start-color:var(--error);
                }
                .acciones-alerta svg { inline-size:1.125rem; block-size:1.125rem; color:var(--error); }
                .acciones-alerta:has(#mensaje:empty) svg { visibility:hidden; }
                #reintentar { grid-column:2; justify-self:start; min-block-size:2rem; }
                #citas, #reintentar {
                    border:0; padding:0; background:none; color:var(--tinta); text-decoration:underline;
                    text-underline-offset:.15em;
                }
                #citas:hover, #reintentar:hover:enabled { color:var(--tinta-suave); }
                .enlace-aparte {
                    margin:.5rem 0 0; padding-top:.25rem; border-top:1px solid var(--borde);
                    font-size:.875rem; color:var(--tinta-suave);
                }
                #citas { min-block-size:2.75rem; }
                /* Usa el ancho que queda después del menú lateral. */
                @container acceso (width >= 56rem) {
                    .login-marco {
                        inline-size:min(60rem, 100%); grid-template-columns:minmax(0, 1fr) minmax(0, 1fr);
                        border-radius:20px;
                    }
                    .login-tarjeta { padding:2.5rem; }
                    .subtitulo { margin-bottom:1.5rem; }
                    form { gap:1rem; }
                    .enlace-aparte { margin-top:1rem; padding-top:.5rem; }
                }
                @container acceso (width < 30rem) {
                    .login-marco { inline-size:100%; border-radius:.75rem; }
                    .login-tarjeta { padding:1rem; }
                }
            </style>
            <section class="login-marco" aria-labelledby="titulo-login">
                <galeno-marca-acceso></galeno-marca-acceso>
                <div class="login-tarjeta">
                    <h2 id="titulo-login">Iniciar sesión</h2>
                    <p class="subtitulo">Use su documento para acceder al portal.</p>
                    <form id="formulario" novalidate>
                        <galeno-buscador-tipo-documentos id="tipo" label="Tipo de documento"
                            placeholder="Elija el tipo de documento"></galeno-buscador-tipo-documentos>
                        <galeno-campo id="numero" label="Número de documento" autocomplete="off"
                            placeholder="Elija primero el tipo de documento"
                            ayuda="Elija primero el tipo de documento"></galeno-campo>
                        <button id="ingresar" type="submit">Iniciar sesión</button>
                        <div class="acciones-alerta">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
                                aria-hidden="true" focusable="false">
                                <circle cx="12" cy="12" r="9"/><path d="M12 7v6m0 2v2"/>
                            </svg>
                            <div id="mensaje" role="alert"></div>
                            <button id="reintentar" type="button" hidden>Reintentar</button>
                        </div>
                    </form>
                    <p class="enlace-aparte">¿Busca sus citas? <button id="citas" type="button">Ir a Buscar citas</button></p>
                </div>
            </section>`;
        const aviso = this.closest("galeno-app")?.querySelector("#aviso") ?? document.querySelector("#aviso");
        this._modelo = new LoginModel(this.shadowRoot, { irA: this.irA, aviso });
        this._modelo.iniciar();
    }
}

class GalenoPantallaDashboard extends GalenoPantalla {
    // Monta el controlador de esta ruta con su propia vista.
    iniciarModelo() { this._modelo = new DashboardModel(this, { irA: this.irA }); this._modelo.iniciar(); }
}

class GalenoPantallaConsulta extends GalenoPantalla {
    // Prepara el estado interno antes de montar el componente.
    constructor() { super(); this.idConsulta = null; }
    // Monta el controlador de esta ruta con su propia vista.
    iniciarModelo() {
        this._modelo = new SeguimientoModel(this, this.idConsulta, { irA: this.irA });
        this._modelo.iniciar();
    }
}

customElements.define("galeno-pantalla-citas", GalenoPantallaCitas);
customElements.define("galeno-pantalla-login", GalenoPantallaLogin);
customElements.define("galeno-pantalla-dashboard", GalenoPantallaDashboard);
customElements.define("galeno-pantalla-consulta", GalenoPantallaConsulta);
