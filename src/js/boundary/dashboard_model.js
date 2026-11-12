// HU3 · Dashboard del empleado.
//   1) Elige la clinica y el rol con los que trabaja (solo entre SUS roles-clinicas) y pulsa "Cargar consultas".
//   2) Ve las consultas de esa clinica (las abiertas que le toca atender y las finalizadas), con filtros: paciente (nombre o documento)
//      y Hoy / Pasado / Futuro / Rango.
//   3) Cada consulta es una card con el paciente, la fecha de inicio y los pasos hechos (quien y cuando);
//      "Ver registro" abre el detalle del paso y "Atender consulta" lleva a la HU4.
class DashboardModel {

    constructor(contenedor, { irA = () => {} } = {}) {
        this.contenedor = contenedor;
        this.irA = irA;
        this.datos = null;
    }

    iniciar() {
        this.sesion = Sesion.obtener();
        const contextos = this.sesion?.contextos ?? [];
        this.contenedor.innerHTML = `
            <section class="dashboard" aria-labelledby="titulo-dash">
                <h2 id="titulo-dash">Dashboard</h2>
                <p>${this.sesion ? "Bienvenido, " + DashboardModel.esc(this.sesion.nombre) : "Inicie sesión para ver sus consultas."}</p>
                <form id="contexto" novalidate>
                    <galeno-selector id="clinica" label="Clínica" placeholder="Elija la clínica"></galeno-selector>
                    <galeno-selector id="rol" label="Rol" placeholder="Elija el rol"></galeno-selector>
                    <div id="mensaje" role="alert" class="mensaje-error"></div>
                    <button id="cargar" type="submit">Cargar consultas</button>
                </form>
                <form id="filtros" hidden novalidate>
                    <galeno-campo id="paciente" label="Buscar paciente" placeholder="Nombre o documento"></galeno-campo>
                    <galeno-selector id="modo" label="Fechas"></galeno-selector>
                    <galeno-campo id="desde" label="Desde" type="date" hidden></galeno-campo>
                    <galeno-campo id="hasta" label="Hasta" type="date" hidden></galeno-campo>
                </form>
                <galeno-estado-vista id="estado"></galeno-estado-vista>
                <div id="lista" class="rejilla" aria-live="polite"></div>
                <galeno-registro-paso id="registro"></galeno-registro-paso>
            </section>`;
        const $ = id => this.contenedor.querySelector("#" + id);
        this.selClinica = $("clinica"); this.selRol = $("rol"); this.mensaje = $("mensaje");
        this.filtros = $("filtros"); this.campoPaciente = $("paciente"); this.selModo = $("modo");
        this.campoDesde = $("desde"); this.campoHasta = $("hasta");
        this.estado = $("estado"); this.lista = $("lista"); this.registro = $("registro");
        this.estado.mostrar("contenido");
        this.contextos = contextos;

        const clinicas = new Map();
        contextos.forEach(c => clinicas.set(c.idClinica, { idClinica: c.idClinica, nombre: c.clinica }));
        this.selClinica.opciones = [...clinicas.values()];
        this.selRol.formatoTexto = o => o.rol;
        this.selRol.deshabilitado = true;
        this.selModo.formatoTexto = o => o.nombre;
        this.selModo.opciones = Agenda.MODOS.map(nombre => ({ nombre }));
        this.selModo.seleccionar(this.selModo.opciones[0]);

        this.selClinica.addEventListener("galeno-seleccion", e => this.alElegirClinica(e.detail.valor));
        $("contexto").addEventListener("submit", ev => { ev.preventDefault(); this.cargar(); });
        this.estado.addEventListener("galeno-reintentar", () => this.cargar());
        this.selModo.addEventListener("galeno-seleccion", () => { this.mostrarFechas(); this.pintar(); });
        [this.campoPaciente, this.campoDesde, this.campoHasta].forEach(c => c.addEventListener("galeno-cambio", () => this.pintar()));
        this.lista.addEventListener("galeno-atender", e => this.irA("consulta", e.detail.idConsulta));
        this.lista.addEventListener("galeno-ver-registro", e => this.verRegistro(e.detail.idPaso));
        if (clinicas.size === 1) { this.selClinica.seleccionar(this.selClinica.opciones[0]); this.alElegirClinica(this.selClinica.opciones[0]); }
    }

    static esc(t) { return String(t ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }

    alElegirClinica(clinica) {
        const roles = clinica ? this.contextos.filter(c => c.idClinica === clinica.idClinica) : [];
        this.selRol.opciones = roles;
        this.selRol.deshabilitado = roles.length === 0;
        if (roles.length === 1) this.selRol.seleccionar(roles[0]);
    }

    mostrarFechas() {
        const rango = this.selModo.seleccionado?.nombre === "Rango";
        this.campoDesde.hidden = !rango; this.campoHasta.hidden = !rango;
    }

    async cargar() {
        this.mensaje.textContent = "";
        const clinica = this.selClinica.seleccionado, ctx = this.selRol.seleccionado;
        if (!clinica) { this.selClinica.error("Elija la clínica"); return; }
        if (!ctx) { this.selRol.error("Elija el rol"); return; }
        this.selClinica.error(""); this.selRol.error("");
        this.ctx = ctx;
        Sesion.elegirContexto(ctx);
        this.estado.mostrar("cargando");
        this.lista.replaceChildren();
        try {
            this.datos = await Expediente.cargar();
            this.filtros.hidden = false;
            this.pintar();
        } catch (e) {
            this.estado.mostrar("error", "No se pudieron cargar las consultas.");
        }
    }

    // Consultas abiertas de la clinica elegida, para el rol elegido, con los filtros puestos
    visibles() {
        const texto = DatosClinica.normalizar(this.campoPaciente.value);
        const rango = Agenda.rango(this.selModo.seleccionado?.nombre, this.campoDesde.value, this.campoHasta.value);
        return this.datos.consultas
            .filter(c => DatosClinica.esDeClinica(c.idPersonaRol, this.ctx.idClinica))
            // las abiertas solo si le tocan a este rol; las finalizadas se ven siempre (solo lectura)
            .filter(c => !Expediente.abierta(c) || Expediente.laAtiende(this.datos, c, this.ctx.idRol))
            .filter(c => Agenda.enRango(c.fechaInicio, rango))
            .filter(c => {
                if (!texto) return true;
                const p = Expediente.paciente(this.datos, c);
                return DatosClinica.normalizar(p.nombre).includes(texto) || DatosClinica.normalizar(p.documento).includes(texto);
            })
            .sort((a, b) => DatosClinica.milisegundos(a.fechaInicio) - DatosClinica.milisegundos(b.fechaInicio));
    }

    pintar() {
        if (!this.datos) return;
        this.lista.replaceChildren();
        const consultas = this.visibles();
        if (!consultas.length) { this.estado.mostrar("vacio", "No hay consultas para esos filtros."); return; }
        this.estado.mostrar("contenido");
        for (const c of consultas) {
            const t = document.createElement("galeno-tarjeta-agenda");
            t.datos = Expediente.tarjeta(this.datos, c);
            this.lista.append(t);
        }
    }

    verRegistro(idPaso) {
        const datos = Expediente.registro(this.datos, idPaso);
        if (!datos) return;
        this.registro.datos = datos;
        this.registro.abrir();
    }
}
