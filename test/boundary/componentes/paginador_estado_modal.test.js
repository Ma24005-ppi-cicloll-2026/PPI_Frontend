// Pruebas de galeno-paginador, galeno-estado-vista y galeno-modal-confirmacion (las usan los listados).
{  // bloque: evita que 'expect' choque con el de otros archivos de prueba
const { expect } = chai;

describe("galeno-paginador", () => {
    let pag, evento;
    beforeEach(() => {
        pag = document.createElement("galeno-paginador");
        document.body.append(pag);
        pag.tamano = 2;
        evento = null;
        pag.addEventListener("galeno-cambiar-pagina", e => { evento = e.detail; });
    });
    afterEach(() => pag.remove());
    const sig = () => pag.shadowRoot.querySelector("#sig");
    const ant = () => pag.shadowRoot.querySelector("#ant");

    it("empieza en la pagina 1 con Anterior bloqueado", () => {
        expect(pag.pagina).to.equal(1);
        expect(pag.primero).to.equal(0);
        expect(ant().disabled).to.equal(true);
    });
    it("sin total: habilita Siguiente solo si llegaron tantas filas como el tamaño", () => {
        pag.actualizar(2);
        expect(sig().disabled).to.equal(false);
        pag.actualizar(1);
        expect(sig().disabled).to.equal(true);
    });
    it("Siguiente avanza y emite el primero y el max a pedir", () => {
        pag.actualizar(2);
        sig().click();
        expect(evento).to.deep.equal({ pagina: 2, primero: 2, max: 2 });
        expect(pag.primero).to.equal(2);
    });
    it("Anterior regresa una pagina", () => {
        pag.actualizar(2); sig().click();
        ant().click();
        expect(evento.pagina).to.equal(1);
    });
    it("con total muestra 'Pagina 1 de 3' y deja de avanzar en la ultima", () => {
        pag.actualizar(2, 5);
        expect(pag.shadowRoot.textContent).to.include("de 3");
        sig().click(); pag.actualizar(2, 5);
        sig().click(); pag.actualizar(1, 5);
        expect(pag.pagina).to.equal(3);
        expect(sig().disabled).to.equal(true);
    });
    it("reiniciar() vuelve a la pagina 1", () => {
        pag.actualizar(2); sig().click();
        pag.reiniciar();
        expect(pag.pagina).to.equal(1);
    });
    it("ir() no baja de la pagina 1", () => {
        pag.ir(0);
        expect(evento).to.equal(null);
    });
});

describe("galeno-estado-vista", () => {
    let estado;
    beforeEach(() => { estado = document.createElement("galeno-estado-vista"); document.body.append(estado); });
    afterEach(() => estado.remove());

    it("cargando muestra un texto de espera", () => {
        estado.mostrar("cargando");
        expect(estado.shadowRoot.textContent).to.include("Cargando");
    });
    it("vacio muestra que no hay registros", () => {
        estado.mostrar("vacio");
        expect(estado.shadowRoot.textContent).to.include("No hay registros");
    });
    it("error muestra el mensaje y el boton Reintentar, que emite galeno-reintentar", () => {
        let reintentado = false;
        estado.addEventListener("galeno-reintentar", () => { reintentado = true; });
        estado.mostrar("error", "No se pudo listar");
        expect(estado.shadowRoot.textContent).to.include("No se pudo listar");
        estado.shadowRoot.querySelector("#reintentar").click();
        expect(reintentado).to.equal(true);
    });
    it("no interpreta HTML en el mensaje", () => {
        estado.mostrar("error", "<b>falla</b>");
        expect(estado.shadowRoot.querySelector("b")).to.equal(null);
    });
    it("contenido no dibuja nada", () => {
        estado.mostrar("cargando");
        estado.mostrar("contenido");
        expect(estado.shadowRoot.innerHTML).to.equal("");
    });
});

describe("galeno-modal-confirmacion", () => {
    let modal;
    beforeEach(() => { modal = document.createElement("galeno-modal-confirmacion"); document.body.append(modal); });
    afterEach(() => modal.remove());
    const fondo = () => modal.shadowRoot.querySelector("#fondo");

    it("empieza escondido", () => {
        expect(fondo().hidden).to.equal(true);
    });
    it("abrir() lo muestra con el mensaje", () => {
        modal.abrir("¿Eliminar?");
        expect(fondo().hidden).to.equal(false);
        expect(modal.shadowRoot.querySelector("#mensaje").textContent).to.equal("¿Eliminar?");
    });
    it("Confirmar cierra y emite galeno-confirmar", () => {
        let confirmado = false;
        modal.addEventListener("galeno-confirmar", () => { confirmado = true; });
        modal.abrir("x");
        modal.shadowRoot.querySelector("#si").click();
        expect(confirmado).to.equal(true);
        expect(fondo().hidden).to.equal(true);
    });
    it("Cancelar cierra y emite galeno-cancelar, sin confirmar", () => {
        let confirmado = false, cancelado = false;
        modal.addEventListener("galeno-confirmar", () => { confirmado = true; });
        modal.addEventListener("galeno-cancelar", () => { cancelado = true; });
        modal.abrir("x");
        modal.shadowRoot.querySelector("#no").click();
        expect(cancelado).to.equal(true);
        expect(confirmado).to.equal(false);
        expect(fondo().hidden).to.equal(true);
    });
});
}
