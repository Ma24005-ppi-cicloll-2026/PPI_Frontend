// Pruebas de la navegacion SPA: cada pantalla tiene su direccion (#/pantalla) y funcionan Atras/Adelante.
{
const { expect } = chai;

describe("AppModel · direcciones (SPA)", () => {
    let fetchFalso, menu, zona, textoSesion, aviso, app;
    const esperar = (ms = 0) => new Promise(r => setTimeout(r, ms));
    const titulo = () => zona.querySelector("h2")?.textContent;

    // Cambia la direccion y espera el evento hashchange (o hasta 1 segundo), como hace el navegador al escribir una URL
    const irAHash = hash => new Promise(resolver => {
        const fin = () => { window.removeEventListener("hashchange", fin); setTimeout(resolver, 0); };
        window.addEventListener("hashchange", fin);
        location.hash = hash;
        setTimeout(fin, 1000);
    });

    function montar() {
        menu = document.createElement("galeno-menu"); menu.id = "menu";
        zona = document.createElement("div"); zona.id = "pantalla";
        textoSesion = document.createElement("span"); textoSesion.id = "sesion";
        aviso = document.createElement("galeno-notificacion-emergente"); aviso.id = "aviso";
        document.body.append(menu, zona, textoSesion, aviso);
        app = new AppModel();
    }
    beforeEach(() => {
        fetchFalso = sinon.stub(window, "fetch").callsFake(async () => new Response("[]", { status: 200 }));
        Sesion.cerrar();
        history.replaceState(null, "", location.pathname + location.search);   // sin # al empezar
    });
    afterEach(() => {
        app.destruir(); fetchFalso.restore(); [menu, zona, textoSesion, aviso].forEach(e => e.remove());
        Sesion.cerrar(); history.replaceState(null, "", location.pathname + location.search);
    });

    it("al mostrar una pantalla, la direccion cambia a #/pantalla", () => {
        montar(); app.iniciar();
        expect(location.hash).to.equal("#/login");
        Sesion.iniciar({ idPersona: "p1", nombre: "Ana", rol: "Paciente" });
        expect(location.hash).to.equal("#/inicio");
        app.irA("historial");
        expect(location.hash).to.equal("#/historial");
    });
    it("el titulo de la pestaña indica la pantalla", () => {
        montar(); app.iniciar();
        expect(document.title).to.equal("Iniciar sesión · GalenoSV");
        Sesion.iniciar({ idPersona: "p1", nombre: "Ana", rol: "Paciente" });
        expect(document.title).to.equal("GalenoSV");
    });
    it("el boton Atras del navegador vuelve a la pantalla anterior", async () => {
        montar(); app.iniciar();
        Sesion.iniciar({ idPersona: "p1", nombre: "Ana", rol: "Paciente" });
        app.irA("historial"); await esperar();
        expect(titulo()).to.equal("Mi historial médico");
        // Atras cambia la URL a la entrada anterior y el navegador avisa con "hashchange".
        // Se simula igual (sin history.back(), que en algunos navegadores tarda): asi la prueba es estable.
        history.replaceState(null, "", "#/inicio");
        window.dispatchEvent(new HashChangeEvent("hashchange"));
        await esperar();
        expect(location.hash).to.equal("#/inicio");
        expect(titulo()).to.equal("Bienvenido, Ana");
    });
    it("escribir una direccion permitida abre esa pantalla", async () => {
        montar(); app.iniciar();
        Sesion.iniciar({ idPersona: "p1", nombre: "Ana", rol: "Paciente" });
        await irAHash("#/historial");
        expect(titulo()).to.equal("Mi historial médico");
    });
    it("escribir una direccion sin permiso no deja entrar y corrige la URL", async () => {
        montar(); app.iniciar();
        Sesion.iniciar({ idPersona: "p1", nombre: "Ana", rol: "Paciente" });
        await irAHash("#/persona");
        expect(titulo()).to.equal("Bienvenido, Ana");
        expect(location.hash).to.equal("#/inicio");
    });
    it("sin sesion cualquier direccion lleva al login", async () => {
        montar(); app.iniciar();
        await irAHash("#/consulta");
        expect(titulo()).to.equal("Iniciar sesión");
        expect(location.hash).to.equal("#/login");
    });
    it("una direccion que no existe se ignora", async () => {
        montar(); app.iniciar();
        await irAHash("#/no-existe");
        expect(titulo()).to.equal("Iniciar sesión");
    });
    it("al recargar con una sesion activa se respeta la direccion (#/historial)", async () => {
        Sesion.iniciar({ idPersona: "p1", nombre: "Ana", rol: "Paciente" });
        location.hash = "#/historial";
        montar(); app.iniciar(); await esperar();
        expect(titulo()).to.equal("Mi historial médico");
    });
    it("al iniciar o cerrar sesion siempre empieza en Inicio o Login, aunque la URL diga otra cosa", async () => {
        montar(); app.iniciar();
        Sesion.iniciar({ idPersona: "p1", nombre: "Ana", rol: "Paciente" });
        app.irA("historial");
        Sesion.cerrar();
        expect(titulo()).to.equal("Iniciar sesión");
        expect(location.hash).to.equal("#/login");
    });
});
}
