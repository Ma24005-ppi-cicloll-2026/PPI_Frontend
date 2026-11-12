// HU4 · Consulta
{
const { expect } = chai;
describe("SeguimientoModel (HU4)", () => {
    let api, zona, irA;
    const medico = () => { Sesion.iniciar({ idPersona: "p-ana", nombre: "Ana Mejía", contextos: [] });
        Sesion.elegirContexto({ idPersonaRol: "pr-ana-med-sa", idRol: "r-med", rol: "Médico", idClinica: "c-sa", clinica: "Santa Ana" }); };
    const abrir = async id => {
        const m = new SeguimientoModel(zona, id, { irA });
        await m.iniciar(); await Ayuda.esperar(15);
        return m;
    };
    beforeEach(() => { medico(); api = new ApiFalsa(Datos.bd()); zona = document.createElement("div"); document.body.append(zona); irA = sinon.spy(); });
    afterEach(() => { api.restaurar(); zona.remove(); Sesion.cerrar(); });
    const q = id => zona.querySelector("#" + id);

    it("consulta que no existe: error", async () => {
        await abrir("no-existe");
        expect(q("estado").estado).to.equal("error");
    });
    it("muestra al paciente y los pasos; el actual es 'Consulta médica' (el triaje ya se hizo)", async () => {
        await abrir("k-hoy");
        expect(q("paciente").textContent).to.contain("Luis Pérez");
        const b = [...q("pasos").shadowRoot.querySelectorAll("button")];
        expect(b.map(x => x.textContent)).to.deep.equal(["Triaje ✓", "Consulta médica"]);
        expect(q("paso").textContent).to.equal("Paso 2 de 2: Consulta médica");
    });
    it("en el ultimo paso aparecen Anterior y Finalizar consulta, y no Guardar y avanzar", async () => {
        await abrir("k-hoy");
        expect(q("anterior").hidden).to.equal(false);
        expect(q("finalizar").hidden).to.equal(false);
        expect(q("avanzar").hidden).to.equal(true);
    });
    it("Anterior muestra el paso previo en solo lectura", async () => {
        await abrir("k-hoy");
        q("anterior").click();
        expect(q("paso").textContent).to.contain("Triaje");
        expect(q("notas").deshabilitado).to.equal(true);
        expect(q("finalizar").hidden).to.equal(true);
        expect(q("avanzar").hidden).to.equal(true);
        expect(q("anterior").hidden).to.equal(true);
    });
    it("lista los examenes de ese paso con su categoria", async () => {
        await abrir("k-hoy");
        const lista = q("examenes");
        expect(lista.examenes.map(x => `${x.nombre}/${x.categoria}`)).to.deep.equal(["Hemograma/Laboratorio", "Radiografía/Imagen"]);
    });
    it("asignar examenes crea la orden con el nombre del examen y el paso en proceso", async () => {
        await abrir("k-hoy");
        const i = q("examenes").shadowRoot.querySelector('input[data-id="e-rx"]'); i.checked = true; i.dispatchEvent(new Event("change"));
        Ayuda.clic(q("examenes"), "#asignar"); await Ayuda.esperar(15);
        const paso = api.enviados("POST", "consulta_procedimiento_paso")[0];
        expect(paso.cuerpo).to.include({ estado: "En proceso" });
        expect(paso.cuerpo.idPersonaRol).to.deep.equal({ idPersonaRol: "pr-ana-med-sa" });
        const orden = api.enviados("POST", "orden_examen")[0].cuerpo;
        expect(orden.indicaciones).to.equal("Radiografía");
        const bloqueado = q("examenes").shadowRoot.querySelector('input[data-id="e-rx"]');
        expect(bloqueado.disabled).to.equal(true);
    });
    it("Finalizar consulta guarda notas, completa el paso, cierra el procedimiento y la consulta", async () => {
        await abrir("k-hoy");
        Ayuda.escribir(q("notas"), "Dolor de cabeza");
        q("finalizar").click(); await Ayuda.esperar(20);
        const nuevo = api.enviados("POST", "consulta_procedimiento_paso")[0];
        expect(nuevo.cuerpo.estado).to.equal("En proceso");
        const puts = api.llamadas.filter(l => l.metodo === "PUT");
        const nota = puts.find(p => p.ruta === "consulta_procedimiento" && p.cuerpo.observaciones);
        expect(nota.cuerpo.observaciones).to.equal("Paso 2 (Consulta médica) · Ana Mejía: Dolor de cabeza");
        const paso = puts.find(p => p.ruta === "consulta_procedimiento_paso");
        expect(paso.cuerpo.estado).to.equal("Completado");
        expect(paso.cuerpo.fechaFin).to.be.a("string");
        expect(puts.find(p => p.ruta === "consulta").cuerpo.fechaFin).to.be.a("string");
        expect(irA.calledWith("dashboard")).to.equal(true);
    });
    it("Guardar y avanzar completa el paso y pasa al siguiente (consulta de recepcion)", async () => {
        Sesion.elegirContexto({ idPersonaRol: "pr-ana-rec-sa", idRol: "r-rec", rol: "Recepcionista", idClinica: "c-sa", clinica: "Santa Ana" });
        await abrir("k-manana");
        expect(q("paso").textContent).to.equal("Paso 1 de 2: Triaje");
        expect(q("anterior").hidden).to.equal(true);
        Ayuda.escribir(q("notas"), "Presión normal");
        q("avanzar").click(); await Ayuda.esperar(20);
        expect(q("paso").textContent).to.equal("Paso 2 de 2: Consulta médica");
        expect(q("notas").value).to.equal("");
        expect(api.enviados("PUT", "consulta_procedimiento")[0].cuerpo.observaciones).to.contain("Paso 1 (Triaje)");
        expect(api.enviados("PUT", "consulta")).to.have.length(0);   // la consulta sigue abierta
    });
    it("una consulta ya finalizada es de solo lectura", async () => {
        await abrir("k-cerrada");
        expect(q("avanzar").hidden && q("finalizar").hidden).to.equal(true);
        expect(q("notas").deshabilitado).to.equal(true);
    });
    it("si falla el guardado avisa y no avanza", async () => {
        await abrir("k-hoy");
        api.restaurar();
        const f = sinon.stub(window, "fetch").resolves(new Response("", { status: 500 }));
        q("finalizar").click(); await Ayuda.esperar(15);
        expect(irA.called).to.equal(false);
        f.restore(); api = new ApiFalsa(Datos.bd());
    });
    it("Volver regresa al dashboard", async () => {
        await abrir("k-hoy");
        q("volver").click();
        expect(irA.calledWith("dashboard")).to.equal(true);
    });
});
}
