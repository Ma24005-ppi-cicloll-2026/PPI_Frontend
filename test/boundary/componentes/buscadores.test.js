// Pruebas de autocomplete y de los buscadores que heredan de el
// (buscador_persona y buscador_tipo_documentos).
{  // bloque: evita que 'expect' choque con el de otros archivos de prueba
const { expect } = chai;

// Escribe en el campo de busqueda del componente, como lo haria el usuario
function escribir(componente, texto) {
    const entrada = componente.shadowRoot.querySelector("#q");
    entrada.value = texto;
    entrada.dispatchEvent(new Event("input"));
}
const opcionesVisibles = c => [...c.shadowRoot.querySelectorAll("li")].map(li => li.textContent);

describe("Buscadores", () => {
    let componente;
    afterEach(() => componente.remove());   // limpia el DOM despues de cada prueba

    function crear(etiqueta) {
        componente = document.createElement(etiqueta);
        document.body.append(componente);
        return componente;
    }

    describe("galeno-autocomplete", () => {
        beforeEach(() => {
            crear("galeno-autocomplete");
            componente.opciones = [{ nombre: "Ana" }, { nombre: "Beto" }, { nombre: "Anabel" }];
        });

        it("mantiene la lista escondida mientras no se escribe nada", () => {
            expect(componente.shadowRoot.querySelector("#lista").hidden).to.equal(true);
        });
        it("muestra la lista al escribir", () => {
            escribir(componente, "a");
            expect(componente.shadowRoot.querySelector("#lista").hidden).to.equal(false);
        });
        it("filtra por lo que se escribe (sin importar mayusculas)", () => {
            escribir(componente, "ANA");
            expect(opcionesVisibles(componente)).to.deep.equal(["Ana", "Anabel"]);
        });
        it("avisa cuando no hay resultados", () => {
            escribir(componente, "zzz");
            expect(componente.shadowRoot.querySelector("#ayuda").textContent).to.equal("Sin resultados");
        });
        it("muestra como maximo 10 opciones", () => {
            componente.opciones = Array.from({ length: 25 }, (_, i) => ({ nombre: "Ana " + i }));
            escribir(componente, "ana");
            expect(opcionesVisibles(componente)).to.have.length(10);
        });
        it("emite galeno-seleccion con la opcion elegida", () => {
            let elegido = null;
            componente.addEventListener("galeno-seleccion", e => { elegido = e.detail.valor; });
            escribir(componente, "beto");
            componente.shadowRoot.querySelector("li").click();
            expect(elegido).to.deep.equal({ nombre: "Beto" });
            expect(componente.seleccionado).to.deep.equal({ nombre: "Beto" });
            expect(componente.shadowRoot.querySelector("#q").value).to.equal("Beto");
        });
        it("usa formatoTexto si el Model lo asigna", () => {
            componente.formatoTexto = o => "Dr. " + o.nombre;
            componente.opciones = [{ nombre: "House" }];
            escribir(componente, "dr");
            expect(opcionesVisibles(componente)).to.deep.equal(["Dr. House"]);
        });
        it("usa el atributo campo-texto para elegir que campo mostrar", () => {
            componente.setAttribute("campo-texto", "titulo");
            componente.opciones = [{ titulo: "Clinica Central" }];
            escribir(componente, "central");
            expect(opcionesVisibles(componente)).to.deep.equal(["Clinica Central"]);
        });
        it("limpiar() borra el texto y la seleccion", () => {
            escribir(componente, "ana");
            componente.shadowRoot.querySelector("li").click();
            componente.limpiar();
            expect(componente.seleccionado).to.equal(null);
            expect(componente.shadowRoot.querySelector("#q").value).to.equal("");
        });
        it("ignora una lista que no es arreglo", () => {
            componente.opciones = null;
            expect(componente.opciones).to.deep.equal([]);
        });
    });

    describe("seleccionar() antes de agregar al DOM", () => {
        it("muestra el texto de la opcion ya elegida al dibujarse", () => {
            componente = document.createElement("galeno-autocomplete");
            componente.formatoTexto = o => o.nombre;
            componente.seleccionar({ nombre: "Carla" });
            document.body.append(componente);
            expect(componente.shadowRoot.querySelector("#q").value).to.equal("Carla");
        });
    });

    describe("galeno-buscador-persona", () => {
        beforeEach(() => {
            crear("galeno-buscador-persona");
            componente.opciones = [
                { nombres: "Ana", apellidos: "Lopez" },
                { nombres: "Beto", apellidos: "Ruiz" }
            ];
        });
        it("muestra nombres y apellidos", () => {
            escribir(componente, "beto");
            expect(opcionesVisibles(componente)).to.deep.equal(["Beto Ruiz"]);
        });
        it("tambien busca por apellido", () => {
            escribir(componente, "lopez");
            expect(opcionesVisibles(componente)).to.deep.equal(["Ana Lopez"]);
        });
        it("no falla si a la persona le falta un dato", () => {
            componente.opciones = [{ nombres: "Solo" }];
            escribir(componente, "solo");
            expect(opcionesVisibles(componente)).to.deep.equal(["Solo"]);
        });
    });

    describe("galeno-buscador-tipo-documentos", () => {
        beforeEach(() => {
            crear("galeno-buscador-tipo-documentos");
            componente.opciones = [
                { nombre: "DUI", activo: true },
                { nombre: "Pasaporte viejo", activo: false },
                { nombre: "NIT" }                       // sin dato de activo: se muestra
            ];
        });
        it("oculta los tipos inactivos", () => {
            expect(componente.opciones.map(t => t.nombre)).to.deep.equal(["DUI", "NIT"]);
        });
        it("busca por nombre", () => {
            escribir(componente, "d");
            expect(opcionesVisibles(componente)).to.deep.equal(["DUI"]);
        });
        it("emite galeno-seleccion con el tipo elegido", () => {
            let elegido = null;
            componente.addEventListener("galeno-seleccion", e => { elegido = e.detail.valor; });
            escribir(componente, "nit");
            componente.shadowRoot.querySelector("li").click();
            expect(elegido.nombre).to.equal("NIT");
        });
    });
});
}
