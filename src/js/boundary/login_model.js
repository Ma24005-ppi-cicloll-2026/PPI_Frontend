class LoginModel {

    // Prepara los datos que se consultan para validar el acceso.
    constructor(contenedor, { irA = () => {}, aviso = null, sesion = new Sesion(), documentos = new Documentos(),
                              datosClinica = new DatosClinica(), servicios = null } = {}) {
        this.contenedor = contenedor;
        this.escuchas = [];
        this.irA = irA;
        this.aviso = aviso;
        this.sesion = sesion;
        this.documentosUtil = documentos;
        this.datosClinica = datosClinica;
        this.servicios = servicios ?? { personasRoles: new PersonaRolService(), documentos: new DocumentoService(),
                                         tipos: new TipoDocumentoService() };
        this.personasRoles = [];
        this.documentos = [];
        this.datos = null;
        this._ingresando = false;
    }

    // Conecta el formulario con la validación y arranca la carga del catálogo.
    iniciar() {
        // Busca un elemento de la vista por su ID.
        const $ = id => this.contenedor.querySelector("#" + id);
        this.buscaTipo = $("tipo"); this.campoNumero = $("numero");
        this.mensaje = $("mensaje"); this.boton = $("ingresar");
        this.reintentar = $("reintentar");
        this.campoNumero.deshabilitado = true;

        const formulario = $("formulario");
        // Reutiliza la promesa que espera el envío y evita dos reintentos a la vez.
        this.reintentar.addEventListener("click", () => {
            this.reintentar.disabled = true;
            this.datos = this.cargarDatos();
            this.datos.then(() => { this.reintentar.disabled = false; });
        });
        // El campo vive en otra raíz, así que Enter debe pedir el envío del formulario.
        this.campoNumero.addEventListener("keydown", e => {
            if (e.key !== "Enter" || e.isComposing || e.defaultPrevented) return;
            e.preventDefault();
            formulario.requestSubmit();
        });

        // Intercepta el envío para validar dentro de la SPA.
        formulario.addEventListener("submit", e => { e.preventDefault(); this.ingresar(); });
        $("citas").addEventListener("click", () => this.irA("citas"));
        this.campoNumero.addEventListener("galeno-cambio", () => this.limpiarErrores());
        // Actualiza los datos que dependen de la opción seleccionada.
        this.buscaTipo.addEventListener("galeno-seleccion", e => {
            this.limpiarErrores();
            const tipo = e.detail.valor;
            this.campoNumero.deshabilitado = !tipo;
            this.campoNumero.entrada.placeholder = tipo?.indicaciones || (tipo ? "Escriba su número de documento" : "Elija primero el tipo de documento");
            this.campoNumero.ayuda = tipo?.indicaciones
                ? "Formato: " + tipo.indicaciones
                : "Elija primero el tipo de documento";
        });
        this.escuchar("galeno-datos-listos", e => this.alLlegarDatos(e.detail.tipos));
        this.datos = this.cargarDatos();
        return this.datos;
    }

    // Pide los catálogos a la vez; cuando llegan, la vista reacciona con el evento galeno-datos-listos.
    cargarDatos() {
        return Promise.all([this.servicios.personasRoles.listarTodo(), this.servicios.documentos.listarTodo(),
                            this.servicios.tipos.listarTodo()])
            .then(([personasRoles, documentos, tipos]) => {
                this.personasRoles = personasRoles;
                this.documentos = documentos;
                this.contenedor.dispatchEvent(new CustomEvent("galeno-datos-listos", { detail: { tipos } }));
                return true;
            })
            .catch(() => {
                this.mensaje.textContent = "No se pudo conectar con el servidor. Intente de nuevo.";
                this.reintentar.hidden = false;
                return false;
            });
    }

    // Llena el buscador de tipos cuando llegan los catálogos.
    alLlegarDatos(tipos) {
        this.buscaTipo.opciones = tipos;
        if (!this.reintentar.hidden) {
            this.buscaTipo.focus({ preventScroll: true });
            this.reintentar.hidden = true;
            this.mensaje.textContent = "";
        }
    }

    // Descarta el trabajo pendiente de la vista al salir.
    destruir() { this.dejarDeEscuchar(); }

    // Registra una escucha en el contenedor para poder quitarla al salir.
    escuchar(evento, accion) {
        this.contenedor.addEventListener(evento, accion);
        this.escuchas.push([evento, accion]);
    }

    // Quita las escuchas del contenedor para que un modelo viejo no reaccione.
    dejarDeEscuchar() {
        this.escuchas.forEach(([evento, accion]) => this.contenedor.removeEventListener(evento, accion));
        this.escuchas = [];
    }

    // Retira las indicaciones de validación cuando cambia un dato.
    limpiarErrores() {
        if (this.reintentar.hidden) this.mensaje.textContent = "";
        this.campoNumero.error("");
    }

    // Busca el documento y reúne los roles del empleado por clínica.
    autenticar(tipo, numero) {
        const personas = this.documentosUtil.personasConDocumento(this.documentos, tipo, numero);
        const roles = this.personasRoles.filter(pr =>
            personas.includes(pr.idPersona?.idPersona) && this.sesion.normalizarRol(pr.idRol?.nombre) !== "paciente");
        if (!roles.length) return null;
        return {
            idPersona: roles[0].idPersona.idPersona,
            nombre: this.datosClinica.nombre(roles[0].idPersona),
            contextos: roles.map(pr => ({
                idPersonaRol: pr.idPersonaRol, idRol: pr.idRol?.idRol, rol: pr.idRol?.nombre ?? "",
                idClinica: pr.idClinica?.idClinica, clinica: pr.idClinica?.nombre ?? "" }))
        };
    }

    // Valida el documento; cuando los catálogos están listos, abre la sesión sin bloquear la vista.
    ingresar() {
        if (this._ingresando || !this.reintentar.hidden) return Promise.resolve();
        const tipo = this.buscaTipo.seleccionado;
        const numero = this.campoNumero.value.trim();
        this.limpiarErrores();
        if (!tipo) { this.mensaje.textContent = "Elija el tipo de documento"; return Promise.resolve(); }
        if (!numero) { this.campoNumero.error("Escriba su número de documento"); this.campoNumero.focus(); return Promise.resolve(); }
        if (!this.documentosUtil.formatoValido(tipo, numero)) {
            this.campoNumero.error(this.documentosUtil.mensajeFormato(tipo));
            this.campoNumero.focus();
            return Promise.resolve();
        }
        this._ingresando = true;
        this.boton.disabled = true; this.boton.textContent = "Verificando...";
        return this.datos
            .then(listos => listos || (this.datos = this.cargarDatos()))
            .then(listos => { if (listos) this.abrirSesion(tipo, numero); })
            .finally(() => {
                this._ingresando = false;
                this.boton.disabled = false; this.boton.textContent = "Iniciar sesión";
            });
    }

    // Abre la sesión del empleado o explica por qué no se encontró.
    abrirSesion(tipo, numero) {
        const sesion = this.autenticar(tipo, numero);
        if (!sesion) {
            this.mensaje.textContent = "No encontramos un empleado con ese documento";
            this.campoNumero.value = "";
            this.campoNumero.focus();
            return;
        }
        this.sesion.iniciar(sesion);
        this.aviso?.mostrar("Sesión iniciada", "exito");
    }
}
