class Expediente {

    // Recibe los servicios y las utilidades que necesita para armar el expediente.
    constructor({ datosClinica = new DatosClinica(), flujo = new FlujoPasos({ datos: datosClinica }),
                  agenda = new Agenda({ fechas: datosClinica.fechas }), documentos = new Documentos(),
                  notas = new NotasPaso(), servicios = null } = {}) {
        this.datosClinica = datosClinica;
        this.flujo = flujo;
        this.agenda = agenda;
        this.documentos = documentos;
        this.notas = notas;
        this.servicios = servicios ?? this.serviciosPorDefecto();
    }

    // Crea un servicio por cada tabla que forma parte del expediente.
    serviciosPorDefecto() {
        return {
            consultas: new ConsultaService(), cps: new ConsultaProcedimientoService(),
            realizados: new ConsultaProcedimientoPasoService(), definidos: new ProcedimientoPasoService(),
            secuencias: new ProcedimientoPasoSecuenciaService(), procedimientos: new ProcedimientoService(),
            documentos: new DocumentoService(), ordenes: new OrdenExamenService(),
            resultados: new ExamenResultadoService(), personasRoles: new PersonaRolService()
        };
    }

    // Pide todas las tablas a la vez y entrega el expediente cuando llegan.
    cargar() {
        const claves = Object.keys(this.servicios);
        return Promise.all(claves.map(k => this.servicios[k].listarTodo()))
            .then(listas => Object.fromEntries(claves.map((k, i) => [k, listas[i]])));
    }

    // Busca el nombre del procedimiento en el catálogo.
    nombreProcedimiento(datos, id) {
        return datos.procedimientos.find(p => p.idProcedimiento === id)?.nombre ?? "Procedimiento";
    }

    // Relaciona los procedimientos de la consulta con el avance de sus pasos.
    procedimientosDe(datos, consulta) {
        return datos.cps.filter(x => x.idConsulta?.idConsulta === consulta.idConsulta).map(cp => {
            const def = this.flujo.definidos(cp.idProcedimiento, datos.definidos, datos.secuencias);
            const estado = this.flujo.estado(def, this.flujo.realizados(cp.idConsultaProcedimiento, datos.realizados));
            return { cp, nombre: this.nombreProcedimiento(datos, cp.idProcedimiento), estado };
        });
    }

    // Comprueba si la consulta todavía carece de fecha de cierre.
    abierta(consulta) { return !consulta.fechaFin; }

    // Comprueba si la consulta tiene un paso que corresponde al rol.
    laAtiende(datos, consulta, idRol) {
        const procs = this.procedimientosDe(datos, consulta);
        return procs.length === 0 || procs.some(p => this.flujo.loAtiende(p.estado, idRol));
    }

    // Indica si alguno de los procedimientos fue devuelto al paso anterior.
    devuelta(datos, consulta) {
        return this.procedimientosDe(datos, consulta).some(p => p.estado.devuelto);
    }

    // Una consulta aparece en el panel solo si está abierta y su paso actual es del rol.
    pendienteDelRol(datos, consulta, idRol) {
        return this.abierta(consulta) && this.laAtiende(datos, consulta, idRol);
    }

    // Reúne el nombre, la edad y el documento del paciente.
    paciente(datos, consulta) {
        const persona = consulta.idPersonaRol?.idPersona;
        return { nombre: this.datosClinica.nombre(persona), edad: this.agenda.edad(persona?.fechaNacimiento),
                 documento: this.documentos.primero(datos.documentos, persona?.idPersona) };
    }

    // Prepara los datos que necesita la tarjeta de la consulta.
    tarjeta(datos, consulta) {
        return {
            idConsulta: consulta.idConsulta, fechaInicio: consulta.fechaInicio,
            titulo: consulta.referenciaExterna || "Consulta",
            paciente: this.paciente(datos, consulta),
            procedimientos: this.procedimientosDe(datos, consulta).map(p => ({
                nombre: p.nombre,
                pasos: p.estado.realizados.map((r, i) => ({
                    idPaso: r.idConsultaProcedimientoPaso,
                    nombre: p.estado.definidos[i]?.nombre ?? `Paso ${i + 1}`,
                    estado: r.estado, fecha: r.fechaInicio,
                    quien: this.datosClinica.nombre(r.idPersonaRol?.idPersona), rol: r.idPersonaRol?.idRol?.nombre ?? ""
                }))
            })),
            devuelta: this.devuelta(datos, consulta),
            finalizada: !this.abierta(consulta),
            puedeAtender: this.abierta(consulta)
        };
    }

    // Reúne el detalle del paso, su nota y los exámenes registrados.
    registro(datos, idPaso) {
        const r = datos.realizados.find(x => x.idConsultaProcedimientoPaso === idPaso);
        if (!r) return null;
        const cp = datos.cps.find(x => x.idConsultaProcedimiento === r.idConsultaProcedimiento?.idConsultaProcedimiento);
        const def = this.flujo.definidos(cp?.idProcedimiento, datos.definidos, datos.secuencias);
        const realizados = this.flujo.realizados(cp?.idConsultaProcedimiento, datos.realizados);
        const numero = realizados.findIndex(x => x.idConsultaProcedimientoPaso === idPaso) + 1;
        const examenes = datos.ordenes.filter(o => o.idConsultaProcedimientoPaso?.idConsultaProcedimientoPaso === idPaso).map(o => ({
            nombre: o.indicaciones || "Examen",
            resultado: datos.resultados.find(x => x.idOrdenExamen?.idOrdenExamen === o.idOrdenExamen)?.resultado ?? "" }));
        return { procedimiento: this.nombreProcedimiento(datos, cp?.idProcedimiento),
                 paso: def[numero - 1]?.nombre ?? `Paso ${numero}`, estado: r.estado,
                 quien: this.datosClinica.nombre(r.idPersonaRol?.idPersona), rol: r.idPersonaRol?.idRol?.nombre ?? "",
                 inicio: r.fechaInicio, fin: r.fechaFin, nota: this.notas.de(cp?.observaciones, numero), examenes };
    }
}
