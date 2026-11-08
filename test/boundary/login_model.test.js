// Pruebas de LoginModel: elegir clinica, luego usuario, y guardar la sesion.
{  // bloque: evita que 'expect' choque con el de otros archivos de prueba
const { expect } = chai;

const BD = {
    clinica: [
        { idClinica: "c1", nombre: "Central", activo: true },
        { idClinica: "c2", nombre: "Cerrada", activo: false }
    ],
    persona_rol: [
        { idPersonaRol: "pr1", idPersona: { nombres: "Dr", apellidos: "House" }, idRol: { nombre: "Medico" }, idClinica: { idClinica: "c1", nombre: "Central" } },
        { idPersonaRol: "pr2", idPersona: { nombres: "Pac", apellidos: "Iente" }, idRol: { nombre: " Paciente " }, idClinica: { idClinica: "c1" } },
        { idPersonaRol: "pr3", idPersona: { nombres: "Otra", apellidos: "Clinica" }, idRol: { nombre: "Medico" }, idClinica: { idClinica: "c9" } }
    ]
};

describe("LoginModel", () => {
    let fetchFalso, contenedor, aviso, modelo;

    beforeEach(async () => {
        fetchFalso = sinon.stub(window, "fetch").callsFake(async url => {
            const ruta = url.split("/resources/")[1].split("?")[0];
            return new Response(JSON.stringify(BD[ruta] || []), { status: 200 });
        });
        sessionStorage.clear();
        aviso = document.createElement("galeno-notificacion-emergente");
        aviso.id = "aviso";
        contenedor = document.createElement("div");
        document.body.append(aviso, contenedor);
        sinon.spy(aviso, "mostrar");
        modelo = new LoginModel(contenedor);
        await modelo.iniciar();
    });
    afterEach(() => { fetchFalso.restore(); aviso.remove(); contenedor.remove(); sessionStorage.clear(); });

    const $ = id => contenedor.querySelector("#" + id);
    function elegir(buscador, texto) {
        const entrada = buscador.shadowRoot.querySelector("#q");
        entrada.value = texto;
        entrada.dispatchEvent(new Event("input"));
        buscador.shadowRoot.querySelector("li").click();
    }

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
    it("al cambiar de clinica se limpia el usuario elegido", () => {
        elegir($("selClinica"), "cen");
        elegir($("selPersonaRol"), "house");
        $("selPersonaRol").limpiar();
        expect($("selPersonaRol").seleccionado).to.equal(null);
    });

    describe("al elegir usuario", () => {
        beforeEach(() => {
            elegir($("selClinica"), "cen");
            elegir($("selPersonaRol"), "house");
        });
        it("guarda la sesion", () => {
            const sesion = JSON.parse(sessionStorage.getItem("sesion"));
            expect(sesion).to.deep.equal({ idPersonaRol: "pr1", nombre: "Dr House", rol: "Medico", clinica: "Central" });
        });
        it("avisa que la sesion inicio", () => {
            expect(aviso.mostrar.lastCall.args).to.deep.equal(["Sesión iniciada", "exito"]);
        });
        it("emite el evento galeno-sesion para que el encabezado se actualice", () => {
            let emitido = false;
            window.addEventListener("galeno-sesion", () => { emitido = true; }, { once: true });
            modelo.alElegirPersonaRol(BD.persona_rol[0]);
            expect(emitido).to.equal(true);
        });
    });

    it("avisa si el backend falla", async () => {
        fetchFalso.callsFake(async () => new Response(null, { status: 500 }));
        const otro = document.createElement("div");
        document.body.append(otro);
        await new LoginModel(otro).iniciar();
        expect(aviso.mostrar.lastCall.args[1]).to.equal("error");
        otro.remove();
    });
});
}
