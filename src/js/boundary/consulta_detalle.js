// El detalle de una consulta: la tarjeta arriba (una sola vez) y las pestañas debajo.
// Pestañas: Documentos, Procedimientos, Pasos, Ordenes de examen y Resultados.
// El backend manda idProcedimiento como UUID (texto), no como objeto: el nombre se busca en el catalogo
// que DetalleConsulta carga al abrir. Si algun dia llega como objeto, tambien se entiende.
const nombreProcedimiento = v =>
    v && typeof v === "object" ? (v.nombre ?? "—") : (DetalleConsulta.catalogo.get(String(v)) ?? "—");

const PESTANAS_DETALLE = {
    documentos: { titulo: "Documentos", columnas: [
        { campo: "valor", titulo: "Número" },
        { campo: "idTipoDocumento", titulo: "Tipo", formato: t => t?.nombre ?? "—" }] },
    procedimientos: { titulo: "Procedimientos", columnas: [
        { campo: "idProcedimiento", titulo: "Procedimiento", formato: nombreProcedimiento },
        { campo: "fechaInicio", titulo: "Inicio", formato: GestorFechas.aFechaHora },
        { campo: "fechaFin", titulo: "Fin", formato: v => v ? GestorFechas.aFechaHora(v) : "En curso" },
        { campo: "observaciones", titulo: "Observaciones" }] },
    pasos: { titulo: "Pasos", columnas: [
        { campo: "idConsultaProcedimiento", titulo: "Procedimiento", formato: cp => nombreProcedimiento(cp?.idProcedimiento) },
        { campo: "estado", titulo: "Estado" },
        { campo: "fechaInicio", titulo: "Inicio", formato: GestorFechas.aFechaHora },
        { campo: "fechaFin", titulo: "Fin", formato: v => v ? GestorFechas.aFechaHora(v) : "En curso" }] },
    ordenes: { titulo: "Órdenes de examen", columnas: [
        { campo: "fechaCreacion", titulo: "Fecha", formato: GestorFechas.aFechaHora },
        { campo: "indicaciones", titulo: "Indicaciones" },
        { campo: "idConsultaProcedimientoPaso", titulo: "Estado del paso", formato: p => p?.estado ?? "—" }] },
    resultados: { titulo: "Resultados", columnas: [
        { campo: "fechaCreacion", titulo: "Fecha", formato: GestorFechas.aFechaHora },
        { campo: "resultado", titulo: "Resultado" },
        { campo: "interpretacion", titulo: "Interpretación" },
        { campo: "rutaAtestado", titulo: "Atestado" }] }
};

class DetalleConsulta {

    // seccion: el <section id="detalle"> de la pantalla; alVolver: que hacer al pulsar "Volver"
    constructor(seccion, alVolver) {
        this.seccion = seccion;
        this.alVolver = alVolver;
    }

    iniciar() {
        this.claves = Object.keys(PESTANAS_DETALLE);
        const cap = c => c[0].toUpperCase() + c.slice(1);
        this.seccion.hidden = true;
        this.seccion.innerHTML = `
            <div class="acciones">
                <button id="volver" type="button">← Volver a las consultas</button>
                <button id="pdf" type="button" class="secundario">Descargar resumen (PDF)</button>
            </div>
            <galeno-tarjeta-consulta id="tarjeta" sin-boton></galeno-tarjeta-consulta>
            <galeno-pestanas id="pestanas" style="margin-top:1rem; display:block;">
                ${this.claves.map((c, i) => `<div slot="p${i}"><galeno-tabla id="tabla${cap(c)}" solo-lectura></galeno-tabla></div>`).join("")}
            </galeno-pestanas>`;
        this.tarjeta = this.seccion.querySelector("#tarjeta");
        this.seccion.querySelector("#pestanas").titulos = this.claves.map(c => PESTANAS_DETALLE[c].titulo);
        this.tablas = {};
        this.claves.forEach(c => {
            this.tablas[c] = this.seccion.querySelector("#tabla" + cap(c));
            this.tablas[c].columnas = PESTANAS_DETALLE[c].columnas;
        });
        this.seccion.querySelector("#volver").addEventListener("click", () => this.alVolver());
        this.seccion.querySelector("#pdf").addEventListener("click", () => this.descargarPdf());
    }

