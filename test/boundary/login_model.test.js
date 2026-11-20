{
const { expect } = chai;

// Pruebas unitarias: el modelo recibe servicios y sesión falsos con los datos mínimos de cada caso.
describe("LoginModel (HU2)", () => {
    const dui = Falsos.tipo("t-dui");
    const ana = Falsos.persona("p-ana", "Ana", "Mejía");
    const luis = Falsos.persona("p-luis", "Luis", "Pérez");
    const sa = Falsos.clinica("c-sa", "Santa Ana");
    let pantalla, modelo, servicios, sesion, irA;

    // Monta la pantalla de login con las dependencias falsas indicadas.
    const montar = ({ personasRoles = [], documentos = [], falla = false } = {}) => {
        servicios = {
            personasRoles: Falsos.servicio(personasRoles, { falla }),
            documentos: Falsos.servicio(documentos, { falla }),
            tipos: Falsos.servicio([dui], { falla })
        };
        sesion = Falsos.sesion();
        sinon.spy(sesion, "iniciar");
        irA = sinon.spy();
        pantalla = document.createElement("galeno-pantalla-login");
        pantalla.irA = irA;
        pantalla.dependencias = { servicios, sesion };
        document.body.append(pantalla);
        modelo = pantalla._modelo;
        return modelo.datos;
    };
    // Busca un elemento dentro de la pantalla.
    const q = id => pantalla.shadowRoot.querySelector("#" + id);
    // Elige el tipo y escribe el número.
    const llenar = numero => { Ayuda.tipo(q("tipo"), "t-dui"); Ayuda.escribir(q("numero"), numero); };

    afterEach(() => pantalla?.remove());

    it("al iniciar pide los catálogos y llena el buscador de tipos", async () => {
        await montar();
        expect(servicios.tipos.listarTodo.calledOnce).to.equal(true);
        expect(q("tipo").opciones.map(t => t.idTipoDocumento)).to.deep.equal(["t-dui"]);
    });
    it("el número queda bloqueado hasta elegir el tipo", async () => {
        await montar();
        expect(q("numero").deshabilitado).to.equal(true);
        Ayuda.tipo(q("tipo"), "t-dui");
        expect(q("numero").deshabilitado).to.equal(false);
    });
    it("sin tipo de documento no intenta iniciar sesión", async () => {
        await montar();
        await modelo.ingresar();
        expect(q("mensaje").textContent).to.not.equal("");
        expect(sesion.iniciar.called).to.equal(false);
    });
    it("un número con formato inválido marca el campo y no inicia sesión", async () => {
        await montar();
        llenar("123");
        await modelo.ingresar();
        expect(q("numero").shadowRoot.querySelector("#error").textContent).to.not.equal("");
        expect(sesion.iniciar.called).to.equal(false);
    });
    it("un empleado inicia sesión con todos sus roles y clínicas", async () => {
        await montar({
            personasRoles: [Falsos.personaRol("pr1", ana, Falsos.rol("r-med", "Médico"), sa),
                            Falsos.personaRol("pr2", ana, Falsos.rol("r-rec", "Recepcionista"), sa)],
            documentos: [Falsos.documento(ana, dui, "01234567-8")]
        });
        llenar("01234567-8");
        await modelo.ingresar();
        const datos = sesion.iniciar.firstCall.args[0];
        expect(datos.idPersona).to.equal("p-ana");
        expect(datos.contextos.map(c => c.idPersonaRol)).to.deep.equal(["pr1", "pr2"]);
    });
    it("una persona que solo es paciente no inicia sesión y se limpia el número", async () => {
        await montar({
            personasRoles: [Falsos.personaRol("pr1", luis, Falsos.rol("r-pac", "Paciente"), sa)],
            documentos: [Falsos.documento(luis, dui, "11111111-1")]
        });
        llenar("11111111-1");
        await modelo.ingresar();
        expect(sesion.iniciar.called).to.equal(false);
        expect(q("numero").value).to.equal("");
    });
    it("si la carga falla muestra Reintentar, y al reintentar se recupera", async () => {
        expect(await montar({ falla: true })).to.equal(false);
        expect(q("reintentar").hidden).to.equal(false);
        servicios.tipos.listarTodo.callsFake(() => Promise.resolve([dui]));
        servicios.personasRoles.listarTodo.callsFake(() => Promise.resolve([]));
        servicios.documentos.listarTodo.callsFake(() => Promise.resolve([]));
        q("reintentar").click();
        expect(await modelo.datos).to.equal(true);
        expect(q("reintentar").hidden).to.equal(true);
    });
    it("enviar el formulario o pulsar Enter llama a ingresar", async () => {
        await montar();
        const ingresar = sinon.spy(modelo, "ingresar");
        q("formulario").dispatchEvent(new Event("submit", { cancelable: true }));
        llenar("01234567-8");
        q("numero").entrada.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, composed: true, cancelable: true }));
        expect(ingresar.callCount).to.equal(2);
    });
    it("el enlace lleva a Buscar citas", async () => {
        await montar();
        q("citas").click();
        expect(irA.calledWith("citas")).to.equal(true);
    });
});
}
