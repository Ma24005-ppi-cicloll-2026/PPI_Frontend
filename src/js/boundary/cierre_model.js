// HU4 · Cierre de consulta (recepcion). Es el "pago" del cajero de Cafefe:
//   - Lista las consultas pendientes y al elegir una muestra sus procedimientos.
//   - Cada procedimiento se va finalizando (como los pagos parciales) y solo se puede finalizar si todos
//     sus pasos estan Completados. El "saldo restante" es cuantos procedimientos faltan por finalizar.
//   - Con saldo 0 se habilita "Finalizar consulta": se guarda la fecha de fin y se baja la constancia en PDF.
class CierreModel {

    constructor(contenedor) {
        this.contenedor = contenedor;
        this.consultas = [];
        this.consulta = null;
        this.filas = [];                     // un renglon por procedimiento de la consulta elegida
    }

    async iniciar() {
        this.aviso = document.querySelector("#aviso");
        this.sesion = Sesion.obtener();
        if (!this.sesion || !Sesion.puede("cierre")) {
            this.contenedor.innerHTML = `<h2>Cierre de consulta</h2><p>Inicie sesión como personal de recepción para cerrar consultas.</p>`;
            return;
        }
        this.contenedor.innerHTML = `
            <h2>Cierre de consulta</h2>
            <section id="lista" aria-live="polite">
                <h3 class="subtitulo">Consultas pendientes</h3>
                <galeno-estado-vista id="estado"></galeno-estado-vista>
                <galeno-tabla id="tabla"></galeno-tabla>
            </section>
            <section id="cierre" hidden>
                <div class="acciones"><button id="volver" type="button" class="secundario">← Volver a las consultas</button></div>
                <h3 id="titulo" class="subtitulo"></h3>
                <galeno-tabla id="procedimientos"></galeno-tabla>
                <p id="saldo" class="paciente-elegido" role="status"></p>
                <button id="finalizar" type="button" disabled>Finalizar consulta e imprimir constancia (PDF)</button>
            </section>`;
        const $ = id => this.contenedor.querySelector("#" + id);
        this.seccionLista = $("lista"); this.estado = $("estado"); this.tabla = $("tabla");
        this.seccionCierre = $("cierre"); this.titulo = $("titulo"); this.tablaProc = $("procedimientos");
        this.saldo = $("saldo"); this.botonFinalizar = $("finalizar");

        this.tabla.columnas = [
            { campo: "fechaInicio", titulo: "Inicio", formato: GestorFechas.aFechaHora },
            { campo: "idPersonaRol", titulo: "Paciente", formato: pr => DatosClinica.nombre(pr?.idPersona) || "—" },
            { campo: "observaciones", titulo: "Observaciones" }
        ];
        this.tabla.acciones = [{ texto: "Cerrar", clase: "pr", evento: "galeno-elegir-consulta" }];
        this.tablaProc.columnas = [
            { campo: "nombre", titulo: "Procedimiento" },
            { campo: "avance", titulo: "Pasos completados" },
            { campo: "finalizado", titulo: "Estado", formato: v => v ? "Finalizado" : "Pendiente" }
        ];
        this.tablaProc.acciones = [{ texto: "Finalizar procedimiento", clase: "pr", evento: "galeno-finalizar-procedimiento" }];

        this.tabla.addEventListener("galeno-elegir-consulta", e => this.abrir(e.detail.fila));
        this.tablaProc.addEventListener("galeno-finalizar-procedimiento", e => this.finalizarProcedimiento(e.detail.fila));
        this.botonFinalizar.addEventListener("click", () => this.finalizarConsulta());
        $("volver").addEventListener("click", () => this.volverALista());
        this.estado.addEventListener("galeno-reintentar", () => this.cargar());
        await this.cargar();
    }

    async cargar() {
        this.estado.mostrar("cargando");
        try {
            const todas = await new ConsultaService().listar(0, 500);
            this.consultas = DatosClinica.masRecientePrimero(
                todas.filter(c => !c.fechaFin && DatosClinica.esDeClinica(c.idPersonaRol, this.sesion.idClinica)), "fechaInicio");
            this.tabla.filas = this.consultas;
            this.estado.mostrar(this.consultas.length ? "contenido" : "vacio");
            this.tabla.hidden = this.consultas.length === 0;
        } catch (e) { this.estado.mostrar("error", e.message); }
    }

    volverALista() {
        this.seccionCierre.hidden = true;
        this.seccionLista.hidden = false;
        this.consulta = null;
    }

