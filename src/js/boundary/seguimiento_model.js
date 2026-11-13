// HU4 · Consulta (seguimiento paso a paso). Ruta: #/consulta/<idConsulta>
//   Muestra la barra de pasos del procedimiento; en el paso actual el empleado escribe sus notas, asigna examenes
//   (con filtro por categoria) y usa "Guardar y avanzar al siguiente paso"; "Anterior" mira el paso previo en
//   solo lectura; en el ultimo paso aparece "Finalizar consulta".
// Convenciones (el backend no tiene campos para esto): el paso realizado N corresponde al paso definido N; las notas
// van en ConsultaProcedimiento.observaciones (NotasPaso); el examen asignado guarda su nombre en OrdenExamen.indicaciones.
class SeguimientoModel {

    constructor(contenedor, idConsulta, { irA = () => {} } = {}) {
        this.contenedor = contenedor;
        this.idConsulta = idConsulta;
        this.irA = irA;
        this.indiceProc = 0;
        this.vista = 0;
    }

    static ahora() { return new Date().toISOString(); }

    async iniciar() {
        this.sesion = Sesion.obtener();
        this.contenedor.innerHTML = `
            <section class="consulta" aria-labelledby="titulo-consulta">
                <header class="cabecera-consulta">
                    <h2 id="titulo-consulta">Consulta</h2>
                    <button id="volver" type="button" class="enlace">Volver al dashboard</button>
                </header>
                <galeno-estado-vista id="estado"></galeno-estado-vista>
                <div id="cuerpo" hidden>
                    <div class="tarjeta tarjeta-paciente">
                        <span id="iniciales" class="avatar" aria-hidden="true"></span>
                        <p id="paciente"></p>
                    </div>
                    <div class="consulta-grid">
                        <div class="columna-procedimiento">
                            <galeno-selector id="procedimiento" label="Procedimiento" hidden></galeno-selector>
                            <galeno-indicador-pasos id="pasos"></galeno-indicador-pasos>
                            <div class="bloque-paso" id="bloque-paso">
                                <h3 id="paso"></h3>
                                <p id="lectura" class="badge-lectura" hidden>Solo lectura: este paso ya quedó registrado</p>
                                <galeno-campo id="notas" label="Notas del paso" type="textarea"></galeno-campo>
                                <div id="mensaje" role="alert" class="mensaje-error"></div>
                            </div>
                        </div>
                        <div class="columna-examenes">
                            <galeno-lista-examenes id="examenes"></galeno-lista-examenes>
                        </div>
                    </div>
                    <div class="barra-acciones">
                        <div class="acciones">
                            <button id="anterior" type="button" class="secundario">Anterior</button>
                            <button id="avanzar" type="button">Guardar y avanzar al siguiente paso</button>
                            <button id="finalizar" type="button" class="acento">Finalizar consulta</button>
                        </div>
                        <p class="nota-finalizar" id="nota-finalizar" hidden>Al finalizar se cierra la consulta y sus pasos quedan en solo lectura.</p>
                    </div>
                </div>
            </section>`;
        const $ = id => this.contenedor.querySelector("#" + id);
        ["estado", "cuerpo", "iniciales", "paciente", "procedimiento", "pasos", "paso", "lectura",
         "notas", "examenes", "mensaje", "anterior", "avanzar", "finalizar", "volver"]
            .forEach(id => this[id] = $(id));
        this.bloquePaso = $("bloque-paso");
        this.notaFinalizar = $("nota-finalizar");
        this.aviso = document.querySelector("#aviso");
        this.procedimiento.formatoTexto = o => o.nombre;
        this.estado.addEventListener("galeno-reintentar", () => this.iniciar());
        this.procedimiento.addEventListener("galeno-seleccion", e => {
            const i = this.procs.indexOf(e.detail.valor);
            if (i >= 0) { this.indiceProc = i; this.vista = this.actual(); this.pintar(); }
        });
        this.pasos.addEventListener("galeno-ir-paso", e => { this.vista = e.detail.indice; this.pintar(); });
        this.anterior.addEventListener("click", () => { this.vista = Math.max(this.vista - 1, 0); this.pintar(); });
        this.avanzar.addEventListener("click", () => this.guardarYAvanzar());
        this.finalizar.addEventListener("click", () => this.finalizarConsulta());
        this.volver.addEventListener("click", () => this.irA("dashboard"));
        this.examenes.addEventListener("galeno-asignar", e => this.asignar(e.detail.ids));
        return this.cargar();
    }

