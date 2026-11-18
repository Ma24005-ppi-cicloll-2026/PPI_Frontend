{
const { expect } = chai;

// Carga una captura para comprobar sus dimensiones reales.
const cargarImagen = src => new Promise((resuelta, rechazada) => {
    const imagen = new Image();
    imagen.onload = () => resuelta(imagen);
    imagen.onerror = () => rechazada(new Error("No se pudo cargar " + src));
    imagen.src = "/src/" + src;
});

describe("manifest web", () => {
    let manifest;

    // Prepara el entorno de las pruebas.
    before(async () => {
        const respuesta = await fetch("/src/manifest.webmanifest");
        manifest = await respuesta.json();
    });

    it("declara las capturas con src, sizes, type y form_factor validos", () => {
        expect(manifest.screenshots).to.be.an("array").with.lengthOf(2);
        for (const captura of manifest.screenshots) {
            expect(captura.src, "src de la captura").to.match(/^recursos\/capturas\/[\w.-]+\.png$/);
            expect(captura.sizes, "sizes de la captura").to.match(/^\d+x\d+$/);
            expect(captura.type, "type de la captura").to.equal("image/png");
            expect(captura.form_factor, "form_factor de la captura").to.be.oneOf(["wide", "narrow"]);
            expect(captura.label, "label de la captura").to.be.a("string").that.is.not.empty;
        }
        const factores = manifest.screenshots.map(c => c.form_factor);
        expect(factores, "una captura de escritorio y una de movil").to.include("wide");
        expect(factores).to.include("narrow");
    });

    it("sizes coincide con los pixeles reales de cada imagen", async () => {
        for (const captura of manifest.screenshots) {
            const imagen = await cargarImagen(captura.src);
            expect(captura.sizes, captura.src).to.equal(imagen.naturalWidth + "x" + imagen.naturalHeight);
        }
    });
});
}
