// HU2 · Solicitar consulta (el paciente NO inicia sesion). Es el "pedido" de Cafefe:
//   1. Escribe su nombre y apellido.
//   2. Busca y elige una clinica (la "categoria": se ve con su imagen; si esta inactiva no se puede elegir).
//   3. Se muestran los procedimientos; elige los que necesita (los inactivos no se pueden elegir).
//   4. "Solicitar consulta": se crea la consulta y sus procedimientos. Su nombre queda escrito en las
//      observaciones de la consulta y de cada procedimiento.
// Si la persona aun no existe en esa clinica como paciente, se registra (Persona + PersonaRol de paciente).
class SolicitudModel {

    constructor(contenedor) {
        this.contenedor = contenedor;
        this.clinicas = [];
        this.procedimientos = [];
        this.clinica = null;
        this.elegidos = new Set();            // idProcedimiento de los procedimientos elegidos
    }

    async iniciar() {
        this.aviso = document.querySelector("#aviso");
        this.contenedor.innerHTML = `
            <section class="solicitud" aria-labelledby="titulo-solicitud">
                <h2 id="titulo-solicitud">Solicitar consulta</h2>
                <p>No necesita iniciar sesión. Elija la clínica y lo que necesita.</p>
                <div class="rejilla">
                    <galeno-campo id="nombres" label="Nombres *" autocomplete="given-name"></galeno-campo>
                    <galeno-campo id="apellidos" label="Apellidos *" autocomplete="family-name"></galeno-campo>
                </div>
                <h3 class="subtitulo">1. Clínica</h3>
                <galeno-campo id="buscar" label="Buscar clínica" placeholder="Nombre o tipo"></galeno-campo>
                <galeno-estado-vista id="estadoClinicas"></galeno-estado-vista>
                <div id="clinicas" class="rejilla-tarjetas" role="group" aria-label="Clínicas"></div>
                <section id="seccionProcedimientos" hidden>
                    <h3 class="subtitulo" id="tituloProcedimientos"></h3>
                    <div id="procedimientos" class="rejilla-tarjetas" role="group" aria-label="Procedimientos"></div>
                </section>
                <p id="resumen" class="paciente-elegido" role="status"></p>
                <button id="enviar" type="button" disabled>Solicitar consulta</button>
                <section id="confirmacion" hidden role="status"></section>
            </section>`;
        const $ = id => this.contenedor.querySelector("#" + id);
        this.nombres = $("nombres"); this.apellidos = $("apellidos"); this.buscar = $("buscar");
        this.estado = $("estadoClinicas"); this.zonaClinicas = $("clinicas");
        this.seccionProc = $("seccionProcedimientos"); this.zonaProc = $("procedimientos");
        this.tituloProc = $("tituloProcedimientos"); this.resumen = $("resumen");
        this.boton = $("enviar"); this.confirmacion = $("confirmacion");

        [this.nombres, this.apellidos].forEach(c => c.addEventListener("galeno-cambio", () => { c.error(""); this.actualizar(); }));
        this.buscar.addEventListener("galeno-cambio", () => this.pintarClinicas());
        this.zonaClinicas.addEventListener("galeno-elegir", e => this.elegirClinica(e.detail.id));
        this.zonaProc.addEventListener("galeno-elegir", e => this.alternarProcedimiento(e.detail.id));
        this.boton.addEventListener("click", () => this.solicitar());
        this.estado.addEventListener("galeno-reintentar", () => this.cargar());
        this.actualizar();
        await this.cargar();
    }

    async cargar() {
        this.estado.mostrar("cargando");
        try {
            this.clinicas = await new ClinicaService().listar(0, 100);
            this.procedimientos = await new ProcedimientoService().listar(0, 500);
            this.estado.mostrar(this.clinicas.length ? "contenido" : "vacio");
            this.pintarClinicas();
        } catch (e) { this.estado.mostrar("error", e.message); }
    }

    // ---------- clinicas (categorias) ----------

    clinicasFiltradas() {
        const q = DatosClinica.normalizar(this.buscar.value);
        return this.clinicas.filter(c => DatosClinica.normalizar(`${c.nombre} ${c.tipo ?? ""}`).includes(q));
    }

    pintarClinicas() {
        this.zonaClinicas.replaceChildren();
        this.clinicasFiltradas().forEach(c => {
            const o = document.createElement("galeno-opcion");
            o.datos = { id: c.idClinica, titulo: c.nombre, detalle: c.tipo || c.comentarios || "",
                        icono: GalenoOpcion.iconoPara(`${c.tipo ?? ""} ${c.nombre}`), activo: c.activo !== false };
            o.seleccionada = this.clinica?.idClinica === c.idClinica;
            this.zonaClinicas.append(o);
        });
    }

    elegirClinica(id) {
        const c = this.clinicas.find(x => x.idClinica === id);
        if (!c || c.activo === false) return;            // una clinica inactiva no se puede elegir
        this.clinica = c;
        this.pintarClinicas();
        this.tituloProc.textContent = `2. Procedimientos en ${c.nombre}`;
        this.seccionProc.hidden = false;
        this.pintarProcedimientos();
        this.actualizar();
    }

