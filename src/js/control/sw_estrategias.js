// Logica del Service Worker (sw.js), separada para poder probarla con pruebas de unidad.
// Estrategia: "red primero". Siempre se intenta la red (asi, mientras desarrolla, ve sus cambios);
// si la red responde bien, se guarda copia; si no hay red, se sirve la copia guardada.
// Eso es lo que permite que la app siga funcionando sin conexion.
//
// almacen = caches (CacheStorage)   red = fetch
class EstrategiasCache {

    constructor(nombre, almacen, red) {
        this.nombre = nombre;
        this.almacen = almacen;
        this.red = red;
    }

    // Guarda de una vez los archivos de la app (el "cascaron") al instalar el service worker
    async precargar(urls) {
        const cache = await this.almacen.open(this.nombre);
        await cache.addAll(urls);
    }

    // Borra los caches de versiones anteriores (todo el que no se llame como el actual)
    async limpiarViejos() {
        const nombres = await this.almacen.keys();
        await Promise.all(nombres.filter(n => n !== this.nombre).map(n => this.almacen.delete(n)));
    }

    // respaldo: url que se sirve si es una navegacion y no hay nada guardado (el index.html)
    async redPrimero(peticion, respaldo = "index.html") {
        const cache = await this.almacen.open(this.nombre);
        try {
            const respuesta = await this.red(peticion);
            if (respuesta && respuesta.ok) await cache.put(peticion, respuesta.clone());   // solo se guarda lo exitoso
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
