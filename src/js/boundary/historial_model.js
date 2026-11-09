// Pantalla "Mi historial" (paciente): solo SUS consultas, de la mas reciente a la mas antigua,
// y el detalle de cada una con documentos, procedimientos, pasos, ordenes y resultados.
class HistorialModel {

    constructor(contenedor) {
        this.contenedor = contenedor;
        this.consultas = [];
    }

    async iniciar() {
        this.aviso = document.querySelector("#aviso");
        this.sesion = Sesion.obtener();
        if (!this.sesion || !Sesion.esPaciente()) {
            this.contenedor.innerHTML = `<h2>Mi historial</h2><p>Inicie sesión como paciente para ver su historial.</p>`;
            return;
        }
        this.contenedor.innerHTML = `
            <h2>Mi historial médico</h2>
            <p id="resumen"></p>
            <div id="lista"></div>
            <section id="detalle" hidden></section>`;
        const $ = id => this.contenedor.querySelector("#" + id);
        this.lista = $("lista"); this.seccionDetalle = $("detalle");
        this.detalle = new DetalleConsulta(this.seccionDetalle, () => this.volverALista());
        this.detalle.iniciar();
        this.lista.addEventListener("galeno-abrir-consulta", e => this.abrirDetalle(e.detail.idConsulta));

        try {
            const todas = await new ConsultaService().listar(0, 500);
            const fecha = c => GestorFechas.leer(c.fechaInicio)?.getTime() ?? 0;
            // el paciente ve SOLO sus consultas (de cualquier clinica)
            this.consultas = todas
                .filter(c => c.idPersonaRol?.idPersona?.idPersona === this.sesion.idPersona)
                .sort((a, b) => fecha(b) - fecha(a));
            $("resumen").textContent = this.consultas.length === 0
                ? "Aún no tiene consultas registradas."
                : `Tiene ${this.consultas.length} consulta${this.consultas.length === 1 ? "" : "s"} registrada${this.consultas.length === 1 ? "" : "s"}.`;
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
            await this.detalle.abrir(consulta, { idPersona: this.sesion.idPersona });
            this.lista.hidden = true;
        } catch (e) { this.aviso.mostrar(e.message, "error"); }
    }
}
