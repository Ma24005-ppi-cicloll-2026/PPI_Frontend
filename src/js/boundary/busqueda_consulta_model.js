// Pantalla "Consultas": buscar paciente (por nombre o por documento) -> sus consultas
// (tarjetas) -> detalle con pestañas. Al abrir el detalle la lista se esconde (no se repite).
class BusquedaConsultaModel {

    constructor(contenedor) {
        this.contenedor = contenedor;
        this.paciente = null;
        this.consultas = [];
        this.personas = [];
        this.esperaBusqueda = 400;   // milisegundos que se espera despues de dejar de escribir
        this.temporizador = null;
        this.busquedaActual = 0;     // para ignorar respuestas viejas si el usuario sigue escribiendo
    }

    async iniciar() {
        this.contenedor.innerHTML = `
            <h2>Consultas</h2>
            <galeno-buscador-persona id="buscaPaciente" label="Paciente (por nombre)"></galeno-buscador-persona>
            <h3 style="margin:1.2rem 0 .6rem;">O buscar por documento</h3>
            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(14rem, 1fr)); gap:1rem; align-items:start;">
                <galeno-buscador-tipo-documentos id="buscaTipo" label="Tipo de documento"></galeno-buscador-tipo-documentos>
                <div>
                    <label for="numeroDocumento" style="display:block; font-weight:600; margin-bottom:.3rem;">Número de documento</label>
                    <input id="numeroDocumento" type="text" autocomplete="off" placeholder="Elija primero el tipo de documento"
                           style="width:100%; box-sizing:border-box; padding:.55rem .7rem; border:1px solid #829CBC; border-radius:.4rem; font:inherit;">
                    <small id="ayudaDocumento" role="status" style="display:block; margin-top:.3rem; min-height:1.2em;"></small>
                </div>
            </div>
            <div id="lista" style="margin-top:1rem;"></div>
            <section id="detalle" hidden>
                <button id="volver" type="button">← Volver a las consultas</button>
                <galeno-tarjeta-consulta id="tarjeta" sin-boton></galeno-tarjeta-consulta>
                <galeno-pestanas id="pestanas" style="margin-top:1rem; display:block;">
                    <div slot="p0"><galeno-tabla id="tablaDocumentos" solo-lectura></galeno-tabla></div>
                    <div slot="p1"><galeno-tabla id="tablaProcedimientos" solo-lectura></galeno-tabla></div>
                    <div slot="p2"><galeno-tabla id="tablaOrdenes" solo-lectura></galeno-tabla></div>
                    <div slot="p3"><galeno-tabla id="tablaResultados" solo-lectura></galeno-tabla></div>
                </galeno-pestanas>
            </section>`;
        const $ = id => this.contenedor.querySelector("#" + id);
        this.busca = $("buscaPaciente"); this.buscaTipo = $("buscaTipo"); this.numero = $("numeroDocumento");
        this.ayuda = $("ayudaDocumento"); this.lista = $("lista"); this.detalle = $("detalle");
        this.tarjeta = $("tarjeta"); this.tablaDocs = $("tablaDocumentos"); this.tablaProcs = $("tablaProcedimientos");
        this.tablaOrdenes = $("tablaOrdenes"); this.tablaResultados = $("tablaResultados");
        this.aviso = document.querySelector("#aviso");

        $("pestanas").titulos = ["Documentos", "Procedimientos", "Órdenes de examen", "Resultados"];
        this.tablaDocs.columnas = [
            { campo: "valor", titulo: "Número" },
            { campo: "idTipoDocumento", titulo: "Tipo", formato: t => t?.nombre ?? "—" }];
        this.tablaProcs.columnas = [
            { campo: "idProcedimiento", titulo: "Procedimiento", formato: p => p?.nombre ?? "—" },
            { campo: "fechaInicio", titulo: "Inicio", formato: GestorFechas.aFechaHora },
            { campo: "fechaFin", titulo: "Fin", formato: v => v ? GestorFechas.aFechaHora(v) : "En curso" },
            { campo: "observaciones", titulo: "Observaciones" }];
        this.tablaOrdenes.columnas = [
            { campo: "fechaCreacion", titulo: "Fecha", formato: GestorFechas.aFechaHora },
            { campo: "indicaciones", titulo: "Indicaciones" },
            { campo: "idConsultaProcedimientoPaso", titulo: "Estado del paso", formato: p => p?.estado ?? "—" }];
        this.tablaResultados.columnas = [
            { campo: "fechaCreacion", titulo: "Fecha", formato: GestorFechas.aFechaHora },
            { campo: "resultado", titulo: "Resultado" },
            { campo: "interpretacion", titulo: "Interpretación" },
            { campo: "rutaAtestado", titulo: "Atestado" }];

        this.busca.addEventListener("galeno-seleccion", e => this.alElegirPaciente(e.detail.valor));
        this.buscaTipo.addEventListener("galeno-seleccion", e => this.alElegirTipo(e.detail.valor));
        this.numero.addEventListener("input", () => this.programarBusqueda());
        $("volver").addEventListener("click", () => this.volverALista());
        this.lista.addEventListener("galeno-abrir-consulta", e => this.abrirDetalle(e.detail.idConsulta));
        try {
            this.personas = await new PersonaService().listar(0, 500);
            this.busca.opciones = this.personas;
            this.buscaTipo.opciones = await new TipoDocumentoService().listar(0, 100);
        } catch (e) { this.aviso.mostrar(e.message, "error"); }
    }

