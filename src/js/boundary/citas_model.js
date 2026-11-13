// HU1 · Busqueda de citas (publica: el paciente no inicia sesion).
//   Asistente: tipo de documento -> numero (se habilita al elegir el tipo) -> clinica donde esta registrado como
//   paciente -> rango de fechas -> "Buscar citas". Cada cita sale como card (fecha, hora, clinica, procedimientos)
//   con el boton que baja el ticket en PDF, generado por el BACKEND (GET /consulta/{id}/ticket).
class CitasModel {

    // Icono de lupa del boton "Buscar citas"; se reusa al terminar la carga (textContent borraria el icono)
    static LUPA = '<svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true" focusable="false"><circle cx="9" cy="9" r="5.2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="m13.2 13.2 3.4 3.4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
    static BOTON = CitasModel.LUPA + "<span>Buscar citas</span>";

    constructor(contenedor, { descargar = id => new ConsultaService().descargarTicket(id) } = {}) {
        this.contenedor = contenedor;
        this.descargar = descargar;
        this.personasRoles = [];
        this.documentos = [];
        this.pacienteEn = [];             // PersonaRol de paciente de la persona identificada
        this.datos = null;
    }

    iniciar() {
        this.contenedor.innerHTML = `
            <section class="citas" aria-labelledby="titulo-citas">
                <header class="cabecera-pantalla">
                    <div>
                        <h2 id="titulo-citas">Buscar citas</h2>
                        <p>Con su documento de identidad, sin iniciar sesión.</p>
                    </div>
                    <svg class="banner-arte" viewBox="0 0 96 76" aria-hidden="true" focusable="false">
                        <rect class="cal" x="16" y="12" width="56" height="52" rx="8" stroke-width="2.4"/>
                        <path class="cal" d="M16 26h56" stroke-width="2.4"/>
                        <path class="cal-raya" d="M30 6v12M58 6v12" stroke-width="2.4" stroke-linecap="round"/>
                        <path class="cruz" d="M44 34v16M36 42h16" stroke-width="3" stroke-linecap="round"/>
                        <path class="cora" d="M74 56c-6-4-9-8-9-11.5a4.3 4.3 0 0 1 7.5-2.8l1.5 1.7 1.5-1.7a4.3 4.3 0 0 1 7.5 2.8c0 3.5-3 7.5-9 11.5z" stroke-width="2"/>
                    </svg>
                </header>
                <form id="formulario" class="tarjeta" novalidate>
                    <ol class="pasos">
                        <li class="paso"><span class="num" aria-hidden="true">1</span><span class="txt">Documento</span></li>
                        <li class="paso"><span class="num" aria-hidden="true">2</span><span class="txt">Clínica</span></li>
                        <li class="paso"><span class="num" aria-hidden="true">3</span><span class="txt">Fechas</span></li>
                    </ol>
                    <ol class="asistente">
                        <li class="seccion-asistente">
                            <galeno-buscador-tipo-documentos id="tipo" label="Tipo de documento"
                                                             placeholder="Elija el tipo de documento"></galeno-buscador-tipo-documentos>
                            <galeno-campo id="numero" label="Número de documento" autocomplete="off"
                                          placeholder="Elija primero el tipo de documento"
                                          ayuda="Elija primero el tipo de documento"></galeno-campo>
                        </li>
                        <li class="seccion-asistente">
                            <galeno-selector id="clinica" label="Clínica" placeholder="Primero identifíquese con su documento"></galeno-selector>
                        </li>
                        <li class="seccion-asistente">
                            <div class="fila-fechas">
                                <galeno-campo id="desde" label="Desde" type="date"></galeno-campo>
                                <galeno-campo id="hasta" label="Hasta" type="date"></galeno-campo>
                            </div>
                        </li>
                    </ol>
                    <div id="mensaje" role="alert" class="mensaje-error"></div>
                    <button id="buscar" type="submit">${CitasModel.BOTON}</button>
                </form>
                <div id="bienvenida" class="bienvenida">
                    <div class="hero">
                        <svg viewBox="0 0 24 24" width="34" height="34" aria-hidden="true" focusable="false">
                            <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.6"/>
                            <path d="M3.5 9.5h17M8 2.8v4.2M16 2.8v4.2" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
                            <path d="M12 12.5v6M9 15.5h6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
                        </svg>
                        <p>Sus citas aparecerán aquí</p>
                    </div>
                    <ul class="consejos">
                        <li>
                            <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true" focusable="false"><rect x="4" y="2.5" width="12" height="15" rx="2" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M7 7.5h6M7 10.5h6M7 13.5h3.5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
                            <span>Tenga a mano su documento de identidad.</span>
                        </li>
                        <li>
                            <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true" focusable="false"><path d="M3 17.5V6l5-3 5 3v11.5M13 17.5h4V10l-4-2.2" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M6.5 8.5h3M6.5 11.5h3M6.5 14.5h3" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
                            <span>Elija la clínica donde está registrado como paciente.</span>
                        </li>
                        <li>
                            <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true" focusable="false"><rect x="3" y="4" width="14" height="13" rx="2" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M3 8h14M7 2.5V6M13 2.5V6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="m7.5 12.5 1.8 1.8 3.4-3.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                            <span>Ajuste las fechas para ver citas pasadas o futuras.</span>
                        </li>
                    </ul>
                </div>
                <galeno-estado-vista id="estado"></galeno-estado-vista>
                <div id="resultado" class="rejilla" aria-live="polite"></div>
            </section>`;
        const $ = id => this.contenedor.querySelector("#" + id);
        this.buscaTipo = $("tipo"); this.campoNumero = $("numero"); this.selClinica = $("clinica");
        this.campoDesde = $("desde"); this.campoHasta = $("hasta");
        this.mensaje = $("mensaje"); this.estado = $("estado"); this.resultado = $("resultado");
        this.boton = $("buscar"); this.bienvenida = $("bienvenida");
        this.secciones = [...this.contenedor.querySelectorAll(".seccion-asistente")];
        this.pasos = [...this.contenedor.querySelectorAll(".paso")];
        this.aviso = document.querySelector("#aviso");
        this.campoNumero.deshabilitado = true;
        this.selClinica.deshabilitado = true;
        this.campoNumero.ayuda = "";   // la ayuda del numero solo se ve con el campo habilitado
        this.estado.mostrar("contenido");
        this.pintarSecciones();

        $("formulario").addEventListener("submit", e => { e.preventDefault(); this.buscar(); });
        this.estado.addEventListener("galeno-reintentar", () => this.buscar());
        this.buscaTipo.addEventListener("galeno-seleccion", e => {
            const tipo = e.detail.valor;
            this.campoNumero.deshabilitado = !tipo;
            this.campoNumero.entrada.placeholder = tipo?.indicaciones || (tipo ? "Escriba su número de documento" : "Elija primero el tipo de documento");
            this.campoNumero.ayuda = tipo ? (tipo.indicaciones ? "Formato: " + tipo.indicaciones : "") : "";
            this.identificar();
        });
        this.campoNumero.addEventListener("galeno-cambio", () => this.identificar());
        this.selClinica.addEventListener("galeno-seleccion", () => this.pintarSecciones());
        this.resultado.addEventListener("galeno-descargar-ticket", e => this.bajarTicket(e));
        this.datos = this.cargarDatos();
        return this.datos;
    }

