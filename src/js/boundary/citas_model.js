class CitasModel {

    // Guarda el contenedor, los servicios y las utilidades que usa la búsqueda.
    constructor(contenedor, { descargar, aviso = null, servicios = null, documentos = new Documentos(), agenda = new Agenda(),
                              datosClinica = new DatosClinica(), sesion = new Sesion(),
                              plantillas = new Plantillas() } = {}) {
        this.contenedor = contenedor;
        this.escuchas = [];
        this.avisoInyectado = aviso;
        this.descargar = descargar;
        this.documentosUtil = documentos;
        this.agenda = agenda;
        this.datosClinica = datosClinica;
        this.sesion = sesion;
        this.servicios = servicios ?? {
            personasRoles: new PersonaRolService(), documentos: new DocumentoService(), tipos: new TipoDocumentoService(),
            consultas: new ConsultaService(), cps: new ConsultaProcedimientoService(), procedimientos: new ProcedimientoService() };
        this.plantillas = plantillas;
        this.personasRoles = [];
        this.documentos = [];
        this.pacienteEn = [];
        this.datos = null;
        this._busqueda = 0;
    }

    // Monta el asistente y conecta sus campos con la búsqueda.
    iniciar() {
        this.contenedor.replaceChildren(this.plantillas.clonar("plantilla-pantalla-citas"));
        // Busca un elemento de la vista por su ID.
        const $ = id => this.contenedor.querySelector("#" + id);
        this.buscaTipo = $("tipo"); this.campoNumero = $("numero"); this.selClinica = $("clinica");
        this.campoDesde = $("desde"); this.campoHasta = $("hasta");
        this.mensaje = $("mensaje"); this.estado = $("estado"); this.resultado = $("resultado");

        this.aviso = this.avisoInyectado ?? this.contenedor.closest?.("galeno-app")?.querySelector("#aviso") ?? document.querySelector("#aviso");

        this.boton = $("buscar"); this.bienvenida = $("bienvenida");
        this.textoBoton = this.boton.querySelector(".texto-boton");
        this.secciones = [...this.contenedor.querySelectorAll(".seccion-asistente")];
        this.pasos = [...this.contenedor.querySelectorAll(".paso")];

        this.campoNumero.deshabilitado = true;
        this.selClinica.deshabilitado = true;
        this.campoNumero.ayuda = "";
        this.estado.mostrar("contenido");
        this.pintarSecciones();

        // Intercepta el envío para validar dentro de la SPA.
        $("formulario").addEventListener("submit", e => { e.preventDefault(); this.buscar(); });
        // Repite la operación que produjo el error.
        this.estado.addEventListener("galeno-reintentar", () => this.buscar());
        // Actualiza los datos que dependen de la opción seleccionada.
        this.buscaTipo.addEventListener("galeno-seleccion", e => {
            const tipo = e.detail.valor;
            this.campoNumero.deshabilitado = !tipo;
            this.campoNumero.entrada.placeholder = tipo?.indicaciones || (tipo ? "Escriba su número de documento" : "Elija primero el tipo de documento");
            this.campoNumero.ayuda = tipo ? (tipo.indicaciones ? "Formato: " + tipo.indicaciones : "") : "";
            this.identificar();
        });
        this.campoNumero.addEventListener("galeno-cambio", () => this.identificar());
        // Actualiza los datos que dependen de la opción seleccionada.
        this.selClinica.addEventListener("galeno-seleccion", () => this.pintarSecciones());
        this.resultado.addEventListener("galeno-descargar-ticket", e => this.bajarTicket(e));
        // La vista reacciona cuando llegan los catálogos o las citas del servidor.
        this.escuchar("galeno-datos-listos", e => { this.buscaTipo.opciones = e.detail.tipos; });
        this.escuchar("galeno-citas-encontradas", e => this.pintarCitas(e.detail.citas));
        this.datos = this.cargarDatos();
        return this.datos;
    }


    // Descarta el trabajo pendiente de la vista al salir.
    destruir() { this._busqueda++; this.dejarDeEscuchar(); }

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

    // Actualiza el progreso y los bloqueos del asistente.
    pintarSecciones() {
        const tipo = this.buscaTipo.seleccionado;
        const numero = this.campoNumero.value.trim();
        const identificado = tipo && numero && this.documentosUtil.formatoValido(tipo, numero) && this.pacienteEn.length > 0;
        const estados = [
            tipo && numero ? (this.documentosUtil.formatoValido(tipo, numero) ? "completa" : "activa") : "activa",
            identificado ? "activa" : "bloqueada",
            identificado ? "activa" : "bloqueada"
        ];
        // Actualiza la vista con los datos y el estado actuales.
        const pintar = (nodo, i) => {
            nodo.classList.toggle("bloqueada", estados[i] === "bloqueada");
            nodo.classList.toggle("activa", estados[i] === "activa");
            nodo.classList.toggle("completa", estados[i] === "completa");
        };
        this.secciones?.forEach(pintar);
        this.pasos?.forEach((p, i) => {
            pintar(p, i);
            if (estados[i] === "activa") p.setAttribute("aria-current", "step"); else p.removeAttribute("aria-current");
        });
    }


    // Pide los catálogos a la vez y avisa con galeno-datos-listos cuando llegan.
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
                return false;
            });
    }

    // Busca al paciente y carga las clínicas vinculadas a su documento.
    identificar() {
        this.mensaje.textContent = "";
        this.campoNumero.error("");
        this.pacienteEn = [];
        this.selClinica.opciones = [];
        this.selClinica.deshabilitado = true;
        const tipo = this.buscaTipo.seleccionado;
        const numero = this.campoNumero.value.trim();
        if (!tipo || !numero || !this.documentosUtil.formatoValido(tipo, numero)) return;
        const personas = this.documentosUtil.personasConDocumento(this.documentos, tipo, numero);
        this.pacienteEn = this.personasRoles.filter(pr =>
            personas.includes(pr.idPersona?.idPersona) && this.sesion.normalizarRol(pr.idRol?.nombre) === "paciente");
        const clinicas = new Map();
        this.pacienteEn.forEach(pr => pr.idClinica && clinicas.set(pr.idClinica.idClinica, pr.idClinica));
        this.selClinica.opciones = [...clinicas.values()];
        this.selClinica.deshabilitado = clinicas.size === 0;
        if (clinicas.size === 1) this.selClinica.seleccionar(this.selClinica.opciones[0]);
        this.pintarSecciones();
    }

    // Comprueba los datos obligatorios y muestra el primer error.
    validar() {
        const tipo = this.buscaTipo.seleccionado;
        const numero = this.campoNumero.value.trim();
        if (!tipo) { this.mensaje.textContent = "Elija el tipo de documento"; return false; }
        if (!numero) { this.campoNumero.error("Escriba su número de documento"); return false; }
        if (!this.documentosUtil.formatoValido(tipo, numero)) { this.campoNumero.error(this.documentosUtil.mensajeFormato(tipo)); return false; }
        if (!this.pacienteEn.length) { this.mensaje.textContent = "No encontramos un paciente con ese documento"; return false; }
        if (!this.selClinica.seleccionado) { this.selClinica.error("Elija la clínica"); return false; }
        const d = this.campoDesde.value, h = this.campoHasta.value;
        if (d && h && d > h) { this.campoHasta.error("La fecha final no puede ser anterior a la inicial"); return false; }
        return true;
    }

    // Lanza la búsqueda sin bloquear la vista: cuando llegan las citas se dispara galeno-citas-encontradas.
    buscar() {
        const busqueda = ++this._busqueda;
        this.bienvenida.hidden = true;
        this.mensaje.textContent = "";
        this.campoHasta.error(""); this.selClinica.error("");
        this.resultado.replaceChildren();
        return (this.datos ?? Promise.resolve(false))
            .then(listos => listos || (this.datos = this.cargarDatos()))
            .then(listos => {
                if (!listos || busqueda !== this._busqueda) return;
                if (!this.pacienteEn.length) this.identificar();
                if (!this.validar()) return;
                return this.pedirCitas(busqueda);
            });
    }

    // Pide las consultas y sus procedimientos y avisa cuando están listas.
    pedirCitas(busqueda) {
        const clinica = this.selClinica.seleccionado;
        const idsPaciente = this.pacienteEn.filter(pr => pr.idClinica?.idClinica === clinica.idClinica).map(pr => pr.idPersonaRol);
        const rango = this.agenda.rango("Rango", this.campoDesde.value, this.campoHasta.value);
        this.estado.mostrar("cargando");
        this.boton.disabled = true; this.textoBoton.textContent = "Buscando citas...";
        return Promise.all([this.servicios.consultas.listarTodo(), this.servicios.cps.listarTodo(),
                            this.servicios.procedimientos.listarTodo()])
            .then(([consultas, cps, procedimientos]) => {
                if (busqueda !== this._busqueda) return;
                const citas = this.armarCitas(consultas, cps, procedimientos, idsPaciente, rango, clinica);
                this.contenedor.dispatchEvent(new CustomEvent("galeno-citas-encontradas", { detail: { citas } }));
            })
            .catch(() => {
                if (busqueda === this._busqueda) this.estado.mostrar("error", "No se pudieron cargar las citas.");
            })
            .finally(() => {
                this.boton.disabled = false; this.textoBoton.textContent = "Buscar citas";
                this.pintarSecciones();
            });
    }

    // Filtra las consultas del paciente en el rango y les pone el nombre de sus procedimientos.
    armarCitas(consultas, cps, procedimientos, idsPaciente, rango, clinica) {
        const nombres = new Map(procedimientos.map(p => [p.idProcedimiento, p.nombre]));
        return consultas
            .filter(c => idsPaciente.includes(c.idPersonaRol?.idPersonaRol) && this.agenda.enRango(c.fechaInicio, rango))
            .sort((a, b) => this.datosClinica.milisegundos(a.fechaInicio) - this.datosClinica.milisegundos(b.fechaInicio))
            .map(c => ({
                idConsulta: c.idConsulta, fechaInicio: c.fechaInicio, clinica: clinica.nombre,
                procedimientos: cps.filter(x => x.idConsulta?.idConsulta === c.idConsulta)
                    .map(x => nombres.get(x.idProcedimiento) ?? "Procedimiento")
            }));
    }

    // Reacciona a las citas recibidas: muestra las tarjetas o el aviso de que no hay.
    pintarCitas(citas) {
        if (!citas.length) {
            this.estado.mostrar("vacio", "No encontramos citas en esa clínica para esas fechas. Pruebe ajustando el rango.", { arte: true });
            return;
        }
        this.estado.mostrar("contenido");
        for (const cita of citas) {
            const tarjeta = document.createElement("galeno-tarjeta-cita");
            tarjeta.cita = cita;
            this.resultado.append(tarjeta);
        }
    }

    // Pide el PDF y mantiene el estado de carga en su tarjeta hasta que responde.
    bajarTicket(e) {
        const tarjeta = e.target.closest("galeno-tarjeta-cita");
        const { idConsulta } = e.detail;
        tarjeta.ocupada = true;
        const pedido = this.descargar
            ? Promise.resolve().then(() => this.descargar(idConsulta)).then(() => this.avisarDescarga())
            : this.servicios.consultas.ticket(idConsulta).then(ticket => this.mostrarVistaPrevia(ticket));
        return pedido
            .catch(err => this.aviso?.mostrar(err.message || "No se pudo generar el ticket", "error"))
            .finally(() => { tarjeta.ocupada = false; });
    }

    // Avisa que el ticket se descargó.
    avisarDescarga() {
        this.aviso?.mostrar("Ticket descargado", "exito");
        window.dispatchEvent(new CustomEvent("galeno-ticket-descargado"));
    }

    // Abre el PDF del ticket en un diálogo con opciones para descargarlo.
    mostrarVistaPrevia({ blob, nombre }) {
        const dialogo = this.plantillas.clonar("plantilla-dialogo-ticket").firstElementChild;

        const pdf = blob.slice(0, blob.size, "application/pdf");
        const direccion = URL.createObjectURL(pdf);
        const descarga = dialogo.querySelector("[download]");
        descarga.href = direccion;
        descarga.download = nombre;
        descarga.addEventListener("click", () => this.avisarDescarga());
        dialogo.querySelector("[target]").href = direccion;
        dialogo.querySelector("iframe").src = direccion;
        dialogo.addEventListener("close", () => {
            dialogo.remove();
            URL.revokeObjectURL(direccion);
        }, { once: true });
        document.body.append(dialogo);
        dialogo.showModal();
    }
}
