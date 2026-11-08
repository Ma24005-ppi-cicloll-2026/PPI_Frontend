// Pruebas de BusquedaConsultaModel: buscar paciente (por nombre o por documento),
// ver sus consultas y abrir el detalle. El backend se reemplaza por fetch falso (sinon.stub).
{  // bloque: evita que 'expect' choque con el de otros archivos de prueba
const { expect } = chai;

// Datos de mentira, como los devolveria el backend
const BD = {
    persona: [
        { idPersona: "p1", nombres: "Ana", apellidos: "Lopez" },
        { idPersona: "p2", nombres: "Beto", apellidos: "Ruiz" }
    ],
    tipo_documento: [
        { idTipoDocumento: "t1", nombre: "DUI", activo: true, expresionRegular: "^\\d{8}-\\d$", indicaciones: "8 dígitos, guion y dígito verificador" },
        { idTipoDocumento: "t2", nombre: "Pasaporte", activo: true, expresionRegular: "", indicaciones: "" }
    ],
    documento: [
        { valor: "01234567-8", idPersona: { idPersona: "p1" }, idTipoDocumento: { idTipoDocumento: "t1", nombre: "DUI" } },
        { valor: "A-1234567", idPersona: { idPersona: "p2" }, idTipoDocumento: { idTipoDocumento: "t2", nombre: "Pasaporte" } }
    ],
    consulta: [
        { idConsulta: "k1", observaciones: "Control", idPersonaRol: { idPersona: { idPersona: "p1" } } },
        { idConsulta: "k2", observaciones: "Ajena", idPersonaRol: { idPersona: { idPersona: "p2" } } }
    ],
    consulta_procedimiento: [
        { idConsultaProcedimiento: "cp1", idConsulta: { idConsulta: "k1" }, idProcedimiento: { nombre: "Rayos X" } },
        { idConsultaProcedimiento: "cp2", idConsulta: { idConsulta: "k2" }, idProcedimiento: { nombre: "Ajeno" } }
    ],
    consulta_procedimiento_paso: [
        { idConsultaProcedimientoPaso: "s1", estado: "FINALIZADO", idConsultaProcedimiento: { idConsultaProcedimiento: "cp1" } },
        { idConsultaProcedimientoPaso: "s2", estado: "X", idConsultaProcedimiento: { idConsultaProcedimiento: "cp2" } }
    ],
    orden_examen: [
        { idOrdenExamen: "o1", indicaciones: "Ayuno 8h", idConsultaProcedimientoPaso: { idConsultaProcedimientoPaso: "s1", estado: "FINALIZADO" } },
        { idOrdenExamen: "o2", indicaciones: "ORDEN AJENA", idConsultaProcedimientoPaso: { idConsultaProcedimientoPaso: "s2" } }
    ],
    examen_resultado: [
        { idExamenResultado: "r1", resultado: "Normal", interpretacion: "Sin hallazgos", idOrdenExamen: { idOrdenExamen: "o1" } },
        { idExamenResultado: "r2", resultado: "RESULTADO AJENO", idOrdenExamen: { idOrdenExamen: "o2" } }
    ]
};

describe("BusquedaConsultaModel", () => {
    let fetchFalso, contenedor, aviso, modelo, datos;

    // el modelo busca el aviso global por su id, como en el index.html
    beforeEach(async () => {
        datos = JSON.parse(JSON.stringify(BD));
        fetchFalso = sinon.stub(window, "fetch").callsFake(async url => {
            const ruta = url.split("/resources/")[1].split("?")[0];
            return new Response(JSON.stringify(datos[ruta] || []), { status: 200 });
        });
        aviso = document.createElement("galeno-notificacion-emergente");
        aviso.id = "aviso";
        contenedor = document.createElement("div");
        document.body.append(aviso, contenedor);
        sinon.spy(aviso, "mostrar");
        modelo = new BusquedaConsultaModel(contenedor);
        modelo.esperaBusqueda = 0;      // en las pruebas no se espera despues de escribir
        await modelo.iniciar();
    });
    afterEach(() => { fetchFalso.restore(); aviso.remove(); contenedor.remove(); });

    const esperar = () => new Promise(r => setTimeout(r, 0));
    const $ = id => contenedor.querySelector("#" + id);
    const textoDe = id => $(id).shadowRoot.textContent;
    function escribir(buscador, texto) {
        const entrada = buscador.shadowRoot.querySelector("#q");
        entrada.value = texto;
        entrada.dispatchEvent(new Event("input"));
    }
    async function elegirPaciente(texto) {
        escribir($("buscaPaciente"), texto);
        $("buscaPaciente").shadowRoot.querySelector("li").click();
        await esperar(); await esperar();
    }

    describe("al iniciar", () => {
        it("carga las personas en el buscador por nombre", () => {
            expect($("buscaPaciente").opciones).to.have.length(2);
        });
        it("carga los tipos de documento en su buscador", () => {
            expect($("buscaTipo").opciones.map(t => t.nombre)).to.deep.equal(["DUI", "Pasaporte"]);
        });
        it("dibuja las 4 pestañas del detalle (la tarjeta de la consulta va arriba, no en una pestaña)", () => {
            const titulos = [...$("pestanas").shadowRoot.querySelectorAll("button")].map(b => b.textContent);
            expect(titulos).to.deep.equal(["Documentos", "Procedimientos", "Órdenes de examen", "Resultados"]);
        });
        it("no tiene boton Buscar: el documento se busca solo", () => {
            expect($("buscarDocumento")).to.equal(null);
        });
        it("deja escondido el detalle", () => {
            expect($("detalle").hidden).to.equal(true);
        });
        it("avisa si el backend falla al cargar", async () => {
            fetchFalso.callsFake(async () => new Response(null, { status: 500 }));
            const otro = document.createElement("div");
            document.body.append(otro);
            await new BusquedaConsultaModel(otro).iniciar();
            expect(aviso.mostrar.lastCall.args[1]).to.equal("error");
            otro.remove();
        });
    });

    describe("buscar por nombre", () => {
        it("muestra solo las consultas del paciente elegido", async () => {
            await elegirPaciente("ana");
            const tarjetas = contenedor.querySelectorAll("#lista galeno-tarjeta-consulta");
            expect(tarjetas).to.have.length(1);
            expect(tarjetas[0].shadowRoot.textContent).to.include("Control");
        });
        it("avisa si el paciente no tiene consultas", async () => {
            datos.consulta = [];
            await elegirPaciente("ana");
            expect(aviso.mostrar.lastCall.args).to.deep.equal(["El paciente no tiene consultas", "info"]);
        });
        it("esconde el detalle y limpia la lista al cambiar de paciente", async () => {
            await elegirPaciente("ana");
            $("detalle").hidden = false;
            await elegirPaciente("beto");
            expect($("detalle").hidden).to.equal(true);
            expect(contenedor.querySelectorAll("#lista galeno-tarjeta-consulta")).to.have.length(1);
        });
    });

    describe("buscar por documento", () => {
        function elegirTipo(texto) {
            escribir($("buscaTipo"), texto);
            $("buscaTipo").shadowRoot.querySelector("li").click();
        }
        // escribe el numero como el usuario; la busqueda arranca sola
        async function escribirNumero(numero) {
            $("numeroDocumento").value = numero;
            $("numeroDocumento").dispatchEvent(new Event("input"));
            for (let i = 0; i < 6; i++) await esperar();
        }
        const ayuda = () => $("ayudaDocumento").textContent;

        it("al elegir el tipo muestra como escribirlo (sus indicaciones) en el campo", () => {
            elegirTipo("dui");
            expect($("numeroDocumento").placeholder).to.equal("8 dígitos, guion y dígito verificador");
        });
        it("si el tipo no tiene indicaciones muestra un texto general", () => {
            elegirTipo("pasa");
            expect($("numeroDocumento").placeholder).to.equal("Escriba el número del documento");
        });
        it("encuentra al paciente solo, sin pulsar nada, y muestra sus consultas", async () => {
            elegirTipo("dui");
            await escribirNumero("01234567-8");
            expect(contenedor.querySelectorAll("#lista galeno-tarjeta-consulta")).to.have.length(1);
            expect(modelo.paciente.idPersona).to.equal("p1");
        });
        it("muestra el nombre del paciente encontrado en el buscador por nombre", async () => {
            elegirTipo("dui");
            await escribirNumero("01234567-8");
            expect($("buscaPaciente").shadowRoot.querySelector("#q").value).to.equal("Ana Lopez");
        });
        it("si el tipo no tiene regex, ignora guiones, espacios y mayusculas", async () => {
            elegirTipo("pasa");
            await escribirNumero(" a1234567 ");
            expect(modelo.paciente.idPersona).to.equal("p2");
        });
        it("avisa si el numero no tiene el formato del tipo (segun su expresion regular)", async () => {
            elegirTipo("dui");
            await escribirNumero("123456789");               // falta el guion
            expect(ayuda()).to.include("no tiene el formato de DUI");
            expect(ayuda()).to.include("8 dígitos, guion y dígito verificador");
            expect(modelo.paciente).to.equal(null);
        });
        it("no busca en el backend si el formato es incorrecto", async () => {
            elegirTipo("dui");
            fetchFalso.resetHistory();
            await escribirNumero("123456789");
            const rutas = fetchFalso.getCalls().map(c => c.args[0]);
            expect(rutas.some(r => r.includes("/documento"))).to.equal(false);
        });
        it("avisa si el formato es correcto pero el documento no existe", async () => {
            elegirTipo("dui");
            await escribirNumero("00000000-0");
            expect(ayuda()).to.equal("No se encontró un paciente con ese documento");
        });
        it("no mezcla tipos: el documento de un DUI no se encuentra como Pasaporte", async () => {
            elegirTipo("pasa");
            await escribirNumero("01234567-8");
            expect(ayuda()).to.include("No se encontró");
            expect(modelo.paciente).to.equal(null);
        });
        it("pide elegir el tipo si se escribe el numero primero", async () => {
            await escribirNumero("01234567-8");
            expect(ayuda()).to.equal("Elija primero el tipo de documento");
        });
        it("busca de nuevo si despues se elige el tipo", async () => {
            await escribirNumero("01234567-8");
            elegirTipo("dui");
            for (let i = 0; i < 6; i++) await esperar();
            expect(modelo.paciente.idPersona).to.equal("p1");
        });
        it("quita el mensaje y los resultados al borrar el numero", async () => {
            elegirTipo("dui");
            await escribirNumero("00000000-0");
            await escribirNumero("");
            expect(ayuda()).to.equal("");
            expect(contenedor.querySelectorAll("#lista galeno-tarjeta-consulta")).to.have.length(0);
        });
        it("limpia las consultas anteriores si el nuevo documento no existe", async () => {
            elegirTipo("dui");
            await escribirNumero("01234567-8");
            await escribirNumero("00000000-0");
            expect(contenedor.querySelectorAll("#lista galeno-tarjeta-consulta")).to.have.length(0);
        });
    });

    describe("detalle de la consulta", () => {
        beforeEach(async () => {
            await elegirPaciente("ana");
            contenedor.querySelector("#lista galeno-tarjeta-consulta").shadowRoot.querySelector("#ver").click();
            for (let i = 0; i < 8; i++) await esperar();
        });

        it("muestra el detalle", () => {
            expect($("detalle").hidden).to.equal(false);
        });
        it("esconde la lista de consultas: la tarjeta no aparece repetida", () => {
            expect($("lista").hidden).to.equal(true);
            expect($("detalle").querySelectorAll("galeno-tarjeta-consulta")).to.have.length(1);
        });
        it("la tarjeta del detalle no tiene boton Ver detalle", () => {
            expect($("tarjeta").shadowRoot.querySelector("#ver")).to.equal(null);
            expect($("tarjeta").shadowRoot.textContent).to.include("Control");
        });
        it("Volver regresa a la lista de consultas", () => {
            $("volver").click();
            expect($("detalle").hidden).to.equal(true);
            expect($("lista").hidden).to.equal(false);
        });
        it("lista los documentos del paciente", () => {
            expect(textoDe("tablaDocumentos")).to.include("01234567-8");
            expect(textoDe("tablaDocumentos")).to.not.include("99999999");
        });
        it("lista solo los procedimientos de esa consulta", () => {
            expect(textoDe("tablaProcedimientos")).to.include("Rayos X");
            expect(textoDe("tablaProcedimientos")).to.not.include("Ajeno");
        });
        it("lista solo las ordenes de examen de esa consulta, con el estado del paso", () => {
            expect(textoDe("tablaOrdenes")).to.include("Ayuno 8h");
            expect(textoDe("tablaOrdenes")).to.include("FINALIZADO");
            expect(textoDe("tablaOrdenes")).to.not.include("AJENA");
        });
        it("lista solo los resultados de esa consulta", () => {
            expect(textoDe("tablaResultados")).to.include("Normal");
            expect(textoDe("tablaResultados")).to.include("Sin hallazgos");
            expect(textoDe("tablaResultados")).to.not.include("AJENO");
        });
    });
});
}