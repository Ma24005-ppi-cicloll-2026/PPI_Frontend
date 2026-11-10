// Tambien la usa Enfermeria: new AtencionModel(c, { pantalla: "enfermeria", acciones: ["paso", "estado"], ... })
// (la enfermera registra y actualiza pasos, pero no pide examenes ni registra resultados).
// HU3 · Atencion (medico). Es la "recepcion de orden" del barista de Cafefe:
//   1. Lista las consultas PENDIENTES (que aun no se finalizan) de la clinica de la sesion.
//   2. Al elegir una se muestran sus procedimientos, pasos, examenes y resultados.
//   3. Desde ahi el medico registra pasos, actualiza su estado (Pendiente / En proceso / Completado),
//      solicita examenes y registra sus resultados. Finalizar la consulta es de recepcion (pantalla Cierre).
class AtencionModel {

    // opciones: pantalla (para el permiso), titulo, sinPermiso (texto) y acciones (cuales botones se muestran)
    constructor(contenedor, opciones = {}) {
        this.contenedor = contenedor;
        this.pantalla = opciones.pantalla ?? "atencion";
        this.titulo = opciones.titulo ?? "Atención de consultas";
        this.sinPermiso = opciones.sinPermiso ?? "Inicie sesión como personal médico para atender consultas.";
        this.clavesAcciones = opciones.acciones ?? null;        // null = todas
        this.consultas = [];
        this.consulta = null;
        this.accion = null;                  // clave de la accion cuyo formulario esta abierto
        this.personaRol = null;              // PersonaRol de quien inicio sesion (se pide al backend una vez)
    }

    async iniciar() {
        this.aviso = document.querySelector("#aviso");
        this.sesion = Sesion.obtener();
        if (!this.sesion || !Sesion.puede(this.pantalla)) {
            this.contenedor.innerHTML = `<h2>${this.titulo}</h2><p>${this.sinPermiso}</p>`;
            return;
        }
        this.contenedor.innerHTML = `
            <h2>${this.titulo}</h2>
            <section id="lista" aria-live="polite">
                <h3 class="subtitulo">Consultas pendientes</h3>
                <galeno-estado-vista id="estado"></galeno-estado-vista>
                <div id="tarjetas" class="lista-tarjetas"></div>
            </section>
            <section id="trabajo" hidden>
                <div class="acciones" id="acciones"></div>
                <galeno-formulario id="formulario" hidden></galeno-formulario>
                <section id="detalle" hidden></section>
            </section>`;
        const $ = id => this.contenedor.querySelector("#" + id);
        this.seccionLista = $("lista"); this.estado = $("estado"); this.tarjetas = $("tarjetas");
        this.trabajo = $("trabajo"); this.botones = $("acciones"); this.formulario = $("formulario");
        this.detalle = new DetalleConsulta($("detalle"), () => this.volverALista());
        this.detalle.iniciar();

        this.definirAcciones();
        this.tarjetas.addEventListener("galeno-abrir-consulta", e => this.abrir(e.detail.idConsulta));
        this.estado.addEventListener("galeno-reintentar", () => this.cargar());
        this.formulario.addEventListener("galeno-guardar", e => this.guardarAccion(e.detail.datos));
        this.formulario.addEventListener("galeno-cancelar", () => this.cerrarFormulario());
        await this.cargar();
    }

    // ---------- consultas pendientes ----------

    async cargar() {
        this.estado.mostrar("cargando");
        this.tarjetas.replaceChildren();
        try {
            const todas = await new ConsultaService().listar(0, 500);
            this.consultas = DatosClinica.masRecientePrimero(
                todas.filter(c => !c.fechaFin && DatosClinica.esDeClinica(c.idPersonaRol, this.sesion.idClinica)), "fechaInicio");
            this.estado.mostrar(this.consultas.length ? "contenido" : "vacio");
            this.consultas.forEach(c => {
                const t = document.createElement("galeno-tarjeta-consulta");
                t.setAttribute("con-paciente", "");
                t.consulta = c;
                this.tarjetas.append(t);
            });
        } catch (e) { this.estado.mostrar("error", e.message); }
    }

    volverALista() {
        this.trabajo.hidden = true;
        this.seccionLista.hidden = false;
        this.cerrarFormulario();
    }

    async abrir(idConsulta) {
        this.consulta = this.consultas.find(c => c.idConsulta === idConsulta);
        if (!this.consulta) return;
        try {
            await this.refrescarDetalle();
            this.seccionLista.hidden = true;
            this.trabajo.hidden = false;
        } catch (e) { this.aviso.mostrar(e.message, "error"); }
    }

    refrescarDetalle() {
        return this.detalle.abrir(this.consulta, { idPersona: this.consulta.idPersonaRol?.idPersona?.idPersona });
    }

    // ---------- acciones del medico ----------
    // Cada accion dice: su boton, los campos de su formulario y que guardar. Para agregar otra: una entrada aqui.

