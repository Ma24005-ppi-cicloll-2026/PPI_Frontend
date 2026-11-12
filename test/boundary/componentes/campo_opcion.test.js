// Pruebas de <galeno-campo> y <galeno-opcion>.
{
const { expect } = chai;

describe("<galeno-campo>", () => {
    let campo;
    const entrada = () => campo.shadowRoot.querySelector("input");
    beforeEach(() => { campo = document.createElement("galeno-campo"); campo.setAttribute("label", "Nombre"); campo.setAttribute("ayuda", "Su nombre completo"); document.body.append(campo); });
    afterEach(() => campo.remove());

    it("muestra la etiqueta y la ayuda", () => {
        expect(campo.shadowRoot.querySelector("label").textContent).to.equal("Nombre");
        expect(campo.shadowRoot.querySelector("#ayuda").textContent).to.equal("Su nombre completo");
    });
    it("value devuelve lo escrito y emite galeno-cambio", () => {
        let recibido = null; campo.addEventListener("galeno-cambio", e => { recibido = e.detail.valor; });
        Ayuda.escribir(campo, "Ana");
        expect(campo.value).to.equal("Ana");
        expect(recibido).to.equal("Ana");
    });
    it("se puede asignar value desde afuera", () => { campo.value = "Luis"; expect(entrada().value).to.equal("Luis"); });
    it("error() muestra el mensaje, lo marca como invalido y se puede quitar", () => {
        campo.error("Falta");
        expect(campo.shadowRoot.querySelector("#error").textContent).to.equal("Falta");
        expect(entrada().getAttribute("aria-invalid")).to.equal("true");
        campo.error("");
        expect(entrada().getAttribute("aria-invalid")).to.equal("false");
    });
    it("el mensaje de error se anuncia (role=alert)", () => {
        expect(campo.shadowRoot.querySelector("#error").getAttribute("role")).to.equal("alert");
    });
    it("escapa el HTML de la etiqueta", () => {
        const c = document.createElement("galeno-campo"); c.setAttribute("label", "<b>x</b>"); document.body.append(c);
        expect(c.shadowRoot.querySelector("label b")).to.equal(null);
        c.remove();
    });
    it("tipo checkbox: value es true/false y emite galeno-cambio", () => {
        const c = document.createElement("galeno-campo"); c.setAttribute("type", "checkbox"); c.setAttribute("label", "Recordarme"); document.body.append(c);
        let valor = null; c.addEventListener("galeno-cambio", e => { valor = e.detail.valor; });
        expect(c.value).to.equal(false);
        c.shadowRoot.querySelector("input").click();
        expect(c.value).to.equal(true);
        expect(valor).to.equal(true);
        c.remove();
    });
});

describe("<galeno-opcion>", () => {
    let o;
    const boton = () => o.shadowRoot.querySelector("button");
    beforeEach(() => { o = document.createElement("galeno-opcion"); document.body.append(o); });
    afterEach(() => o.remove());

    it("muestra titulo, detalle e imagen (svg)", () => {
        o.datos = { id: "c1", titulo: "Clínica Central", detalle: "General", icono: "cruz" };
        expect(o.shadowRoot.querySelector("strong").textContent).to.equal("Clínica Central");
        expect(o.shadowRoot.querySelector("small").textContent).to.equal("General");
        expect(o.shadowRoot.querySelector("svg")).to.not.equal(null);
    });
    it("al elegirla emite galeno-elegir con su id", () => {
        let id = null; o.addEventListener("galeno-elegir", e => { id = e.detail.id; });
        o.datos = { id: "c1", titulo: "X" };
        boton().click();
        expect(id).to.equal("c1");
    });
    it("si esta inactiva no se puede elegir y dice 'No disponible'", () => {
        let emitido = 0; o.addEventListener("galeno-elegir", () => emitido++);
        o.datos = { id: "c1", titulo: "X", activo: false };
        expect(boton().disabled).to.equal(true);
        expect(o.shadowRoot.textContent).to.contain("No disponible");
        boton().click();
        expect(emitido).to.equal(0);
    });
    it("seleccionada se marca con aria-pressed y una marca visible", () => {
        o.datos = { id: "c1", titulo: "X" };
        expect(boton().getAttribute("aria-pressed")).to.equal("false");
        o.seleccionada = true;
        expect(boton().getAttribute("aria-pressed")).to.equal("true");
        expect(o.shadowRoot.querySelector(".marca")).to.not.equal(null);
    });
    it("con sin-icono no dibuja la imagen", () => {
        o.setAttribute("sin-icono", ""); o.datos = { id: "p", titulo: "Rayos X" };
        expect(o.shadowRoot.querySelector("svg")).to.equal(null);
    });
    it("el titulo no interpreta HTML", () => {
        o.datos = { id: "x", titulo: "<img src=x onerror=alert(1)>" };
        expect(o.shadowRoot.querySelector("img")).to.equal(null);
    });
    describe("iconoPara", () => {
        [["Cardiología", "corazon"], ["Odontología", "diente"], ["Oftalmología", "ojo"], ["Pediatría", "bebe"],
         ["Emergencias", "cruz"], ["Otra cosa", "general"], [null, "general"]].forEach(([texto, esperado]) =>
            it(`"${texto}" usa el icono ${esperado}`, () => expect(GalenoOpcion.iconoPara(texto)).to.equal(esperado)));
    });
});
}
