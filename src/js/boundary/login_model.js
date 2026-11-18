class LoginModel {

    // Prepara los datos que se consultan para validar el acceso.
    constructor(contenedor, { irA = () => {}, aviso = null } = {}) {
        this.contenedor = contenedor;
        this.irA = irA;
        this.aviso = aviso;
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
        this.reintentar.addEventListener("click", async () => {
            this.reintentar.disabled = true;
            this.datos = this.cargarDatos();
            await this.datos;
            this.reintentar.disabled = false;
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
        this.datos = this.cargarDatos();
        return this.datos;
    }

    // Carga los documentos, tipos y roles necesarios para identificar a la persona.
    async cargarDatos() {
        try {
            this.personasRoles = await new PersonaRolService().listar(0, 1000);
            this.documentos = await new DocumentoService().listar(0, 5000);
            this.buscaTipo.opciones = await new TipoDocumentoService().listar(0, 100);
            if (!this.reintentar.hidden) {
                this.buscaTipo.focus({ preventScroll: true });
                this.reintentar.hidden = true;
                this.mensaje.textContent = "";
            }
            return true;
        } catch (e) {
            this.mensaje.textContent = "No se pudo conectar con el servidor. Intente de nuevo.";
            this.reintentar.hidden = false;
            return false;
        }
    }

    // Retira las indicaciones de validación cuando cambia un dato.
    limpiarErrores() {
        if (this.reintentar.hidden) this.mensaje.textContent = "";
        this.campoNumero.error("");
    }

    // Busca el documento y reúne los roles del empleado por clínica.
    autenticar(tipo, numero) {
        const personas = Documentos.personasConDocumento(this.documentos, tipo, numero);
        const roles = this.personasRoles.filter(pr =>
            personas.includes(pr.idPersona?.idPersona) && Sesion.normalizarRol(pr.idRol?.nombre) !== "paciente");
        if (!roles.length) return null;
        return {
            idPersona: roles[0].idPersona.idPersona,
            nombre: DatosClinica.nombre(roles[0].idPersona),
            contextos: roles.map(pr => ({
                idPersonaRol: pr.idPersonaRol, idRol: pr.idRol?.idRol, rol: pr.idRol?.nombre ?? "",
                idClinica: pr.idClinica?.idClinica, clinica: pr.idClinica?.nombre ?? "" }))
        };
    }

    // Valida el documento y abre sesión si pertenece a un empleado.
    async ingresar() {
        if (this._ingresando || !this.reintentar.hidden) return;
        const tipo = this.buscaTipo.seleccionado;
        const numero = this.campoNumero.value.trim();
        this.limpiarErrores();
        if (!tipo) { this.mensaje.textContent = "Elija el tipo de documento"; return; }
        if (!numero) { this.campoNumero.error("Escriba su número de documento"); this.campoNumero.focus(); return; }
        if (!Documentos.formatoValido(tipo, numero)) {
            this.campoNumero.error(Documentos.mensajeFormato(tipo));
            this.campoNumero.focus();
            return;
        }
        this._ingresando = true;
        this.boton.disabled = true; this.boton.textContent = "Verificando...";
        try {
            if (!(await this.datos)) this.datos = this.cargarDatos();
            if (!(await this.datos)) return;
            const sesion = this.autenticar(tipo, numero);
            if (!sesion) {
                this.mensaje.textContent = "No encontramos un empleado con ese documento";
                this.campoNumero.value = "";
                this.campoNumero.focus();
                return;
            }
            Sesion.iniciar(sesion);
            this.aviso?.mostrar("Sesión iniciada", "exito");
        } finally {
            this._ingresando = false;
            this.boton.disabled = false; this.boton.textContent = "Iniciar sesión";
        }
    }
}
