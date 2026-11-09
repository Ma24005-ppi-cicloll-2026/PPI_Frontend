// Pruebas de Sesion: dos tipos de usuario (paciente y personal) y que pantallas le tocan a cada uno.
{  // bloque: evita que 'expect' choque con el de otros archivos de prueba
const { expect } = chai;

describe("Sesion", () => {
    afterEach(() => Sesion.cerrar());

    const iniciar = rol => Sesion.iniciar({ nombre: "Alguien", rol, clinica: "Central", idClinica: "c1" });

    describe("normalizarRol", () => {
        it("quita tildes, espacios y mayusculas", () => {
            expect(Sesion.normalizarRol(" Médico ")).to.equal("medico");
            expect(Sesion.normalizarRol("PACIENTE")).to.equal("paciente");
        });
        it("devuelve texto vacio si no hay rol", () => {
            expect(Sesion.normalizarRol(null)).to.equal("");
            expect(Sesion.normalizarRol(undefined)).to.equal("");
        });
    });

    describe("sin sesion", () => {
        it("no hay sesion ni tipo de usuario", () => {
            expect(Sesion.obtener()).to.equal(null);
            expect(Sesion.tipo()).to.equal(null);
            expect(Sesion.esPaciente()).to.equal(false);
        });
        it("solo se puede ir al login", () => {
            expect(Sesion.puede("login")).to.equal(true);
            ["inicio", "consulta", "historial", "persona"].forEach(p => expect(Sesion.puede(p), p).to.equal(false));
        });
    });

    describe("paciente", () => {
        beforeEach(() => iniciar("Paciente"));
        it("es de tipo paciente", () => {
            expect(Sesion.tipo()).to.equal("paciente");
            expect(Sesion.esPaciente()).to.equal(true);
        });
        it("el rol se reconoce con espacios y mayusculas", () => {
            iniciar("  PACIENTE ");
            expect(Sesion.tipo()).to.equal("paciente");
        });
        it("solo puede ver Inicio y su historial", () => {
            expect(Sesion.puede("inicio")).to.equal(true);
            expect(Sesion.puede("historial")).to.equal(true);
        });
        it("no puede ver consultas del personal ni las pantallas de administracion", () => {
            ["consulta", "persona", "clinica", "rol", "tipo_documento"].forEach(p => expect(Sesion.puede(p), p).to.equal(false));
        });
        it("no puede volver al login sin cerrar sesion", () => {
            expect(Sesion.puede("login")).to.equal(false);
        });
    });

    describe("personal (cualquier rol que no sea paciente)", () => {
        ["Medico", "Médico", "Recepcionista", "Administrador", "rodrigo"].forEach(rol => {
            it(`"${rol}" es personal y ve consultas y administracion, pero no el historial de paciente`, () => {
                iniciar(rol);
                expect(Sesion.tipo()).to.equal("personal");
                expect(Sesion.esPaciente()).to.equal(false);
                ["inicio", "consulta", "persona", "clinica", "examen", "rol"].forEach(p => expect(Sesion.puede(p), p).to.equal(true));
                expect(Sesion.puede("historial")).to.equal(false);
                expect(Sesion.puede("login")).to.equal(false);
            });
        });
    });

    describe("iniciar y cerrar", () => {
        it("iniciar guarda los datos de la sesion", () => {
            iniciar("Medico");
            expect(Sesion.obtener()).to.deep.include({ nombre: "Alguien", rol: "Medico", idClinica: "c1" });
        });
        it("iniciar emite galeno-sesion", () => {
            let emitido = 0;
            const oyente = () => emitido++;
            window.addEventListener("galeno-sesion", oyente);
            iniciar("Medico");
            window.removeEventListener("galeno-sesion", oyente);
            expect(emitido).to.equal(1);
        });
        it("cerrar borra la sesion y emite galeno-sesion", () => {
            iniciar("Medico");
            let emitido = 0;
            const oyente = () => emitido++;
            window.addEventListener("galeno-sesion", oyente);
            Sesion.cerrar();
            window.removeEventListener("galeno-sesion", oyente);
            expect(Sesion.obtener()).to.equal(null);
            expect(Sesion.tipo()).to.equal(null);
            expect(emitido).to.equal(1);
        });
    });
});
}
