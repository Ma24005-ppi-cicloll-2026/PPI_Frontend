// Pantalla de inicio de sesion con dos entradas:
//   - "Soy paciente": se identifica con tipo y numero de documento (no hay lista de personas).
//   - "Soy personal de la clinica": elige clinica y luego su usuario (como SesionModels del backend).
// La sesion (quien es y su rol) se guarda con Sesion.iniciar(); de ahi salen los permisos.
class LoginModel {

    constructor(contenedor) {
        this.contenedor = contenedor;
        this.personasRoles = [];
        this.pacientesRegistrados = new Set();   // idPersona de quienes tienen rol de paciente
        this.personaEncontrada = null;
    }

    async iniciar() {
        this.contenedor.innerHTML = `
            <h2>Iniciar sesión</h2>
            <galeno-pestanas id="pestanas" style="display:block;">
                <div slot="p0">
                    <galeno-buscador-tipo-documentos id="buscaTipo" label="Tipo de documento"></galeno-buscador-tipo-documentos>
                    <div style="margin-top:1rem;">
                        <label for="numeroDocumento" style="display:block; font-weight:600; margin-bottom:.3rem;">Número de documento</label>
                        <input id="numeroDocumento" type="text" autocomplete="off" placeholder="Elija primero el tipo de documento"
                               style="width:100%; box-sizing:border-box; padding:.55rem .7rem; border:1px solid #829CBC; border-radius:.4rem; font:inherit;">
                        <small id="ayudaDocumento" role="status" style="display:block; margin-top:.3rem; min-height:1.2em;"></small>
                    </div>
                    <p id="encontrado" hidden style="font-weight:600;"></p>
                    <button id="ingresarPaciente" type="button" hidden>Ingresar</button>
                </div>
                <div slot="p1">
                    <galeno-autocomplete id="selClinica" label="Clínica"></galeno-autocomplete>
                    <div style="margin-top:1rem;"><galeno-autocomplete id="selPersonaRol" label="Usuario"></galeno-autocomplete></div>
                </div>
            </galeno-pestanas>`;
        const $ = id => this.contenedor.querySelector("#" + id);
        this.aviso = document.querySelector("#aviso");
        $("pestanas").titulos = ["Soy paciente", "Soy personal de la clínica"];
        this.selClinica = $("selClinica"); this.selPersonaRol = $("selPersonaRol");
        this.encontrado = $("encontrado"); this.botonPaciente = $("ingresarPaciente");

        // ----- personal de la clinica -----
        this.selClinica.formatoTexto = c => c.nombre;
        this.selPersonaRol.formatoTexto = pr =>
            `${pr.idPersona?.nombres ?? ""} ${pr.idPersona?.apellidos ?? ""} (${pr.idRol?.nombre ?? "sin rol"})`.trim();
        this.selClinica.addEventListener("galeno-seleccion", e => this.alElegirClinica(e.detail.valor));
        this.selPersonaRol.addEventListener("galeno-seleccion", e => this.alElegirPersonaRol(e.detail.valor));

        // ----- paciente -----
        this.busquedaDocumento = new BusquedaPorDocumento({
            buscaTipo: $("buscaTipo"), numero: $("numeroDocumento"), ayuda: $("ayudaDocumento"),
            filtro: persona => this.pacientesRegistrados.has(persona.idPersona),
            textoNoEncontrado: "No se encontró un paciente con ese documento",
            alEncontrar: persona => this.alEncontrarPaciente(persona),
            alVaciar: () => this.ocultarPaciente(),
            alFallar: e => this.aviso.mostrar(e.message, "error")
        });
        this.busquedaDocumento.conectar();
        this.botonPaciente.addEventListener("click", () => this.ingresarPaciente());

        try {
            const clinicas = await new ClinicaService().listar(0, 100);
            this.selClinica.opciones = clinicas.filter(c => c.activo);
            this.personasRoles = await new PersonaRolService().listar(0, 1000);
            this.personasRoles
                .filter(pr => Sesion.normalizarRol(pr.idRol?.nombre) === "paciente")
                .forEach(pr => this.pacientesRegistrados.add(pr.idPersona?.idPersona));
            $("buscaTipo").opciones = await new TipoDocumentoService().listar(0, 100);
        } catch (e) { this.aviso.mostrar(e.message, "error"); }
    }

    // ---------- personal ----------

    alElegirClinica(clinica) {
        this.selPersonaRol.limpiar();
        // como el backend: solo personal de esa clinica, sin pacientes
        this.selPersonaRol.opciones = this.personasRoles.filter(pr =>
            pr.idClinica?.idClinica === clinica.idClinica &&
            Sesion.normalizarRol(pr.idRol?.nombre) !== "paciente");
    }

    alElegirPersonaRol(pr) {
        Sesion.iniciar({
            idPersonaRol: pr.idPersonaRol,
            idPersona: pr.idPersona?.idPersona,
            nombre: `${pr.idPersona?.nombres ?? ""} ${pr.idPersona?.apellidos ?? ""}`.trim(),
            rol: pr.idRol?.nombre ?? "",
            clinica: pr.idClinica?.nombre ?? "",
            idClinica: pr.idClinica?.idClinica
        });
        this.aviso.mostrar("Sesión iniciada", "exito");
    }

    // ---------- paciente ----------

    alEncontrarPaciente(persona) {
        this.personaEncontrada = persona;
        this.encontrado.textContent = `Paciente: ${persona.nombres ?? ""} ${persona.apellidos ?? ""}`.trim();
        this.encontrado.hidden = false;
        this.botonPaciente.hidden = false;
    }

    ocultarPaciente() {
        this.personaEncontrada = null;
        this.encontrado.hidden = true;
        this.botonPaciente.hidden = true;
    }

    ingresarPaciente() {
        const p = this.personaEncontrada;
        if (!p) return;
        Sesion.iniciar({
            idPersona: p.idPersona,
            nombre: `${p.nombres ?? ""} ${p.apellidos ?? ""}`.trim(),
            rol: "Paciente", clinica: ""
        });
        this.aviso.mostrar("Sesión iniciada", "exito");
    }
}
