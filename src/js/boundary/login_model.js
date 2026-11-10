// HU1 · Login del personal de la clinica (medico, enfermero, recepcion, administracion...).
//   Usuario:     su nombre completo (ej. "Ana López").
//   Contraseña:  su documento. Primero elige el TIPO (DUI, Pasaporte...) y escribe el numero; el numero debe
//                cumplir la expresion regular que ese tipo tiene guardada en el backend (tipo_documento).
// Si coinciden se guarda la sesion con Sesion.iniciar(); de ahi salen su rol y las pantallas que ve.
// "Recordarme" guarda solo el nombre de usuario (nunca el documento) en este navegador.
// Los pacientes NO inician sesion: piden su consulta en la pantalla publica "Solicitar consulta".
const CLAVE_USUARIO_RECORDADO = "galeno-usuario";

class LoginModel {

    // irA: funcion para ir a otra pantalla (el AppModel la pasa); almacen: donde se recuerda el usuario
    constructor(contenedor, { irA = () => {}, almacen = null } = {}) {
        this.contenedor = contenedor;
        this.irA = irA;
        this.almacen = almacen;
        this.personasRoles = [];
        this.documentos = [];
        this.tipos = [];
        this.datos = null;                    // promesa: true si el backend ya respondio bien
    }

    guardado() {
        try { return this.almacen ?? window.localStorage; } catch (e) { return null; }
    }

    iniciar() {
        this.contenedor.innerHTML = `
            <section class="login" aria-labelledby="titulo-login">
                <h2 id="titulo-login">Iniciar sesión</h2>
                <p>Bienvenido a GalenoSV</p>
                <form id="formulario" novalidate>
                    <galeno-campo id="usuario" label="Usuario" autocomplete="username"
                                  placeholder="Nombre y apellido" ayuda="Escriba su nombre completo"></galeno-campo>
                    <galeno-buscador-tipo-documentos id="tipo" label="Tipo de documento"></galeno-buscador-tipo-documentos>
                    <galeno-campo id="clave" label="Contraseña (su número de documento)" type="password"
                                  autocomplete="current-password" placeholder="Elija primero el tipo de documento"
                                  ayuda="Escríbalo con el formato del tipo de documento"></galeno-campo>
                    <galeno-campo id="recordar" label="Recordarme" type="checkbox"></galeno-campo>
                    <div id="mensaje" role="alert" class="mensaje-error"></div>
                    <button id="ingresar" type="submit">Iniciar sesión</button>
                </form>
                <p class="enlace-aparte">¿Es paciente? <button id="solicitar" type="button" class="enlace">Solicitar una consulta sin iniciar sesión</button></p>
            </section>`;
        const $ = id => this.contenedor.querySelector("#" + id);
        this.aviso = document.querySelector("#aviso");
        this.campoUsuario = $("usuario"); this.buscaTipo = $("tipo"); this.campoClave = $("clave"); this.campoRecordar = $("recordar");
        this.mensaje = $("mensaje"); this.boton = $("ingresar");

        const recordado = this.guardado()?.getItem(CLAVE_USUARIO_RECORDADO);
        if (recordado) { this.campoUsuario.value = recordado; this.campoRecordar.value = true; }

        $("formulario").addEventListener("submit", e => { e.preventDefault(); this.ingresar(); });
        $("solicitar").addEventListener("click", () => this.irA("solicitar"));
        [this.campoUsuario, this.campoClave].forEach(c => c.addEventListener("galeno-cambio", () => this.limpiarErrores()));
        this.buscaTipo.addEventListener("galeno-seleccion", e => {
            this.limpiarErrores();
            const indicaciones = e.detail.valor?.indicaciones;      // ej. "Formato: 00000000-0"
            this.campoClave.entrada?.setAttribute("placeholder", indicaciones || "Escriba su número de documento");
        });
        (recordado ? this.campoClave : this.campoUsuario).focus();
        this.datos = this.cargarDatos();      // se piden al backend mientras la persona escribe
        return this.datos;
    }

    async cargarDatos() {
        try {
            this.personasRoles = await new PersonaRolService().listar(0, 1000);
            this.documentos = await new DocumentoService().listar(0, 5000);
            this.tipos = await new TipoDocumentoService().listar(0, 100);
            this.buscaTipo.opciones = this.tipos;
            return true;
        } catch (e) { return false; }
    }

