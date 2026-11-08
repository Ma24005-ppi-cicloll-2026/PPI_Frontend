// Pruebas de galeno-tabla (la que muestra documentos, procedimientos, ordenes y resultados).
{  // bloque: evita que 'expect' choque con el de otros archivos de prueba
const { expect } = chai;

describe("galeno-tabla", () => {
    let tabla;
    beforeEach(() => {
        tabla = document.createElement("galeno-tabla");
        document.body.append(tabla);
        tabla.columnas = [
            { campo: "valor", titulo: "Numero" },
            { campo: "idTipoDocumento", titulo: "Tipo", formato: t => t?.nombre },
            { campo: "activo", titulo: "Activo" }
        ];
    });
    afterEach(() => tabla.remove());

    const filasDibujadas = () => tabla.shadowRoot.querySelectorAll("tbody tr");
    const textoCeldas = fila => [...fila.querySelectorAll("td")].map(td => td.textContent);

    it("dibuja los titulos de las columnas", () => {
        const titulos = [...tabla.shadowRoot.querySelectorAll("th")].map(th => th.textContent);
        expect(titulos.slice(0, 3)).to.deep.equal(["Numero", "Tipo", "Activo"]);
    });
    it("dibuja una fila por registro", () => {
        tabla.filas = [{ valor: "1" }, { valor: "2" }];
        expect(filasDibujadas()).to.have.length(2);
    });
    it("usa la funcion formato de la columna", () => {
        tabla.filas = [{ valor: "1", idTipoDocumento: { nombre: "DUI" } }];
        expect(textoCeldas(filasDibujadas()[0])[1]).to.equal("DUI");
    });
    it("muestra Si/No en los booleanos y un guion en los vacios", () => {
        tabla.filas = [{ valor: "1", activo: true }, { valor: "2", activo: false }, { valor: "" }];
        expect(textoCeldas(filasDibujadas()[0])[2]).to.equal("Sí");
        expect(textoCeldas(filasDibujadas()[1])[2]).to.equal("No");
        expect(textoCeldas(filasDibujadas()[2])[0]).to.equal("—");
    });
    it("muestra un mensaje cuando no hay registros", () => {
        tabla.filas = [];
        expect(tabla.shadowRoot.textContent).to.include("No hay registros");
    });
    it("no interpreta HTML que venga en los datos", () => {
        tabla.filas = [{ valor: "<b>malo</b>" }];
        expect(tabla.shadowRoot.querySelector("tbody b")).to.equal(null);
        expect(textoCeldas(filasDibujadas()[0])[0]).to.equal("<b>malo</b>");
    });

    describe("botones", () => {
        beforeEach(() => { tabla.filas = [{ valor: "1" }]; });
        it("dibuja Editar y Eliminar por defecto", () => {
            expect(tabla.shadowRoot.querySelectorAll("tbody button")).to.have.length(2);
        });
        it("emite galeno-editar y galeno-eliminar con la fila", () => {
            const eventos = [];
            tabla.addEventListener("galeno-editar", e => eventos.push(["editar", e.detail.fila.valor]));
            tabla.addEventListener("galeno-eliminar", e => eventos.push(["eliminar", e.detail.fila.valor]));
            tabla.shadowRoot.querySelector(".ed").click();
            tabla.shadowRoot.querySelector(".el").click();
            expect(eventos).to.deep.equal([["editar", "1"], ["eliminar", "1"]]);
        });
        it("con solo-lectura no dibuja botones ni la columna de acciones", () => {
            tabla.setAttribute("solo-lectura", "");
            tabla.filas = [{ valor: "1" }];
            expect(tabla.shadowRoot.querySelectorAll("button")).to.have.length(0);
            expect(tabla.shadowRoot.querySelectorAll("th")).to.have.length(3);
        });
    });
});
}
