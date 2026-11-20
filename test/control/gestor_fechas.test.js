{
const { expect } = chai;

describe("GestorFechas", () => {
    describe("leer", () => {
        it("quita el sufijo [UTC] que agrega el backend", () => {
            const fecha = new GestorFechas().leer("2026-11-04T15:17:01Z[UTC]");
            expect(fecha).to.be.instanceOf(Date);
            expect(fecha.toISOString()).to.equal("2026-11-04T15:17:01.000Z");
        });
        it("lee una fecha sin sufijo", () => {
            expect(new GestorFechas().leer("2026-11-04T15:17:01Z")).to.be.instanceOf(Date);
        });
        it("devuelve null si la fecha no es valida", () => {
            expect(new GestorFechas().leer("no es fecha")).to.equal(null);
        });
    });

    describe("aFecha", () => {
        it("muestra solo el dia, sin saltar al dia anterior (medianoche UTC)", () => {
            expect(new GestorFechas().aFecha("2000-01-05T00:00:00Z[UTC]")).to.match(/^0?5\/0?1\/2000$/);
        });
        it("devuelve un guion si no hay fecha", () => {
            expect(new GestorFechas().aFecha(null)).to.equal("—");
            expect(new GestorFechas().aFecha("")).to.equal("—");
        });
        it("devuelve un guion si la fecha es invalida", () => {
            expect(new GestorFechas().aFecha("basura")).to.equal("—");
        });
    });

    describe("aFechaHora", () => {
        it("incluye el año de la fecha", () => {
            expect(new GestorFechas().aFechaHora("2026-11-04T15:17:01Z[UTC]")).to.include("2026");
        });
        it("devuelve un guion si no hay fecha o es invalida", () => {
            expect(new GestorFechas().aFechaHora(undefined)).to.equal("—");
            expect(new GestorFechas().aFechaHora("basura")).to.equal("—");
        });
    });
});
}
