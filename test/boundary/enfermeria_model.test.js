// Pruebas de Enfermeria: usa AtencionModel pero solo registra y actualiza pasos (sin examenes ni resultados).
{
const { expect } = chai;

const ana = { idPersona: "p1", nombres: "Ana", apellidos: "López" };
const BD = {
    consulta: [{ idConsulta: "k1", fechaInicio: "2026-11-09T15:00:00Z[UTC]", fechaFin: null,
                 idPersonaRol: { idPersonaRol: "pac-1", idPersona: ana, idClinica: { idClinica: "c1" } } }],
    procedimiento: [{ idProcedimiento: "pr1", nombre: "Rayos X", activo: true }],
    consulta_procedimiento: [{ idConsultaProcedimiento: "cp1", idConsulta: { idConsulta: "k1" }, idProcedimiento: "pr1" }],
    consulta_procedimiento_paso: [
        { idConsultaProcedimientoPaso: "s1", idConsultaProcedimiento: { idConsultaProcedimiento: "cp1" }, estado: "En proceso" }],
    orden_examen: [], examen_resultado: [], documento: [],
    persona_rol: [{ idPersonaRol: "enf-1", idPersona: { nombres: "Marta", apellidos: "Cruz" }, idRol: { nombre: "Enfermera" } }]
};

describe("Enfermeria (AtencionModel restringido)", () => {
    let api, contenedor, aviso, modelo;
    const $ = id => contenedor.querySelector("#" + id);
    const botones = () => [...$("acciones").querySelectorAll("button")].map(b => b.textContent);
    const opciones = { pantalla: "enfermeria", titulo: "Enfermería: pasos de las consultas", acciones: ["paso", "estado"],
                       sinPermiso: "Inicie sesión como personal de enfermería para atender los pasos." };
    async function arrancar(rol = "Enfermera") {
        Sesion.iniciar({ idPersonaRol: "enf-1", nombre: "Marta Cruz", rol, clinica: "Central", idClinica: "c1" });
        modelo = new AtencionModel(contenedor, opciones);
        await modelo.iniciar();
    }

    beforeEach(() => {
        api = new ApiFalsa(BD);
        aviso = document.createElement("galeno-notificacion-emergente"); aviso.id = "aviso";
        contenedor = document.createElement("div");
        document.body.append(aviso, contenedor);
        sinon.spy(aviso, "mostrar");
        Sesion.cerrar();
    });
    afterEach(() => { api.restaurar(); aviso.remove(); contenedor.remove(); Sesion.cerrar(); });

    it("sin sesion muestra el mensaje de enfermeria", async () => {
        modelo = new AtencionModel(contenedor, opciones); await modelo.iniciar();
        expect(contenedor.textContent).to.contain("personal de enfermería");
    });
    it("un medico no entra por la pantalla de enfermeria", async () => {
        Sesion.iniciar({ nombre: "Gregory", rol: "Médico", idClinica: "c1" });
        modelo = new AtencionModel(contenedor, opciones); await modelo.iniciar();
        expect(contenedor.textContent).to.contain("personal de enfermería");
        expect(contenedor.querySelector("#acciones")).to.equal(null);
    });
    it("una enfermera ve el titulo propio y la consulta pendiente", async () => {
        await arrancar();
        expect(contenedor.querySelector("h2").textContent).to.equal("Enfermería: pasos de las consultas");
        expect($("tarjetas").querySelectorAll("galeno-tarjeta-consulta")).to.have.length(1);
    });
    it("solo ofrece Registrar paso y Actualizar paso (nada de examenes ni resultados)", async () => {
        await arrancar();
        expect(botones()).to.deep.equal(["Registrar paso", "Actualizar paso"]);
    });
    it("la pantalla de medico sigue ofreciendo las cuatro acciones", async () => {
        Sesion.iniciar({ idPersonaRol: "enf-1", nombre: "Gregory", rol: "Médico", clinica: "Central", idClinica: "c1" });
        modelo = new AtencionModel(contenedor); await modelo.iniciar();
        expect(botones()).to.deep.equal(["Registrar paso", "Actualizar paso", "Solicitar examen", "Registrar resultado"]);
    });
    it("actualiza un paso a Completado con su fecha de fin", async () => {
        await arrancar();
        $("tarjetas").dispatchEvent(new CustomEvent("galeno-abrir-consulta", { detail: { idConsulta: "k1" } }));
        await Ayuda.esperar(20);
        contenedor.querySelector("[data-accion=estado]").click(); await Ayuda.esperar();
        const paso = modelo.detalle.tablas.pasos.filas[0];
        $("formulario").dispatchEvent(new CustomEvent("galeno-guardar", { detail: { datos: { paso, estado: { nombre: "Completado" } } } }));
        await Ayuda.esperar(20);
        const put = api.enviados("PUT", "consulta_procedimiento_paso")[0];
        expect(put.cuerpo.estado).to.equal("Completado");
        expect(put.cuerpo.fechaFin).to.be.a("string");
    });
});
}
