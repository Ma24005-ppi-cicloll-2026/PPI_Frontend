class Documentos {

    // Normaliza el documento para compararlo sin espacios ni guiones.
    limpio(texto) { return String(texto ?? "").replace(/[\s-]/g, "").toLowerCase(); }

    // Comprueba el formato cuando el tipo aporta una expresión válida.
    formatoValido(tipo, texto) {
        if (!tipo?.expresionRegular) return true;
        try { return new RegExp(tipo.expresionRegular).test(texto); }
        catch (e) { return true; }
    }

    // Indica el formato esperado para el tipo de documento.
    mensajeFormato(tipo) {
        return `No tiene el formato de ${tipo.nombre}` + (tipo.indicaciones ? `: ${tipo.indicaciones}` : "");
    }

    // Devuelve los IDs únicos que coinciden con el documento.
    personasConDocumento(documentos, tipo, numero) {
        const buscado = this.limpio(numero);
        return [...new Set(documentos
            .filter(d => d.idTipoDocumento?.idTipoDocumento === tipo.idTipoDocumento && this.limpio(d.valor) === buscado)
            .map(d => d.idPersona?.idPersona)
            .filter(Boolean))];
    }

    // Devuelve el primer documento registrado para la persona.
    primero(documentos, idPersona) {
        return documentos.find(d => d.idPersona?.idPersona === idPersona)?.valor ?? "";
    }
}
