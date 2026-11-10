// Pantalla "Registrar paciente" (recepcion). Es la ADMISION: antes de la consulta, recepcion registra a la
// persona que llega a la clinica (nombre, fecha de nacimiento y documento) para que quede como paciente.
// NO crea consultas: la consulta la pide el paciente en "Solicitar consulta" y la finaliza recepcion en "Cierre".
//   1. Escribe nombres y apellidos (y, si la sabe, la fecha de nacimiento).
//   2. Elige el tipo de documento (DUI, Pasaporte...) y escribe el numero con el formato de ese tipo
//      (la expresion regular sale del backend, tabla tipo_documento).
//   3. "Registrar paciente": se crea Persona + Documento + PersonaRol (rol paciente) en la clinica de la sesion.
// Si el documento ya existe no se duplica a la persona: solo se le agrega el rol de paciente en esta clinica.
class AdmisionModel {

    constructor(contenedor) {
        this.contenedor = contenedor;
    }

    async iniciar() {
        this.aviso = document.querySelector("#aviso");
        this.sesion = Sesion.obtener();
        if (!this.sesion || !Sesion.puede("admision")) {
            this.contenedor.innerHTML = `<h2>Registrar paciente</h2><p>Inicie sesión como recepcionista para registrar pacientes.</p>`;
            return;
        }
        this.contenedor.innerHTML = `
            <section aria-labelledby="titulo-admision">
                <h2 id="titulo-admision">Registrar paciente</h2>
                <p>Registre a la persona que llega a la clínica. La consulta la solicita el paciente.</p>
                <form id="formulario" novalidate>
                    <div class="rejilla">
                        <galeno-campo id="nombres" label="Nombres *" autocomplete="off"></galeno-campo>
                        <galeno-campo id="apellidos" label="Apellidos *" autocomplete="off"></galeno-campo>
                    </div>
                    <galeno-campo id="nacimiento" label="Fecha de nacimiento" type="date"></galeno-campo>
                    <div class="rejilla">
                        <galeno-buscador-tipo-documentos id="tipo" label="Tipo de documento *"></galeno-buscador-tipo-documentos>
                        <galeno-campo id="numero" label="Número de documento *" placeholder="Elija primero el tipo de documento"></galeno-campo>
                    </div>
                    <div id="mensaje" role="alert" class="mensaje-error"></div>
                    <button id="registrar" type="submit">Registrar paciente</button>
                </form>
                <section id="confirmacion" hidden role="status"></section>
            </section>`;
        const $ = id => this.contenedor.querySelector("#" + id);
        this.nombres = $("nombres"); this.apellidos = $("apellidos"); this.nacimiento = $("nacimiento");
        this.buscaTipo = $("tipo"); this.numero = $("numero");
        this.mensaje = $("mensaje"); this.boton = $("registrar"); this.confirmacion = $("confirmacion");

        $("formulario").addEventListener("submit", e => { e.preventDefault(); this.registrar(); });
        [this.nombres, this.apellidos, this.nacimiento, this.numero].forEach(c =>
            c.addEventListener("galeno-cambio", () => this.limpiarErrores()));
        this.buscaTipo.addEventListener("galeno-seleccion", e => {
            this.limpiarErrores();
            this.numero.entrada?.setAttribute("placeholder", e.detail.valor?.indicaciones || "Escriba el número del documento");
        });
        try { this.buscaTipo.opciones = await new TipoDocumentoService().listar(0, 100); }
        catch (e) { this.aviso.mostrar(e.message, "error"); }
    }

    limpiarErrores() {
        this.mensaje.textContent = "";
        [this.nombres, this.apellidos, this.nacimiento, this.numero].forEach(c => c.error(""));
    }

    limpio(texto) { return String(texto ?? "").replace(/[\s-]/g, "").toLowerCase(); }

    formatoValido(tipo, texto) {
        if (!tipo?.expresionRegular) return true;
        try { return new RegExp(tipo.expresionRegular).test(texto); }
        catch (e) { return true; }
    }

