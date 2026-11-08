// Pruebas de galeno-pestanas (las 5 pestañas del detalle de la consulta).
{  // bloque: evita que 'expect' choque con el de otros archivos de prueba
const { expect } = chai;

describe("galeno-pestanas", () => {
    let pestanas;
    beforeEach(() => {
        pestanas = document.createElement("galeno-pestanas");
        pestanas.innerHTML = '<div slot="p0">A</div><div slot="p1">B</div><div slot="p2">C</div>';
        document.body.append(pestanas);
        pestanas.titulos = ["Uno", "Dos", "Tres"];
    });
    afterEach(() => pestanas.remove());

    const botones = () => [...pestanas.shadowRoot.querySelectorAll("button")];
    const slotActivo = () => pestanas.shadowRoot.querySelector("slot").name;

    it("dibuja un boton por titulo", () => {
        expect(botones().map(b => b.textContent)).to.deep.equal(["Uno", "Dos", "Tres"]);
    });
    it("empieza en la primera pestaña", () => {
        expect(slotActivo()).to.equal("p0");
        expect(botones()[0].getAttribute("aria-selected")).to.equal("true");
    });
    it("cambia de pestaña al pulsar un boton", () => {
        botones()[2].click();
        expect(slotActivo()).to.equal("p2");
        expect(botones()[2].getAttribute("aria-selected")).to.equal("true");
        expect(botones()[0].getAttribute("aria-selected")).to.equal("false");
    });
    it("emite galeno-cambiar-pestana con el indice y el titulo", () => {
        let detalle = null;
        pestanas.addEventListener("galeno-cambiar-pestana", e => { detalle = e.detail; });
        botones()[1].click();
        expect(detalle).to.deep.equal({ indice: 1, titulo: "Dos" });
    });
    it("ignora un indice que no existe", () => {
        pestanas.activar(9);
        pestanas.activar(-1);
        expect(slotActivo()).to.equal("p0");
    });
    it("vuelve a la primera pestaña si se cambian los titulos", () => {
        botones()[2].click();
        pestanas.titulos = ["X", "Y"];
        expect(slotActivo()).to.equal("p0");
    });
});
}
