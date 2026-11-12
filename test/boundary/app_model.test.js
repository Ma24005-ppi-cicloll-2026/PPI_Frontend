// Rutas y menu de la SPA: Buscar citas y Login (publicas), Dashboard y Consulta (empleado).
{
const { expect } = chai;
describe("AppModel", () => {
    let api, app, cont;
    const empleado = { idPersona: "p-ana", nombre: "Ana Mejía", contextos: [{ idPersonaRol: "pr-ana-med-sa", idRol: "r-med", rol: "Médico", idClinica: "c-sa", clinica: "Santa Ana" }] };
    beforeEach(() => {
        Sesion.cerrar(); window.location.hash = "";
        api = new ApiFalsa(Datos.bd());
        cont = document.createElement("div");
        cont.innerHTML = '<header><span id="sesion"></span></header><galeno-menu id="menu"></galeno-menu><main id="pantalla"></main><galeno-notificacion-emergente id="aviso"></galeno-notificacion-emergente>';
        document.body.append(cont);
    });
    afterEach(() => { app?.destruir(); api.restaurar(); cont.remove(); Sesion.cerrar(); window.location.hash = ""; });
    const arrancar = async () => { app = new AppModel(); app.iniciar(); await Ayuda.esperar(); };
    const menu = () => app.menu.items.map(i => i.texto);
    const titulo = () => cont.querySelector("#pantalla h2")?.textContent;

    describe("sin sesion", () => {
        it("abre Buscar citas y el menu solo tiene Buscar citas e Iniciar sesión", async () => {
            await arrancar();
            expect(titulo()).to.equal("Buscar citas");
            expect(menu()).to.deep.equal(["Buscar citas", "Iniciar sesión"]);
            expect(cont.querySelector("#sesion").textContent).to.equal("Sin sesión iniciada");
        });
        it("puede ir a Iniciar sesión", async () => {
            await arrancar(); app.irA("login");
            expect(titulo()).to.equal("Iniciar sesión");
            expect(window.location.hash).to.equal("#/login");
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
        beforeEach(() => Sesion.iniciar(empleado));
        it("empieza en el Dashboard", async () => {
            await arrancar();
            expect(titulo()).to.equal("Dashboard");
            expect(cont.querySelector("#sesion").textContent).to.equal("Ana Mejía");
        });
        it("el menu: Buscar citas, Dashboard y Cerrar sesión (la consulta se abre desde una card)", async () => {
            await arrancar();
            expect(menu()).to.deep.equal(["Buscar citas", "Dashboard", "Cerrar sesión"]);
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
        it("elegir clinica y rol actualiza el encabezado", async () => {
            await arrancar();
            Sesion.elegirContexto(empleado.contextos[0]);
            expect(cont.querySelector("#sesion").textContent).to.equal("Ana Mejía · Médico · Santa Ana");
        });
        it("Cerrar sesión vuelve a Buscar citas", async () => {
            await arrancar();
            app.menu.dispatchEvent(new CustomEvent("galeno-navegar", { detail: { destino: "salir" } }));
            await Ayuda.esperar();
            expect(titulo()).to.equal("Buscar citas");
            expect(menu()).to.deep.equal(["Buscar citas", "Iniciar sesión"]);
        });
    });

    it("iniciar sesion desde el login lleva al Dashboard", async () => {
        await arrancar(); app.irA("login"); await Ayuda.esperar(15);
        const z = cont.querySelector("#pantalla");
        Ayuda.tipo(z.querySelector("#tipo"), "DUI"); Ayuda.escribir(z.querySelector("#numero"), "01234567-8");
        z.querySelector("#formulario").dispatchEvent(new Event("submit", { cancelable: true }));
        await Ayuda.esperar(20);
        expect(titulo()).to.equal("Dashboard");
    });
});
}