    // Aspecto del asistente: cada paso y cada seccion se ven bloqueados, activos o completos segun el estado real
    pintarSecciones() {
        const tipo = this.buscaTipo.seleccionado;
        const numero = this.campoNumero.value.trim();
        const identificado = tipo && numero && Documentos.formatoValido(tipo, numero) && this.pacienteEn.length > 0;
        const estados = [
            tipo && numero ? (Documentos.formatoValido(tipo, numero) ? "completa" : "activa") : "activa",
            identificado ? "activa" : "bloqueada",
            identificado ? "activa" : "bloqueada"
        ];
        const pintar = (nodo, i) => {
            nodo.classList.toggle("bloqueada", estados[i] === "bloqueada");
            nodo.classList.toggle("activa", estados[i] === "activa");
            nodo.classList.toggle("completa", estados[i] === "completa");
        };
        this.secciones?.forEach(pintar);
        this.pasos?.forEach((p, i) => {
            pintar(p, i);
            if (estados[i] === "activa") p.setAttribute("aria-current", "step"); else p.removeAttribute("aria-current");
        });
    }

    async cargarDatos() {
        try {
            this.personasRoles = await new PersonaRolService().listar(0, 1000);
            this.documentos = await new DocumentoService().listar(0, 5000);
            this.buscaTipo.opciones = await new TipoDocumentoService().listar(0, 100);
            return true;
        } catch (e) {
            this.mensaje.textContent = "No se pudo conectar con el servidor. Intente de nuevo.";
            return false;
        }
    }