    // Devuelve true si todo esta bien; si no, marca el primer campo con problema.
    validar() {
        const tipo = this.buscaTipo.seleccionado;
        const numero = this.numero.value.trim();
        const problema = (campo, texto) => { campo.error(texto); campo.focus(); return false; };
        if (!this.nombres.value.trim()) return problema(this.nombres, "Escriba los nombres");
        if (!this.apellidos.value.trim()) return problema(this.apellidos, "Escriba los apellidos");
        const nace = this.nacimiento.value;
        if (nace && new Date(nace) > new Date()) return problema(this.nacimiento, "La fecha de nacimiento no puede ser futura");
        if (!tipo) { this.mensaje.textContent = "Elija el tipo de documento"; return false; }
        if (!numero) return problema(this.numero, "Escriba el número de documento");
        if (!this.formatoValido(tipo, numero))
            return problema(this.numero, `No tiene el formato de ${tipo.nombre}` + (tipo.indicaciones ? `: ${tipo.indicaciones}` : ""));
        return true;
    }

    async registrar() {
        this.limpiarErrores();
        this.confirmacion.hidden = true;
        if (!this.validar()) return;
        this.boton.disabled = true; this.boton.textContent = "Registrando...";
        try {
            const resultado = await this.guardar();
            this.mostrarConfirmacion(resultado);
        } catch (e) {
            this.aviso.mostrar(e.message, "error");
        } finally {
            this.boton.disabled = false; this.boton.textContent = "Registrar paciente";
        }
    }

    // Crea lo que falte. Devuelve { nombre, yaExistia } para la confirmacion.
    async guardar() {
        const tipo = this.buscaTipo.seleccionado;
        const numero = this.numero.value.trim();
        const rol = (await new RolService().listar(0, 200)).find(r => Sesion.normalizarRol(r.nombre) === "paciente");
        if (!rol) throw new Error("La clínica aún no tiene configurado el rol de paciente");
        const miRol = await new PersonaRolService().buscar(this.sesion.idPersonaRol);
        const clinica = miRol?.idClinica;
        if (!clinica) throw new Error("No se pudo saber la clínica de esta sesión");

        const documentos = await new DocumentoService().listar(0, 5000);
        const existente = documentos.find(d => d.idTipoDocumento?.idTipoDocumento === tipo.idTipoDocumento &&
            this.limpio(d.valor) === this.limpio(numero));
        const ahora = new Date().toISOString();

        let persona = existente?.idPersona ?? null;
        if (persona) {
            const roles = await new PersonaRolService().listar(0, 1000);
            const yaEsPaciente = roles.some(pr => pr.idPersona?.idPersona === persona.idPersona &&
                Sesion.normalizarRol(pr.idRol?.nombre) === "paciente" &&
                (pr.idClinica?.idClinica ?? clinica.idClinica) === clinica.idClinica);
            if (yaEsPaciente) throw new Error(`Ya hay un paciente de esta clínica con ese ${tipo.nombre}`);
        } else {
            persona = await new PersonaService().crear({
                nombres: this.nombres.value.trim(), apellidos: this.apellidos.value.trim(),
                fechaNacimiento: this.nacimiento.value ? new Date(this.nacimiento.value).toISOString() : null,
                fechaCreacion: ahora });
            await new DocumentoService().crear({ valor: numero, idPersona: persona, idTipoDocumento: tipo });
        }
        await new PersonaRolService().crear({ idPersona: persona, idRol: rol, idClinica: clinica, fechaCreacion: ahora });
        return { nombre: `${this.nombres.value.trim()} ${this.apellidos.value.trim()}`, clinica: clinica.nombre, yaExistia: Boolean(existente) };
    }

    mostrarConfirmacion({ nombre, clinica, yaExistia }) {
        this.confirmacion.hidden = false;
        this.confirmacion.replaceChildren();
        const h = document.createElement("h3"); h.textContent = "¡Paciente registrado!";
        const p = document.createElement("p");
        p.textContent = yaExistia
            ? `${nombre} ya estaba en el sistema; ahora también es paciente de ${clinica}.`
            : `${nombre} quedó registrado como paciente de ${clinica}. Ya puede solicitar su consulta.`;
        this.confirmacion.append(h, p);
        this.aviso.mostrar("Paciente registrado", "exito");
        [this.nombres, this.apellidos, this.nacimiento, this.numero].forEach(c => { c.value = ""; });
    }
}
