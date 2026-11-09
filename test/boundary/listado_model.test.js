// Pruebas de ListadoModel (las pantallas de administracion) y de la configuracion entidades.js.
{  // bloque: evita que 'expect' choque con el de otros archivos de prueba
const { expect } = chai;

describe("entidades.js", () => {
    it("define las 8 pantallas de administracion", () => {
        expect(Object.keys(ENTIDADES)).to.deep.equal(
            ["persona", "clinica", "examen", "procedimiento", "tipo_documento", "tipo_medio_contacto", "rol", "tipo_examen"]);
    });
    Object.entries(ENTIDADES).forEach(([clave, e]) => {
        it(`${clave}: tiene titulo, descripcion, service, id, columnas y campos completos`, () => {
            expect(e.titulo).to.be.a("string").and.not.equal("");
            expect(e.descripcion).to.be.a("string").and.not.equal("");
            expect(e.servicio()).to.be.instanceOf(DefaultService);
            expect(e.id).to.match(/^id[A-Z]/);
            expect(e.columnas.length).to.be.greaterThan(0);
            expect(e.campos.length).to.be.greaterThan(0);
            e.columnas.forEach(c => expect(c.campo && c.titulo, clave).to.be.ok);
            e.campos.forEach(c => expect(c.nombre && c.etiqueta && c.tipo, clave).to.be.ok);
        });
    });
});

describe("ListadoModel", () => {
    let fetchFalso, contenedor, aviso, modelo, filas, estadoRespuesta;
    const esperar = () => new Promise(r => setTimeout(r, 0));
    const ticks = async n => { for (let i = 0; i < n; i++) await esperar(); };
    const $ = id => contenedor.querySelector("#" + id);
    const llamadas = () => fetchFalso.getCalls().map(c => (c.args[1]?.method || "GET") + " " + c.args[0].split("/resources/")[1]);
    const textoTabla = () => $("tabla").shadowRoot.textContent;

    const ROLES = n => Array.from({ length: n }, (_, i) => ({ idRol: "r" + i, nombre: "Rol " + i, observaciones: "", activo: true }));

    beforeEach(async () => {
        filas = ROLES(3);
        estadoRespuesta = {};
        fetchFalso = sinon.stub(window, "fetch").callsFake(async (url, op = {}) => {
            const metodo = op.method || "GET";
            if (estadoRespuesta[metodo]) return new Response(null, { status: estadoRespuesta[metodo] });
            if (metodo === "POST") return new Response(op.body, { status: 201 });
            if (metodo === "PUT") return new Response(op.body, { status: 200 });
            if (metodo === "DELETE") return new Response(null, { status: 204 });
            const m = url.match(/primero=(\d+)&max=(\d+)/);
            return new Response(JSON.stringify(filas.slice(+m[1], +m[1] + +m[2])), { status: 200 });
        });
        aviso = document.createElement("galeno-notificacion-emergente");
        aviso.id = "aviso";
        contenedor = document.createElement("div");
        document.body.append(aviso, contenedor);
        sinon.spy(aviso, "mostrar");
        modelo = new ListadoModel(contenedor, ENTIDADES.rol);
        await modelo.iniciar();
    });
    afterEach(() => { fetchFalso.restore(); aviso.remove(); contenedor.remove(); });

    it("muestra el titulo de la pantalla", () => {
        expect(contenedor.querySelector("h2").textContent).to.equal("Roles");
    });
    it("lista los registros en la tabla (pagina 1, de 10 en 10)", () => {
        expect(textoTabla()).to.include("Rol 0");
        expect(llamadas()[0]).to.equal("GET rol?primero=0&max=10");
    });
    it("dice cuando no hay registros", async () => {
        filas = [];
        await modelo.cargar();
        expect($("estado").shadowRoot.textContent).to.include("No hay registros");
        expect($("tabla").hidden).to.equal(true);
    });
    it("si el backend falla muestra el error con Reintentar, y reintenta", async () => {
        estadoRespuesta.GET = 500;
        await modelo.cargar();
        expect($("estado").shadowRoot.textContent).to.include("error 500");
        estadoRespuesta.GET = null;
        $("estado").shadowRoot.querySelector("#reintentar").click();
        await ticks(4);
        expect(textoTabla()).to.include("Rol 0");
    });

    describe("paginacion", () => {
        beforeEach(async () => { filas = ROLES(15); await modelo.cargar(); });

        it("Siguiente pide la pagina 2", async () => {
            $("paginador").shadowRoot.querySelector("#sig").click();
            await ticks(4);
            expect(llamadas().at(-1)).to.equal("GET rol?primero=10&max=10");
            expect(textoTabla()).to.include("Rol 10");
        });
        it("si se borra la ultima fila de la pagina, vuelve a la anterior", async () => {
            $("paginador").shadowRoot.querySelector("#sig").click();
            await ticks(4);
            filas = ROLES(10);                       // la pagina 2 quedo vacia
            await modelo.cargar();
            await ticks(4);
            expect($("paginador").pagina).to.equal(1);
            expect(textoTabla()).to.include("Rol 0");
        });
    });

    describe("crear", () => {
        it("Nuevo abre el formulario vacio con los campos de la entidad", () => {
            $("nuevo").click();
            expect($("formulario").hidden).to.equal(false);
            expect($("formulario").shadowRoot.querySelector("[name=nombre]").value).to.equal("");
        });
        it("guardar hace POST, avisa y recarga la lista", async () => {
            $("nuevo").click();
            $("formulario").shadowRoot.querySelector("[name=nombre]").value = "Enfermera";
            fetchFalso.resetHistory();
            $("formulario").shadowRoot.querySelector("form").dispatchEvent(new Event("submit", { cancelable: true }));
            await ticks(6);
            expect(llamadas()[0]).to.equal("POST rol");
            expect(JSON.parse(fetchFalso.firstCall.args[1].body).nombre).to.equal("Enfermera");
            expect(aviso.mostrar.calledWith("Registro guardado", "exito")).to.equal(true);
            expect($("formulario").hidden).to.equal(true);
            expect(llamadas().some(l => l.startsWith("GET rol"))).to.equal(true);
        });
        it("Cancelar cierra el formulario", () => {
            $("nuevo").click();
            $("formulario").shadowRoot.querySelector("#cancelar").click();
            expect($("formulario").hidden).to.equal(true);
        });
        it("avisa si el backend no pudo crear", async () => {
            estadoRespuesta.POST = 500;
            $("nuevo").click();
            $("formulario").shadowRoot.querySelector("[name=nombre]").value = "X";
            $("formulario").shadowRoot.querySelector("form").dispatchEvent(new Event("submit", { cancelable: true }));
            await ticks(6);
            expect(aviso.mostrar.lastCall.args[1]).to.equal("error");
        });
    });

    describe("editar", () => {
        beforeEach(() => { $("tabla").shadowRoot.querySelector(".ed").click(); });

        it("Editar abre el formulario con los datos del registro", () => {
            expect($("formulario").hidden).to.equal(false);
            expect($("formulario").shadowRoot.querySelector("[name=nombre]").value).to.equal("Rol 0");
        });
        it("guardar hace PUT con el id del registro", async () => {
            $("formulario").shadowRoot.querySelector("[name=nombre]").value = "Rol cambiado";
            fetchFalso.resetHistory();
            $("formulario").shadowRoot.querySelector("form").dispatchEvent(new Event("submit", { cancelable: true }));
            await ticks(6);
            expect(llamadas()[0]).to.equal("PUT rol/r0");
            expect(JSON.parse(fetchFalso.firstCall.args[1].body).nombre).to.equal("Rol cambiado");
        });
    });

    describe("eliminar", () => {
        beforeEach(() => { $("tabla").shadowRoot.querySelector(".el").click(); });

        it("pide confirmacion antes de borrar", () => {
            expect($("confirmar").shadowRoot.querySelector("#fondo").hidden).to.equal(false);
            expect(llamadas().some(l => l.startsWith("DELETE"))).to.equal(false);
        });
        it("Confirmar hace DELETE, avisa y recarga", async () => {
            $("confirmar").shadowRoot.querySelector("#si").click();
            await ticks(6);
            expect(llamadas().some(l => l === "DELETE rol/r0")).to.equal(true);
            expect(aviso.mostrar.calledWith("Registro eliminado", "exito")).to.equal(true);
        });
        it("Cancelar no borra nada", async () => {
            $("confirmar").shadowRoot.querySelector("#no").click();
            await ticks(3);
            expect(llamadas().some(l => l.startsWith("DELETE"))).to.equal(false);
        });
        it("si el registro esta en uso (409) muestra el aviso de error", async () => {
            estadoRespuesta.DELETE = 409;
            $("confirmar").shadowRoot.querySelector("#si").click();
            await ticks(6);
            expect(aviso.mostrar.lastCall.args[0]).to.include("esta siendo usado");
            expect(aviso.mostrar.lastCall.args[1]).to.equal("error");
        });
    });
});
}
