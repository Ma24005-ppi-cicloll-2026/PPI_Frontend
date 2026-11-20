{
const { expect } = chai;
describe("Documentos", () => {
    const dui = { idTipoDocumento: "t1", nombre: "DUI", indicaciones: "00000000-0", expresionRegular: "^\\d{8}-\\d$" };
    it("limpio ignora guiones, espacios y mayusculas", () => {
        expect(new Documentos().limpio(" 01234567-8 ")).to.equal("012345678");
        expect(new Documentos().limpio("a 123-4567")).to.equal("a1234567");
        expect(new Documentos().limpio(null)).to.equal("");
    });
    it("formatoValido usa la expresion regular del tipo", () => {
        expect(new Documentos().formatoValido(dui, "01234567-8")).to.equal(true);
        expect(new Documentos().formatoValido(dui, "0123")).to.equal(false);
    });
    it("formatoValido no exige nada si el tipo no tiene expresion o es invalida", () => {
        expect(new Documentos().formatoValido({ nombre: "X" }, "lo que sea")).to.equal(true);
        expect(new Documentos().formatoValido({ expresionRegular: "(" }, "x")).to.equal(true);
    });
    it("mensajeFormato incluye el nombre y las indicaciones", () => {
        expect(new Documentos().mensajeFormato(dui)).to.equal("No tiene el formato de DUI: 00000000-0");
        expect(new Documentos().mensajeFormato({ nombre: "NIT" })).to.equal("No tiene el formato de NIT");
    });
    const docs = [
        { idPersona: { idPersona: "p1" }, idTipoDocumento: { idTipoDocumento: "t1" }, valor: "01234567-8" },
        { idPersona: { idPersona: "p2" }, idTipoDocumento: { idTipoDocumento: "t2" }, valor: "01234567-8" },
        { idPersona: { idPersona: "p1" }, idTipoDocumento: { idTipoDocumento: "t1" }, valor: "01234567-8" }];
    it("personasConDocumento busca por tipo y numero, sin repetir personas", () => {
        expect(new Documentos().personasConDocumento(docs, dui, "012345678")).to.deep.equal(["p1"]);
        expect(new Documentos().personasConDocumento(docs, dui, "99999999-9")).to.deep.equal([]);
    });
    it("primero devuelve el documento de una persona", () => {
        expect(new Documentos().primero(docs, "p2")).to.equal("01234567-8");
        expect(new Documentos().primero(docs, "nadie")).to.equal("");
    });
});
}