    limpiarErrores() {
        this.mensaje.textContent = "";
        this.campoUsuario.error(""); this.buscaTipo.error?.(""); this.campoClave.error("");
    }

    // "01234567-8" y "012345678" son el mismo documento: se comparan sin guiones ni espacios
    limpio(texto) { return String(texto ?? "").replace(/[\s-]/g, "").toLowerCase(); }

    // true si el texto cumple la expresion regular del tipo (si no tiene, o es invalida, no se exige)
    formatoValido(tipo, texto) {
        if (!tipo?.expresionRegular) return true;
        try { return new RegExp(tipo.expresionRegular).test(texto); }
        catch (e) { return true; }
    }

    // La contraseña es un documento de la persona: del tipo elegido y con ese numero.
    claveValida(pr, tipo, numero) {
        const idPersona = pr.idPersona?.idPersona;
        return this.documentos.some(d => d.idPersona?.idPersona === idPersona &&
            d.idTipoDocumento?.idTipoDocumento === tipo.idTipoDocumento &&
            this.limpio(d.valor) === this.limpio(numero));
    }

    // Devuelve los datos de la sesion, o null si usuario/documento no coinciden con ningun empleado.
    autenticar(usuario, tipo, numero) {
        const nombre = DatosClinica.normalizar(usuario);
        const empleado = this.personasRoles.find(pr =>
            Sesion.normalizarRol(pr.idRol?.nombre) !== "paciente" &&
            DatosClinica.normalizar(DatosClinica.nombre(pr.idPersona)) === nombre &&
            this.claveValida(pr, tipo, numero));
        if (!empleado) return null;
        return {
            idPersonaRol: empleado.idPersonaRol, idPersona: empleado.idPersona?.idPersona,
            nombre: DatosClinica.nombre(empleado.idPersona), rol: empleado.idRol?.nombre ?? "",
            clinica: empleado.idClinica?.nombre ?? "", idClinica: empleado.idClinica?.idClinica
        };
    }

    async ingresar() {
        const usuario = this.campoUsuario.value.trim();
        const clave = this.campoClave.value.trim();
        const tipo = this.buscaTipo.seleccionado;
        this.limpiarErrores();
        if (!usuario || !tipo || !clave) {
            if (!usuario) this.campoUsuario.error("Escriba su nombre de usuario");
            if (!tipo) this.mensaje.textContent = "Elija el tipo de documento";
            if (!clave) this.campoClave.error("Escriba su contraseña");
            (usuario ? this.campoClave : this.campoUsuario).focus();
            return;
        }
        if (!this.formatoValido(tipo, clave)) {          // el formato lo dicta la expresion regular del tipo
            this.campoClave.error(`No tiene el formato de ${tipo.nombre}` + (tipo.indicaciones ? `: ${tipo.indicaciones}` : ""));
            this.campoClave.focus();
            return;
        }
        this.boton.disabled = true; this.boton.textContent = "Verificando...";
        try {
            if (!(await this.datos)) {                        // el backend no respondio: se intenta de nuevo una vez
                this.datos = this.cargarDatos();
                if (!(await this.datos)) {
                    this.mensaje.textContent = "No se pudo conectar con el servidor. Intente de nuevo.";
                    return;
                }
            }
            const sesion = this.autenticar(usuario, tipo, clave);
            if (!sesion) {
                this.mensaje.textContent = "Usuario o contraseña incorrectos";
                this.campoClave.value = "";
                this.campoClave.focus();
                return;
            }
            this.recordar(usuario);
            Sesion.iniciar(sesion);
            this.aviso?.mostrar("Sesión iniciada", "exito");
        } finally {
            this.boton.disabled = false; this.boton.textContent = "Iniciar sesión";
        }
    }

    recordar(usuario) {
        const lugar = this.guardado();
        try {
            if (this.campoRecordar.value) lugar?.setItem(CLAVE_USUARIO_RECORDADO, usuario);
            else lugar?.removeItem(CLAVE_USUARIO_RECORDADO);
        } catch (e) { /* si el navegador lo bloquea, simplemente no se recuerda */ }
    }
}
