{
const { expect } = chai;

describe("DatosClinica", () => {
    it("nombre une nombres y apellidos y tolera datos faltantes", () => {
        expect(new DatosClinica().nombre({ nombres: "Ana", apellidos: "López" })).to.equal("Ana López");
        expect(new DatosClinica().nombre({ nombres: "Ana" })).to.equal("Ana");
        expect(new DatosClinica().nombre(null)).to.equal("");
    });
    it("normalizar ignora tildes, mayusculas y espacios repetidos", () => {
        expect(new DatosClinica().normalizar("  José   PÉREZ ")).to.equal("jose perez");
        expect(new DatosClinica().normalizar(null)).to.equal("");
    });
    describe("esDeClinica", () => {
        it("acepta si es de la misma clinica", () => expect(new DatosClinica().esDeClinica({ idClinica: { idClinica: "c1" } }, "c1")).to.equal(true));
        it("rechaza si es de otra", () => expect(new DatosClinica().esDeClinica({ idClinica: { idClinica: "c2" } }, "c1")).to.equal(false));
        it("no descarta si el dato de la clinica no vino", () => expect(new DatosClinica().esDeClinica({}, "c1")).to.equal(true));
    });
    it("masRecientePrimero ordena por fecha sin cambiar la lista original", () => {
        const original = [{ f: "2026-01-01T00:00:00Z[UTC]" }, { f: "2026-03-01T00:00:00Z[UTC]" }, { f: "2026-02-01T00:00:00Z[UTC]" }];
        const ordenada = new DatosClinica().masRecientePrimero(original, "f");
        expect(ordenada.map(x => x.f.slice(5, 7))).to.deep.equal(["03", "02", "01"]);
        expect(original[0].f.slice(5, 7)).to.equal("01");
    });
    it("los estados de paso incluyen Completado", () => {
        expect(new DatosClinica().estadosPaso.map(e => e.nombre)).to.include(new DatosClinica().completado);
    });
});
}
