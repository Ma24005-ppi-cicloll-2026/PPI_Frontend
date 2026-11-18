class DefaultService {

    // Conserva la ruta REST y prepara el indicador de lectura desde caché.
    constructor(ruta) {
        this.url = "http://localhost:9080/GalenoSV-1.0-SNAPSHOT/resources/" + ruta;
        this.ultimaLecturaDesdeCache = false;
    }

    // Lee el JSON y recurre a IndexedDB cuando falla la conexión.
    async getJson(url, opciones = {}) {
        this.ultimaLecturaDesdeCache = false;
        try {
            const respuesta = await fetch(url, opciones);
            window.dispatchEvent(new CustomEvent("galeno-api-disponible"));
            if (respuesta.status === 404) return null;
            if (!respuesta.ok) throw new Error("No se pudo consultar (error " + respuesta.status + ")");
            const datos = await respuesta.json();
            ApiCache.guardar(url, datos).catch(() => {});
            return datos;
        } catch (error) {
            if (!(error instanceof TypeError) && navigator.onLine !== false) throw error;
            const guardados = await ApiCache.leer(url).catch(() => null);
            if (guardados === null) throw error;
            this.ultimaLecturaDesdeCache = true;
            window.dispatchEvent(new CustomEvent("galeno-api-cache", { detail: { url } }));
            return guardados;
        }
    }

    // Solicita una página de registros al endpoint.
    async listar(primero = 0, max = 50) {
        return this.getJson(`${this.url}?primero=${primero}&max=${max}`);
    }

    // Busca los registros que coinciden con los datos elegidos.
    async buscar(id) {
        return this.getJson(`${this.url}/${encodeURIComponent(id)}`);
    }

    // Crea el registro o elemento que necesita este flujo.
    async crear(datos) {
        const r = await fetch(this.url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(datos)
        });
        if (r.status !== 201) throw new Error("No se pudo crear (error " + r.status + ")");
        return r.json();
    }

    // Envía los cambios mediante PUT y devuelve el registro guardado.
    async actualizar(id, datos) {
        const r = await fetch(`${this.url}/${encodeURIComponent(id)}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(datos)
        });
        if (!r.ok) throw new Error("No se pudo actualizar (error " + r.status + ")");
        return r.json();
    }

    // Solicita el borrado del registro y comprueba el resultado.
    async eliminar(id) {
        const r = await fetch(`${this.url}/${encodeURIComponent(id)}`, { method: "DELETE" });
        if (r.status === 409) throw new Error("No se puede eliminar: esta siendo usado en otra parte");
        if (r.status !== 204) throw new Error("No se pudo eliminar (error " + r.status + ")");
    }
}
