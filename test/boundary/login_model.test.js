// Pruebas de LoginModel: dos entradas (paciente por documento, personal por clinica y usuario).
{  // bloque: evita que 'expect' choque con el de otros archivos de prueba
const { expect } = chai;

const BD = {
    clinica: [{ idClinica: "c1", nombre: "Central", activo: true }, { idClinica: "c2", nombre: "Cerrada", activo: false }],
    persona_rol: [
        { idPersonaRol: "pr1", idPersona: { idPersona: "m1", nombres: "Dr", apellidos: "House" }, idRol: { nombre: "Medico" }, idClinica: { idClinica: "c1", nombre: "Central" } },
        { idPersonaRol: "pr2", idPersona: { idPersona: "p1", nombres: "Ana", apellidos: "Lopez" }, idRol: { nombre: " Paciente " }, idClinica: { idClinica: "c1" } },
        { idPersonaRol: "pr3", idPersona: { idPersona: "m2", nombres: "Otra", apellidos: "Clinica" }, idRol: { nombre: "Medico" }, idClinica: { idClinica: "c9" } }
    ],
    tipo_documento: [{ idTipoDocumento: "t1", nombre: "DUI", activo: true, expresionRegular: "^\\d{8}-\\d$", indicaciones: "8 dígitos, guion y verificador" }],
    documento: [
        { valor: "01234567-8", idPersona: { idPersona: "p1", nombres: "Ana", apellidos: "Lopez" }, idTipoDocumento: { idTipoDocumento: "t1" } },
        { valor: "55555555-5", idPersona: { idPersona: "p9", nombres: "Sin", apellidos: "Rol" }, idTipoDocumento: { idTipoDocumento: "t1" } }
    ]
};

describe("LoginModel", () => {
    let fetchFalso, contenedor, aviso, modelo;

    beforeEach(async () => {
        fetchFalso = sinon.stub(window, "fetch").callsFake(async url => {
            const ruta = url.split("/resources/")[1].split("?")[0];
            return new Response(JSON.stringify(BD[ruta] || []), { status: 200 });
        });
        Sesion.cerrar();
        aviso = document.createElement("galeno-notificacion-emergente");
        aviso.id = "aviso";
        contenedor = document.createElement("div");
        document.body.append(aviso, contenedor);
        sinon.spy(aviso, "mostrar");
        modelo = new LoginModel(contenedor);
        await modelo.iniciar();
        modelo.busquedaDocumento.esperaBusqueda = 0;
    });
    afterEach(() => { fetchFalso.restore(); aviso.remove(); contenedor.remove(); Sesion.cerrar(); });

    const $ = id => contenedor.querySelector("#" + id);
    const esperar = () => new Promise(r => setTimeout(r, 0));
    function elegir(buscador, texto) {
        const entrada = buscador.shadowRoot.querySelector("#q");
        entrada.value = texto;
        entrada.dispatchEvent(new Event("input"));
        buscador.shadowRoot.querySelector("li").click();
    }
    async function escribirNumero(numero) {
        $("numeroDocumento").value = numero;
        $("numeroDocumento").dispatchEvent(new Event("input"));
        for (let i = 0; i < 6; i++) await esperar();
    }

    it("ofrece dos entradas: paciente y personal de la clinica", () => {
        const titulos = [...$("pestanas").shadowRoot.querySelectorAll("button")].map(b => b.textContent);
        expect(titulos).to.deep.equal(["Soy paciente", "Soy personal de la clínica"]);
    });
    it("no muestra ninguna lista de personas para el paciente", () => {
        expect(contenedor.querySelector("galeno-buscador-persona")).to.equal(null);
    });
    it("avisa si el backend falla", async () => {
        fetchFalso.callsFake(async () => new Response(null, { status: 500 }));
        const otro = document.createElement("div");
        document.body.append(otro);
        await new LoginModel(otro).iniciar();
        expect(aviso.mostrar.lastCall.args[1]).to.equal("error");
        otro.remove();
    });

    describe("personal de la clinica", () => {
        it("ofrece solo las clinicas activas", () => {
            expect($("selClinica").opciones.map(c => c.nombre)).to.deep.equal(["Central"]);
        });
        it("al elegir clinica ofrece solo su personal, sin pacientes ni gente de otra clinica", () => {
            elegir($("selClinica"), "cen");
            expect($("selPersonaRol").opciones.map(o => o.idPersonaRol)).to.deep.equal(["pr1"]);
        });
        it("muestra el usuario como 'nombre apellido (rol)'", () => {
            elegir($("selClinica"), "cen");
            expect($("selPersonaRol").texto($("selPersonaRol").opciones[0])).to.equal("Dr House (Medico)");
        });
        it("al elegir usuario inicia la sesion con su rol y su clinica", () => {
            elegir($("selClinica"), "cen");
            elegir($("selPersonaRol"), "house");
            expect(Sesion.obtener()).to.deep.equal({
                idPersonaRol: "pr1", idPersona: "m1", nombre: "Dr House", rol: "Medico", clinica: "Central", idClinica: "c1" });
            expect(Sesion.puede("consulta")).to.equal(true);
            expect(aviso.mostrar.lastCall.args).to.deep.equal(["Sesión iniciada", "exito"]);
        });
    });

    describe("paciente", () => {
        function elegirTipo() { elegir($("buscaTipo"), "dui"); }

        it("muestra como escribir el documento (indicaciones del tipo)", () => {
            elegirTipo();
            expect($("numeroDocumento").placeholder).to.equal("8 dígitos, guion y verificador");
        });
        it("avisa si el numero no tiene el formato del tipo", async () => {
            elegirTipo();
            await escribirNumero("123456789");
            expect($("ayudaDocumento").textContent).to.include("no tiene el formato de DUI");
            expect($("ingresarPaciente").hidden).to.equal(true);
        });
        it("encuentra al paciente solo y muestra su nombre con el boton Ingresar", async () => {
            elegirTipo();
            await escribirNumero("01234567-8");
            expect($("encontrado").textContent).to.equal("Paciente: Ana Lopez");
            expect($("ingresarPaciente").hidden).to.equal(false);
        });
        it("no deja entrar a una persona que existe pero no esta registrada como paciente", async () => {
            elegirTipo();
            await escribirNumero("55555555-5");
            expect($("ayudaDocumento").textContent).to.include("No se encontró un paciente");
            expect($("ingresarPaciente").hidden).to.equal(true);
        });
        it("avisa si el documento no existe", async () => {
            elegirTipo();
            await escribirNumero("00000000-0");
            expect($("ayudaDocumento").textContent).to.include("No se encontró un paciente");
        });
        it("al pulsar Ingresar inicia la sesion como paciente", async () => {
            elegirTipo();
            await escribirNumero("01234567-8");
            $("ingresarPaciente").click();
            expect(Sesion.obtener()).to.deep.equal({ idPersona: "p1", nombre: "Ana Lopez", rol: "Paciente", clinica: "" });
            expect(Sesion.esPaciente()).to.equal(true);
        });
        it("esconde el boton si se borra el numero", async () => {
            elegirTipo();
            await escribirNumero("01234567-8");
            await escribirNumero("");
            expect($("ingresarPaciente").hidden).to.equal(true);
            expect($("encontrado").hidden).to.equal(true);
        });
    });
});
}
