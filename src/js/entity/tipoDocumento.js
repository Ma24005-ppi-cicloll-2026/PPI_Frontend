class TipoDocumento {
    // Inicializa los campos del registro con sus valores por defecto.
    constructor() {
        this.idTipoDocumento = null;
        this.nombre = "";
        this.indicaciones = "";
        this.expresionRegular = "";
        this.activo = true;
    }
}

export default TipoDocumento;
