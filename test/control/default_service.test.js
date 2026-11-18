{
const { expect } = chai;

// Construye la respuesta HTTP que espera la prueba.
function respuesta(estado, cuerpo) {
    return new Response(cuerpo === undefined ? null : JSON.stringify(cuerpo), { status: estado });
}

// Comprueba el rechazo de la operación y su mensaje.
async function esperarError(funcion) {
    try {
        await funcion();
    } catch (e) {
        return e;
    }
    throw new Error("Se esperaba un error y no ocurrio");
}

describe("DefaultService", () => {
    let fetchFalso;
    let servicio;
    let copias;
    let guardarCache;
    let leerCache;

    // Prepara el entorno de las pruebas.
    beforeEach(() => {
        copias = new Map();
        guardarCache = sinon.stub(ApiCache, "guardar").callsFake(async (url, valor) => { copias.set(url, valor); return true; });
        leerCache = sinon.stub(ApiCache, "leer").callsFake(async url => copias.get(url) ?? null);
        fetchFalso = sinon.stub(window, "fetch");
        servicio = new DefaultService("documento");
    });
    // Limpia el entorno al terminar las pruebas.
    afterEach(() => {
        fetchFalso.restore();
        guardarCache.restore(); leerCache.restore();
    });

    it("arma la URL base con la ruta", () => {
        expect(servicio.url).to.equal("http://localhost:9080/GalenoSV-1.0-SNAPSHOT/resources/documento");
    });

    describe("listar", () => {
        it("usa primero=0 y max=50 por defecto", async () => {
            fetchFalso.resolves(respuesta(200, []));
            await servicio.listar();
            expect(fetchFalso.firstCall.args[0]).to.match(/documento\?primero=0&max=50$/);
        });
        it("usa los valores que se le pasan", async () => {
            fetchFalso.resolves(respuesta(200, []));
            await servicio.listar(10, 5);
            expect(fetchFalso.firstCall.args[0]).to.match(/documento\?primero=10&max=5$/);
        });
        it("devuelve el JSON recibido", async () => {
            fetchFalso.resolves(respuesta(200, [{ idDocumento: "1" }, { idDocumento: "2" }]));
            const datos = await servicio.listar();
            expect(datos).to.have.length(2);
            expect(datos[0].idDocumento).to.equal("1");
        });
        it("devuelve un arreglo vacio si no hay datos", async () => {
            fetchFalso.resolves(respuesta(200, []));
            expect(await servicio.listar()).to.deep.equal([]);
        });
        it("guarda la última respuesta correcta y la usa si se pierde la conexión", async () => {
            fetchFalso.onFirstCall().resolves(respuesta(200, [{ idDocumento: "local" }]));
            fetchFalso.onSecondCall().rejects(new TypeError("Failed to fetch"));
            expect(await servicio.listar()).to.deep.equal([{ idDocumento: "local" }]);
            expect(servicio.ultimaLecturaDesdeCache).to.equal(false);
            await Promise.resolve();
            expect(await servicio.listar()).to.deep.equal([{ idDocumento: "local" }]);
            expect(servicio.ultimaLecturaDesdeCache).to.equal(true);
        });
        it("lanza error con el codigo si el servidor responde 500", async () => {
            fetchFalso.resolves(respuesta(500));
            const e = await esperarError(() => servicio.listar());
            expect(e.message).to.include("500");
        });
        it("lanza error si no hay conexion (fetch falla)", async () => {
            fetchFalso.rejects(new TypeError("Failed to fetch"));
            const e = await esperarError(() => servicio.listar());
            expect(e.message).to.include("Failed to fetch");
        });
    });

    describe("buscar", () => {
        it("pide /documento/{id} y devuelve el objeto", async () => {
            fetchFalso.resolves(respuesta(200, { idDocumento: "abc" }));
            const doc = await servicio.buscar("abc");
            expect(fetchFalso.firstCall.args[0]).to.match(/documento\/abc$/);
            expect(doc.idDocumento).to.equal("abc");
        });
        it("devuelve null si no existe (404)", async () => {
            fetchFalso.resolves(respuesta(404));
            expect(await servicio.buscar("x")).to.equal(null);
        });
        it("lanza error si responde 500", async () => {
            fetchFalso.resolves(respuesta(500));
            const e = await esperarError(() => servicio.buscar("x"));
            expect(e.message).to.include("500");
        });
    });

    describe("crear", () => {
        it("manda POST con el cuerpo en JSON", async () => {
            fetchFalso.resolves(respuesta(201, { idDocumento: "1" }));
            await servicio.crear({ nombre: "a" });
            const [url, opciones] = fetchFalso.firstCall.args;
            expect(url).to.match(/documento$/);
            expect(opciones.method).to.equal("POST");
            expect(opciones.headers["Content-Type"]).to.equal("application/json");
            expect(JSON.parse(opciones.body)).to.deep.equal({ nombre: "a" });
        });
        it("devuelve el objeto creado (201)", async () => {
            fetchFalso.resolves(respuesta(201, { idDocumento: "1" }));
            const creado = await servicio.crear({ nombre: "a" });
            expect(creado.idDocumento).to.equal("1");
        });
        it("lanza error si responde 500 (por ejemplo, datos invalidos)", async () => {
            fetchFalso.resolves(respuesta(500));
            const e = await esperarError(() => servicio.crear({}));
            expect(e.message).to.include("500");
        });
        it("lanza error si responde 200 en vez de 201", async () => {
            fetchFalso.resolves(respuesta(200, {}));
            await esperarError(() => servicio.crear({}));
        });
    });

    describe("actualizar", () => {
        it("manda PUT a /documento/{id} con el cuerpo en JSON", async () => {
            fetchFalso.resolves(respuesta(200, { idDocumento: "7", nombre: "b" }));
            const r = await servicio.actualizar("7", { nombre: "b" });
            const [url, opciones] = fetchFalso.firstCall.args;
            expect(url).to.match(/documento\/7$/);
            expect(opciones.method).to.equal("PUT");
            expect(JSON.parse(opciones.body)).to.deep.equal({ nombre: "b" });
            expect(r.nombre).to.equal("b");
        });
        it("lanza error si responde 404", async () => {
            fetchFalso.resolves(respuesta(404));
            const e = await esperarError(() => servicio.actualizar("7", {}));
            expect(e.message).to.include("404");
        });
        it("lanza error si responde 500", async () => {
            fetchFalso.resolves(respuesta(500));
            await esperarError(() => servicio.actualizar("7", {}));
        });
    });

    describe("eliminar", () => {
        it("manda DELETE a /documento/{id}", async () => {
            fetchFalso.resolves(respuesta(204));
            await servicio.eliminar("9");
            const [url, opciones] = fetchFalso.firstCall.args;
            expect(url).to.match(/documento\/9$/);
            expect(opciones.method).to.equal("DELETE");
        });
        it("no lanza error con 204", async () => {
            fetchFalso.resolves(respuesta(204));
            await servicio.eliminar("9");
        });
        it("avisa que esta en uso con 409", async () => {
            fetchFalso.resolves(respuesta(409));
            const e = await esperarError(() => servicio.eliminar("9"));
            expect(e.message).to.include("usado");
        });
        it("lanza error con 404", async () => {
            fetchFalso.resolves(respuesta(404));
            await esperarError(() => servicio.eliminar("9"));
        });
    });
});

}
