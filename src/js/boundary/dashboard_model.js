class DashboardModel {

    static POR_PAGINA = 12;

    // Prepara el estado de filtros, contexto y paginación.
    constructor(contenedor, { irA = () => {} } = {}) {
        this.contenedor = contenedor;
        this.irA = irA;
        this.datos = null;

        this._carga = 0;
        this.chipEstado = "total";
        this.pagina = 0;

    }

    // Prepara el estado y las escuchas que necesita este flujo.
    iniciar() {
        this.sesion = Sesion.obtener();
        const contextos = this.sesion?.contextos ?? [];
        const e = DashboardModel.esc;
        this.contenedor.innerHTML = `
            <section class="dashboard" aria-labelledby="titulo-dash">
                <h2 id="titulo-dash" class="sr">Dashboard</h2>
                <div class="herramientas">
                    <div class="tarjeta herramientas-caja">
                        ${this.sesion ? `<h3 class="mini">Bienvenido, ${e(this.sesion.nombre)}</h3>` : ""}
                        <form id="contexto" novalidate>
                            <galeno-selector id="clinica" label="Clínica" placeholder="Elija la clínica"></galeno-selector>
                            <galeno-selector id="rol" label="Rol" placeholder="Elija el rol"></galeno-selector>
                            <div id="mensaje" role="alert" class="mensaje-error"></div>
                            <button id="cargar" type="submit">Cargar consultas</button>
                        </form>
                        <div id="resumen-contexto" hidden>
                            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false"><path d="M4 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16M16 9h2a2 2 0 0 1 2 2v10M2 21h20M8 7h2M8 11h2M8 15h2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
                            <strong id="resumen-contexto-texto"></strong>
                            <button id="cambiar-contexto" type="button" class="enlace">Cambiar</button>
                        </div>
                        <form id="filtros" hidden novalidate>
                            <galeno-campo id="paciente" label="Buscar paciente" icono="lupa" limpiar
                                          placeholder="Nombre o documento"></galeno-campo>
                            <galeno-segmentado id="modo" label="Fechas"></galeno-segmentado>
                            <galeno-campo id="desde" label="Desde" type="date" hidden></galeno-campo>
                            <galeno-campo id="hasta" label="Hasta" type="date" hidden></galeno-campo>
                        </form>
                        <div id="conteo" class="conteo" role="group" aria-label="Filtrar por estado" hidden>
                            <button type="button" class="chip activo" data-estado="total" aria-pressed="true">
                                <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false"><path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
                                <span>Total</span><span class="n" data-conteo="total">0</span>
                            </button>
                            <button type="button" class="chip" data-estado="curso" aria-pressed="false">
                                <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 7v5l3 3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
                                <span>En curso</span><span class="n" data-conteo="curso">0</span>
                            </button>
                            <button type="button" class="chip" data-estado="finalizadas" aria-pressed="false">
                                <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false"><path d="M20 6 9 17l-5-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                                <span>Finalizadas</span><span class="n" data-conteo="finalizadas">0</span>
                            </button>
                        </div>
                    </div>
                </div>
                <galeno-estado-vista id="estado"></galeno-estado-vista>
                <div id="lista" class="rejilla-agenda" aria-live="polite"></div>
                <galeno-registro-paso id="registro"></galeno-registro-paso>
            </section>`;
        // Busca un elemento de la vista por su ID.
        const $ = id => this.contenedor.querySelector("#" + id);
        this.selClinica = $("clinica"); this.selRol = $("rol"); this.mensaje = $("mensaje");
        this.contextoForm = $("contexto"); this.resumen = $("resumen-contexto");
        this.filtros = $("filtros"); this.campoPaciente = $("paciente"); this.selModo = $("modo");
        this.campoDesde = $("desde"); this.campoHasta = $("hasta");
        this.conteo = $("conteo"); this.estado = $("estado"); this.lista = $("lista"); this.registro = $("registro");
        this.estado.mostrar("vacio",
            "Elija su clínica y rol y pulse “Cargar consultas” para ver sus consultas.", { arte: true });
        this.contextos = contextos;

        const clinicas = new Map();
        contextos.forEach(c => clinicas.set(c.idClinica, { idClinica: c.idClinica, nombre: c.clinica }));
        this.selClinica.opciones = [...clinicas.values()];
        this.selRol.formatoTexto = o => o.rol;
        this.selRol.deshabilitado = true;
        this.selModo.formatoTexto = o => o.nombre;
        this.selModo.opciones = Agenda.MODOS.map(nombre => ({ nombre }));
        this.selModo.seleccionar(this.selModo.opciones[0]);

        // Actualiza los datos que dependen de la opción seleccionada.
        this.selClinica.addEventListener("galeno-seleccion", ev => this.alElegirClinica(ev.detail.valor));
        // Intercepta el envío para validar dentro de la SPA.
        this.contextoForm.addEventListener("submit", ev => { ev.preventDefault(); this.cargar(); });
        $("cambiar-contexto").addEventListener("click", () => this.desplegarContexto());
        // Repite la operación que produjo el error.
        this.estado.addEventListener("galeno-reintentar", () => this.cargar());
        // Actualiza los datos que dependen de la opción seleccionada.
        this.selModo.addEventListener("galeno-seleccion", () => { this.mostrarFechas(); this.pintar(); });
        [this.campoPaciente, this.campoDesde, this.campoHasta].forEach(c => c.addEventListener("galeno-cambio", () => this.pintar()));
        this.conteo.querySelectorAll(".chip").forEach(b => b.addEventListener("click", () => this.elegirChip(b.dataset.estado)));
        this.lista.addEventListener("galeno-atender", ev => this.irA("consulta", ev.detail.idConsulta));
        this.lista.addEventListener("galeno-ver-registro", ev => this.verRegistro(ev.detail.idPaso));
        this.campoPaciente.title = "Atajo: pulsa / para buscar un paciente";
        this.campoPaciente.entrada?.setAttribute("aria-keyshortcuts", "/");
        // Atiende las teclas que controla esta vista.
        document.addEventListener("keydown", this.alTecla = ev => {
            if (ev.key !== "/" || ev.ctrlKey || ev.metaKey || ev.altKey) return;
            const activo = document.activeElement;
            if (activo && (activo.tagName === "INPUT" || activo.tagName === "TEXTAREA" ||
                           activo.tagName === "SELECT" || activo.isContentEditable)) return;
            if (!this.campoPaciente?.isConnected) return;
            ev.preventDefault();
            this.campoPaciente.focus();
        });
        if (clinicas.size === 1) { this.selClinica.seleccionar(this.selClinica.opciones[0]); this.alElegirClinica(this.selClinica.opciones[0]); }
    }

    // Descarta el trabajo pendiente de la vista al salir.
    destruir() { this._carga++; }

    // Escapa el texto antes de incluirlo en una plantilla HTML.
    static esc(t) { return String(t ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }

    // Limita los roles disponibles a la clínica seleccionada.
    alElegirClinica(clinica) {
        const roles = clinica ? this.contextos.filter(c => c.idClinica === clinica.idClinica) : [];
        this.selRol.opciones = roles;
        this.selRol.deshabilitado = roles.length === 0;
        if (roles.length === 1) this.selRol.seleccionar(roles[0]);
    }

    // Muestra los campos de fecha cuando se elige un rango.
    mostrarFechas() {
        const rango = this.selModo.seleccionado?.nombre === "Rango";
        this.campoDesde.hidden = !rango; this.campoHasta.hidden = !rango;
    }

    // Vuelve a mostrar los selectores de clínica y rol.
    desplegarContexto() {
        this.resumen.hidden = true;
        this.contextoForm.hidden = false;
        this.selClinica.shadowRoot.querySelector("select")?.focus();
    }

    // Carga el expediente del contexto y descarta respuestas obsoletas.
    async cargar() {
        const carga = ++this._carga;
        this.mensaje.textContent = "";
        const clinica = this.selClinica.seleccionado, ctx = this.selRol.seleccionado;
        if (!clinica) { this.selClinica.error("Elija la clínica"); return; }
        if (!ctx) { this.selRol.error("Elija el rol"); return; }
        this.selClinica.error(""); this.selRol.error("");
        this.ctx = ctx;
        Sesion.elegirContexto(ctx);
        this.estado.mostrar("cargando", "", { tarjetas: 6 });
        this.lista.replaceChildren();
        try {
            const datos = await Expediente.cargar();
            if (carga !== this._carga) return;
            this.datos = datos;
            this.filtros.hidden = false;
            this.conteo.hidden = false;
            this.pintarContexto();
            this.pintar();
        } catch (e) {
            if (carga !== this._carga) return;
            this.estado.mostrar("error", "No se pudieron cargar las consultas.");
        }
    }

    // Resume la clínica y el rol seleccionados.
    pintarContexto() {
        if (!this.ctx) return;
        this.resumen.querySelector("#resumen-contexto-texto").textContent = `${this.ctx.clinica} · ${this.ctx.rol}`;
        this.contextoForm.hidden = true;
        this.resumen.hidden = false;
    }

    // Obtiene las consultas que coinciden con el contexto y los filtros.
    filtradas() {
        const texto = DatosClinica.normalizar(this.campoPaciente.value);
        const rango = Agenda.rango(this.selModo.seleccionado?.nombre, this.campoDesde.value, this.campoHasta.value);
        return this.datos.consultas
            .filter(c => DatosClinica.esDeClinica(c.idPersonaRol, this.ctx.idClinica))
            .filter(c => !Expediente.abierta(c) || Expediente.laAtiende(this.datos, c, this.ctx.idRol))
            .filter(c => Agenda.enRango(c.fechaInicio, rango))
            .filter(c => {
                if (!texto) return true;
                const p = Expediente.paciente(this.datos, c);
                return DatosClinica.normalizar(p.nombre).includes(texto) || DatosClinica.normalizar(p.documento).includes(texto);
            })
            .sort((a, b) => DatosClinica.milisegundos(a.fechaInicio) - DatosClinica.milisegundos(b.fechaInicio));
    }

    // Aplica el filtro de estado a las consultas del listado.
    visibles() {
        const cs = this.filtradas();
        if (this.chipEstado === "curso") return cs.filter(c => Expediente.abierta(c));
        if (this.chipEstado === "finalizadas") return cs.filter(c => !Expediente.abierta(c));
        return cs;
    }

    // Aplica el filtro correspondiente al contador seleccionado.
    elegirChip(estado) {
        this.chipEstado = estado;
        this.conteo.querySelectorAll(".chip").forEach(b => {
            const activo = b.dataset.estado === estado;
            b.classList.toggle("activo", activo);
            b.setAttribute("aria-pressed", String(activo));
        });
        this.pintar();
    }

    // Actualiza los contadores con las consultas filtradas.
    pintarChips(consultas) {
        // Calcula el valor del contador que se muestra en la vista.
        const n = estado => consultas.filter(c =>
            estado === "curso" ? Expediente.abierta(c) : estado === "finalizadas" ? !Expediente.abierta(c) : true).length;
        this.conteo.querySelectorAll(".n").forEach(s => {
            const hasta = n(s.dataset.conteo);
            s.dataset.valor = String(hasta);
            this.contar(s, hasta);
        });
    }

    // Calcula el número de consultas para el estado indicado.
    contar(s, valor) {
        s.textContent = String(valor);
    }

    // Prepara los datos que necesita la tarjeta de la consulta.
    tarjeta(c) {
        const base = Expediente.tarjeta(this.datos, c);
        const procs = Expediente.procedimientosDe(this.datos, c);
        return { ...base, procedimientos: base.procedimientos.map((p, i) =>
            ({ ...p, total: procs[i]?.estado?.definidos?.length ?? p.pasos.length })) };
    }

    // Actualiza la vista con los datos y el estado actuales.
    pintar() {
        if (!this.datos) return;
        this.pagina = 0;
        this.lista.replaceChildren();
        const consultas = this.visibles();
        this.pintarChips(this.filtradas());
        const mensajes = {
            total: "No hay consultas para esos filtros. Pruebe cambiar las fechas o el nombre del paciente.",
            curso: "No hay consultas en curso para esos filtros.",
            finalizadas: "No hay consultas finalizadas para esos filtros."
        };
        if (!consultas.length) { this.estado.mostrar("vacio", mensajes[this.chipEstado], { arte: true }); return; }
        this.estado.mostrar("contenido");
        this.agregarTarjetas(consultas);
    }

    // Añade las tarjetas de esta tanda al listado.
    agregarTarjetas(consultas) {
        this.lista.querySelector("#mostrar-mas")?.remove();
        const desde = this.pagina * DashboardModel.POR_PAGINA;
        const lote = consultas.slice(desde, desde + DashboardModel.POR_PAGINA);
        for (const c of lote) {
            const t = document.createElement("galeno-tarjeta-agenda");
            t.datos = this.tarjeta(c);
            this.lista.append(t);
        }
        const restantes = consultas.length - (desde + lote.length);
        if (restantes > 0) {
            const b = document.createElement("button");
            b.id = "mostrar-mas"; b.type = "button"; b.className = "secundario";
            b.textContent = `Mostrar más (${restantes} restantes)`;
            b.addEventListener("click", () => { this.pagina++; this.agregarTarjetas(consultas); });
            this.lista.append(b);
        }
    }

    // Abre el detalle del paso seleccionado.
    verRegistro(idPaso) {
        const datos = Expediente.registro(this.datos, idPaso);
        if (!datos) return;
        this.registro.datos = datos;
        this.registro.abrir();
    }
}
