// Pruebas de Sesion: solo el empleado inicia sesion; elige clinica y rol; que pantallas le tocan.
{
const { expect } = chai;

describe("Sesion", () => {
    afterEach(() => Sesion.cerrar());
    const empleado = { idPersona: "p1", nombre: "Ana Mejía", contextos: [
        { idPersonaRol: "pr1", idRol: "r1", rol: "Médico", idClinica: "c1", clinica: "Santa Ana" }] };

    it("normalizarRol quita tildes, espacios y mayusculas", () => {
        expect(Sesion.normalizarRol(" Médico ")).to.equal("medico");
        expect(Sesion.normalizarRol(null)).to.equal("");
    });
    it("sin sesion solo se ven Buscar citas y Login", () => {
        expect(Sesion.obtener()).to.equal(null);
        ["citas", "login"].forEach(p => expect(Sesion.puede(p), p).to.equal(true));
        ["dashboard", "consulta", "admision", "solicitar"].forEach(p => expect(Sesion.puede(p), p).to.equal(false));
    });
    it("con sesion se ven Dashboard, Consulta y Buscar citas, pero no Login", () => {
        Sesion.iniciar(empleado);
        ["citas", "dashboard", "consulta"].forEach(p => expect(Sesion.puede(p), p).to.equal(true));
        expect(Sesion.puede("login")).to.equal(false);
    });
    it("iniciar avisa con galeno-sesion y guarda los contextos", () => {
        let avisos = 0;
        const f = () => avisos++;
        window.addEventListener("galeno-sesion", f);
        Sesion.iniciar(empleado);
        window.removeEventListener("galeno-sesion", f);
        expect(avisos).to.equal(1);
        expect(Sesion.obtener().contextos).to.have.length(1);
    });
    it("no hay contexto hasta que se elige", () => {
        Sesion.iniciar(empleado);
        expect(Sesion.contexto()).to.equal(null);
    });
    it("elegirContexto guarda rol y clinica y avisa con galeno-contexto", () => {
        Sesion.iniciar(empleado);
        let avisos = 0;
        const f = () => avisos++;
        window.addEventListener("galeno-contexto", f);
        Sesion.elegirContexto(empleado.contextos[0]);
        window.removeEventListener("galeno-contexto", f);
        expect(avisos).to.equal(1);
        expect(Sesion.contexto()).to.deep.equal({ idPersonaRol: "pr1", idRol: "r1", rol: "Médico", idClinica: "c1", clinica: "Santa Ana" });
        expect(Sesion.obtener().nombre).to.equal("Ana Mejía");
    });
    it("elegirContexto sin sesion no hace nada", () => {
        Sesion.elegirContexto(empleado.contextos[0]);
        expect(Sesion.obtener()).to.equal(null);
    });
    it("cerrar quita la sesion", () => {
        Sesion.iniciar(empleado);
        Sesion.cerrar();
        expect(Sesion.obtener()).to.equal(null);
        expect(Sesion.puede("dashboard")).to.equal(false);
    });
});
}
