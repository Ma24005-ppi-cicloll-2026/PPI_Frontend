// Pruebas de galeno-menu (el menu del <nav>) y galeno-notificacion-emergente (los avisos).
{  // bloque: evita que 'expect' choque con el de otros archivos de prueba
const { expect } = chai;

describe("galeno-menu", () => {
    let menu;
    beforeEach(() => {
        menu = document.createElement("galeno-menu");
        document.body.append(menu);
        menu.items = [{ texto: "Inicio", destino: "inicio" }, { texto: "Consultas", destino: "consulta" }];
    });
    afterEach(() => menu.remove());

    const botones = () => [...menu.shadowRoot.querySelectorAll("button")];

    it("dibuja una opcion por item", () => {
        expect(botones().map(b => b.textContent)).to.deep.equal(["Inicio", "Consultas"]);
    });
    it("marca la opcion activa", () => {
        menu.activo = "consulta";
        expect(botones()[1].getAttribute("aria-current")).to.equal("page");
        expect(botones()[0].getAttribute("aria-current")).to.equal(null);
    });
    it("emite galeno-navegar con el destino y cambia la opcion activa", () => {
        let destino = null;
        menu.addEventListener("galeno-navegar", e => { destino = e.detail.destino; });
        botones()[1].click();
        expect(destino).to.equal("consulta");
        expect(menu.activo).to.equal("consulta");
    });
    it("acepta una lista vacia o invalida", () => {
        menu.items = null;
        expect(botones()).to.have.length(0);
    });
});

describe("galeno-notificacion-emergente", () => {
    let aviso, reloj;
    beforeEach(() => {
        reloj = sinon.useFakeTimers();       // controla el tiempo para no esperar 4 segundos de verdad
        aviso = document.createElement("galeno-notificacion-emergente");
        document.body.append(aviso);
    });
    afterEach(() => { aviso.remove(); reloj.restore(); });

    const caja = () => aviso.shadowRoot.querySelector("#caja");

    it("empieza escondida", () => {
        expect(caja().hidden).to.equal(true);
    });
    it("muestra el mensaje con el tipo indicado", () => {
        aviso.mostrar("Guardado", "exito");
        expect(caja().hidden).to.equal(false);
        expect(caja().textContent).to.equal("Guardado");
        expect(caja().className).to.equal("exito");
    });
    it("usa el tipo info por defecto", () => {
        aviso.mostrar("Hola");
        expect(caja().className).to.equal("info");
    });
    it("se esconde sola despues de 4 segundos", () => {
        aviso.mostrar("Hola");
        reloj.tick(3999);
        expect(caja().hidden).to.equal(false);
        reloj.tick(1);
        expect(caja().hidden).to.equal(true);
    });
    it("un aviso nuevo reinicia el tiempo del anterior", () => {
        aviso.mostrar("Uno");
        reloj.tick(3000);
        aviso.mostrar("Dos");
        reloj.tick(3000);
        expect(caja().hidden).to.equal(false);
        expect(caja().textContent).to.equal("Dos");
    });
    it("no interpreta HTML en el mensaje", () => {
        aviso.mostrar("<b>x</b>", "error");
        expect(aviso.shadowRoot.querySelector("#caja b")).to.equal(null);
    });
    it("se puede cerrar con el boton del toast y con Escape", () => {
        aviso.mostrar("Hola");
        aviso.shadowRoot.querySelector("#caja .cerrar").click();
        expect(caja().hidden).to.equal(true);
        aviso.mostrar("Otra vez");
        aviso.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
        expect(caja().hidden).to.equal(true);
    });
    it("lleva barra de tiempo ajustada a la duracion y color por tipo", () => {
        aviso.mostrar("Hola", "aviso", 2500);
        const barra = aviso.shadowRoot.querySelector("#caja .barra");
        expect(barra).to.not.equal(null);
        expect(barra.style.animationDuration).to.equal("2500ms");
        expect(caja().className).to.equal("aviso");
        expect(aviso.shadowRoot.querySelector("#caja .icono")).to.not.equal(null);
    });
});
}
