class SeguimientoModel {

    // Conserva el ID de la consulta, recibe las utilidades y escucha las respuestas del servidor.
    constructor(contenedor, idConsulta, { irA = () => {}, aviso = null, sesion = new Sesion(), datosClinica = new DatosClinica(),
                                          expediente = null, notas = new NotasPaso(), servicios = null } = {}) {
        this.contenedor = contenedor;
        this.escuchas = [];
        this.avisoInyectado = aviso;
        this.idConsulta = idConsulta;
        this.irA = irA;
        this.sesionUtil = sesion;
        this.datosClinica = datosClinica;
        this.notasUtil = notas;
        this.expediente = expediente ?? new Expediente({ datosClinica, notas });
        this.flujo = this.expediente.flujo;
        this.servicios = servicios ?? {
            examenes: new ExamenService(), relaciones: new ProcedimientoPasoExamenService(),
            cats: new ExamenTipoExamenService(), tipos: new TipoExamenService(),
            realizados: new ConsultaProcedimientoPasoService(), cps: new ConsultaProcedimientoService(),
            consultas: new ConsultaService(), ordenes: new OrdenExamenService() };
        this.indiceProc = 0;
        this.vista = 0;
        this.ocupado = false;
        this._carga = 0;
        this.cargada = false;
        // La vista reacciona a lo que responde el servidor.
        this.escuchar("galeno-consulta-cargada", e => { this.cargada = this.mostrarConsulta(e.detail); });
        this.escuchar("galeno-paso-devuelto", e => this.alDevolver(e.detail.rol));
    }

    // Prepara la marca de tiempo que se envía al servidor.
    ahora() { return new Date().toISOString(); }

    // Toma el registro que devolvió el servidor solo si es un objeto.
    respuesta(dato) { return dato && typeof dato === "object" ? dato : {}; }