    definirAcciones() {
        const t = () => this.detalle.tablas;
        const ahora = () => new Date().toISOString();
        const textoPaso = p => `${nombreProcedimiento(p.idConsultaProcedimiento?.idProcedimiento)} · ${p.estado ?? "—"}`;
        const estadoCampo = etiqueta => ({ nombre: "estado", etiqueta, tipo: "relacion", requerido: true,
            opciones: DatosClinica.ESTADOS_PASO, formatoTexto: e => e.nombre });
        this.acciones = {
            paso: {
                texto: "Registrar paso",
                campos: async () => [
                    { nombre: "procedimiento", etiqueta: "Procedimiento de la consulta", tipo: "relacion", requerido: true,
                      opciones: t().procedimientos.filas, formatoTexto: cp => nombreProcedimiento(cp.idProcedimiento) },
                    estadoCampo("Estado")],
                guardar: async d => new ConsultaProcedimientoPasoService().crear({
                    idConsultaProcedimiento: d.procedimiento, idPersonaRol: await this.miPersonaRol(),
                    estado: d.estado.nombre, fechaInicio: ahora(),
                    fechaFin: d.estado.nombre === DatosClinica.COMPLETADO ? ahora() : null }),
                exito: "Paso registrado"
            },
            estado: {
                texto: "Actualizar paso",
                campos: async () => [
                    { nombre: "paso", etiqueta: "Paso", tipo: "relacion", requerido: true,
                      opciones: t().pasos.filas.filter(p => p.estado !== DatosClinica.COMPLETADO), formatoTexto: textoPaso },
                    estadoCampo("Nuevo estado")],
                guardar: d => new ConsultaProcedimientoPasoService().actualizar(d.paso.idConsultaProcedimientoPaso, {
                    ...d.paso, estado: d.estado.nombre,
                    fechaFin: d.estado.nombre === DatosClinica.COMPLETADO ? ahora() : d.paso.fechaFin }),
                exito: "Paso actualizado"
            },
            examen: {
                texto: "Solicitar examen",
                campos: async () => [
                    { nombre: "paso", etiqueta: "Paso", tipo: "relacion", requerido: true, opciones: t().pasos.filas, formatoTexto: textoPaso },
                    { nombre: "indicaciones", etiqueta: "Indicaciones del examen", tipo: "area", requerido: true }],
                guardar: d => new OrdenExamenService().crear({ idConsultaProcedimientoPaso: d.paso,
                    indicaciones: d.indicaciones, fechaCreacion: ahora() }),
                exito: "Examen solicitado"
            },
            resultado: {
                texto: "Registrar resultado",
                campos: async () => {
                    const conResultado = new Set(t().resultados.filas.map(r => r.idOrdenExamen?.idOrdenExamen));
                    return [
                        { nombre: "orden", etiqueta: "Orden de examen", tipo: "relacion", requerido: true,
                          opciones: t().ordenes.filas.filter(o => !conResultado.has(o.idOrdenExamen)),
                          formatoTexto: o => `${GestorFechas.aFechaHora(o.fechaCreacion)} · ${o.indicaciones ?? "—"}` },
                        { nombre: "resultado", etiqueta: "Resultado", tipo: "area", requerido: true },
                        { nombre: "interpretacion", etiqueta: "Interpretación", tipo: "area" }];
                },
                guardar: d => new ExamenResultadoService().crear({ idOrdenExamen: d.orden, fechaCreacion: ahora(),
                    resultado: d.resultado, interpretacion: d.interpretacion || null }),
                exito: "Resultado registrado"
            }
        };
        if (this.clavesAcciones) {
            this.acciones = Object.fromEntries(Object.entries(this.acciones).filter(([c]) => this.clavesAcciones.includes(c)));
        }
        Object.entries(this.acciones).forEach(([clave, a]) => {
            const b = document.createElement("button");
            b.type = "button"; b.textContent = a.texto; b.dataset.accion = clave;
            b.addEventListener("click", () => this.abrirAccion(clave));
            this.botones.append(b);
        });
    }

    async miPersonaRol() {
        if (!this.personaRol) this.personaRol = await new PersonaRolService().buscar(this.sesion.idPersonaRol);
        return this.personaRol;
    }

    async abrirAccion(clave) {
        try {
            const campos = await this.acciones[clave].campos();
            const vacio = campos.find(c => c.tipo === "relacion" && c.opciones.length === 0);
            if (vacio) { this.aviso.mostrar(`No hay opciones para «${vacio.etiqueta}» en esta consulta`, "info"); return; }
            this.accion = clave;
            this.formulario.campos = campos;
            this.formulario.valores = {};
            this.formulario.hidden = false;
        } catch (e) { this.aviso.mostrar(e.message, "error"); }
    }

    cerrarFormulario() { this.accion = null; this.formulario.hidden = true; }

    async guardarAccion(datos) {
        const accion = this.acciones[this.accion];
        if (!accion) return;
        try {
            await accion.guardar(datos);
            this.aviso.mostrar(accion.exito, "exito");
            this.cerrarFormulario();
            await this.refrescarDetalle();
        } catch (e) { this.aviso.mostrar(e.message, "error"); }
    }
}
