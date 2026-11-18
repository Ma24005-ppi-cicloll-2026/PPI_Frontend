class Expediente {

    // Solicita los datos necesarios antes de mostrar el contenido.
    static async cargar() {
        // Solicita la primera página del servicio indicado.
        const l = (S, n = 5000) => new S().listar(0, n);
        const [consultas, cps, realizados, definidos, secuencias, procedimientos, documentos, ordenes, resultados, personasRoles] =
            await Promise.all([l(ConsultaService), l(ConsultaProcedimientoService), l(ConsultaProcedimientoPasoService),
                l(ProcedimientoPasoService), l(ProcedimientoPasoSecuenciaService), l(ProcedimientoService, 1000),
                l(DocumentoService), l(OrdenExamenService), l(ExamenResultadoService), l(PersonaRolService, 1000)]);
        return { consultas, cps, realizados, definidos, secuencias, procedimientos, documentos, ordenes, resultados, personasRoles };
    }

    // Busca el nombre del procedimiento en el catálogo.
    static nombreProcedimiento(datos, id) {
        return datos.procedimientos.find(p => p.idProcedimiento === id)?.nombre ?? "Procedimiento";
    }

    // Relaciona los procedimientos de la consulta con el avance de sus pasos.
    static procedimientosDe(datos, consulta) {
        return datos.cps.filter(x => x.idConsulta?.idConsulta === consulta.idConsulta).map(cp => {
            const def = FlujoPasos.definidos(cp.idProcedimiento, datos.definidos, datos.secuencias);
            const estado = FlujoPasos.estado(def, FlujoPasos.realizados(cp.idConsultaProcedimiento, datos.realizados));
            return { cp, nombre: Expediente.nombreProcedimiento(datos, cp.idProcedimiento), estado };
        });
    }

    // Comprueba si la consulta todavía carece de fecha de cierre.
    static abierta(consulta) { return !consulta.fechaFin; }

    // Comprueba si la consulta tiene un paso que corresponde al rol.
    static laAtiende(datos, consulta, idRol) {
        const procs = Expediente.procedimientosDe(datos, consulta);
        return procs.length === 0 || procs.some(p => FlujoPasos.loAtiende(p.estado, idRol));
    }

    // Reúne el nombre, la edad y el documento del paciente.
    static paciente(datos, consulta) {
        const persona = consulta.idPersonaRol?.idPersona;
        return { nombre: DatosClinica.nombre(persona), edad: Agenda.edad(persona?.fechaNacimiento),
                 documento: Documentos.primero(datos.documentos, persona?.idPersona) };
    }

    // Prepara los datos que necesita la tarjeta de la consulta.
    static tarjeta(datos, consulta) {
        return {
            idConsulta: consulta.idConsulta, fechaInicio: consulta.fechaInicio,
            titulo: consulta.referenciaExterna || "Consulta",
            paciente: Expediente.paciente(datos, consulta),
            procedimientos: Expediente.procedimientosDe(datos, consulta).map(p => ({
                nombre: p.nombre,
                pasos: p.estado.realizados.map((r, i) => ({
                    idPaso: r.idConsultaProcedimientoPaso,
                    nombre: p.estado.definidos[i]?.nombre ?? `Paso ${i + 1}`,
                    estado: r.estado, fecha: r.fechaInicio,
                    quien: DatosClinica.nombre(r.idPersonaRol?.idPersona), rol: r.idPersonaRol?.idRol?.nombre ?? ""
                }))
            })),
            finalizada: !Expediente.abierta(consulta),
            puedeAtender: Expediente.abierta(consulta)
        };
    }

    // Reúne el detalle del paso, su nota y los exámenes registrados.
    static registro(datos, idPaso) {
        const r = datos.realizados.find(x => x.idConsultaProcedimientoPaso === idPaso);
        if (!r) return null;
        const cp = datos.cps.find(x => x.idConsultaProcedimiento === r.idConsultaProcedimiento?.idConsultaProcedimiento);
        const def = FlujoPasos.definidos(cp?.idProcedimiento, datos.definidos, datos.secuencias);
        const realizados = FlujoPasos.realizados(cp?.idConsultaProcedimiento, datos.realizados);
        const numero = realizados.findIndex(x => x.idConsultaProcedimientoPaso === idPaso) + 1;
        const examenes = datos.ordenes.filter(o => o.idConsultaProcedimientoPaso?.idConsultaProcedimientoPaso === idPaso).map(o => ({
            nombre: o.indicaciones || "Examen",
            resultado: datos.resultados.find(x => x.idOrdenExamen?.idOrdenExamen === o.idOrdenExamen)?.resultado ?? "" }));
        return { procedimiento: Expediente.nombreProcedimiento(datos, cp?.idProcedimiento),
                 paso: def[numero - 1]?.nombre ?? `Paso ${numero}`, estado: r.estado,
                 quien: DatosClinica.nombre(r.idPersonaRol?.idPersona), rol: r.idPersonaRol?.idRol?.nombre ?? "",
                 inicio: r.fechaInicio, fin: r.fechaFin, nota: NotasPaso.de(cp?.observaciones, numero), examenes };
    }
}