    // Cada vez que cambia el tipo o el numero: si el documento es valido y es de un paciente, se llena el selector de clinicas.
    identificar() {
        this.mensaje.textContent = "";
        this.campoNumero.error("");
        this.pacienteEn = [];
        this.selClinica.opciones = [];
        this.selClinica.deshabilitado = true;
        const tipo = this.buscaTipo.seleccionado;
        const numero = this.campoNumero.value.trim();
        if (!tipo || !numero || !Documentos.formatoValido(tipo, numero)) return;
        const personas = Documentos.personasConDocumento(this.documentos, tipo, numero);
        this.pacienteEn = this.personasRoles.filter(pr =>
            personas.includes(pr.idPersona?.idPersona) && Sesion.normalizarRol(pr.idRol?.nombre) === "paciente");
        const clinicas = new Map();
        this.pacienteEn.forEach(pr => pr.idClinica && clinicas.set(pr.idClinica.idClinica, pr.idClinica));
        this.selClinica.opciones = [...clinicas.values()];
        this.selClinica.deshabilitado = clinicas.size === 0;
        if (clinicas.size === 1) this.selClinica.seleccionar(this.selClinica.opciones[0]);
        this.pintarSecciones();
    }

    validar() {
        const tipo = this.buscaTipo.seleccionado;
        const numero = this.campoNumero.value.trim();
        if (!tipo) { this.mensaje.textContent = "Elija el tipo de documento"; return false; }
        if (!numero) { this.campoNumero.error("Escriba su número de documento"); return false; }
        if (!Documentos.formatoValido(tipo, numero)) { this.campoNumero.error(Documentos.mensajeFormato(tipo)); return false; }
        if (!this.pacienteEn.length) { this.mensaje.textContent = "No encontramos un paciente con ese documento"; return false; }
        if (!this.selClinica.seleccionado) { this.selClinica.error("Elija la clínica"); return false; }
        const d = this.campoDesde.value, h = this.campoHasta.value;
        if (d && h && d > h) { this.campoHasta.error("La fecha final no puede ser anterior a la inicial"); return false; }
        return true;
    }

    async buscar() {
        this.bienvenida.hidden = true;   // el panel de bienvenida solo se ve antes de la primera busqueda
        this.mensaje.textContent = "";
        this.campoHasta.error(""); this.selClinica.error("");
        this.resultado.replaceChildren();
        if (!(await this.datos)) this.datos = this.cargarDatos();
        if (!(await this.datos)) return;
        if (!this.pacienteEn.length) this.identificar();   // por si escribio antes de que llegaran los datos
        if (!this.validar()) return;
        const clinica = this.selClinica.seleccionado;
        const idsPaciente = this.pacienteEn.filter(pr => pr.idClinica?.idClinica === clinica.idClinica).map(pr => pr.idPersonaRol);
        const rango = Agenda.rango("Rango", this.campoDesde.value, this.campoHasta.value);
        this.estado.mostrar("cargando");
        this.boton.disabled = true; this.boton.textContent = "Buscando citas...";
        try {
            const consultas = await new ConsultaService().listar(0, 5000);
            const mias = consultas
                .filter(c => idsPaciente.includes(c.idPersonaRol?.idPersonaRol) && Agenda.enRango(c.fechaInicio, rango))
                .sort((a, b) => DatosClinica.milisegundos(a.fechaInicio) - DatosClinica.milisegundos(b.fechaInicio));
            if (!mias.length) { this.estado.mostrar("vacio", "No encontramos citas en esa clínica para esas fechas. Pruebe ajustando el rango.", { arte: true }); return; }
            const cp = await new ConsultaProcedimientoService().listar(0, 5000);
            const procs = await new ProcedimientoService().listar(0, 1000);
            const nombres = new Map(procs.map(p => [p.idProcedimiento, p.nombre]));
            this.estado.mostrar("contenido");
            for (const c of mias) {
                const tarjeta = document.createElement("galeno-tarjeta-cita");
                tarjeta.cita = {
                    idConsulta: c.idConsulta, fechaInicio: c.fechaInicio, clinica: clinica.nombre,
                    procedimientos: cp.filter(x => x.idConsulta?.idConsulta === c.idConsulta)
                        .map(x => nombres.get(x.idProcedimiento) ?? "Procedimiento")
                };
                this.resultado.append(tarjeta);
            }
        } catch (e) {
            this.estado.mostrar("error", "No se pudieron cargar las citas.");
        } finally {
            this.boton.disabled = false; this.boton.innerHTML = CitasModel.BOTON;
            this.pintarSecciones();
        }
    }

    async bajarTicket(e) {
        const tarjeta = e.target.closest("galeno-tarjeta-cita");
        tarjeta.ocupada = true;
        try {
            await this.descargar(e.detail.idConsulta);
            this.aviso?.mostrar("Ticket descargado", "exito");
        } catch (err) {
            this.aviso?.mostrar(err.message || "No se pudo generar el ticket", "error");
        } finally {
            tarjeta.ocupada = false;
        }
    }
}
