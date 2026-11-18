{
const { expect } = chai;
describe("AppModel", () => {
    let api, app, cont, transicionStub;
    const empleado = { idPersona: "p-ana", nombre: "Ana Mejía", contextos: [{ idPersonaRol: "pr-ana-med-sa", idRol: "r-med", rol: "Médico", idClinica: "c-sa", clinica: "Santa Ana" }] };
    // Prepara el entorno de las pruebas.
    beforeEach(() => {
        Sesion.cerrar(); window.location.hash = "";
        api = new ApiFalsa(Datos.bd());
        transicionStub = sinon.stub(document, "startViewTransition")
            .callsFake(fn => { fn(); return { finished: Promise.resolve() }; });
        cont = document.createElement("div");
        cont.innerHTML = '<p id="anuncio" class="sr" aria-live="polite"></p><header><p id="titulo-seccion"><span id="titulo-seccion-texto"></span></p><span id="sesion"></span></header><galeno-menu id="menu"></galeno-menu><main id="pantalla"></main><galeno-notificacion-emergente id="aviso"></galeno-notificacion-emergente>';
        document.body.append(cont);
    });
    // Limpia el entorno al terminar las pruebas.
    afterEach(() => { transicionStub.restore(); app?.destruir(); api.restaurar(); cont.remove(); Sesion.cerrar(); window.location.hash = ""; });
    // Monta el enrutador y espera a que termine la primera carga.
    const arrancar = async () => { app = new AppModel(); app.iniciar(); await Ayuda.esperar(); };
    // Recoge los destinos que muestra el menú.
    const menu = () => app.menu.items.map(i => i.texto);
    // Devuelve la raíz encapsulada de la pantalla de acceso.
    const login = () => cont.querySelector("galeno-pantalla-login").shadowRoot;
    // Lee el título de la ruta que está montada.
    const titulo = () => cont.querySelector("#pantalla h2")?.textContent ?? login().querySelector("h2").textContent;

    describe("sin sesion", () => {
        it("abre Buscar citas y el menu solo tiene Buscar citas e Iniciar sesión", async () => {
            await arrancar();
            expect(titulo()).to.equal("Buscar citas");
            expect(menu()).to.deep.equal(["Buscar citas", "Iniciar sesión"]);
            expect(cont.querySelector("#sesion .nombre").textContent).to.equal("Sin sesión iniciada");
        });
        it("el boton Iniciar sesión de la cabecera lleva al login", async () => {
            await arrancar();
            cont.querySelector("#sesion button.entrar").click();
            await Ayuda.esperar();
            expect(titulo()).to.equal("Iniciar sesión");
            expect(window.location.hash).to.equal("#/login");
        });
        it("puede ir a Iniciar sesión", async () => {
            await arrancar(); app.irA("login");
            expect(titulo()).to.equal("Iniciar sesión");
            expect(window.location.hash).to.equal("#/login");
        });
        it("enfoca la entrada del tipo de documento al navegar al login", async () => {
            await arrancar(); app.irA("login");
            const tipo = login().querySelector("#tipo");
            expect(document.activeElement).to.equal(login().host);
            expect(login().activeElement).to.equal(tipo);
            expect(tipo.shadowRoot.activeElement).to.equal(tipo.shadowRoot.querySelector("input"));
        });
        it("no entra al Dashboard ni a una consulta aunque escriba la URL", async () => {
            window.location.hash = "/dashboard"; await arrancar();
            expect(titulo()).to.equal("Buscar citas");
            app.irA("consulta", "k-hoy");
            expect(titulo()).to.equal("Buscar citas");
        });
        it("las pantallas que no son de la rubrica no existen", async () => {
            await arrancar();
            ["solicitar", "admision", "registrar", "cierre", "sala", "enfermeria", "atencion", "historial", "inicio"].forEach(p =>
                expect(app.pantallas[p], p).to.equal(undefined));
        });
    });

    describe("empleado", () => {
        // Prepara el entorno de las pruebas.
        beforeEach(() => Sesion.iniciar(empleado));
        it("empieza en el Dashboard", async () => {
            await arrancar();
            expect(titulo()).to.equal("Dashboard");
            expect(cont.querySelector("#sesion .nombre").textContent).to.equal("Ana Mejía");
        });
        it("la cabecera compacta muestra el titulo de la seccion actual", async () => {
            await arrancar();
            expect(cont.querySelector("#titulo-seccion-texto").textContent).to.equal("Dashboard");
            Sesion.cerrar();
            await Ayuda.esperar();
            expect(cont.querySelector("#titulo-seccion-texto").textContent).to.equal("Buscar citas");
        });
        it("el menu solo lleva pantallas; Cerrar sesión vive en la cabecera", async () => {
            await arrancar();
            expect(menu()).to.deep.equal(["Buscar citas", "Dashboard"]);
            expect(cont.querySelector("#sesion button.salir").textContent).to.contain("Cerrar sesión");
        });
        it("no puede ir a Login", async () => {
            await arrancar(); app.irA("login");
            expect(titulo()).to.equal("Dashboard");
        });
        it("#/consulta/<id> abre la consulta y la URL guarda el id", async () => {
            await arrancar(); app.irA("consulta", "k-hoy"); await Ayuda.esperar(15);
            expect(titulo()).to.equal("Consulta");
            expect(window.location.hash).to.equal("#/consulta/k-hoy");
            expect(app.menu.activo).to.equal("dashboard");
        });
        it("consulta sin id regresa al Dashboard", async () => {
            await arrancar(); app.irA("consulta");
            expect(titulo()).to.equal("Dashboard");
        });
        it("recargar con #/consulta/<id> respeta la direccion", async () => {
            window.location.hash = "/consulta/k-hoy"; await arrancar(); await Ayuda.esperar(15);
            expect(titulo()).to.equal("Consulta");
        });
        it("el boton Atrás (hashchange) cambia de pantalla", async () => {
            await arrancar();
            window.location.hash = "/citas"; await Ayuda.esperar(20);
            expect(titulo()).to.equal("Buscar citas");
        });
        it("elegir clinica y rol actualiza el encabezado (nombre y linea rol · clinica)", async () => {
            await arrancar();
            Sesion.elegirContexto(empleado.contextos[0]);
            expect(cont.querySelector("#sesion .nombre").textContent).to.equal("Ana Mejía");
            expect(cont.querySelector("#sesion .detalle").textContent).to.equal("Médico · Santa Ana");
        });
        it("Cerrar sesión (boton de la cabecera) vuelve a Buscar citas", async () => {
            await arrancar();
            cont.querySelector("#sesion button.salir").click();
            await Ayuda.esperar();
            expect(titulo()).to.equal("Buscar citas");
            expect(menu()).to.deep.equal(["Buscar citas", "Iniciar sesión"]);
        });
    });

    describe("transicion de pantallas (view transitions)", () => {
        // Prepara el entorno de las pruebas.
        beforeEach(() => Sesion.iniciar(empleado));
        it("usa document.startViewTransition al cambiar de pantalla", async () => {
            await arrancar();
            expect(transicionStub.calledOnce).to.equal(true);
            expect(titulo()).to.equal("Dashboard");
        });
        it("con prefers-reduced-motion no la usa (queda el respaldo CSS)", async () => {
            const mm = sinon.stub(window, "matchMedia").returns({ matches: true,
                // Simula la suscripción a un evento del navegador.
                addEventListener() {},
                // Simula la retirada de una suscripción del navegador.
                removeEventListener() {} });
            await arrancar();
            expect(transicionStub.called).to.equal(false);
            expect(titulo()).to.equal("Dashboard");
            mm.restore();
        });
        it("anuncia la pantalla nueva en la region aria-live y enfoca su titulo", async () => {
            await arrancar();
            expect(cont.querySelector("#anuncio").textContent).to.equal("Pantalla: Dashboard");
            expect(document.activeElement).to.equal(cont.querySelector("#pantalla h2"));
            app.irA("citas"); await Ayuda.esperar();
            expect(cont.querySelector("#anuncio").textContent).to.equal("Pantalla: Buscar citas");
        });
    });

    it("iniciar sesion desde el login lleva al Dashboard", async () => {
        await arrancar(); app.irA("login"); await Ayuda.esperar(15);
        const z = login();
        Ayuda.tipo(z.querySelector("#tipo"), "DUI"); Ayuda.escribir(z.querySelector("#numero"), "01234567-8");
        z.querySelector("#formulario").dispatchEvent(new Event("submit", { cancelable: true }));
        await Ayuda.esperar(20);
        expect(titulo()).to.equal("Dashboard");
    });
});
}
