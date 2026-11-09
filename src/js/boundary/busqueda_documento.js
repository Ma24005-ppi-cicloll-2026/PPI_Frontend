// Buscar a una persona por su documento (tipo + numero). Lo usan el login del paciente y la
// pantalla de Consultas del personal. Busca solo, poco despues de dejar de escribir (sin boton).
//
//   new BusquedaPorDocumento({
//       buscaTipo, numero, ayuda,                  // los 3 elementos de la pantalla
//       resolverPersona: doc => persona,           // de que persona es el documento (opcional)
//       filtro: persona => true/false,             // si esa persona sirve para esta pantalla (opcional)
//       alEncontrar: async persona => {...},       // se encontro
//       alVaciar: () => {...},                     // no hay resultado (borro el numero, formato malo, no existe)
//       alFallar: error => {...}                   // fallo el backend
//   }).conectar();
class BusquedaPorDocumento {

    constructor(opciones) {
        this.buscaTipo = opciones.buscaTipo;
        this.numero = opciones.numero;
        this.ayuda = opciones.ayuda;
        this.resolverPersona = opciones.resolverPersona || (doc => doc.idPersona);
        this.filtro = opciones.filtro || (() => true);
        this.alEncontrar = opciones.alEncontrar;
        this.alVaciar = opciones.alVaciar || (() => {});
        this.alFallar = opciones.alFallar || (() => {});
        this.textoNoEncontrado = opciones.textoNoEncontrado || "No se encontró un paciente con ese documento";
        this.esperaBusqueda = 400;        // milisegundos despues de dejar de escribir
        this.temporizador = null;
        this.turno = 0;                   // para ignorar respuestas viejas si el usuario sigue escribiendo
    }

    conectar() {
        this.buscaTipo.addEventListener("galeno-seleccion", e => {
            // el ejemplo sale de las "indicaciones" que el tipo tiene guardadas en el backend
            this.numero.placeholder = e.detail.valor?.indicaciones || "Escriba el número del documento";
            this.programar();
        });
        this.numero.addEventListener("input", () => this.programar());
    }

    // "01234567-8" y "012345678" son el mismo documento: se comparan sin guiones ni espacios
    normalizar(valor) { return String(valor ?? "").replace(/[\s-]/g, "").toLowerCase(); }

    // true si el texto cumple la expresion regular del tipo (si no tiene, o es invalida, no se exige)
    formatoValido(tipo, texto) {
        if (!tipo?.expresionRegular) return true;
        try { return new RegExp(tipo.expresionRegular).test(texto); }
        catch (e) { return true; }
    }

    mensaje(texto) { this.ayuda.textContent = texto; }

    programar() {
        clearTimeout(this.temporizador);
        this.temporizador = setTimeout(() => this.buscar(), this.esperaBusqueda);
    }

    async buscar() {
        const tipo = this.buscaTipo.seleccionado;
        const texto = this.numero.value.trim();
        const numero = this.normalizar(texto);
        const turno = ++this.turno;
        this.mensaje("");
        if (!numero) { this.alVaciar(); return; }
        if (!tipo) { this.mensaje("Elija primero el tipo de documento"); return; }
        if (!this.formatoValido(tipo, texto)) {
            this.mensaje(`El número no tiene el formato de ${tipo.nombre}` + (tipo.indicaciones ? `: ${tipo.indicaciones}` : ""));
            this.alVaciar();
            return;
        }
        try {
            const documentos = await new DocumentoService().listar(0, 500);
            if (turno !== this.turno) return;              // el usuario siguio escribiendo
            const documento = documentos.find(d =>
                d.idTipoDocumento?.idTipoDocumento === tipo.idTipoDocumento &&
                this.normalizar(d.valor) === numero);
            const persona = documento ? this.resolverPersona(documento) : null;
            if (!persona || !this.filtro(persona)) {
                this.mensaje(this.textoNoEncontrado);
                this.alVaciar();
                return;
            }
            await this.alEncontrar(persona);
        } catch (e) { this.alFallar(e); }
    }
}