    // ---------- procedimientos (productos) ----------

    pintarProcedimientos() {
        this.zonaProc.replaceChildren();
        if (this.procedimientos.length === 0) {
            this.zonaProc.textContent = "Esta clínica aún no tiene procedimientos disponibles.";
            return;
        }
        this.procedimientos.forEach(p => {
            const o = document.createElement("galeno-opcion");
            o.setAttribute("sin-icono", "");
            o.datos = { id: p.idProcedimiento, titulo: p.nombre, detalle: p.observaciones || "", activo: p.activo !== false };
            o.seleccionada = this.elegidos.has(p.idProcedimiento);
            this.zonaProc.append(o);
        });
    }

    alternarProcedimiento(id) {
        const p = this.procedimientos.find(x => x.idProcedimiento === id);
        if (!p || p.activo === false) return;
        if (this.elegidos.has(id)) this.elegidos.delete(id); else this.elegidos.add(id);
        this.pintarProcedimientos();
        this.actualizar();
    }

    // ---------- enviar ----------

    nombreCompleto() { return `${this.nombres.value.trim()} ${this.apellidos.value.trim()}`.trim(); }

    listo() {
        return Boolean(this.nombres.value.trim() && this.apellidos.value.trim() && this.clinica && this.elegidos.size > 0);
    }

    actualizar() {
        const n = this.elegidos.size;
        this.resumen.textContent = this.clinica
            ? `${this.clinica.nombre}: ${n} procedimiento${n === 1 ? "" : "s"} elegido${n === 1 ? "" : "s"}`
            : "Elija una clínica para continuar.";
        this.boton.disabled = !this.listo();
    }

    async solicitar() {
        if (!this.nombres.value.trim()) { this.nombres.error("Escriba sus nombres"); this.nombres.focus(); return; }
        if (!this.apellidos.value.trim()) { this.apellidos.error("Escriba sus apellidos"); this.apellidos.focus(); return; }
        if (!this.listo()) return;
        this.boton.disabled = true; this.boton.textContent = "Enviando...";
        try {
            const personaRol = await this.obtenerPaciente();
            const nombre = this.nombreCompleto();
            const elegidos = this.procedimientos.filter(p => this.elegidos.has(p.idProcedimiento));
            const ahora = new Date().toISOString();
            const consulta = await new ConsultaService().crear({
                fechaInicio: ahora, idPersonaRol: personaRol,
                observaciones: `Solicitada por ${nombre}. Procedimientos: ${elegidos.map(p => p.nombre).join(", ")}.`
            });
            for (const p of elegidos) {
                await new ConsultaProcedimientoService().crear({
                    idConsulta: consulta, idProcedimiento: p.idProcedimiento, fechaInicio: ahora,
                    observaciones: `Solicitado por ${nombre}` });
            }
            this.mostrarConfirmacion(nombre, elegidos);
        } catch (e) {
            this.aviso.mostrar(e.message, "error");
        } finally {
            this.boton.textContent = "Solicitar consulta";
            this.actualizar();
        }
    }

    // Busca a la persona como paciente de la clinica; si no existe, la registra.
    async obtenerPaciente() {
        const nombre = DatosClinica.normalizar(this.nombreCompleto());
        const mismoNombre = persona => DatosClinica.normalizar(DatosClinica.nombre(persona)) === nombre;
        const esPaciente = pr => Sesion.normalizarRol(pr.idRol?.nombre) === "paciente";

        const rolesDePersona = await new PersonaRolService().listar(0, 1000);
        const existente = rolesDePersona.find(pr => esPaciente(pr) && mismoNombre(pr.idPersona) &&
            pr.idClinica?.idClinica === this.clinica.idClinica);
        if (existente) return existente;

        const rol = (await new RolService().listar(0, 200)).find(r => Sesion.normalizarRol(r.nombre) === "paciente");
        if (!rol) throw new Error("La clínica aún no tiene configurado el rol de paciente");
        const ahora = new Date().toISOString();
        let persona = (await new PersonaService().listar(0, 1000)).find(mismoNombre);
        if (!persona) persona = await new PersonaService().crear({
            nombres: this.nombres.value.trim(), apellidos: this.apellidos.value.trim(), fechaCreacion: ahora });
        return new PersonaRolService().crear({ idPersona: persona, idRol: rol, idClinica: this.clinica, fechaCreacion: ahora });
    }

    mostrarConfirmacion(nombre, procedimientos) {
        this.confirmacion.hidden = false;
        this.confirmacion.replaceChildren();
        const h = document.createElement("h3"); h.textContent = "¡Consulta solicitada!";
        const p = document.createElement("p");
        p.textContent = `${nombre}, su consulta en ${this.clinica.nombre} quedó registrada con: ${procedimientos.map(x => x.nombre).join(", ")}.`;
        this.confirmacion.append(h, p);
        this.aviso.mostrar("Consulta solicitada", "exito");
        this.elegidos.clear();
        this.pintarProcedimientos();
    }
}
