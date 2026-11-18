class RolService extends DefaultService {
    // Vincula el servicio con su recurso REST.
    constructor() {
        super("rol");
    }

    // Devuelve los registros marcados como activos.
    async activos() {
        const r = await fetch(this.url + "/activos");
        if (!r.ok) throw new Error("No se pudo listar activos (error " + r.status + ")");
        return r.json();
    }
}