    async abrir(consulta) {
        try {
            this.consulta = consulta;
            await this.cargarProcedimientos();
            this.seccionLista.hidden = true;
            this.seccionCierre.hidden = false;
        } catch (e) { this.aviso.mostrar(e.message, "error"); }
    }

    // Une los procedimientos de la consulta con sus pasos y calcula el avance de cada uno
    async cargarProcedimientos() {
        const [catalogo, cps, pasos] = await Promise.all([
            new ProcedimientoService().listar(0, 500), new ConsultaProcedimientoService().listar(0, 500),
            new ConsultaProcedimientoPasoService().listar(0, 500)]);
        const nombres = new Map(catalogo.map(p => [String(p.idProcedimiento), p.nombre]));
        this.filas = cps.filter(cp => cp.idConsulta?.idConsulta === this.consulta.idConsulta).map(cp => {
            const suyos = pasos.filter(p => p.idConsultaProcedimiento?.idConsultaProcedimiento === cp.idConsultaProcedimiento);
            const completados = suyos.filter(p => p.estado === DatosClinica.COMPLETADO).length;
            const id = cp.idProcedimiento;
            return { cp, nombre: (typeof id === "object" ? id?.nombre : nombres.get(String(id))) ?? "—",
                     total: suyos.length, completados, avance: `${completados} de ${suyos.length}`,
                     pendientes: suyos.length - completados, finalizado: Boolean(cp.fechaFin) };
        });
        this.pintar();
    }

    saldoRestante() { return this.filas.filter(f => !f.finalizado).length; }

    pintar() {
        const nombre = DatosClinica.nombre(this.consulta.idPersonaRol?.idPersona) || "—";
        this.titulo.textContent = `Consulta de ${nombre}`;
        this.tablaProc.filas = this.filas;
        const saldo = this.saldoRestante();
        this.saldo.textContent = this.filas.length === 0
            ? "Esta consulta aún no tiene procedimientos: no se puede finalizar."
            : `Saldo restante: ${saldo} procedimiento${saldo === 1 ? "" : "s"} por finalizar`;
        this.botonFinalizar.disabled = this.filas.length === 0 || saldo > 0;
    }

    async finalizarProcedimiento(fila) {
        if (fila.finalizado) { this.aviso.mostrar("Ese procedimiento ya está finalizado", "info"); return; }
        if (fila.pendientes > 0) {
            this.aviso.mostrar(`Faltan ${fila.pendientes} paso(s) por completar en «${fila.nombre}»`, "error");
            return;
        }
        try {
            await new ConsultaProcedimientoService().actualizar(fila.cp.idConsultaProcedimiento,
                { ...fila.cp, fechaFin: new Date().toISOString() });
            this.aviso.mostrar(`«${fila.nombre}» finalizado`, "exito");
            await this.cargarProcedimientos();
        } catch (e) { this.aviso.mostrar(e.message, "error"); }
    }

    async finalizarConsulta() {
        if (this.filas.length === 0 || this.saldoRestante() > 0) return;       // no se cierra con saldo pendiente
        const fin = new Date().toISOString();
        try {
            await new ConsultaService().actualizar(this.consulta.idConsulta, { ...this.consulta, fechaFin: fin });
            this.constancia(fin);
            this.aviso.mostrar("Consulta finalizada", "exito");
            this.volverALista();
            await this.cargar();
        } catch (e) { this.aviso.mostrar(e.message, "error"); }
    }

    // La constancia para imprimir (el "ticket" del cajero en Cafefe)
    constancia(fin) {
        const c = this.consulta;
        const paciente = DatosClinica.nombre(c.idPersonaRol?.idPersona) || "—";
        const bytes = new GeneradorPdf().generar({
            titulo: "Constancia de consulta",
            subtitulo: `Paciente: ${paciente}`,
            secciones: [
                { titulo: "Consulta", filas: [
                    ["Clínica", c.idPersonaRol?.idClinica?.nombre ?? this.sesion.clinica ?? "—"],
                    ["Inicio", GestorFechas.aFechaHora(c.fechaInicio)], ["Fin", GestorFechas.aFechaHora(fin)],
                    ["Observaciones", c.observaciones || "Sin observaciones"], ["Atendió", this.sesion.nombre]] },
                { titulo: "Procedimientos realizados", filas: this.filas.map(f => [f.nombre, `Pasos completados: ${f.avance}`]) }
            ],
            pie: "GalenoSV · Sistema de gestión médica"
        });
        const dia = fin.slice(0, 10);
        GeneradorPdf.descargar(bytes, `constancia-${DatosClinica.normalizar(paciente).replace(/ /g, "-")}-${dia}.pdf`);
    }
}