    // ---------- buscar por documento (sin boton: busca sola al escribir) ----------

    // "01234567-8" y "012345678" son el mismo documento: se comparan sin guiones ni espacios
    normalizar(valor) {
        return String(valor ?? "").replace(/[\s-]/g, "").toLowerCase();
    }

    alElegirTipo(tipo) {
        // el ejemplo sale de las "indicaciones" que el tipo tiene guardadas en el backend
        this.numero.placeholder = tipo?.indicaciones || "Escriba el número del documento";
        this.programarBusqueda();
    }

    mensajeDocumento(texto) { this.ayuda.textContent = texto; }

    programarBusqueda() {
        clearTimeout(this.temporizador);
        this.temporizador = setTimeout(() => this.buscarPorDocumento(), this.esperaBusqueda);
    }

    // true si el texto cumple la expresion regular del tipo (si no tiene, o es invalida, no se exige)
    formatoValido(tipo, texto) {
        if (!tipo?.expresionRegular) return true;
        try { return new RegExp(tipo.expresionRegular).test(texto); }
        catch (e) { return true; }
    }

    limpiarResultados() {
        this.paciente = null;
        this.consultas = [];
        this.lista.replaceChildren();
        this.detalle.hidden = true;
        this.lista.hidden = false;
    }

    async buscarPorDocumento() {
        const tipo = this.buscaTipo.seleccionado;
        const texto = this.numero.value.trim();
        const numero = this.normalizar(texto);
        const turno = ++this.busquedaActual;
        this.mensajeDocumento("");
        if (!numero) { this.limpiarResultados(); return; }
        if (!tipo) { this.mensajeDocumento("Elija primero el tipo de documento"); return; }
        if (!this.formatoValido(tipo, texto)) {
            this.mensajeDocumento(`El número no tiene el formato de ${tipo.nombre}` +
                (tipo.indicaciones ? `: ${tipo.indicaciones}` : ""));
            this.limpiarResultados();
            return;
        }
        try {
            const documentos = await new DocumentoService().listar(0, 500);
            if (turno !== this.busquedaActual) return;      // el usuario siguio escribiendo
            const documento = documentos.find(d =>
                d.idTipoDocumento?.idTipoDocumento === tipo.idTipoDocumento &&
                this.normalizar(d.valor) === numero);
            if (!documento) {
                this.mensajeDocumento("No se encontró un paciente con ese documento");
                this.limpiarResultados();
                return;
            }
            const persona = this.personas.find(p => p.idPersona === documento.idPersona?.idPersona)
                ?? documento.idPersona;
            this.busca.seleccionar(persona);      // el buscador por nombre muestra a quien se encontro
            await this.alElegirPaciente(persona);
        } catch (e) { this.aviso.mostrar(e.message, "error"); }
    }

    // ---------- consultas del paciente ----------

    async alElegirPaciente(persona) {
        this.paciente = persona;
        this.detalle.hidden = true;
        this.lista.hidden = false;
        this.lista.replaceChildren();
        try {
            // El backend no tiene "consultas de una persona": se filtra aqui
            const todas = await new ConsultaService().listar(0, 500);
            this.consultas = todas.filter(c => c.idPersonaRol?.idPersona?.idPersona === persona.idPersona);
            if (this.consultas.length === 0) this.aviso.mostrar("El paciente no tiene consultas", "info");
            this.consultas.forEach(c => {
                const tarjeta = document.createElement("galeno-tarjeta-consulta");
                tarjeta.consulta = c;
                this.lista.append(tarjeta);
            });
        } catch (e) { this.aviso.mostrar(e.message, "error"); }
    }

    volverALista() {
        this.detalle.hidden = true;
        this.lista.hidden = false;
    }

    async abrirDetalle(idConsulta) {
        const consulta = this.consultas.find(c => c.idConsulta === idConsulta);
        this.tarjeta.consulta = consulta;
        try {
            const docs = await new DocumentoService().listar(0, 500);
            this.tablaDocs.filas = docs.filter(d => d.idPersona?.idPersona === this.paciente.idPersona);
            const procs = (await new ConsultaProcedimientoService().listar(0, 500))
                .filter(p => p.idConsulta?.idConsulta === idConsulta);
            this.tablaProcs.filas = procs;

            // Orden y resultado cuelgan de los pasos: consulta -> procedimiento -> paso -> orden -> resultado
            const idsProcs = new Set(procs.map(p => p.idConsultaProcedimiento));
            const pasos = (await new ConsultaProcedimientoPasoService().listar(0, 500))
                .filter(p => idsProcs.has(p.idConsultaProcedimiento?.idConsultaProcedimiento));
            const idsPasos = new Set(pasos.map(p => p.idConsultaProcedimientoPaso));
            const ordenes = (await new OrdenExamenService().listar(0, 500))
                .filter(o => idsPasos.has(o.idConsultaProcedimientoPaso?.idConsultaProcedimientoPaso));
            this.tablaOrdenes.filas = ordenes;
            const idsOrdenes = new Set(ordenes.map(o => o.idOrdenExamen));
            this.tablaResultados.filas = (await new ExamenResultadoService().listar(0, 500))
                .filter(r => idsOrdenes.has(r.idOrdenExamen?.idOrdenExamen));
            this.lista.hidden = true;         // la lista se esconde: el detalle no repite la tarjeta
            this.detalle.hidden = false;
        } catch (e) { this.aviso.mostrar(e.message, "error"); }
    }
}
