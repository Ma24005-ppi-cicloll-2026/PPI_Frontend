// Clase padre de todos los services (igual que DefaultResource en GalenoSV).
// Aqui estan las 5 llamadas al backend; cada service hijo solo dice su ruta.
class DefaultService {

    constructor(ruta) {
        this.url = "http://localhost:9080/GalenoSV-1.0-SNAPSHOT/resources/" + ruta;
    }

    // GET /ruta?primero=0&max=50  ->  lista de registros
    async listar(primero = 0, max = 50) {
        const r = await fetch(`${this.url}?primero=${primero}&max=${max}`);
        if (!r.ok) throw new Error("No se pudo listar (error " + r.status + ")");
        return r.json();
    }

    // GET /ruta/{id}  ->  un registro, o null si no existe (404)
    async buscar(id) {
        const r = await fetch(`${this.url}/${id}`);
        if (r.status === 404) return null;
        if (!r.ok) throw new Error("No se pudo buscar (error " + r.status + ")");
        return r.json();
    }

    // POST /ruta  ->  devuelve el registro creado (con su id)
    async crear(datos) {
        const r = await fetch(this.url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(datos)
        });
        if (r.status !== 201) throw new Error("No se pudo crear (error " + r.status + ")");
        return r.json();
    }

    // PUT /ruta/{id}  ->  devuelve el registro actualizado
    async actualizar(id, datos) {
        const r = await fetch(`${this.url}/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(datos)
        });
        if (!r.ok) throw new Error("No se pudo actualizar (error " + r.status + ")");
        return r.json();
    }

    // DELETE /ruta/{id}  ->  204; si esta en uso el backend responde 409
    async eliminar(id) {
        const r = await fetch(`${this.url}/${id}`, { method: "DELETE" });
        if (r.status === 409) throw new Error("No se puede eliminar: esta siendo usado en otra parte");
        if (r.status !== 204) throw new Error("No se pudo eliminar (error " + r.status + ")");
    }
}
