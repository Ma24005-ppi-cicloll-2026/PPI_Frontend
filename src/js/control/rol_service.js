class RolService extends DefaultService {
    constructor() {
        super("rol");   // la misma ruta del @Path del resource
    }

    // Llamada extra que solo tiene rol: GET /rol/activos
    async activos() {
        const r = await fetch(this.url + "/activos");
        if (!r.ok) throw new Error("No se pudo listar activos (error " + r.status + ")");
        return r.json();
    }
}