    async cargar() {
        this.estado.mostrar("cargando");
        try {
            this.datos = await Expediente.cargar();
            const [examenes, relaciones, cats, tipos] = await Promise.all([
                new ExamenService().listar(0, 2000), new ProcedimientoPasoExamenService().listar(0, 5000),
                new ExamenTipoExamenService().listar(0, 5000), new TipoExamenService().listar(0, 500)]);
            this.catalogo = { examenes, relaciones, cats, tipos };
        } catch (e) {
            this.estado.mostrar("error", "No se pudo cargar la consulta.");
            return false;
        }
        this.consulta = this.datos.consultas.find(c => c.idConsulta === this.idConsulta);
        if (!this.consulta) { this.estado.mostrar("error", "La consulta no existe."); return false; }
        this.estado.mostrar("contenido");
        this.cuerpo.hidden = false;
        this.procs = Expediente.procedimientosDe(this.datos, this.consulta);
        if (!this.procs.length) this.procs = [];
        this.procedimiento.opciones = this.procs;
        this.procedimiento.hidden = this.procs.length < 2;
        if (this.procs.length) this.procedimiento.seleccionar(this.procs[0]);
        const p = Expediente.paciente(this.datos, this.consulta);
        this.paciente.textContent = `${p.nombre}${p.edad != null ? " · " + p.edad + " años" : ""}${p.documento ? " · " + p.documento : ""}`;
        this.iniciales.textContent = GalenoTarjetaAgenda.iniciales(p.nombre);
        if (!this.procs.length) { this.mensaje.textContent = "Esta consulta no tiene procedimientos."; this.pintar(); return true; }
        this.indiceProc = Math.min(this.indiceProc, this.procs.length - 1);
        this.vista = this.actual();
        this.pintar();
        return true;
    }

    get proc() { return this.procs[this.indiceProc]; }
    // posicion del paso que toca (si ya termino, el ultimo)
    actual() { const e = this.proc?.estado; return e ? (e.actual ?? e.definidos.length - 1) : 0; }
    enCurso() { return this.proc && !this.proc.estado.completo && !this.consulta.fechaFin; }
    editable() { return this.enCurso() && this.vista === this.proc.estado.actual; }

    pintar() {
        if (!this.proc) { ["anterior", "avanzar", "finalizar"].forEach(id => this[id].hidden = true); return; }
        const e = this.proc.estado, n = e.definidos.length;
        this.mensaje.textContent = "";
        this.pasos.pasos = e.definidos.map((d, i) => ({ nombre: d.nombre,
            estado: e.completo || i < e.actual ? "hecho" : i === e.actual ? "actual" : "pendiente" }));
        this.pasos.vista = this.vista;
        this.paso.textContent = `Paso ${this.vista + 1} de ${n}: ${e.definidos[this.vista].nombre}`;
        const editable = this.editable();
        // el paso ya registrado se ve distinto: sin edicion y con su insignia de solo lectura
        this.lectura.hidden = editable;
        this.bloquePaso.classList.toggle("solo-lectura", !editable);
        this.notas.value = NotasPaso.de(this.proc.cp.observaciones, this.vista + 1);
        this.notas.deshabilitado = !editable;
        this.pintarExamenes(editable);
        const ultimo = this.vista === n - 1;
        this.anterior.hidden = this.vista === 0;
        this.avanzar.hidden = !editable || ultimo;
        this.finalizar.hidden = !(editable && ultimo);
        this.notaFinalizar.hidden = this.finalizar.hidden;   // la nota de confirmacion acompana al boton
    }

    // examenes disponibles para el paso definido que se esta viendo
    pintarExamenes(editable) {
        const def = this.proc.estado.definidos[this.vista];
        const { examenes, relaciones, cats, tipos } = this.catalogo;
        const ids = new Set(relaciones.filter(r => r.activo !== false && def.idProcedimientoPaso
            && r.idProcedimientoPaso?.idProcedimientoPaso === def.idProcedimientoPaso).map(r => r.idExamen?.idExamen));
        const lista = examenes.filter(x => ids.has(x.idExamen) && x.activo !== false).map(x => ({
            id: x.idExamen, nombre: x.nombre,
            categoria: cats.find(c => c.idExamen?.idExamen === x.idExamen)?.idTipoExamen?.nombre ?? "" }));
        this.examenes.examenes = lista;
        const paso = this.pasoRealizado(this.vista);
        const pedidos = paso ? this.datos.ordenes.filter(o => o.idConsultaProcedimientoPaso?.idConsultaProcedimientoPaso === paso.idConsultaProcedimientoPaso) : [];
        this.examenes.asignados = lista.filter(x => pedidos.some(o => o.indicaciones === x.nombre)).map(x => x.id);
        this.examenes.deshabilitada = !editable;
    }

