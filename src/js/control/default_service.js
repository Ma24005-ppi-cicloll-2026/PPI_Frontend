class DefaultService {

    // Arma la ruta REST con la dirección del API que define la configuración.
    constructor(ruta, { configuracion = new Configuracion(), cache = new ApiCache() } = {}) {
        this.configuracion = configuracion;
        this.cache = cache;
        this.url = configuracion.api + ruta;
        this.ultimaLecturaDesdeCache = false;
    }

    // Avisa a la aplicación con un evento de ventana.
    avisar(nombre, detail) {
        window.dispatchEvent(new CustomEvent(nombre, detail ? { detail } : undefined));
    }

    // Notifica el estado del API antes de procesar la respuesta o recurrir a la caché.
    solicitar(url, opciones) {
        return fetch(url, opciones).then(respuesta => {
            if (respuesta.ok) this.avisar("galeno-api-disponible");
            else if ([502, 503, 504].includes(respuesta.status)) this.avisar("galeno-api-no-disponible", { url });
            return respuesta;
        }, error => {
            if (error instanceof TypeError || navigator.onLine === false) this.avisar("galeno-api-no-disponible", { url });
            throw error;
        });
    }

    // Lee el JSON y recurre a IndexedDB cuando falla la conexión.
    getJson(url, opciones = {}) {
        this.ultimaLecturaDesdeCache = false;
        return this.solicitar(url, opciones)
            .then(respuesta => {
                if (respuesta.status === 404) return null;
                if (!respuesta.ok) throw new Error("No se pudo consultar (error " + respuesta.status + ")");
                return respuesta.json().then(datos => {
                    this.cache.guardar(url, datos).catch(() => {});
                    return datos;
                });
            })
            .catch(error => {
                if (!(error instanceof TypeError) && navigator.onLine !== false) throw error;
                return this.cache.leer(url).catch(() => null).then(guardados => {
                    if (guardados === null) throw error;
                    this.ultimaLecturaDesdeCache = true;
                    this.avisar("galeno-api-cache", { url });
                    return guardados;
                });
            });
    }

    // Solicita una página de registros al endpoint.
    listar(primero = 0, max = this.configuracion.tamanoPagina) {
        return this.getJson(`${this.url}?primero=${primero}&max=${max}`);
    }

    // Pide página tras página hasta que el servidor ya no devuelve más registros.
    listarTodo(primero = 0, acumulados = []) {
        const tamano = this.configuracion.tamanoPagina;
        return this.listar(primero, tamano).then(pagina => {
            const lista = acumulados.concat(pagina ?? []);
            return (pagina?.length ?? 0) < tamano ? lista : this.listarTodo(primero + tamano, lista);
        });
    }

    // Busca los registros que coinciden con los datos elegidos.
    buscar(id) {
        return this.getJson(`${this.url}/${encodeURIComponent(id)}`);
    }

    // Envía el registro en formato JSON con el método indicado.
    enviar(url, metodo, datos) {
        return this.solicitar(url, { method: metodo, headers: { "Content-Type": "application/json" }, body: JSON.stringify(datos) });
    }

    // Crea el registro o elemento que necesita este flujo.
    crear(datos) {
        return this.enviar(this.url, "POST", datos).then(r => {
            if (r.status !== 201) throw new Error("No se pudo crear (error " + r.status + ")");
            return r.json();
        });
    }

    // Envía los cambios mediante PUT y devuelve el registro guardado.
    actualizar(id, datos) {
        return this.enviar(`${this.url}/${encodeURIComponent(id)}`, "PUT", datos).then(r => {
            if (!r.ok) throw new Error("No se pudo actualizar (error " + r.status + ")");
            return r.json();
        });
    }

    // Solicita el borrado del registro y comprueba el resultado.
    eliminar(id) {
        return this.solicitar(`${this.url}/${encodeURIComponent(id)}`, { method: "DELETE" }).then(r => {
            if (r.status === 409) throw new Error("No se puede eliminar: esta siendo usado en otra parte");
            if (r.status !== 204) throw new Error("No se pudo eliminar (error " + r.status + ")");
        });
    }

    // Devuelve los registros marcados como activos.
    activos() {
        return this.solicitar(this.url + "/activos").then(r => {
            if (!r.ok) throw new Error("No se pudo listar activos (error " + r.status + ")");
            return r.json();
        });
    }
}
