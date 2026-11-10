// Pruebas de GeneradorPdf: el PDF que se baja (ticket/resumen) esta bien formado.
{
const { expect } = chai;
const comoTexto = bytes => Array.from(bytes, b => String.fromCharCode(b)).join("");

describe("GeneradorPdf", () => {
    const datos = { titulo: "Resumen de consulta", subtitulo: "Paciente: Ana López",
        secciones: [{ titulo: "Datos", filas: [["Inicio", "04/11/2026"], ["Observaciones", "Dolor de cabeza"]] }], pie: "GalenoSV" };

    it("genera bytes que empiezan y terminan como un PDF", () => {
        const texto = comoTexto(new GeneradorPdf().generar(datos));
        expect(texto.startsWith("%PDF-1.4")).to.equal(true);
        expect(texto.endsWith("%%EOF")).to.equal(true);
    });
    it("incluye el titulo, los datos y el numero de pagina", () => {
        const texto = comoTexto(new GeneradorPdf().generar(datos));
        ["Resumen de consulta", "Paciente: Ana L", "Dolor de cabeza", "GalenoSV", "Página 1 de 1"]
            .forEach(t => expect(texto, t).to.contain(t));
    });
    it("la tabla xref apunta exactamente al inicio de cada objeto", () => {
        const texto = comoTexto(new GeneradorPdf().generar(datos));
        const inicio = Number(texto.match(/startxref\n(\d+)/)[1]);
        expect(texto.slice(inicio, inicio + 4)).to.equal("xref");
        const entradas = [...texto.slice(inicio).matchAll(/(\d{10}) 00000 n /g)].map(m => Number(m[1]));
        entradas.forEach((pos, i) => expect(texto.slice(pos, pos + 7), `objeto ${i + 1}`).to.equal(`${i + 1} 0 obj`));
    });
    it("escapa los parentesis y la barra para no romper el PDF", () => {
        const g = new GeneradorPdf();
        expect(g.codificar("a (b) c\\d")).to.equal("a \\(b\\) c\\\\d");
    });
    it("conserva tildes y ñ y cambia lo que no cabe por ?", () => {
        const g = new GeneradorPdf();
        expect(g.codificar("Año áéíóú")).to.equal("Año áéíóú");
        expect(g.codificar("emoji 😀")).to.contain("?");
    });
    it("parte los textos largos en varios renglones", () => {
        const g = new GeneradorPdf();
        const renglones = g.partir("palabra ".repeat(80), 200, 10);
        expect(renglones.length).to.be.greaterThan(5);
        renglones.forEach(r => expect(r.length).to.be.at.most(40));
    });
    it("crea paginas nuevas cuando el contenido no cabe", () => {
        const filas = Array.from({ length: 120 }, (_, i) => ["Campo " + i, "valor " + i]);
        const texto = comoTexto(new GeneradorPdf().generar({ titulo: "Largo", secciones: [{ titulo: "S", filas }] }));
        const paginas = Number(texto.match(/\/Count (\d+)/)[1]);
        expect(paginas).to.be.greaterThan(1);
        expect(texto).to.contain(`Página ${paginas} de ${paginas}`);
    });
    it("una seccion sin filas dice 'Sin registros.'", () => {
        const texto = comoTexto(new GeneradorPdf().generar({ titulo: "T", secciones: [{ titulo: "Vacia", filas: [] }] }));
        expect(texto).to.contain("Sin registros.");
    });
    it("descargar crea un enlace con el nombre del archivo y lo pulsa", () => {
        let enlace = null;
        const original = HTMLAnchorElement.prototype.click;
        HTMLAnchorElement.prototype.click = function () { enlace = this; };
        try { GeneradorPdf.descargar(new Uint8Array([37, 80, 68, 70]), "ticket.pdf"); }
        finally { HTMLAnchorElement.prototype.click = original; }
        expect(enlace.download).to.equal("ticket.pdf");
        expect(enlace.href).to.match(/^blob:/);
    });
});
}
