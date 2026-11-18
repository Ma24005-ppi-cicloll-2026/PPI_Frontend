class GalenoBuscadorTipoDocumentos extends GalenoAutocomplete {
    // Actualiza las opciones disponibles.
    set opciones(lista) {
        super.opciones = (Array.isArray(lista) ? lista : []).filter(t => t?.activo !== false);
    }
    // Devuelve las opciones disponibles.
    get opciones() { return this._opciones; }

    // Obtiene la etiqueta que se muestra para la opción.
    texto(tipo) {
        return String(tipo?.nombre ?? "");
    }
}

customElements.define("galeno-buscador-tipo-documentos", GalenoBuscadorTipoDocumentos);
