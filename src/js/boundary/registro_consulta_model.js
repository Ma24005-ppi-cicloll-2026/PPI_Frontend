// Pantalla "Registrar consulta" (recepcion). El paciente esta en la clinica y recepcion le abre la consulta:
//   1. Busca al paciente (por nombre, o por tipo + numero de documento). Solo salen pacientes de SU clinica.
//      Si no esta registrado, un boton lleva a "Registrar paciente".
//   2. Elige los procedimientos que necesita (los inactivos no se pueden elegir) y, si quiere, anota el motivo.
//   3. "Registrar consulta": se crea la consulta y un procedimiento por cada elegido.
// Es distinta de "Solicitar consulta" (publica): aqui no se vuelve a escribir el nombre, se elige al paciente ya registrado.
class RegistroConsultaModel {

    // irA: para ir a "Registrar paciente" (el AppModel la pasa)
    constructor(contenedor, { irA = () => {} } = {}) {
        this.contenedor = contenedor;
        this.irA = irA;
        this.paciente = null;                  // Persona elegida
        this.rolDePaciente = new Map();        // idPersona -> su PersonaRol de paciente en esta clinica
        this.procedimientos = [];
        this.elegidos = new Set();
    }

    async iniciar() {
        this.aviso = document.querySelector("#aviso");
        this.sesion = Sesion.obtener();
        if (!this.sesion || !Sesion.puede("registrar")) {
            this.contenedor.innerHTML = `<h2>Registrar consulta</h2><p>Inicie sesión como recepcionista para registrar consultas.</p>`;
            return;
        }
        this.contenedor.innerHTML = `
            <section aria-labelledby="titulo-registro">
                <h2 id="titulo-registro">Registrar consulta</h2>
                <h3 class="subtitulo">1. Paciente</h3>
                <galeno-buscador-persona id="buscaPaciente" label="Paciente (por nombre)"></galeno-buscador-persona>
                <div class="rejilla" style="margin-top:1rem;">
                    <galeno-buscador-tipo-documentos id="buscaTipo" label="O por tipo de documento"></galeno-buscador-tipo-documentos>
                    <div>
                        <label for="numeroDocumento" style="display:block; font-weight:600; margin-bottom:.3rem;">Número de documento</label>
                        <input id="numeroDocumento" type="text" autocomplete="off" placeholder="Elija primero el tipo de documento"
                               style="width:100%; box-sizing:border-box; padding:.55rem .7rem; border:1px solid #829CBC; border-radius:.4rem; font:inherit;">
                        <small id="ayudaDocumento" role="status" style="display:block; margin-top:.3rem; min-height:1.2em;"></small>
                    </div>
                </div>
                <p id="elegido" class="paciente-elegido" role="status">Aún no eligió paciente.</p>
                <button id="nuevo" type="button" class="enlace">¿No está registrado? Registrar paciente</button>
                <h3 class="subtitulo">2. Procedimientos</h3>
                <galeno-estado-vista id="estado"></galeno-estado-vista>
                <div id="procedimientos" class="rejilla-tarjetas" role="group" aria-label="Procedimientos"></div>
                <galeno-campo id="motivo" label="Motivo de la consulta (opcional)"></galeno-campo>
                <p id="resumen" class="paciente-elegido" role="status"></p>
                <button id="enviar" type="button" disabled>Registrar consulta</button>
                <section id="confirmacion" hidden role="status"></section>
            </section>`;
        const $ = id => this.contenedor.querySelector("#" + id);
        this.busca = $("buscaPaciente"); this.buscaTipo = $("buscaTipo"); this.elegido = $("elegido");
        this.estado = $("estado"); this.zonaProc = $("procedimientos"); this.motivo = $("motivo");
        this.resumen = $("resumen"); this.boton = $("enviar"); this.confirmacion = $("confirmacion");

        this.busca.addEventListener("galeno-seleccion", e => this.elegirPaciente(e.detail.valor));
        $("nuevo").addEventListener("click", () => this.irA("admision"));
        this.zonaProc.addEventListener("galeno-elegir", e => this.alternar(e.detail.id));
        this.estado.addEventListener("galeno-reintentar", () => this.cargar());
        this.boton.addEventListener("click", () => this.registrar());

        this.busquedaDocumento = new BusquedaPorDocumento({
            buscaTipo: this.buscaTipo, numero: $("numeroDocumento"), ayuda: $("ayudaDocumento"),
            resolverPersona: d => [...this.rolDePaciente.values()].map(pr => pr.idPersona)
                .find(p => p.idPersona === d.idPersona?.idPersona),
            filtro: p => this.rolDePaciente.has(p.idPersona),
            textoNoEncontrado: "No se encontró un paciente de esta clínica con ese documento",
            alEncontrar: async persona => { this.busca.seleccionar(persona); this.elegirPaciente(persona); },
            alVaciar: () => {},
            alFallar: e => this.aviso.mostrar(e.message, "error")
        });
        this.busquedaDocumento.conectar();
        this.actualizar();
        await this.cargar();
    }

