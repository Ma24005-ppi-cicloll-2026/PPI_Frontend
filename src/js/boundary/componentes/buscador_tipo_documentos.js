// <galeno-buscador-tipo-documentos>: elige un TipoDocumento (DUI, NIT, Pasaporte...).
// Muestra solo los activos aunque el Model le pase todos.
class GalenoBuscadorTipoDocumentos extends GalenoAutocomplete {
    set opciones(lista) {
        super.opciones = (Array.isArray(lista) ? lista : []).filter(t => t?.activo !== false);
    }
    get opciones() { return this._opciones; }

    texto(tipo) {
        return String(tipo?.nombre ?? "");
    }
}

customElements.define("galeno-buscador-tipo-documentos", GalenoBuscadorTipoDocumentos);
