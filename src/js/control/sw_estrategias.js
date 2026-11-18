class EstrategiasCache {

    // Recibe el almacén y la función de red que usará el service worker.
    constructor(nombre, almacen, red) {
        this.nombre = nombre;
        this.almacen = almacen;
        this.red = red;
    }

    // Guarda los archivos que necesita la aplicación para abrir sin red.
    async precargar(urls) {
        const cache = await this.almacen.open(this.nombre);
        await cache.addAll(urls);
    }

    // Borra las versiones de caché anteriores a la actual.
    async limpiarViejos() {
        const nombres = await this.almacen.keys();
        await Promise.all(nombres.filter(n => n !== this.nombre).map(n => this.almacen.delete(n)));
    }

    // Prefiere la red y usa una copia guardada si falla la solicitud.
    async redPrimero(peticion, respaldo = "index.html") {
        const cache = await this.almacen.open(this.nombre);
        try {
            const respuesta = await this.red(peticion);
            if (respuesta && respuesta.ok) await cache.put(peticion, respuesta.clone());
            return respuesta;
        } catch (sinRed) {
            const guardada = await cache.match(peticion);
            if (guardada) return guardada;
            if (peticion.mode === "navigate") {
                const pagina = await cache.match(respaldo);
                if (pagina) return pagina;
            }
            return new Response(JSON.stringify({ error: "Sin conexión y sin datos guardados" }),
                { status: 503, headers: { "Content-Type": "application/json" } });
        }
    }
}