    async cargar() {
        this.estado.mostrar("cargando");
        try {
            const roles = await new PersonaRolService().listar(0, 1000);
            roles.filter(pr => Sesion.normalizarRol(pr.idRol?.nombre) === "paciente" &&
                    DatosClinica.esDeClinica(pr, this.sesion.idClinica))
                .forEach(pr => this.rolDePaciente.set(pr.idPersona?.idPersona, pr));
            this.busca.opciones = [...this.rolDePaciente.values()].map(pr => pr.idPersona);
            this.buscaTipo.opciones = await new TipoDocumentoService().listar(0, 100);
            this.procedimientos = await new ProcedimientoService().listar(0, 500);
            this.estado.mostrar(this.procedimientos.length ? "contenido" : "vacio");
            this.pintarProcedimientos();
        } catch (e) { this.estado.mostrar("error", e.message); }
    }

    elegirPaciente(persona) {
        this.paciente = persona;
        this.elegido.textContent = `Paciente: ${DatosClinica.nombre(persona)}`;
        this.confirmacion.hidden = true;
        this.actualizar();
    }

    pintarProcedimientos() {
        this.zonaProc.replaceChildren();
        this.procedimientos.forEach(p => {
            const o = document.createElement("galeno-opcion");
            o.setAttribute("sin-icono", "");
            o.datos = { id: p.idProcedimiento, titulo: p.nombre, detalle: p.observaciones || "", activo: p.activo !== false };
            o.seleccionada = this.elegidos.has(p.idProcedimiento);
            this.zonaProc.append(o);
        });
    }

    alternar(id) {
        const p = this.procedimientos.find(x => x.idProcedimiento === id);
        if (!p || p.activo === false) return;
        if (this.elegidos.has(id)) this.elegidos.delete(id); else this.elegidos.add(id);
        this.pintarProcedimientos();
        this.actualizar();
    }

    listo() { return Boolean(this.paciente && this.elegidos.size > 0); }

    actualizar() {
        const n = this.elegidos.size;
        this.resumen.textContent = `${n} procedimiento${n === 1 ? "" : "s"} elegido${n === 1 ? "" : "s"}`;
        this.boton.disabled = !this.listo();
    }

    async registrar() {
        if (!this.listo()) return;
        this.boton.disabled = true; this.boton.textContent = "Registrando...";
        try {
            const personaRol = this.rolDePaciente.get(this.paciente.idPersona);
            const nombre = DatosClinica.nombre(this.paciente);
            const elegidos = this.procedimientos.filter(p => this.elegidos.has(p.idProcedimiento));
            const ahora = new Date().toISOString();
            const motivo = this.motivo.value.trim();
            const consulta = await new ConsultaService().crear({
                fechaInicio: ahora, idPersonaRol: personaRol,
                observaciones: `Registrada por recepción (${this.sesion.nombre}).${motivo ? " Motivo: " + motivo + "." : ""} Procedimientos: ${elegidos.map(p => p.nombre).join(", ")}.`
            });
            for (const p of elegidos) {
                await new ConsultaProcedimientoService().crear({
                    idConsulta: consulta, idProcedimiento: p.idProcedimiento, fechaInicio: ahora,
                    observaciones: `Registrado por recepción (${this.sesion.nombre})` });
            }
            this.mostrarConfirmacion(nombre, elegidos);
        } catch (e) {
            this.aviso.mostrar(e.message, "error");
        } finally {
            this.boton.textContent = "Registrar consulta";
            this.actualizar();
        }
    }

    mostrarConfirmacion(nombre, procedimientos) {
        this.confirmacion.hidden = false;
        this.confirmacion.replaceChildren();
        const h = document.createElement("h3"); h.textContent = "¡Consulta registrada!";
        const p = document.createElement("p");
        p.textContent = `${nombre}: consulta registrada con ${procedimientos.map(x => x.nombre).join(", ")}. Ya aparece en la sala de espera.`;
        this.confirmacion.append(h, p);
        this.aviso.mostrar("Consulta registrada", "exito");
        this.elegidos.clear();
        this.paciente = null;
        this.elegido.textContent = "Aún no eligió paciente.";
        this.motivo.value = "";
        this.pintarProcedimientos();
    }
}
