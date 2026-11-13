// HU2 · Login del empleado.
//   La pantalla pide el TIPO de documento (DUI, Pasaporte...) y el NUMERO. Con eso se prueba la identidad:
//   el numero debe cumplir la expresion regular del tipo (tabla tipo_documento) y pertenecer a un empleado,
//   es decir, a una persona que tiene algun rol que no es "paciente".
// Si coincide se guarda la sesion con Sesion.iniciar(), con TODOS los roles-clinicas de esa persona; el Dashboard
// (HU3) es quien le deja elegir con cual trabajar. Los pacientes no inician sesion (buscan sus citas en HU1).
class LoginModel {

    // irA: funcion para ir a otra pantalla (el AppModel la pasa)
    constructor(contenedor, { irA = () => {} } = {}) {
        this.contenedor = contenedor;
        this.irA = irA;
        this.personasRoles = [];
        this.documentos = [];
        this.datos = null;                    // promesa: true si el backend ya respondio bien
    }

    iniciar() {
        this.contenedor.innerHTML = `
            <section class="login" aria-labelledby="titulo-login">
                <div class="login-marco">
                    <div class="panel-marca">
                        <svg class="forma" viewBox="0 0 400 400" aria-hidden="true" focusable="false">
                            <path d="M310 60c60 40 80 130 20 190s-160 60-210 0-30-160 50-200 110-30 140 10z"
                                  fill="none" stroke="rgba(255,255,255,.14)" stroke-width="3"/>
                            <path d="M260 170h-60v-60h-40v60h-60v40h60v60h40v-60h60z" fill="rgba(255,255,255,.10)"/>
                        </svg>
                        <p class="marca-nombre">
                            <svg viewBox="0 0 32 32" width="30" height="30" aria-hidden="true" focusable="false">
                                <rect x="2.5" y="2.5" width="27" height="27" rx="8" fill="none" stroke="currentColor" stroke-width="2.5"/>
                                <path d="M16 9.5v13M9.5 16h13" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
                            </svg>
                            GalenoSV
                        </p>
                        <p class="marca-lema">Atención serena, registro claro.</p>
                        <p class="marca-nota">Portal de empleados: sus consultas, paso a paso.</p>
                    </div>
                    <div class="tarjeta login-tarjeta">
                        <div class="login-cabecera">
                            <svg class="logo" viewBox="0 0 32 32" width="24" height="24" aria-hidden="true" focusable="false">
                                <rect x="2.5" y="2.5" width="27" height="27" rx="8" fill="none" stroke="currentColor" stroke-width="2.5"/>
                                <path d="M16 9.5v13M9.5 16h13" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
                            </svg>
                            <h2 id="titulo-login">Iniciar sesión</h2>
                        </div>
                        <p class="login-sub">Portal de empleados</p>
                        <form id="formulario" novalidate>
                            <galeno-buscador-tipo-documentos id="tipo" label="Tipo de documento"
                                                            placeholder="Elija el tipo de documento"></galeno-buscador-tipo-documentos>
                            <galeno-campo id="numero" label="Número de documento" autocomplete="off"
                                          placeholder="Elija primero el tipo de documento"
                                          ayuda="Elija primero el tipo de documento"></galeno-campo>
                            <div id="mensaje" role="alert" class="mensaje-error"></div>
                            <button id="ingresar" type="submit">Iniciar sesión</button>
                        </form>
                        <p class="enlace-aparte">¿Busca sus citas? <button id="citas" type="button" class="enlace">Ir a Buscar citas</button></p>
                    </div>
                </div>
            </section>`;
        const $ = id => this.contenedor.querySelector("#" + id);
        this.aviso = document.querySelector("#aviso");
        this.buscaTipo = $("tipo"); this.campoNumero = $("numero");
        this.mensaje = $("mensaje"); this.boton = $("ingresar");
        this.campoNumero.deshabilitado = true;

        $("formulario").addEventListener("submit", e => { e.preventDefault(); this.ingresar(); });
        $("citas").addEventListener("click", () => this.irA("citas"));
        this.campoNumero.addEventListener("galeno-cambio", () => this.limpiarErrores());
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

    async cargarDatos() {
        try {
            this.personasRoles = await new PersonaRolService().listar(0, 1000);
            this.documentos = await new DocumentoService().listar(0, 5000);
            this.buscaTipo.opciones = await new TipoDocumentoService().listar(0, 100);
            return true;
        } catch (e) {
            this.mensaje.textContent = "No se pudo conectar con el servidor. Intente de nuevo.";
            return false;
        }
    }

    limpiarErrores() {
        this.mensaje.textContent = "";
        this.campoNumero.error("");
    }

    // Devuelve los datos de la sesion { idPersona, nombre, contextos: [...] }, o null si no es un empleado.
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

    async ingresar() {
        const tipo = this.buscaTipo.seleccionado;
        const numero = this.campoNumero.value.trim();
        this.limpiarErrores();
        if (!tipo) { this.mensaje.textContent = "Elija el tipo de documento"; return; }
        if (!numero) { this.campoNumero.error("Escriba su número de documento"); this.campoNumero.focus(); return; }
        if (!Documentos.formatoValido(tipo, numero)) {     // el formato lo dicta la expresion regular del tipo
            this.campoNumero.error(Documentos.mensajeFormato(tipo));
            this.campoNumero.focus();
            return;
        }
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
            Sesion.iniciar(sesion);                 // el AppModel lleva al Dashboard
            this.aviso?.mostrar("Sesión iniciada", "exito");
        } finally {
            this.boton.disabled = false; this.boton.textContent = "Iniciar sesión";
        }
    }
}
