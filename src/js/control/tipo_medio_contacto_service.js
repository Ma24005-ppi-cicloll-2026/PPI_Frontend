class TipoMedioContactoService extends DefaultService {
    constructor() {
        super("tipo_medio_contacto");   // la misma ruta del @Path del resource
    }

    // Llamada extra que solo tiene tipo_medio_contacto: GET /tipo_medio_contacto/activos
    async activos() {
        const r = await fetch(this.url + "/activos");
        if (!r.ok) throw new Error("No se pudo listar activos (error " + r.status + ")");
        return r.json();
    }
}