    // Arma el resumen de la consulta abierta y lo baja como PDF (sin librerias: control/generador_pdf.js)
    descargarPdf() {
        if (!this.consulta) return;
        const c = this.consulta;
        const persona = c.idPersonaRol?.idPersona;
        const paciente = `${persona?.nombres ?? ""} ${persona?.apellidos ?? ""}`.trim() || "—";
        const fin = v => v ? GestorFechas.aFechaHora(v) : "En curso";
        const nombre = x => x?.nombre ?? "—";
        const filas = clave => this.tablas[clave].filas;
        const bytes = new GeneradorPdf().generar({
            titulo: "Resumen de consulta",
            subtitulo: `Paciente: ${paciente}`,
            secciones: [
                { titulo: "Consulta", filas: [
                    ["Inicio", GestorFechas.aFechaHora(c.fechaInicio)], ["Fin", fin(c.fechaFin)],
                    ["Referencia", c.referenciaExterna || "—"], ["Observaciones", c.observaciones || "Sin observaciones"]] },
                { titulo: "Documentos", filas: filas("documentos").map(d => [nombre(d.idTipoDocumento), d.valor ?? "—"]) },
                { titulo: "Procedimientos", filas: filas("procedimientos").map(p =>
                    [nombreProcedimiento(p.idProcedimiento), `${GestorFechas.aFechaHora(p.fechaInicio)} a ${fin(p.fechaFin)}. ${p.observaciones ?? ""}`.trim()]) },
                { titulo: "Pasos", filas: filas("pasos").map(p =>
                    [nombreProcedimiento(p.idConsultaProcedimiento?.idProcedimiento), `${p.estado ?? "—"}. ${GestorFechas.aFechaHora(p.fechaInicio)} a ${fin(p.fechaFin)}`]) },
                { titulo: "Órdenes de examen", filas: filas("ordenes").map(o =>
                    [GestorFechas.aFechaHora(o.fechaCreacion), o.indicaciones ?? "—"]) },
                { titulo: "Resultados", filas: filas("resultados").map(r =>
                    [GestorFechas.aFechaHora(r.fechaCreacion), `${r.resultado ?? "—"}. ${r.interpretacion ?? ""}`.trim()]) }
            ],
            pie: "GalenoSV · Sistema de gestión médica"
        });
        const dia = GestorFechas.leer(c.fechaInicio)?.toISOString().slice(0, 10) ?? "sin-fecha";
        GeneradorPdf.descargar(bytes, `consulta-${dia}.pdf`);
    }

    // persona: el paciente dueño de la consulta ({ idPersona })
    async abrir(consulta, persona) {
        this.consulta = consulta;
        this.tarjeta.consulta = consulta;
        (await new ProcedimientoService().listar(0, 500)).forEach(p => DetalleConsulta.catalogo.set(String(p.idProcedimiento), p.nombre));
        const docs = await new DocumentoService().listar(0, 500);
        this.tablas.documentos.filas = docs.filter(d => d.idPersona?.idPersona === persona.idPersona);

        // Procedimientos, pasos, ordenes y resultados cuelgan unos de otros:
        // consulta -> procedimiento -> paso -> orden -> resultado
        const procs = (await new ConsultaProcedimientoService().listar(0, 500))
            .filter(p => p.idConsulta?.idConsulta === consulta.idConsulta);
        this.tablas.procedimientos.filas = procs;

        const idsProcs = new Set(procs.map(p => p.idConsultaProcedimiento));
        const pasos = (await new ConsultaProcedimientoPasoService().listar(0, 500))
            .filter(p => idsProcs.has(p.idConsultaProcedimiento?.idConsultaProcedimiento));
        this.tablas.pasos.filas = pasos;

        const idsPasos = new Set(pasos.map(p => p.idConsultaProcedimientoPaso));
        const ordenes = (await new OrdenExamenService().listar(0, 500))
            .filter(o => idsPasos.has(o.idConsultaProcedimientoPaso?.idConsultaProcedimientoPaso));
        this.tablas.ordenes.filas = ordenes;

        const idsOrdenes = new Set(ordenes.map(o => o.idOrdenExamen));
        this.tablas.resultados.filas = (await new ExamenResultadoService().listar(0, 500))
            .filter(r => idsOrdenes.has(r.idOrdenExamen?.idOrdenExamen));
        this.seccion.hidden = false;
    }
}
DetalleConsulta.catalogo = new Map();      // idProcedimiento -> nombre
