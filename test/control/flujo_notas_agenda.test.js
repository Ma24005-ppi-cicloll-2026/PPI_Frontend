{
const { expect } = chai;
const paso = (id, nombre, rol = null) => ({ idProcedimientoPaso: id, nombre, idProcedimiento: { idProcedimiento: "pc" }, idRol: rol ? { idRol: rol } : null });

describe("FlujoPasos", () => {
    const a = paso("a", "Triaje", "rec"), b = paso("b", "Consulta", "med"), c = paso("c", "Cierre");
    const sig = (de, a_) => ({ idProcedimientoPaso: { idProcedimientoPaso: de }, idProcedimientoPasoReferencia: a_, tipoSecuencia: "siguiente" });
    it("ordena los pasos con las secuencias", () => {
        expect(FlujoPasos.ordenar([c, b, a], [sig("a", "b"), sig("b", "c")]).map(p => p.nombre)).to.deep.equal(["Triaje", "Consulta", "Cierre"]);
    });
    it("entiende secuencias 'anterior'", () => {
        const ant = { idProcedimientoPaso: { idProcedimientoPaso: "b" }, idProcedimientoPasoReferencia: "a", tipoSecuencia: "anterior" };
        expect(FlujoPasos.ordenar([b, a], [ant]).map(p => p.nombre)).to.deep.equal(["Triaje", "Consulta"]);
    });
    it("los pasos sin secuencia quedan al final y un ciclo no se cuelga", () => {
        expect(FlujoPasos.ordenar([c, a, b], [sig("a", "b")]).map(p => p.nombre)).to.have.length(3);
        expect(FlujoPasos.ordenar([a, b], [sig("a", "b"), sig("b", "a")])).to.have.length(2);
    });
    it("definidos filtra por procedimiento", () => {
        const otro = { ...paso("z", "Otro"), idProcedimiento: { idProcedimiento: "otro" } };
        expect(FlujoPasos.definidos("pc", [a, otro], []).map(p => p.nombre)).to.deep.equal(["Triaje"]);
    });
    const hecho = (id, cp, hora, estado) => ({ idConsultaProcedimientoPaso: id, estado, fechaInicio: `2026-01-01T0${hora}:00:00Z`, idConsultaProcedimiento: { idConsultaProcedimiento: cp } });
    it("realizados: los de un procedimiento, el primero primero", () => {
        const r = FlujoPasos.realizados("x", [hecho("2", "x", 2, "Completado"), hecho("1", "x", 1, "Completado"), hecho("3", "y", 1, "Completado")]);
        expect(r.map(p => p.idConsultaProcedimientoPaso)).to.deep.equal(["1", "2"]);
    });
    it("estado: sin pasos realizados toca el primero", () => {
        const e = FlujoPasos.estado([a, b], []);
        expect(e.actual).to.equal(0); expect(e.completo).to.equal(false);
    });
    it("estado: un paso en proceso sigue siendo el actual", () => {
        expect(FlujoPasos.estado([a, b], [hecho("1", "x", 1, "En proceso")]).actual).to.equal(0);
    });
    it("estado: un paso completado hace tocar el siguiente", () => {
        expect(FlujoPasos.estado([a, b], [hecho("1", "x", 1, "Completado")]).actual).to.equal(1);
    });
    it("estado: todos completados = completo", () => {
        const e = FlujoPasos.estado([a, b], [hecho("1", "x", 1, "Completado"), hecho("2", "x", 2, "Completado")]);
        expect(e.completo).to.equal(true); expect(e.actual).to.equal(null);
    });
    it("estado: sin pasos definidos usa un paso unico 'Atención'", () => {
        const e = FlujoPasos.estado([], []);
        expect(e.definidos).to.have.length(1); expect(e.definidos[0].nombre).to.equal("Atención");
    });
    it("loAtiende compara el rol del paso que toca", () => {
        const e = FlujoPasos.estado([a, b], []);
        expect(FlujoPasos.loAtiende(e, "rec")).to.equal(true);
        expect(FlujoPasos.loAtiende(e, "med")).to.equal(false);
        expect(FlujoPasos.loAtiende(FlujoPasos.estado([c], []), "med")).to.equal(true);   // sin rol: cualquiera
        expect(FlujoPasos.loAtiende(FlujoPasos.estado([a], [hecho("1", "x", 1, "Completado")]), "rec")).to.equal(false);
    });
});

describe("NotasPaso", () => {
    it("guarda una linea por paso y la reemplaza al guardar otra vez", () => {
        let o = NotasPaso.guardar("", 2, "Consulta", "Dra. Ana", "Dolor");
        expect(o).to.equal("Paso 2 (Consulta) · Dra. Ana: Dolor");
        o = NotasPaso.guardar(o, 1, "Triaje", "Luis", "Fiebre");
        o = NotasPaso.guardar(o, 2, "Consulta", "Dra. Ana", "Dolor fuerte");
        expect(o.split("\n")).to.deep.equal(["Paso 1 (Triaje) · Luis: Fiebre", "Paso 2 (Consulta) · Dra. Ana: Dolor fuerte"]);
    });
    it("de devuelve solo el texto, con sus saltos de linea", () => {
        const o = NotasPaso.guardar("", 1, "Triaje", "Luis", "uno\ndos");
        expect(NotasPaso.de(o, 1)).to.equal("uno\ndos");
        expect(NotasPaso.de(o, 3)).to.equal("");
    });
    it("una nota vacia borra la linea y se respeta lo que no es de un paso", () => {
        let o = NotasPaso.guardar("Texto libre", 1, "Triaje", "Luis", "x");
        o = NotasPaso.guardar(o, 1, "Triaje", "Luis", "  ");
        expect(o).to.equal("Texto libre");
    });
});

describe("Agenda", () => {
    const ahora = new Date(2026, 10, 11, 15, 30);
    it("Hoy va de 00:00 a 23:59", () => {
        const r = Agenda.rango("Hoy", "", "", ahora);
        expect(Agenda.enRango(new Date(2026, 10, 11, 0, 0), r)).to.equal(true);
        expect(Agenda.enRango(new Date(2026, 10, 12, 0, 0), r)).to.equal(false);
    });
    it("Pasado y Futuro excluyen hoy", () => {
        expect(Agenda.enRango(new Date(2026, 10, 10, 23, 0), Agenda.rango("Pasado", "", "", ahora))).to.equal(true);
        expect(Agenda.enRango(new Date(2026, 10, 11, 9, 0), Agenda.rango("Pasado", "", "", ahora))).to.equal(false);
        expect(Agenda.enRango(new Date(2026, 10, 12, 1, 0), Agenda.rango("Futuro", "", "", ahora))).to.equal(true);
        expect(Agenda.enRango(new Date(2026, 10, 11, 20, 0), Agenda.rango("Futuro", "", "", ahora))).to.equal(false);
    });
    it("Rango usa las fechas escritas (cualquiera puede faltar)", () => {
        const r = Agenda.rango("Rango", "2026-11-01", "2026-11-05");
        expect(Agenda.enRango(new Date(2026, 10, 5, 23, 0), r)).to.equal(true);
        expect(Agenda.enRango(new Date(2026, 10, 6, 0, 1), r)).to.equal(false);
        expect(Agenda.enRango(new Date(2020, 0, 1), Agenda.rango("Rango", "", "2026-11-05"))).to.equal(true);
    });
    it("enRango es falso si la fecha no existe", () => {
        expect(Agenda.enRango(null, Agenda.rango("Hoy"))).to.equal(false);
    });
    it("edad cuenta años cumplidos", () => {
        expect(Agenda.edad("1990-11-12", ahora)).to.equal(35);
        expect(Agenda.edad("1990-11-11", ahora)).to.equal(36);
        expect(Agenda.edad(null)).to.equal(null);
    });
});
}
