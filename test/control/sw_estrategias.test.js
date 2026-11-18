{
const { expect } = chai;

// Simula CacheStorage con mapas en memoria.
function crearAlmacen() {
    const caches = new Map();
    // Abre el recurso y deja listo su estado para usarlo.
    const abrir = nombre => {
        if (!caches.has(nombre)) caches.set(nombre, new Map());
        const datos = caches.get(nombre);
        // Obtiene la clave con la que se guarda la petición.
        const clave = p => (typeof p === "string" ? p : p.url);
        return {
            // Guarda una respuesta en la caché simulada.
            put: async (p, r) => { datos.set(clave(p), r); },
            // Busca una respuesta por su clave en la caché simulada.
            match: async p => datos.get(clave(p)),
            // Simula la precarga de los recursos indicados.
            addAll: async urls => { urls.forEach(u => datos.set(u, new Response("precargado " + u))); }
        };
    };
    return { caches,
        // Abre una caché del almacén simulado.
        open: async n => abrir(n),
        // Enumera las cachés del almacén simulado.
        keys: async () => [...caches.keys()],
        // Elimina una caché del almacén simulado.
        delete: async n => caches.delete(n) };
}
// Construye una petición para evaluar la estrategia de caché.
const peticion = (url, modo = "cors") => ({ url, mode: modo });

describe("EstrategiasCache (service worker)", () => {
    let almacen, e;
    // Prepara el entorno de las pruebas.
    beforeEach(() => { almacen = crearAlmacen(); });

    it("precargar guarda los archivos de la app en el cache", async () => {
        e = new EstrategiasCache("v1", almacen, async () => { throw new Error("no se usa"); });
        await e.precargar(["index.html", "sw.js"]);
        const cache = await almacen.open("v1");
        expect(await cache.match("index.html")).to.not.equal(undefined);
        expect(await cache.match("sw.js")).to.not.equal(undefined);
    });

    it("con conexion devuelve lo de la red y guarda una copia", async () => {
        e = new EstrategiasCache("v1", almacen, async () => new Response("[1,2]", { status: 200 }));
        const p = peticion("http://api/consulta");
        const r = await e.redPrimero(p);
        expect(await r.text()).to.equal("[1,2]");
        const copia = await (await almacen.open("v1")).match(p);
        expect(await copia.text()).to.equal("[1,2]");
    });

    it("sin conexion devuelve la copia guardada (la app sigue funcionando)", async () => {
        const p = peticion("http://api/consulta");
        let hayRed = true;
        e = new EstrategiasCache("v1", almacen, async () => { if (!hayRed) throw new TypeError("Failed to fetch"); return new Response("datos"); });
        await e.redPrimero(p);
        hayRed = false;
        const r = await e.redPrimero(p);
        expect(await r.text()).to.equal("datos");
    });

    it("no guarda respuestas con error (404, 500)", async () => {
        e = new EstrategiasCache("v1", almacen, async () => new Response("no", { status: 404 }));
        const p = peticion("http://api/x");
        const r = await e.redPrimero(p);
        expect(r.status).to.equal(404);
        expect(await (await almacen.open("v1")).match(p)).to.equal(undefined);
    });

    it("sin conexion y sin copia: una navegacion recibe el index.html guardado", async () => {
        e = new EstrategiasCache("v1", almacen, async () => { throw new TypeError("Failed to fetch"); });
        await e.precargar(["index.html"]);
        const r = await e.redPrimero(peticion("http://localhost/otra-ruta", "navigate"));
        expect(await r.text()).to.equal("precargado index.html");
    });

    it("sin conexion y sin copia: un dato recibe 503 con un mensaje JSON", async () => {
        e = new EstrategiasCache("v1", almacen, async () => { throw new TypeError("Failed to fetch"); });
        const r = await e.redPrimero(peticion("http://api/consulta"));
        expect(r.status).to.equal(503);
        expect((await r.json()).error).to.contain("Sin conexión");
    });

    it("limpiarViejos borra los caches de versiones anteriores y conserva el actual", async () => {
        await almacen.open("v1"); await almacen.open("v2");
        e = new EstrategiasCache("v2", almacen, async () => new Response(""));
        await e.limpiarViejos();
        expect(await almacen.keys()).to.deep.equal(["v2"]);
    });
});
}
