{
const { expect } = chai;

// Pruebas unitarias: cada caso arma su paciente, sus clínicas y sus consultas mínimas.
describe("CitasModel (HU1)", () => {
    const dui = Falsos.tipo("t-dui");
    const luis = Falsos.persona("p-luis", "Luis", "Pérez");
    const paciente = Falsos.rol("r-pac", "Paciente");
    const sa = Falsos.clinica("c-sa", "Santa Ana"), sm = Falsos.clinica("c-sm", "San Miguel");
    const enSa = Falsos.personaRol("pr-sa", luis, paciente, sa), enSm = Falsos.personaRol("pr-sm", luis, paciente, sm);
    const consulta = (id, personaRol, desfase) => ({ idConsulta: id, fechaInicio: Falsos.dia(desfase), idPersonaRol: personaRol });
    let zona, modelo, servicios, descargar, aviso;

    // Crea el modelo con los servicios falsos y lo inicia.
    const montar = ({ personasRoles = [enSa, enSm], consultas = [], falla = false } = {}) => {
        servicios = {
            personasRoles: Falsos.servicio(personasRoles), documentos: Falsos.servicio([Falsos.documento(luis, dui, "11111111-1")]),
            tipos: Falsos.servicio([dui]), consultas: Falsos.servicio(consultas, { falla }),
            cps: Falsos.servicio([{ idConsultaProcedimiento: "cp1", idProcedimiento: "pc1", idConsulta: { idConsulta: "k-hoy" } }]),
            procedimientos: Falsos.servicio([{ idProcedimiento: "pc1", nombre: "Consulta general" }])
        };
        descargar = sinon.stub().resolves("ticket.pdf");
        aviso = Falsos.aviso();
        zona = document.createElement("div"); document.body.append(zona);
        modelo = new CitasModel(zona, { servicios, descargar, aviso });
        return modelo.iniciar();
    };
    // Busca un elemento de la vista.
    const q = id => zona.querySelector("#" + id);
    // Identifica al paciente con su DUI.
    const identificar = (numero = "11111111-1") => { Ayuda.tipo(q("tipo"), "t-dui"); Ayuda.escribir(q("numero"), numero); };
    // Elige la clínica por su ID.
    const elegirClinica = id => Ayuda.elegir(q("clinica"), q("clinica").opciones.findIndex(c => c.idClinica === id));
    // IDs de las citas que se muestran.
    const ids = () => [...zona.querySelectorAll("galeno-tarjeta-cita")].map(t => t.cita.idConsulta);

    afterEach(() => zona?.remove());

    it("al iniciar llena el buscador con los tipos de documento", async () => {
        await montar();
        expect(q("tipo").opciones).to.have.length(1);
    });
    it("al identificarse ofrece solo las clínicas donde es paciente", async () => {
        await montar();
        identificar();
        expect(q("clinica").opciones.map(c => c.idClinica)).to.have.members(["c-sa", "c-sm"]);
    });
    it("si es paciente de una sola clínica, queda elegida", async () => {
        await montar({ personasRoles: [enSa] });
        identificar();
        expect(q("clinica").seleccionado.idClinica).to.equal("c-sa");
    });
    it("buscar devuelve una promesa y la vista reacciona al evento galeno-citas-encontradas", async () => {
        await montar({ consultas: [consulta("k-hoy", enSa, 0)] });
        identificar(); elegirClinica("c-sa");
        const eventos = [];
        zona.addEventListener("galeno-citas-encontradas", e => eventos.push(e.detail.citas));
        const promesa = modelo.buscar();
        expect(eventos).to.have.length(0);
        await promesa;
        expect(eventos).to.have.length(1);
        expect(ids()).to.deep.equal(["k-hoy"]);
    });
    it("muestra solo las citas de esa clínica, de la más antigua a la más reciente", async () => {
        await montar({ consultas: [consulta("k-manana", enSa, 1), consulta("k-otra", enSm, 0), consulta("k-ayer", enSa, -1)] });
        identificar(); elegirClinica("c-sa");
        await modelo.buscar();
        expect(ids()).to.deep.equal(["k-ayer", "k-manana"]);
    });
    it("cada cita lleva el nombre de sus procedimientos", async () => {
        await montar({ consultas: [consulta("k-hoy", enSa, 0)] });
        identificar(); elegirClinica("c-sa");
        await modelo.buscar();
        expect(zona.querySelector("galeno-tarjeta-cita").cita.procedimientos).to.deep.equal(["Consulta general"]);
    });
    it("filtra por el rango de fechas", async () => {
        await montar({ consultas: [consulta("k-hoy", enSa, 0), consulta("k-manana", enSa, 1)] });
        identificar(); elegirClinica("c-sa");
        q("desde").value = Falsos.fechaLocal(1); q("hasta").value = Falsos.fechaLocal(1);
        await modelo.buscar();
        expect(ids()).to.deep.equal(["k-manana"]);
    });
    it("con datos inválidos no consulta al servidor", async () => {
        await montar();
        identificar("123");
        await modelo.buscar();
        expect(servicios.consultas.listarTodo.called).to.equal(false);
        identificar(); elegirClinica("c-sa");
        q("desde").value = "2026-12-01"; q("hasta").value = "2026-11-01";
        await modelo.buscar();
        expect(servicios.consultas.listarTodo.called).to.equal(false);
    });
    it("sin citas muestra el estado vacío", async () => {
        await montar();
        identificar(); elegirClinica("c-sa");
        await modelo.buscar();
        expect(q("estado").estado).to.equal("vacio");
    });
    it("si el servidor falla muestra el estado de error", async () => {
        await montar({ falla: true });
        identificar(); elegirClinica("c-sa");
        await modelo.buscar();
        expect(q("estado").estado).to.equal("error");
    });
    it("descarta la respuesta de una búsqueda que ya quedó atrás", async () => {
        await montar({ consultas: [consulta("k-hoy", enSa, 0)] });
        identificar(); elegirClinica("c-sa");
        const lenta = Falsos.diferida();
        servicios.consultas.listarTodo.onFirstCall().returns(lenta.promesa);
        const primera = modelo.buscar();
        await Ayuda.hasta(() => servicios.consultas.listarTodo.calledOnce, { mensaje: "la primera búsqueda no pidió las consultas" });
        await modelo.buscar();
        lenta.resolver([consulta("k-vieja", enSa, 0)]);
        await primera;
        expect(ids()).to.deep.equal(["k-hoy"]);
    });
    it("el botón de la tarjeta descarga el ticket de esa consulta y libera la tarjeta", async () => {
        await montar({ consultas: [consulta("k-hoy", enSa, 0)] });
        identificar(); elegirClinica("c-sa");
        await modelo.buscar();
        const tarjeta = zona.querySelector("galeno-tarjeta-cita");
        await modelo.bajarTicket({ target: tarjeta, detail: { idConsulta: "k-hoy" } });
        expect(descargar.calledOnceWith("k-hoy")).to.equal(true);
        expect(tarjeta.cita.ocupada).to.equal(false);
    });
    it("si el ticket falla avisa el error sin romper la lista", async () => {
        await montar({ consultas: [consulta("k-hoy", enSa, 0)] });
        identificar(); elegirClinica("c-sa");
        await modelo.buscar();
        descargar.rejects(new Error("La cita ya no existe"));
        await modelo.bajarTicket({ target: zona.querySelector("galeno-tarjeta-cita"), detail: { idConsulta: "k-hoy" } });
        expect(aviso.mostrar.calledWith("La cita ya no existe", "error")).to.equal(true);
        expect(ids()).to.deep.equal(["k-hoy"]);
    });
});
}
