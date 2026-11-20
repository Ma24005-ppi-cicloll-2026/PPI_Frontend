{
const { expect } = chai;

describe("Arquitectura: sin static, sin valores fijos y sin async/await", () => {
    // Clases del sistema que se crean como objetos y se pasan a quien las usa.
    const clases = () => [Configuracion, ApiCache, DefaultService, ConsultaService, ClinicaService, RolService,
        DocumentoService, GestorFechas, DatosClinica, Documentos, Agenda, FlujoPasos, NotasPaso, Expediente, Sesion,
        Pwa, EstrategiasCache, LoginModel, CitasModel, DashboardModel, SeguimientoModel, AppModel,
        GalenoTarjetaAgenda, GalenoTarjetaCita, GalenoRegistroPaso, GalenoMenu, GalenoOpcion, GalenoTema,
        GalenoConexion, GalenoNotificacionEmergente, GalenoGuiaInstalacion];
    // Miembros propios de toda clase y el que exige la API de Web Components.
    const permitidos = ["length", "name", "prototype", "observedAttributes"];

    it("ninguna clase tiene miembros static (salvo observedAttributes de los Web Components)", () => {
        clases().forEach(C => expect(Object.getOwnPropertyNames(C).filter(n => !permitidos.includes(n)), C.name).to.deep.equal([]));
    });
    it("ningun metodo es async: las respuestas se atienden con promesas y eventos", () => {
        clases().forEach(C => Object.getOwnPropertyNames(C.prototype).forEach(n => {
            const d = Object.getOwnPropertyDescriptor(C.prototype, n);
            if (typeof d.value === "function") expect(d.value.constructor.name, `${C.name}.${n}`).to.not.equal("AsyncFunction");
        }));
    });
    it("la direccion del API se lee de index.html, no esta escrita en el codigo", () => {
        const doc = document.implementation.createHTMLDocument("");
        doc.head.innerHTML = '<meta name="galeno-api" content="http://otro:8080/api/"><meta name="galeno-pagina" content="20">';
        const config = new Configuracion(doc);
        expect(config.api).to.equal("http://otro:8080/api/");
        expect(config.tamanoPagina).to.equal(20);
        expect(new DocumentoService({ configuracion: config }).url).to.equal("http://otro:8080/api/documento");
    });
    it("listarTodo pide pagina tras pagina hasta que llega una incompleta", async () => {
        const config = { api: "http://x/resources/", tamanoPagina: 2 };
        const servicio = new DocumentoService({ configuracion: config });
        const paginas = [[1, 2], [3, 4], [5]];
        const listar = sinon.stub(servicio, "listar").callsFake(() => Promise.resolve(paginas.shift()));
        expect(await servicio.listarTodo()).to.deep.equal([1, 2, 3, 4, 5]);
        expect(listar.args.map(a => a[0])).to.deep.equal([0, 2, 4]);
    });
    it("los modelos reciben sus utilidades por el constructor", () => {
        const agenda = new Agenda();
        const modelo = new DashboardModel(document.createElement("div"), { agenda });
        expect(modelo.agenda).to.equal(agenda);
    });
});

describe("Devolución de un paso", () => {
    const a = { idProcedimientoPaso: "a", nombre: "Triaje" }, b = { idProcedimientoPaso: "b", nombre: "Consulta" };
    // Construye un paso realizado con su estado.
    const paso = (id, hora, estado) => ({ idConsultaProcedimientoPaso: id, fechaInicio: `2026-01-01T0${hora}:00:00Z`, estado });

    it("un paso devuelto vuelve a ser el actual aunque el siguiente ya se haya abierto", () => {
        const e = new FlujoPasos().estado([a, b], [paso("1", 1, "Devuelto"), paso("2", 2, "En proceso")]);
        expect(e.actual).to.equal(0);
        expect(e.devuelto).to.equal(true);
    });
    it("al completarlo otra vez, el actual vuelve a ser el siguiente", () => {
        const e = new FlujoPasos().estado([a, b], [paso("1", 1, "Completado"), paso("2", 2, "En proceso")]);
        expect(e.actual).to.equal(1);
        expect(e.devuelto).to.equal(false);
    });
    it("solo se puede devolver desde el segundo paso en adelante", () => {
        const flujo = new FlujoPasos();
        expect(flujo.puedeDevolver(flujo.estado([a, b], []))).to.equal(false);
        expect(flujo.puedeDevolver(flujo.estado([a, b], [paso("1", 1, "Completado")]))).to.equal(true);
    });
    it("el motivo se guarda, se lee y se borra sin tocar las notas de los pasos", () => {
        const notas = new NotasPaso();
        const base = "Paso 1 (Triaje) · Ana: Presión normal";
        const con = notas.guardarDevolucion(base, 1, "Luis", "Falta el peso\nY la talla");
        expect(notas.devolucionDe(con, 1)).to.deep.equal({ autor: "Luis", motivo: "Falta el peso\nY la talla" });
        expect(notas.de(con, 1)).to.equal("Presión normal");
        expect(notas.quitarDevolucion(con, 1)).to.equal(base);
        expect(notas.devolucionDe(base, 1)).to.equal(null);
    });
});
}