    // Monta la vista y pide el expediente.
    iniciar() {
        this.sesion = this.sesionUtil.obtener();
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
                                <p id="devuelto" class="aviso-devuelto" role="status" hidden></p>
                                <p id="lectura" class="badge-lectura" hidden>Solo lectura: este paso ya quedó registrado</p>
                                <galeno-campo id="notas" label="Notas del paso" type="textarea"></galeno-campo>
                                <div id="mensaje" role="alert" class="mensaje-error"></div>
                            </div>
                            <div id="panel-devolver" class="panel-devolver tarjeta" hidden>
                                <galeno-campo id="motivo" label="¿Qué le faltó al paso anterior?" type="textarea"
                                              placeholder="Explique qué debe completar el rol anterior"></galeno-campo>
                                <div class="acciones">
                                    <button id="cancelar-devolver" type="button" class="secundario">Cancelar</button>
                                    <button id="confirmar-devolver" type="button" class="acento">Devolver expediente</button>
                                </div>
                            </div>
                        </div>
                        <div class="columna-examenes">
                            <galeno-lista-examenes id="examenes"></galeno-lista-examenes>
                        </div>
                    </div>
                    <div class="barra-acciones">
                        <div class="acciones">
                            <button id="anterior" type="button" class="secundario">Anterior</button>
                            <button id="devolver" type="button" class="secundario">Devolver al paso anterior</button>
                            <button id="avanzar" type="button">Guardar y avanzar al siguiente paso</button>
                            <button id="finalizar" type="button" class="acento">Finalizar consulta</button>
                        </div>
                        <p class="nota-finalizar" id="nota-finalizar" hidden>Al finalizar se cierra la consulta y sus pasos quedan en solo lectura.</p>
                    </div>
                </div>
            </section>`;
        // Busca un elemento de la vista por su ID.
        const $ = id => this.contenedor.querySelector("#" + id);
        ["estado", "cuerpo", "iniciales", "paciente", "procedimiento", "pasos", "paso", "lectura", "devuelto",
         "notas", "examenes", "mensaje", "anterior", "avanzar", "finalizar", "volver", "devolver", "motivo"]
            .forEach(id => this[id] = $(id));
        this.bloquePaso = $("bloque-paso");
        this.panelDevolver = $("panel-devolver");
        this.confirmarDevolver = $("confirmar-devolver");
        this.notaFinalizar = $("nota-finalizar");
        this.aviso = this.avisoInyectado ?? this.contenedor.closest?.("galeno-app")?.querySelector("#aviso") ?? document.querySelector("#aviso");
        this.procedimiento.formatoTexto = o => o.nombre;
        // Repite la operación que produjo el error.
        this.estado.addEventListener("galeno-reintentar", () => this.cargar());
        // Actualiza los datos que dependen de la opción seleccionada.
        this.procedimiento.addEventListener("galeno-seleccion", e => {
            const i = this.procs.indexOf(e.detail.valor);
            if (i >= 0) { this.indiceProc = i; this.vista = this.actual(); this.pintar(); }
        });
        this.pasos.addEventListener("galeno-ir-paso", e => { this.vista = e.detail.indice; this.pintar(); });
        this.anterior.addEventListener("click", () => { this.vista = Math.max(this.vista - 1, 0); this.pintar(); });
        this.avanzar.addEventListener("click", () => this.guardarYAvanzar());
        this.finalizar.addEventListener("click", () => this.finalizarConsulta());
        this.volver.addEventListener("click", () => this.irA("dashboard"));
        this.devolver.addEventListener("click", () => this.abrirDevolucion(true));
        $("cancelar-devolver").addEventListener("click", () => this.abrirDevolucion(false));
        this.confirmarDevolver.addEventListener("click", () => this.devolverPaso());
        this.examenes.addEventListener("galeno-asignar", e => this.asignar(e.detail.ids));
        return this.cargar();
    }

    // Descarta el trabajo pendiente de la vista al salir.
    destruir() { this._carga++; this.dejarDeEscuchar(); }

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

    // Pide el expediente y el catálogo de exámenes; al llegar se dispara galeno-consulta-cargada.
    cargar() {
        const carga = ++this._carga;
        this.estado.mostrar("cargando");
        const s = this.servicios;
        return Promise.all([this.expediente.cargar(), s.examenes.listarTodo(), s.relaciones.listarTodo(),
                            s.cats.listarTodo(), s.tipos.listarTodo()])
            .then(([datos, examenes, relaciones, cats, tipos]) => {
                if (carga !== this._carga) return false;
                this.contenedor.dispatchEvent(new CustomEvent("galeno-consulta-cargada",
                    { detail: { datos, catalogo: { examenes, relaciones, cats, tipos } } }));
                return this.cargada;
            })
            .catch(() => {
                if (carga !== this._carga) return false;
                this.estado.mostrar("error", "No se pudo cargar la consulta.");
                return false;
            });
    }

    // Reacciona al expediente recibido mostrando al paciente y el paso que corresponde.
    mostrarConsulta({ datos, catalogo }) {
        this.datos = datos;
        this.catalogo = catalogo;
        this.consulta = this.datos.consultas.find(c => c.idConsulta === this.idConsulta);
        if (!this.consulta) { this.estado.mostrar("error", "La consulta no existe."); return false; }
        this.estado.mostrar("contenido");
        this.cuerpo.hidden = false;
        this.procs = this.expediente.procedimientosDe(this.datos, this.consulta);
        this.procedimiento.opciones = this.procs;
        this.procedimiento.hidden = this.procs.length < 2;
        if (this.procs.length) this.procedimiento.seleccionar(this.procs[0]);
        const p = this.expediente.paciente(this.datos, this.consulta);
        this.paciente.textContent = `${p.nombre}${p.edad != null ? " · " + p.edad + " años" : ""}${p.documento ? " · " + p.documento : ""}`;
        this.iniciales.textContent = this.datosClinica.iniciales(p.nombre);
        if (!this.procs.length) { this.mensaje.textContent = "Esta consulta no tiene procedimientos."; this.pintar(); return true; }
        this.indiceProc = Math.min(this.indiceProc, this.procs.length - 1);
        this.vista = this.actual();
        this.pintar();
        return true;
    }

    // Devuelve el procedimiento seleccionado.
    get proc() { return this.procs[this.indiceProc]; }
    // Devuelve el índice del paso que corresponde atender.
    actual() { const e = this.proc?.estado; return e ? (e.actual ?? e.definidos.length - 1) : 0; }
    // Comprueba si el procedimiento aún admite seguimiento.
    enCurso() { return this.proc && !this.proc.estado.completo && !this.consulta.fechaFin; }
    // Comprueba si el rol elegido puede atender el paso actual.
    leToca() { return this.flujo.loAtiende(this.proc.estado, this.sesionUtil.contexto()?.idRol); }
    // Comprueba si el usuario puede editar el paso que está viendo.
    editable() { return this.enCurso() && this.vista === this.proc.estado.actual && this.leToca(); }
    // Comprueba si el usuario puede regresar el expediente al paso anterior.
    puedeDevolver() { return this.editable() && this.flujo.puedeDevolver(this.proc.estado); }
    // Devuelve el nombre del rol que atiende el paso indicado.
    rolDelPaso(i = this.proc.estado.actual) { return this.proc.estado.definidos[i]?.idRol?.nombre ?? "otro rol"; }

    // Actualiza la vista con los datos y el estado actuales.
    pintar() {
        if (!this.proc) { ["anterior", "avanzar", "finalizar", "devolver"].forEach(id => this[id].hidden = true); return; }
        const e = this.proc.estado, n = e.definidos.length;
        this.mensaje.textContent = "";
        this.pasos.pasos = e.definidos.map((d, i) => ({ nombre: d.nombre,
            estado: e.completo || i < e.actual ? "hecho" : i === e.actual ? "actual" : "pendiente" }));
        this.pasos.vista = this.vista;
        this.paso.textContent = `Paso ${this.vista + 1} de ${n}: ${e.definidos[this.vista].nombre}`;
        const editable = this.editable();
        this.lectura.hidden = editable;
        this.lectura.textContent = this.enCurso() && this.vista === e.actual && !this.leToca()
            ? `Este paso le corresponde al rol ${this.rolDelPaso()}`
            : "Solo lectura: este paso ya quedó registrado";
        const devolucion = e.devuelto && this.vista === e.actual
            ? this.notasUtil.devolucionDe(this.proc.cp.observaciones, this.vista + 1) : null;
        this.devuelto.hidden = !devolucion;
        this.devuelto.textContent = devolucion ? `Devuelto por ${devolucion.autor}: ${devolucion.motivo}` : "";
        this.bloquePaso.classList.toggle("solo-lectura", !editable);
        this.notas.value = this.notasUtil.de(this.proc.cp.observaciones, this.vista + 1);
        this.notas.deshabilitado = !editable;
        this.pintarExamenes(editable);
        const ultimo = this.vista === n - 1;
        this.anterior.hidden = this.vista === 0;
        this.devolver.hidden = !this.puedeDevolver();
        if (this.devolver.hidden) this.panelDevolver.hidden = true;
        this.avanzar.hidden = !editable || ultimo;
        this.finalizar.hidden = !(editable && ultimo);
        ["anterior", "avanzar", "finalizar", "devolver"].forEach(id => this[id].disabled = this.ocupado);
        this.notaFinalizar.hidden = this.finalizar.hidden;
    }

    // Prepara el catálogo y las órdenes visibles del paso.
    pintarExamenes(editable) {
        const def = this.proc.estado.definidos[this.vista];
        const { examenes, relaciones, cats } = this.catalogo;
        const ids = new Set(relaciones.filter(r => r.activo !== false && def.idProcedimientoPaso
            && r.idProcedimientoPaso?.idProcedimientoPaso === def.idProcedimientoPaso).map(r => r.idExamen?.idExamen));
        const lista = examenes.filter(x => ids.has(x.idExamen) && x.activo !== false).map(x => ({
            id: x.idExamen, nombre: x.nombre,
            categoria: cats.find(c => c.idExamen?.idExamen === x.idExamen)?.idTipoExamen?.nombre ?? "" }));
        this.examenes.examenes = lista;
        const paso = this.pasoRealizado(this.vista);
        const pedidos = paso ? this.datos.ordenes.filter(o => o.idConsultaProcedimientoPaso?.idConsultaProcedimientoPaso === paso.idConsultaProcedimientoPaso) : [];
        this.examenes.asignados = lista.filter(x => pedidos.some(o => o.indicaciones === x.nombre)).map(x => x.id);
        this.examenes.deshabilitada = !editable || this.ocupado;
    }

    // Bloquea las acciones mientras hay una escritura en curso.
    marcarOcupado(ocupado) {
        this.ocupado = ocupado;
        ["anterior", "avanzar", "finalizar", "devolver", "confirmarDevolver"].forEach(id => this[id].disabled = ocupado);
        this.examenes.deshabilitada = !this.editable() || ocupado;
    }

    // Ejecuta una escritura bloqueando los botones hasta que el servidor responde.
    escribir(operacion, error) {
        if (this.ocupado) return Promise.resolve();
        this.marcarOcupado(true);
        return Promise.resolve()
            .then(operacion)
            .catch(() => this.aviso?.mostrar(error, "error"))
            .finally(() => this.marcarOcupado(false));
    }

    // Devuelve el registro del paso indicado si ya existe.
    pasoRealizado(i) { return this.proc.estado.realizados[i] ?? null; }

    // Reutiliza el paso en curso o crea su registro antes de escribir.
    asegurarPaso() {
        const existente = this.pasoRealizado(this.vista);
        if (existente) return Promise.resolve(existente);
        return this.servicios.realizados.crear({
            idConsultaProcedimiento: { idConsultaProcedimiento: this.proc.cp.idConsultaProcedimiento },
            idPersonaRol: { idPersonaRol: this.sesion.idPersonaRol },
            estado: this.datosClinica.enProceso, fechaInicio: this.ahora(), fechaFin: null })
            .then(r => {
                this.datos.realizados.push(r);
                this.proc.estado.realizados.push(r);
                return r;
            });
    }

    // Guarda las observaciones del paso en el procedimiento.
    guardarObservaciones(obs) {
        const cp = this.proc.cp;
        if (obs === (cp.observaciones ?? "")) return Promise.resolve();
        return this.servicios.cps.actualizar(cp.idConsultaProcedimiento, { ...cp, observaciones: obs })
            .then(nuevo => { this.proc.cp = Object.assign(cp, this.respuesta(nuevo), { observaciones: obs }); });
    }

    // Guarda la nota del paso y borra el motivo de devolución si lo había.
    guardarNotas() {
        const def = this.proc.estado.definidos[this.vista];
        const numero = this.vista + 1;
        const conNota = this.notasUtil.guardar(this.proc.cp.observaciones, numero, def.nombre, this.sesion.nombre, this.notas.value);
        return this.guardarObservaciones(this.notasUtil.quitarDevolucion(conNota, numero));
    }

    // Crea una orden por cada examen marcado, una después de otra.
    asignar(ids) {
        if (this.ocupado) return Promise.resolve();
        if (!ids.length) { this.mensaje.textContent = "Marque al menos un examen"; return Promise.resolve(); }
        return this.escribir(() => this.asegurarPaso().then(paso => ids.reduce((cadena, id) => cadena.then(() => {
            const x = this.catalogo.examenes.find(e => e.idExamen === id);
            return this.servicios.ordenes.crear({
                idConsultaProcedimientoPaso: { idConsultaProcedimientoPaso: paso.idConsultaProcedimientoPaso },
                indicaciones: x.nombre, fechaCreacion: this.ahora() })
                .then(orden => this.datos.ordenes.push({ ...orden, idConsultaProcedimientoPaso: paso, indicaciones: x.nombre }));
        }), Promise.resolve())).then(() => {
            this.pintarExamenes(true);
            this.aviso?.mostrar("Exámenes asignados", "exito");
        }), "No se pudieron asignar los exámenes");
    }

    // Guarda las notas y marca el paso como completado.
    completarPaso() {
        return this.asegurarPaso()
            .then(paso => this.guardarNotas().then(() => paso))
            .then(paso => this.servicios.realizados.actualizar(paso.idConsultaProcedimientoPaso,
                    { ...paso, estado: this.datosClinica.completado, fechaFin: this.ahora() })
                .then(hecho => Object.assign(paso, this.respuesta(hecho), { estado: this.datosClinica.completado })));
    }

    // Vuelve a determinar el avance a partir de los pasos guardados.
    recalcular() {
        const e = this.proc.estado;
        this.proc.estado = this.flujo.estado(e.definidos.length === 1 && !e.definidos[0].idProcedimientoPaso ? [] : e.definidos, e.realizados);
    }

    // Completa el paso y muestra el que corresponde ahora.
    guardarYAvanzar() {
        return this.escribir(() => this.completarPaso().then(() => {
            this.recalcular();
            this.vista = this.actual();
            this.pintar();
            this.aviso?.mostrar(this.leToca() ? "Paso guardado"
                : `Paso guardado. El siguiente le corresponde al rol ${this.rolDelPaso()}`, "exito");
        }), "No se pudo guardar el paso");
    }

    // Muestra u oculta el cuadro para escribir el motivo de la devolución.
    abrirDevolucion(abrir) {
        this.panelDevolver.hidden = !abrir;
        this.motivo.value = "";
        this.motivo.error("");
        if (abrir) this.motivo.focus?.();
    }

    // Regresa el expediente al paso anterior para que su rol lo complete.
    devolverPaso() {
        const motivo = this.motivo.value.trim();
        if (!motivo) { this.motivo.error("Escriba qué le faltó al paso anterior"); return Promise.resolve(); }
        const e = this.proc.estado;
        const anterior = e.realizados[e.actual - 1];
        const rol = this.rolDelPaso(e.actual - 1);
        const devuelto = this.datosClinica.devuelto;
        return this.escribir(() => this.servicios.realizados.actualizar(anterior.idConsultaProcedimientoPaso,
                { ...anterior, estado: devuelto, fechaFin: null })
            .then(r => Object.assign(anterior, this.respuesta(r), { estado: devuelto, fechaFin: null }))
            .then(() => this.guardarObservaciones(
                this.notasUtil.guardarDevolucion(this.proc.cp.observaciones, e.actual, this.sesion.nombre, motivo)))
            .then(() => {
                this.recalcular();
                this.contenedor.dispatchEvent(new CustomEvent("galeno-paso-devuelto", { detail: { rol } }));
            }), "No se pudo devolver el expediente");
    }

    // Reacciona a la devolución: avisa y regresa al panel, porque el expediente ya no es de este rol.
    alDevolver(rol) {
        this.panelDevolver.hidden = true;
        this.aviso?.mostrar(`Expediente devuelto al rol ${rol}`, "exito");
        this.irA("dashboard");
    }

    // Completa el paso y cierra el procedimiento y la consulta.
    finalizarConsulta() {
        return this.escribir(() => this.completarPaso().then(() => {
            this.recalcular();
            const fin = this.ahora();
            const cp = this.proc.cp;
            return this.servicios.cps.actualizar(cp.idConsultaProcedimiento, { ...cp, fechaFin: fin })
                .then(() => this.servicios.consultas.actualizar(this.consulta.idConsulta, { ...this.consulta, fechaFin: fin }))
                .then(c => {
                    this.consulta = Object.assign(this.consulta, this.respuesta(c), { fechaFin: fin });
                    this.aviso?.mostrar("Consulta finalizada", "exito");
                    this.irA("dashboard");
                });
        }), "No se pudo finalizar la consulta");
    }
}
