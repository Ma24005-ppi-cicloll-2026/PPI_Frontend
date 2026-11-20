class EstrategiasCache {

    // Recibe el almacén y la función de red que usará el service worker.
    constructor(nombre, almacen, red) {
        this.nombre = nombre;
        this.almacen = almacen;
        this.red = red;
    }

    // Guarda los archivos que necesita la aplicación para abrir sin red.
    precargar(urls) {
        return this.almacen.open(this.nombre).then(cache => cache.addAll(urls));
    }

    // Borra las versiones de caché anteriores a la actual.
    limpiarViejos() {
        return this.almacen.keys()
            .then(nombres => Promise.all(nombres.filter(n => n !== this.nombre).map(n => this.almacen.delete(n))));
    }

    // Prefiere la red y usa una copia guardada si falla la solicitud.
    redPrimero(peticion, respaldo = "index.html") {
        return this.almacen.open(this.nombre).then(cache => Promise.resolve()
            .then(() => this.red(peticion))
            .then(respuesta => {
                if (!respuesta || !respuesta.ok) return respuesta;
                return cache.put(peticion, respuesta.clone()).then(() => respuesta);
            })
            .catch(() => this.respaldo(cache, peticion, respaldo)));
    }

    // Busca la copia guardada, la página principal o responde que no hay datos.
    respaldo(cache, peticion, pagina) {
        return cache.match(peticion)
            .then(guardada => guardada || (peticion.mode === "navigate" ? cache.match(pagina) : null))
            .then(encontrada => encontrada || new Response(JSON.stringify({ error: "Sin conexión y sin datos guardados" }),
                { status: 503, headers: { "Content-Type": "application/json" } }));
    }
}
