{
const { expect } = chai;
describe("Expediente", () => {
    let api, datos;
    beforeEach(async () => { api = new ApiFalsa(Datos.bd()); datos = await Expediente.cargar(); });
    afterEach(() => api.restaurar());
    const consulta = id => datos.consultas.find(c => c.idConsulta === id);

    it("carga todas las listas", () => {
        expect(datos.consultas).to.have.length(5);
        expect(datos.definidos).to.have.length(2);
    });
    it("procedimientosDe arma el estado de pasos (triaje hecho -> toca consulta médica)", () => {
        const [p] = Expediente.procedimientosDe(datos, consulta("k-hoy"));
        expect(p.nombre).to.equal("Consulta general");
        expect(p.estado.definidos.map(d => d.nombre)).to.deep.equal(["Triaje", "Consulta médica"]);
        expect(p.estado.actual).to.equal(1);
    });
    it("laAtiende compara el rol con el paso que toca", () => {
        expect(Expediente.laAtiende(datos, consulta("k-hoy"), "r-med")).to.equal(true);
        expect(Expediente.laAtiende(datos, consulta("k-hoy"), "r-rec")).to.equal(false);
        expect(Expediente.laAtiende(datos, consulta("k-manana"), "r-rec")).to.equal(true);
    });
    it("abierta: sin fecha fin", () => {
        expect(Expediente.abierta(consulta("k-hoy"))).to.equal(true);
        expect(Expediente.abierta(consulta("k-cerrada"))).to.equal(false);
    });
    it("paciente: nombre, edad e ID", () => {
        const p = Expediente.paciente(datos, consulta("k-hoy"));
        expect(p.nombre).to.equal("Luis Pérez"); expect(p.documento).to.equal("11111111-1");
        expect(p.edad).to.be.a("number");
    });
    it("tarjeta: pasos realizados con quien y cuando", () => {
        const t = Expediente.tarjeta(datos, consulta("k-hoy"));
        const paso = t.procedimientos[0].pasos[0];
        expect(paso.nombre).to.equal("Triaje"); expect(paso.quien).to.equal("Ana Mejía"); expect(paso.rol).to.equal("Recepcionista");
    });
    it("tarjeta: una consulta con fecha fin sale finalizada y no se puede atender", () => {
        expect(Expediente.tarjeta(datos, consulta("k-cerrada"))).to.include({ finalizada: true, puedeAtender: false });
        expect(Expediente.tarjeta(datos, consulta("k-hoy"))).to.include({ finalizada: false, puedeAtender: true });
    });
    it("registro: examenes con su resultado y las notas del paso", () => {
        datos.cps.find(x => x.idConsultaProcedimiento === "cp-hoy").observaciones = "Paso 1 (Triaje) · Ana Mejía: Fiebre";
        const r = Expediente.registro(datos, "cpp1");
        expect(r.paso).to.equal("Triaje"); expect(r.nota).to.equal("Fiebre");
        expect(r.examenes).to.deep.equal([{ nombre: "Hemograma", resultado: "Normal" }]);
        expect(Expediente.registro(datos, "no-existe")).to.equal(null);
    });
});
}
