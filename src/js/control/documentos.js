// Lo que el Login (HU2) y la Busqueda de citas (HU1) hacen con los documentos de identidad.
class Documentos {

    // "01234567-8", "012345678" y " 01234567 8 " son el mismo documento
    static limpio(texto) { return String(texto ?? "").replace(/[\s-]/g, "").toLowerCase(); }

    // true si el texto cumple la expresion regular del tipo (si el tipo no tiene una, o es invalida, no se exige)
    static formatoValido(tipo, texto) {
        if (!tipo?.expresionRegular) return true;
        try { return new RegExp(tipo.expresionRegular).test(texto); }
        catch (e) { return true; }
    }

    // "No tiene el formato de DUI: 00000000-0"
    static mensajeFormato(tipo) {
        return `No tiene el formato de ${tipo.nombre}` + (tipo.indicaciones ? `: ${tipo.indicaciones}` : "");
    }

    // Los ids de las personas que tienen un documento de ese tipo y con ese numero
    static personasConDocumento(documentos, tipo, numero) {
        const buscado = Documentos.limpio(numero);
        return [...new Set(documentos
            .filter(d => d.idTipoDocumento?.idTipoDocumento === tipo.idTipoDocumento && Documentos.limpio(d.valor) === buscado)
            .map(d => d.idPersona?.idPersona)
            .filter(Boolean))];
    }

    // El primer documento de una persona, para mostrar su "ID" ("12345678-9")
    static primero(documentos, idPersona) {
        return documentos.find(d => d.idPersona?.idPersona === idPersona)?.valor ?? "";
    }
}
