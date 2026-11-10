// Pruebas de AppModel: el menu, el encabezado y las pantallas segun quien inicio sesion.
{  // bloque: evita que 'expect' choque con el de otros archivos de prueba
const { expect } = chai;

describe("AppModel", () => {
    let fetchFalso, menu, zona, textoSesion, aviso, app;
    const esperar = () => new Promise(r => setTimeout(r, 0));
    const opciones = () => [...menu.shadowRoot.querySelectorAll("button")].map(b => b.textContent);
    const titulo = () => zona.querySelector("h2")?.textContent;
    const MENU_ADMIN = ["Inicio", "Solicitar consulta", "Consultas", "Personas", "Clínicas", "Exámenes", "Procedimientos",
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
        it("solo ofrece Iniciar sesion y Solicitar consulta, y muestra el login", () => {
            expect(opciones()).to.deep.equal(["Iniciar sesión", "Solicitar consulta"]);
            expect(titulo()).to.equal("Iniciar sesión");
            expect(textoSesion.textContent).to.equal("Sin sesión iniciada");
        });
        it("la solicitud de consulta es publica: se abre sin iniciar sesion", async () => {
            app.irA("solicitar"); await esperar();
            expect(titulo()).to.equal("Solicitar consulta");
        });
        it("no deja entrar a otra pantalla: lo regresa al login", () => {
            ["consulta", "historial", "persona", "atencion", "cierre"].forEach(p => { app.irA(p); expect(titulo(), p).to.equal("Iniciar sesión"); });
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

    describe("medico", () => {
        beforeEach(() => Sesion.iniciar({ nombre: "Dr House", rol: "Medico", clinica: "Central", idClinica: "c1" }));
        it("el menu tiene Inicio, Atencion, Consultas y Cerrar sesion", () => {
            expect(opciones()).to.deep.equal(["Inicio", "Atención", "Consultas", "Cerrar sesión"]);
        });
        it("el encabezado muestra nombre, rol y clinica", () => {
            expect(textoSesion.textContent).to.equal("Dr House · Medico · Central");
        });
        it("el Inicio tiene una tarjeta por cada pantalla suya", () => {
            expect([...zona.querySelectorAll("galeno-tarjeta-simple")].map(t => t.datos.titulo)).to.deep.equal(["Atención", "Consultas"]);
        });
        it("no puede entrar a Cierre ni al historial de paciente", () => {
            ["cierre", "historial"].forEach(p => { app.irA(p); expect(titulo(), p).to.equal("Bienvenido, Dr House"); });
        });
        it("puede abrir Atencion y Consultas desde el menu", async () => {
            menu.shadowRoot.querySelectorAll("button")[1].click(); await esperar();
            expect(titulo()).to.equal("Atención de consultas");
            menu.shadowRoot.querySelectorAll("button")[2].click(); await esperar();
            expect(titulo()).to.equal("Consultas");
        });
    });

    describe("recepcion", () => {
        beforeEach(() => Sesion.iniciar({ nombre: "Laura", rol: "Recepcionista", clinica: "Central", idClinica: "c1" }));
        it("el menu tiene Inicio, Registrar paciente, Registrar consulta, Sala de espera, Cierre de consulta y Cerrar sesion", () => {
            expect(opciones()).to.deep.equal(["Inicio", "Registrar paciente", "Registrar consulta", "Sala de espera", "Cierre de consulta", "Cerrar sesión"]);
        });
        it("puede abrir sus cuatro pantallas desde el menu", async () => {
            const abrir = async i => { menu.shadowRoot.querySelectorAll("button")[i].click(); await esperar(); };
            await abrir(1); expect(titulo()).to.equal("Registrar paciente");
            await abrir(2); expect(titulo()).to.equal("Registrar consulta");
            await abrir(3); expect(titulo()).to.equal("Sala de espera");
            await abrir(4); expect(titulo()).to.equal("Cierre de consulta");
        });
        it("no usa la pantalla publica Solicitar consulta (para eso tiene Registrar consulta)", () => {
            app.irA("solicitar");
            expect(titulo()).to.equal("Bienvenido, Laura");
        });
        it("no puede entrar a Atencion", () => {
            app.irA("atencion");
            expect(titulo()).to.equal("Bienvenido, Laura");
        });
    });

    describe("enfermero", () => {
        beforeEach(() => Sesion.iniciar({ nombre: "Marta", rol: "Enfermera", clinica: "Central", idClinica: "c1" }));
        it("el menu tiene Inicio, Enfermeria y Cerrar sesion", () => {
            expect(opciones()).to.deep.equal(["Inicio", "Enfermería", "Cerrar sesión"]);
        });
        it("abre Enfermeria desde el menu y no puede entrar a Atencion", async () => {
            menu.shadowRoot.querySelectorAll("button")[1].click(); await esperar();
            expect(titulo()).to.equal("Enfermería: pasos de las consultas");
            app.irA("atencion");
            expect(titulo()).to.equal("Bienvenido, Marta");
        });
    });

    describe("personal (administrador)", () => {
        beforeEach(() => Sesion.iniciar({ nombre: "Admin", rol: "Administrador", clinica: "Central", idClinica: "c1" }));
        it("el menu tiene Consultas y todas las pantallas de administracion", () => {
            expect(opciones()).to.deep.equal(MENU_ADMIN);
        });
        it("el Inicio tiene una tarjeta por cada pantalla (Consultas + Solicitar + 8 de administracion)", () => {
            expect(zona.querySelectorAll("galeno-tarjeta-simple")).to.have.length(10);
        });
        it("no puede entrar a Atencion, Cierre ni al historial de paciente", () => {
            ["atencion", "cierre", "historial"].forEach(p => { app.irA(p); expect(titulo(), p).to.equal("Bienvenido, Admin"); });
        });
    });

    describe("cerrar sesion", () => {
        it("Cerrar sesion borra la sesion y vuelve al login", () => {
            Sesion.iniciar({ nombre: "Dr House", rol: "Medico", clinica: "Central", idClinica: "c1" });
            const salir = [...menu.shadowRoot.querySelectorAll("button")].find(b => b.textContent === "Cerrar sesión");
            salir.click();
            expect(Sesion.obtener()).to.equal(null);
            expect(opciones()).to.deep.equal(["Iniciar sesión", "Solicitar consulta"]);
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
