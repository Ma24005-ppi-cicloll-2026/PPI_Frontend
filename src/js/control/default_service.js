// Clase padre de todos los services (igual que DefaultResource en GalenoSV).
// Aqui estan las 5 llamadas al backend; cada service hijo solo dice su ruta.
class DefaultService {

    constructor(ruta) {
        this.url = "http://localhost:9080/GalenoSV-1.0-SNAPSHOT/resources/" + ruta;
        this.ultimaLecturaDesdeCache = false;
    }

    async getJson(url, opciones = {}) {
        this.ultimaLecturaDesdeCache = false;
        try {
            const respuesta = await fetch(url, opciones);
            window.dispatchEvent(new CustomEvent("galeno-api-disponible"));
            if (respuesta.status === 404) return null;
            if (!respuesta.ok) throw new Error("No se pudo consultar (error " + respuesta.status + ")");
            const datos = await respuesta.json();
            ApiCache.guardar(url, datos).catch(() => {}); // el API en línea no debe esperar al almacenamiento local
            return datos;
        } catch (error) {
            // Los errores HTTP no se sustituyen con datos viejos: solo el fallo de red usa la copia local.
            if (!(error instanceof TypeError) && navigator.onLine !== false) throw error;
            const guardados = await ApiCache.leer(url).catch(() => null);
            if (guardados === null) throw error;
            this.ultimaLecturaDesdeCache = true;
            window.dispatchEvent(new CustomEvent("galeno-api-cache", { detail: { url } }));
            return guardados;
        }
    }

    // GET /ruta?primero=0&max=50  ->  lista de registros
    async listar(primero = 0, max = 50) {
        return this.getJson(`${this.url}?primero=${primero}&max=${max}`);
    }

    // GET /ruta/{id}  ->  un registro, o null si no existe (404)
    async buscar(id) {
        return this.getJson(`${this.url}/${encodeURIComponent(id)}`);
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
        const r = await fetch(`${this.url}/${encodeURIComponent(id)}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(datos)
        });
        if (!r.ok) throw new Error("No se pudo actualizar (error " + r.status + ")");
        return r.json();
    }

    // DELETE /ruta/{id}  ->  204; si esta en uso el backend responde 409
    async eliminar(id) {
        const r = await fetch(`${this.url}/${encodeURIComponent(id)}`, { method: "DELETE" });
        if (r.status === 409) throw new Error("No se puede eliminar: esta siendo usado en otra parte");
        if (r.status !== 204) throw new Error("No se pudo eliminar (error " + r.status + ")");
    }
}
