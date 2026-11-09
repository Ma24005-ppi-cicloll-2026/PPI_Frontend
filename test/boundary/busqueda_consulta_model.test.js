// Pruebas de BusquedaConsultaModel (personal de la clinica). El backend se reemplaza por fetch falso.
{  // bloque: evita que 'expect' choque con el de otros archivos de prueba
const { expect } = chai;

const persona = (id, nombres, apellidos) => ({ idPersona: id, nombres, apellidos });
const BD = {
    persona_rol: [
        { idPersonaRol: "pr1", idPersona: persona("p1", "Ana", "Lopez"), idRol: { nombre: "Paciente" }, idClinica: { idClinica: "c1" } },
        { idPersonaRol: "pr2", idPersona: persona("p2", "Beto", "Ruiz"), idRol: { nombre: "Paciente" }, idClinica: { idClinica: "c1" } },
        { idPersonaRol: "pr3", idPersona: persona("p3", "Cami", "Otra"), idRol: { nombre: "Paciente" }, idClinica: { idClinica: "c9" } },
        { idPersonaRol: "pr9", idPersona: persona("m1", "Dr", "House"), idRol: { nombre: "Medico" }, idClinica: { idClinica: "c1" } }
    ],
    tipo_documento: [
        { idTipoDocumento: "t1", nombre: "DUI", activo: true, expresionRegular: "^\\d{8}-\\d$", indicaciones: "8 dígitos, guion y dígito verificador" },
        { idTipoDocumento: "t2", nombre: "Pasaporte", activo: true, expresionRegular: "", indicaciones: "" }
    ],
    documento: [
        { valor: "01234567-8", idPersona: { idPersona: "p1" }, idTipoDocumento: { idTipoDocumento: "t1", nombre: "DUI" } },
        { valor: "A-1234567", idPersona: { idPersona: "p2" }, idTipoDocumento: { idTipoDocumento: "t2", nombre: "Pasaporte" } },
        { valor: "11111111-1", idPersona: { idPersona: "p3" }, idTipoDocumento: { idTipoDocumento: "t1", nombre: "DUI" } }
    ],
    consulta: [
        { idConsulta: "k1", fechaInicio: "2026-01-01T10:00:00Z[UTC]", observaciones: "Control viejo", idPersonaRol: { idPersona: { idPersona: "p1" }, idClinica: { idClinica: "c1" } } },
        { idConsulta: "k4", fechaInicio: "2026-06-01T10:00:00Z[UTC]", observaciones: "Control nuevo", idPersonaRol: { idPersona: { idPersona: "p1" }, idClinica: { idClinica: "c1" } } },
        { idConsulta: "k3", fechaInicio: "2026-03-01T10:00:00Z[UTC]", observaciones: "OTRA CLINICA", idPersonaRol: { idPersona: { idPersona: "p1" }, idClinica: { idClinica: "c9" } } },
        { idConsulta: "k2", observaciones: "Ajena", idPersonaRol: { idPersona: { idPersona: "p2" }, idClinica: { idClinica: "c1" } } }
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

    const iniciarSesion = rol => Sesion.iniciar({ idPersonaRol: "x", idPersona: "px", nombre: "Dr House", rol, clinica: "Central", idClinica: "c1" });
    const esperar = () => new Promise(r => setTimeout(r, 0));
    const $ = id => contenedor.querySelector("#" + id);
    const textoDe = id => $(id).shadowRoot.textContent;
    const tarjetas = () => [...contenedor.querySelectorAll("#lista galeno-tarjeta-consulta")];
    const llamadas = () => fetchFalso.getCalls().map(c => (c.args[1]?.method || "GET") + " " + c.args[0].split("/resources/")[1].split("?")[0]);
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
    async function arrancar(rol) {
        iniciarSesion(rol);
        modelo = new BusquedaConsultaModel(contenedor);
        await modelo.iniciar();
        if (modelo.busquedaDocumento) modelo.busquedaDocumento.esperaBusqueda = 0;
    }

    beforeEach(() => {
        datos = JSON.parse(JSON.stringify(BD));
        fetchFalso = sinon.stub(window, "fetch").callsFake(async (url, opciones = {}) => {
            const ruta = url.split("/resources/")[1].split("?")[0];
            if (opciones.method === "POST") return new Response(opciones.body, { status: 201 });
            return new Response(JSON.stringify(datos[ruta] || []), { status: 200 });
        });
        Sesion.cerrar();
        aviso = document.createElement("galeno-notificacion-emergente");
        aviso.id = "aviso";
        contenedor = document.createElement("div");
        document.body.append(aviso, contenedor);
        sinon.spy(aviso, "mostrar");
    });
    afterEach(() => { fetchFalso.restore(); aviso.remove(); contenedor.remove(); Sesion.cerrar(); });

    describe("acceso", () => {
        it("sin sesion pide iniciar sesion y no consulta nada al backend", async () => {
            modelo = new BusquedaConsultaModel(contenedor);
            await modelo.iniciar();
            expect(contenedor.textContent).to.include("Inicie sesión como personal");
            expect(fetchFalso.called).to.equal(false);
        });
        it("un paciente no puede usar esta pantalla", async () => {
            await arrancar("Paciente");
            expect(contenedor.textContent).to.include("Inicie sesión como personal");
            expect(fetchFalso.called).to.equal(false);
        });
    });

    describe("al iniciar (medico)", () => {
        beforeEach(() => arrancar("Medico"));

        it("el buscador por nombre ofrece solo pacientes de la clinica de la sesion", () => {
            expect($("buscaPaciente").opciones.map(p => p.nombres)).to.deep.equal(["Ana", "Beto"]);
        });
        it("carga los tipos de documento", () => {
            expect($("buscaTipo").opciones.map(t => t.nombre)).to.deep.equal(["DUI", "Pasaporte"]);
        });
        it("no tiene boton Buscar: el documento se busca solo", () => {
            expect($("buscarDocumento")).to.equal(null);
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

    describe("buscar por nombre (medico)", () => {
        beforeEach(() => arrancar("Medico"));

        it("muestra las consultas del paciente, solo de esta clinica, la mas reciente primero", async () => {
            await elegirPaciente("ana");
            const textos = tarjetas().map(t => t.shadowRoot.textContent);
            expect(textos).to.have.length(2);
            expect(textos[0]).to.include("Control nuevo");
            expect(textos[1]).to.include("Control viejo");
            expect(textos.join()).to.not.include("OTRA CLINICA");
        });
        it("avisa si el paciente no tiene consultas", async () => {
            datos.consulta = [];
            await elegirPaciente("ana");
            expect(aviso.mostrar.lastCall.args).to.deep.equal(["El paciente no tiene consultas", "info"]);
        });
        it("esconde el detalle y cambia la lista al elegir otro paciente", async () => {
            await elegirPaciente("ana");
            $("detalle").hidden = false;
            await elegirPaciente("beto");
            expect($("detalle").hidden).to.equal(true);
            expect(tarjetas()).to.have.length(1);
        });
    });

    describe("buscar por documento (medico)", () => {
        beforeEach(() => arrancar("Medico"));
        function elegirTipo(texto) {
            escribir($("buscaTipo"), texto);
            $("buscaTipo").shadowRoot.querySelector("li").click();
        }
        async function escribirNumero(numero) {
            $("numeroDocumento").value = numero;
            $("numeroDocumento").dispatchEvent(new Event("input"));
            for (let i = 0; i < 6; i++) await esperar();
        }
        const ayuda = () => $("ayudaDocumento").textContent;

        it("al elegir el tipo muestra como escribirlo (sus indicaciones)", () => {
            elegirTipo("dui");
            expect($("numeroDocumento").placeholder).to.equal("8 dígitos, guion y dígito verificador");
        });
        it("si el tipo no tiene indicaciones muestra un texto general", () => {
            elegirTipo("pasa");
            expect($("numeroDocumento").placeholder).to.equal("Escriba el número del documento");
        });
        it("encuentra al paciente solo y muestra sus consultas", async () => {
            elegirTipo("dui");
            await escribirNumero("01234567-8");
            expect(tarjetas()).to.have.length(2);
            expect(modelo.paciente.idPersona).to.equal("p1");
            expect($("buscaPaciente").shadowRoot.querySelector("#q").value).to.equal("Ana Lopez");
        });
        it("si el tipo no tiene regex, ignora guiones, espacios y mayusculas", async () => {
            elegirTipo("pasa");
            await escribirNumero(" a1234567 ");
            expect(modelo.paciente.idPersona).to.equal("p2");
        });
        it("avisa si el numero no tiene el formato del tipo y no busca en el backend", async () => {
            elegirTipo("dui");
            fetchFalso.resetHistory();
            await escribirNumero("123456789");
            expect(ayuda()).to.include("no tiene el formato de DUI");
            expect(ayuda()).to.include("8 dígitos, guion y dígito verificador");
            expect(llamadas().some(l => l.includes("documento"))).to.equal(false);
        });
        it("avisa si el formato es correcto pero el documento no existe", async () => {
            elegirTipo("dui");
            await escribirNumero("00000000-0");
            expect(ayuda()).to.include("No se encontró un paciente de esta clínica");
        });
        it("un paciente de OTRA clinica no se encuentra", async () => {
            elegirTipo("dui");
            await escribirNumero("11111111-1");
            expect(ayuda()).to.include("No se encontró un paciente de esta clínica");
            expect(modelo.paciente).to.equal(null);
        });
        it("no mezcla tipos: el documento de un DUI no se encuentra como Pasaporte", async () => {
            elegirTipo("pasa");
            await escribirNumero("01234567-8");
            expect(ayuda()).to.include("No se encontró");
        });
        it("pide elegir el tipo si se escribe el numero primero, y busca al elegirlo", async () => {
            await escribirNumero("01234567-8");
            expect(ayuda()).to.equal("Elija primero el tipo de documento");
            elegirTipo("dui");
            for (let i = 0; i < 6; i++) await esperar();
            expect(modelo.paciente.idPersona).to.equal("p1");
        });
        it("quita el mensaje y los resultados al borrar el numero", async () => {
            elegirTipo("dui");
            await escribirNumero("01234567-8");
            await escribirNumero("");
            expect(ayuda()).to.equal("");
            expect(tarjetas()).to.have.length(0);
        });
    });

    describe("detalle de la consulta", () => {
        beforeEach(async () => {
            await arrancar("Medico");
            await elegirPaciente("ana");
            tarjetas().find(t => t.shadowRoot.textContent.includes("Control viejo")).shadowRoot.querySelector("#ver").click();
            for (let i = 0; i < 10; i++) await esperar();
        });

        it("tiene las 5 pestañas", () => {
            const titulos = [...$("pestanas").shadowRoot.querySelectorAll("button")].map(b => b.textContent);
            expect(titulos).to.deep.equal(["Documentos", "Procedimientos", "Pasos", "Órdenes de examen", "Resultados"]);
        });
        it("muestra el detalle y esconde la lista (la tarjeta no se repite)", () => {
            expect($("detalle").hidden).to.equal(false);
            expect($("lista").hidden).to.equal(true);
            expect($("detalle").querySelectorAll("galeno-tarjeta-consulta")).to.have.length(1);
        });
        it("la tarjeta del detalle no tiene boton Ver detalle", () => {
            expect($("tarjeta").shadowRoot.querySelector("#ver")).to.equal(null);
            expect($("tarjeta").shadowRoot.textContent).to.include("Control viejo");
        });
        it("Volver regresa a la lista", () => {
            $("volver").click();
            expect($("detalle").hidden).to.equal(true);
            expect($("lista").hidden).to.equal(false);
        });
        it("lista los documentos del paciente", () => {
            expect(textoDe("tablaDocumentos")).to.include("01234567-8");
            expect(textoDe("tablaDocumentos")).to.not.include("A-1234567");
        });
        it("lista solo los procedimientos de esa consulta", () => {
            expect(textoDe("tablaProcedimientos")).to.include("Rayos X");
            expect(textoDe("tablaProcedimientos")).to.not.include("Ajeno");
        });
        it("lista solo los pasos de esa consulta", () => {
            expect(textoDe("tablaPasos")).to.include("FINALIZADO");
            expect(textoDe("tablaPasos")).to.not.include("X</td>");
        });
        it("lista solo las ordenes de esa consulta, con el estado del paso", () => {
            expect(textoDe("tablaOrdenes")).to.include("Ayuno 8h");
            expect(textoDe("tablaOrdenes")).to.not.include("AJENA");
        });
        it("lista solo los resultados de esa consulta", () => {
            expect(textoDe("tablaResultados")).to.include("Sin hallazgos");
            expect(textoDe("tablaResultados")).to.not.include("AJENO");
        });
    });

    describe("cualquier rol de personal", () => {
        it("una recepcionista tambien ve el detalle completo (5 pestañas)", async () => {
            await arrancar("Recepcionista");
            const titulos = [...$("pestanas").shadowRoot.querySelectorAll("button")].map(b => b.textContent);
            expect(titulos).to.have.length(5);
        });
    });
});
}