    pasoRealizado(i) { return this.proc.estado.realizados[i] ?? null; }

    // El registro del paso actual se crea al primer cambio ("En proceso", con el empleado que lo atiende)
    async asegurarPaso() {
        let r = this.pasoRealizado(this.vista);
        if (r) return r;
        r = await new ConsultaProcedimientoPasoService().crear({
            idConsultaProcedimiento: { idConsultaProcedimiento: this.proc.cp.idConsultaProcedimiento },
            idPersonaRol: { idPersonaRol: this.sesion.idPersonaRol },
            estado: "En proceso", fechaInicio: SeguimientoModel.ahora(), fechaFin: null });
        this.datos.realizados.push(r);
        this.proc.estado.realizados.push(r);
        return r;
    }

    async guardarNotas() {
        const def = this.proc.estado.definidos[this.vista];
        const cp = this.proc.cp;
        const obs = NotasPaso.guardar(cp.observaciones, this.vista + 1, def.nombre, this.sesion.nombre, this.notas.value);
        if (obs === (cp.observaciones ?? "")) return;
        const nuevo = await new ConsultaProcedimientoService().actualizar(cp.idConsultaProcedimiento, { ...cp, observaciones: obs });
        this.proc.cp = Object.assign(cp, nuevo && typeof nuevo === "object" ? nuevo : {}, { observaciones: obs });
    }

    async asignar(ids) {
        if (!ids.length) { this.mensaje.textContent = "Marque al menos un examen"; return; }
        try {
            const paso = await this.asegurarPaso();
            for (const id of ids) {
                const x = this.catalogo.examenes.find(e => e.idExamen === id);
                const orden = await new OrdenExamenService().crear({
                    idConsultaProcedimientoPaso: { idConsultaProcedimientoPaso: paso.idConsultaProcedimientoPaso },
                    indicaciones: x.nombre, fechaCreacion: SeguimientoModel.ahora() });
                this.datos.ordenes.push({ ...orden, idConsultaProcedimientoPaso: paso, indicaciones: x.nombre });
            }
            this.pintarExamenes(true);
            this.aviso?.mostrar("Exámenes asignados", "exito");
        } catch (e) { this.aviso?.mostrar("No se pudieron asignar los exámenes", "error"); }
    }

    async completarPaso() {
        const paso = await this.asegurarPaso();
        await this.guardarNotas();
        const hecho = await new ConsultaProcedimientoPasoService().actualizar(paso.idConsultaProcedimientoPaso,
            { ...paso, estado: DatosClinica.COMPLETADO, fechaFin: SeguimientoModel.ahora() });
        Object.assign(paso, hecho && typeof hecho === "object" ? hecho : {}, { estado: DatosClinica.COMPLETADO });
    }

    recalcular() {
        const e = this.proc.estado;
        this.proc.estado = FlujoPasos.estado(e.definidos.length === 1 && !e.definidos[0].idProcedimientoPaso ? [] : e.definidos, e.realizados);
    }

    async guardarYAvanzar() {
        try {
            await this.completarPaso();
            this.recalcular();
            this.vista = this.actual();
            this.pintar();
            this.aviso?.mostrar("Paso guardado", "exito");
        } catch (e) { this.aviso?.mostrar("No se pudo guardar el paso", "error"); }
    }

    async finalizarConsulta() {
        try {
            await this.completarPaso();
            this.recalcular();
            const fin = SeguimientoModel.ahora();
            const cp = this.proc.cp;
            await new ConsultaProcedimientoService().actualizar(cp.idConsultaProcedimiento, { ...cp, fechaFin: fin });
            this.consulta = Object.assign(this.consulta,
                await new ConsultaService().actualizar(this.consulta.idConsulta, { ...this.consulta, fechaFin: fin }) || {}, { fechaFin: fin });
            this.aviso?.mostrar("Consulta finalizada", "exito");
            this.irA("dashboard");
        } catch (e) { this.aviso?.mostrar("No se pudo finalizar la consulta", "error"); }
    }
}
