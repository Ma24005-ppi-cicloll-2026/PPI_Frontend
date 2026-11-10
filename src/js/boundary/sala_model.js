// Pantalla "Sala de espera" (recepcion). Solo lectura: quien esta esperando en SU clinica, en orden de llegada,
// para saber a quien llamar y cuanta gente hay. No crea ni cambia nada.
//   - "Esperando":   consultas de la clinica que todavia no se finalizan (sin fechaFin).
//   - "Atendidos hoy": las que se finalizaron hoy.
class SalaModel {

    constructor(contenedor) {
        this.contenedor = contenedor;
        this.esperando = [];
        this.atendidosHoy = [];
    }

    async iniciar() {
        this.aviso = document.querySelector("#aviso");
        this.sesion = Sesion.obtener();
        if (!this.sesion || !Sesion.puede("sala")) {
            this.contenedor.innerHTML = `<h2>Sala de espera</h2><p>Inicie sesión como personal de la clínica para ver la sala de espera.</p>`;
            return;
        }
        this.contenedor.innerHTML = `
            <h2>Sala de espera</h2>
            <p id="resumen" class="paciente-elegido" role="status"></p>
            <section aria-live="polite">
                <h3 class="subtitulo">Esperando</h3>
                <galeno-estado-vista id="estado"></galeno-estado-vista>
                <div id="espera" class="lista-tarjetas"></div>
            </section>
            <section>
                <h3 class="subtitulo">Atendidos hoy</h3>
                <p id="sinAtendidos" hidden>Aún no se ha finalizado ninguna consulta hoy.</p>
                <div id="atendidos" class="lista-tarjetas"></div>
            </section>
            <button id="actualizar" type="button">Actualizar</button>`;
        const $ = id => this.contenedor.querySelector("#" + id);
        this.estado = $("estado"); this.zonaEspera = $("espera"); this.zonaAtendidos = $("atendidos");
        this.resumen = $("resumen"); this.sinAtendidos = $("sinAtendidos");
        $("actualizar").addEventListener("click", () => this.cargar());
        this.estado.addEventListener("galeno-reintentar", () => this.cargar());
        await this.cargar();
    }

    esHoy(fecha) {
        const f = GestorFechas.leer(fecha);
        return Boolean(f) && f.toDateString() === new Date().toDateString();
    }

    async cargar() {
        this.estado.mostrar("cargando");
        this.zonaEspera.replaceChildren(); this.zonaAtendidos.replaceChildren();
        try {
            const todas = (await new ConsultaService().listar(0, 500))
                .filter(c => DatosClinica.esDeClinica(c.idPersonaRol, this.sesion.idClinica));
            // en orden de llegada: la que llego primero se atiende primero
            this.esperando = [...todas.filter(c => !c.fechaFin)]
                .sort((a, b) => DatosClinica.milisegundos(a.fechaInicio) - DatosClinica.milisegundos(b.fechaInicio));
            this.atendidosHoy = DatosClinica.masRecientePrimero(todas.filter(c => c.fechaFin && this.esHoy(c.fechaFin)), "fechaFin");
            this.estado.mostrar(this.esperando.length ? "contenido" : "vacio");
            this.resumen.textContent = `${this.esperando.length} persona${this.esperando.length === 1 ? "" : "s"} esperando · ${this.atendidosHoy.length} atendida${this.atendidosHoy.length === 1 ? "" : "s"} hoy`;
            this.pintar(this.zonaEspera, this.esperando, true);
            this.pintar(this.zonaAtendidos, this.atendidosHoy, false);
            this.sinAtendidos.hidden = this.atendidosHoy.length > 0;
        } catch (e) { this.estado.mostrar("error", e.message); }
    }

    pintar(zona, consultas, conTurno) {
        consultas.forEach((c, i) => {
            const t = document.createElement("galeno-tarjeta-consulta");
            t.setAttribute("con-paciente", ""); t.setAttribute("sin-boton", "");
            t.consulta = c;
            if (conTurno) t.setAttribute("turno", String(i + 1));
            zona.append(t);
        });
    }
}
