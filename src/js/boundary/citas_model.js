// HU1 · Busqueda de citas (publica: el paciente no inicia sesion).
//   Asistente: tipo de documento -> numero (se habilita al elegir el tipo) -> clinica donde esta registrado como
//   paciente -> rango de fechas -> "Buscar citas". Cada cita sale como card (fecha, hora, clinica, procedimientos)
//   con el boton que baja el ticket en PDF, generado por el BACKEND (GET /consulta/{id}/ticket).
class CitasModel {

    constructor(contenedor, { descargar = id => new ConsultaService().descargarTicket(id) } = {}) {
        this.contenedor = contenedor;
        this.descargar = descargar;
        this.personasRoles = [];
        this.documentos = [];
        this.pacienteEn = [];             // PersonaRol de paciente de la persona identificada
        this.datos = null;
    }

    iniciar() {
        this.contenedor.innerHTML = `
            <section class="citas" aria-labelledby="titulo-citas">
                <h2 id="titulo-citas">Buscar citas</h2>
                <p>Consulte sus citas con su documento de identidad. No necesita iniciar sesión.</p>
                <form id="formulario" novalidate>
                    <galeno-buscador-tipo-documentos id="tipo" label="Tipo de documento"></galeno-buscador-tipo-documentos>
                    <galeno-campo id="numero" label="Número de documento" autocomplete="off"
                                  placeholder="Elija primero el tipo de documento"></galeno-campo>
                    <galeno-selector id="clinica" label="Clínica" placeholder="Primero escriba su documento"></galeno-selector>
                    <div class="fila-fechas">
                        <galeno-campo id="desde" label="Desde" type="date"></galeno-campo>
                        <galeno-campo id="hasta" label="Hasta" type="date"></galeno-campo>
                    </div>
                    <div id="mensaje" role="alert" class="mensaje-error"></div>
                    <button id="buscar" type="submit">Buscar citas</button>
                </form>
                <galeno-estado-vista id="estado"></galeno-estado-vista>
                <div id="resultado" class="rejilla" aria-live="polite"></div>
            </section>`;
        const $ = id => this.contenedor.querySelector("#" + id);
        this.buscaTipo = $("tipo"); this.campoNumero = $("numero"); this.selClinica = $("clinica");
        this.campoDesde = $("desde"); this.campoHasta = $("hasta");
        this.mensaje = $("mensaje"); this.estado = $("estado"); this.resultado = $("resultado");
        this.aviso = document.querySelector("#aviso");
        this.campoNumero.deshabilitado = true;
        this.selClinica.deshabilitado = true;
        this.estado.mostrar("contenido");

        $("formulario").addEventListener("submit", e => { e.preventDefault(); this.buscar(); });
        this.estado.addEventListener("galeno-reintentar", () => this.buscar());
        this.buscaTipo.addEventListener("galeno-seleccion", e => {
            const tipo = e.detail.valor;
            this.campoNumero.deshabilitado = !tipo;
            this.campoNumero.entrada.placeholder = tipo?.indicaciones || (tipo ? "Escriba su número de documento" : "Elija primero el tipo de documento");
            this.identificar();
        });
        this.campoNumero.addEventListener("galeno-cambio", () => this.identificar());
        this.resultado.addEventListener("galeno-descargar-ticket", e => this.bajarTicket(e));
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

    // Cada vez que cambia el tipo o el numero: si el documento es valido y es de un paciente, se llena el selector de clinicas.
    identificar() {
        this.mensaje.textContent = "";
        this.campoNumero.error("");
        this.pacienteEn = [];
        this.selClinica.opciones = [];
        this.selClinica.deshabilitado = true;
        const tipo = this.buscaTipo.seleccionado;
        const numero = this.campoNumero.value.trim();
        if (!tipo || !numero || !Documentos.formatoValido(tipo, numero)) return;
        const personas = Documentos.personasConDocumento(this.documentos, tipo, numero);
        this.pacienteEn = this.personasRoles.filter(pr =>
            personas.includes(pr.idPersona?.idPersona) && Sesion.normalizarRol(pr.idRol?.nombre) === "paciente");
        const clinicas = new Map();
        this.pacienteEn.forEach(pr => pr.idClinica && clinicas.set(pr.idClinica.idClinica, pr.idClinica));
        this.selClinica.opciones = [...clinicas.values()];
        this.selClinica.deshabilitado = clinicas.size === 0;
        if (clinicas.size === 1) this.selClinica.seleccionar(this.selClinica.opciones[0]);
    }

    validar() {
        const tipo = this.buscaTipo.seleccionado;
        const numero = this.campoNumero.value.trim();
        if (!tipo) { this.mensaje.textContent = "Elija el tipo de documento"; return false; }
        if (!numero) { this.campoNumero.error("Escriba su número de documento"); return false; }
        if (!Documentos.formatoValido(tipo, numero)) { this.campoNumero.error(Documentos.mensajeFormato(tipo)); return false; }
        if (!this.pacienteEn.length) { this.mensaje.textContent = "No encontramos un paciente con ese documento"; return false; }
        if (!this.selClinica.seleccionado) { this.selClinica.error("Elija la clínica"); return false; }
        const d = this.campoDesde.value, h = this.campoHasta.value;
        if (d && h && d > h) { this.campoHasta.error("La fecha final no puede ser anterior a la inicial"); return false; }
        return true;
    }

    async buscar() {
        this.mensaje.textContent = "";
        this.campoHasta.error(""); this.selClinica.error("");
        this.resultado.replaceChildren();
        if (!(await this.datos)) this.datos = this.cargarDatos();
        if (!(await this.datos)) return;
        if (!this.pacienteEn.length) this.identificar();   // por si escribio antes de que llegaran los datos
        if (!this.validar()) return;
        const clinica = this.selClinica.seleccionado;
        const idsPaciente = this.pacienteEn.filter(pr => pr.idClinica?.idClinica === clinica.idClinica).map(pr => pr.idPersonaRol);
        const rango = Agenda.rango("Rango", this.campoDesde.value, this.campoHasta.value);
        this.estado.mostrar("cargando");
        try {
            const consultas = await new ConsultaService().listar(0, 5000);
            const mias = consultas
                .filter(c => idsPaciente.includes(c.idPersonaRol?.idPersonaRol) && Agenda.enRango(c.fechaInicio, rango))
                .sort((a, b) => DatosClinica.milisegundos(a.fechaInicio) - DatosClinica.milisegundos(b.fechaInicio));
            if (!mias.length) { this.estado.mostrar("vacio", "No hay citas en esa clínica y rango de fechas."); return; }
            const cp = await new ConsultaProcedimientoService().listar(0, 5000);
            const procs = await new ProcedimientoService().listar(0, 1000);
            const nombres = new Map(procs.map(p => [p.idProcedimiento, p.nombre]));
            this.estado.mostrar("contenido");
            for (const c of mias) {
                const tarjeta = document.createElement("galeno-tarjeta-cita");
                tarjeta.cita = {
                    idConsulta: c.idConsulta, fechaInicio: c.fechaInicio, clinica: clinica.nombre,
                    procedimientos: cp.filter(x => x.idConsulta?.idConsulta === c.idConsulta)
                        .map(x => nombres.get(x.idProcedimiento) ?? "Procedimiento")
                };
                this.resultado.append(tarjeta);
            }
        } catch (e) {
            this.estado.mostrar("error", "No se pudieron cargar las citas.");
        }
    }

    async bajarTicket(e) {
        const tarjeta = e.target.closest("galeno-tarjeta-cita");
        tarjeta.ocupada = true;
        try {
            await this.descargar(e.detail.idConsulta);
            this.aviso?.mostrar("Ticket descargado", "exito");
        } catch (err) {
            this.aviso?.mostrar(err.message || "No se pudo generar el ticket", "error");
        } finally {
            tarjeta.ocupada = false;
        }
    }
}
