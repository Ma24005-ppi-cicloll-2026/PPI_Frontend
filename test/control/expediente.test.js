{
const { expect } = chai;

// Pruebas unitarias: cada caso arma una consulta con un procedimiento de dos pasos.
describe("Expediente", () => {
    const rec = Falsos.rol("r-rec", "Recepcionista"), med = Falsos.rol("r-med", "Médico");
    const proc = { idProcedimiento: "pc1", nombre: "Consulta general" };
    const definidos = [{ idProcedimientoPaso: "s1", nombre: "Triaje", idRol: rec, idProcedimiento: proc },
                       { idProcedimientoPaso: "s2", nombre: "Consulta médica", idRol: med, idProcedimiento: proc }];
    const secuencias = [{ idProcedimientoPaso: { idProcedimientoPaso: "s2" }, idProcedimientoPasoReferencia: "s1", tipoSecuencia: "AFTER" }];
    const luis = { idPersona: "p-luis", nombres: "Luis", apellidos: "Pérez", fechaNacimiento: "2000-01-15" };
    const ana = Falsos.personaRol("pr-ana", Falsos.persona("p-ana", "Ana", "Mejía"), rec, null);
    const consulta = (fechaFin = null) => ({ idConsulta: "k1", fechaFin, idPersonaRol: { idPersona: luis } });
    // Expediente con una consulta y los pasos que ya se hicieron.
    const datos = ({ realizados = [], fechaFin = null, observaciones = "" } = {}) => ({
        consultas: [consulta(fechaFin)], cps: [{ idConsultaProcedimiento: "cp1", idProcedimiento: "pc1", observaciones, idConsulta: { idConsulta: "k1" } }],
        realizados: realizados.map(([id, estado]) => ({ idConsultaProcedimientoPaso: id, estado, fechaInicio: "2026-01-01T08:00:00Z",
            idConsultaProcedimiento: { idConsultaProcedimiento: "cp1" }, idPersonaRol: ana })),
        definidos, secuencias, procedimientos: [proc],
        documentos: [Falsos.documento(luis, Falsos.tipo(), "11111111-1")],
        ordenes: [{ idOrdenExamen: "oe1", indicaciones: "Hemograma", idConsultaProcedimientoPaso: { idConsultaProcedimientoPaso: "cpp1" } }],
        resultados: [{ resultado: "Normal", idOrdenExamen: { idOrdenExamen: "oe1" } }],
        personasRoles: []
    });
    const expediente = new Expediente({ servicios: {} });

    it("cargar pide todas las tablas a la vez y las devuelve por nombre", async () => {
        const servicios = { consultas: Falsos.servicio([{ idConsulta: "k1" }]), cps: Falsos.servicio([]) };
        const resultado = await new Expediente({ servicios }).cargar();
        expect(resultado).to.deep.equal({ consultas: [{ idConsulta: "k1" }], cps: [] });
    });
    it("con el primer paso completado, el actual es el segundo", () => {
        const [p] = expediente.procedimientosDe(datos({ realizados: [["cpp1", "Completado"]] }), consulta());
        expect(p.nombre).to.equal("Consulta general");
        expect(p.estado.actual).to.equal(1);
    });
    it("la consulta es del rol cuyo paso toca", () => {
        const d = datos({ realizados: [["cpp1", "Completado"]] });
        expect(expediente.laAtiende(d, consulta(), "r-med")).to.equal(true);
        expect(expediente.laAtiende(d, consulta(), "r-rec")).to.equal(false);
    });
    it("una consulta finalizada no está pendiente para nadie", () => {
        const d = datos({ realizados: [["cpp1", "Completado"]], fechaFin: "2026-01-01T10:00:00Z" });
        expect(expediente.pendienteDelRol(d, consulta("2026-01-01T10:00:00Z"), "r-med")).to.equal(false);
    });
    it("si el paso anterior fue devuelto, la consulta vuelve a su rol y se marca devuelta", () => {
        const d = datos({ realizados: [["cpp1", "Devuelto"]] });
        expect(expediente.pendienteDelRol(d, consulta(), "r-rec")).to.equal(true);
        expect(expediente.pendienteDelRol(d, consulta(), "r-med")).to.equal(false);
        expect(expediente.devuelta(d, consulta())).to.equal(true);
    });
    it("paciente reúne nombre, documento y edad", () => {
        const p = expediente.paciente(datos(), consulta());
        expect(p).to.include({ nombre: "Luis Pérez", documento: "11111111-1" });
        expect(p.edad).to.be.a("number");
    });
    it("la tarjeta lista los pasos hechos con quién los hizo", () => {
        const t = expediente.tarjeta(datos({ realizados: [["cpp1", "Completado"]] }), consulta());
        expect(t.procedimientos[0].pasos[0]).to.include({ nombre: "Triaje", quien: "Ana Mejía" });
        expect(t).to.include({ finalizada: false, puedeAtender: true, devuelta: false });
    });
    it("registro trae la nota del paso y sus exámenes con resultado", () => {
        const d = datos({ realizados: [["cpp1", "Completado"]], observaciones: new NotasPaso().guardar("", 1, "Triaje", "Ana", "Fiebre") });
        const r = expediente.registro(d, "cpp1");
        expect(r.nota).to.equal("Fiebre");
        expect(r.examenes).to.deep.equal([{ nombre: "Hemograma", resultado: "Normal" }]);
        expect(expediente.registro(d, "no-existe")).to.equal(null);
    });
});
}
