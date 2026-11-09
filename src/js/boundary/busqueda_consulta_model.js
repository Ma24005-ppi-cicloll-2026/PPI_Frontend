// Pantalla "Consultas" (personal de la clinica).
// Buscar paciente (por nombre o por documento) -> sus consultas -> detalle con pestañas.
// Solo ve pacientes y consultas de la clinica de su sesion.
class BusquedaConsultaModel {

    constructor(contenedor) {
        this.contenedor = contenedor;
        this.paciente = null;
        this.consultas = [];
        this.personas = [];                  // pacientes de la clinica (para el buscador por nombre)
        this.rolDePaciente = new Map();      // idPersona -> su PersonaRol de paciente en esta clinica
    }

    async iniciar() {
        this.aviso = document.querySelector("#aviso");
        this.sesion = Sesion.obtener();
        if (!this.sesion || !Sesion.puede("consulta")) {
            this.contenedor.innerHTML = `<h2>Consultas</h2><p>Inicie sesión como personal de la clínica para ver las consultas.</p>`;
            return;
        }
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
            <section id="detalle" hidden></section>`;
        const $ = id => this.contenedor.querySelector("#" + id);
        this.busca = $("buscaPaciente"); this.buscaTipo = $("buscaTipo");
        this.lista = $("lista");
        this.detalle = new DetalleConsulta($("detalle"), () => this.volverALista());
        this.detalle.iniciar();
        this.seccionDetalle = $("detalle");

        this.busca.addEventListener("galeno-seleccion", e => this.alElegirPaciente(e.detail.valor));
        this.lista.addEventListener("galeno-abrir-consulta", e => this.abrirDetalle(e.detail.idConsulta));

        this.busquedaDocumento = new BusquedaPorDocumento({
            buscaTipo: this.buscaTipo, numero: $("numeroDocumento"), ayuda: $("ayudaDocumento"),
            resolverPersona: d => this.personas.find(p => p.idPersona === d.idPersona?.idPersona),
            filtro: p => this.rolDePaciente.has(p.idPersona),
            textoNoEncontrado: "No se encontró un paciente de esta clínica con ese documento",
            alEncontrar: async persona => { this.busca.seleccionar(persona); await this.alElegirPaciente(persona); },
            alVaciar: () => this.limpiarResultados(),
            alFallar: e => this.aviso.mostrar(e.message, "error")
        });
        this.busquedaDocumento.conectar();

        try {
            await this.cargarPacientes();
            this.buscaTipo.opciones = await new TipoDocumentoService().listar(0, 100);
        } catch (e) { this.aviso.mostrar(e.message, "error"); }
    }

    // Pacientes = gente con rol "paciente" en la clinica de la sesion (como getPacientes del backend)
    async cargarPacientes() {
        const personasRoles = await new PersonaRolService().listar(0, 1000);
        personasRoles
            .filter(pr => Sesion.normalizarRol(pr.idRol?.nombre) === "paciente" && this.esDeMiClinica(pr))
            .forEach(pr => this.rolDePaciente.set(pr.idPersona?.idPersona, pr));
        this.personas = [...this.rolDePaciente.values()].map(pr => pr.idPersona);
        this.busca.opciones = this.personas;
    }

    // si el dato de la clinica no vino en el JSON, no se descarta (no hay con que comparar)
    esDeMiClinica(personaRol) {
        const clinica = personaRol?.idClinica?.idClinica;
        return !clinica || clinica === this.sesion.idClinica;
    }

    limpiarResultados() {
        this.paciente = null;
        this.consultas = [];
        this.lista.replaceChildren();
        this.seccionDetalle.hidden = true;
        this.lista.hidden = false;
    }

    // ---------- consultas del paciente ----------

    async alElegirPaciente(persona) {
        this.paciente = persona;
        this.seccionDetalle.hidden = true;
        this.lista.hidden = false;
        await this.cargarConsultas();
    }

    async cargarConsultas() {
        this.lista.replaceChildren();
        try {
            // El backend no tiene "consultas de una persona": se filtra aqui (y por clinica)
            const todas = await new ConsultaService().listar(0, 500);
            const fecha = c => GestorFechas.leer(c.fechaInicio)?.getTime() ?? 0;
            this.consultas = todas
                .filter(c => c.idPersonaRol?.idPersona?.idPersona === this.paciente.idPersona && this.esDeMiClinica(c.idPersonaRol))
                .sort((a, b) => fecha(b) - fecha(a));          // la mas reciente primero
            if (this.consultas.length === 0) this.aviso.mostrar("El paciente no tiene consultas", "info");
            this.consultas.forEach(c => {
                const tarjeta = document.createElement("galeno-tarjeta-consulta");
                tarjeta.consulta = c;
                this.lista.append(tarjeta);
            });
        } catch (e) { this.aviso.mostrar(e.message, "error"); }
    }

    volverALista() {
        this.seccionDetalle.hidden = true;
        this.lista.hidden = false;
    }

    async abrirDetalle(idConsulta) {
        const consulta = this.consultas.find(c => c.idConsulta === idConsulta);
        try {
            await this.detalle.abrir(consulta, this.paciente);
            this.lista.hidden = true;         // la lista se esconde: el detalle no repite la tarjeta
        } catch (e) { this.aviso.mostrar(e.message, "error"); }
    }
}
