// Pruebas de AppModel: el menu, el encabezado y las pantallas segun quien inicio sesion.
{  // bloque: evita que 'expect' choque con el de otros archivos de prueba
const { expect } = chai;

describe("AppModel", () => {
    let fetchFalso, menu, zona, textoSesion, aviso, app;
    const esperar = () => new Promise(r => setTimeout(r, 0));
    const opciones = () => [...menu.shadowRoot.querySelectorAll("button")].map(b => b.textContent);
    const titulo = () => zona.querySelector("h2")?.textContent;
    const MENU_PERSONAL = ["Inicio", "Consultas", "Personas", "Clínicas", "Exámenes", "Procedimientos",
        "Tipos de documento", "Tipos de medio de contacto", "Roles", "Tipos de examen", "Cerrar sesión"];

    beforeEach(() => {
        fetchFalso = sinon.stub(window, "fetch").callsFake(async () => new Response("[]", { status: 200 }));
        Sesion.cerrar();
        menu = document.createElement("galeno-menu"); menu.id = "menu";
        zona = document.createElement("div"); zona.id = "pantalla";
        textoSesion = document.createElement("span"); textoSesion.id = "sesion";
        aviso = document.createElement("galeno-notificacion-emergente"); aviso.id = "aviso";
        document.body.append(menu, zona, textoSesion, aviso);
        app = new AppModel();
        app.iniciar();
    });
    afterEach(() => { app.destruir(); fetchFalso.restore(); [menu, zona, textoSesion, aviso].forEach(e => e.remove()); Sesion.cerrar(); });

    describe("sin sesion", () => {
        it("solo ofrece Iniciar sesion y muestra el login", () => {
            expect(opciones()).to.deep.equal(["Iniciar sesión"]);
            expect(titulo()).to.equal("Iniciar sesión");
            expect(textoSesion.textContent).to.equal("Sin sesión iniciada");
        });
        it("no deja entrar a otra pantalla: lo regresa al login", () => {
            ["consulta", "historial", "persona"].forEach(p => { app.irA(p); expect(titulo(), p).to.equal("Iniciar sesión"); });
        });
    });

    describe("paciente", () => {
        beforeEach(() => Sesion.iniciar({ idPersona: "p1", nombre: "Ana Lopez", rol: "Paciente", clinica: "" }));

        it("el menu tiene solo Inicio, Mi historial y Cerrar sesion", () => {
            expect(opciones()).to.deep.equal(["Inicio", "Mi historial", "Cerrar sesión"]);
        });
        it("el encabezado muestra su nombre y su rol", () => {
            expect(textoSesion.textContent).to.equal("Ana Lopez · Paciente");
        });
        it("empieza en el Inicio con la tarjeta de su historial", () => {
            expect(titulo()).to.equal("Bienvenido, Ana Lopez");
            expect([...zona.querySelectorAll("galeno-tarjeta-simple")].map(t => t.datos.titulo)).to.deep.equal(["Mi historial"]);
        });
        it("no puede entrar a las consultas del personal ni a administracion", () => {
            ["consulta", "persona", "rol"].forEach(p => { app.irA(p); expect(titulo(), p).to.equal("Bienvenido, Ana Lopez"); });
        });
        it("puede abrir su historial desde el menu", async () => {
            menu.shadowRoot.querySelectorAll("button")[1].click();
            await esperar();
            expect(titulo()).to.equal("Mi historial médico");
        });
    });

    describe("personal", () => {
        ["Medico", "Recepcionista", "rodrigo"].forEach(rol => {
            it(`con el rol "${rol}" el menu tiene Consultas y todas las pantallas de administracion`, () => {
                Sesion.iniciar({ nombre: "Alguien", rol, clinica: "Central", idClinica: "c1" });
                expect(opciones()).to.deep.equal(MENU_PERSONAL);
            });
        });
        beforeEach(() => Sesion.iniciar({ nombre: "Dr House", rol: "Medico", clinica: "Central", idClinica: "c1" }));

        it("el encabezado muestra nombre, rol y clinica", () => {
            expect(textoSesion.textContent).to.equal("Dr House · Medico · Central");
        });
        it("el Inicio tiene una tarjeta por cada pantalla (Consultas + 8 de administracion)", () => {
            expect(zona.querySelectorAll("galeno-tarjeta-simple")).to.have.length(9);
        });
        it("no puede entrar al historial de paciente", () => {
            app.irA("historial");
            expect(titulo()).to.equal("Bienvenido, Dr House");
        });
        it("puede abrir Consultas y una pantalla de administracion desde el menu", async () => {
            menu.shadowRoot.querySelectorAll("button")[1].click();
            await esperar();
            expect(titulo()).to.equal("Consultas");
            menu.shadowRoot.querySelectorAll("button")[2].click();
            await esperar();
            expect(titulo()).to.equal("Personas");
        });
    });

    describe("cerrar sesion", () => {
        it("Cerrar sesion borra la sesion y vuelve al login", () => {
            Sesion.iniciar({ nombre: "Dr House", rol: "Medico", clinica: "Central", idClinica: "c1" });
            const salir = [...menu.shadowRoot.querySelectorAll("button")].find(b => b.textContent === "Cerrar sesión");
            salir.click();
            expect(Sesion.obtener()).to.equal(null);
            expect(opciones()).to.deep.equal(["Iniciar sesión"]);
            expect(titulo()).to.equal("Iniciar sesión");
            expect(textoSesion.textContent).to.equal("Sin sesión iniciada");
        });
    });

    it("al recargar la pagina con una sesion abierta entra directo al Inicio", () => {
        Sesion.iniciar({ nombre: "Dr House", rol: "Medico", clinica: "Central", idClinica: "c1" });
        app.destruir();
        zona.replaceChildren();
        app = new AppModel();
        app.iniciar();
        expect(titulo()).to.equal("Bienvenido, Dr House");
    });
});
}
